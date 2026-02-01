"""Unknown World - Render Stage.

렌더링 단계입니다.
U-051에서 이미지 생성 서비스 브릿지가 구축되었으며,
실제 이미지 생성 로직은 U-052/U-053에서 추가됩니다.

설계 원칙:
    - RULE-008: 단계 이벤트 일관성
    - 동작 보존: image_generator가 None이거나 should_generate가 false면 pass-through
    - U-051: 이미지 생성 서비스 의존성 주입 및 연결 가능 상태 확보

참조:
    - vibe/refactors/RU-005-Q4.md
    - vibe/unit-results/U-019[Mvp].md
    - vibe/unit-plans/U-051[Mvp].md
"""

from __future__ import annotations

import asyncio
import logging

from unknown_world.models.turn import AgentPhase
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

    # U-051: 이미지 생성 서비스 연결 가능 여부 확인
    # 실제 이미지 생성 로직은 U-052/U-053에서 구현
    if ctx.image_generator is not None:
        # 이미지 생성 서비스가 주입됨 - 연결 준비 완료
        logger.debug(
            "[Render] 이미지 생성 서비스 연결됨",
            extra={
                "generator_type": type(ctx.image_generator).__name__,
                "is_available": ctx.image_generator.is_available(),
            },
        )
        # TODO(U-052): should_generate 판정 로직 추가
        # TODO(U-053): 비동기 이미지 생성 호출 로직 추가
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
