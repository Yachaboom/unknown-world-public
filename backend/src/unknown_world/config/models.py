"""Unknown World - 모델 라벨 및 ID 상수 정의.

이 모듈은 Gemini 모델 ID와 라벨을 SSOT로 관리합니다.
tech-stack.md 기준으로 버전/모델 ID가 고정되어 있으며,
임의 변경은 RULE-010 위반입니다.

모델 라인업 (tech-stack.md 기준):
    - 텍스트 FAST: gemini-3-flash-preview
    - 텍스트 QUALITY: gemini-3-pro-preview
    - 이미지(생성/편집): gemini-3-pro-image-preview (고정)

참조:
    - vibe/tech-stack.md (버전 기준일: 2026-01-01)
    - .cursor/rules/00-core-critical.mdc (RULE-007/010)
"""

from enum import StrEnum
from typing import Final


class ModelLabel(StrEnum):
    """모델 라벨 열거형.

    UI/로그에는 모델 ID 원문 대신 이 라벨을 우선 노출합니다. (RULE-008)
    """

    FAST = "FAST"
    """빠른 응답용 텍스트 모델 (gemini-3-flash-preview)"""

    QUALITY = "QUALITY"
    """고품질 텍스트 모델 (gemini-3-pro-preview)"""

    IMAGE = "IMAGE"
    """이미지 생성/편집 모델 (gemini-3-pro-image-preview, 고정)"""

    IMAGE_FAST = "IMAGE_FAST"
    """저지연 이미지 프리뷰 모델 (gemini-2.5-flash-image, U-066)"""

    VISION = "VISION"
    """비전/공간 분석 모델 (bbox/segmentation용, gemini-3-flash-preview)"""


# =============================================================================
# 모델 ID 상수 (tech-stack.md SSOT)
# =============================================================================
# 주의: 이 값들은 tech-stack.md와 1:1로 일치해야 합니다.
# 임의 변경 금지 (RULE-010)

MODEL_FAST: Final[str] = "gemini-3-flash-preview"
"""FAST 라벨 모델 ID - 빠른 텍스트 생성용"""

MODEL_QUALITY: Final[str] = "gemini-3-pro-preview"
"""QUALITY 라벨 모델 ID - 고품질 텍스트 생성용"""

MODEL_IMAGE: Final[str] = "gemini-3-pro-image-preview"
"""IMAGE 라벨 모델 ID - 이미지 생성/편집용 (고정, RULE-010)"""

MODEL_IMAGE_FAST: Final[str] = "gemini-2.5-flash-image"
"""IMAGE_FAST 라벨 모델 ID - 저지연 이미지 프리뷰용 (U-066)"""

MODEL_VISION: Final[str] = "gemini-3-flash-preview"
"""VISION 라벨 모델 ID - 비전/공간 분석용 (bbox/segmentation)"""

# =============================================================================
# U-127: 기본 텍스트 모델 / 폴백 모델 상수
# =============================================================================
# gemini-3-pro-preview를 기본 텍스트 모델로 사용.
# API 오류(429/5xx/timeout) 시 gemini-3-flash-preview로 자동 폴백.

MODEL_DEFAULT: Final[str] = MODEL_QUALITY
"""기본 텍스트 모델 ID (U-127: gemini-3-pro-preview)"""

MODEL_DEFAULT_LABEL: Final[ModelLabel] = ModelLabel.QUALITY
"""기본 텍스트 모델 라벨 (U-127: QUALITY = Pro)"""

MODEL_FALLBACK: Final[str] = MODEL_FAST
"""폴백 텍스트 모델 ID (U-127: gemini-3-flash-preview)"""

MODEL_FALLBACK_LABEL: Final[ModelLabel] = ModelLabel.FAST
"""폴백 텍스트 모델 라벨 (U-127: FAST = Flash)"""

# U-127: Gemini 3 Thinking Level 기본값 (페어링 Q2: Option A - high)
DEFAULT_THINKING_LEVEL: Final[str] = "high"
"""Gemini 3 thinking level 기본값 (U-127)"""


# =============================================================================
# 텍스트 모델 티어링 설정 (U-069)
# =============================================================================
# Q1 결정: Option B - 액션 ID + 키워드 매칭


class TextModelTiering:
    """텍스트 모델 티어링 설정.

    U-127 변경: 기본 모델이 gemini-3-pro-preview(QUALITY)로 전환됨.
    "정밀조사" 트리거 시 추가 비용 배수(2x)가 적용됨.

    페어링 질문 결정:
        - Q1: Option B - 액션 ID + 키워드 매칭
        - Q2: Option A - 2x (기본 비용의 2배)
        - Q3: Option B + C - 특정 상황 등장 + 아이템 활성화
    """

    # QUALITY 트리거 액션 ID 목록
    # "정밀조사" 및 관련 액션
    QUALITY_TRIGGER_ACTION_IDS: Final[frozenset[str]] = frozenset(
        {
            "deep_investigate",
            "정밀조사",
            "analyze",
            "examine_closely",
            "investigate_detail",
            "scrutinize",
            "thorough_search",
            # 돋보기 아이템 사용 액션 (Q3 결정: Option C)
            "use_magnifier",
            "use_magnifying_glass",
        }
    )

    # U-076: "정밀분석" 트리거 액션 ID 목록 (Agentic Vision)
    # QUALITY 트리거와 별도 관리 (다른 비용 정책: 1.5x)
    VISION_TRIGGER_ACTION_IDS: Final[frozenset[str]] = frozenset(
        {
            "deep_analyze",
            "정밀분석",
            "analyze_scene",
            "examine_scene",
            "look_closely",
        }
    )

    # U-076: 비전 분석 비용 배수 (Q2 결정: Option B - 1.5x)
    VISION_COST_MULTIPLIER: Final[float] = 1.5
    """비전 분석(정밀분석) 비용 배수"""

    # QUALITY 트리거 키워드 목록 (소문자)
    # Q1 결정: Option B - 키워드 매칭 포함
    QUALITY_TRIGGER_KEYWORDS: Final[tuple[str, ...]] = (
        "정밀조사",
        "자세히",
        "깊이",
        "꼼꼼히",
        "면밀히",
        "세밀하게",
        "thoroughly",
        "in detail",
        "closely examine",
        "scrutinize",
    )

    # U-076: 비전 분석(정밀분석) 트리거 키워드 (소문자)
    VISION_TRIGGER_KEYWORDS: Final[tuple[str, ...]] = (
        "정밀분석",
        "장면 분석",
        "이미지 분석",
        "자세히 보기",
        "analyze scene",
        "deep analyze",
        "look closely",
        "examine scene",
    )

    # 비용 배수 (Q2 결정: Option A - 2x)
    FAST_COST_MULTIPLIER: Final[float] = 1.0
    """FAST 모델 비용 배수 (기본)"""

    QUALITY_COST_MULTIPLIER: Final[float] = 2.0
    """QUALITY 모델 비용 배수 (Q2 결정: Option A - 2x)"""

    @classmethod
    def is_vision_trigger(
        cls,
        action_id: str | None,
        text: str | None,
    ) -> bool:
        """비전 분석(정밀분석) 트리거 여부를 판단합니다 (U-076).

        Args:
            action_id: 선택된 액션 ID (선택)
            text: 사용자 입력 텍스트 (선택)

        Returns:
            정밀분석(비전 분석)을 실행해야 하는지 여부
        """
        # 액션 ID 검사
        if action_id and action_id in cls.VISION_TRIGGER_ACTION_IDS:
            return True

        # 키워드 검사 (대소문자 무시)
        if text:
            text_lower = text.lower()
            for keyword in cls.VISION_TRIGGER_KEYWORDS:
                if keyword.lower() in text_lower:
                    return True

        return False

    @classmethod
    def is_quality_trigger(
        cls,
        action_id: str | None,
        text: str | None,
    ) -> bool:
        """QUALITY 모델 트리거 여부를 판단합니다.

        Args:
            action_id: 선택된 액션 ID (선택)
            text: 사용자 입력 텍스트 (선택)

        Returns:
            QUALITY 모델을 사용해야 하는지 여부
        """
        # 액션 ID 검사
        if action_id and action_id in cls.QUALITY_TRIGGER_ACTION_IDS:
            return True

        # 키워드 검사 (대소문자 무시)
        if text:
            text_lower = text.lower()
            for keyword in cls.QUALITY_TRIGGER_KEYWORDS:
                if keyword.lower() in text_lower:
                    return True

        return False

    @classmethod
    def get_cost_multiplier(cls, model_label: ModelLabel) -> float:
        """모델 라벨에 따른 비용 배수를 반환합니다.

        Args:
            model_label: 모델 라벨 (FAST, QUALITY)

        Returns:
            비용 배수
        """
        if model_label == ModelLabel.QUALITY:
            return cls.QUALITY_COST_MULTIPLIER
        return cls.FAST_COST_MULTIPLIER


# 라벨-ID 매핑 테이블
_MODEL_MAP: Final[dict[ModelLabel, str]] = {
    ModelLabel.FAST: MODEL_FAST,
    ModelLabel.QUALITY: MODEL_QUALITY,
    ModelLabel.IMAGE: MODEL_IMAGE,
    ModelLabel.IMAGE_FAST: MODEL_IMAGE_FAST,
    ModelLabel.VISION: MODEL_VISION,
}


def get_model_id(label: ModelLabel) -> str:
    """라벨로 모델 ID를 조회합니다.

    Args:
        label: 모델 라벨 (FAST, QUALITY, IMAGE, VISION)

    Returns:
        해당 라벨에 매핑된 모델 ID 문자열

    Example:
        >>> get_model_id(ModelLabel.FAST)
        'gemini-3-flash-preview'
    """
    return _MODEL_MAP[label]
