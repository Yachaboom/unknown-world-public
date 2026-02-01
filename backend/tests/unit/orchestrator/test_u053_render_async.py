"""U-053[Mvp]: 비동기 이미지 생성 및 결과 데이터 동기화 테스트.

render_stage에서 실제 이미지 생성기를 호출하고
결과(URL, ID 등)가 TurnOutput에 올바르게 동기화되는지 검증합니다.
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
from unknown_world.orchestrator.stages.types import PipelineContext
from unknown_world.services.image_generation import (
    ImageGenerationResponse,
    ImageGenerationStatus,
)


@pytest.fixture
def mock_emit():
    """이벤트 emit을 위한 모의 함수."""
    return AsyncMock()


@pytest.fixture
def mock_generator():
    """이미지 생성기 모의 객체."""
    generator = MagicMock()
    generator.is_available.return_value = True
    # 기본적으로 성공 응답을 반환하도록 설정
    generator.generate = AsyncMock(
        return_value=ImageGenerationResponse(
            status=ImageGenerationStatus.COMPLETED,
            image_id="test_img_123",
            image_url="http://localhost/images/test_img_123.png",
            generation_time_ms=1200,
            background_removed=False,
        )
    )
    return generator


@pytest.mark.asyncio
async def test_render_stage_sync_success(mock_emit, mock_generator):
    """이미지 생성 성공 시 TurnOutput.render에 데이터가 동기화되는지 확인."""
    # 1. 준비
    turn_input = TurnInput(
        language=Language.KO,
        text="숲으로 간다",
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )

    # 초기 상태에서는 image_url이 None
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
    # generator.generate가 호출되었는지 확인
    mock_generator.generate.assert_called_once()

    # TurnOutput.render에 데이터가 반영되었는지 확인
    assert result_ctx.output.render.image_url == "http://localhost/images/test_img_123.png"
    assert result_ctx.output.render.image_id == "test_img_123"
    assert result_ctx.output.render.generation_time_ms == 1200
    assert result_ctx.output.render.background_removed is False


@pytest.mark.asyncio
async def test_render_stage_generator_failure(mock_emit, mock_generator):
    """이미지 생성 실패 시 TurnOutput이 변경되지 않는지 확인."""
    # 1. 준비 - 실패 응답 설정
    mock_generator.generate.return_value = ImageGenerationResponse(
        status=ImageGenerationStatus.FAILED,
        message="API Error",
    )

    turn_input = TurnInput(
        language=Language.KO,
        text="테스트",
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )

    turn_output = TurnOutput(
        language=Language.KO,
        narrative="테스트 내러티브",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=5, memory_shard=0),
            balance_after=CurrencyAmount(signal=95, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(image_job=ImageJob(should_generate=True, prompt="Test prompt")),
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
    assert mock_generator.generate.assert_called_once
    # 실패했으므로 image_url은 여전히 None이어야 함
    assert result_ctx.output.render.image_url is None


@pytest.mark.asyncio
async def test_render_stage_exception_handling(mock_emit, mock_generator):
    """이미지 생성 중 예외 발생 시 안전하게 처리되는지 확인."""
    # 1. 준비 - 예외 발생 설정
    mock_generator.generate.side_effect = Exception("Network Timeout")

    turn_input = TurnInput(
        language=Language.KO,
        text="테스트",
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )

    turn_output = TurnOutput(
        language=Language.KO,
        narrative="테스트 내러티브",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=5, memory_shard=0),
            balance_after=CurrencyAmount(signal=95, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(image_job=ImageJob(should_generate=True, prompt="Test prompt")),
    )

    ctx = PipelineContext(
        turn_input=turn_input,
        economy_snapshot=CurrencyAmount(signal=100, memory_shard=5),
        output=turn_output,
        image_generator=mock_generator,
    )

    # 2. 실행 & 검증 (예외가 밖으로 던져지지 않아야 함)
    result_ctx = await render_stage(ctx, emit=mock_emit)

    assert mock_generator.generate.assert_called_once
    assert result_ctx.output.render.image_url is None
