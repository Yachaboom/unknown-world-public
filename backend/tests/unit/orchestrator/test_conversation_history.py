"""Unit tests for ConversationHistory module (U-127)."""

from unittest.mock import patch

import pytest

from unknown_world.orchestrator.conversation_history import (
    ConversationHistory,
    build_model_content_summary,
    get_conversation_history,
    reset_all_histories,
    reset_conversation_history,
)


@pytest.fixture
def history():
    reset_all_histories()
    return ConversationHistory()


def test_add_turn_and_get_contents(history):
    """Test adding turns and retrieving them in Gemini contents format."""
    # Use valid base64 for thought signature to test decoding
    import base64

    sig_content = b"valid_signature"
    sig_b64 = base64.b64encode(sig_content).decode("utf-8")

    history.add_turn(
        user_content="Open the door", model_content="The door opens.", thought_signature=sig_b64
    )

    contents = history.get_contents()
    assert len(contents) == 2
    assert contents[0]["role"] == "user"
    assert contents[0]["parts"][0]["text"] == "Open the door"
    assert contents[1]["role"] == "model"
    assert contents[1]["parts"][0]["text"] == "The door opens."
    # Should be decoded back to bytes
    assert contents[1]["parts"][0]["thoughtSignature"] == sig_content


def test_sliding_window(history):
    """Test that old turns are removed when exceeding max turns."""
    # Mock environment variable or internal getter if possible,
    # but here we rely on the default (5) or set env var.
    # We'll use a loop to add more than default 5 turns.

    max_turns = 5
    for i in range(max_turns + 2):
        history.add_turn(f"User {i}", f"Model {i}")

    contents = history.get_contents()
    assert len(contents) == max_turns * 2  # user + model per turn

    # Should contain User 2 to User 6 (if 0-based index and total 7 items)
    # Actually if we added 0,1,2,3,4,5,6 (7 items). Last 5 are 2,3,4,5,6.
    assert contents[0]["parts"][0]["text"] == "User 2"
    assert contents[-2]["parts"][0]["text"] == "User 6"


def test_token_budget_trimming(history):
    """Test that turns are trimmed based on token budget."""
    # Mock token budget to be very small
    with patch("unknown_world.orchestrator.conversation_history._get_max_tokens", return_value=10):
        # "Long text..." is about 12 chars -> ~4 tokens per message.
        # Turn = User(4) + Model(4) = 8 tokens.
        # 2 turns = 16 tokens > 10. Should keep only 1 turn.

        history.add_turn("Long text A", "Long response A")
        history.add_turn("Long text B", "Long response B")

        contents = history.get_contents()
        assert len(contents) == 2  # Only 1 turn (user+model) left
        assert contents[0]["parts"][0]["text"] == "Long text B"


def test_build_model_content_summary():
    """Test summary builder with world delta."""
    narrative = "You found a sword."
    delta = {
        "inventory_added": [{"label": "Sword"}],
        "inventory_removed": ["Old Dagger"],
        "rules_added": ["New Rule"],
    }

    summary = build_model_content_summary(narrative, delta)
    assert "You found a sword." in summary
    assert "[상태 변화:" in summary
    assert "획득: Sword" in summary
    assert "소모: Old Dagger" in summary
    assert "규칙 추가: 1개" in summary


def test_session_management():
    """Test session isolation."""
    h1 = get_conversation_history("session1")
    h2 = get_conversation_history("session2")

    h1.add_turn("U1", "M1")

    assert h1.turn_count == 1
    assert h2.turn_count == 0

    reset_conversation_history("session1")
    assert h1.turn_count == 0


def test_thought_signature_handling(history):
    """Test handling of thought signatures."""
    # Base64 encoded string
    import base64

    sig_bytes = b"binary_signature"
    sig_b64 = base64.b64encode(sig_bytes).decode("utf-8")

    history.add_turn("U", "M", thought_signature=sig_b64)
    contents = history.get_contents()

    # Should be decoded back to bytes
    assert contents[1]["parts"][0]["thoughtSignature"] == sig_bytes

    # Non-base64 string (should fallback to string)
    history.clear()
    history.add_turn("U", "M", thought_signature="plain_string")
    contents = history.get_contents()
    assert contents[1]["parts"][0]["thoughtSignature"] == "plain_string"
