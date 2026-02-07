"""Unknown World - 파일 검증 및 제한 정책.

모든 이미지/아티팩트 관련 검증 로직과 상수를 중앙 관리합니다.
U-085: image_size를 SDK 값(1K/2K/4K)으로 마이그레이션.

설계 원칙:
    - RULE-007: 에러 메시지에 파일 내용 노출 금지
    - RULE-004: 검증 실패 시 명확한 에러 메시지 반환

참조:
    - vibe/refactors/RU-006-Q1.md
"""

from __future__ import annotations

from typing import Final

from unknown_world.models.turn import Language

# =============================================================================
# 이미지 업로드 제한 (Scanner/Vision 공통)
# =============================================================================

ALLOWED_IMAGE_MIME_TYPES: Final[frozenset[str]] = frozenset(
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    }
)
"""지원하는 이미지 MIME 타입."""

MAX_IMAGE_FILE_SIZE_BYTES: Final[int] = 20 * 1024 * 1024  # 20MB
"""최대 이미지 파일 크기 (바이트)."""

MIN_IMAGE_FILE_SIZE_BYTES: Final[int] = 100
"""최소 이미지 파일 크기 (손상 파일 감지용)."""

# =============================================================================
# 이미지 생성 제한
# =============================================================================

SUPPORTED_IMAGE_SIZES: Final[frozenset[str]] = frozenset({"1K", "2K", "4K"})
"""지원하는 이미지 생성 크기 (SDK 값, U-085: Q2 Option B 마이그레이션).

Gemini SDK image_config.image_size 값과 1:1 대응합니다.
대문자 'K' 필수 (소문자 거부됨).
참조: vibe/ref/image-generate-guide.md
"""

# U-085: 레거시 픽셀 기반 크기 → SDK 값 매핑 (하위 호환용)
LEGACY_IMAGE_SIZE_MAP: Final[dict[str, str]] = {
    "1024x1024": "1K",
    "1280x768": "1K",
    "768x1280": "1K",
    "1536x1024": "2K",
    "1024x1536": "2K",
}
"""레거시 픽셀 기반 image_size → SDK 값 매핑 (하위 호환)."""

DEFAULT_IMAGE_SIZE: Final[str] = "1K"
"""기본 이미지 생성 크기 (SDK 값, U-085 마이그레이션)."""

DEFAULT_ASPECT_RATIO: Final[str] = "16:9"
"""기본 가로세로 비율 (U-085: 게임 UI 기본 비율)."""

SUPPORTED_ASPECT_RATIOS: Final[frozenset[str]] = frozenset(
    {"1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"}
)
"""SDK가 지원하는 aspect_ratio 값 목록.

참조: vibe/ref/image-generate-guide.md
"""

MIN_PROMPT_LENGTH: Final[int] = 3
"""최소 프롬프트 길이."""

MAX_PROMPT_LENGTH: Final[int] = 2000
"""최대 프롬프트 길이."""

# =============================================================================
# bbox 정규화 범위 (RULE-009)
# =============================================================================

BBOX_MIN: Final[int] = 0
"""bbox 최소값."""

BBOX_MAX: Final[int] = 1000
"""bbox 최대값."""


# =============================================================================
# 검증 함수
# =============================================================================


def validate_image_upload(
    content: bytes,
    content_type: str,
    *,
    language: Language = Language.KO,
) -> str | None:
    """업로드 이미지를 검증합니다.

    Args:
        content: 이미지 바이트 데이터
        content_type: MIME 타입
        language: 에러 메시지 언어

    Returns:
        에러 메시지 (없으면 None)
    """
    is_ko = language == Language.KO

    # MIME 타입 검증
    if content_type.lower() not in ALLOWED_IMAGE_MIME_TYPES:
        return (
            f"지원하지 않는 이미지 형식입니다: {content_type}"
            if is_ko
            else f"Unsupported image format: {content_type}"
        )

    # 파일 크기 검증 (최대)
    if len(content) > MAX_IMAGE_FILE_SIZE_BYTES:
        size_mb = len(content) / (1024 * 1024)
        return (
            f"파일이 너무 큽니다: {size_mb:.1f}MB (최대 20MB)"
            if is_ko
            else f"File too large: {size_mb:.1f}MB (max 20MB)"
        )

    # 파일 크기 검증 (최소 - 손상 파일 감지)
    if len(content) < MIN_IMAGE_FILE_SIZE_BYTES:
        return (
            "이미지 파일이 손상되었거나 비어있습니다"
            if is_ko
            else "Image file is corrupted or empty"
        )

    return None


def normalize_image_size(image_size: str) -> str:
    """이미지 크기를 SDK 값으로 정규화합니다 (U-085).

    레거시 픽셀 기반 값(예: "1024x1024")이 들어오면 SDK 값(예: "1K")으로 매핑합니다.
    이미 SDK 값이면 그대로 반환합니다.

    Args:
        image_size: 요청된 이미지 크기 (SDK 값 또는 레거시 픽셀 값)

    Returns:
        정규화된 SDK 이미지 크기 값
    """
    if image_size in SUPPORTED_IMAGE_SIZES:
        return image_size
    # 레거시 값이면 매핑, 아니면 입력값 그대로 반환하여 검증에서 걸러지도록 함
    return LEGACY_IMAGE_SIZE_MAP.get(image_size, image_size)


def validate_image_generation_request(
    prompt: str,
    image_size: str,
    *,
    language: Language = Language.KO,
) -> str | None:
    """이미지 생성 요청을 검증합니다.

    U-085: image_size는 SDK 값(1K/2K/4K) 또는 레거시 픽셀 값을 허용합니다.
    레거시 값은 normalize_image_size()로 자동 변환됩니다.

    Args:
        prompt: 이미지 생성 프롬프트
        image_size: 요청된 이미지 크기 (SDK 값 또는 레거시 픽셀 값)
        language: 에러 메시지 언어

    Returns:
        에러 메시지 (없으면 None)
    """
    is_ko = language == Language.KO

    # 이미지 크기 검증 (SDK 값 또는 레거시 매핑 가능 값)
    normalized = normalize_image_size(image_size)
    if normalized not in SUPPORTED_IMAGE_SIZES:
        return (
            f"지원하지 않는 이미지 크기: {image_size}"
            if is_ko
            else f"Unsupported image size: {image_size}"
        )

    # 프롬프트 길이 검증 (너무 짧음)
    if len(prompt) < MIN_PROMPT_LENGTH:
        return "프롬프트가 너무 짧습니다." if is_ko else "Prompt is too short."

    # 프롬프트 길이 검증 (너무 김)
    if len(prompt) > MAX_PROMPT_LENGTH:
        return (
            f"프롬프트가 너무 깁니다 (최대 {MAX_PROMPT_LENGTH}자)."
            if is_ko
            else f"Prompt is too long (max {MAX_PROMPT_LENGTH} chars)."
        )

    return None


def get_max_file_size_mb() -> int:
    """최대 파일 크기를 MB 단위로 반환합니다."""
    return MAX_IMAGE_FILE_SIZE_BYTES // (1024 * 1024)
