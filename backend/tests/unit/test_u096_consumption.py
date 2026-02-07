from unknown_world.models.turn import TurnOutput, WorldDelta


def test_world_delta_inventory_removed_serialization():
    """WorldDelta의 inventory_removed 필드 직렬화/역직렬화 테스트 (U-096)."""
    delta_data = {
        "inventory_added": [],
        "inventory_removed": ["key_01", "potion_02"],
        "rules_changed": [],
        "quests_updated": [],
        "relationships_changed": [],
        "memory_pins": [],
    }
    delta = WorldDelta(**delta_data)

    assert delta.inventory_removed == ["key_01", "potion_02"]

    # JSON 직렬화 확인
    json_data = delta.model_dump()
    assert json_data["inventory_removed"] == ["key_01", "potion_02"]


def test_turn_output_with_consumption():
    """아이템 소비가 포함된 전체 TurnOutput 스키마 검증."""
    output_data = {
        "language": "ko-KR",
        "narrative": "열쇠를 사용했습니다. 열쇠가 사라졌습니다.",
        "economy": {
            "cost": {"signal": 5, "memory_shard": 0},
            "balance_after": {"signal": 95, "memory_shard": 5},
        },
        "safety": {"blocked": False, "message": None},
        "ui": {"action_deck": {"cards": []}, "objects": []},
        "world": {
            "inventory_added": [],
            "inventory_removed": ["iron_key_01"],
            "rules_changed": [],
            "quests_updated": [],
            "relationships_changed": [],
            "memory_pins": [],
        },
        "render": {"image_job": None},
        "agent_console": {
            "current_phase": "commit",
            "badges": ["schema_ok"],
            "repair_count": 0,
            "model_label": "FAST",
        },
    }

    output = TurnOutput(**output_data)
    assert "iron_key_01" in output.world.inventory_removed
    assert output.narrative == "열쇠를 사용했습니다. 열쇠가 사라졌습니다."
