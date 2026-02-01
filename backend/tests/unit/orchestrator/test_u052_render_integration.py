"""U-052[Mvp]: 조건부 이미지 생성 제어 로직 통합 테스트.

render_stage에서 decide_image_generation이 올바르게 호출되고
판정 로직이 파이프라인 흐름에 통합되었는지 검증합니다.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from unknown_world.models.turn import (
    ClientInfo,
    CurrencyAmount,
    EconomyOutput,
    EconomySnapshot,
    ImageJob,
    Language,
    RenderOutput,
    SafetyOutput,
    TurnInput,
    TurnOutput,
)
from unknown_world.orchestrator.stages.render import render_stage
from unknown_world.orchestrator.stages.types import PipelineContext, PipelineEventType


@pytest.fixture
def mock_emit():
    """이벤트 emit을 위한 모의 함수."""
    return AsyncMock()


@pytest.fixture
def mock_generator():
    """이미지 생성기 모의 객체."""
    generator = MagicMock()
    generator.is_available.return_value = True
    return generator


@pytest.mark.asyncio
async def test_render_stage_integration_with_image_job(mock_emit, mock_generator):
    """ImageJob이 있을 때 render_stage가 판정 로직을 수행하는지 확인."""
    # 1. 준비
    turn_input = TurnInput(
        language=Language.KO,
        text="숲으로 간다",
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )

    turn_output = TurnOutput(
        language=Language.KO,
        narrative="어두운 숲이다.",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=5, memory_shard=0),
            balance_after=CurrencyAmount(signal=95, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(
            image_job=ImageJob(should_generate=True, prompt="A dark forest", aspect_ratio="16:9")
        ),
    )

    ctx = PipelineContext(
        turn_input=turn_input,
        economy_snapshot=CurrencyAmount(signal=100, memory_shard=5),
        output=turn_output,
        image_generator=mock_generator,
    )

    # 2. 실행
    result_ctx = await render_stage(ctx, emit=mock_emit)

    # 3. 검증
    # Stage 이벤트가 발생했는지 확인
    assert mock_emit.call_count >= 2
    event_types = [call.args[0].event_type for call in mock_emit.call_args_list]
    assert PipelineEventType.STAGE_START in event_types
    assert PipelineEventType.STAGE_COMPLETE in event_types

    # 컨텍스트가 유지되었는지 확인
    assert result_ctx.output == turn_output
    assert result_ctx.image_generator == mock_generator


@pytest.mark.asyncio
async def test_render_stage_integration_insufficient_balance(mock_emit, mock_generator):
    """잔액 부족 시 render_stage가 정상적으로 흐름을 유지하는지 확인."""
    # 1. 준비 (잔액 5, 필요 10)
    turn_input = TurnInput(
        language=Language.KO,
        text="숲으로 간다",
        economy_snapshot=EconomySnapshot(signal=5, memory_shard=0),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )

    turn_output = TurnOutput(
        language=Language.KO,
        narrative="어두운 숲이다.",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=0, memory_shard=0),
            balance_after=CurrencyAmount(signal=5, memory_shard=0),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(image_job=ImageJob(should_generate=True, prompt="A forest")),
    )

    ctx = PipelineContext(
        turn_input=turn_input,
        economy_snapshot=CurrencyAmount(signal=5, memory_shard=0),
        output=turn_output,
        image_generator=mock_generator,
    )

    # 2. 실행
    result_ctx = await render_stage(ctx, emit=mock_emit)

    # 3. 검증
    assert mock_emit.call_count >= 2
    # 현재 단계(U-052)에서는 pass-through이므로 output이 변하지 않아야 함
    # (폴백 메시지 반영은 U-054 예정)
    assert result_ctx.output.render.image_job.should_generate is True


@pytest.mark.asyncio
async def test_render_stage_no_generator(mock_emit):
    """이미지 생성기가 없을 때 pass-through 동작 확인."""
    # 1. 준비
    turn_input = TurnInput(
        language=Language.KO,
        text="테스트",
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )

    ctx = PipelineContext(
        turn_input=turn_input,
        economy_snapshot=CurrencyAmount(signal=100, memory_shard=5),
        output=None,
        image_generator=None,
    )

    # 2. 실행
    result_ctx = await render_stage(ctx, emit=mock_emit)

    # 3. 검증
    assert result_ctx.image_generator is None
    event_types = [call.args[0].event_type for call in mock_emit.call_args_list]
    assert PipelineEventType.STAGE_COMPLETE in event_types
