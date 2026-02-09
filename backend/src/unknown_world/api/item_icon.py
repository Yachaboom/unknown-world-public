"""Unknown World - 아이템 아이콘 생성 API (U-075[Mvp]).

아이템 설명을 기반으로 동적 아이콘을 생성하는 API 엔드포인트입니다.

설계 원칙:
    - RULE-004: 실패 시 안전한 폴백 제공
    - RULE-006: ko/en 언어 정책 준수
    - RULE-007: 프롬프트 원문 노출 금지

페어링 질문 결정 (U-075[Mvp]):
    - Q1: Option B (placeholder 먼저 표시 후 백그라운드 생성)

참조:
    - vibe/unit-plans/U-075[Mvp].md
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field

from unknown_world.services.item_icon_generator import (
    IconGenerationRequest,
    get_item_icon_generator,
)

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# 라우터 설정
# =============================================================================

router = APIRouter(prefix="/api/item", tags=["item"])


# =============================================================================
# API 모델
# =============================================================================


class GenerateIconRequest(BaseModel):
    """아이콘 생성 요청 (API).

    Attributes:
        item_id: 아이템 고유 ID
        description: 아이템 설명 (아이콘 생성용)
        language: 현재 세션 언어
        wait: 생성 완료까지 대기할지 여부
    """

    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(description="아이템 고유 ID")
    description: str = Field(description="아이템 설명 (아이콘 생성용)")
    language: str = Field(default="en-US", description="현재 세션 언어 (ko-KR/en-US)")
    wait: bool = Field(
        default=False,
        description="생성 완료까지 대기 (false: placeholder 즉시 반환)",
    )


class IconResponse(BaseModel):
    """아이콘 응답 (API).

    Attributes:
        status: 생성 상태
        icon_url: 아이콘 URL
        item_id: 아이템 ID
        is_placeholder: placeholder 아이콘 여부
        message: 상태 메시지
    """

    model_config = ConfigDict(extra="forbid")

    status: str = Field(description="생성 상태")
    icon_url: str = Field(description="아이콘 URL")
    item_id: str = Field(description="아이템 ID")
    is_placeholder: bool = Field(default=False, description="placeholder 아이콘 여부")
    message: str | None = Field(default=None, description="상태 메시지")


class IconStatusResponse(BaseModel):
    """아이콘 상태 응답 (API).

    Attributes:
        item_id: 아이템 ID
        status: 생성 상태
    """

    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(description="아이템 ID")
    status: str = Field(description="생성 상태")


# =============================================================================
# API 엔드포인트
# =============================================================================


@router.post("/icon", response_model=IconResponse)
async def generate_item_icon(request: GenerateIconRequest) -> IconResponse:
    """아이템 아이콘을 생성합니다.

    Q1 결정 (Option B): wait=false면 placeholder 즉시 반환 후 백그라운드 생성.

    Args:
        request: 아이콘 생성 요청

    Returns:
        IconResponse: 아이콘 URL 및 상태
    """
    logger.info(
        "[ItemIconAPI] Icon generation request",
        extra={
            "item_id": request.item_id,
            "language": request.language,
            "wait": request.wait,
        },
    )

    generator = get_item_icon_generator()
    gen_request = IconGenerationRequest(
        item_id=request.item_id,
        item_description=request.description,
        language=request.language,
    )

    result = await generator.generate_icon(
        gen_request,
        wait_for_completion=request.wait,
    )

    return IconResponse(
        status=result.status.value,
        icon_url=result.icon_url,
        item_id=result.item_id,
        is_placeholder=result.is_placeholder,
        message=result.message,
    )


@router.get("/icon/{item_id}/status", response_model=IconStatusResponse)
async def get_icon_status(item_id: str) -> IconStatusResponse:
    """아이콘 생성 상태를 확인합니다.

    Args:
        item_id: 아이템 ID

    Returns:
        IconStatusResponse: 현재 상태
    """
    generator = get_item_icon_generator()
    status = await generator.get_icon_status(item_id)

    return IconStatusResponse(
        item_id=item_id,
        status=status.value,
    )


@router.get("/icon", response_model=IconResponse)
async def get_or_generate_icon(
    item_id: Annotated[str, Query(description="아이템 고유 ID")],
    description: Annotated[str, Query(description="아이템 설명")],
    language: Annotated[str, Query(description="세션 언어")] = "en-US",
) -> IconResponse:
    """아이콘을 조회하거나 생성합니다 (GET 방식).

    캐시에 있으면 즉시 반환, 없으면 백그라운드 생성 시작 후 placeholder 반환.

    Args:
        item_id: 아이템 ID
        description: 아이템 설명
        language: 세션 언어

    Returns:
        IconResponse: 아이콘 URL 및 상태
    """
    generator = get_item_icon_generator()
    gen_request = IconGenerationRequest(
        item_id=item_id,
        item_description=description,
        language=language,
    )

    result = await generator.generate_icon(
        gen_request,
        wait_for_completion=False,  # GET은 항상 비동기
    )

    return IconResponse(
        status=result.status.value,
        icon_url=result.icon_url,
        item_id=result.item_id,
        is_placeholder=result.is_placeholder,
        message=result.message,
    )
