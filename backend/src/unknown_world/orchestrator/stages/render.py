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

from unknown_world.models.turn import (
    AgentPhase,
    EconomySnapshot,
    RenderOutput,
    SafetyOutput,
    ValidationBadge,
)
from unknown_world.orchestrator.stages.render_helpers import (
    ImageFallbackResult,
    ImageGenerationDecision,
    create_image_fallback_result,
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


async def _execute_image_generation(  # noqa: RUF100  # pyright: ignore[reportUnusedFunction]
    ctx: PipelineContext,
    image_decision: ImageGenerationDecision,
    emit: EmitFn,
) -> PipelineContext:
    """이미지 생성을 실행하고 결과를 TurnOutput에 반영합니다.

    U-097: 현재 render_stage에서는 text-first delivery를 위해 이 함수를 호출하지 않음.
    프론트엔드가 /api/image/generate로 비동기 생성을 수행함.
    향후 백엔드 사이드 이미지 생성이 필요한 경우(MMP 등) 재활용 가능.

    Args:
        ctx: 파이프라인 컨텍스트
        image_decision: 이미지 생성 판정 결과 (U-052)
        emit: 이벤트 emit 콜백

    Returns:
        업데이트된 컨텍스트 (TurnOutput.render에 image_url 반영)

    설계:
        - 페어링 질문 Q1: Option A (ctx.output 갱신) 채택
        - RULE-004: 실패 시 즉시 폴백 (재시도 0회, U-054 Q1: Option A)
        - RULE-007: 프롬프트 원문 로그 노출 금지 (해시만 사용)
        - RULE-008: 텍스트 우선 + Lazy 이미지 원칙
    """
    if ctx.image_generator is None or ctx.output is None:
        logger.debug("[Render] Image generation conditions not met, skipping")
        return ctx

    # ImageJob에서 프롬프트 추출 (판정에서 이미 유효성 검증됨)
    image_job = extract_image_job(ctx.output)
    if image_job is None or not image_job.prompt:
        logger.warning("[Render] No ImageJob or prompt, skipping generation")
        return ctx

    # 언어 정보 추출 (폴백 메시지용)
    language = ctx.turn_input.language.value

    # 생성 시작 시간 기록
    start_time = datetime.now(UTC)

    logger.info(
        "[Render] Image generation started",
        extra={
            "prompt_hash": image_decision.prompt_hash,
            "aspect_ratio": image_decision.aspect_ratio,
            "image_size": image_decision.image_size,
            "reference_image_url": image_decision.reference_image_url,
        },
    )

    # U-079: FAST 폴백 시 model_label 오버라이드
    effective_model_label = image_decision.model_override or "QUALITY"

    if image_decision.is_low_balance_fallback:
        logger.info(
            "[Render] U-079: Low balance FAST fallback applied",
            extra={
                "model_override": effective_model_label,
                "estimated_cost": image_decision.estimated_cost_signal,
            },
        )

    # ImageGenerationRequest 생성
    # U-091: rembg 런타임 제거 - remove_background, image_type_hint 제거
    request = ImageGenerationRequest(
        prompt=image_job.prompt,
        aspect_ratio=image_decision.aspect_ratio or image_job.aspect_ratio,
        image_size=image_decision.image_size or image_job.image_size,
        reference_image_ids=image_job.reference_image_ids,
        reference_image_url=image_decision.reference_image_url,
        session_id=None,  # 세션 ID는 필요 시 TurnInput에서 추출
        seed=ctx.seed,
        model_label=effective_model_label,
    )

    try:
        # 비동기 이미지 생성 호출
        response = await ctx.image_generator.generate(request)

        # 생성 소요 시간 계산
        elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)

        # 결과 처리
        if response.status == ImageGenerationStatus.COMPLETED:
            logger.info(
                "[Render] Image generation succeeded",
                extra={
                    "image_id": response.image_id,
                    "image_url": response.image_url,
                    "generation_time_ms": response.generation_time_ms,
                    "total_elapsed_ms": elapsed_ms,
                },
            )

            # TurnOutput.render에 결과 반영 (Option A: ctx.output 갱신)
            ctx = _update_render_output(
                ctx=ctx,
                image_url=response.image_url,
                image_id=response.image_id,
                generation_time_ms=response.generation_time_ms,
            )

        else:
            # U-054: 이미지 생성 실패 - 즉시 폴백 (재시도 0회, Q1: Option A)
            logger.warning(
                "[Render] Image generation failed, text-only fallback",
                extra={
                    "status": response.status.value,
                    "status_message": response.message,
                    "elapsed_ms": elapsed_ms,
                    "prompt_hash": image_decision.prompt_hash,
                },
            )

            # 폴백 결과 생성 및 TurnOutput 업데이트
            fallback_result = create_image_fallback_result(
                status_message=response.message,
                language=language,
            )
            ctx = _apply_image_fallback(ctx, fallback_result)

    except TimeoutError:
        # 타임아웃 예외 - 안전하게 폴백 (RULE-004)
        elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)

        logger.warning(
            "[Render] Image generation timeout, text-only fallback",
            extra={
                "elapsed_ms": elapsed_ms,
                "prompt_hash": image_decision.prompt_hash,
            },
        )

        fallback_result = create_image_fallback_result(
            status_message="timeout",
            language=language,
        )
        ctx = _apply_image_fallback(ctx, fallback_result)

    except (ValueError, TypeError) as e:
        # 잘못된 요청/검증 오류 - 안전하게 폴백 (RULE-004)
        elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
        error_type = type(e).__name__

        logger.warning(
            "[Render] Image generation request error, text-only fallback",
            extra={
                "error_type": error_type,
                "error_message": str(e),
                "elapsed_ms": elapsed_ms,
                "prompt_hash": image_decision.prompt_hash,
            },
        )

        fallback_result = create_image_fallback_result(
            status_message=str(e),
            language=language,
        )
        ctx = _apply_image_fallback(ctx, fallback_result)

    except Exception as e:
        # 기타 예외 발생 시 안전하게 처리 (RULE-004)
        elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
        error_type = type(e).__name__

        logger.error(
            "[Render] Exception during image generation, text-only fallback",
            extra={
                "error_type": error_type,
                "error_message": str(e),
                "elapsed_ms": elapsed_ms,
                "prompt_hash": image_decision.prompt_hash,
            },
        )

        fallback_result = create_image_fallback_result(
            status_message=None,
            language=language,
        )
        ctx = _apply_image_fallback(ctx, fallback_result)

    return ctx


def _apply_image_fallback(
    ctx: PipelineContext,
    fallback_result: ImageFallbackResult,
) -> PipelineContext:
    """이미지 생성 실패 시 폴백을 적용합니다.

    U-054: RULE-004에 따라 이미지 생성 실패 시 안전한 폴백을 제공합니다.
    - 안전 차단 시 TurnOutput.safety 업데이트
    - 배지에 실패 상태 반영

    Args:
        ctx: 파이프라인 컨텍스트
        fallback_result: 폴백 처리 결과

    Returns:
        업데이트된 컨텍스트
    """
    if ctx.output is None:
        return ctx

    logger.info(
        "[Render] Image fallback applied",
        extra={
            "is_safety_blocked": fallback_result.is_safety_blocked,
            "reason": fallback_result.reason,
        },
    )

    # 안전 차단 시 TurnOutput.safety 업데이트
    if fallback_result.should_update_safety:
        new_safety = SafetyOutput(
            blocked=True,
            message=fallback_result.fallback_message,
        )
        ctx.output = ctx.output.model_copy(update={"safety": new_safety})

        # 배지에 SAFETY_BLOCKED 추가
        ctx = _add_badge(ctx, ValidationBadge.SAFETY_BLOCKED)
    else:
        # 일반 실패 시에도 기존 배지는 유지하고 로그만 기록
        # (SAFETY_OK는 이미 설정되어 있을 수 있음)
        pass

    return ctx


def _add_badge(ctx: PipelineContext, badge: ValidationBadge) -> PipelineContext:
    """TurnOutput.agent_console.badges에 배지를 추가합니다.

    U-054: 이미지 생성 상태를 배지로 반영합니다.
    중복 배지는 추가하지 않습니다.

    Args:
        ctx: 파이프라인 컨텍스트
        badge: 추가할 배지

    Returns:
        업데이트된 컨텍스트
    """
    if ctx.output is None:
        return ctx

    current_badges = list(ctx.output.agent_console.badges)

    # 관련 배지 교체 (예: SAFETY_OK -> SAFETY_BLOCKED)
    if badge == ValidationBadge.SAFETY_BLOCKED:
        current_badges = [b for b in current_badges if b != ValidationBadge.SAFETY_OK]

    # 중복 방지
    if badge not in current_badges:
        current_badges.append(badge)

    # agent_console 업데이트
    new_console = ctx.output.agent_console.model_copy(update={"badges": current_badges})
    ctx.output = ctx.output.model_copy(update={"agent_console": new_console})

    logger.debug(
        "[Render] Badge added",
        extra={"badge": badge.value, "total_badges": len(current_badges)},
    )

    return ctx


def _update_render_output(
    ctx: PipelineContext,
    *,
    image_url: str | None,
    image_id: str | None,
    generation_time_ms: int,
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

    Returns:
        업데이트된 컨텍스트
    """
    if ctx.output is None:
        return ctx

    # 기존 RenderOutput을 복사하고 새 필드 추가
    # U-069: 백엔드에서 이미지 생성 완료 후 should_generate=False로 설정
    # 클라이언트가 중복 생성 요청을 보내지 않도록 함
    old_render = ctx.output.render
    updated_image_job = None
    if old_render.image_job is not None:
        # should_generate를 False로 변경하여 클라이언트 중복 생성 방지
        updated_image_job = old_render.image_job.model_copy(update={"should_generate": False})

    new_render = RenderOutput(
        image_job=updated_image_job,
        image_url=image_url,
        image_id=image_id,
        generation_time_ms=generation_time_ms,
    )

    # TurnOutput 전체를 model_copy로 갱신
    ctx.output = ctx.output.model_copy(update={"render": new_render})

    logger.debug(
        "[Render] TurnOutput.render updated",
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
            "[Render] Image generation service connected",
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

            # 판정 수행 (U-068: 이전 이미지 URL을 참조 이미지로 전달)
            image_decision = decide_image_generation(
                turn_output=ctx.output,
                economy_snapshot=economy_snapshot,
                language=ctx.turn_input.language.value,
                previous_image_url=ctx.turn_input.previous_image_url,
            )

            # 판정 결과 로깅 (프롬프트 원문 제외 - RULE-007)
            logger.info(
                "[Render] Image generation decision complete",
                extra={
                    "should_generate": image_decision.should_generate,
                    "reason": image_decision.reason,
                    "prompt_hash": image_decision.prompt_hash,
                    "estimated_cost": image_decision.estimated_cost_signal,
                    "is_low_balance_fallback": image_decision.is_low_balance_fallback,
                    "model_override": image_decision.model_override,
                },
            )

            # U-097: 이미지 생성은 프론트엔드에서 비동기로 실행 (text-first delivery)
            # 백엔드에서는 판정 결과(should_generate=True)만 image_job에 유지하고,
            # 실제 생성은 프론트엔드가 /api/image/generate로 별도 요청한다.
            # 이를 통해 텍스트 스트리밍이 이미지 생성 완료를 기다리지 않고 즉시 전달된다.
            if image_decision.should_generate:
                # U-079: 잔액 부족 FAST 폴백 시 model_label 오버라이드를 image_job에 반영
                if image_decision.model_override and ctx.output.render.image_job is not None:
                    updated_job = ctx.output.render.image_job.model_copy(
                        update={"model_label": image_decision.model_override}
                    )
                    new_render = ctx.output.render.model_copy(update={"image_job": updated_job})
                    ctx.output = ctx.output.model_copy(update={"render": new_render})

                # U-079: 잔액 부족 폴백 발생 시 경제 정보 사후 조정
                if image_decision.is_low_balance_fallback:
                    ctx = _adjust_economy_for_fallback(ctx, image_decision)

                logger.info(
                    "[Render] U-097: Delegating image generation to frontend (text-first delivery)",
                    extra={
                        "should_generate": True,
                        "model_override": image_decision.model_override,
                        "is_low_balance_fallback": image_decision.is_low_balance_fallback,
                    },
                )
        else:
            logger.debug("[Render] No TurnOutput, skipping image decision")
    else:
        # 이미지 생성 서비스 미주입 - pass-through 동작
        logger.debug("[Render] Image generation service not injected, pass-through")

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


def _adjust_economy_for_fallback(
    ctx: PipelineContext,
    image_decision: ImageGenerationDecision,
) -> PipelineContext:
    """잔액 부족 폴백 발생 시 경제 정보를 조정합니다.

    U-079: FAST 모델 폴백 시 비용을 0으로 조정하고 잔액을 보존합니다.
    또한 low_balance_warning을 활성화합니다.

    Args:
        ctx: 파이프라인 컨텍스트
        image_decision: 이미지 생성 판정 결과

    Returns:
        업데이트된 컨텍스트
    """
    if ctx.output is None:
        return ctx

    logger.info(
        "[Render] U-079: Economy info adjusted (FAST fallback applied)",
        extra={
            "original_cost": ctx.output.economy.cost.signal,
            "new_cost": image_decision.estimated_cost_signal,
        },
    )

    # 1. 비용 조정 (FAST_IMAGE_COST_SIGNAL = 0)
    new_cost = ctx.output.economy.cost.model_copy(
        update={"signal": image_decision.estimated_cost_signal}
    )

    # 2. 잔액 재계산 (snapshot - new_cost)
    # RULE-005 준수를 위해 balance_after를 다시 계산
    new_signal = max(0, ctx.economy_snapshot.signal - image_decision.estimated_cost_signal)
    new_shard = max(0, ctx.economy_snapshot.memory_shard - new_cost.memory_shard)

    new_balance = ctx.output.economy.balance_after.model_copy(
        update={"signal": new_signal, "memory_shard": new_shard}
    )

    # 3. EconomyOutput 업데이트
    new_economy = ctx.output.economy.model_copy(
        update={
            "cost": new_cost,
            "balance_after": new_balance,
            "low_balance_warning": True,
        }
    )

    ctx.output = ctx.output.model_copy(update={"economy": new_economy})

    return ctx
