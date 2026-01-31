"""Unknown World - 로컬 파일 시스템 스토리지 구현.

MVP 단계에서 사용하는 로컬 저장소 구현체.
페어링 질문 Q1: Option A (backend/.data/ 전용 폴더)

참조:
    - vibe/refactors/RU-006-Q4.md
    - vibe/refactors/RU-006-Q5.md
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from pathlib import Path

from unknown_world.storage.paths import (
    ARTIFACTS_SUBDIR,
    BASE_DATA_DIR,
    IMAGES_GENERATED_SUBDIR,
    IMAGES_UPLOADED_SUBDIR,
    STATIC_URL_PREFIX,
)
from unknown_world.storage.storage import (
    PutResult,
    StorageCategory,
    StorageInterface,
    StorageMetadata,
)

logger = logging.getLogger(__name__)

# 카테고리별 서브디렉토리 매핑 (RU-006-Q5: paths.py 상수 참조)
CATEGORY_DIRS: dict[StorageCategory, str] = {
    StorageCategory.GENERATED_IMAGE: IMAGES_GENERATED_SUBDIR,
    StorageCategory.UPLOADED_IMAGE: IMAGES_UPLOADED_SUBDIR,
    StorageCategory.ARTIFACT: ARTIFACTS_SUBDIR,
}


class LocalStorage(StorageInterface):
    """로컬 파일 시스템 스토리지.

    MVP에서 사용하는 로컬 저장소 구현체.
    """

    def __init__(self, base_dir: Path | None = None) -> None:
        """LocalStorage를 초기화합니다.

        Args:
            base_dir: 기본 저장 디렉토리 (기본값: .data)
        """
        self._base_dir = base_dir or BASE_DATA_DIR
        self._ensure_directories()

        logger.info(
            "[LocalStorage] 초기화 완료",
            extra={"base_dir": str(self._base_dir)},
        )

    def _ensure_directories(self) -> None:
        """카테고리별 디렉토리를 생성합니다."""
        for subdir in CATEGORY_DIRS.values():
            dir_path = self._base_dir / subdir
            dir_path.mkdir(parents=True, exist_ok=True)

    def _get_category_dir(self, category: StorageCategory) -> Path:
        """카테고리에 해당하는 디렉토리 경로를 반환합니다."""
        subdir = CATEGORY_DIRS.get(category, "misc")
        return self._base_dir / subdir

    def _generate_key(
        self,
        category: StorageCategory,
        file_id: str | None,
        extension: str = "png",
    ) -> str:
        """스토리지 키를 생성합니다."""
        actual_id = file_id or f"file_{uuid.uuid4().hex[:12]}"
        subdir = CATEGORY_DIRS.get(category, "misc")
        return f"{subdir}/{actual_id}.{extension}"

    async def put(
        self,
        data: bytes,
        *,
        category: StorageCategory,
        content_type: str = "image/png",
        file_id: str | None = None,
        session_id: str | None = None,
    ) -> PutResult:
        """파일을 저장합니다."""
        try:
            # 확장자 추출
            ext_map = {
                "image/png": "png",
                "image/jpeg": "jpg",
                "image/gif": "gif",
                "image/webp": "webp",
                "application/json": "json",
            }
            extension = ext_map.get(content_type, "bin")

            # 키 및 경로 생성
            key = self._generate_key(category, file_id, extension)
            file_path = self._base_dir / key
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # 파일 저장
            file_path.write_bytes(data)

            # URL 생성
            url = self.get_url(key)

            # 메타데이터 생성
            metadata = StorageMetadata(
                key=key,
                category=category,
                size_bytes=len(data),
                content_type=content_type,
                created_at=datetime.now(UTC),
                url=url,
                session_id=session_id,
            )

            logger.debug(
                "[LocalStorage] 파일 저장 완료",
                extra={
                    "key": key,
                    "size_bytes": len(data),
                    "category": category.value,
                },
            )

            return PutResult(
                success=True,
                key=key,
                url=url,
                metadata=metadata,
            )

        except Exception as e:
            error_msg = f"파일 저장 실패: {type(e).__name__}"
            logger.error(
                "[LocalStorage] 저장 실패",
                extra={"error_type": type(e).__name__},
            )
            return PutResult(
                success=False,
                key="",
                url="",
                error=error_msg,
            )

    async def get(self, key: str) -> bytes | None:
        """파일을 조회합니다."""
        file_path = self._base_dir / key
        if not file_path.exists():
            return None
        return file_path.read_bytes()

    async def exists(self, key: str) -> bool:
        """파일 존재 여부를 확인합니다."""
        file_path = self._base_dir / key
        return file_path.exists()

    async def delete(self, key: str) -> bool:
        """파일을 삭제합니다."""
        file_path = self._base_dir / key
        if not file_path.exists():
            return False
        file_path.unlink()
        return True

    def get_url(self, key: str) -> str:
        """파일 접근 URL을 반환합니다."""
        # 로컬 환경에서는 /static 프리픽스로 서빙
        return f"{STATIC_URL_PREFIX}/{key}"

    @property
    def base_dir(self) -> Path:
        """기본 저장 디렉토리."""
        return self._base_dir
