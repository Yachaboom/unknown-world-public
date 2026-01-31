"""Unknown World - 스토리지 추상화 인터페이스.

MVP에서는 로컬 파일 시스템, MMP에서는 GCS로 확장 가능한 구조.

설계 원칙:
    - RULE-007: 파일 내용/경로 로깅 시 메타만 기록
    - RULE-010: DB 대신 파일 기반 저장 우선

참조:
    - vibe/refactors/RU-006-Q4.md
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class StorageCategory(StrEnum):
    """저장 카테고리."""

    GENERATED_IMAGE = "generated_image"
    """생성된 이미지 (U-019)"""

    UPLOADED_IMAGE = "uploaded_image"
    """업로드된 이미지 (U-021, 선택적)"""

    ARTIFACT = "artifact"
    """게임 아티팩트 (엔딩 리포트, 리플레이 등)"""


@dataclass
class StorageMetadata:
    """저장된 파일 메타데이터."""

    key: str
    """스토리지 내 고유 키"""

    category: StorageCategory
    """저장 카테고리"""

    size_bytes: int
    """파일 크기"""

    content_type: str
    """MIME 타입"""

    created_at: datetime
    """생성 시각"""

    url: str
    """접근 URL"""

    session_id: str | None = None
    """세션 ID (선택)"""


@dataclass
class PutResult:
    """저장 결과."""

    success: bool
    key: str
    url: str
    metadata: StorageMetadata | None = None
    error: str | None = None


class StorageInterface(ABC):
    """스토리지 인터페이스 (추상 클래스).

    MVP: LocalStorage 구현
    MMP: GCSStorage 구현 예정
    """

    @abstractmethod
    async def put(
        self,
        data: bytes,
        *,
        category: StorageCategory,
        content_type: str = "image/png",
        file_id: str | None = None,
        session_id: str | None = None,
    ) -> PutResult:
        """파일을 저장합니다.

        Args:
            data: 파일 바이트 데이터
            category: 저장 카테고리
            content_type: MIME 타입
            file_id: 파일 ID (없으면 자동 생성)
            session_id: 세션 ID (경로 분류용)

        Returns:
            PutResult: 저장 결과
        """
        ...

    @abstractmethod
    async def get(self, key: str) -> bytes | None:
        """파일을 조회합니다.

        Args:
            key: 스토리지 키

        Returns:
            파일 바이트 데이터 (없으면 None)
        """
        ...

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """파일 존재 여부를 확인합니다.

        Args:
            key: 스토리지 키

        Returns:
            존재 여부
        """
        ...

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """파일을 삭제합니다.

        Args:
            key: 스토리지 키

        Returns:
            삭제 성공 여부
        """
        ...

    @abstractmethod
    def get_url(self, key: str) -> str:
        """파일 접근 URL을 반환합니다.

        Args:
            key: 스토리지 키

        Returns:
            접근 URL
        """
        ...
