from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from unknown_world.models.turn import (
    CurrencyAmount,
    EconomyOutput,
    InventoryItemData,
    Language,
    SafetyOutput,
    TurnOutput,
    WorldDelta,
)
from unknown_world.services.item_icon_generator import (
    IconGenerationRequest,
    ItemIconGenerator,
)


@pytest.fixture
def mock_image_generator():
    generator = MagicMock()
    generator.generate = AsyncMock()
    return generator


@pytest.fixture
def icon_generator(mock_image_generator):
    return ItemIconGenerator(image_generator=mock_image_generator)


@pytest.mark.asyncio
async def test_inventory_item_data_serialization():
    """Verify that TurnOutput can handle InventoryItemData in WorldDelta."""
    item = InventoryItemData(
        id="item_1",
        label="빛나는 검",
        description="태양의 빛을 머금은 전설적인 검입니다.",
        quantity=1,
    )

    delta = WorldDelta(
        inventory_added=[item]  # DESIRED: list[InventoryItemData]
    )

    output = TurnOutput(
        language=Language.KO,
        narrative="아이템을 획득했습니다.",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=0, memory_shard=0),
            balance_after=CurrencyAmount(signal=100, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
        world=delta,
    )

    assert isinstance(output.world.inventory_added[0], InventoryItemData)
    assert output.world.inventory_added[0].label == "빛나는 검"


@pytest.mark.asyncio
async def test_item_icon_generator_generates_icon(icon_generator, mock_image_generator):
    """Verify icon generator calls image generator without rembg (U-091)."""
    from unknown_world.services.image_generation import (
        ImageGenerationResponse,
        ImageGenerationStatus,
    )

    mock_image_generator.generate.return_value = ImageGenerationResponse(
        status=ImageGenerationStatus.COMPLETED,
        image_url="http://example.com/icon.png",
        image_id="img_1",
    )

    request = IconGenerationRequest(
        item_id="item_1", item_description="A shiny sword", language="ko-KR"
    )

    with patch.object(
        mock_image_generator, "generate", wraps=mock_image_generator.generate
    ) as mocked_gen:
        await icon_generator.generate_icon(request, wait_for_completion=True)

        called_request = mocked_gen.call_args[0][0]
        # U-091: rembg 런타임 제거 - remove_background 필드가 더 이상 없음
        assert called_request.model_label == "FAST"
