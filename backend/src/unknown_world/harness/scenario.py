"""Unknown World - 시나리오 스키마/직렬화.

리플레이를 위한 시나리오 데이터 구조를 정의합니다.
seed + TurnInput 시퀀스를 JSON으로 직렬화합니다.

설계 원칙:
    - 시나리오는 결정적 재현을 위해 seed를 포함
    - 각 스텝은 TurnInput의 핵심 필드만 포함 (최소화)
    - 결과는 Hard Gate(Schema/Economy/Safety/Consistency) 통과 여부로 판정

참조:
    - vibe/unit-plans/U-025[Mvp].md
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from unknown_world.models.turn import CurrencyAmount, Language


class GateStatus(str, Enum):
    """Hard Gate 상태."""

    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"


class GateResult(BaseModel):
    """단일 Hard Gate 검증 결과."""

    name: str  # schema / economy / safety / consistency
    status: GateStatus
    detail: str = ""


class ScenarioStep(BaseModel):
    """시나리오의 단일 턴 입력.

    TurnInput의 핵심 필드만 포함하여 시나리오 크기를 최소화합니다.
    """

    text: str
    action_id: str | None = None
    economy_snapshot: CurrencyAmount = Field(
        default_factory=lambda: CurrencyAmount(signal=100, memory_shard=5)
    )


class Scenario(BaseModel):
    """리플레이 시나리오.

    seed + 사용자 액션(TurnInput) 시퀀스를 JSON으로 직렬화합니다.
    """

    name: str
    description: str = ""
    language: Language = Language.EN
    profile_id: str = "explorer"
    seed: int = 42
    steps: list[ScenarioStep] = []

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "demo_basic",
                "description": "Basic demo scenario for 10-min loop",
                "language": "en-US",
                "profile_id": "explorer",
                "seed": 42,
                "steps": [
                    {"text": "Look around", "action_id": "explore"},
                    {"text": "Open the door"},
                    {"text": "Pick up the key", "action_id": "interact"},
                ],
            }
        }
    )


class StepResult(BaseModel):
    """시나리오 스텝 실행 결과."""

    step_index: int
    text: str
    gates: list[GateResult]
    all_passed: bool
    narrative_preview: str = ""  # 첫 100자
    error: str | None = None
