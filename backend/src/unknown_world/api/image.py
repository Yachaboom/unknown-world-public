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

from unknown_world.services.image_generation import (
    DEFAULT_OUTPUT_DIR,
    ImageGenerationRequest,
    ImageGenerationStatus,
    ImageGeneratorType,
    create_fallback_response,
    get_image_generator,
    validate_image_request,
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
        aspect_ratio: 가로세로 비율
        image_size: 이미지 크기
        reference_image_ids: 참조 이미지 ID 목록 (편집용)
        session_id: 세션 ID (파일 그룹화용)
        skip_on_failure: 실패 시 건너뛰기 (텍스트-only 진행)
    """

    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(min_length=1, max_length=2000, description="이미지 생성 프롬프트")
    aspect_ratio: str = Field(default="1:1", description="가로세로 비율")
    image_size: str = Field(default="1024x1024", description="이미지 크기")
    reference_image_ids: list[str] = Field(default_factory=list, description="참조 이미지 ID 목록")
    session_id: str | None = Field(default=None, description="세션 ID")
    skip_on_failure: bool = Field(default=True, description="실패 시 건너뛰기 (텍스트-only 진행)")


class GenerateImageResponse(BaseModel):
    """이미지 생성 API 응답.

    Attributes:
        success: 성공 여부
        status: 생성 상태
        image_id: 생성된 이미지 ID
        image_url: 생성된 이미지 URL
        message: 상태 메시지
        generation_time_ms: 생성 소요 시간
    """

    model_config = ConfigDict(extra="forbid")

    success: bool = Field(description="성공 여부")
    status: ImageGenerationStatus = Field(description="생성 상태")
    image_id: str | None = Field(default=None, description="생성된 이미지 ID")
    image_url: str | None = Field(default=None, description="생성된 이미지 URL")
    message: str | None = Field(default=None, description="상태 메시지")
    generation_time_ms: int = Field(default=0, description="생성 소요 시간 (ms)")


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
    # 요청 검증
    validation_error = validate_image_request(
        ImageGenerationRequest(
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            image_size=request.image_size,
            reference_image_ids=request.reference_image_ids,
            session_id=request.session_id,
        )
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
                image_size=request.image_size,
                reference_image_ids=request.reference_image_ids,
                session_id=request.session_id,
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
    # 파일 존재 확인
    file_path = DEFAULT_OUTPUT_DIR / f"{image_id}.png"
    exists = file_path.exists()

    return ImageStatusResponse(
        image_id=image_id,
        exists=exists,
        image_url=f"/static/images/{image_id}.png" if exists else None,
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
    file_path = DEFAULT_OUTPUT_DIR / f"{image_id}.png"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        filename=f"{image_id}.png",
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
    mode = (
        "mock"
        if hasattr(generator, "_output_dir")
        and isinstance(generator, type(get_image_generator(force_mock=True)))
        else "real"
    )

    return {
        "status": "ok" if is_available else "degraded",
        "available": is_available,
        "mode": mode,
        "model": "gemini-3-pro-image-preview",
    }
