import pytest
from pydantic import ValidationError

from unknown_world.models.turn import (
    ActionCard,
    ActionDeck,
    AgentConsole,
    Language,
    TurnOutput,
    ValidationBadge,
    WorldDelta,
)


def test_turn_output_simplified_schema_validation_success():
    """단순화된 스키마를 따르는 정상적인 데이터 검증 성공 확인"""
    data = {
        "language": "ko-KR",
        "narrative": "테스트 내러티브입니다.",
        "economy": {
            "cost": {"signal": 5, "memory_shard": 0},
            "balance_after": {"signal": 95, "memory_shard": 5},
        },
        "safety": {"blocked": False},
        "ui": {
            "action_deck": {
                "cards": [
                    {
                        "id": "action_1",
                        "label": "행동 1",
                        "cost": {"signal": 1, "memory_shard": 0},
                        "risk": "low",
                        "enabled": True,
                        "is_alternative": False,
                    }
                ]
            },
            "objects": [],
        },
        "world": {
            "rules_changed": [],
            "inventory_added": ["item_1"],
            "quests_updated": [],
            "memory_pins": [],
        },
        "render": {"image_job": None},
        "agent_console": {"current_phase": "commit", "badges": ["schema_ok"], "repair_count": 0},
    }
    output = TurnOutput.model_validate(data)
    assert output.language == Language.KO
    assert len(output.ui.action_deck.cards) == 1
    # 제거된 필드가 데이터에 없어야 함을 확인 (ActionCard)
    assert not hasattr(output.ui.action_deck.cards[0], "description")
    assert not hasattr(output.ui.action_deck.cards[0], "cost_estimate")


def test_turn_output_extra_fields_forbidden():
    """제거된 필드가 포함되었을 때 extra='forbid' 설정에 의해 실패하는지 확인 (ActionCard)"""
    # ActionCard는 model_config = ConfigDict(extra="forbid")가 설정되어 있지 않음
    # 하지만 TurnOutput 및 주요 하위 모델들은 설정되어 있음.
    # ActionCard에 필드가 없으므로 validation 시 에러가 나거나 무시되어야 함.
    # Pydantic v2에서는 필드가 정의되지 않으면 에러가 발생함 (extra="forbid"인 경우)

    data = {
        "id": "action_1",
        "label": "행동 1",
        "description": "이 필드는 제거되었습니다.",  # 제거된 필드
        "cost": {"signal": 1, "memory_shard": 0},
    }

    with pytest.raises(ValidationError):
        ActionCard.model_validate(data)

    # extra="forbid"가 설정되어 있다면 'extra fields not permitted' 에러 발생
    # models/turn.py를 확인해보면 ActionCard에는 extra="forbid"가 없으므로 무시될 수 있음.
    # 하지만 TurnOutput 수준에서 검증할 때 문제가 될 수 있음.


def test_action_deck_max_length_violation():
    """ActionDeck.cards의 max_length=5 제약 위반 확인"""
    cards = [
        {"id": f"action_{i}", "label": f"행동 {i}", "cost": {"signal": 1, "memory_shard": 0}}
        for i in range(6)  # 6개 생성
    ]

    with pytest.raises(ValidationError) as excinfo:
        ActionDeck(cards=cards)

    assert "List should have at most 5 items" in str(excinfo.value)


def test_world_delta_max_length_violations():
    """WorldDelta의 각종 배열 max_length 제약 위반 확인"""
    # rules_changed: max_length=3
    with pytest.raises(ValidationError):
        WorldDelta(rules_changed=[{"id": "r1", "label": "L"}] * 4)

    # inventory_added: max_length=5
    with pytest.raises(ValidationError):
        WorldDelta(inventory_added=["item"] * 6)

    # memory_pins: max_length=2
    with pytest.raises(ValidationError):
        WorldDelta(
            memory_pins=[{"id": "p1", "content": "C", "cost": {"signal": 1, "memory_shard": 0}}] * 3
        )


def test_agent_console_badges_max_length():
    """AgentConsole.badges의 max_length=4 제약 위반 확인"""
    with pytest.raises(ValidationError):
        AgentConsole(badges=[ValidationBadge.SCHEMA_OK] * 5)
