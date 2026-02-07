"""U-018: Repair Loop 및 비즈니스 룰 검증 단위 테스트."""

from unittest.mock import AsyncMock, patch

import pytest

from unknown_world.models.turn import (
    ActionDeck,
    AgentConsole,
    AgentPhase,
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
from unknown_world.orchestrator.repair_loop import MAX_REPAIR_ATTEMPTS, run_repair_loop
from unknown_world.validation.business_rules import validate_business_rules


@pytest.fixture
def sample_turn_input() -> TurnInput:
    return TurnInput(
        language=Language.KO,
        text="테스트 입력",
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )


@pytest.fixture
def valid_turn_output(sample_turn_input: TurnInput) -> TurnOutput:
    return TurnOutput(
        language=Language.KO,
        narrative="성공적인 내러티브",
        ui=UIOutput(action_deck=ActionDeck(cards=[]), objects=[]),
        world=WorldDelta(),
        render=RenderOutput(image_job=None),
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=10, memory_shard=1),
            balance_after=CurrencyAmount(signal=90, memory_shard=4),
        ),
        safety=SafetyOutput(blocked=False),
        agent_console=AgentConsole(
            current_phase=AgentPhase.COMMIT,
            badges=[ValidationBadge.SCHEMA_OK],
            repair_count=0,
        ),
    )


@pytest.mark.asyncio
async def test_repair_loop_success_first_time(
    sample_turn_input: TurnInput, valid_turn_output: TurnOutput
) -> None:
    """초기 시도에 바로 성공하는 케이스."""
    with patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen:
        mock_gen = mock_get_gen.return_value
        mock_gen.generate = AsyncMock(
            return_value=GenerationResult(status=GenerationStatus.SUCCESS, output=valid_turn_output)
        )

        result = await run_repair_loop(sample_turn_input)

        assert result.is_fallback is False
        assert result.repair_attempts == 0
        assert result.output.narrative == valid_turn_output.narrative
        assert ValidationBadge.SCHEMA_OK in result.badges


@pytest.mark.asyncio
async def test_repair_loop_schema_failure_then_success(
    sample_turn_input: TurnInput, valid_turn_output: TurnOutput
) -> None:
    """스키마 실패 후 두 번째 시도에 성공하는 케이스."""
    with patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen:
        mock_gen = mock_get_gen.return_value
        # 첫 번째는 실패, 두 번째는 성공
        mock_gen.generate = AsyncMock(
            side_effect=[
                GenerationResult(
                    status=GenerationStatus.SCHEMA_FAILURE, error_message="Invalid JSON"
                ),
                GenerationResult(status=GenerationStatus.SUCCESS, output=valid_turn_output),
            ]
        )

        result = await run_repair_loop(sample_turn_input)

        assert result.is_fallback is False
        assert result.repair_attempts == 1
        assert ValidationBadge.SCHEMA_FAIL not in result.badges
        assert ValidationBadge.SCHEMA_OK in result.badges


@pytest.mark.asyncio
async def test_repair_loop_business_failure_then_success(
    sample_turn_input: TurnInput, valid_turn_output: TurnOutput
) -> None:
    """비즈니스 룰(언어 불일치) 실패 후 두 번째 시도에 성공하는 케이스."""
    invalid_lang_output = valid_turn_output.model_copy(deep=True)
    invalid_lang_output.language = Language.EN  # KO 입력에 EN 출력 (위반)

    with patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen:
        mock_gen = mock_get_gen.return_value
        mock_gen.generate = AsyncMock(
            side_effect=[
                GenerationResult(status=GenerationStatus.SUCCESS, output=invalid_lang_output),
                GenerationResult(status=GenerationStatus.SUCCESS, output=valid_turn_output),
            ]
        )

        result = await run_repair_loop(sample_turn_input)

        assert result.is_fallback is False
        assert result.repair_attempts == 1
        # 첫 시도에서 SCHEMA_OK는 받았지만 비즈니스 룰에서 걸려야 함
        assert result.repair_attempts == 1


@pytest.mark.asyncio
async def test_repair_loop_max_attempts_fallback(sample_turn_input: TurnInput) -> None:
    """모든 시도가 실패하여 폴백이 반환되는 케이스."""
    with patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen:
        mock_gen = mock_get_gen.return_value
        # 계속 스키마 실패
        mock_gen.generate = AsyncMock(
            return_value=GenerationResult(
                status=GenerationStatus.SCHEMA_FAILURE, error_message="Constant failure"
            )
        )

        result = await run_repair_loop(sample_turn_input)

        assert result.is_fallback is True
        assert result.repair_attempts == MAX_REPAIR_ATTEMPTS
        assert ValidationBadge.SCHEMA_FAIL in result.badges
        # 폴백 내러티브 확인
        assert "혼란스러운 순간" in result.output.narrative


@pytest.mark.asyncio
async def test_repair_loop_safety_blocked_immediate_fallback(sample_turn_input: TurnInput) -> None:
    """안전 차단 시 즉시 폴백되는 케이스."""
    with patch("unknown_world.orchestrator.repair_loop.get_turn_output_generator") as mock_get_gen:
        mock_gen = mock_get_gen.return_value
        mock_gen.generate = AsyncMock(
            return_value=GenerationResult(
                status=GenerationStatus.SAFETY_BLOCKED, error_message="Safety block"
            )
        )

        result = await run_repair_loop(sample_turn_input)

        assert result.is_fallback is True
        assert result.repair_attempts == 0  # 즉시 중단
        assert ValidationBadge.SAFETY_BLOCKED in result.badges
        assert result.output.safety.blocked is True


@pytest.mark.asyncio
async def test_validate_economy_negative_attempt(sample_turn_input: TurnInput) -> None:
    """재화가 부족한데 비용을 청구하여 음수 잔액을 만들려고 시도하는 경우."""
    # snapshot: signal=100
    # cost: signal=120
    # balance_after: signal=-20 (위반)

    invalid_output = TurnOutput(
        language=Language.KO,
        narrative="비싼 행동",
        ui=UIOutput(action_deck=ActionDeck(cards=[]), objects=[]),
        world=WorldDelta(),
        render=RenderOutput(image_job=None),
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=120, memory_shard=0),
            balance_after=CurrencyAmount(
                signal=0, memory_shard=5
            ),  # 0으로 억지 보정 또는 음수 필드 오류
        ),
        safety=SafetyOutput(blocked=False),
        agent_console=AgentConsole(repair_count=0),
    )

    result = validate_business_rules(sample_turn_input, invalid_output)

    assert result.is_valid is False
    # Signal 잔액 불일치 또는 Credit 불일치 감지
    assert any(
        "signal" in err["message"].lower() or "credit" in err["message"].lower()
        for err in result.errors
    )


@pytest.mark.asyncio
async def test_validate_economy_allow_credit(sample_turn_input: TurnInput) -> None:
    """잔액보다 높은 비용이지만 크레딧 한도 내인 경우 허용 확인 (U-079)."""
    # snapshot: signal=100
    # cost: signal=130 (빚 30 필요)
    # MAX_CREDIT = 50 이므로 통과해야 함

    valid_credit_output = TurnOutput(
        language=Language.KO,
        narrative="크레딧 사용",
        ui=UIOutput(action_deck=ActionDeck(cards=[]), objects=[]),
        world=WorldDelta(),
        render=RenderOutput(image_job=None),
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=130, memory_shard=0),
            balance_after=CurrencyAmount(signal=0, memory_shard=5),
            credit=30,  # 빚 30 명시
            low_balance_warning=True,
        ),
        safety=SafetyOutput(blocked=False),
        agent_console=AgentConsole(repair_count=0),
    )

    result = validate_business_rules(sample_turn_input, valid_credit_output)

    assert result.is_valid is True
    assert not result.errors
