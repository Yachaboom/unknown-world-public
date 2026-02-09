"""Unknown World - 시나리오 스키마 단위 테스트.

U-025[Mvp] 리플레이 시나리오 모델의 직렬화 및 유효성 검증을 확인합니다.
"""

import pytest
from pydantic import ValidationError

from unknown_world.harness.scenario import Scenario, ScenarioStep


def test_scenario_serialization():
    """시나리오 객체의 생성 및 직렬화를 검증합니다."""
    scenario_data = {
        "name": "test_scenario",
        "description": "테스트용",
        "language": "ko-KR",
        "steps": [{"text": "주변을 본다", "action_id": "explore"}, {"text": "이동한다"}],
    }

    scenario = Scenario(**scenario_data)
    assert scenario.name == "test_scenario"
    assert len(scenario.steps) == 2
    assert scenario.steps[0].action_id == "explore"
    assert scenario.steps[1].action_id is None


def test_scenario_step_default_economy():
    """시나리오 스텝의 기본 경제 스냅샷 설정을 확인합니다."""
    step = ScenarioStep(text="테스트")
    assert step.economy_snapshot.signal == 100
    assert step.economy_snapshot.memory_shard == 5


def test_scenario_invalid_language():
    """유효하지 않은 언어 코드 입력 시 검증 실패를 확인합니다."""
    with pytest.raises(ValidationError):
        Scenario(name="bad", language="invalid-lang", steps=[])
