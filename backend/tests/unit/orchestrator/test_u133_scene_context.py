"""Unit test for U-133: Scene Context Injection.

Verifies that TurnOutputGenerator correctly includes scene_context in the prompt
and contents sent to the Gemini API.
"""

from unittest.mock import patch

import pytest

from unknown_world.models.turn import (
    ClientInfo,
    EconomySnapshot,
    Language,
    Theme,
    TurnInput,
)
from unknown_world.orchestrator.generate_turn_output import TurnOutputGenerator


@pytest.fixture
def turn_input_with_scene_context() -> TurnInput:
    """TurnInput with scene_context for the first turn."""
    return TurnInput(
        language=Language.KO,
        text="주변을 둘러본다",
        client=ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
        scene_context="먼지가 쌓인 고풍스러운 서재. 촛불이 흔들리고 있다.",
    )


def test_build_prompt_includes_scene_context(turn_input_with_scene_context):
    """Test that _build_prompt includes the scene_context string."""
    generator = TurnOutputGenerator()

    # Mock prompt loaders to avoid file system dependency
    with patch(
        "unknown_world.orchestrator.generate_turn_output.load_system_prompt",
        return_value="System Prompt",
    ), patch(
        "unknown_world.orchestrator.generate_turn_output.load_turn_instructions",
        return_value="Instructions",
    ), patch(
        "unknown_world.orchestrator.generate_turn_output.load_image_prompt",
        side_effect=FileNotFoundError,
    ):
        prompt = generator._build_prompt(turn_input_with_scene_context)

        assert "scene_context" in prompt
        assert "먼지가 쌓인 고풍스러운 서재" in prompt
        assert "촛불이 흔들리고 있다" in prompt


def test_build_contents_includes_scene_context(turn_input_with_scene_context):
    """Test that _build_contents includes the scene_context string in the user content."""
    generator = TurnOutputGenerator()

    contents = generator._build_contents(turn_input_with_scene_context)

    # User content is at the last position
    user_text = contents[-1]["parts"][0]["text"]

    assert "scene_context" in user_text
    assert "먼지가 쌓인 고풍스러운 서재" in user_text
    assert "촛불이 흔들리고 있다" in user_text


def test_build_system_instruction_not_includes_scene_context(turn_input_with_scene_context):
    """Test that _build_system_instruction does NOT include the scene_context (it should be in contents)."""
    generator = TurnOutputGenerator()

    with patch(
        "unknown_world.orchestrator.generate_turn_output.load_system_prompt",
        return_value="System Prompt",
    ), patch(
        "unknown_world.orchestrator.generate_turn_output.load_turn_instructions",
        return_value="Instructions",
    ), patch(
        "unknown_world.orchestrator.generate_turn_output.load_image_prompt",
        side_effect=FileNotFoundError,
    ):
        instruction = generator._build_system_instruction(turn_input_with_scene_context)

        assert "scene_context" not in instruction
