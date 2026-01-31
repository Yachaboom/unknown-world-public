"""Unknown World - 스토리지 경로 상수.

모든 저장 경로 및 URL 관련 상수를 중앙 관리합니다.
MVP: 로컬 파일 시스템 경로
MMP: GCS 버킷 경로로 확장 예정

페어링 질문 Q1 결정: Option A (backend/.data/ 전용 폴더)

참조:
    - vibe/refactors/RU-006-Q5.md
"""

from __future__ import annotations

from pathlib import Path
from typing import Final

# =============================================================================
# 기본 디렉토리 (MVP: 로컬)
# =============================================================================

# 페어링 질문 Q1: Option A - backend/.data/ 전용 폴더
# .gitignore에 backend/.data/ 추가 필수
BASE_DATA_DIR: Final[Path] = Path(".data")
"""모든 데이터 파일의 루트 디렉토리."""

# 하위 호환성을 위한 레거시 경로 (deprecated, 마이그레이션용)
LEGACY_OUTPUT_DIR: Final[Path] = Path("generated_images")
"""[Deprecated] 기존 이미지 저장 경로. .data/로 마이그레이션 권장."""

# =============================================================================
# 카테고리별 서브 경로
# =============================================================================

IMAGES_GENERATED_SUBDIR: Final[str] = "images/generated"
"""생성된 이미지 저장 서브 디렉토리."""

IMAGES_UPLOADED_SUBDIR: Final[str] = "images/uploaded"
"""업로드된 이미지 저장 서브 디렉토리."""

ARTIFACTS_SUBDIR: Final[str] = "artifacts"
"""게임 아티팩트 저장 서브 디렉토리."""

# =============================================================================
# URL 프리픽스
# =============================================================================

STATIC_URL_PREFIX: Final[str] = "/static"
"""정적 파일 서빙 URL 프리픽스."""

# 전체 경로 (자주 사용되는 조합)
STATIC_IMAGES_URL_PREFIX: Final[str] = f"{STATIC_URL_PREFIX}/images"
"""이미지 파일 URL 프리픽스 (예: /static/images/generated/xxx.png)."""

# =============================================================================
# 파일 확장자
# =============================================================================

DEFAULT_IMAGE_EXTENSION: Final[str] = "png"
"""기본 이미지 파일 확장자."""

# =============================================================================
# 경로 헬퍼 함수
# =============================================================================


def get_generated_images_dir() -> Path:
    """생성된 이미지 저장 디렉토리 경로를 반환합니다."""
    return BASE_DATA_DIR / IMAGES_GENERATED_SUBDIR


def get_uploaded_images_dir() -> Path:
    """업로드된 이미지 저장 디렉토리 경로를 반환합니다."""
    return BASE_DATA_DIR / IMAGES_UPLOADED_SUBDIR


def get_artifacts_dir() -> Path:
    """아티팩트 저장 디렉토리 경로를 반환합니다."""
    return BASE_DATA_DIR / ARTIFACTS_SUBDIR


def build_image_url(
    filename: str,
    *,
    category: str = "generated",
) -> str:
    """이미지 파일의 서빙 URL을 생성합니다.

    Args:
        filename: 파일명 (확장자 포함)
        category: 이미지 카테고리 ("generated" 또는 "uploaded")

    Returns:
        서빙 URL (예: /static/images/generated/img_abc123.png)
    """
    return f"{STATIC_URL_PREFIX}/images/{category}/{filename}"


def build_legacy_image_url(filename: str) -> str:
    """[Deprecated] 레거시 이미지 URL을 생성합니다.

    기존 코드 호환성을 위해 유지. 신규 코드에서는 build_image_url() 사용.

    Args:
        filename: 파일명 (확장자 포함)

    Returns:
        레거시 URL (예: /static/images/img_abc123.png)
    """
    return f"/static/images/{filename}"
