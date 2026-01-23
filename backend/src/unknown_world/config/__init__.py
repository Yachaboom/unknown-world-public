"""Unknown World - 설정 및 상수 패키지.

이 패키지는 프로젝트 전역에서 사용하는 설정값과 상수를 관리합니다.
모델 ID, 환경 설정, 정책 등 SSOT를 유지하기 위한 중앙 저장소입니다.

참조:
    - vibe/tech-stack.md (버전/모델 SSOT)
    - .cursor/rules/00-core-critical.mdc (RULE-010: 버전/스택 고정)
"""

from unknown_world.config.models import (
    MODEL_FAST,
    MODEL_IMAGE,
    MODEL_QUALITY,
    ModelLabel,
    get_model_id,
)

__all__ = [
    "MODEL_FAST",
    "MODEL_QUALITY",
    "MODEL_IMAGE",
    "ModelLabel",
    "get_model_id",
]
