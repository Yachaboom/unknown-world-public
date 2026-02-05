import hashlib
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from unknown_world.services.item_icon_generator import (
    IconCache,
    IconGenerationRequest,
    IconGenerationStatus,
    ItemIconGenerator,
)


@pytest.fixture
def mock_image_generator():
    generator = MagicMock()
    generator.generate = AsyncMock()
    return generator


@pytest.fixture
def temp_cache_dir(tmp_path):
    return tmp_path / "icons"


@pytest.fixture
def icon_cache(temp_cache_dir):
    return IconCache(cache_dir=temp_cache_dir)


@pytest.fixture
def icon_generator(mock_image_generator, icon_cache):
    return ItemIconGenerator(image_generator=mock_image_generator, cache=icon_cache)


def test_cache_key_generation(icon_cache):
    description = "A shiny sword"
    key1 = icon_cache._make_cache_key(description)
    key2 = icon_cache._make_cache_key(description)
    assert key1 == key2
    assert key1 == hashlib.md5(description.encode()).hexdigest()


@pytest.mark.asyncio
async def test_generate_icon_cached(icon_generator, icon_cache, temp_cache_dir):
    description = "Cached item"
    cache_key = icon_cache._make_cache_key(description)
    cache_file = temp_cache_dir / f"{cache_key}.png"
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_bytes(b"fake_image_data")

    request = IconGenerationRequest(
        item_id="item_1", item_description=description, language="ko-KR"
    )

    response = await icon_generator.generate_icon(request, wait_for_completion=True)

    assert response.status == IconGenerationStatus.CACHED
    assert response.is_placeholder is False
    assert f"{cache_key}.png" in response.icon_url


@pytest.mark.asyncio
async def test_generate_icon_new_async(icon_generator, mock_image_generator):
    request = IconGenerationRequest(
        item_id="item_2", item_description="New item async", language="ko-KR"
    )

    response = await icon_generator.generate_icon(request, wait_for_completion=False)

    assert response.status == IconGenerationStatus.PENDING
    assert response.is_placeholder is True
    assert "placeholder" in response.icon_url

    # 백그라운드 태스크가 생성되었는지 확인 (내부 구현 의존적이지만 상태로 확인 가능)
    status = await icon_generator.get_icon_status("item_2")
    assert status in [IconGenerationStatus.GENERATING, IconGenerationStatus.COMPLETED]


@pytest.mark.asyncio
async def test_generate_icon_new_sync_success(
    icon_generator, mock_image_generator, icon_cache, temp_cache_dir
):
    from unknown_world.services.image_generation import (
        ImageGenerationResponse,
        ImageGenerationStatus,
    )

    description = "New item sync"
    cache_key = icon_cache._make_cache_key(description)

    # Mock response
    mock_image_id = "test_image_id"
    mock_image_generator.generate.return_value = ImageGenerationResponse(
        status=ImageGenerationStatus.COMPLETED,
        image_url="http://example.com/test.png",
        image_id=mock_image_id,
    )

    # 원본 파일이 생성된 것으로 시뮬레이션

    with patch(
        "unknown_world.services.item_icon_generator.get_generated_images_dir"
    ) as mock_get_dir:
        mock_get_dir.return_value = temp_cache_dir.parent  # icons의 상위 디렉토리
        gen_dir = temp_cache_dir.parent
        gen_dir.mkdir(parents=True, exist_ok=True)
        (gen_dir / f"{mock_image_id}.png").write_bytes(b"fake_image_content")

        # PIL.Image.open 모킹 (실제 이미지가 아니므로)
        with patch("PIL.Image.open") as mock_open:
            mock_img = MagicMock()
            mock_img.size = (1024, 1024)
            mock_img.resize.return_value = mock_img
            mock_open.return_value.__enter__.return_value = mock_img

            request = IconGenerationRequest(
                item_id="item_3", item_description=description, language="en-US"
            )

            response = await icon_generator.generate_icon(request, wait_for_completion=True)

            assert response.status == IconGenerationStatus.COMPLETED
            assert response.is_placeholder is False
            assert f"{cache_key}.png" in response.icon_url
            assert (temp_cache_dir / f"{cache_key}.png").exists()


@pytest.mark.asyncio
async def test_generate_icon_failure(icon_generator, mock_image_generator):
    from unknown_world.services.image_generation import (
        ImageGenerationResponse,
        ImageGenerationStatus,
    )

    mock_image_generator.generate.return_value = ImageGenerationResponse(
        status=ImageGenerationStatus.FAILED, image_url="", message="Generation failed"
    )

    request = IconGenerationRequest(
        item_id="item_4", item_description="Failing item", language="ko-KR"
    )

    response = await icon_generator.generate_icon(request, wait_for_completion=True)

    assert response.status == IconGenerationStatus.FAILED
    assert response.is_placeholder is True
    assert "placeholder" in response.icon_url
