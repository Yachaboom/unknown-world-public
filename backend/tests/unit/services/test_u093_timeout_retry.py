from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from unknown_world.services.image_generation import (
    ImageGenerationResponse,
    ImageGenerationStatus,
)
from unknown_world.services.item_icon_generator import (
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
def icon_generator(mock_image_generator):
    # 캐시는 Mock으로 처리하여 파일 시스템 의존성 제거
    mock_cache = MagicMock()
    mock_cache.get.return_value = None
    return ItemIconGenerator(image_generator=mock_image_generator, cache=mock_cache)


@pytest.mark.asyncio
async def test_retry_on_timeout(icon_generator, mock_image_generator):
    """타임아웃 발생 시 최대 1회 재시도(총 2회) 후 성공하는지 검증."""
    request = IconGenerationRequest(
        item_id="item_timeout", item_description="Timeout Item", language="ko-KR"
    )

    # 첫 번째는 TimeoutError, 두 번째는 성공 응답 설정
    mock_image_generator.generate.side_effect = [
        TimeoutError(),
        ImageGenerationResponse(
            status=ImageGenerationStatus.COMPLETED,
            image_url="http://example.com/retry_success.png",
            image_id="img_retry_success",
        ),
    ]

    # asyncio.sleep 모킹 (대기 시간 제거)
    with (
        patch("asyncio.sleep", AsyncMock()) as mock_sleep,
        patch("unknown_world.services.item_icon_generator.get_generated_images_dir") as mock_dir,
        patch("pathlib.Path.exists", return_value=True),
        patch("pathlib.Path.read_bytes", return_value=b"fake_data"),
    ):
        mock_dir.return_value = MagicMock()
        # IconCache.set 모킹
        icon_generator._cache.set.return_value = "http://example.com/cached.png"

        response = await icon_generator.generate_icon(request, wait_for_completion=True)

        # 결과 검증
        assert response.status == IconGenerationStatus.COMPLETED
        assert response.icon_url == "http://example.com/cached.png"
        assert mock_image_generator.generate.call_count == 2
        assert mock_sleep.call_count == 1
        mock_sleep.assert_called_with(2.0)  # 첫 번째 백오프: 2.0s


@pytest.mark.asyncio
async def test_retry_on_retryable_error(icon_generator, mock_image_generator):
    """재시도 가능한 에러(예: 500) 발생 시 재시도하는지 검증."""
    request = IconGenerationRequest(
        item_id="item_retryable", item_description="Retryable Item", language="ko-KR"
    )

    # 첫 번째는 실패(재시도 가능), 두 번째는 성공
    mock_image_generator.generate.side_effect = [
        ImageGenerationResponse(
            status=ImageGenerationStatus.FAILED, message="Internal Server Error (500)"
        ),
        ImageGenerationResponse(
            status=ImageGenerationStatus.COMPLETED,
            image_url="http://example.com/retry_success.png",
            image_id="img_retry_success",
        ),
    ]

    with (
        patch("asyncio.sleep", AsyncMock()) as mock_sleep,
        patch("unknown_world.services.item_icon_generator.get_generated_images_dir"),
        patch("pathlib.Path.exists", return_value=True),
        patch("pathlib.Path.read_bytes", return_value=b"fake_data"),
    ):
        icon_generator._cache.set.return_value = "http://example.com/cached.png"

        response = await icon_generator.generate_icon(request, wait_for_completion=True)

        assert response.status == IconGenerationStatus.COMPLETED
        assert mock_image_generator.generate.call_count == 2
        assert mock_sleep.call_count == 1


@pytest.mark.asyncio
async def test_no_retry_on_non_retryable_error(icon_generator, mock_image_generator):
    """재시도 불가능한 에러(예: safety block) 발생 시 재시도하지 않는지 검증."""
    request = IconGenerationRequest(
        item_id="item_non_retryable", item_description="Blocked Item", language="ko-KR"
    )

    # Safety 차단 에러 (재시도 불가)
    mock_image_generator.generate.return_value = ImageGenerationResponse(
        status=ImageGenerationStatus.FAILED, message="Safety filter blocked the request"
    )

    with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
        response = await icon_generator.generate_icon(request, wait_for_completion=True)

        assert response.status == IconGenerationStatus.FAILED
        assert response.is_placeholder is True
        # 재시도 없이 1회 호출 후 종료되어야 함
        assert mock_image_generator.generate.call_count == 1
        assert mock_sleep.call_count == 0


@pytest.mark.asyncio
async def test_final_failure_after_max_retries(icon_generator, mock_image_generator):
    """모든 재시도(총 2회) 실패 시 최종적으로 FAILED를 반환하는지 검증."""
    request = IconGenerationRequest(
        item_id="item_all_fail", item_description="Always Failing Item", language="ko-KR"
    )

    # 2회 모두 타임아웃 발생
    mock_image_generator.generate.side_effect = [
        TimeoutError(),
        TimeoutError(),
    ]

    with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
        response = await icon_generator.generate_icon(request, wait_for_completion=True)

        assert response.status == IconGenerationStatus.FAILED
        assert response.is_placeholder is True
        assert "아이콘 생성 실패 (2/2 시도)" in response.message
        assert mock_image_generator.generate.call_count == 2
        assert mock_sleep.call_count == 1


@pytest.mark.asyncio
async def test_retry_on_retryable_exception(icon_generator, mock_image_generator):
    """재시도 가능한 예외(예: ConnectionError) 발생 시 재시도하는지 검증."""
    request = IconGenerationRequest(
        item_id="item_exc", item_description="Exception Item", language="ko-KR"
    )

    # 첫 번째는 ConnectionError, 두 번째는 성공
    mock_image_generator.generate.side_effect = [
        ConnectionError("Network disconnected"),
        ImageGenerationResponse(
            status=ImageGenerationStatus.COMPLETED,
            image_url="http://example.com/retry_success.png",
            image_id="img_retry_success",
        ),
    ]

    with (
        patch("asyncio.sleep", AsyncMock()) as mock_sleep,
        patch("unknown_world.services.item_icon_generator.get_generated_images_dir"),
        patch("pathlib.Path.exists", return_value=True),
        patch("pathlib.Path.read_bytes", return_value=b"fake_data"),
    ):
        icon_generator._cache.set.return_value = "http://example.com/cached.png"

        response = await icon_generator.generate_icon(request, wait_for_completion=True)

        assert response.status == IconGenerationStatus.COMPLETED
        assert mock_image_generator.generate.call_count == 2
        assert mock_sleep.call_count == 1
