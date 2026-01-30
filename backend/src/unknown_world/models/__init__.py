"""Unknown World - 모델 패키지.

이 패키지는 TurnInput/TurnOutput 스키마 및 하위 타입을 정의합니다.
Gemini Structured Outputs(JSON Schema)용으로 설계되었습니다.

사용 예시:
    from unknown_world.models import TurnInput, TurnOutput

    # Pydantic → JSON Schema 변환 (Gemini response_json_schema용)
    schema = TurnOutput.model_json_schema()

    # 응답 검증
    output = TurnOutput.model_validate_json(response_text)

참조:
    - vibe/prd.md 8.7 (데이터 모델 설계)
    - vibe/ref/structured-outputs-guide.md
    - .cursor/rules/00-core-critical.mdc (RULE-003, RULE-005)
"""

from unknown_world.models.scanner import (
    DetectedObject,
    ItemCandidate,
    ScanRequest,
    ScanResponse,
    ScanResult,
    ScanStatus,
)
from unknown_world.models.turn import (
    ActionCard,
    ActionDeck,
    AgentConsole,
    AgentPhase,
    Box2D,
    ClickInput,
    ClientInfo,
    Coordinate,
    CurrencyAmount,
    EconomyOutput,
    EconomySnapshot,
    ImageJob,
    Language,
    MemoryPin,
    ModelLabel,
    Quest,
    RenderOutput,
    RiskLevel,
    SafetyOutput,
    SceneObject,
    Theme,
    TurnInput,
    TurnOutput,
    UIOutput,
    ValidationBadge,
    WorldDelta,
    WorldRule,
)

__all__ = [
    # Enum 타입
    "Language",
    "Theme",
    "AgentPhase",
    "ValidationBadge",
    "ModelLabel",
    "RiskLevel",
    # 공통 하위 타입
    "Coordinate",
    "Box2D",
    "CurrencyAmount",
    # TurnInput 관련
    "TurnInput",
    "ClickInput",
    "ClientInfo",
    "EconomySnapshot",
    # TurnOutput 관련
    "TurnOutput",
    "UIOutput",
    "ActionDeck",
    "ActionCard",
    "SceneObject",
    "WorldDelta",
    "WorldRule",
    "Quest",
    "MemoryPin",
    "RenderOutput",
    "ImageJob",
    "EconomyOutput",
    "SafetyOutput",
    "AgentConsole",
    # Scanner 관련 (U-021)
    "ScanStatus",
    "DetectedObject",
    "ItemCandidate",
    "ScanResult",
    "ScanRequest",
    "ScanResponse",
]
