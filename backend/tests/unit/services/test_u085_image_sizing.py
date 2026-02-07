"""Unknown World - U-085 이미지 사이징 및 SDK 호환성 테스트."""

from unknown_world.services.image_generation import (
    ImageGenerationRequest,
    validate_image_request,
)
from unknown_world.storage.validation import (
    DEFAULT_ASPECT_RATIO,
    DEFAULT_IMAGE_SIZE,
    SUPPORTED_IMAGE_SIZES,
    normalize_image_size,
    validate_image_generation_request,
)


def test_normalize_image_size():
    """레거시 픽셀 값 → SDK 값 변환 및 정규화 테스트."""
    # 1. 이미 SDK 값인 경우 유지
    assert normalize_image_size("1K") == "1K"
    assert normalize_image_size("2K") == "2K"
    assert normalize_image_size("4K") == "4K"

    # 2. 레거시 픽셀 값 매핑
    assert normalize_image_size("1024x1024") == "1K"
    assert normalize_image_size("1280x768") == "1K"
    assert normalize_image_size("1536x1024") == "2K"
    assert normalize_image_size("1024x1536") == "2K"

    # 3. 알 수 없는 값 → 입력값 유지 (검증에서 걸러지도록 함)
    assert normalize_image_size("invalid") == "invalid"
    assert normalize_image_size("640x480") == "640x480"


def test_validate_image_generation_request_with_sdk_sizes():
    """SDK 크기 값을 포함한 이미지 생성 요청 검증 테스트."""
    # 1. 성공 케이스 (SDK 값)
    assert validate_image_generation_request("A test prompt", "1K") is None
    assert validate_image_generation_request("A test prompt", "2K") is None
    assert validate_image_generation_request("A test prompt", "4K") is None

    # 2. 성공 케이스 (레거시 값 - 자동 정규화 포함)
    assert validate_image_generation_request("A test prompt", "1024x1024") is None

    # 3. 실패 케이스 (지원하지 않는 크기)
    err = validate_image_generation_request("A test prompt", "8K")
    assert "지원하지 않는 이미지 크기" in err

    # 4. 실패 케이스 (프롬프트 짧음)
    err = validate_image_generation_request("A", "1K")
    assert "프롬프트가 너무 짧습니다" in err


def test_image_generation_service_request_validation():
    """서비스 계층의 ImageGenerationRequest 검증 테스트."""
    # 1. SDK 값 사용 시 통과
    request_sdk = ImageGenerationRequest(prompt="A high quality scene", image_size="1K")
    assert validate_image_request(request_sdk) is None

    # 2. 레거시 값 사용 시 통과 (정규화 루틴 포함됨)
    request_legacy = ImageGenerationRequest(prompt="A high quality scene", image_size="1024x1024")
    assert validate_image_request(request_legacy) is None

    # 3. 잘못된 값 실패
    request_invalid = ImageGenerationRequest(prompt="A high quality scene", image_size="unknown")
    assert validate_image_request(request_invalid) is not None


def test_constants_and_defaults():
    """U-085에서 변경된 기본값 및 상수 확인."""
    assert DEFAULT_ASPECT_RATIO == "16:9"
    assert DEFAULT_IMAGE_SIZE == "1K"
    assert "1K" in SUPPORTED_IMAGE_SIZES
    assert "2K" in SUPPORTED_IMAGE_SIZES
    assert "4K" in SUPPORTED_IMAGE_SIZES
    # 소문자 'k'는 지원하지 않아야 함 (SDK 제약)
    assert "1k" not in SUPPORTED_IMAGE_SIZES
