"""Unknown World - MockOrchestrator 단위 테스트.

U-048[Mvp] 완료 기준 검증:
    - action_id 입력 시 "말했습니다" 대신 행동 로그 프리픽스 적용
    - click 입력 시 조사/탐색 행동 로그 프리픽스 적용
    - drop 입력 시 사용/조합 행동 로그 프리픽스 적용
    - free text 입력 시 입력/명령 행동 로그 프리픽스 적용 (Q1: Option B)
    - per-turn 결정적 RNG로 다양성 확보 (다른 입력 → 다른 결과)
    - 동일 입력 → 동일 결과 (재현성 유지)

참조:
    - vibe/unit-plans/U-048[Mvp].md
    - vibe/unit-runbooks/U-048-mock-narrative-improvement-runbook.md
"""

import random

import pytest

from unknown_world.models.turn import (
    Box2D,
    ClickInput,
    ClientInfo,
    DropInput,
    EconomySnapshot,
    Language,
    Theme,
    TurnInput,
    TurnOutput,
)
from unknown_world.orchestrator.mock import (
    EN_ACTION_LOG_PREFIXES,
    KO_ACTION_LOG_PREFIXES,
    InputType,
    MockOrchestrator,
    _compute_turn_seed,
    _detect_input_type,
    _format_action_log_prefix,
)

# =============================================================================
# 픽스처
# =============================================================================


@pytest.fixture
def base_client_info() -> ClientInfo:
    """기본 클라이언트 정보 픽스처."""
    return ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK)


@pytest.fixture
def base_economy_snapshot() -> EconomySnapshot:
    """기본 경제 스냅샷 픽스처."""
    return EconomySnapshot(signal=100, memory_shard=5)


@pytest.fixture
def ko_action_input(base_client_info, base_economy_snapshot) -> TurnInput:
    """한국어 액션 카드 입력 픽스처."""
    return TurnInput(
        language=Language.KO,
        text="문을 열어본다",
        action_id="action_1",
        client=base_client_info,
        economy_snapshot=base_economy_snapshot,
    )


@pytest.fixture
def ko_click_input(base_client_info, base_economy_snapshot) -> TurnInput:
    """한국어 클릭 입력 픽스처."""
    return TurnInput(
        language=Language.KO,
        click=ClickInput(object_id="obj_door"),
        client=base_client_info,
        economy_snapshot=base_economy_snapshot,
    )


@pytest.fixture
def ko_drop_input(base_client_info, base_economy_snapshot) -> TurnInput:
    """한국어 드롭 입력 픽스처."""
    return TurnInput(
        language=Language.KO,
        drop=DropInput(
            item_id="key_001",
            target_object_id="obj_lock",
            target_box_2d=Box2D(ymin=100, xmin=200, ymax=300, xmax=400),
        ),
        client=base_client_info,
        economy_snapshot=base_economy_snapshot,
    )


@pytest.fixture
def ko_free_text_input(base_client_info, base_economy_snapshot) -> TurnInput:
    """한국어 자유 텍스트 입력 픽스처."""
    return TurnInput(
        language=Language.KO,
        text="주변을 살펴본다",
        client=base_client_info,
        economy_snapshot=base_economy_snapshot,
    )


@pytest.fixture
def en_action_input(base_client_info, base_economy_snapshot) -> TurnInput:
    """영어 액션 카드 입력 픽스처."""
    return TurnInput(
        language=Language.EN,
        text="Open the door",
        action_id="action_1",
        client=base_client_info,
        economy_snapshot=base_economy_snapshot,
    )


# =============================================================================
# _detect_input_type 테스트
# =============================================================================


class TestDetectInputType:
    """입력 타입 감지 함수 테스트."""

    def test_detect_drop_input(self, ko_drop_input):
        """drop 입력 감지 테스트 (최고 우선순위)."""
        result = _detect_input_type(ko_drop_input)
        assert result == InputType.DROP

    def test_detect_click_input(self, ko_click_input):
        """click 입력 감지 테스트."""
        result = _detect_input_type(ko_click_input)
        assert result == InputType.CLICK

    def test_detect_action_input(self, ko_action_input):
        """action_id 입력 감지 테스트."""
        result = _detect_input_type(ko_action_input)
        assert result == InputType.ACTION

    def test_detect_free_text_input(self, ko_free_text_input):
        """free text 입력 감지 테스트."""
        result = _detect_input_type(ko_free_text_input)
        assert result == InputType.FREE_TEXT

    def test_priority_drop_over_click(self, base_client_info, base_economy_snapshot):
        """drop이 click보다 우선순위가 높은지 테스트."""
        turn_input = TurnInput(
            language=Language.KO,
            drop=DropInput(
                item_id="key_001",
                target_object_id="obj_lock",
                target_box_2d=Box2D(ymin=100, xmin=200, ymax=300, xmax=400),
            ),
            click=ClickInput(object_id="obj_door"),
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        result = _detect_input_type(turn_input)
        assert result == InputType.DROP

    def test_priority_click_over_action(self, base_client_info, base_economy_snapshot):
        """click이 action_id보다 우선순위가 높은지 테스트."""
        turn_input = TurnInput(
            language=Language.KO,
            click=ClickInput(object_id="obj_door"),
            action_id="action_1",
            text="문을 열어본다",
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        result = _detect_input_type(turn_input)
        assert result == InputType.CLICK

    def test_priority_action_over_free_text(self, ko_action_input):
        """action_id가 free text보다 우선순위가 높은지 테스트."""
        # ko_action_input은 action_id와 text 둘 다 있음
        result = _detect_input_type(ko_action_input)
        assert result == InputType.ACTION


# =============================================================================
# _compute_turn_seed 테스트
# =============================================================================


class TestComputeTurnSeed:
    """per-turn 시드 계산 함수 테스트."""

    def test_same_input_same_seed(self, ko_action_input):
        """동일 입력 → 동일 시드 (재현성)."""
        base_seed = 42
        seed1 = _compute_turn_seed(base_seed, ko_action_input)
        seed2 = _compute_turn_seed(base_seed, ko_action_input)
        assert seed1 == seed2

    def test_different_text_different_seed(self, base_client_info, base_economy_snapshot):
        """다른 텍스트 → 다른 시드 (다양성)."""
        base_seed = 42
        input1 = TurnInput(
            language=Language.KO,
            text="문을 열어본다",
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        input2 = TurnInput(
            language=Language.KO,
            text="주변을 탐색한다",
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        seed1 = _compute_turn_seed(base_seed, input1)
        seed2 = _compute_turn_seed(base_seed, input2)
        assert seed1 != seed2

    def test_different_action_id_different_seed(self, base_client_info, base_economy_snapshot):
        """다른 action_id → 다른 시드."""
        base_seed = 42
        input1 = TurnInput(
            language=Language.KO,
            action_id="action_1",
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        input2 = TurnInput(
            language=Language.KO,
            action_id="action_2",
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        seed1 = _compute_turn_seed(base_seed, input1)
        seed2 = _compute_turn_seed(base_seed, input2)
        assert seed1 != seed2

    def test_different_click_object_different_seed(self, base_client_info, base_economy_snapshot):
        """다른 클릭 오브젝트 → 다른 시드."""
        base_seed = 42
        input1 = TurnInput(
            language=Language.KO,
            click=ClickInput(object_id="obj_door"),
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        input2 = TurnInput(
            language=Language.KO,
            click=ClickInput(object_id="obj_chest"),
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        seed1 = _compute_turn_seed(base_seed, input1)
        seed2 = _compute_turn_seed(base_seed, input2)
        assert seed1 != seed2

    def test_different_drop_different_seed(self, base_client_info, base_economy_snapshot):
        """다른 드롭 정보 → 다른 시드."""
        base_seed = 42
        input1 = TurnInput(
            language=Language.KO,
            drop=DropInput(
                item_id="key_001",
                target_object_id="obj_lock",
                target_box_2d=Box2D(ymin=100, xmin=200, ymax=300, xmax=400),
            ),
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        input2 = TurnInput(
            language=Language.KO,
            drop=DropInput(
                item_id="sword_001",
                target_object_id="obj_enemy",
                target_box_2d=Box2D(ymin=100, xmin=200, ymax=300, xmax=400),
            ),
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        seed1 = _compute_turn_seed(base_seed, input1)
        seed2 = _compute_turn_seed(base_seed, input2)
        assert seed1 != seed2

    def test_seed_within_valid_range(self, ko_action_input):
        """시드가 유효한 범위 내인지 테스트."""
        base_seed = 42
        seed = _compute_turn_seed(base_seed, ko_action_input)
        assert 0 <= seed < 2**32


# =============================================================================
# _format_action_log_prefix 테스트
# =============================================================================


class TestFormatActionLogPrefix:
    """행동 로그 프리픽스 포맷 함수 테스트."""

    def test_ko_action_prefix(self, ko_action_input):
        """한국어 액션 프리픽스 테스트."""
        rng = random.Random(42)
        prefix = _format_action_log_prefix(rng, InputType.ACTION, ko_action_input, is_korean=True)

        # 한국어 액션 프리픽스 중 하나여야 함
        expected_patterns = ["[행동]", "[실행]", "[시도]"]
        assert any(pattern in prefix for pattern in expected_patterns)

    def test_ko_click_prefix(self, ko_click_input):
        """한국어 클릭 프리픽스 테스트."""
        rng = random.Random(42)
        prefix = _format_action_log_prefix(rng, InputType.CLICK, ko_click_input, is_korean=True)

        expected_patterns = ["[조사]", "[탐색]", "[상호작용]"]
        assert any(pattern in prefix for pattern in expected_patterns)
        # 오브젝트 ID는 여전히 포함되어야 함 (시스템 생성 ID이므로 언어 혼합 위험 없음)
        assert "obj_door" in prefix

    def test_ko_drop_prefix(self, ko_drop_input):
        """한국어 드롭 프리픽스 테스트."""
        rng = random.Random(42)
        prefix = _format_action_log_prefix(rng, InputType.DROP, ko_drop_input, is_korean=True)

        expected_patterns = ["[사용]", "[조합]", "[적용]"]
        assert any(pattern in prefix for pattern in expected_patterns)
        # 아이템 ID와 대상 ID는 포함되어야 함
        assert "key_001" in prefix
        assert "obj_lock" in prefix

    def test_ko_free_text_prefix(self, ko_free_text_input):
        """한국어 자유 텍스트 프리픽스 테스트."""
        rng = random.Random(42)
        prefix = _format_action_log_prefix(
            rng, InputType.FREE_TEXT, ko_free_text_input, is_korean=True
        )

        # U-062: [입력] 대신 [행동], [시도], [탐색] 사용
        expected_patterns = ["[행동]", "[시도]", "[탐색]"]
        assert any(pattern in prefix for pattern in expected_patterns)

    def test_en_action_prefix(self, en_action_input):
        """영어 액션 프리픽스 테스트."""
        rng = random.Random(42)
        prefix = _format_action_log_prefix(rng, InputType.ACTION, en_action_input, is_korean=False)

        expected_patterns = ["[ACTION]", "[EXECUTE]", "[ATTEMPT]"]
        assert any(pattern in prefix for pattern in expected_patterns)

    def test_deterministic_with_same_rng_state(self, ko_action_input):
        """동일 RNG 상태에서 결정적 결과 테스트."""
        prefix1 = _format_action_log_prefix(
            random.Random(42), InputType.ACTION, ko_action_input, is_korean=True
        )
        prefix2 = _format_action_log_prefix(
            random.Random(42), InputType.ACTION, ko_action_input, is_korean=True
        )
        assert prefix1 == prefix2


# =============================================================================
# MockOrchestrator 통합 테스트
# =============================================================================


class TestMockOrchestratorNarrativePrefix:
    """MockOrchestrator 내러티브 프리픽스 통합 테스트."""

    def test_action_input_no_said_ko(self, ko_action_input):
        """한국어 액션 입력 시 '말했습니다' 없음 테스트."""
        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(ko_action_input)

        assert isinstance(output, TurnOutput)
        assert "말했습니다" not in output.narrative
        assert "라고 말했습니다" not in output.narrative

        # 행동 로그 프리픽스가 있어야 함
        expected_prefixes = ["[행동]", "[실행]", "[시도]"]
        assert any(prefix in output.narrative for prefix in expected_prefixes)

    def test_click_input_no_said_ko(self, ko_click_input):
        """한국어 클릭 입력 시 '말했습니다' 없음 테스트."""
        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(ko_click_input)

        assert "말했습니다" not in output.narrative

        expected_prefixes = ["[조사]", "[탐색]", "[상호작용]"]
        assert any(prefix in output.narrative for prefix in expected_prefixes)
        # 오브젝트 ID 포함 확인
        assert "obj_door" in output.narrative

    def test_drop_input_no_said_ko(self, ko_drop_input):
        """한국어 드롭 입력 시 '말했습니다' 없음 테스트."""
        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(ko_drop_input)

        assert "말했습니다" not in output.narrative

        expected_prefixes = ["[사용]", "[조합]", "[적용]"]
        assert any(prefix in output.narrative for prefix in expected_prefixes)
        # 아이템 및 대상 ID 포함 확인
        assert "key_001" in output.narrative
        assert "obj_lock" in output.narrative

    def test_free_text_input_no_said_ko(self, ko_free_text_input):
        """한국어 자유 텍스트 입력 시 '말했습니다' 없음 테스트."""
        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(ko_free_text_input)

        assert "말했습니다" not in output.narrative

        # U-062: [행동], [시도], [탐색] 중 하나여야 함
        expected_prefixes = ["[행동]", "[시도]", "[탐색]"]
        assert any(prefix in output.narrative for prefix in expected_prefixes)

    def test_action_input_no_said_en(self, en_action_input):
        """영어 액션 입력 시 'You said' 없음 테스트."""
        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(en_action_input)

        assert "You said" not in output.narrative
        assert "said" not in output.narrative.lower() or "[" in output.narrative[:10]

        expected_prefixes = ["[ACTION]", "[EXECUTE]", "[ATTEMPT]"]
        assert any(prefix in output.narrative for prefix in expected_prefixes)

    def test_empty_text_no_prefix(self, base_client_info, base_economy_snapshot):
        """의미 없는 입력 시 프리픽스 없음 테스트."""
        turn_input = TurnInput(
            language=Language.KO,
            text="",  # 빈 텍스트
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )

        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(turn_input)

        # 빈 입력이므로 프리픽스가 없어야 함
        assert not output.narrative.startswith("[")

    def test_english_input_korean_session_passes_language_gate(
        self, base_client_info, base_economy_snapshot
    ):
        """U-062: 영어 입력 시에도 한국어 세션에서 LanguageGate를 통과하는지 테스트."""
        from unknown_world.validation.language_gate import validate_language_consistency

        turn_input = TurnInput(
            language=Language.KO,
            text="English instruction for a Korean session",
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )

        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(turn_input)

        # 1. 내러티브에 영어 입력이 포함되지 않아야 함
        assert "English instruction" not in output.narrative

        # 2. LanguageGate 검증 통과해야 함
        result = validate_language_consistency(output, Language.KO)
        assert result.is_valid is True, f"LanguageGate failed: {result.violations}"

    def test_korean_input_english_session_passes_language_gate(
        self, base_client_info, base_economy_snapshot
    ):
        """U-062: 한국어 입력 시에도 영어 세션에서 LanguageGate를 통과하는지 테스트."""
        from unknown_world.validation.language_gate import validate_language_consistency

        turn_input = TurnInput(
            language=Language.EN,
            text="영어 세션에 들어온 한국어 명령",
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )

        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(turn_input)

        # 1. 내러티브에 한국어 입력이 포함되지 않아야 함
        assert "한국어 명령" not in output.narrative

        # 2. LanguageGate 검증 통과해야 함
        result = validate_language_consistency(output, Language.EN)
        assert result.is_valid is True, f"LanguageGate failed: {result.violations}"


# =============================================================================
# 결정적 다양성 테스트
# =============================================================================


class TestDeterministicDiversity:
    """결정적 다양성 테스트."""

    def test_same_input_same_output(self, ko_action_input):
        """동일 입력 → 동일 출력 (재현성)."""
        orchestrator1 = MockOrchestrator(seed=42)
        orchestrator2 = MockOrchestrator(seed=42)

        output1 = orchestrator1.generate_turn_output(ko_action_input)
        output2 = orchestrator2.generate_turn_output(ko_action_input)

        assert output1.narrative == output2.narrative
        assert len(output1.ui.action_deck.cards) == len(output2.ui.action_deck.cards)

    def test_different_input_different_output(self, base_client_info, base_economy_snapshot):
        """다른 입력 → 다른 출력 (다양성)."""
        input1 = TurnInput(
            language=Language.KO,
            text="문을 열어본다",
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )
        input2 = TurnInput(
            language=Language.KO,
            text="주변을 탐색한다",
            client=base_client_info,
            economy_snapshot=base_economy_snapshot,
        )

        # 같은 seed의 오케스트레이터 사용
        orchestrator = MockOrchestrator(seed=42)

        output1 = orchestrator.generate_turn_output(input1)
        output2 = orchestrator.generate_turn_output(input2)

        # per-turn RNG이므로 다른 내러티브가 나와야 함
        # (프리픽스는 같을 수 있지만 본문이 달라질 확률이 높음)
        assert output1.narrative != output2.narrative

    def test_multiple_calls_deterministic(self, ko_action_input):
        """여러 번 호출해도 같은 결과 (동일 입력에 대해)."""
        orchestrator = MockOrchestrator(seed=42)

        outputs = [orchestrator.generate_turn_output(ko_action_input) for _ in range(3)]

        # 모든 출력이 동일해야 함
        for i in range(1, len(outputs)):
            assert outputs[0].narrative == outputs[i].narrative


# =============================================================================
# 스키마/인바리언트 테스트
# =============================================================================


class TestSchemaAndInvariants:
    """스키마 및 인바리언트 테스트."""

    def test_output_is_valid_turn_output(self, ko_action_input):
        """출력이 유효한 TurnOutput인지 테스트."""
        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(ko_action_input)

        assert isinstance(output, TurnOutput)
        assert output.language == Language.KO
        assert output.narrative is not None
        assert output.economy is not None
        assert output.safety is not None

    def test_economy_invariant_no_negative_balance(self, base_client_info):
        """경제 인바리언트: 잔액 음수 금지 (RULE-005)."""
        # 잔액이 매우 적은 경우
        economy_snapshot = EconomySnapshot(signal=1, memory_shard=0)
        turn_input = TurnInput(
            language=Language.KO,
            text="비싼 행동",
            client=base_client_info,
            economy_snapshot=economy_snapshot,
        )

        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(turn_input)

        # 잔액은 0 이상이어야 함
        assert output.economy.balance_after.signal >= 0
        assert output.economy.balance_after.memory_shard >= 0

    def test_coordinate_invariant_0_to_1000(self, ko_action_input):
        """좌표 인바리언트: 0~1000 범위 (RULE-009)."""
        orchestrator = MockOrchestrator(seed=42)
        output = orchestrator.generate_turn_output(ko_action_input)

        for obj in output.ui.objects:
            assert 0 <= obj.box_2d.ymin <= 1000
            assert 0 <= obj.box_2d.xmin <= 1000
            assert 0 <= obj.box_2d.ymax <= 1000
            assert 0 <= obj.box_2d.xmax <= 1000
            # ymin < ymax, xmin < xmax
            assert obj.box_2d.ymin < obj.box_2d.ymax
            assert obj.box_2d.xmin < obj.box_2d.xmax

    def test_language_consistency(self, ko_action_input, en_action_input):
        """언어 일관성 테스트 (RULE-006)."""
        orchestrator = MockOrchestrator(seed=42)

        ko_output = orchestrator.generate_turn_output(ko_action_input)
        en_output = orchestrator.generate_turn_output(en_action_input)

        assert ko_output.language == Language.KO
        assert en_output.language == Language.EN


# =============================================================================
# 템플릿 상수 테스트
# =============================================================================


class TestTemplateConstants:
    """템플릿 상수 검증 테스트."""

    def test_ko_prefixes_have_all_input_types(self):
        """한국어 프리픽스에 모든 입력 타입이 있는지 테스트."""
        for input_type in InputType:
            assert input_type in KO_ACTION_LOG_PREFIXES
            assert len(KO_ACTION_LOG_PREFIXES[input_type]) >= 1

    def test_en_prefixes_have_all_input_types(self):
        """영어 프리픽스에 모든 입력 타입이 있는지 테스트."""
        for input_type in InputType:
            assert input_type in EN_ACTION_LOG_PREFIXES
            assert len(EN_ACTION_LOG_PREFIXES[input_type]) >= 1

    def test_ko_prefixes_no_said(self):
        """한국어 프리픽스에 '말했습니다'가 없는지 테스트."""
        for _input_type, templates in KO_ACTION_LOG_PREFIXES.items():
            for template in templates:
                assert "말했습니다" not in template

    def test_en_prefixes_no_said(self):
        """영어 프리픽스에 'said'가 없는지 테스트."""
        for _input_type, templates in EN_ACTION_LOG_PREFIXES.items():
            for template in templates:
                assert "said" not in template.lower()
