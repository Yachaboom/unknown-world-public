"""U-054: 이미지 생성 폴백 및 실패 복구 체계 강화 테스트.

검증 항목:
- 시나리오 1: 이미지 생성 성공 (Happy Path)
- 시나리오 2: 안전 정책 차단 (Safety Blocked) -> safety.blocked=True, 배지 반영
- 시나리오 3: 일반 생성 실패 -> image_url=None
- 시나리오 4: 타임아웃 발생 -> 안전한 폴백
- 시나리오 5: 잔액 부족 -> 텍스트-only 폴백 메시지 반영 (U-054 핵심)

NOTE: U-097 render_stage 아키텍처 변경(프론트엔드 이미지 위임)으로 인해
      백엔드 generate 메서드 호출 검증이 더 이상 유효하지 않음.
      MMP에서 테스트 전면 재작성 예정.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from unknown_world.models.turn import (
    AgentConsole,
    ClientInfo,
    CurrencyAmount,
    EconomyOutput,
    EconomySnapshot,
    ImageJob,
    Language,
    RenderOutput,
    SafetyOutput,
    Theme,
    TurnInput,
    TurnOutput,
    ValidationBadge,
)
from unknown_world.orchestrator.stages.render import render_stage
from unknown_world.orchestrator.stages.types import PipelineContext
from unknown_world.services.image_generation import (
    ImageGenerationResponse,
    ImageGenerationStatus,
)

pytestmark = pytest.mark.skip(
    reason="U-097 render_stage 아키텍처 변경(프론트엔드 이미지 위임) 미반영 — MMP에서 테스트 전면 재작성 예정"
)


@pytest.fixture
def base_turn_output():
    """기본 TurnOutput 픽스처."""
    return TurnOutput(
        language=Language.KO,
        narrative="테스트 내러티브입니다.",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=0, memory_shard=0),
            balance_after=CurrencyAmount(signal=100, memory_shard=0),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(
            image_job=ImageJob(
                should_generate=True,
                prompt="테스트 이미지 프롬프트",
            )
        ),
        agent_console=AgentConsole(badges=[ValidationBadge.SCHEMA_OK, ValidationBadge.SAFETY_OK]),
    )


@pytest.fixture
def base_turn_input():
    """기본 TurnInput 픽스처."""
    return TurnInput(
        language=Language.KO,
        text="테스트 입력",
        client=ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=0),
    )


@pytest.fixture
def mock_emit():
    """이벤트 발행 함수 모크."""
    return AsyncMock()


@pytest.fixture
def mock_image_generator():
    """이미지 생성기 서비스 모크."""
    generator = MagicMock()
    generator.is_available.return_value = True
    generator.generate = AsyncMock()
    return generator


@pytest.mark.asyncio
async def test_image_fallback_success(
    base_turn_output, base_turn_input, mock_emit, mock_image_generator
):
    """시나리오 1: 이미지 생성 성공."""
    # Given
    mock_image_generator.generate.return_value = ImageGenerationResponse(
        status=ImageGenerationStatus.COMPLETED,
        image_id="img_123",
        image_url="http://example.com/image.png",
        generation_time_ms=500,
    )

    ctx = PipelineContext(
        turn_input=base_turn_input,
        output=base_turn_output,
        image_generator=mock_image_generator,
        economy_snapshot=CurrencyAmount(signal=100, memory_shard=0),
    )

    # When
    result_ctx = await render_stage(ctx, emit=mock_emit)

    # Then
    assert result_ctx.output.render.image_url == "http://example.com/image.png"
    assert result_ctx.output.render.image_id == "img_123"
    assert ValidationBadge.SAFETY_OK in result_ctx.output.agent_console.badges


@pytest.mark.asyncio
async def test_image_fallback_safety_blocked(
    base_turn_output, base_turn_input, mock_emit, mock_image_generator
):
    """시나리오 2: 안전 정책 차단 (Safety Blocked)."""
    # Given
    mock_image_generator.generate.return_value = ImageGenerationResponse(
        status=ImageGenerationStatus.FAILED, message="Blocked by safety filters."
    )

    ctx = PipelineContext(
        turn_input=base_turn_input,
        output=base_turn_output,
        image_generator=mock_image_generator,
        economy_snapshot=CurrencyAmount(signal=100, memory_shard=0),
    )

    # When
    result_ctx = await render_stage(ctx, emit=mock_emit)

    # Then
    assert result_ctx.output.render.image_url is None
    assert result_ctx.output.safety.blocked is True
    assert ValidationBadge.SAFETY_BLOCKED in result_ctx.output.agent_console.badges
    assert ValidationBadge.SAFETY_OK not in result_ctx.output.agent_console.badges


@pytest.mark.asyncio
async def test_image_fallback_insufficient_balance(
    base_turn_output, base_turn_input, mock_emit, mock_image_generator
):
    """시나리오 5: 잔액 부족 (Insufficient Balance)."""
    # Given
    ctx = PipelineContext(
        turn_input=base_turn_input,
        output=base_turn_output,
        image_generator=mock_image_generator,
        economy_snapshot=CurrencyAmount(signal=5, memory_shard=0),
    )

    # When
    result_ctx = await render_stage(ctx, emit=mock_emit)

    # Then
    mock_image_generator.generate.assert_not_called()
    assert result_ctx.output.render.image_url is None
    assert "잔액이 부족하여" in result_ctx.output.narrative


@pytest.mark.asyncio
async def test_image_fallback_timeout(
    base_turn_output, base_turn_input, mock_emit, mock_image_generator
):
    """시나리오 4: 타임아웃 발생."""
    # Given
    mock_image_generator.generate.side_effect = TimeoutError("API Timeout")

    ctx = PipelineContext(
        turn_input=base_turn_input,
        output=base_turn_output,
        image_generator=mock_image_generator,
        economy_snapshot=CurrencyAmount(signal=100, memory_shard=0),
    )

    # When
    result_ctx = await render_stage(ctx, emit=mock_emit)

    # Then
    assert result_ctx.output.render.image_url is None
