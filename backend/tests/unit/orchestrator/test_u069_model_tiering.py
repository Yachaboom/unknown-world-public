"""Unknown World - U-069 모델 티어링(FAST/QUALITY) 단위 테스트.

검증 항목:
    - 기본 모델이 FAST인지 확인
    - 특정 action_id 입력 시 QUALITY 모델로 전환되는지 확인
    - 특정 키워드 포함 시 QUALITY 모델로 전환되는지 확인
    - 모델 선택에 따른 비용 배수(cost_multiplier)가 정확히 반영되는지 확인
"""

from unittest.mock import AsyncMock, patch

import pytest

from unknown_world.config.models import ModelLabel
from unknown_world.models.turn import (
    ClientInfo,
    EconomySnapshot,
    Language,
    Theme,
    TurnInput,
)
from unknown_world.orchestrator.generate_turn_output import (
    GenerationStatus,
    TurnOutputGenerator,
)
from unknown_world.services.genai_client import GenerateResponse


@pytest.fixture
def turn_input_base() -> TurnInput:
    """기본 턴 입력 픽스처."""
    return TurnInput(
        language=Language.KO,
        text="주변을 둘러본다",
        client=ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )


def test_select_text_model_default(turn_input_base):
    """기본 입력 시 FAST 모델이 선택되는지 테스트."""
    generator = TurnOutputGenerator()
    label, multiplier = generator._select_text_model(turn_input_base)

    assert label == ModelLabel.FAST
    assert multiplier == 1.0


def test_select_text_model_by_action_id(turn_input_base):
    """QUALITY 트리거 action_id 입력 시 QUALITY 모델이 선택되는지 테스트."""
    generator = TurnOutputGenerator()

    # QUALITY 트리거 action_id 설정
    turn_input_base.action_id = "deep_investigate"
    label, multiplier = generator._select_text_model(turn_input_base)

    assert label == ModelLabel.QUALITY
    assert multiplier == 2.0


def test_select_text_model_by_keyword(turn_input_base):
    """QUALITY 트리거 키워드 포함 시 QUALITY 모델이 선택되는지 테스트."""
    generator = TurnOutputGenerator()

    # QUALITY 트리거 키워드 포함
    turn_input_base.text = "이 단서를 자세히 살펴본다"
    label, multiplier = generator._select_text_model(turn_input_base)

    assert label == ModelLabel.QUALITY
    assert multiplier == 2.0


def test_select_text_model_by_keyword_english(turn_input_base):
    """영문 QUALITY 트리거 키워드 포함 시 QUALITY 모델이 선택되는지 테스트."""
    generator = TurnOutputGenerator()

    # 영문 QUALITY 트리거 키워드 포함
    turn_input_base.text = "scrutinize the evidence"
    label, multiplier = generator._select_text_model(turn_input_base)

    assert label == ModelLabel.QUALITY
    assert multiplier == 2.0


@pytest.mark.asyncio
async def test_generate_reflects_model_tiering(turn_input_base):
    """generate 메서드 호출 시 모델 티어링이 결과에 반영되는지 테스트."""
    generator = TurnOutputGenerator(force_mock=True)
    turn_input_base.action_id = "정밀조사"  # QUALITY 트리거

    # Mock 응답
    mock_response_text = '{"language": "ko-KR", "narrative": "정밀 조사 결과입니다.", "economy": {"cost": {"signal": 10, "memory_shard": 0}, "balance_after": {"signal": 90, "memory_shard": 5}}, "safety": {"blocked": false}, "ui": {"action_deck": {"cards": []}, "objects": []}, "world": {"rules_changed": [], "inventory_added": [], "inventory_removed": [], "quests_updated": [], "memory_pins": []}, "agent_console": {"current_phase": "commit", "badges": [], "repair_count": 0, "model_label": "QUALITY"}}'
    mock_response = GenerateResponse(text=mock_response_text, model_label="QUALITY")

    with patch(
        "unknown_world.orchestrator.generate_turn_output.get_genai_client"
    ) as mock_get_client:
        mock_client = AsyncMock()
        mock_client.generate.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = await generator.generate(turn_input_base)

        assert result.status == GenerationStatus.SUCCESS
        assert result.model_label == ModelLabel.QUALITY
        assert result.cost_multiplier == 2.0

        # QUALITY 모델 ID로 호출되었는지 확인
        call_args = mock_client.generate.call_args[0][0]
        assert call_args.model_label == ModelLabel.QUALITY
