from unittest.mock import AsyncMock, patch

import pytest

from unknown_world.models.turn import (
    ClientInfo,
    EconomySnapshot,
    Language,
    Theme,
    TurnInput,
    TurnOutput,
)
from unknown_world.orchestrator.generate_turn_output import (
    GenerationResult,
    GenerationStatus,
)
from unknown_world.orchestrator.repair_loop import run_repair_loop


@pytest.fixture
def turn_input() -> TurnInput:
    return TurnInput(
        language=Language.KO,
        text="문을 열어본다",
        client=ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )


@pytest.fixture
def valid_turn_output_dict() -> dict:
    return {
        "language": "ko-KR",
        "narrative": "낡은 문이 열리고 먼지가 날립니다.",
        "economy": {
            "cost": {"signal": 5, "memory_shard": 0},
            "balance_after": {"signal": 95, "memory_shard": 5},
            "credit": 0,
            "low_balance_warning": False,
        },
        "safety": {"blocked": False, "message": None},
        "ui": {"action_deck": {"cards": []}, "objects": []},
        "world": {
            "rules_changed": [],
            "inventory_added": [],
            "inventory_removed": [],
            "quests_updated": [],
            "relationships_changed": [],
            "memory_pins": [],
        },
        "render": {
            "image_job": None,
            "image_url": None,
            "image_id": None,
            "generation_time_ms": None,
        },
        "agent_console": {
            "current_phase": "commit",
            "badges": ["schema_ok", "economy_ok", "safety_ok"],
            "repair_count": 0,
            "model_label": "FAST",
        },
    }


@pytest.fixture
def valid_turn_output(valid_turn_output_dict) -> TurnOutput:
    return TurnOutput.model_validate(valid_turn_output_dict)


@pytest.mark.asyncio
async def test_repair_loop_success_first_attempt(turn_input, valid_turn_output):
    with patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen:
        mock_generator = AsyncMock()
        mock_generator.generate.return_value = GenerationResult(
            status=GenerationStatus.SUCCESS,
            output=valid_turn_output,
            model_label="QUALITY",
            cost_multiplier=2.0,
        )
        mock_get_gen.return_value = mock_generator
        result = await run_repair_loop(turn_input)
        assert result.total_attempts == 1
        assert result.is_fallback is False
        assert result.is_rate_limited is False


@pytest.mark.asyncio
async def test_repair_loop_api_error_pro_to_flash_success(turn_input, valid_turn_output):
    with (
        patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen,
        patch("unknown_world.orchestrator.repair_loop.TurnOutputGenerator") as mock_flash_gen_class,
        patch("asyncio.sleep", return_value=None),
    ):
        mock_pro_generator = AsyncMock()
        mock_pro_generator.generate.return_value = GenerationResult(
            status=GenerationStatus.API_ERROR,
            error_message="Pro API Rate Limit",
            model_label="QUALITY",
        )
        mock_get_gen.return_value = mock_pro_generator

        mock_flash_generator = AsyncMock()
        mock_flash_generator.generate.return_value = GenerationResult(
            status=GenerationStatus.SUCCESS,
            output=valid_turn_output,
            model_label="FAST",
            cost_multiplier=1.0,
        )
        mock_flash_gen_class.return_value = mock_flash_generator

        result = await run_repair_loop(turn_input)
        assert result.total_attempts == 2
        assert result.is_rate_limited is False
        assert result.model_label == "FAST"


@pytest.mark.asyncio
async def test_repair_loop_rate_limited_final_failure(turn_input):
    with (
        patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen,
        patch("unknown_world.orchestrator.repair_loop.TurnOutputGenerator") as mock_flash_gen_class,
        patch("asyncio.sleep", return_value=None),
    ):
        mock_pro_generator = AsyncMock()
        mock_pro_generator.generate.return_value = GenerationResult(
            status=GenerationStatus.API_ERROR,
            error_message="Pro 429",
            model_label="QUALITY",
        )
        mock_get_gen.return_value = mock_pro_generator

        mock_flash_generator = AsyncMock()
        mock_flash_generator.generate.return_value = GenerationResult(
            status=GenerationStatus.API_ERROR, error_message="Flash 429", model_label="FAST"
        )
        mock_flash_gen_class.return_value = mock_flash_generator

        result = await run_repair_loop(turn_input)
        assert result.total_attempts == 3
        assert result.is_fallback is True
        assert result.is_rate_limited is True


@pytest.mark.asyncio
async def test_repair_loop_schema_failure_not_rate_limited(turn_input):
    with patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen:
        mock_generator = AsyncMock()
        mock_generator.generate.return_value = GenerationResult(
            status=GenerationStatus.SCHEMA_FAILURE, error_message="Invalid JSON", model_label="FAST"
        )
        mock_get_gen.return_value = mock_generator
        result = await run_repair_loop(turn_input)
        assert result.is_fallback is True
        assert result.is_rate_limited is False
