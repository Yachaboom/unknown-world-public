"""U-136[Mvp]: Economy gains 필드 + ModelLabel SSOT 통합 검증 테스트.

검증 범위:
    - EconomyOutput.gains 필드 존재 및 기본값
    - _validate_economy() gains 반영 공식 (balance_after = max(0, snapshot - cost + gains))
    - gains 상한 초과 시 검증 실패 (MAX_SINGLE_TURN_REWARD_SIGNAL=30, MEMORY_SHARD=10)
    - gains + cost + credit 복합 시나리오
    - ModelLabel SSOT 통합 (config/models.py → turn.py re-export)
    - Pydantic 직렬화 일관성 (PydanticSerializationUnexpectedValue 해소)

참조:
    - vibe/unit-plans/U-136[Mvp].md
    - backend/src/unknown_world/validation/business_rules.py
    - backend/src/unknown_world/models/turn.py
    - backend/src/unknown_world/config/models.py
    - backend/src/unknown_world/config/economy.py
"""

from unknown_world.config.economy import (
    MAX_SINGLE_TURN_REWARD_MEMORY_SHARD,
    MAX_SINGLE_TURN_REWARD_SIGNAL,
)
from unknown_world.config.models import ModelLabel as ConfigModelLabel
from unknown_world.models.turn import (
    AgentConsole,
    ClientInfo,
    CurrencyAmount,
    EconomyOutput,
    EconomySnapshot,
    ImageJob,
    Language,
    SafetyOutput,
    TurnInput,
    TurnOutput,
)
from unknown_world.models.turn import (
    ModelLabel as TurnModelLabel,
)
from unknown_world.validation.business_rules import validate_business_rules

# =============================================================================
# 헬퍼: 공통 TurnInput/TurnOutput 생성
# =============================================================================


def _make_turn_input(
    signal: int = 100,
    memory_shard: int = 5,
    language: Language = Language.KO,
) -> TurnInput:
    """테스트용 TurnInput 팩토리."""
    return TurnInput(
        language=language,
        text="테스트",
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=signal, memory_shard=memory_shard),
    )


def _make_turn_output(
    cost_signal: int = 0,
    cost_shard: int = 0,
    gains_signal: int = 0,
    gains_shard: int = 0,
    balance_signal: int = 100,
    balance_shard: int = 5,
    credit: int = 0,
    language: Language = Language.KO,
) -> TurnOutput:
    """테스트용 TurnOutput 팩토리."""
    return TurnOutput(
        language=language,
        narrative="결과",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=cost_signal, memory_shard=cost_shard),
            gains=CurrencyAmount(signal=gains_signal, memory_shard=gains_shard),
            balance_after=CurrencyAmount(signal=balance_signal, memory_shard=balance_shard),
            credit=credit,
        ),
        safety=SafetyOutput(blocked=False),
    )


# =============================================================================
# 1. EconomyOutput.gains 필드 테스트
# =============================================================================


class TestEconomyOutputGainsField:
    """EconomyOutput에 gains 필드가 올바르게 추가되었는지 검증."""

    def test_gains_field_exists_with_default(self):
        """gains 필드가 기본값 {signal: 0, memory_shard: 0}으로 존재."""
        economy = EconomyOutput(
            cost=CurrencyAmount(signal=5, memory_shard=0),
            balance_after=CurrencyAmount(signal=95, memory_shard=5),
        )
        assert economy.gains.signal == 0
        assert economy.gains.memory_shard == 0

    def test_gains_field_explicit_values(self):
        """gains 필드에 명시적 값을 설정 가능."""
        economy = EconomyOutput(
            cost=CurrencyAmount(signal=0, memory_shard=0),
            gains=CurrencyAmount(signal=10, memory_shard=2),
            balance_after=CurrencyAmount(signal=110, memory_shard=7),
        )
        assert economy.gains.signal == 10
        assert economy.gains.memory_shard == 2

    def test_gains_serialization_round_trip(self):
        """gains 필드가 JSON 직렬화/역직렬화에서 유지."""
        economy = EconomyOutput(
            cost=CurrencyAmount(signal=3, memory_shard=1),
            gains=CurrencyAmount(signal=15, memory_shard=3),
            balance_after=CurrencyAmount(signal=112, memory_shard=7),
        )
        json_data = economy.model_dump()
        restored = EconomyOutput.model_validate(json_data)
        assert restored.gains.signal == 15
        assert restored.gains.memory_shard == 3

    def test_gains_in_turn_output_json_schema(self):
        """TurnOutput JSON Schema에 gains 필드가 포함."""
        schema = TurnOutput.model_json_schema()
        economy_ref = schema["$defs"]["EconomyOutput"]["properties"]
        assert "gains" in economy_ref

    def test_backward_compatibility_without_gains(self):
        """gains 필드가 없는 데이터에서도 기본값으로 파싱 가능 (하위호환)."""
        data = {
            "cost": {"signal": 5, "memory_shard": 0},
            "balance_after": {"signal": 95, "memory_shard": 5},
        }
        economy = EconomyOutput.model_validate(data)
        assert economy.gains.signal == 0
        assert economy.gains.memory_shard == 0


# =============================================================================
# 2. Economy 검증 공식 테스트 (gains 반영)
# =============================================================================


class TestEconomyValidationWithGains:
    """_validate_economy() 함수가 gains를 올바르게 반영하는지 검증.

    공식: balance_after = max(0, snapshot - cost + gains)
    """

    def test_scenario1_zero_cost_positive_gains(self):
        """시나리오 1: 비용 0 + 보상 5 → balance_after = snapshot + 5."""
        turn_input = _make_turn_input(signal=16, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=0,
            gains_signal=5,
            balance_signal=21,  # 16 - 0 + 5
            balance_shard=5,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_scenario2_cost_and_gains(self):
        """시나리오 2: 비용 3 + 보상 10 → balance_after = snapshot - 3 + 10."""
        turn_input = _make_turn_input(signal=20, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=3,
            gains_signal=10,
            balance_signal=27,  # 20 - 3 + 10
            balance_shard=5,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_scenario3_cost_only_no_gains(self):
        """시나리오 3: 비용 5 + 보상 0 → balance_after = snapshot - 5 (기존 동작 유지)."""
        turn_input = _make_turn_input(signal=100, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=5,
            gains_signal=0,
            balance_signal=95,  # 100 - 5 + 0
            balance_shard=5,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_gains_with_memory_shard(self):
        """Memory Shard에서도 gains가 올바르게 반영."""
        turn_input = _make_turn_input(signal=50, memory_shard=10)
        turn_output = _make_turn_output(
            cost_signal=5,
            cost_shard=2,
            gains_signal=3,
            gains_shard=5,
            balance_signal=48,  # 50 - 5 + 3
            balance_shard=13,  # 10 - 2 + 5
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_balance_mismatch_with_gains_fails(self):
        """gains를 무시한 잘못된 balance_after는 검증 실패."""
        turn_input = _make_turn_input(signal=20, memory_shard=5)
        # balance_after가 gains를 무시하고 계산한 경우 (잘못된 값)
        turn_output = _make_turn_output(
            cost_signal=0,
            gains_signal=5,
            balance_signal=20,  # 올바른 값은 25 (20 - 0 + 5)
            balance_shard=5,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is False
        assert any("economy_cost_mismatch" in err["type"] for err in result.errors)

    def test_gains_reduce_credit_need(self):
        """보상이 있으면 크레딧(빚) 필요량이 줄어듦.

        snapshot=5, cost=15, gains=8
        → effective cost = 15 - 8 = 7
        → balance_after = max(0, 5 - 15 + 8) = 0
        → credit = max(0, 15 - 5 - 8) = 2
        """
        turn_input = _make_turn_input(signal=5, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=15,
            gains_signal=8,
            balance_signal=0,  # max(0, 5 - 15 + 8) = 0
            balance_shard=5,
            credit=2,  # max(0, 15 - 5 - 8) = 2
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_gains_fully_cover_cost(self):
        """보상이 비용을 완전히 충당하면 크레딧 0.

        snapshot=5, cost=10, gains=10
        → balance_after = max(0, 5 - 10 + 10) = 5
        → credit = max(0, 10 - 5 - 10) = 0
        """
        turn_input = _make_turn_input(signal=5, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=10,
            gains_signal=10,
            balance_signal=5,  # max(0, 5 - 10 + 10) = 5
            balance_shard=5,
            credit=0,  # max(0, 10 - 5 - 10) = 0 (음수 → 0)
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"


# =============================================================================
# 3. gains 상한 검증 테스트
# =============================================================================


class TestGainsCap:
    """gains 상한 초과 시 검증 실패 (인플레이션 방지)."""

    def test_signal_gains_at_cap_passes(self):
        """Signal 보상이 상한(30)과 같으면 통과."""
        turn_input = _make_turn_input(signal=50, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=0,
            gains_signal=MAX_SINGLE_TURN_REWARD_SIGNAL,  # 30
            balance_signal=80,  # 50 + 30
            balance_shard=5,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_signal_gains_exceeds_cap_fails(self):
        """Signal 보상이 상한(30) 초과 시 실패."""
        turn_input = _make_turn_input(signal=50, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=0,
            gains_signal=MAX_SINGLE_TURN_REWARD_SIGNAL + 1,  # 31
            balance_signal=81,  # 50 + 31 (잘못된 보상이지만 consistency는 맞음)
            balance_shard=5,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is False
        assert any("economy_cost_mismatch" in err["type"] for err in result.errors)

    def test_memory_shard_gains_at_cap_passes(self):
        """Memory Shard 보상이 상한(10)과 같으면 통과."""
        turn_input = _make_turn_input(signal=50, memory_shard=5)
        turn_output = _make_turn_output(
            gains_shard=MAX_SINGLE_TURN_REWARD_MEMORY_SHARD,  # 10
            balance_signal=50,
            balance_shard=15,  # 5 + 10
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_memory_shard_gains_exceeds_cap_fails(self):
        """Memory Shard 보상이 상한(10) 초과 시 실패."""
        turn_input = _make_turn_input(signal=50, memory_shard=5)
        turn_output = _make_turn_output(
            gains_shard=MAX_SINGLE_TURN_REWARD_MEMORY_SHARD + 1,  # 11
            balance_signal=50,
            balance_shard=16,  # 5 + 11
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is False
        assert any("economy_cost_mismatch" in err["type"] for err in result.errors)

    def test_both_gains_within_cap_passes(self):
        """Signal과 Memory Shard 보상이 모두 상한 이내면 통과."""
        turn_input = _make_turn_input(signal=50, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=5,
            cost_shard=1,
            gains_signal=20,
            gains_shard=8,
            balance_signal=65,  # 50 - 5 + 20
            balance_shard=12,  # 5 - 1 + 8
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_gains_cap_constants_match_plan(self):
        """상한 상수가 유닛 계획서와 일치하는지 확인 (Q1 결정: 30 Signal)."""
        assert MAX_SINGLE_TURN_REWARD_SIGNAL == 30
        assert MAX_SINGLE_TURN_REWARD_MEMORY_SHARD == 10


# =============================================================================
# 4. ModelLabel SSOT 통합 테스트
# =============================================================================


class TestModelLabelSSOT:
    """ModelLabel enum이 config/models.py로 SSOT 통합되었는지 검증."""

    def test_ssot_identity(self):
        """config/models.py와 turn.py의 ModelLabel이 동일 클래스."""
        assert ConfigModelLabel is TurnModelLabel

    def test_all_values_present(self):
        """통합된 ModelLabel에 모든 기대 값이 존재."""
        expected = {"FAST", "QUALITY", "CHEAP", "REF", "IMAGE", "IMAGE_FAST", "VISION"}
        actual = {m.value for m in ConfigModelLabel}
        assert expected == actual

    def test_strenum_type(self):
        """ModelLabel이 StrEnum 타입 (Pydantic 직렬화 호환)."""
        from enum import StrEnum

        assert issubclass(ConfigModelLabel, StrEnum)

    def test_pydantic_serialization_no_warning(self):
        """ModelLabel 직렬화 시 PydanticSerializationUnexpectedValue 경고 없음."""
        import warnings

        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")

            # AgentConsole에 config/models.py의 ModelLabel 값 사용
            console = AgentConsole(model_label=ConfigModelLabel.FAST)
            json_data = console.model_dump()
            _ = AgentConsole.model_validate(json_data)

            pydantic_warnings = [
                warning
                for warning in w
                if "PydanticSerializationUnexpectedValue" in str(warning.message)
            ]
            assert len(pydantic_warnings) == 0, f"Pydantic warnings: {pydantic_warnings}"

    def test_image_job_accepts_all_model_labels(self):
        """ImageJob이 모든 ModelLabel 값을 수용."""
        for label in ConfigModelLabel:
            job = ImageJob(should_generate=True, prompt="test", model_label=label)
            assert job.model_label == label

    def test_model_label_json_round_trip(self):
        """ModelLabel이 JSON 직렬화/역직렬화에서 값 유지."""
        console = AgentConsole(model_label=ConfigModelLabel.IMAGE)
        json_str = console.model_dump_json()
        restored = AgentConsole.model_validate_json(json_str)
        assert restored.model_label == ConfigModelLabel.IMAGE
        assert restored.model_label.value == "IMAGE"


# =============================================================================
# 5. 복합 시나리오 (gains + credit + low_balance)
# =============================================================================


class TestComplexEconomyScenarios:
    """gains, credit, low_balance_warning 복합 시나리오."""

    def test_quest_reward_with_cost(self):
        """퀘스트 완료 보상 + 행동 비용이 동시에 발생하는 시나리오.

        snapshot=30, cost=8, gains(보상)=15
        → balance_after = max(0, 30 - 8 + 15) = 37
        → credit = 0 (비용이 snapshot+gains 이내)
        """
        turn_input = _make_turn_input(signal=30, memory_shard=3)
        turn_output = _make_turn_output(
            cost_signal=8,
            cost_shard=1,
            gains_signal=15,
            gains_shard=2,
            balance_signal=37,  # 30 - 8 + 15
            balance_shard=4,  # 3 - 1 + 2
            credit=0,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_gains_with_credit_and_low_balance(self):
        """잔액 부족 + 보상 + 크레딧 복합.

        snapshot=3, cost=20, gains=5
        → balance_after = max(0, 3 - 20 + 5) = 0 (음수 → 0)
        → credit = max(0, 20 - 3 - 5) = 12
        """
        turn_input = _make_turn_input(signal=3, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=20,
            gains_signal=5,
            balance_signal=0,
            balance_shard=5,
            credit=12,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_zero_cost_zero_gains(self):
        """비용 0, 보상 0 — 기존 동작 변화 없음."""
        turn_input = _make_turn_input(signal=50, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=0,
            gains_signal=0,
            balance_signal=50,
            balance_shard=5,
            credit=0,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_english_error_message_for_gains_exceeded(self):
        """영어 모드에서 gains 상한 초과 에러 메시지 확인."""
        turn_input = _make_turn_input(signal=50, memory_shard=5, language=Language.EN)
        turn_output = _make_turn_output(
            gains_signal=31,
            balance_signal=81,
            balance_shard=5,
            language=Language.EN,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is False
        assert any("gains exceed per-turn cap" in err["message"].lower() for err in result.errors)


# =============================================================================
# 6. 기존 U-079 호환성 테스트 (회귀 방지)
# =============================================================================


class TestU079Compatibility:
    """U-079(크레딧) 기능이 gains 추가 후에도 정상 동작하는지 검증."""

    def test_credit_without_gains(self):
        """gains=0일 때 기존 크레딧 로직 정상 동작.

        snapshot=5, cost=10, gains=0
        → balance_after = max(0, 5 - 10 + 0) = 0
        → credit = max(0, 10 - 5 - 0) = 5
        """
        turn_input = _make_turn_input(signal=5, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=10,
            gains_signal=0,
            balance_signal=0,
            balance_shard=5,
            credit=5,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is True, f"Errors: {result.errors}"

    def test_max_credit_enforcement_with_gains(self):
        """gains가 있어도 MAX_CREDIT(50) 초과 비용은 거부.

        snapshot=5, cost=60, gains=3
        → effective_signal = 5 + 50(MAX_CREDIT) = 55
        → 55 < 60 → 검증 실패
        """
        turn_input = _make_turn_input(signal=5, memory_shard=5)
        turn_output = _make_turn_output(
            cost_signal=60,
            gains_signal=3,
            balance_signal=0,
            balance_shard=5,
            credit=52,
        )
        result = validate_business_rules(turn_input, turn_output)
        assert result.is_valid is False
        assert any("economy_negative_balance" in err["type"] for err in result.errors)
