"""Unknown World - Render Stage.

렌더링 단계입니다.
U-051에서 이미지 생성 서비스 브릿지가 구축되었으며,
U-052에서 이미지 생성 여부 판정 로직이 추가되었습니다.
실제 이미지 생성 호출은 U-053에서 구현됩니다.

설계 원칙:
    - RULE-005: 재화 인바리언트 (잔액 부족 시 텍스트-only 폴백)
    - RULE-007: 프롬프트 원문 로그 노출 금지
    - RULE-008: 단계 이벤트 일관성, 텍스트 우선 + Lazy 이미지
    - 동작 보존: image_generator가 None이거나 should_generate가 false면 pass-through
    - U-051: 이미지 생성 서비스 의존성 주입 및 연결 가능 상태 확보
    - U-052: 조건부 이미지 생성 판정 로직

참조:
    - vibe/refactors/RU-005-Q4.md
    - vibe/unit-results/U-019[Mvp].md
    - vibe/unit-results/U-051[Mvp].md
    - vibe/unit-plans/U-052[Mvp].md
"""

from __future__ import annotations

import asyncio
import logging

from unknown_world.models.turn import AgentPhase, EconomySnapshot
from unknown_world.orchestrator.stages.render_helpers import (
    IMAGE_GENERATION_COST_SIGNAL,
    ImageGenerationDecision,
    decide_image_generation,
)
from unknown_world.orchestrator.stages.types import (
    EmitFn,
    PipelineContext,
    PipelineEvent,
    PipelineEventType,
)

# 모의 처리 지연 시간 (ms)
RENDER_DELAY_MS = 80

# 로거 (프롬프트/비밀정보 노출 금지 - RULE-007)
logger = logging.getLogger(__name__)


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

            # TODO(U-053): image_decision.should_generate=true면 비동기 이미지 생성 호출
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
