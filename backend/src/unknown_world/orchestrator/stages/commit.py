"""Unknown World - Commit Stage.

커밋 단계입니다.
파이프라인의 최종 단계로, TurnOutput을 확정합니다.

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
COMMIT_DELAY_MS = 20


async def commit_stage(ctx: PipelineContext, *, emit: EmitFn) -> PipelineContext:
    """Commit 단계를 실행합니다.

    파이프라인의 최종 단계로, TurnOutput을 확정합니다.

    Args:
        ctx: 파이프라인 컨텍스트
        emit: 이벤트 emit 콜백

    Returns:
        업데이트된 컨텍스트
    """
    ctx.current_phase = AgentPhase.COMMIT

    # Stage 시작 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_START,
            phase=AgentPhase.COMMIT,
        )
    )

    # 모의 처리 지연 (기존 동작 보존)
    await asyncio.sleep(COMMIT_DELAY_MS / 1000.0)

    # Stage 완료 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_COMPLETE,
            phase=AgentPhase.COMMIT,
        )
    )

    return ctx
