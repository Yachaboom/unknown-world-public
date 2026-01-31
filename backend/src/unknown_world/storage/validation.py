"""Unknown World - 파일 검증 및 제한 정책.

모든 이미지/아티팩트 관련 검증 로직과 상수를 중앙 관리합니다.

설계 원칙:
    - RULE-007: 에러 메시지에 파일 내용 노출 금지
    - RULE-004: 검증 실패 시 명확한 에러 메시지 반환

참조:
    - vibe/refactors/RU-006-Q1.md
"""

from __future__ import annotations

from typing import Final

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

SUPPORTED_IMAGE_SIZES: Final[dict[str, tuple[int, int]]] = {
    "1024x1024": (1024, 1024),
    "1280x768": (1280, 768),
    "768x1280": (768, 1280),
    "1536x1024": (1536, 1024),
    "1024x1536": (1024, 1536),
}
"""지원하는 이미지 생성 크기."""

DEFAULT_IMAGE_SIZE: Final[str] = "1024x1024"
"""기본 이미지 생성 크기."""

DEFAULT_ASPECT_RATIO: Final[str] = "1:1"
"""기본 가로세로 비율."""

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
    language: str = "ko-KR",
) -> str | None:
    """업로드 이미지를 검증합니다.

    Args:
        content: 이미지 바이트 데이터
        content_type: MIME 타입
        language: 에러 메시지 언어

    Returns:
        에러 메시지 (없으면 None)
    """
    is_ko = language == "ko-KR"

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


def validate_image_generation_request(
    prompt: str,
    image_size: str,
    *,
    language: str = "ko-KR",
) -> str | None:
    """이미지 생성 요청을 검증합니다.

    Args:
        prompt: 이미지 생성 프롬프트
        image_size: 요청된 이미지 크기
        language: 에러 메시지 언어

    Returns:
        에러 메시지 (없으면 None)
    """
    is_ko = language == "ko-KR"

    # 이미지 크기 검증
    if image_size not in SUPPORTED_IMAGE_SIZES:
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
