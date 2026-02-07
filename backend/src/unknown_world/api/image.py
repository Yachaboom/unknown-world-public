"""Unknown World - 이미지 생성 API 엔드포인트.

이 모듈은 장면 이미지를 조건부로 생성하는 엔드포인트를 제공합니다.
텍스트 턴의 TTFB를 블로킹하지 않도록 분리된 경로로 동작합니다.

설계 원칙:
    - RULE-004: 실패 시 안전한 폴백 (텍스트-only 진행 가능)
    - RULE-008: 텍스트 우선 + Lazy 이미지 원칙
    - RULE-010: 이미지 모델 ID 고정 (gemini-3-pro-image-preview)
    - RULE-007: 프롬프트 원문/비밀정보 노출 금지

페어링 질문 결정:
    - Q1: Option A (로컬 파일로 저장 후 image_url로 서빙)

참조:
    - vibe/unit-plans/U-019[Mvp].md
    - .cursor/rules/20-backend-orchestrator.mdc
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from unknown_world.models.turn import Language
from unknown_world.services.image_generation import (
    ImageGenerationRequest,
    ImageGenerationStatus,
    ImageGeneratorType,
    MockImageGenerator,
    create_fallback_response,
    get_image_generator,
)
from unknown_world.storage.paths import (
    DEFAULT_IMAGE_EXTENSION,
    build_image_url,
    get_generated_images_dir,
)
from unknown_world.storage.validation import (
    normalize_image_size,
    validate_image_generation_request,
)

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# 라우터 정의
# =============================================================================

router = APIRouter(
    prefix="/api/image",
    tags=["Image Generation"],
)


# =============================================================================
# 의존성 주입
# =============================================================================


async def get_generator():
    """이미지 생성기 의존성."""
    return get_image_generator()


# =============================================================================
# 요청/응답 스키마 (API 계층용)
# =============================================================================


class GenerateImageRequest(BaseModel):
    """이미지 생성 API 요청.

    TurnOutput.render.image_job과 정합되도록 설계합니다.

    Attributes:
        prompt: 이미지 생성 프롬프트 (필수)
        language: 언어 (에러 메시지용, RULE-006)
        aspect_ratio: 가로세로 비율
        image_size: 이미지 크기
        reference_image_ids: 참조 이미지 ID 목록 (편집용)
        reference_image_url: 참조 이미지 URL (U-068: 이전 턴 이미지 연결성)
        session_id: 세션 ID (파일 그룹화용)
        skip_on_failure: 실패 시 건너뛰기 (텍스트-only 진행)
        model_label: 모델 티어링 라벨 (U-066: FAST/QUALITY)
        turn_id: 턴 ID (late-binding 가드용, U-066)
    """

    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(min_length=1, max_length=2000, description="이미지 생성 프롬프트")
    language: Language = Field(default=Language.KO, description="요청 언어")
    aspect_ratio: str = Field(
        default="16:9",
        description="가로세로 비율 (U-085: 게임 UI 기본 16:9)",
    )
    image_size: str = Field(
        default="1K",
        description="이미지 크기 - SDK 값: 1K/2K/4K (U-085: Q2 마이그레이션)",
    )
    reference_image_ids: list[str] = Field(default_factory=list, description="참조 이미지 ID 목록")
    reference_image_url: str | None = Field(
        default=None,
        description="참조 이미지 URL (U-068: 이전 턴 이미지를 참조하여 연속성 유지)",
    )
    session_id: str | None = Field(default=None, description="세션 ID")
    skip_on_failure: bool = Field(default=True, description="실패 시 건너뛰기 (텍스트-only 진행)")
    model_label: str = Field(default="QUALITY", description="모델 티어링 라벨 (FAST/QUALITY)")
    turn_id: int | None = Field(default=None, description="턴 ID (late-binding 가드용)")


class GenerateImageResponse(BaseModel):
    """이미지 생성 API 응답.

    Attributes:
        success: 성공 여부
        status: 생성 상태
        image_id: 생성된 이미지 ID
        image_url: 생성된 이미지 URL
        message: 상태 메시지
        generation_time_ms: 생성 소요 시간
        model_label: 사용된 모델 라벨 (U-066)
        turn_id: 요청 턴 ID (U-066, late-binding 가드용)
    """

    model_config = ConfigDict(extra="forbid")

    success: bool = Field(description="성공 여부")
    status: ImageGenerationStatus = Field(description="생성 상태")
    image_id: str | None = Field(default=None, description="생성된 이미지 ID")
    image_url: str | None = Field(default=None, description="생성된 이미지 URL")
    message: str | None = Field(default=None, description="상태 메시지")
    generation_time_ms: int = Field(default=0, description="생성 소요 시간 (ms)")
    model_label: str = Field(default="QUALITY", description="사용된 모델 라벨")
    turn_id: int | None = Field(default=None, description="요청 턴 ID")


class ImageStatusResponse(BaseModel):
    """이미지 상태 조회 응답.

    Attributes:
        image_id: 이미지 ID
        exists: 이미지 존재 여부
        image_url: 이미지 URL (존재하는 경우)
    """

    model_config = ConfigDict(extra="forbid")

    image_id: str = Field(description="이미지 ID")
    exists: bool = Field(description="이미지 존재 여부")
    image_url: str | None = Field(default=None, description="이미지 URL")


# =============================================================================
# 엔드포인트 정의
# =============================================================================


@router.post(
    "/generate",
    response_model=GenerateImageResponse,
    summary="이미지 생성",
    description="장면 이미지를 생성합니다. 텍스트 턴과 별개로 비동기적으로 호출됩니다.",
)
async def generate_image(
    request: GenerateImageRequest,
    generator: ImageGeneratorType = Depends(get_generator),
) -> GenerateImageResponse:
    """이미지를 생성합니다.

    이 엔드포인트는 TurnOutput의 render.image_job에서 should_generate=true인 경우
    프론트엔드에서 별도로 호출합니다.

    텍스트 턴의 TTFB를 블로킹하지 않습니다 (RULE-008).

    Args:
        request: 이미지 생성 요청
        generator: 이미지 생성기 (의존성 주입)

    Returns:
        GenerateImageResponse: 생성 결과
    """
    # U-085: image_size를 SDK 값으로 정규화 (레거시 호환)
    normalized_image_size = normalize_image_size(request.image_size)

    # 요청 검증 (정규화된 image_size로 검증)
    validation_error = validate_image_generation_request(
        prompt=request.prompt,
        image_size=normalized_image_size,
        language=request.language,
    )

    if validation_error:
        logger.warning(
            "[ImageAPI] 요청 검증 실패",
            extra={"error": validation_error},
        )

        if request.skip_on_failure:
            # 실패 시에도 텍스트-only로 진행 가능하도록 폴백 (RULE-004)
            fallback = create_fallback_response(validation_error)
            return GenerateImageResponse(
                success=False,
                status=fallback.status,
                message=fallback.message,
            )
        else:
            raise HTTPException(status_code=400, detail=validation_error)

    # 이미지 생성 실행
    try:
        result = await generator.generate(
            ImageGenerationRequest(
                prompt=request.prompt,
                aspect_ratio=request.aspect_ratio,
                image_size=normalized_image_size,
                reference_image_ids=request.reference_image_ids,
                reference_image_url=request.reference_image_url,
                session_id=request.session_id,
                model_label=request.model_label,
            )
        )

        success = result.status == ImageGenerationStatus.COMPLETED

        return GenerateImageResponse(
            success=success,
            status=result.status,
            image_id=result.image_id,
            image_url=result.image_url,
            message=result.message,
            generation_time_ms=result.generation_time_ms,
            model_label=request.model_label,
            turn_id=request.turn_id,
        )

    except Exception as e:
        error_type = type(e).__name__
        logger.error(
            "[ImageAPI] 이미지 생성 중 예외 발생",
            extra={"error_type": error_type},
        )

        if request.skip_on_failure:
            # 예외 발생 시에도 안전한 폴백 (RULE-004)
            return GenerateImageResponse(
                success=False,
                status=ImageGenerationStatus.FAILED,
                message=f"이미지 생성 중 오류가 발생했습니다: {error_type}",
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"이미지 생성 실패: {error_type}",
            ) from e


@router.get(
    "/status/{image_id}",
    response_model=ImageStatusResponse,
    summary="이미지 상태 조회",
    description="생성된 이미지의 존재 여부와 URL을 조회합니다.",
)
async def get_image_status(
    image_id: str,
) -> ImageStatusResponse:
    """이미지 상태를 조회합니다.

    Args:
        image_id: 이미지 ID

    Returns:
        ImageStatusResponse: 이미지 상태
    """
    # 파일 존재 확인 (RU-006-Q5: 중앙화된 경로 함수 사용)
    output_dir = get_generated_images_dir()
    filename = f"{image_id}.{DEFAULT_IMAGE_EXTENSION}"
    file_path = output_dir / filename
    exists = file_path.exists()

    return ImageStatusResponse(
        image_id=image_id,
        exists=exists,
        image_url=build_image_url(filename, category="generated") if exists else None,
    )


@router.get(
    "/file/{image_id}",
    summary="이미지 파일 조회",
    description="생성된 이미지 파일을 반환합니다.",
    response_class=FileResponse,
)
async def get_image_file(
    image_id: str,
) -> FileResponse:
    """이미지 파일을 반환합니다.

    MVP에서는 로컬 파일을 직접 서빙합니다.
    MMP에서 GCS URL 리다이렉트로 변경 예정.

    Args:
        image_id: 이미지 ID

    Returns:
        FileResponse: 이미지 파일
    """
    # RU-006-Q5: 중앙화된 경로 함수 사용
    output_dir = get_generated_images_dir()
    filename = f"{image_id}.{DEFAULT_IMAGE_EXTENSION}"
    file_path = output_dir / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        filename=filename,
    )


@router.get(
    "/health",
    summary="이미지 서비스 헬스체크",
    description="이미지 생성 서비스의 상태를 확인합니다.",
)
async def image_health(
    generator: ImageGeneratorType = Depends(get_generator),
) -> dict[str, str | bool]:
    """이미지 서비스 헬스체크.

    Args:
        generator: 이미지 생성기

    Returns:
        헬스 상태 정보
    """
    is_available = generator.is_available()
    # MockImageGenerator 인스턴스인지 직접 확인 (싱글톤 캐시 오염 방지)
    mode = "mock" if isinstance(generator, MockImageGenerator) else "real"

    return {
        "status": "ok" if is_available else "degraded",
        "available": is_available,
        "mode": mode,
        "model": "gemini-3-pro-image-preview",
    }
