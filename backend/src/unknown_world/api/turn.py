"""Unknown World - /api/turn HTTP Streaming 엔드포인트.

POST 요청을 받아 NDJSON(라인 단위 JSON) 스트리밍으로 턴 결과를 반환합니다.

설계 원칙:
    - RULE-003: 구조화 출력(JSON Schema) 우선 + Pydantic 검증
    - RULE-004: 검증 실패 시 Repair loop + 안전한 폴백
    - RULE-005: 재화 인바리언트 (잔액 음수 금지)
    - RULE-007: 프롬프트/내부 추론 노출 금지
    - RULE-008: 단계/배지 가시화, TTFB 2초 목표

스트림 이벤트 타입:
    - stage: 단계 진행 상태 (Parse→Validate→Plan→Resolve→Render→Verify→Commit)
    - badges: 검증 배지 목록
    - narrative_delta: 내러티브 텍스트 조각 (타자 효과용)
    - repair: Auto-repair 이벤트 (U-018)
    - final: 최종 TurnOutput
    - error: 에러 발생 시

리팩토링 (RU-005-Q4):
    - 기존 _stream_turn_events_mock/_real을 pipeline 기반으로 통합
    - API 레이어는 스트리밍 직렬화/전송에 집중
    - 오케스트레이션 로직은 pipeline.py로 위임

참조:
    - vibe/unit-plans/U-007[Mvp].md
    - vibe/unit-plans/U-018[Mvp].md
    - vibe/refactors/RU-005-Q4.md
    - .cursor/rules/20-backend-orchestrator.mdc
"""

from __future__ import annotations

import asyncio
import contextlib
import time
from collections.abc import AsyncGenerator
from typing import Any, cast

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from unknown_world.api.turn_stream_events import (
    BadgesEvent,
    NarrativeDeltaEvent,
    RepairEvent,
    StageEvent,
    StageStatus,
    StreamEventType,
    serialize_event,
)
from unknown_world.api.turn_streaming_helpers import (
    emit_error_with_fallback,
    stream_output_with_narrative,
)
from unknown_world.models.turn import (
    CurrencyAmount,
    Language,
    TurnInput,
)
from unknown_world.orchestrator.fallback import create_safe_fallback
from unknown_world.orchestrator.pipeline import create_pipeline_context, run_pipeline
from unknown_world.orchestrator.repair_loop import MAX_REPAIR_ATTEMPTS
from unknown_world.orchestrator.stages.types import (
    PipelineEvent,
    PipelineEventType,
)

# =============================================================================
# 라우터 정의
# =============================================================================

router = APIRouter(prefix="/api", tags=["Turn"])


# =============================================================================
# Pipeline Event → Stream Event 변환
# =============================================================================


def _convert_pipeline_event(event: PipelineEvent) -> dict[str, Any] | None:
    """파이프라인 이벤트를 스트림 이벤트로 변환합니다.

    Args:
        event: 파이프라인 도메인 이벤트

    Returns:
        스트림 이벤트 dict (serialize_event에 전달) 또는 None
    """
    if event.event_type == PipelineEventType.STAGE_START:
        if event.phase is None:
            return None
        return StageEvent(
            type=StreamEventType.STAGE,
            name=event.phase.value,
            status=StageStatus.START,
        ).model_dump()

    if event.event_type == PipelineEventType.STAGE_COMPLETE:
        if event.phase is None:
            return None
        return StageEvent(
            type=StreamEventType.STAGE,
            name=event.phase.value,
            status=StageStatus.COMPLETE,
        ).model_dump()

    if event.event_type == PipelineEventType.STAGE_FAIL:
        if event.phase is None:
            return None
        return StageEvent(
            type=StreamEventType.STAGE,
            name=event.phase.value,
            status=StageStatus.FAIL,
        ).model_dump()

    if event.event_type == PipelineEventType.BADGES:
        if event.badges is None:
            return None
        return BadgesEvent(
            type=StreamEventType.BADGES,
            badges=[b.value for b in event.badges],
        ).model_dump()

    if event.event_type == PipelineEventType.REPAIR:
        return RepairEvent(
            type=StreamEventType.REPAIR,
            attempt=event.repair_attempt,
            message=event.repair_message,
        ).model_dump()

    if event.event_type == PipelineEventType.NARRATIVE_DELTA:
        if event.text is None:
            return None
        return NarrativeDeltaEvent(
            type=StreamEventType.NARRATIVE_DELTA,
            text=event.text,
        ).model_dump()

    return None


# =============================================================================
# 스트리밍 생성기
# =============================================================================


async def _stream_turn_events(
    turn_input: TurnInput, seed: int | None = None
) -> AsyncGenerator[str]:
    """턴 처리 이벤트를 NDJSON 스트림으로 생성합니다.

    Pipeline을 실행하고, 도메인 이벤트를 스트림 이벤트로 변환하여 전송합니다.

    Args:
        turn_input: 사용자 턴 입력
        seed: Mock 모드 시드 (재현성 보장)

    Yields:
        str: NDJSON 라인
    """
    # 이벤트 큐 (emit 콜백에서 이벤트를 쌓고, 메인 루프에서 소비)
    event_queue: asyncio.Queue[PipelineEvent | None] = asyncio.Queue()

    async def emit(event: PipelineEvent) -> None:
        """파이프라인 이벤트를 큐에 추가합니다."""
        await event_queue.put(event)

    # Pipeline 컨텍스트 생성
    ctx = create_pipeline_context(turn_input, seed=seed)

    # Pipeline 실행을 백그라운드 태스크로 시작
    async def run_pipeline_task() -> None:
        nonlocal ctx
        try:
            ctx = await run_pipeline(ctx, emit=emit)
        except asyncio.CancelledError:
            # RU-005-S2: 클라이언트 Abort 시 태스크도 취소됨
            # - 폴백 생성 없이 즉시 종료 (프론트 정책과 맞춤)
            raise  # finally 블록은 실행, 종료 신호만 보냄
        except Exception:
            # 예외 발생 시 폴백 (RULE-004)
            ctx.output = create_safe_fallback(
                language=turn_input.language,
                economy_snapshot=ctx.economy_snapshot,
                repair_count=ctx.repair_attempts,
            )
            ctx.is_fallback = True
        finally:
            # 종료 신호 (CancelledError 포함 모든 경우에 전송)
            await event_queue.put(None)

    pipeline_task = asyncio.create_task(run_pipeline_task())

    # 이벤트 소비 루프
    try:
        while True:
            event = await event_queue.get()
            if event is None:
                # Pipeline 종료
                break

            stream_event = _convert_pipeline_event(event)
            if stream_event is not None:
                yield serialize_event(stream_event)

        # Pipeline 완료 후 내러티브 + final 전송 (RU-005-Q3: 헬퍼 사용)
        if ctx.output is not None:
            async for line in stream_output_with_narrative(ctx.output):
                yield line

    except asyncio.CancelledError:
        # RU-005-S2: 클라이언트 Abort(연결 취소) 시 조용히 종료
        # - 추가 이벤트(error/final) 송출하지 않음
        # - 로그도 noisy하지 않게 남기지 않음 (프론트 정책과 맞춤)
        pass

    except Exception:
        # 예외 발생 시 error + final(폴백) 순서로 송출 (RULE-004, RU-005-Q3: 헬퍼 사용)
        async for line in emit_error_with_fallback(
            turn_input.language,
            economy_snapshot=ctx.economy_snapshot,
            repair_count=MAX_REPAIR_ATTEMPTS,
        ):
            yield line

    finally:
        # Pipeline 태스크 정리
        if not pipeline_task.done():
            pipeline_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await pipeline_task


# =============================================================================
# 입력 검증
# =============================================================================


async def _validate_and_parse_input(request: Request) -> TurnInput | dict[str, Any]:
    """요청 본문을 TurnInput으로 검증 및 파싱합니다.

    Returns:
        TurnInput 또는 에러 정보 dict (language, economy_snapshot 포함)
    """
    body: dict[str, Any] | None = None
    try:
        body = await request.json()
        return TurnInput.model_validate(body)
    except ValidationError as e:
        # RU-002-S1: 입력 검증 실패 시에도 language/economy 추출 시도
        raw_language = body.get("language") if isinstance(body, dict) else None
        raw_economy = body.get("economy_snapshot") if isinstance(body, dict) else None
        return {
            "error": True,
            "message": "Invalid input",
            "details": e.errors(),
            "language": raw_language if raw_language in ("ko-KR", "en-US") else "ko-KR",
            "economy_snapshot": raw_economy,
        }
    except Exception:
        return {
            "error": True,
            "message": "Failed to parse request body",
            "details": None,
            "language": "ko-KR",
            "economy_snapshot": None,
        }


# =============================================================================
# API 엔드포인트
# =============================================================================


@router.post(
    "/turn",
    response_class=StreamingResponse,
    summary="턴 처리 (HTTP Streaming)",
    description="""
턴 입력을 받아 NDJSON 스트리밍으로 결과를 반환합니다.

**스트림 이벤트 타입**:
- `stage`: 처리 단계 진행 상태
- `badges`: 검증 배지 목록
- `narrative_delta`: 내러티브 텍스트 조각 (타자 효과)
- `final`: 최종 TurnOutput
- `error`: 에러 발생 시

**예시 요청**:
```json
{
    "language": "ko-KR",
    "text": "문을 열어본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
}
```
""",
    responses={
        200: {
            "description": "NDJSON 스트림",
            "content": {
                "application/x-ndjson": {
                    "example": '{"type":"stage","name":"parse","status":"start"}\n'
                }
            },
        },
        400: {"description": "잘못된 요청"},
    },
)
async def turn_stream(request: Request) -> StreamingResponse:
    """턴 처리 HTTP Streaming 엔드포인트.

    POST 요청으로 TurnInput을 받아 NDJSON 스트리밍으로 결과를 반환합니다.
    TTFB를 줄이기 위해 첫 stage 이벤트를 즉시 전송합니다.

    Args:
        request: FastAPI Request 객체

    Returns:
        StreamingResponse: NDJSON 스트림
    """
    # 입력 검증
    parse_result = await _validate_and_parse_input(request)

    if isinstance(parse_result, dict) and parse_result.get("error"):
        # RU-002-S1: 입력 검증 실패 시에도 error + final(폴백) 순서로 송출
        error_language = parse_result.get("language", "ko-KR")
        error_economy = parse_result.get("economy_snapshot")

        # economy_snapshot이 유효한지 확인
        economy_snapshot: CurrencyAmount | None = None
        if isinstance(error_economy, dict):
            try:
                # 명시적 타입 캐스팅으로 Pyright 경고 해소
                eco_dict = cast(dict[str, Any], error_economy)
                economy_snapshot = CurrencyAmount(
                    signal=int(eco_dict.get("signal", 100)),
                    memory_shard=int(eco_dict.get("memory_shard", 5)),
                )
            except (ValueError, TypeError):
                economy_snapshot = None

        async def error_stream() -> AsyncGenerator[str]:
            # RU-005-Q3: 헬퍼를 사용하여 error + final(폴백) 송출
            async for line in emit_error_with_fallback(
                Language.KO if error_language == "ko-KR" else Language.EN,
                error_message=parse_result.get("message", "Invalid input"),
                error_code="VALIDATION_ERROR",
                economy_snapshot=economy_snapshot,
                repair_count=0,
            ):
                yield line

        return StreamingResponse(
            error_stream(),
            media_type="application/x-ndjson",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",  # nginx 버퍼링 비활성화
            },
        )

    turn_input: TurnInput = parse_result  # type: ignore[assignment]

    # 시드 추출 (쿼리 파라미터에서, 테스트/재현용)
    seed_param = request.query_params.get("seed")
    seed = int(seed_param) if seed_param else None

    # NDJSON 스트리밍 응답
    return StreamingResponse(
        _stream_turn_events(turn_input, seed=seed),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx 버퍼링 비활성화
            "X-Request-Time": str(int(time.time() * 1000)),
        },
    )
