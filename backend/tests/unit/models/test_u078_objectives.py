"""U-078 목표 시스템 강화 - Quest 모델 및 비즈니스 로직 단위 테스트."""

import pytest
from pydantic import ValidationError

from unknown_world.models.turn import Quest, TurnOutput, WorldDelta


def test_quest_model_u078_fields():
    """Quest 모델의 U-078 신규 필드 검증."""
    data = {
        "id": "main_01",
        "label": "주 목표",
        "description": "상세 설명",
        "is_main": True,
        "progress": 50,
        "reward_signal": 100,
    }
    quest = Quest(**data)
    assert quest.id == "main_01"
    assert quest.is_main is True
    assert quest.progress == 50
    assert quest.reward_signal == 100
    assert quest.is_completed is False


def test_quest_progress_range():
    """진행률(progress) 범위 검증 (0~100)."""
    # 0 OK
    Quest(id="q", label="l", progress=0)
    # 100 OK
    Quest(id="q", label="l", progress=100)

    # -1 Fail
    with pytest.raises(ValidationError):
        Quest(id="q", label="l", progress=-1)

    # 101 Fail
    with pytest.raises(ValidationError):
        Quest(id="q", label="l", progress=101)


def test_quest_reward_signal_non_negative():
    """보상(reward_signal) 0 이상 검증."""
    Quest(id="q", label="l", reward_signal=0)
    Quest(id="q", label="l", reward_signal=100)

    with pytest.raises(ValidationError):
        Quest(id="q", label="l", reward_signal=-1)


def test_world_delta_quests_updated_limit():
    """WorldDelta의 quests_updated 최대 크기 제한 검증 (max_length=3)."""
    quests = [Quest(id=f"q{i}", label=f"l{i}") for i in range(3)]
    # 3개 OK
    WorldDelta(quests_updated=quests)

    # 4개 Fail
    with pytest.raises(ValidationError):
        WorldDelta(quests_updated=quests + [Quest(id="q4", label="l4")])


def test_turn_output_with_u078_objectives():
    """TurnOutput에 포함된 U-078 목표 데이터 검증."""
    data = {
        "language": "ko-KR",
        "narrative": "목표가 업데이트되었습니다.",
        "economy": {
            "cost": {"signal": 0, "memory_shard": 0},
            "balance_after": {"signal": 100, "memory_shard": 5},
        },
        "safety": {"blocked": False},
        "world": {
            "quests_updated": [
                {
                    "id": "main",
                    "label": "주 목표",
                    "is_main": True,
                    "progress": 25,
                    "reward_signal": 50,
                },
                {"id": "sub", "label": "서브 목표", "is_completed": True, "reward_signal": 10},
            ]
        },
    }
    output = TurnOutput(**data)
    quests = output.world.quests_updated
    assert len(quests) == 2
    assert quests[0].is_main is True
    assert quests[1].is_completed is True
    assert quests[1].reward_signal == 10
