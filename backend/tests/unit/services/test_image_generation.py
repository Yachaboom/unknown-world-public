"""Unknown World - 이미지 생성 서비스 단위 테스트."""

from unittest.mock import patch

import pytest

from unknown_world.services.image_generation import (
    ImageGenerationRequest,
    ImageGenerationStatus,
    ImageGenerator,
    MockImageGenerator,
    get_image_generator,
    reset_image_generator,
)


@pytest.fixture
def temp_output_dir(tmp_path):
    """임시 출력 디렉토리 픽스처."""
    return tmp_path / "test_images"


@pytest.mark.asyncio
async def test_mock_image_generator_success(temp_output_dir):
    """Mock 이미지 생성기 성공 케이스 테스트."""
    generator = MockImageGenerator(output_dir=temp_output_dir)
    request = ImageGenerationRequest(
        prompt="A beautiful sunset over a cyberpunk city",
        aspect_ratio="1:1",
        image_size="1024x1024",
    )

    response = await generator.generate(request)

    assert response.status == ImageGenerationStatus.COMPLETED
    assert response.image_id is not None
    assert response.image_url is not None
    assert (temp_output_dir / f"{response.image_id}.png").exists()


@pytest.mark.asyncio
async def test_image_generator_initialization_failure():
    """실제 이미지 생성기 초기화 실패 시 처리 테스트."""
    with patch("google.genai.Client", side_effect=Exception("Auth error")):
        generator = ImageGenerator()
        assert generator.is_available() is False


@pytest.mark.asyncio
async def test_get_image_generator_singleton():
    """팩토리 함수를 통한 싱글톤 인스턴스 반환 테스트."""
    reset_image_generator()
    gen1 = get_image_generator(force_mock=True)
    gen2 = get_image_generator(force_mock=True)

    assert gen1 is gen2


@pytest.mark.asyncio
async def test_image_request_validation():
    """이미지 생성 요청 검증 로직 테스트."""
    from unknown_world.services.image_generation import validate_image_request

    # 성공 케이스
    valid_request = ImageGenerationRequest(prompt="Test prompt")
    assert validate_image_request(valid_request) is None

    # 실패 케이스: 지원하지 않는 크기
    invalid_size = ImageGenerationRequest(prompt="Test", image_size="invalid")
    assert validate_image_request(invalid_size) == "지원하지 않는 이미지 크기: invalid"

    # 실패 케이스: 너무 짧은 프롬프트
    short_prompt = ImageGenerationRequest(prompt="A")
    assert validate_image_request(short_prompt) == "프롬프트가 너무 짧습니다."
