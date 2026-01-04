"""TurnInput/TurnOutput 모델 단위 테스트."""

import pytest
from pydantic import ValidationError

from unknown_world.models.turn import (
    AgentConsole,
    Box2D,
    CurrencyAmount,
    EconomyOutput,
    Language,
    RenderOutput,
    TurnInput,
    TurnOutput,
    UIOutput,
    WorldDelta,
)

# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def valid_box_2d():
    return {"ymin": 100, "xmin": 200, "ymax": 300, "xmax": 400}


@pytest.fixture
def valid_currency_amount():
    return {"signal": 100, "memory_shard": 5}


@pytest.fixture
def valid_client_info():
    return {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"}


@pytest.fixture
def valid_turn_input_data(valid_client_info, valid_currency_amount):
    return {
        "language": "ko-KR",
        "text": "Hello",
        "client": valid_client_info,
        "economy_snapshot": valid_currency_amount,
    }


@pytest.fixture
def valid_turn_output_data(valid_currency_amount):
    return {
        "language": "ko-KR",
        "narrative": "Story continues...",
        "economy": {
            "cost": {"signal": 10, "memory_shard": 0},
            "balance_after": {"signal": 90, "memory_shard": 5},
        },
        "safety": {"blocked": False},
    }


# =============================================================================
# Coordinate & Box2D Tests
# =============================================================================


def test_box_2d_valid(valid_box_2d):
    box = Box2D(**valid_box_2d)
    assert box.ymin == 100
    assert box.xmax == 400


def test_box_2d_invalid_coordinate():
    with pytest.raises(ValidationError):
        # Out of range (ge=0, le=1000)
        Box2D(ymin=-1, xmin=0, ymax=1001, xmax=500)


def test_box_2d_extra_forbidden():
    with pytest.raises(ValidationError):
        Box2D(ymin=0, xmin=0, ymax=100, xmax=100, extra_field="not allowed")


# =============================================================================
# Currency & Economy Tests
# =============================================================================


def test_currency_amount_valid(valid_currency_amount):
    amount = CurrencyAmount(**valid_currency_amount)
    assert amount.signal == 100


def test_currency_amount_negative_fails():
    with pytest.raises(ValidationError):
        CurrencyAmount(signal=-1, memory_shard=0)


def test_economy_output_valid():
    data = {
        "cost": {"signal": 5, "memory_shard": 0},
        "balance_after": {"signal": 95, "memory_shard": 5},
    }
    economy = EconomyOutput(**data)
    assert economy.cost.signal == 5
    assert economy.balance_after.signal == 95


# =============================================================================
# TurnInput Tests
# =============================================================================


def test_turn_input_valid(valid_turn_input_data):
    turn_input = TurnInput(**valid_turn_input_data)
    assert turn_input.language == Language.KO
    assert turn_input.text == "Hello"


def test_turn_input_with_click(valid_turn_input_data, valid_box_2d):
    data = valid_turn_input_data.copy()
    data["click"] = {"object_id": "door_01", "box_2d": valid_box_2d}
    turn_input = TurnInput(**data)
    assert turn_input.click.object_id == "door_01"
    assert turn_input.click.box_2d.ymin == 100


def test_turn_input_invalid_language():
    with pytest.raises(ValidationError):
        TurnInput(
            language="fr-FR",  # Not in Language enum
            text="...",
            client={"viewport_w": 800, "viewport_h": 600},
            economy_snapshot={"signal": 0, "memory_shard": 0},
        )


# =============================================================================
# TurnOutput Tests
# =============================================================================


def test_turn_output_valid_minimal(valid_turn_output_data):
    turn_output = TurnOutput(**valid_turn_output_data)
    assert turn_output.language == Language.KO
    assert turn_output.narrative == "Story continues..."
    # Check defaults
    assert isinstance(turn_output.ui, UIOutput)
    assert isinstance(turn_output.world, WorldDelta)
    assert isinstance(turn_output.render, RenderOutput)
    assert isinstance(turn_output.agent_console, AgentConsole)


def test_turn_output_full(valid_currency_amount, valid_box_2d):
    data = {
        "language": "en-US",
        "narrative": "Narrative text",
        "ui": {
            "action_deck": {
                "cards": [
                    {
                        "id": "c1",
                        "label": "Action 1",
                        "cost": {"signal": 5, "memory_shard": 0},
                    }
                ]
            },
            "objects": [{"id": "obj1", "label": "Object 1", "box_2d": valid_box_2d}],
        },
        "world": {
            "inventory_added": ["key"],
            "rules_changed": [{"id": "r1", "label": "Gravity", "description": "Low gravity"}],
            "quests_updated": [{"id": "q1", "label": "Find key", "is_completed": False}],
            "memory_pins": [
                {"id": "p1", "content": "Fact", "cost": {"signal": 1, "memory_shard": 0}}
            ],
        },
        "render": {
            "image_job": {
                "should_generate": True,
                "prompt": "A landscape",
                "model_label": "QUALITY",
            }
        },
        "economy": {
            "cost": {"signal": 10, "memory_shard": 0},
            "balance_after": {"signal": 90, "memory_shard": 5},
        },
        "safety": {"blocked": False},
        "agent_console": {"repair_count": 1, "badges": ["schema_ok", "economy_ok"]},
    }
    turn_output = TurnOutput(**data)
    assert turn_output.language == Language.EN
    assert len(turn_output.ui.action_deck.cards) == 1
    assert turn_output.render.image_job.should_generate is True


def test_turn_output_missing_required():
    with pytest.raises(ValidationError):
        # Missing economy and safety
        TurnOutput(language="ko-KR", narrative="...")


# =============================================================================
# JSON Schema Tests
# =============================================================================


def test_turn_output_json_schema():
    schema = TurnOutput.model_json_schema()
    assert schema["type"] == "object"
    assert "language" in schema["required"]
    assert "narrative" in schema["required"]
    assert "economy" in schema["required"]
    assert "safety" in schema["required"]

    # Check Coordinate constraints in schema
    # Pydantic 2 schema structure: properties -> language -> ...
    # Coordinate might be in $defs or inline depending on how it's used
    ui_props = schema["$defs"]["UIOutput"]["properties"]
    assert "action_deck" in ui_props

    # Verify that Coordinate (int with ge/le) is correctly represented
    # Box2D uses Coordinate
    box_props = schema["$defs"]["Box2D"]["properties"]
    assert box_props["ymin"]["maximum"] == 1000
    assert box_props["ymin"]["minimum"] == 0
