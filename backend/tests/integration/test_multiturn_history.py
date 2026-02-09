"""Integration tests for Multi-turn History (U-127)."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from unknown_world.models.turn import ClientInfo, EconomySnapshot, Language, TurnInput
from unknown_world.orchestrator.conversation_history import (
    get_conversation_history,
    reset_all_histories,
)
from unknown_world.orchestrator.generate_turn_output import GenerationStatus, generate_turn_output
from unknown_world.orchestrator.repair_loop import run_repair_loop


@pytest.fixture
def mock_genai_client():
    with patch("unknown_world.orchestrator.generate_turn_output.get_genai_client") as mock_get:
        mock_client = AsyncMock()
        mock_get.return_value = mock_client

        # Setup successful response
        mock_response = MagicMock()
        mock_response.text = '{"language": "en-US", "narrative": "Success", "ui": {}, "world": {}, "economy": {"cost": {"signal": 10, "memory_shard": 0}, "balance_after": {"signal": 90, "memory_shard": 100}}, "safety": {"blocked": false}, "agent_console": {}}'
        mock_response.thought_signature = "mock_sig"
        mock_client.generate.return_value = mock_response

        yield mock_client


@pytest.fixture
def turn_input():
    return TurnInput(
        language=Language.EN,
        text="Hello",
        action_id="test_action",
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=100),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )


@pytest.mark.asyncio
async def test_generate_turn_output_with_history(mock_genai_client, turn_input):
    """Test generation with conversation history."""
    reset_all_histories()
    history = get_conversation_history("test_session")

    # Add a previous turn
    history.add_turn("Prev User", "Prev Model", thought_signature="prev_sig")

    # Call generate
    result = await generate_turn_output(
        turn_input,
        conversation_history=history,
        force_mock=False,  # We patched the client directly
    )

    assert result.status == GenerationStatus.SUCCESS

    # Verify request arguments
    args, kwargs = mock_genai_client.generate.call_args
    request = args[0]

    # Should use contents, not prompt
    assert request.contents is not None
    assert request.prompt == ""

    # Verify contents structure
    # 0: User (Prev)
    # 1: Model (Prev)
    # 2: User (Current)
    assert len(request.contents) == 3
    assert request.contents[0]["role"] == "user"
    assert request.contents[0]["parts"][0]["text"] == "Prev User"
    assert request.contents[1]["role"] == "model"
    assert request.contents[1]["parts"][0]["text"] == "Prev Model"
    assert request.contents[1]["parts"][0]["thoughtSignature"] == "prev_sig"
    assert request.contents[2]["role"] == "user"
    # Current input is formatted with metadata
    assert "Hello" in request.contents[2]["parts"][0]["text"]

    # Verify system instruction separation
    assert request.system_instruction is not None


@pytest.mark.asyncio
async def test_repair_loop_passes_history(mock_genai_client, turn_input):
    """Test that repair loop correctly passes history to generator."""
    reset_all_histories()
    history = get_conversation_history("test_session_repair")
    history.add_turn("History Turn", "History Resp")

    # Run repair loop
    result = await run_repair_loop(turn_input, conversation_history=history, force_mock=False)

    assert result.output is not None

    # Verify call
    args, kwargs = mock_genai_client.generate.call_args
    request = args[0]

    # Should contain history
    has_history = False
    for content in request.contents:
        if content["role"] == "user" and content["parts"][0]["text"] == "History Turn":
            has_history = True
            break
    assert has_history


@pytest.mark.asyncio
async def test_thought_signature_in_result(mock_genai_client, turn_input):
    """Test that thought signature is returned in the result."""
    reset_all_histories()

    result = await generate_turn_output(turn_input)

    assert result.thought_signature == "mock_sig"
