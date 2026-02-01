"""Unknown World - Render Stage.

렌더링 단계입니다.
U-051에서 이미지 생성 서비스 브릿지가 구축되었으며,
U-052에서 이미지 생성 여부 판정 로직이 추가되었습니다.
U-053에서 실제 이미지 생성 호출 및 결과 동기화가 구현되었습니다.

설계 원칙:
    - RULE-005: 재화 인바리언트 (잔액 부족 시 텍스트-only 폴백)
    - RULE-007: 프롬프트 원문 로그 노출 금지
    - RULE-008: 단계 이벤트 일관성, 텍스트 우선 + Lazy 이미지
    - 동작 보존: image_generator가 None이거나 should_generate가 false면 pass-through
    - U-051: 이미지 생성 서비스 의존성 주입 및 연결 가능 상태 확보
    - U-052: 조건부 이미지 생성 판정 로직
    - U-053: 비동기 이미지 생성 호출 및 TurnOutput.render 동기화

참조:
    - vibe/refactors/RU-005-Q4.md
    - vibe/unit-results/U-019[Mvp].md
    - vibe/unit-results/U-051[Mvp].md
    - vibe/unit-results/U-052[Mvp].md
    - vibe/unit-plans/U-053[Mvp].md
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from unknown_world.models.turn import AgentPhase, EconomySnapshot, RenderOutput
from unknown_world.orchestrator.stages.render_helpers import (
    IMAGE_GENERATION_COST_SIGNAL,
    ImageGenerationDecision,
    decide_image_generation,
    extract_image_job,
)
from unknown_world.orchestrator.stages.types import (
    EmitFn,
    PipelineContext,
    PipelineEvent,
    PipelineEventType,
)
from unknown_world.services.image_generation import (
    ImageGenerationRequest,
    ImageGenerationStatus,
)

# 모의 처리 지연 시간 (ms)
RENDER_DELAY_MS = 80

# 로거 (프롬프트/비밀정보 노출 금지 - RULE-007)
logger = logging.getLogger(__name__)


# =============================================================================
# 이미지 생성 헬퍼 함수 (U-053)
# =============================================================================


async def _execute_image_generation(
    ctx: PipelineContext,
    image_decision: ImageGenerationDecision,
    emit: EmitFn,
) -> PipelineContext:
    """이미지 생성을 실행하고 결과를 TurnOutput에 반영합니다.

    Args:
        ctx: 파이프라인 컨텍스트
        image_decision: 이미지 생성 판정 결과 (U-052)
        emit: 이벤트 emit 콜백

    Returns:
        업데이트된 컨텍스트 (TurnOutput.render에 image_url 반영)

    설계:
        - 페어링 질문 Q1: Option A (ctx.output 갱신) 채택
        - RULE-007: 프롬프트 원문 로그 노출 금지 (해시만 사용)
        - RULE-008: 텍스트 우선 + Lazy 이미지 원칙
    """
    if ctx.image_generator is None or ctx.output is None:
        logger.debug("[Render] 이미지 생성 조건 불충족, 건너뜀")
        return ctx

    # ImageJob에서 프롬프트 추출 (판정에서 이미 유효성 검증됨)
    image_job = extract_image_job(ctx.output)
    if image_job is None or not image_job.prompt:
        logger.warning("[Render] ImageJob 또는 프롬프트 없음, 생성 건너뜀")
        return ctx

    # 생성 시작 시간 기록
    start_time = datetime.now(UTC)

    logger.info(
        "[Render] 이미지 생성 시작",
        extra={
            "prompt_hash": image_decision.prompt_hash,
            "aspect_ratio": image_decision.aspect_ratio,
            "image_size": image_decision.image_size,
        },
    )

    # ImageGenerationRequest 생성
    request = ImageGenerationRequest(
        prompt=image_job.prompt,
        aspect_ratio=image_decision.aspect_ratio or image_job.aspect_ratio,
        image_size=image_decision.image_size or image_job.image_size,
        reference_image_ids=image_job.reference_image_ids,
        session_id=None,  # 세션 ID는 필요 시 TurnInput에서 추출
        remove_background=image_job.remove_background,
        image_type_hint=image_job.image_type_hint,
    )

    try:
        # 비동기 이미지 생성 호출
        response = await ctx.image_generator.generate(request)

        # 생성 소요 시간 계산
        elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)

        # 결과 처리
        if response.status == ImageGenerationStatus.COMPLETED:
            logger.info(
                "[Render] 이미지 생성 성공",
                extra={
                    "image_id": response.image_id,
                    "image_url": response.image_url,
                    "generation_time_ms": response.generation_time_ms,
                    "total_elapsed_ms": elapsed_ms,
                    "background_removed": response.background_removed,
                },
            )

            # TurnOutput.render에 결과 반영 (Option A: ctx.output 갱신)
            ctx = _update_render_output(
                ctx=ctx,
                image_url=response.image_url,
                image_id=response.image_id,
                generation_time_ms=response.generation_time_ms,
                background_removed=response.background_removed,
            )

        else:
            # 생성 실패 - 에러 로그만 기록, 텍스트-only 폴백은 U-054에서 처리
            logger.warning(
                "[Render] 이미지 생성 실패",
                extra={
                    "status": response.status.value,
                    "message": response.message,
                    "elapsed_ms": elapsed_ms,
                    "prompt_hash": image_decision.prompt_hash,
                },
            )

    except Exception as e:
        # 예외 발생 시 안전하게 처리 (RULE-004)
        elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
        error_type = type(e).__name__

        logger.error(
            "[Render] 이미지 생성 중 예외 발생",
            extra={
                "error_type": error_type,
                "elapsed_ms": elapsed_ms,
                "prompt_hash": image_decision.prompt_hash,
            },
        )
        # 예외 시에도 ctx는 그대로 반환 (텍스트-only 폴백은 U-054)

    return ctx


def _update_render_output(
    ctx: PipelineContext,
    *,
    image_url: str | None,
    image_id: str | None,
    generation_time_ms: int,
    background_removed: bool,
) -> PipelineContext:
    """TurnOutput.render에 이미지 생성 결과를 반영합니다.

    페어링 질문 Q1: Option A (ctx.output 갱신) 채택
    - Pydantic 모델은 frozen이 아니므로 직접 수정 가능
    - model_copy()를 사용하여 새 RenderOutput 생성 후 교체

    Args:
        ctx: 파이프라인 컨텍스트
        image_url: 생성된 이미지 URL
        image_id: 생성된 이미지 ID
        generation_time_ms: 생성 소요 시간 (ms)
        background_removed: 배경 제거 수행 여부

    Returns:
        업데이트된 컨텍스트
    """
    if ctx.output is None:
        return ctx

    # 기존 RenderOutput을 복사하고 새 필드 추가
    old_render = ctx.output.render
    new_render = RenderOutput(
        image_job=old_render.image_job,
        image_url=image_url,
        image_id=image_id,
        generation_time_ms=generation_time_ms,
        background_removed=background_removed,
    )

    # TurnOutput 전체를 model_copy로 갱신
    ctx.output = ctx.output.model_copy(update={"render": new_render})

    logger.debug(
        "[Render] TurnOutput.render 업데이트 완료",
        extra={
            "image_id": image_id,
            "image_url": image_url,
        },
    )

    return ctx


async def render_stage(ctx: PipelineContext, *, emit: EmitFn) -> PipelineContext:
    """Render 단계를 실행합니다.

    이미지 생성 서비스가 주입되었으면 이미지 생성 파이프라인을 실행합니다.
    주입되지 않았거나 이미지 생성이 필요 없는 경우 pass-through로 동작합니다.

    U-051에서 브릿지가 구축되었으며, 실제 이미지 생성 로직은 U-052/U-053에서 추가됩니다:
    - U-052: should_generate 판정 및 프롬프트/해상도 추출
    - U-053: 비동기 이미지 생성 호출 및 결과 동기화

    Args:
        ctx: 파이프라인 컨텍스트 (image_generator 포함 가능)
        emit: 이벤트 emit 콜백

    Returns:
        업데이트된 컨텍스트
    """
    ctx.current_phase = AgentPhase.RENDER

    # Stage 시작 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_START,
            phase=AgentPhase.RENDER,
        )
    )

    # U-051/U-052: 이미지 생성 서비스 및 판정 로직
    image_decision: ImageGenerationDecision | None = None

    if ctx.image_generator is not None:
        # 이미지 생성 서비스가 주입됨 - 연결 준비 완료
        logger.debug(
            "[Render] 이미지 생성 서비스 연결됨",
            extra={
                "generator_type": type(ctx.image_generator).__name__,
                "is_available": ctx.image_generator.is_available(),
            },
        )

        # U-052: 이미지 생성 여부 판정
        if ctx.output is not None:
            # Economy 스냅샷을 EconomySnapshot으로 변환
            economy_snapshot = EconomySnapshot(
                signal=ctx.economy_snapshot.signal,
                memory_shard=ctx.economy_snapshot.memory_shard,
            )

            # 판정 수행
            image_decision = decide_image_generation(
                turn_output=ctx.output,
                economy_snapshot=economy_snapshot,
                language=ctx.turn_input.language.value,
            )

            # 판정 결과 로깅 (프롬프트 원문 제외 - RULE-007)
            logger.info(
                "[Render] 이미지 생성 판정 완료",
                extra={
                    "should_generate": image_decision.should_generate,
                    "reason": image_decision.reason,
                    "prompt_hash": image_decision.prompt_hash,
                    "estimated_cost": image_decision.estimated_cost_signal,
                },
            )

            # 잔액 부족으로 생성 불가 시 폴백 메시지 처리
            if (
                not image_decision.should_generate
                and image_decision.reason == "insufficient_balance"
                and image_decision.fallback_message
            ):
                logger.info(
                    "[Render] 잔액 부족, 텍스트-only 폴백 적용",
                    extra={
                        "current_signal": economy_snapshot.signal,
                        "required_signal": IMAGE_GENERATION_COST_SIGNAL,
                    },
                )
                # NOTE: 폴백 메시지를 TurnOutput에 반영하는 로직은 U-054에서 구현
                # 현재는 로그 기록만 수행

            # U-053: 이미지 생성이 필요한 경우 비동기 호출
            if image_decision.should_generate:
                ctx = await _execute_image_generation(
                    ctx=ctx,
                    image_decision=image_decision,
                    emit=emit,
                )
        else:
            logger.debug("[Render] TurnOutput 없음, 이미지 판정 건너뜀")
    else:
        # 이미지 생성 서비스 미주입 - pass-through 동작
        logger.debug("[Render] 이미지 생성 서비스 미주입, pass-through 동작")

    # 모의 처리 지연 (기존 동작 보존)
    await asyncio.sleep(RENDER_DELAY_MS / 1000.0)

    # Stage 완료 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_COMPLETE,
            phase=AgentPhase.RENDER,
        )
    )

    return ctx
