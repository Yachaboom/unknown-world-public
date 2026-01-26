"""U-043: 언어 혼합 검증 및 Repair 루프 단위 테스트."""

from unittest.mock import AsyncMock, patch

import pytest

from unknown_world.models.turn import (
    ActionCard,
    ActionDeck,
    AgentConsole,
    ClientInfo,
    CurrencyAmount,
    EconomyOutput,
    EconomySnapshot,
    Language,
    RenderOutput,
    SafetyOutput,
    TurnInput,
    TurnOutput,
    UIOutput,
    ValidationBadge,
    WorldDelta,
)
from unknown_world.orchestrator.generate_turn_output import GenerationResult, GenerationStatus
from unknown_world.orchestrator.repair_loop import run_repair_loop
from unknown_world.validation.business_rules import BusinessRuleError, validate_business_rules
from unknown_world.validation.language_gate import (
    measure_language_ratio,
    validate_language_consistency,
)


@pytest.fixture
def sample_turn_input() -> TurnInput:
    return TurnInput(
        language=Language.KO,
        text="테스트 입력",
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )


@pytest.fixture
def base_turn_output(sample_turn_input: TurnInput) -> TurnOutput:
    return TurnOutput(
        language=Language.KO,
        narrative="정상적인 한국어 내러티브입니다.",
        ui=UIOutput(
            action_deck=ActionDeck(
                cards=[
                    ActionCard(
                        id="test",
                        label="테스트 카드",
                        cost=CurrencyAmount(signal=10, memory_shard=0),
                    )
                ]
            ),
            objects=[],
        ),
        world=WorldDelta(),
        render=RenderOutput(image_job=None),
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=10, memory_shard=0),
            balance_after=CurrencyAmount(signal=90, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
        agent_console=AgentConsole(repair_count=0),
    )


def test_measure_language_ratio_ko():
    """한국어 텍스트의 언어 비율 측정 테스트."""
    text = "안녕하세요. 이것은 테스트입니다."
    ratio = measure_language_ratio(text)
    assert ratio.hangul_ratio > 0.8
    assert ratio.latin_ratio < 0.2


def test_measure_language_ratio_en():
    """영어 텍스트의 언어 비율 측정 테스트."""
    text = "Hello. This is a test."
    ratio = measure_language_ratio(text)
    assert ratio.latin_ratio > 0.8
    assert ratio.hangul_ratio == 0.0


def test_measure_language_ratio_mixed():
    """혼합된 텍스트의 언어 비율 측정 테스트."""
    text = "안녕하세요. This is a mixed text."
    ratio = measure_language_ratio(text)
    assert ratio.hangul_count > 0
    assert ratio.latin_count > 0


def test_measure_language_ratio_whitelist():
    """화이트리스트 단어가 비율 측정에서 제외되는지 테스트."""
    # "Signal"은 화이트리스트에 있으므로 라틴 카운트에서 제외되어야 함
    text = "Signal이 감지되었습니다."
    ratio = measure_language_ratio(text)
    # "이 감지되었습니다" (한글 7자 + 공백 1자) -> 한글 7
    # "signal" 제거됨. "i" 남음?
    # re.sub(rf"(?<![a-zA-Z]){re.escape(term)}(?![a-zA-Z])", "", ...)
    # "signal" -> ""
    # "이 감지되었습니다." 만 남음
    assert ratio.latin_count == 0
    assert ratio.hangul_count > 0


def test_validate_language_consistency_mixed_ko(base_turn_output):
    """한국어 요청에 영어가 섞인 경우 검증 테스트."""
    # 1. narrative
    mixed_output = base_turn_output.model_copy(deep=True)
    mixed_output.narrative = "이것은 한국어인데 Suddenly English appeared."
    result = validate_language_consistency(mixed_output, Language.KO)
    assert result.is_valid is False
    assert any(v["field"] == "narrative" for v in result.violations)

    # 2. action_deck.cards[0].label
    mixed_output = base_turn_output.model_copy(deep=True)
    mixed_output.ui.action_deck.cards[0].label = "Mixed Label 영어"
    result = validate_language_consistency(mixed_output, Language.KO)
    assert result.is_valid is False
    assert any(v["field"] == "ui.action_deck.cards[0].label" for v in result.violations)

    # 3. safety.message
    mixed_output = base_turn_output.model_copy(deep=True)
    mixed_output.safety.message = "This is a blocked message in English."
    result = validate_language_consistency(mixed_output, Language.KO)
    assert result.is_valid is False
    assert any(v["field"] == "safety.message" for v in result.violations)


def test_validate_language_consistency_en_with_ko(base_turn_output):
    """영어 요청에 한국어가 섞인 경우 검증 테스트."""
    en_input_lang = Language.EN
    en_output = base_turn_output.model_copy(deep=True)
    en_output.language = Language.EN
    en_output.narrative = "This is English but 한국어가 섞임."

    result = validate_language_consistency(en_output, en_input_lang)
    assert result.is_valid is False
    assert any(v["field"] == "narrative" for v in result.violations)


def test_build_language_error_summary_ko(base_turn_output):
    """한국어 에러 요약 생성 테스트."""
    from unknown_world.validation.language_gate import build_language_error_summary

    mixed_output = base_turn_output.model_copy(deep=True)
    mixed_output.narrative = "Mixed English."
    result = validate_language_consistency(mixed_output, Language.KO)

    summary = build_language_error_summary(result)
    assert "언어 혼합이 감지되었습니다" in summary
    assert "narrative" in summary
    assert "한국어(ko-KR)로 다시 작성하세요" in summary


def test_validate_business_rules_language_content_mixed(sample_turn_input, base_turn_output):
    """비즈니스 룰 검증에서 언어 혼합 감지 테스트."""
    mixed_output = base_turn_output.model_copy(deep=True)
    mixed_output.narrative = "한국어와 English가 섞여 있습니다. This should fail."

    result = validate_business_rules(sample_turn_input, mixed_output)
    assert result.is_valid is False
    assert any(err["type"] == BusinessRuleError.LANGUAGE_CONTENT_MIXED for err in result.errors)


@pytest.mark.asyncio
async def test_repair_loop_fixes_language_mixing(sample_turn_input, base_turn_output):
    """언어 혼합 시 Repair 루프가 작동하여 수정되는지 테스트."""
    mixed_output = base_turn_output.model_copy(deep=True)
    mixed_output.narrative = "혼합된 언어 English Mixed."

    valid_output = base_turn_output.model_copy(deep=True)
    valid_output.narrative = "수정된 한국어 내러티브"

    with patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen:
        mock_gen = mock_get_gen.return_value
        # 첫 번째는 혼합 출력, 두 번째는 정상 출력 반환
        mock_gen.generate = AsyncMock(
            side_effect=[
                GenerationResult(status=GenerationStatus.SUCCESS, output=mixed_output),
                GenerationResult(status=GenerationStatus.SUCCESS, output=valid_output),
            ]
        )

        result = await run_repair_loop(sample_turn_input)

        assert result.repair_attempts == 1
        assert result.output.narrative == "수정된 한국어 내러티브"
        assert ValidationBadge.CONSISTENCY_OK in result.badges
        assert ValidationBadge.CONSISTENCY_FAIL not in result.badges  # 최종 배지는 OK여야 함
