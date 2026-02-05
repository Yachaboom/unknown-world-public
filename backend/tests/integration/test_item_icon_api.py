from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from unknown_world.services.item_icon_generator import (
    reset_item_icon_generator,
)


@pytest.fixture(autouse=True)
def reset_generator():
    reset_item_icon_generator()
    yield
    reset_item_icon_generator()


@pytest.mark.asyncio
async def test_api_generate_icon_async():
    from unknown_world.main import app

    # ItemIconGenerator.generate_icon을 모킹하여 실제 이미지 생성 방지
    with patch("unknown_world.api.item_icon.get_item_icon_generator") as mock_get_generator:
        mock_generator = MagicMock()
        mock_get_generator.return_value = mock_generator

        from unknown_world.services.item_icon_generator import (
            IconGenerationResponse,
            IconGenerationStatus,
        )

        mock_generator.generate_icon = AsyncMock(
            return_value=IconGenerationResponse(
                status=IconGenerationStatus.PENDING,
                icon_url="/ui/icons/placeholder_item.png",
                item_id="item_123",
                is_placeholder=True,
                message="Generating...",
            )
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/api/item/icon",
                json={
                    "item_id": "item_123",
                    "description": "A mysterious potion",
                    "language": "ko-KR",
                    "wait": False,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert data["item_id"] == "item_123"
        assert data["is_placeholder"] is True
        assert "/ui/icons/placeholder_item.png" in data["icon_url"]


@pytest.mark.asyncio
async def test_api_get_icon_status():
    from unknown_world.main import app

    with patch("unknown_world.api.item_icon.get_item_icon_generator") as mock_get_generator:
        mock_generator = MagicMock()
        mock_get_generator.return_value = mock_generator

        from unknown_world.services.item_icon_generator import IconGenerationStatus

        mock_generator.get_icon_status = AsyncMock(return_value=IconGenerationStatus.COMPLETED)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/item/icon/item_123/status")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["item_id"] == "item_123"
