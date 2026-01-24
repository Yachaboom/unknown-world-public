"""Unknown World - Render Stage.

렌더링 단계입니다.
현재 MVP에서는 실제 이미지 생성 없이 pass-through로 동작합니다.
추후 이미지 파이프라인(U-019~)에서 로직을 추가할 자리입니다.

설계 원칙:
    - RULE-008: 단계 이벤트 일관성
    - 동작 보존: 기존 시뮬레이션 지연 유지

참조:
    - vibe/refactors/RU-005-Q4.md
"""

from __future__ import annotations

import asyncio

from unknown_world.models.turn import AgentPhase
from unknown_world.orchestrator.stages.types import (
    EmitFn,
    PipelineContext,
    PipelineEvent,
    PipelineEventType,
)

# 모의 처리 지연 시간 (ms)
RENDER_DELAY_MS = 80


async def render_stage(ctx: PipelineContext, *, emit: EmitFn) -> PipelineContext:
    """Render 단계를 실행합니다.

    현재는 pass-through로 동작합니다.
    추후 이미지 생성/편집 파이프라인이 추가됩니다.

    Args:
        ctx: 파이프라인 컨텍스트
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
