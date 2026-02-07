"""Unknown World - Verify Stage.

검증 단계입니다.
U-090: 비정밀분석 턴 핫스팟 생성 금지 비즈니스 룰 검증이 추가되었습니다.

설계 원칙:
    - RULE-008: 단계 이벤트 일관성
    - 동작 보존: 기존 시뮬레이션 지연 유지
    - U-090: 핫스팟은 정밀분석 전용 (이중 안전장치)

참조:
    - vibe/refactors/RU-005-Q4.md
    - vibe/unit-plans/U-090[Mvp].md
"""

from __future__ import annotations

import asyncio
import logging

from unknown_world.config.models import TextModelTiering
from unknown_world.models.turn import AgentPhase
from unknown_world.orchestrator.stages.types import (
    EmitFn,
    PipelineContext,
    PipelineEvent,
    PipelineEventType,
)

logger = logging.getLogger(__name__)

# 모의 처리 지연 시간 (ms)
VERIFY_DELAY_MS = 40


async def verify_stage(ctx: PipelineContext, *, emit: EmitFn) -> PipelineContext:
    """Verify 단계를 실행합니다.

    U-090: 비정밀분석 턴에서 핫스팟이 남아있으면 강제 제거 (이중 안전장치).
    resolve stage에서 이미 필터링하지만, 만약 누락된 경우를 대비합니다.

    Args:
        ctx: 파이프라인 컨텍스트
        emit: 이벤트 emit 콜백

    Returns:
        업데이트된 컨텍스트
    """
    ctx.current_phase = AgentPhase.VERIFY

    # Stage 시작 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_START,
            phase=AgentPhase.VERIFY,
        )
    )

    # 모의 처리 지연 (기존 동작 보존)
    await asyncio.sleep(VERIFY_DELAY_MS / 1000.0)

    # U-090: 비정밀분석 턴 핫스팟 이중 안전장치
    # resolve stage에서 이미 필터링하지만, 놓친 경우를 대비
    is_vision = TextModelTiering.is_vision_trigger(
        ctx.turn_input.action_id,
        ctx.turn_input.text,
    )
    if not is_vision and ctx.output is not None and ctx.output.ui.objects:
        leaked_count = len(ctx.output.ui.objects)
        logger.error(
            "[Verify] U-090: 비정밀분석 턴에서 핫스팟 %d개 누출 감지, 강제 제거",
            leaked_count,
        )
        new_ui = ctx.output.ui.model_copy(update={"objects": []})
        ctx.output = ctx.output.model_copy(update={"ui": new_ui})

    # Stage 완료 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_COMPLETE,
            phase=AgentPhase.VERIFY,
        )
    )

    return ctx
