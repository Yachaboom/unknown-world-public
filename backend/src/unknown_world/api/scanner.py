"""Unknown World - Scanner(이미지 이해) API 엔드포인트.

이 모듈은 사용자가 업로드한 이미지를 분석하여 "단서/아이템 후보"로
변환하는 API 엔드포인트를 제공합니다.

설계 원칙:
    - RULE-004: 실패 시 안전한 폴백 (텍스트-only 캡션)
    - RULE-007: 프롬프트 원문/업로드 파일 내용 로깅 금지
    - RULE-009: bbox는 0~1000 정규화 + [ymin, xmin, ymax, xmax]

페어링 질문 결정:
    - Q1: Option A (multipart 업로드로 처리)

참조:
    - vibe/unit-plans/U-021[Mvp].md
    - vibe/prd.md 6.7 (Scanner 슬롯)
    - .cursor/rules/00-core-critical.mdc
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from unknown_world.models.scanner import (
    DetectedObject,
    ItemCandidate,
    ScanResult,
    ScanStatus,
)
from unknown_world.models.turn import Language
from unknown_world.services.image_understanding import (
    ImageUnderstandingService,
    get_image_understanding_service,
)
from unknown_world.storage.validation import (
    ALLOWED_IMAGE_MIME_TYPES,
    MAX_IMAGE_FILE_SIZE_BYTES,
    validate_image_upload,
)

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# 라우터 정의
# =============================================================================

router = APIRouter(
    prefix="/api/scan",
    tags=["Scanner"],
)


# =============================================================================
# 의존성 주입
# =============================================================================


async def get_scanner_service() -> ImageUnderstandingService:
    """Scanner 서비스 의존성."""
    return get_image_understanding_service()


# =============================================================================
# 응답 스키마 (API 계층용)
# =============================================================================


class ScannerResponse(BaseModel):
    """Scanner API 응답.

    Attributes:
        success: 성공 여부
        status: 스캔 상태
        caption: 이미지 캡션
        objects: 감지된 오브젝트 목록
        item_candidates: 아이템 후보 목록
        message: 상태/에러 메시지
        analysis_time_ms: 분석 소요 시간 (ms)
        language: 응답 언어
        original_image_key: 저장된 원본 이미지 스토리지 키 (RU-006-S1)
        original_image_url: 저장된 원본 이미지 URL (RU-006-S1)
    """

    model_config = ConfigDict(extra="forbid")

    success: bool = Field(description="성공 여부")
    status: ScanStatus = Field(description="스캔 상태")
    caption: str = Field(default="", description="이미지 캡션")
    objects: list[DetectedObject] = Field(
        default_factory=lambda: [],
        description="감지된 오브젝트 목록",
    )
    item_candidates: list[ItemCandidate] = Field(
        default_factory=lambda: [],
        description="아이템 후보 목록",
    )
    message: str | None = Field(default=None, description="상태/에러 메시지")
    analysis_time_ms: int = Field(default=0, description="분석 소요 시간 (ms)")
    language: Language = Field(description="응답 언어")
    original_image_key: str | None = Field(
        default=None,
        description="저장된 원본 이미지 스토리지 키",
    )
    original_image_url: str | None = Field(
        default=None,
        description="저장된 원본 이미지 URL",
    )


class ScannerHealthResponse(BaseModel):
    """Scanner 서비스 헬스체크 응답.

    Attributes:
        status: 서비스 상태
        mode: 동작 모드 (mock/real)
        model: 사용 중인 모델 라벨
        supported_formats: 지원하는 이미지 형식
        max_file_size_mb: 최대 파일 크기 (MB)
    """

    model_config = ConfigDict(extra="forbid")

    status: str = Field(description="서비스 상태")
    mode: str = Field(description="동작 모드")
    model: str = Field(description="사용 중인 모델")
    supported_formats: list[str] = Field(description="지원하는 이미지 형식")
    max_file_size_mb: int = Field(description="최대 파일 크기 (MB)")


# =============================================================================
# 엔드포인트 정의
# =============================================================================


@router.post(
    "",
    response_model=ScannerResponse,
    summary="이미지 스캔",
    description="이미지를 업로드하여 오브젝트와 아이템 후보를 추출합니다.",
)
async def scan_image(
    file: Annotated[UploadFile, File(description="분석할 이미지 파일")],
    language: Annotated[
        str,
        Form(description="응답 언어 (ko-KR 또는 en-US)"),
    ] = "en-US",
    preserve_original: Annotated[
        bool,
        Form(description="원본 이미지 저장 여부 (디버깅/재분석용, RU-006-S1)"),
    ] = False,
    session_id: Annotated[
        str | None,
        Form(description="세션 ID (이미지 그룹화용)"),
    ] = None,
    service: ImageUnderstandingService = Depends(get_scanner_service),
) -> ScannerResponse:
    """이미지를 스캔하여 오브젝트와 아이템 후보를 추출합니다.

    이 엔드포인트는 Scanner 슬롯 UI에서 이미지를 드롭/업로드할 때 호출됩니다.
    추출된 아이템 후보는 인벤토리에 추가하거나 세계에 배치할 수 있습니다.

    Args:
        file: 분석할 이미지 파일 (multipart/form-data)
        language: 응답 언어 (ko-KR 또는 en-US)
        preserve_original: 원본 이미지 저장 여부 (RU-006-S1)
        session_id: 세션 ID (이미지 그룹화용)
        service: Scanner 서비스 (의존성 주입)

    Returns:
        ScannerResponse: 스캔 결과

    Raises:
        HTTPException: 파일 형식이 잘못되었거나 크기 초과 시
    """
    # 언어 파싱
    try:
        lang = Language(language)
    except ValueError:
        lang = Language.KO

    # 파일 읽기
    try:
        content = await file.read()
    except Exception as e:
        logger.error(
            "[ScannerAPI] File read failed",
            extra={"error_type": type(e).__name__},
        )
        return ScannerResponse(
            success=False,
            status=ScanStatus.FAILED,
            message="파일을 읽을 수 없습니다",
            language=lang,
        )

    # 중앙화된 파일 검증 (RULE-004, RU-006-Q1)
    content_type = file.content_type or "application/octet-stream"
    validation_error = validate_image_upload(
        content=content,
        content_type=content_type,
        language=lang,
    )

    if validation_error:
        logger.warning(
            "[ScannerAPI] File validation failed",
            extra={"error": validation_error},
        )
        return ScannerResponse(
            success=False,
            status=ScanStatus.FAILED,
            message=validation_error,
            language=lang,
        )

    # 로그: 메타 정보만 기록 (RULE-007: 파일 내용 로깅 금지)
    logger.info(
        "[ScannerAPI] Scan request",
        extra={
            "filename": file.filename,
            "content_type": content_type,
            "size_kb": len(content) // 1024,
            "language": lang.value,
        },
    )

    # 이미지 분석 수행
    try:
        result: ScanResult = await service.analyze(
            image_content=content,
            content_type=content_type,
            language=lang,
            preserve_original=preserve_original,
            session_id=session_id,
        )

        # 성공 여부 결정
        success = result.status in (ScanStatus.COMPLETED, ScanStatus.PARTIAL)

        return ScannerResponse(
            success=success,
            status=result.status,
            caption=result.caption,
            objects=result.objects,
            item_candidates=result.item_candidates,
            message=result.message,
            analysis_time_ms=result.analysis_time_ms,
            language=lang,
            original_image_key=result.original_image_key,
            original_image_url=result.original_image_url,
        )

    except Exception as e:
        error_type = type(e).__name__
        logger.error(
            "[ScannerAPI] Exception during scan",
            extra={"error_type": error_type},
        )

        # 안전한 폴백 응답 (RULE-004)
        return ScannerResponse(
            success=False,
            status=ScanStatus.FAILED,
            message=f"이미지 분석 중 오류가 발생했습니다: {error_type}",
            language=lang,
        )


@router.get(
    "/health",
    response_model=ScannerHealthResponse,
    summary="Scanner 서비스 헬스체크",
    description="Scanner 서비스의 상태를 확인합니다.",
)
async def scanner_health(
    service: ImageUnderstandingService = Depends(get_scanner_service),
) -> ScannerHealthResponse:
    """Scanner 서비스 헬스체크.

    Args:
        service: Scanner 서비스

    Returns:
        ScannerHealthResponse: 서비스 상태 정보
    """
    return ScannerHealthResponse(
        status="ok",
        mode="mock" if service.is_mock else "real",
        model="VISION (gemini-3-flash-preview)",
        supported_formats=list(ALLOWED_IMAGE_MIME_TYPES),
        max_file_size_mb=MAX_IMAGE_FILE_SIZE_BYTES // (1024 * 1024),
    )
