"""Unknown World - Parse Stage.

입력 파싱 단계입니다.
TurnInput은 이미 API 레이어에서 파싱되었으므로, phase 전이만 담당합니다.

설계 원칙:
    - RULE-008: 단계 이벤트 일관성 (stage start/complete)
    - 동작 보존: 기존 동작 유지

참조:
    - vibe/refactors/RU-005-Q4.md
"""

from __future__ import annotations

from unknown_world.models.turn import AgentPhase
from unknown_world.orchestrator.stages.types import (
    EmitFn,
    PipelineContext,
    PipelineEvent,
    PipelineEventType,
)


async def parse_stage(ctx: PipelineContext, *, emit: EmitFn) -> PipelineContext:
    """Parse 단계를 실행합니다.

    입력은 이미 TurnInput으로 파싱되었으므로, phase 전이만 담당합니다.
    TTFB를 위해 가장 먼저 stage 이벤트를 전송합니다.

    Args:
        ctx: 파이프라인 컨텍스트
        emit: 이벤트 emit 콜백

    Returns:
        업데이트된 컨텍스트
    """
    ctx.current_phase = AgentPhase.PARSE

    # Stage 시작 이벤트 (TTFB를 위해 즉시 전송)
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_START,
            phase=AgentPhase.PARSE,
        )
    )

    # Parse 단계는 이미 API 레이어에서 완료됨
    # (TurnInput 검증은 FastAPI/Pydantic에서 처리)

    # Stage 완료 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_COMPLETE,
            phase=AgentPhase.PARSE,
        )
    )

    return ctx
