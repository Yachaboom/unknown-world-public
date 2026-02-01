"""U-051[Mvp] 렌더링 단계-이미지 생성 서비스 브릿지 구축 테스트.

검증 항목:
    - PipelineContext에 image_generator 필드 존재 및 주입 가능 여부
    - create_pipeline_context 호출 시 이미지 생성기 자동 획득 (Option A)
    - render_stage에서 주입된 이미지 생성기 접근 가능 여부
    - RULE-008: 단계 이벤트 일관성 유지
"""

from unittest.mock import MagicMock

import pytest

from unknown_world.models.turn import AgentPhase, ClientInfo, EconomySnapshot, Language, TurnInput
from unknown_world.orchestrator.pipeline import create_pipeline_context
from unknown_world.orchestrator.stages.render import render_stage
from unknown_world.orchestrator.stages.types import PipelineEvent, PipelineEventType
from unknown_world.services.image_generation import MockImageGenerator


@pytest.fixture
def turn_input() -> TurnInput:
    return TurnInput(
        language=Language.KO,
        text="테스트 입력",
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=10),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )


def test_pipeline_context_image_generator_injection(turn_input):
    """PipelineContext에 이미지 생성기가 명시적으로 주입되는지 확인."""
    mock_gen = MagicMock(spec=MockImageGenerator)
    ctx = create_pipeline_context(turn_input, image_generator=mock_gen)

    assert ctx.image_generator == mock_gen


def test_create_pipeline_context_default_generator(turn_input):
    """image_generator를 전달하지 않았을 때 get_image_generator()를 통해 자동 획득하는지 확인.

    현재 구현은 None을 반환하므로 이 테스트는 실패해야 함 (Red 단계).
    """
    # get_image_generator를 모킹하여 호출 여부 확인
    with pytest.MonkeyPatch.context() as mp:
        mock_get_gen = MagicMock()
        mp.setattr("unknown_world.orchestrator.pipeline.get_image_generator", mock_get_gen)

        ctx = create_pipeline_context(turn_input)

        # 현재 구현에서는 mock_get_gen.called 가 False이고 ctx.image_generator가 None일 것임
        assert mock_get_gen.called, "get_image_generator()가 호출되어야 함"
        assert ctx.image_generator == mock_get_gen.return_value


@pytest.mark.asyncio
async def test_render_stage_uses_injected_generator(turn_input):
    """render_stage가 주입된 이미지 생성기를 올바르게 인식하는지 확인."""
    mock_gen = MagicMock(spec=MockImageGenerator)
    mock_gen.is_available.return_value = True

    ctx = create_pipeline_context(turn_input, image_generator=mock_gen)

    events = []

    async def emit(event: PipelineEvent):
        events.append(event)

    ctx = await render_stage(ctx, emit=emit)

    # 1. 상태 전이 및 이벤트 확인
    assert ctx.current_phase == AgentPhase.RENDER
    assert len(events) == 2
    assert events[0].event_type == PipelineEventType.STAGE_START
    assert events[1].event_type == PipelineEventType.STAGE_COMPLETE

    # 2. 이미지 생성기 호출 확인 (is_available 호출 여부로 간접 확인)
    assert mock_gen.is_available.called
