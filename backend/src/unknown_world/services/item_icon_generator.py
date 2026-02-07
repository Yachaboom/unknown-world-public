"""Unknown World - 아이템 아이콘 동적 생성 서비스 (U-075[Mvp]).

이 모듈은 인벤토리 아이템 설명을 기반으로 64x64 픽셀 아트 아이콘을 동적 생성합니다.
캐싱, 언어 정합성을 보장합니다.

U-091: 런타임 rembg 제거 - 배경 제거 없이 프롬프트로 어두운 배경 유도.

설계 원칙:
    - RULE-004: 실패 시 안전한 폴백 제공 (placeholder 아이콘)
    - RULE-006: ko/en 언어 정책 준수 (아이템 이름 언어 정합성)
    - RULE-007: 프롬프트 원문 노출 금지
    - RULE-010: 이미지 모델 ID 고정 (gemini-2.5-flash-image for FAST)

페어링 질문 결정 (U-075[Mvp]):
    - Q1: Option B (placeholder 먼저 표시 후 백그라운드 생성)
    - Q2: Option A (64x64 픽셀)
    - Q3: Option A (픽셀 아트 스타일 - CRT 테마)

참조:
    - vibe/unit-plans/U-075[Mvp].md
    - vibe/ref/nanobanana-mcp.md (CRT 테마 아트 디렉션)
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

from unknown_world.storage.paths import build_image_url, get_generated_images_dir

if TYPE_CHECKING:
    from unknown_world.services.image_generation import ImageGeneratorType

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)


# =============================================================================
# 상수 정의
# =============================================================================

# Q2 결정: 아이콘 사이즈 64x64
ICON_SIZE = 64
"""아이콘 크기 (픽셀)."""

ICON_IMAGE_SIZE = f"{ICON_SIZE}x{ICON_SIZE}"
"""이미지 생성용 사이즈 문자열."""

# Q3 결정: 픽셀 아트 스타일 (아이템 고유 색상)
# U-075 핫픽스: rembg 제거 대비, 프롬프트에서 배경색 직접 지정
# U-075 수정: CRT 녹색 테마 제거, 아이템 고유 색상 사용
ICON_STYLE_PROMPT = """
pixel art, 8-bit retro game item icon,
sharp edges, no anti-aliasing, clear silhouette,
fantasy RPG item style, single centered object,
dark background color #0d0d0d (near pure black),
vibrant natural colors matching the item's material and nature
"""

# 아이콘 캐시 디렉토리
ICON_CACHE_SUBDIR = "icons"

# 백그라운드 생성 타임아웃 (Q1: Option B 비동기 생성)
ICON_GENERATION_TIMEOUT_SECONDS = 30


class IconGenerationStatus(StrEnum):
    """아이콘 생성 상태."""

    PENDING = "pending"
    """생성 대기 중 (placeholder 반환)"""

    GENERATING = "generating"
    """생성 중"""

    COMPLETED = "completed"
    """생성 완료"""

    FAILED = "failed"
    """생성 실패 (placeholder 사용)"""

    CACHED = "cached"
    """캐시에서 반환"""


# =============================================================================
# 요청/응답 모델
# =============================================================================


class IconGenerationRequest(BaseModel):
    """아이콘 생성 요청.

    Attributes:
        item_id: 아이템 고유 ID
        item_description: 아이템 설명 (아이콘 생성용)
        language: 현재 세션 언어 (ko-KR/en-US)
    """

    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(description="아이템 고유 ID")
    item_description: str = Field(description="아이템 설명 (아이콘 생성용)")
    language: str = Field(default="ko-KR", description="현재 세션 언어")


class IconGenerationResponse(BaseModel):
    """아이콘 생성 응답.

    Attributes:
        status: 생성 상태
        icon_url: 아이콘 URL (성공 또는 placeholder)
        item_id: 아이템 ID
        is_placeholder: placeholder 아이콘 여부
        generation_time_ms: 생성 소요 시간 (밀리초)
        message: 상태 메시지
    """

    model_config = ConfigDict(extra="forbid")

    status: IconGenerationStatus
    icon_url: str = Field(description="아이콘 URL")
    item_id: str = Field(description="아이템 ID")
    is_placeholder: bool = Field(default=False, description="placeholder 아이콘 여부")
    generation_time_ms: int = Field(default=0, description="생성 소요 시간 (ms)")
    message: str | None = Field(default=None, description="상태 메시지")


# =============================================================================
# 아이콘 캐시
# =============================================================================


class IconCache:
    """아이템 아이콘 캐시.

    메모리 캐시 + 파일 시스템 캐시를 사용하여 동일 아이템 재생성을 방지합니다.
    캐시 키는 아이템 설명의 MD5 해시입니다.
    """

    def __init__(self, cache_dir: Path | None = None) -> None:
        """IconCache를 초기화합니다.

        Args:
            cache_dir: 캐시 디렉토리 (기본: .data/images/generated/icons)
        """
        self._cache_dir = cache_dir or get_generated_images_dir() / ICON_CACHE_SUBDIR
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._memory_cache: dict[str, str] = {}  # cache_key → icon_url

        logger.info(
            "[IconCache] 초기화 완료",
            extra={"cache_dir": str(self._cache_dir)},
        )

    def _make_cache_key(self, item_description: str) -> str:
        """캐시 키를 생성합니다 (MD5 해시).

        Args:
            item_description: 아이템 설명

        Returns:
            str: MD5 해시 (32자)
        """
        return hashlib.md5(item_description.encode()).hexdigest()

    def get(self, item_description: str) -> str | None:
        """캐시에서 아이콘 URL을 조회합니다.

        Args:
            item_description: 아이템 설명

        Returns:
            str | None: 캐시된 아이콘 URL 또는 None
        """
        cache_key = self._make_cache_key(item_description)

        # 메모리 캐시 확인
        if cache_key in self._memory_cache:
            logger.debug(
                "[IconCache] 메모리 캐시 히트",
                extra={"cache_key": cache_key[:8]},
            )
            return self._memory_cache[cache_key]

        # 파일 캐시 확인
        cache_path = self._cache_dir / f"{cache_key}.png"
        if cache_path.exists():
            icon_url = build_image_url(f"{ICON_CACHE_SUBDIR}/{cache_key}.png", category="generated")
            self._memory_cache[cache_key] = icon_url
            logger.debug(
                "[IconCache] 파일 캐시 히트",
                extra={"cache_key": cache_key[:8]},
            )
            return icon_url

        return None

    def set(self, item_description: str, image_data: bytes) -> str:
        """캐시에 아이콘을 저장합니다 (64x64 리사이징 포함).

        Args:
            item_description: 아이템 설명
            image_data: 이미지 바이트 데이터

        Returns:
            str: 저장된 아이콘의 URL
        """
        import io

        from PIL import Image

        cache_key = self._make_cache_key(item_description)
        cache_path = self._cache_dir / f"{cache_key}.png"

        # 리사이징 (U-075 핫픽스: 모델 생성본 1024x1024 -> 64x64)
        try:
            with Image.open(io.BytesIO(image_data)) as img:
                # 64x64로 리사이징 (LANCZOS 필터로 품질 유지)
                if img.size != (ICON_SIZE, ICON_SIZE):
                    img = img.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS)  # type: ignore[reportUnknownMemberType]

                # 바이트로 다시 변환하여 저장
                output = io.BytesIO()
                img.save(output, format="PNG")
                processed_data = output.getvalue()
                cache_path.write_bytes(processed_data)

                logger.debug(
                    "[IconCache] 이미지 리사이징 완료",
                    extra={
                        "original_size": f"{img.size[0]}x{img.size[1]}",
                        "target_size": f"{ICON_SIZE}x{ICON_SIZE}",
                    },
                )
        except Exception as e:
            logger.warning(
                "[IconCache] 리사이징 실패, 원본 저장",
                extra={"error": str(e)},
            )
            cache_path.write_bytes(image_data)
            processed_data = image_data

        # URL 생성 및 메모리 캐시 저장
        icon_url = build_image_url(f"{ICON_CACHE_SUBDIR}/{cache_key}.png", category="generated")
        self._memory_cache[cache_key] = icon_url

        logger.info(
            "[IconCache] 아이콘 캐시 저장",
            extra={
                "cache_key": cache_key[:8],
                "size_bytes": len(processed_data),
            },
        )

        return icon_url

    def get_cache_path(self, item_description: str) -> Path:
        """캐시 파일 경로를 반환합니다.

        Args:
            item_description: 아이템 설명

        Returns:
            Path: 캐시 파일 경로
        """
        cache_key = self._make_cache_key(item_description)
        return self._cache_dir / f"{cache_key}.png"


# =============================================================================
# 아이콘 생성기
# =============================================================================


class ItemIconGenerator:
    """아이템 아이콘 동적 생성기.

    아이템 설명을 기반으로 64x64 픽셀 아트 아이콘을 생성합니다.
    Q1 결정: placeholder 먼저 반환 후 백그라운드에서 생성 (Option B)
    """

    def __init__(
        self,
        image_generator: ImageGeneratorType | None = None,
        cache: IconCache | None = None,
    ) -> None:
        """ItemIconGenerator를 초기화합니다.

        Args:
            image_generator: 이미지 생성기 (기본: get_image_generator())
            cache: 아이콘 캐시 (기본: 새 인스턴스)
        """
        self._image_generator = image_generator
        self._cache = cache or IconCache()
        self._pending_generations: dict[str, asyncio.Task[IconGenerationResponse]] = {}
        self._completed_urls: dict[str, str] = {}  # item_id -> icon_url (최근 완료된 항목)

        logger.info("[ItemIconGenerator] 초기화 완료")

    def _get_image_generator(self) -> ImageGeneratorType:
        """이미지 생성기를 lazy 로딩합니다."""
        if self._image_generator is None:
            from unknown_world.services.image_generation import get_image_generator

            self._image_generator = get_image_generator()
        return self._image_generator

    def _build_icon_prompt(self, item_description: str, language: str) -> str:
        """아이콘 생성 프롬프트를 구성합니다.

        Args:
            item_description: 아이템 설명
            language: 세션 언어

        Returns:
            str: 이미지 생성 프롬프트
        """
        # 언어별 지시문
        lang_instruction = "한국어" if language == "ko-KR" else "English"

        return f"""
Create a game inventory item icon based on this description ({lang_instruction}):
{item_description}

Style requirements:
{ICON_STYLE_PROMPT}

Technical requirements:
- Size: {ICON_SIZE}x{ICON_SIZE} pixels
- Background: solid dark color #0d0d0d (near pure black)
- DO NOT use white or bright backgrounds
- Single item centered, no text, no decorations
- Use the item's natural colors (e.g., red potion, golden key, blue crystal, brown rope)
"""

    def get_placeholder_url(self, item_id: str) -> str:
        """placeholder 아이콘 URL을 반환합니다.

        Args:
            item_id: 아이템 ID

        Returns:
            str: placeholder 아이콘 URL
        """
        # 기본 placeholder (📦 이모지 사용)
        # 실제 구현에서는 정적 placeholder 이미지 경로를 반환할 수 있음
        return "/ui/icons/placeholder_item.png"

    async def generate_icon(
        self,
        request: IconGenerationRequest,
        *,
        wait_for_completion: bool = False,
    ) -> IconGenerationResponse:
        """아이템 아이콘을 생성합니다.

        Q1 결정 (Option B):
        - wait_for_completion=False: placeholder 즉시 반환, 백그라운드 생성
        - wait_for_completion=True: 생성 완료까지 대기

        Args:
            request: 아이콘 생성 요청
            wait_for_completion: 생성 완료까지 대기할지 여부

        Returns:
            IconGenerationResponse: 생성 결과
        """
        start_time = datetime.now(UTC)

        # 프롬프트 해시 (로깅용, 원문 노출 금지 - RULE-007)
        desc_hash = hashlib.md5(request.item_description.encode()).hexdigest()[:8]

        logger.debug(
            "[ItemIconGenerator] 아이콘 생성 요청",
            extra={
                "item_id": request.item_id,
                "desc_hash": desc_hash,
                "language": request.language,
                "wait": wait_for_completion,
            },
        )

        # 캐시 확인
        cached_url = self._cache.get(request.item_description)
        if cached_url:
            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
            return IconGenerationResponse(
                status=IconGenerationStatus.CACHED,
                icon_url=cached_url,
                item_id=request.item_id,
                is_placeholder=False,
                generation_time_ms=elapsed_ms,
                message="캐시에서 아이콘을 반환했습니다.",
            )

        # Q1 Option B: 즉시 응답 모드 (placeholder 반환)
        if not wait_for_completion:
            # 백그라운드 생성 태스크가 없으면 시작
            if request.item_id not in self._pending_generations:
                task = asyncio.create_task(
                    self._generate_icon_internal(request),
                    name=f"icon_gen_{request.item_id}",
                )
                self._pending_generations[request.item_id] = task

                # 태스크 완료 시 정리 콜백
                task.add_done_callback(
                    lambda t, item_id=request.item_id: self._pending_generations.pop(item_id, None)
                )

            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
            return IconGenerationResponse(
                status=IconGenerationStatus.PENDING,
                icon_url=self.get_placeholder_url(request.item_id),
                item_id=request.item_id,
                is_placeholder=True,
                generation_time_ms=elapsed_ms,
                message="백그라운드에서 아이콘을 생성 중입니다.",
            )

        # 동기 생성 모드 (완료까지 대기)
        return await self._generate_icon_internal(request)

    async def _generate_icon_internal(
        self, request: IconGenerationRequest
    ) -> IconGenerationResponse:
        """내부 아이콘 생성 로직.

        Args:
            request: 아이콘 생성 요청

        Returns:
            IconGenerationResponse: 생성 결과
        """
        start_time = datetime.now(UTC)
        desc_hash = hashlib.md5(request.item_description.encode()).hexdigest()[:8]

        try:
            from unknown_world.services.image_generation import (
                ImageGenerationRequest,
                ImageGenerationStatus,
            )

            # 프롬프트 생성
            prompt = self._build_icon_prompt(request.item_description, request.language)

            # 이미지 생성 요청 구성
            # U-091: rembg 런타임 제거 - 배경 제거 없이 프롬프트로 어두운 배경 유도
            gen_request = ImageGenerationRequest(
                prompt=prompt,
                image_size="1024x1024",  # 모델 지원 표준 해상도 사용 (U-075 핫픽스: 64x64는 미지원)
                aspect_ratio="1:1",
                model_label="FAST",  # Q2: 아이콘은 저지연 모델
            )

            generator = self._get_image_generator()
            response = await asyncio.wait_for(
                generator.generate(gen_request),
                timeout=ICON_GENERATION_TIMEOUT_SECONDS,
            )

            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)

            if response.status == ImageGenerationStatus.COMPLETED and response.image_url:
                # 캐시에 저장 (파일 읽기)
                # 생성된 파일을 캐시 디렉토리로 복사
                if response.image_id:
                    src_path = get_generated_images_dir() / f"{response.image_id}.png"
                    # U-091: rembg 런타임 제거 - _nobg 파일 검색 불필요
                    if src_path.exists():
                        image_data = src_path.read_bytes()
                        cached_url = self._cache.set(request.item_description, image_data)
                        self._completed_urls[request.item_id] = cached_url
                        logger.info(
                            "[ItemIconGenerator] 아이콘 생성 완료",
                            extra={
                                "item_id": request.item_id,
                                "desc_hash": desc_hash,
                                "elapsed_ms": elapsed_ms,
                            },
                        )
                        return IconGenerationResponse(
                            status=IconGenerationStatus.COMPLETED,
                            icon_url=cached_url,
                            item_id=request.item_id,
                            is_placeholder=False,
                            generation_time_ms=elapsed_ms,
                            message="아이콘이 성공적으로 생성되었습니다.",
                        )

                # URL 직접 반환 (파일 복사 실패 시)
                return IconGenerationResponse(
                    status=IconGenerationStatus.COMPLETED,
                    icon_url=response.image_url,
                    item_id=request.item_id,
                    is_placeholder=False,
                    generation_time_ms=elapsed_ms,
                    message="아이콘이 생성되었습니다.",
                )

            # 생성 실패
            logger.warning(
                "[ItemIconGenerator] 아이콘 생성 실패",
                extra={
                    "item_id": request.item_id,
                    "desc_hash": desc_hash,
                    "status": response.status,
                    "error_msg": response.message,  # 'message'는 logging 예약어
                },
            )
            return IconGenerationResponse(
                status=IconGenerationStatus.FAILED,
                icon_url=self.get_placeholder_url(request.item_id),
                item_id=request.item_id,
                is_placeholder=True,
                generation_time_ms=elapsed_ms,
                message=response.message or "아이콘 생성에 실패했습니다.",
            )

        except TimeoutError:
            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
            logger.warning(
                "[ItemIconGenerator] 아이콘 생성 타임아웃",
                extra={
                    "item_id": request.item_id,
                    "timeout_seconds": ICON_GENERATION_TIMEOUT_SECONDS,
                },
            )
            return IconGenerationResponse(
                status=IconGenerationStatus.FAILED,
                icon_url=self.get_placeholder_url(request.item_id),
                item_id=request.item_id,
                is_placeholder=True,
                generation_time_ms=elapsed_ms,
                message=f"아이콘 생성 타임아웃 ({ICON_GENERATION_TIMEOUT_SECONDS}초)",
            )

        except Exception as e:
            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
            error_type = type(e).__name__
            logger.exception(
                "[ItemIconGenerator] 아이콘 생성 중 오류",
                extra={
                    "item_id": request.item_id,
                    "error_type": error_type,
                },
            )
            return IconGenerationResponse(
                status=IconGenerationStatus.FAILED,
                icon_url=self.get_placeholder_url(request.item_id),
                item_id=request.item_id,
                is_placeholder=True,
                generation_time_ms=elapsed_ms,
                message=f"아이콘 생성 중 오류: {error_type}",
            )

    async def get_icon_status(
        self, item_id: str, request: IconGenerationRequest | None = None
    ) -> IconGenerationStatus:
        """아이콘 생성 상태를 확인합니다.

        Args:
            item_id: 아이템 ID
            request: 아이콘 생성 요청 (캐시 확인용)

        Returns:
            IconGenerationStatus: 현재 상태
        """
        # 현재 진행 중인 태스크 확인
        if item_id in self._pending_generations:
            task = self._pending_generations[item_id]
            if task.done():
                return IconGenerationStatus.COMPLETED
            return IconGenerationStatus.GENERATING

        # 최근 완료된 항목 확인
        if item_id in self._completed_urls:
            return IconGenerationStatus.COMPLETED

        # 캐시 확인 (request가 있는 경우)
        if request and self._cache.get(request.item_description):
            return IconGenerationStatus.COMPLETED

        return IconGenerationStatus.PENDING


# =============================================================================
# 싱글톤 인스턴스
# =============================================================================

_generator_instance: ItemIconGenerator | None = None


def get_item_icon_generator() -> ItemIconGenerator:
    """ItemIconGenerator 싱글톤 인스턴스를 반환합니다."""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = ItemIconGenerator()
    return _generator_instance


def reset_item_icon_generator() -> None:
    """테스트용 싱글톤 리셋."""
    global _generator_instance
    _generator_instance = None
