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
    - final: 최종 TurnOutput
    - error: 에러 발생 시

참조:
    - vibe/unit-plans/U-007[Mvp].md
    - .cursor/rules/20-backend-orchestrator.mdc
"""

import asyncio
import time
from collections.abc import AsyncGenerator
from typing import Any, cast

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from unknown_world.api.turn_stream_events import (
    BadgesEvent,
    ErrorEvent,
    FinalEvent,
    NarrativeDeltaEvent,
    RepairEvent,
    StageEvent,
    StageStatus,
    StreamEventType,
    serialize_event,
)
from unknown_world.models.turn import (
    AgentPhase,
    CurrencyAmount,
    Language,
    TurnInput,
    ValidationBadge,
)
from unknown_world.orchestrator.mock import MockOrchestrator

# =============================================================================
# 라우터 정의
# =============================================================================

router = APIRouter(prefix="/api", tags=["Turn"])

# 단계 목록 (PRD 예시)
ORCHESTRATOR_PHASES = [
    AgentPhase.PARSE,
    AgentPhase.VALIDATE,
    AgentPhase.PLAN,
    AgentPhase.RESOLVE,
    AgentPhase.RENDER,
    AgentPhase.VERIFY,
    AgentPhase.COMMIT,
]

# 모의 단계 지연 시간 (ms) - 실제 처리 시뮬레이션
PHASE_DELAYS_MS = {
    AgentPhase.PARSE: 50,
    AgentPhase.VALIDATE: 30,
    AgentPhase.PLAN: 100,
    AgentPhase.RESOLVE: 150,
    AgentPhase.RENDER: 80,
    AgentPhase.VERIFY: 40,
    AgentPhase.COMMIT: 20,
}


async def _stream_turn_events(
    turn_input: TurnInput, seed: int | None = None
) -> AsyncGenerator[str]:
    """턴 처리 이벤트를 NDJSON 스트림으로 생성합니다.

    Args:
        turn_input: 사용자 턴 입력
        seed: 모의 Orchestrator 시드 (재현성 보장)

    Yields:
        str: NDJSON 라인
    """
    orchestrator = MockOrchestrator(seed=seed)
    collected_badges: list[str] = []

    # Phase 1: Parse (TTFB를 위해 즉시 시작 이벤트 전송)
    yield serialize_event(
        StageEvent(
            type=StreamEventType.STAGE, name=AgentPhase.PARSE.value, status=StageStatus.START
        ).model_dump()
    )

    # 각 단계별 처리 시뮬레이션
    for phase in ORCHESTRATOR_PHASES:
        # 단계 시작
        if phase != AgentPhase.PARSE:  # Parse는 이미 전송함
            yield serialize_event(
                StageEvent(
                    type=StreamEventType.STAGE, name=phase.value, status=StageStatus.START
                ).model_dump()
            )

        # 모의 처리 지연
        delay_ms = PHASE_DELAYS_MS.get(phase, 50)
        await asyncio.sleep(delay_ms / 1000.0)

        # 단계 완료
        yield serialize_event(
            StageEvent(
                type=StreamEventType.STAGE, name=phase.value, status=StageStatus.COMPLETE
            ).model_dump()
        )

        # 배지 추가 (Validate, Verify 단계에서)
        if phase == AgentPhase.VALIDATE:
            collected_badges.append(ValidationBadge.SCHEMA_OK.value)
            collected_badges.append(ValidationBadge.ECONOMY_OK.value)
            yield serialize_event(
                BadgesEvent(
                    type=StreamEventType.BADGES, badges=collected_badges.copy()
                ).model_dump()
            )
        elif phase == AgentPhase.VERIFY:
            collected_badges.append(ValidationBadge.SAFETY_OK.value)
            collected_badges.append(ValidationBadge.CONSISTENCY_OK.value)
            yield serialize_event(
                BadgesEvent(
                    type=StreamEventType.BADGES, badges=collected_badges.copy()
                ).model_dump()
            )

    # TurnOutput 생성 (Repair 루프 포함 - RULE-004)
    max_repair_attempts = 3
    repair_attempt = 0
    turn_output = None

    try:
        while repair_attempt <= max_repair_attempts:
            try:
                # 0회차는 정상 시도, 1회차부터는 repair
                if repair_attempt > 0:
                    yield serialize_event(
                        RepairEvent(
                            type=StreamEventType.REPAIR,
                            attempt=repair_attempt,
                            message="검증 실패로 인해 다시 시도 중입니다..."
                            if turn_input.language == Language.KO
                            else "Retrying due to validation failure",
                        ).model_dump()
                    )

                turn_output = orchestrator.generate_turn_output(turn_input)
                break  # 성공 시 루프 탈출

            except ValidationError as e:
                repair_attempt += 1
                if repair_attempt > max_repair_attempts:
                    # 최종 실패 시 폴백 (RULE-004)
                    turn_output = orchestrator.create_safe_fallback(
                        language=turn_input.language,
                        error_message=str(e),
                        economy_snapshot=CurrencyAmount(
                            signal=turn_input.economy_snapshot.signal,
                            memory_shard=turn_input.economy_snapshot.memory_shard,
                        ),
                    )
                    break
                # 루프 계속 진행 (재시도)
                continue

        if turn_output:
            # 내러티브 델타 스트리밍 (타자 효과)
            narrative = turn_output.narrative
            chunk_size = 20  # 한 번에 전송할 글자 수
            for i in range(0, len(narrative), chunk_size):
                chunk = narrative[i : i + chunk_size]
                yield serialize_event(
                    NarrativeDeltaEvent(
                        type=StreamEventType.NARRATIVE_DELTA, text=chunk
                    ).model_dump()
                )
                await asyncio.sleep(0.02)  # 타자 효과 딜레이

            # 최종 TurnOutput 전송
            yield serialize_event(
                FinalEvent(type=StreamEventType.FINAL, data=turn_output).model_dump(mode="json")
            )

    except Exception:
        # RU-002-S1: 예외 발생 시 error + final(폴백) 순서로 송출
        # (프롬프트/내부 추론 노출 금지 - RULE-007)
        yield serialize_event(
            ErrorEvent(
                type=StreamEventType.ERROR,
                message="처리 중 오류가 발생했습니다"
                if turn_input.language == Language.KO
                else "An error occurred during processing",
                code="INTERNAL_ERROR",
            ).model_dump()
        )
        # 항상 final(폴백)로 종료 - 스트림 종료 인바리언트 (RULE-004)
        fallback = orchestrator.create_safe_fallback(
            language=turn_input.language,
            error_message="Internal error",
            economy_snapshot=CurrencyAmount(
                signal=turn_input.economy_snapshot.signal,
                memory_shard=turn_input.economy_snapshot.memory_shard,
            ),
        )
        yield serialize_event(
            FinalEvent(type=StreamEventType.FINAL, data=fallback).model_dump(mode="json")
        )


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
            # 에러 이벤트 송출
            yield serialize_event(
                ErrorEvent(
                    type=StreamEventType.ERROR,
                    message=parse_result.get("message", "Invalid input"),
                    code="VALIDATION_ERROR",
                ).model_dump()
            )
            # 항상 final(폴백)로 종료 - 스트림 종료 인바리언트 (RULE-004)
            fallback_orchestrator = MockOrchestrator()
            fallback = fallback_orchestrator.create_safe_fallback(
                language=Language.KO if error_language == "ko-KR" else Language.EN,
                error_message="Validation error",
                economy_snapshot=economy_snapshot,
            )
            yield serialize_event(
                FinalEvent(type=StreamEventType.FINAL, data=fallback).model_dump(mode="json")
            )

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
