"""Unknown World - 이미지 생성 판정 헬퍼.

이 모듈은 TurnOutput의 image_job을 분석하여 이미지 생성 여부를 판정하고,
Economy 기반으로 잔액 검증을 수행하는 헬퍼 함수들을 제공합니다.

설계 원칙:
    - RULE-005: 재화 인바리언트 (잔액 음수 금지, 예상 비용 사전 표시)
    - RULE-007: 프롬프트 원문 로그 노출 금지 (해시만 사용)
    - RULE-008: 텍스트 우선 + Lazy 이미지 원칙
    - 순수 함수: 테스트 용이성을 위해 부작용 없는 순수 함수로 구현

페어링 질문 결정:
    - Q1: Option A (고정 비용 10 Signal) - MVP 단순화

참조:
    - vibe/unit-plans/U-052[Mvp].md
    - vibe/prd.md 6.7 - Economy HUD/비용 정책
    - .cursor/rules/00-core-critical.mdc - RULE-005/007/008
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

from unknown_world.config.economy import (
    FAST_IMAGE_COST_SIGNAL,
    IMAGE_GENERATION_COST_SIGNAL,
)

if TYPE_CHECKING:
    from unknown_world.models.turn import (
        EconomySnapshot,
        ImageJob,
        TurnOutput,
    )

# =============================================================================
# 로거 설정 (프롬프트/비밀정보 노출 금지 - RULE-007)
# =============================================================================

logger = logging.getLogger(__name__)


# =============================================================================
# 정책 및 상수 정의
# =============================================================================


class ImagePolicy(BaseModel):
    """이미지 생성 정책 (U-068).

    Attributes:
        use_reference: 참조 이미지(이전 턴 이미지) 사용 여부
        max_reference_images: 최대 참조 이미지 수 (기본 1)
    """

    model_config = ConfigDict(extra="forbid")

    use_reference: bool = Field(default=True, description="참조 이미지 사용 여부")
    max_reference_images: int = Field(default=1, description="최대 참조 이미지 수")


# 기본 정책 인스턴스
DEFAULT_IMAGE_POLICY = ImagePolicy()


# =============================================================================
# 텍스트-only 폴백 메시지 (i18n)
# =============================================================================

FALLBACK_MESSAGE_KO = "잔액이 부족하여 이미지를 생성할 수 없습니다. 텍스트로 진행합니다."
"""잔액 부족 시 폴백 메시지 (한국어)."""

FALLBACK_MESSAGE_EN = "Insufficient balance for image generation. Proceeding with text only."
"""잔액 부족 시 폴백 메시지 (영어)."""

# =============================================================================
# 이미지 생성 실패 폴백 메시지 (i18n) - U-054
# =============================================================================

IMAGE_GENERATION_FAILURE_MESSAGE_KO = "이미지 생성에 실패했습니다. 텍스트로 진행합니다."
"""이미지 생성 실패 시 폴백 메시지 (한국어)."""

IMAGE_GENERATION_FAILURE_MESSAGE_EN = "Image generation failed. Proceeding with text only."
"""이미지 생성 실패 시 폴백 메시지 (영어)."""

# =============================================================================
# 안전 정책 차단 메시지 (i18n) - U-054
# =============================================================================

SAFETY_BLOCKED_MESSAGE_KO = "안전 정책에 따라 이미지를 생성할 수 없습니다."
"""안전 정책 차단 시 메시지 (한국어)."""

SAFETY_BLOCKED_MESSAGE_EN = "Image generation blocked due to safety policies."
"""안전 정책 차단 시 메시지 (영어)."""


# =============================================================================
# 판정 결과 데이터 클래스
# =============================================================================


@dataclass(frozen=True)
class ImageGenerationDecision:
    """이미지 생성 판정 결과.

    이미지 생성 여부와 관련 정보를 담은 불변 데이터 클래스입니다.

    Attributes:
        should_generate: 이미지를 생성해야 하는지
        reason: 판정 사유 (로깅/디버깅용)
        prompt_hash: 프롬프트 해시 (원문 노출 금지, 로깅용)
        aspect_ratio: 가로세로 비율 (생성 시)
        image_size: 이미지 크기 (생성 시)
        estimated_cost_signal: 예상 Signal 비용
        fallback_message: 생성 불가 시 폴백 메시지 (선택)
        model_override: 모델 오버라이드 (U-079: 잔액 부족 시 FAST 강제)
        is_low_balance_fallback: 잔액 부족 FAST 폴백 여부 (U-079)
    """

    should_generate: bool
    reason: str
    prompt_hash: str | None = None
    aspect_ratio: str | None = None
    image_size: str | None = None
    reference_image_url: str | None = None
    estimated_cost_signal: int = IMAGE_GENERATION_COST_SIGNAL
    fallback_message: str | None = None
    model_override: str | None = None
    is_low_balance_fallback: bool = False


# =============================================================================
# ImageJob 분석 헬퍼 함수
# =============================================================================


def extract_image_job(turn_output: TurnOutput) -> ImageJob | None:
    """TurnOutput에서 ImageJob을 추출합니다.

    Args:
        turn_output: 검증할 TurnOutput

    Returns:
        유효한 ImageJob 또는 None
    """
    # TurnOutput.render는 default_factory=RenderOutput이므로 항상 존재
    # render.image_job은 선택적 (None 가능)
    return turn_output.render.image_job


def should_generate_image(image_job: ImageJob | None) -> bool:
    """이미지 생성 여부를 판정합니다.

    다음 조건을 모두 만족해야 True를 반환합니다:
    1. image_job이 None이 아님
    2. image_job.should_generate가 True
    3. image_job.prompt가 비어있지 않음 (빈 프롬프트 방어)

    Args:
        image_job: 검사할 ImageJob (None 가능)

    Returns:
        이미지를 생성해야 하면 True
    """
    if image_job is None:
        return False

    if not image_job.should_generate:
        return False

    # 빈 프롬프트 방어: 모델이 should_generate=true지만 프롬프트가 없는 경우
    return bool(image_job.prompt and image_job.prompt.strip())


def get_prompt_hash(prompt: str) -> str:
    """프롬프트의 SHA-256 해시를 생성합니다.

    RULE-007: 프롬프트 원문은 로그에 노출하지 않고 해시만 사용합니다.

    Args:
        prompt: 해시할 프롬프트

    Returns:
        8자리 해시 문자열
    """
    return hashlib.sha256(prompt.encode()).hexdigest()[:8]


# =============================================================================
# Economy 기반 판정 함수
# =============================================================================


def can_afford_image_generation(
    economy_snapshot: EconomySnapshot,
    estimated_cost_signal: int = IMAGE_GENERATION_COST_SIGNAL,
) -> bool:
    """이미지 생성 비용을 감당할 수 있는지 판정합니다.

    RULE-005: 잔액 부족 시 생성을 강행하지 않고, 대안(텍스트-only)을 제안합니다.

    Args:
        economy_snapshot: 현재 재화 스냅샷
        estimated_cost_signal: 예상 Signal 비용 (기본값: 10)

    Returns:
        비용을 감당할 수 있으면 True
    """
    return economy_snapshot.signal >= estimated_cost_signal


def get_fallback_message(language: str) -> str:
    """언어에 맞는 폴백 메시지를 반환합니다.

    RULE-006: ko/en 언어 정책 준수

    Args:
        language: 언어 코드 ("ko-KR" 또는 "en-US")

    Returns:
        해당 언어의 폴백 메시지
    """
    if language == "ko-KR":
        return FALLBACK_MESSAGE_KO
    return FALLBACK_MESSAGE_EN


# =============================================================================
# 통합 판정 함수
# =============================================================================


def decide_image_generation(
    turn_output: TurnOutput,
    economy_snapshot: EconomySnapshot,
    language: str = "en-US",
    previous_image_url: str | None = None,
) -> ImageGenerationDecision:
    """이미지 생성 여부를 종합적으로 판정합니다.

    다음 순서로 검증합니다:
    1. ImageJob 존재 여부
    2. should_generate 플래그
    3. 프롬프트 유효성
    4. 잔액 충분 여부 (RULE-005)

    Args:
        turn_output: 검증할 TurnOutput
        economy_snapshot: 현재 재화 스냅샷
        language: 폴백 메시지 언어 (기본: ko-KR)
        previous_image_url: 이전 턴 이미지 URL (U-068: 참조 이미지로 사용)

    Returns:
        ImageGenerationDecision: 판정 결과
    """
    # 1. ImageJob 추출
    image_job = extract_image_job(turn_output)

    if image_job is None:
        logger.debug("[RenderHelpers] ImageJob 없음, 이미지 생성 건너뜀")
        return ImageGenerationDecision(
            should_generate=False,
            reason="no_image_job",
        )

    # 2. should_generate 플래그 확인
    if not image_job.should_generate:
        logger.debug("[RenderHelpers] should_generate=false, 이미지 생성 건너뜀")
        return ImageGenerationDecision(
            should_generate=False,
            reason="should_generate_false",
        )

    # 3. 프롬프트 유효성 검사
    if not image_job.prompt or not image_job.prompt.strip():
        logger.warning("[RenderHelpers] 프롬프트 비어있음, 이미지 생성 건너뜀 (방어)")
        return ImageGenerationDecision(
            should_generate=False,
            reason="empty_prompt",
        )

    # 프롬프트 해시 생성 (원문 로깅 금지 - RULE-007)
    prompt_hash = get_prompt_hash(image_job.prompt)

    # U-068: 참조 이미지 URL 결정 (TurnInput 우선, image_job 폴백)
    # 클라이언트에서 제공한 이전 이미지를 우선 사용하여 연속성 유지
    effective_reference_url = previous_image_url or image_job.reference_image_url

    # 4. 잔액 확인 + U-079: FAST 폴백 정책
    # RULE-005(잔액 음수 금지) 준수하면서 게임 흐름 차단 방지
    # - 잔액 >= IMAGE_GENERATION_COST_SIGNAL: QUALITY 모델 (정상)
    # - 잔액 < IMAGE_GENERATION_COST_SIGNAL: FAST 모델 폴백 (무료)
    if not can_afford_image_generation(economy_snapshot, IMAGE_GENERATION_COST_SIGNAL):
        # U-079: 잔액 부족 → FAST 모델로 폴백 (비용 0, 무료 기본 이미지)
        logger.info(
            "[RenderHelpers] 잔액 부족, FAST 모델 폴백 (U-079)",
            extra={
                "current_signal": economy_snapshot.signal,
                "required_signal": IMAGE_GENERATION_COST_SIGNAL,
                "fallback_cost": FAST_IMAGE_COST_SIGNAL,
                "prompt_hash": prompt_hash,
            },
        )
        return ImageGenerationDecision(
            should_generate=True,
            reason="low_balance_fast_fallback",
            prompt_hash=prompt_hash,
            aspect_ratio=image_job.aspect_ratio,
            image_size=image_job.image_size,
            reference_image_url=effective_reference_url,
            estimated_cost_signal=FAST_IMAGE_COST_SIGNAL,
            model_override="FAST",
            is_low_balance_fallback=True,
        )

    # 모든 조건 통과 - QUALITY 이미지 생성 진행
    logger.info(
        "[RenderHelpers] 이미지 생성 판정 통과 (QUALITY)",
        extra={
            "prompt_hash": prompt_hash,
            "aspect_ratio": image_job.aspect_ratio,
            "image_size": image_job.image_size,
            "reference_image_url": effective_reference_url,
            "has_previous_image": bool(previous_image_url),
            "estimated_cost": IMAGE_GENERATION_COST_SIGNAL,
        },
    )

    return ImageGenerationDecision(
        should_generate=True,
        reason="all_conditions_met",
        prompt_hash=prompt_hash,
        aspect_ratio=image_job.aspect_ratio,
        image_size=image_job.image_size,
        reference_image_url=effective_reference_url,
        estimated_cost_signal=IMAGE_GENERATION_COST_SIGNAL,
    )


# =============================================================================
# 이미지 생성 실패/안전 차단 헬퍼 함수 (U-054)
# =============================================================================


def is_safety_blocked(message: str | None) -> bool:
    """응답 메시지가 안전 정책 차단을 나타내는지 확인합니다.

    RULE-004: 안전 차단 시 적절한 메시지가 TurnOutput.safety에 기록되어야 합니다.

    Args:
        message: 이미지 생성 응답 메시지 (None 가능)

    Returns:
        안전 정책 차단이면 True
    """
    if not message:
        return False

    message_lower = message.lower()
    safety_keywords = ["safety", "blocked", "policy", "violation", "prohibited"]
    return any(keyword in message_lower for keyword in safety_keywords)


def get_image_failure_message(language: str) -> str:
    """언어에 맞는 이미지 생성 실패 폴백 메시지를 반환합니다.

    RULE-006: ko/en 언어 정책 준수

    Args:
        language: 언어 코드 ("ko-KR" 또는 "en-US")

    Returns:
        해당 언어의 이미지 생성 실패 메시지
    """
    if language == "ko-KR":
        return IMAGE_GENERATION_FAILURE_MESSAGE_KO
    return IMAGE_GENERATION_FAILURE_MESSAGE_EN


def get_safety_blocked_message(language: str) -> str:
    """언어에 맞는 안전 정책 차단 메시지를 반환합니다.

    RULE-006: ko/en 언어 정책 준수

    Args:
        language: 언어 코드 ("ko-KR" 또는 "en-US")

    Returns:
        해당 언어의 안전 차단 메시지
    """
    if language == "ko-KR":
        return SAFETY_BLOCKED_MESSAGE_KO
    return SAFETY_BLOCKED_MESSAGE_EN


@dataclass(frozen=True)
class ImageFallbackResult:
    """이미지 생성 실패 시 폴백 결과.

    U-054: 이미지 생성 실패 시 안전한 폴백 정보를 담은 데이터 클래스입니다.

    Attributes:
        is_safety_blocked: 안전 정책에 의해 차단되었는지
        fallback_message: 사용자에게 표시할 폴백 메시지
        should_update_safety: TurnOutput.safety를 업데이트해야 하는지
        reason: 폴백 사유 (로깅용)
    """

    is_safety_blocked: bool
    fallback_message: str
    should_update_safety: bool
    reason: str


def create_image_fallback_result(
    status_message: str | None,
    language: str = "en-US",
) -> ImageFallbackResult:
    """이미지 생성 실패에 대한 폴백 결과를 생성합니다.

    U-054: RULE-004에 따라 이미지 생성 실패 시 안전한 폴백을 제공합니다.
    재시도 없이 즉시 폴백합니다 (Q1: Option A).

    Args:
        status_message: 이미지 생성 응답 메시지 (실패 사유)
        language: 폴백 메시지 언어 (기본: ko-KR)

    Returns:
        ImageFallbackResult: 폴백 처리에 필요한 정보
    """
    is_blocked = is_safety_blocked(status_message)

    if is_blocked:
        return ImageFallbackResult(
            is_safety_blocked=True,
            fallback_message=get_safety_blocked_message(language),
            should_update_safety=True,
            reason="safety_blocked",
        )

    return ImageFallbackResult(
        is_safety_blocked=False,
        fallback_message=get_image_failure_message(language),
        should_update_safety=False,
        reason="generation_failed",
    )
