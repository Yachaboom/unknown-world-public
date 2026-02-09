"""Unknown World - 이미지 생성 서비스.

이 모듈은 Gemini 이미지 생성 모델을 호출하고 결과를 로컬에 저장하는 서비스입니다.
텍스트 턴의 TTFB를 블로킹하지 않도록 분리된 경로로 동작합니다.

설계 원칙:
    - RULE-004: 실패 시 안전한 폴백 제공 (should_generate=false)
    - RULE-008: 텍스트 우선 + Lazy 이미지 원칙
    - RULE-010: 이미지 모델 ID 고정 (gemini-3-pro-image-preview)
    - RULE-007: 프롬프트 원문 노출 금지

페어링 질문 결정 (U-064[Mvp]):
    - Q1: Option A (타임아웃 60초 - 이미지 생성은 15-20초 소요 가능)
    - Q2: Option A (MVP에서는 재시도 없이 즉시 폴백)
    - Q3: Option B (텍스트 응답도 로깅 - 디버깅용)

API 호출 방식 (U-064[Mvp] 수정):
    - generate_images() 대신 generate_content() 사용
    - response_modalities=[Modality.TEXT, Modality.IMAGE] 설정
    - 응답에서 part.inline_data.data로 이미지 바이트 추출

참조:
    - vibe/tech-stack.md (모델 ID 고정)
    - vibe/unit-plans/U-019[Mvp].md
    - vibe/unit-plans/U-064[Mvp].md
    - https://ai.google.dev/gemini-api/docs/image-generation
    - .cursor/rules/20-backend-orchestrator.mdc
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import logging
import os
import random
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ConfigDict, Field

from unknown_world.config.models import MODEL_IMAGE, ModelLabel, get_model_id
from unknown_world.storage.paths import (
    LEGACY_OUTPUT_DIR,
    build_image_url,
    get_generated_images_dir,
)
from unknown_world.storage.validation import (
    DEFAULT_ASPECT_RATIO,
    DEFAULT_IMAGE_SIZE,
    SUPPORTED_IMAGE_SIZES,
    normalize_image_size,
)

if TYPE_CHECKING:
    from google.genai import Client

# =============================================================================
# 로거 설정 (프롬프트/비밀정보 노출 금지 - RULE-007/008)
# =============================================================================

logger = logging.getLogger(__name__)


# =============================================================================
# 상수 정의
# =============================================================================

# 하위 호환성을 위한 레거시 경로 별칭 (RU-006-Q5)
# 신규 코드에서는 get_generated_images_dir() 사용 권장
DEFAULT_OUTPUT_DIR = LEGACY_OUTPUT_DIR

# 호환성을 위한 상수 별칭
SUPPORTED_SIZES = SUPPORTED_IMAGE_SIZES
"""지원 이미지 크기 (호환성 별칭)."""

DEFAULT_SIZE = DEFAULT_IMAGE_SIZE
"""기본 이미지 크기 (호환성 별칭)."""

# U-064[Mvp] Q1 결정: 이미지 생성 타임아웃
# 이미지 생성은 15-20초 소요 가능하므로 충분한 여유를 둠
# TODO: 테스트 후 적절한 값으로 조정 (현재 5분으로 설정)
IMAGE_GENERATION_TIMEOUT_SECONDS = 300
"""이미지 생성 API 호출 타임아웃 (초)."""


class ImageGenerationStatus(StrEnum):
    """이미지 생성 상태."""

    PENDING = "pending"
    """생성 대기 중"""

    GENERATING = "generating"
    """생성 중"""

    COMPLETED = "completed"
    """생성 완료"""

    FAILED = "failed"
    """생성 실패"""

    SKIPPED = "skipped"
    """생성 건너뜀 (잔액 부족 등)"""


# =============================================================================
# 요청/응답 Pydantic 모델
# =============================================================================


class ImageGenerationRequest(BaseModel):
    """이미지 생성 요청.

    TurnOutput의 render.image_job과 정합되도록 필드를 설계합니다.

    Attributes:
        prompt: 이미지 생성 프롬프트 (필수)
        aspect_ratio: 가로세로 비율 (예: "16:9", "1:1")
        image_size: 이미지 크기 (예: "1024x1024")
        reference_image_ids: 참조 이미지 ID 목록 (선택, 편집용)
        reference_image_url: 참조 이미지 URL (U-068: 이전 턴 이미지 연결성)
        session_id: 세션 ID (파일 그룹화용)
        model_label: 모델 티어링 라벨 (U-066: FAST/QUALITY)
    """

    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(min_length=1, description="이미지 생성 프롬프트")
    aspect_ratio: str = Field(default=DEFAULT_ASPECT_RATIO, description="가로세로 비율")
    image_size: str = Field(
        default=DEFAULT_SIZE,
        description="이미지 크기 - SDK 값: 1K/2K/4K (U-085 Q2 마이그레이션)",
    )
    reference_image_ids: list[str] = Field(default_factory=list, description="참조 이미지 ID 목록")
    reference_image_url: str | None = Field(
        default=None,
        description="참조 이미지 URL (U-068: 이전 턴 이미지를 참조하여 연속성 유지)",
    )
    session_id: str | None = Field(default=None, description="세션 ID")
    seed: int | None = Field(default=None, description="결정적 생성을 위한 시드 (선택)")
    model_label: str = Field(
        default="QUALITY",
        description="모델 티어링 라벨 (U-066: FAST=저지연 프리뷰, QUALITY=고품질)",
    )


class ImageGenerationResponse(BaseModel):
    """이미지 생성 응답.

    Attributes:
        status: 생성 상태
        image_id: 생성된 이미지 ID (성공 시)
        image_url: 생성된 이미지 URL (성공 시)
        message: 상태 메시지 (실패 시 오류 설명)
        generation_time_ms: 생성 소요 시간 (밀리초)
    """

    model_config = ConfigDict(extra="forbid")

    status: ImageGenerationStatus
    image_id: str | None = Field(default=None, description="생성된 이미지 ID")
    image_url: str | None = Field(default=None, description="생성된 이미지 URL")
    message: str | None = Field(default=None, description="상태 메시지")
    generation_time_ms: int = Field(default=0, description="생성 소요 시간 (ms)")


# =============================================================================
# 내부 데이터 클래스
# =============================================================================


@dataclass
class GeneratedImage:
    """생성된 이미지 정보.

    Attributes:
        id: 이미지 고유 ID
        path: 로컬 파일 경로
        url: 서빙 URL
        prompt_hash: 프롬프트 해시 (로그용, 원문 노출 금지)
        created_at: 생성 시각
        size: 파일 크기 (bytes)
        metadata: 추가 메타데이터
    """

    id: str
    path: Path
    url: str
    prompt_hash: str
    created_at: datetime
    size: int = 0

    def __post_init__(self) -> None:
        """초기화 후 메타데이터 필드 설정."""
        self._metadata: dict[str, str] = {}

    @property
    def metadata(self) -> dict[str, str]:
        """추가 메타데이터."""
        if not hasattr(self, "_metadata"):
            self._metadata = {}
        return self._metadata


# =============================================================================
# Mock 이미지 생성기
# =============================================================================


class MockImageGenerator:
    """테스트/개발용 모의 이미지 생성기.

    실제 API를 호출하지 않고 플레이스홀더 이미지를 생성합니다.
    """

    def __init__(self, output_dir: Path | None = None) -> None:
        """MockImageGenerator를 초기화합니다.

        Args:
            output_dir: 이미지 저장 디렉토리 (기본값: .data/images/generated)
        """
        self._output_dir = output_dir or get_generated_images_dir()
        self._output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(
            "[ImageGen] Initialized in mock mode",
            extra={"output_dir": str(self._output_dir)},
        )

    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResponse:
        """모의 이미지를 생성합니다.

        Args:
            request: 이미지 생성 요청

        Returns:
            ImageGenerationResponse: 생성 결과
        """
        start_time = datetime.now(UTC)

        # 프롬프트 해시 생성 (원문 로깅 금지 - RULE-007)
        prompt_hash = hashlib.sha256(request.prompt.encode()).hexdigest()[:8]
        logger.debug(
            "[ImageGen] Mock image generation request",
            extra={
                "prompt_hash": prompt_hash,
                "size": request.image_size,
                "aspect_ratio": request.aspect_ratio,
                "model_label": request.model_label,
                "reference_image_url": request.reference_image_url,
            },
        )

        # 고유 이미지 ID 생성 (U-060: seed가 있으면 결정적 생성)
        if request.seed is not None:
            # 시드와 프롬프트 해시를 조합하여 고유성 확보
            seed_rng = random.Random(f"{request.seed}_{prompt_hash}")
            image_id = f"img_{seed_rng.getrandbits(48):012x}"
        else:
            image_id = f"img_{uuid.uuid4().hex[:12]}"

        # 플레이스홀더 이미지 생성 (1x1 투명 PNG)
        # 실제 환경에서는 Gemini API 응답으로 대체됨
        placeholder_png = self._create_placeholder_png(request.image_size)

        # 파일 저장
        file_name = f"{image_id}.png"
        file_path = self._output_dir / file_name
        file_path.write_bytes(placeholder_png)

        # U-091: rembg 런타임 제거 - 배경 제거 후처리 없이 바로 저장

        # 서빙 URL 생성 (RU-006-Q5: 중앙화된 URL 빌더 사용)
        image_url = build_image_url(file_name, category="generated")

        elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)

        logger.info(
            "[ImageGen] Mock image generation complete",
            extra={
                "image_id": image_id,
                "elapsed_ms": elapsed_ms,
            },
        )

        return ImageGenerationResponse(
            status=ImageGenerationStatus.COMPLETED,
            image_id=image_id,
            image_url=image_url,
            message="Mock 이미지가 생성되었습니다.",
            generation_time_ms=elapsed_ms,
        )

    def _create_placeholder_png(self, size_str: str) -> bytes:
        """플레이스홀더 PNG를 생성합니다.

        Args:
            size_str: 이미지 크기 문자열 (예: "1024x1024")

        Returns:
            PNG 바이트 데이터
        """
        # 최소한의 유효한 PNG (1x1 회색 픽셀)
        # 실제 크기는 무시하고 플레이스홀더만 반환
        # 16x16 회색 PNG (mock 식별용)
        # Base64로 인코딩된 미니멀 PNG
        minimal_png = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAADklEQVQ4y2NgGAWjAAcA"
            "CHABAMXKQ5oAAAAASUVORK5CYII="
        )
        return minimal_png

    def is_available(self) -> bool:
        """Mock 생성기는 항상 사용 가능합니다."""
        return True


# =============================================================================
# 실제 이미지 생성기
# =============================================================================


class ImageGenerator:
    """Gemini 기반 실제 이미지 생성기.

    gemini-3-pro-image-preview 모델을 사용하여 이미지를 생성합니다.
    모델 ID는 RULE-010에 따라 고정됩니다.

    U-080 핫픽스: Vertex AI 서비스 계정 인증 완전 제거, API 키 전용
    U-068: 참조 이미지(이전 턴 이미지)를 사용한 시각적 연속성 지원
    """

    def __init__(
        self,
        output_dir: Path | None = None,
        api_key: str | None = None,
    ) -> None:
        """ImageGenerator를 초기화합니다.

        Args:
            output_dir: 이미지 저장 디렉토리 (기본값: .data/images/generated)
            api_key: Gemini API 키 (환경변수 GOOGLE_API_KEY 사용 가능)
        """
        self._output_dir = output_dir or get_generated_images_dir()
        self._output_dir.mkdir(parents=True, exist_ok=True)
        self._api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        self._client: Client | None = None
        self._available = False
        # U-068: 참조 이미지 캐시 (URL → bytes)
        self._reference_image_cache: dict[str, bytes] = {}

        self._initialize_client()

    def _initialize_client(self) -> None:
        """google-genai 클라이언트를 초기화합니다."""
        try:
            if not self._api_key:
                logger.warning(
                    "[ImageGen] GOOGLE_API_KEY environment variable not set - mock mode recommended",
                )
                self._available = False
                return

            from google.genai import Client

            # API 키 모드로 클라이언트 초기화 (Vertex AI 제거)
            self._client = Client(api_key=self._api_key)
            self._available = True

            # 로그에는 모델 ID만 기록 (API 키 노출 금지 - RULE-007)
            logger.info(
                "[ImageGen] API key image generator initialized",
                extra={
                    "model": MODEL_IMAGE,
                    "auth": "api_key",
                },
            )
        except Exception as e:
            logger.warning(
                "[ImageGen] API key client initialization failed - mock mode recommended",
                extra={"error_type": type(e).__name__},
            )
            self._available = False

    async def _load_reference_image(self, url: str) -> bytes | None:
        """참조 이미지를 URL에서 로드합니다 (U-068).

        로컬 파일 또는 HTTP URL에서 이미지를 로드합니다.
        캐시를 사용하여 동일 URL의 중복 로딩을 방지합니다.

        Args:
            url: 이미지 URL (로컬 경로 또는 HTTP URL)

        Returns:
            bytes | None: 이미지 바이트 또는 실패 시 None
        """
        # 캐시 확인
        if url in self._reference_image_cache:
            logger.debug(
                "[ImageGen] Reference image cache hit",
                extra={"url_hash": hashlib.sha256(url.encode()).hexdigest()[:8]},
            )
            return self._reference_image_cache[url]

        try:
            # 로컬 파일 경로 처리 (API URL 형식: /api/image/file/{image_id})
            if url.startswith("/api/image/file/"):
                # URL에서 이미지 ID 추출
                image_id = url.split("/")[-1]
                file_path = self._output_dir / f"{image_id}.png"
                if file_path.exists():
                    image_bytes = file_path.read_bytes()
                    self._reference_image_cache[url] = image_bytes
                    logger.debug(
                        "[ImageGen] Local reference image loaded",
                        extra={"image_id": image_id, "size_bytes": len(image_bytes)},
                    )
                    return image_bytes
                else:
                    logger.warning(
                        "[ImageGen] Local reference image file not found",
                        extra={"image_id": image_id},
                    )
                    return None

            # HTTP/HTTPS URL 처리
            if url.startswith(("http://", "https://")):
                import httpx

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    image_bytes = response.content
                    self._reference_image_cache[url] = image_bytes
                    logger.debug(
                        "[ImageGen] HTTP reference image loaded",
                        extra={
                            "url_hash": hashlib.sha256(url.encode()).hexdigest()[:8],
                            "size_bytes": len(image_bytes),
                        },
                    )
                    return image_bytes

            logger.warning(
                "[ImageGen] Unsupported reference image URL format",
                extra={"url_prefix": url[:20] if len(url) > 20 else url},
            )
            return None

        except Exception as e:
            logger.warning(
                "[ImageGen] Reference image loading failed",
                extra={"error_type": type(e).__name__},
            )
            return None

    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResponse:
        """이미지를 생성합니다.

        U-064[Mvp] 수정: generate_content() API를 사용하여 이미지 생성.
        gemini-3-pro-image-preview 모델은 generate_images()가 아닌
        generate_content()를 사용해야 함.

        U-068: 참조 이미지가 있으면 멀티모달 입력으로 전달하여 시각적 연속성 유지.

        Args:
            request: 이미지 생성 요청

        Returns:
            ImageGenerationResponse: 생성 결과
        """
        if not self._available or self._client is None:
            return ImageGenerationResponse(
                status=ImageGenerationStatus.FAILED,
                message="이미지 생성 클라이언트가 초기화되지 않았습니다.",
            )

        start_time = datetime.now(UTC)

        # 프롬프트 해시 (원문 로깅 금지 - RULE-007)
        prompt_hash = hashlib.sha256(request.prompt.encode()).hexdigest()[:8]

        # U-066: model_label에 따른 모델 선택
        # FAST → gemini-2.5-flash-image (저지연 프리뷰)
        # QUALITY (기본) → gemini-3-pro-image-preview (고품질)
        selected_model_label = (
            ModelLabel.IMAGE_FAST if request.model_label == "FAST" else ModelLabel.IMAGE
        )
        selected_model_id = get_model_id(selected_model_label)

        # U-068: 참조 이미지 로드 (있는 경우)
        reference_image_bytes: bytes | None = None
        has_reference = False
        if request.reference_image_url:
            reference_image_bytes = await self._load_reference_image(request.reference_image_url)
            has_reference = reference_image_bytes is not None

        logger.debug(
            "[ImageGen] Image generation request",
            extra={
                "prompt_hash": prompt_hash,
                "size": request.image_size,
                "aspect_ratio": request.aspect_ratio,
                "model": selected_model_id,
                "model_label": request.model_label,
                "has_reference": has_reference,
            },
        )

        try:
            from google.genai.types import (
                GenerateContentConfig,
                ImageConfig,
                Modality,
                Part,
            )

            # U-068: 참조 이미지가 있으면 멀티모달 contents 구성
            # 참조 이미지를 먼저 넣고, 프롬프트를 그 다음에 배치
            if has_reference and reference_image_bytes is not None:
                # 멀티모달 contents: [참조 이미지, 프롬프트 텍스트]
                # type: ignore[reportUnknownVariableType]
                contents = [
                    Part.from_bytes(data=reference_image_bytes, mime_type="image/png"),
                    Part.from_text(
                        text=f"이전 장면의 이미지입니다. 이 이미지의 스타일, 톤, 캐릭터/오브젝트 외형을 참조하여 다음 장면을 생성해주세요:\n\n{request.prompt}"
                    ),
                ]
            else:
                # 참조 이미지 없이 프롬프트만 전달
                contents = request.prompt

            # U-085: image_config 구성 (aspect_ratio + image_size)
            # U-097: image_size는 gemini-3-pro-image-preview (Pro) 전용 파라미터.
            # gemini-2.5-flash-image (Flash)에 전달하면 400 INVALID_ARGUMENT 발생.
            # 참조: vibe/ref/image-generate-guide.md §"Aspect ratios and image size"
            #   - Flash: aspect_ratio만 지원, 1024px 고정 해상도
            #   - Pro: aspect_ratio + image_size(1K/2K/4K) 지원
            sdk_image_size = normalize_image_size(request.image_size)
            is_pro_model = selected_model_label == ModelLabel.IMAGE

            if is_pro_model:
                image_config = ImageConfig(
                    aspect_ratio=request.aspect_ratio,
                    image_size=sdk_image_size,
                )
            else:
                # Flash 모델: aspect_ratio만 전달
                image_config = ImageConfig(
                    aspect_ratio=request.aspect_ratio,
                )

            logger.debug(
                "[ImageGen] image_config applied",
                extra={
                    "aspect_ratio": request.aspect_ratio,
                    "image_size": sdk_image_size if is_pro_model else "(Flash: 고정 1024px)",
                    "model": selected_model_id,
                },
            )

            # U-064: generate_content() API를 사용하여 이미지 생성
            # U-085: image_config를 추가하여 비율/크기 제어
            # response_modalities에 TEXT와 IMAGE를 모두 포함
            # 참고: vibe/ref/image-generate-guide.md
            # Q1 결정: 타임아웃 60초 적용
            response = await asyncio.wait_for(
                self._client.aio.models.generate_content(  # type: ignore[reportUnknownMemberType]
                    model=selected_model_id,
                    contents=contents,  # type: ignore[reportArgumentType]
                    config=GenerateContentConfig(
                        response_modalities=[Modality.TEXT, Modality.IMAGE],
                        image_config=image_config,
                    ),
                ),
                timeout=IMAGE_GENERATION_TIMEOUT_SECONDS,
            )

            # U-064: 응답에서 이미지 추출 (메서드 분리)
            image_bytes = self._extract_image_from_response(response)

            if image_bytes is None:
                elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
                logger.warning(
                    "[ImageGen] No image data in generation response",
                    extra={"elapsed_ms": elapsed_ms},
                )
                return ImageGenerationResponse(
                    status=ImageGenerationStatus.FAILED,
                    message="이미지 생성 응답에 이미지 데이터가 없습니다.",
                    generation_time_ms=elapsed_ms,
                )

            # 고유 ID 및 파일 저장 (U-060: seed가 있으면 결정적 생성)
            if request.seed is not None:
                # 시드와 프롬프트 해시를 조합하여 고유성 확보
                seed_rng = random.Random(f"{request.seed}_{prompt_hash}")
                image_id = f"img_{seed_rng.getrandbits(48):012x}"
            else:
                image_id = f"img_{uuid.uuid4().hex[:12]}"

            file_name = f"{image_id}.png"
            file_path = self._output_dir / file_name
            file_path.write_bytes(image_bytes)

            # U-091: rembg 런타임 제거 - 배경 제거 후처리 없이 바로 저장

            # 서빙 URL 생성 (RU-006-Q5: 중앙화된 URL 빌더 사용)
            image_url = build_image_url(file_name, category="generated")
            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)

            logger.info(
                "[ImageGen] Image generation complete",
                extra={
                    "image_id": image_id,
                    "elapsed_ms": elapsed_ms,
                    "size_bytes": len(image_bytes),
                },
            )

            return ImageGenerationResponse(
                status=ImageGenerationStatus.COMPLETED,
                image_id=image_id,
                image_url=image_url,
                message="이미지가 성공적으로 생성되었습니다.",
                generation_time_ms=elapsed_ms,
            )

        except TimeoutError:
            # Q1 결정: 60초 타임아웃 초과 시 처리
            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
            logger.warning(
                "[ImageGen] Image generation timeout",
                extra={
                    "timeout_seconds": IMAGE_GENERATION_TIMEOUT_SECONDS,
                    "elapsed_ms": elapsed_ms,
                },
            )
            return ImageGenerationResponse(
                status=ImageGenerationStatus.FAILED,
                message=f"이미지 생성 타임아웃 ({IMAGE_GENERATION_TIMEOUT_SECONDS}초 초과)",
                generation_time_ms=elapsed_ms,
            )

        except Exception as e:
            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
            error_type = type(e).__name__
            # U-097: ClientError 등의 상세 원인을 캡처하여 디버깅 지원
            error_detail = str(e)[:200] if str(e) else "상세 정보 없음"

            logger.error(
                "[ImageGen] Image generation failed",
                extra={
                    "error_type": error_type,
                    "error_detail": error_detail,
                    "elapsed_ms": elapsed_ms,
                },
            )

            # 실패 시에도 안전한 응답 반환 (RULE-004)
            return ImageGenerationResponse(
                status=ImageGenerationStatus.FAILED,
                message=f"이미지 생성 중 오류가 발생했습니다: {error_type}",
                generation_time_ms=elapsed_ms,
            )

    def _extract_image_from_response(self, response: Any) -> bytes | None:
        """generate_content 응답에서 이미지 바이트 추출.

        Args:
            response: Gemini API 응답 객체

        Returns:
            bytes | None: 추출된 이미지 바이트 또는 None
        """
        try:
            if not response or not hasattr(response, "candidates") or not response.candidates:
                return None

            for candidate in response.candidates:
                if not hasattr(candidate, "content") or not candidate.content:
                    continue
                if not hasattr(candidate.content, "parts") or not candidate.content.parts:
                    continue

                for part in candidate.content.parts:
                    # Q3 결정: 텍스트 응답도 로깅 (디버깅용)
                    if hasattr(part, "text") and part.text:
                        text_preview = (
                            part.text[:100] + "..." if len(part.text) > 100 else part.text
                        )
                        logger.debug(
                            "[ImageGen] Text response (for debugging)",
                            extra={"text_preview": text_preview},
                        )

                    # 이미지 데이터 추출
                    if (
                        hasattr(part, "inline_data")
                        and part.inline_data
                        and hasattr(part.inline_data, "data")
                        and part.inline_data.data
                    ):
                        logger.debug(
                            "[ImageGen] Image data extracted successfully",
                            extra={"size_bytes": len(part.inline_data.data)},
                        )
                        return part.inline_data.data

            return None
        except Exception as e:
            logger.warning(
                "[ImageGen] Error during response parsing",
                extra={"error_type": type(e).__name__, "message": str(e)},
            )
            return None

    def is_available(self) -> bool:
        """생성기가 사용 가능한 상태인지 확인합니다."""
        return self._available


# =============================================================================
# 팩토리 함수
# =============================================================================

# 생성기 타입
ImageGeneratorType = MockImageGenerator | ImageGenerator

# 싱글톤 인스턴스 캐시
_generator_instance: ImageGeneratorType | None = None


def get_image_generator(
    *,
    force_mock: bool = False,
    force_new: bool = False,
    output_dir: Path | None = None,
) -> ImageGeneratorType:
    """이미지 생성기 인스턴스를 반환합니다.

    환경변수 UW_MODE에 따라 실제 생성기 또는 Mock 생성기를 반환합니다.

    Args:
        force_mock: True면 환경변수와 무관하게 Mock 생성기 반환
        force_new: True면 캐시를 무시하고 새 인스턴스 생성
        output_dir: 이미지 저장 디렉토리

    Returns:
        이미지 생성기 인스턴스
    """
    global _generator_instance

    if not force_new and _generator_instance is not None:
        return _generator_instance

    # 모드 결정
    mode = os.environ.get("UW_MODE", "real")

    if force_mock or mode == "mock":
        generator: ImageGeneratorType = MockImageGenerator(output_dir)
    else:
        real_gen = ImageGenerator(output_dir)
        # 실제 생성기 초기화 실패 시 Mock으로 폴백
        if not real_gen.is_available():
            logger.warning("[ImageGen] Real generator init failed, falling back to mock mode")
            generator = MockImageGenerator(output_dir)
        else:
            generator = real_gen

    _generator_instance = generator
    return generator


def reset_image_generator() -> None:
    """이미지 생성기 캐시를 초기화합니다.

    테스트 시 생성기를 재설정할 때 사용합니다.
    """
    global _generator_instance
    _generator_instance = None


# =============================================================================
# 헬퍼 함수
# =============================================================================


def create_fallback_response(message: str | None = None) -> ImageGenerationResponse:
    """실패 시 안전한 폴백 응답을 생성합니다.

    RULE-004: 검증 실패나 오류 시에도 안전한 응답 제공

    Args:
        message: 오류 메시지 (선택)

    Returns:
        ImageGenerationResponse: 폴백 응답
    """
    return ImageGenerationResponse(
        status=ImageGenerationStatus.SKIPPED,
        message=message or "이미지 생성을 건너뛰었습니다. 텍스트로 진행합니다.",
    )


def validate_image_request(request: ImageGenerationRequest) -> str | None:
    """이미지 생성 요청을 검증합니다.

    U-085: image_size는 SDK 값(1K/2K/4K) 또는 레거시 픽셀 값 모두 허용.

    Args:
        request: 이미지 생성 요청 객체

    Returns:
        str | None: 오류 메시지 또는 성공 시 None
    """
    if not request.prompt or len(request.prompt.strip()) < 2:
        return "프롬프트가 너무 짧습니다."

    # SDK 값 또는 레거시 값 → 정규화 후 검증
    normalized = normalize_image_size(request.image_size)
    if normalized not in SUPPORTED_IMAGE_SIZES:
        return f"지원하지 않는 이미지 크기: {request.image_size}"

    return None
