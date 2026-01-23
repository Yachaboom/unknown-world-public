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

MODEL_VISION: Final[str] = "gemini-3-flash-preview"
"""VISION 라벨 모델 ID - 비전/공간 분석용 (bbox/segmentation)"""


# 라벨-ID 매핑 테이블
_MODEL_MAP: Final[dict[ModelLabel, str]] = {
    ModelLabel.FAST: MODEL_FAST,
    ModelLabel.QUALITY: MODEL_QUALITY,
    ModelLabel.IMAGE: MODEL_IMAGE,
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
