"""Unknown World - 스토리지 모듈.

스토리지 추상화 계층을 제공합니다.
MVP: LocalStorage, MMP: GCSStorage(예정)

참조:
    - vibe/refactors/RU-006-Q4.md
"""

from unknown_world.storage.local_storage import LocalStorage
from unknown_world.storage.storage import (
    PutResult,
    StorageCategory,
    StorageInterface,
    StorageMetadata,
)
from unknown_world.storage.validation import (
    ALLOWED_IMAGE_MIME_TYPES,
    BBOX_MAX,
    BBOX_MIN,
    DEFAULT_ASPECT_RATIO,
    DEFAULT_IMAGE_SIZE,
    MAX_IMAGE_FILE_SIZE_BYTES,
    MAX_PROMPT_LENGTH,
    MIN_IMAGE_FILE_SIZE_BYTES,
    MIN_PROMPT_LENGTH,
    SUPPORTED_IMAGE_SIZES,
    get_max_file_size_mb,
    validate_image_generation_request,
    validate_image_upload,
)

__all__ = [
    # Storage
    "LocalStorage",
    "PutResult",
    "StorageCategory",
    "StorageInterface",
    "StorageMetadata",
    "get_storage",
    # Validation constants
    "ALLOWED_IMAGE_MIME_TYPES",
    "BBOX_MAX",
    "BBOX_MIN",
    "DEFAULT_ASPECT_RATIO",
    "DEFAULT_IMAGE_SIZE",
    "MAX_IMAGE_FILE_SIZE_BYTES",
    "MAX_PROMPT_LENGTH",
    "MIN_IMAGE_FILE_SIZE_BYTES",
    "MIN_PROMPT_LENGTH",
    "SUPPORTED_IMAGE_SIZES",
    # Validation functions
    "get_max_file_size_mb",
    "validate_image_generation_request",
    "validate_image_upload",
]

# 싱글톤 인스턴스 캐시
_storage_instance: StorageInterface | None = None


def get_storage(*, force_new: bool = False) -> StorageInterface:
    """스토리지 인스턴스를 반환합니다.

    환경변수에 따라 LocalStorage 또는 GCSStorage를 반환합니다.
    MVP에서는 LocalStorage만 사용합니다.

    Args:
        force_new: True면 캐시를 무시하고 새 인스턴스 생성

    Returns:
        StorageInterface 구현체
    """
    global _storage_instance

    if not force_new and _storage_instance is not None:
        return _storage_instance

    # MVP: LocalStorage만 사용
    # MMP: 환경변수로 GCS 전환 예정
    _storage_instance = LocalStorage()
    return _storage_instance


def reset_storage() -> None:
    """스토리지 캐시를 초기화합니다.

    테스트 시 스토리지를 재설정할 때 사용합니다.
    """
    global _storage_instance
    _storage_instance = None
