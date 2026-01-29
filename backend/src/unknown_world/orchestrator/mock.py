"""Unknown World - 모의 Orchestrator.

실모델(Gemini) 없이 프론트엔드 개발/데모를 지속할 수 있도록
결정적(seed 기반) TurnOutput을 생성하는 모의 Orchestrator입니다.

설계 원칙:
    - RULE-004: 검증 실패 시 안전한 폴백 제공
    - RULE-005: 재화 인바리언트 (잔액 음수 금지)
    - RULE-008: 단계/배지 가시화
    - RULE-009: 좌표 규약 (0~1000, bbox [ymin,xmin,ymax,xmax])

참조:
    - vibe/unit-plans/U-007[Mvp].md
    - vibe/unit-plans/U-048[Mvp].md
    - .cursor/rules/20-backend-orchestrator.mdc
"""

import hashlib
import random
from enum import Enum

from unknown_world.models.turn import (
    ActionCard,
    ActionDeck,
    AgentConsole,
    AgentPhase,
    Box2D,
    CurrencyAmount,
    EconomyOutput,
    ImageJob,
    Language,
    MemoryPin,
    ModelLabel,
    Quest,
    RenderOutput,
    RiskLevel,
    SafetyOutput,
    SceneObject,
    TurnInput,
    TurnOutput,
    UIOutput,
    ValidationBadge,
    WorldDelta,
    WorldRule,
)
from unknown_world.orchestrator.fallback import (
    create_safe_fallback as _create_safe_fallback,
)

# =============================================================================
# 입력 타입 분류 (U-048: 행동 로그 템플릿 분기용)
# =============================================================================


class InputType(str, Enum):
    """입력 타입 분류 (우선순위: DROP > CLICK > ACTION > FREE_TEXT)."""

    DROP = "drop"  # 아이템 드롭 (사용/조합)
    CLICK = "click"  # 핫스팟 클릭 (조사/상호작용)
    ACTION = "action"  # 액션 카드 실행
    FREE_TEXT = "free_text"  # 자유 입력


def _detect_input_type(turn_input: TurnInput) -> InputType:
    """TurnInput에서 입력 타입을 감지 (우선순위 기반).

    우선순위: drop > click > action_id > free_text

    Args:
        turn_input: 사용자 입력

    Returns:
        InputType: 감지된 입력 타입
    """
    if turn_input.drop is not None:
        return InputType.DROP
    if turn_input.click is not None:
        return InputType.CLICK
    if turn_input.action_id is not None:
        return InputType.ACTION
    return InputType.FREE_TEXT


def _compute_turn_seed(base_seed: int, turn_input: TurnInput) -> int:
    """per-turn 결정적 시드 생성 (입력 특징 해시 기반).

    base_seed와 입력의 주요 특징을 해시하여 턴마다 다른 결과를
    생성하면서도 재현성을 유지합니다.

    Args:
        base_seed: 기본 시드
        turn_input: 사용자 입력

    Returns:
        int: per-turn 시드
    """
    # 입력 특징 문자열 생성
    features: list[str] = [str(base_seed)]

    if turn_input.text:
        features.append(turn_input.text)
    if turn_input.action_id:
        features.append(turn_input.action_id)
    if turn_input.click:
        features.append(turn_input.click.object_id)
    if turn_input.drop:
        features.append(turn_input.drop.item_id)
        features.append(turn_input.drop.target_object_id)

    # 특징 문자열을 해시하여 시드 생성
    feature_str = "|".join(features)
    hash_bytes = hashlib.sha256(feature_str.encode("utf-8")).digest()
    # 해시의 처음 8바이트를 정수로 변환
    return int.from_bytes(hash_bytes[:8], byteorder="big") % (2**32)


# =============================================================================
# 행동 로그 프리픽스 템플릿 (U-048: "말했습니다" 제거)
# =============================================================================

# 한국어 행동 로그 프리픽스 (입력 타입별)
KO_ACTION_LOG_PREFIXES: dict[InputType, list[str]] = {
    InputType.DROP: [
        "[사용] {item} → {target}:",
        "[조합] {item}을(를) {target}에 사용:",
        "[적용] {item} → {target}:",
    ],
    InputType.CLICK: [
        "[조사] {object}:",
        "[탐색] {object}을(를) 살펴봄:",
        "[상호작용] {object}:",
    ],
    InputType.ACTION: [
        "[행동] {action}:",
        "[실행] {action}:",
        "[시도] {action}:",
    ],
    InputType.FREE_TEXT: [
        "[입력] {text}:",
        "[명령] {text}:",
        "[지시] {text}:",
    ],
}

# 영어 행동 로그 프리픽스 (입력 타입별)
EN_ACTION_LOG_PREFIXES: dict[InputType, list[str]] = {
    InputType.DROP: [
        "[USE] {item} → {target}:",
        "[APPLY] {item} on {target}:",
        "[COMBINE] {item} with {target}:",
    ],
    InputType.CLICK: [
        "[EXAMINE] {object}:",
        "[INSPECT] {object}:",
        "[INTERACT] {object}:",
    ],
    InputType.ACTION: [
        "[ACTION] {action}:",
        "[EXECUTE] {action}:",
        "[ATTEMPT] {action}:",
    ],
    InputType.FREE_TEXT: [
        "[INPUT] {text}:",
        "[COMMAND] {text}:",
        "[DIRECTIVE] {text}:",
    ],
}


def _format_action_log_prefix(
    rng: random.Random,
    input_type: InputType,
    turn_input: TurnInput,
    is_korean: bool,
) -> str:
    """입력 타입에 맞는 행동 로그 프리픽스 생성.

    Args:
        rng: 랜덤 생성기
        input_type: 입력 타입
        turn_input: 사용자 입력
        is_korean: 한국어 여부

    Returns:
        str: 포맷된 행동 로그 프리픽스
    """
    templates = KO_ACTION_LOG_PREFIXES if is_korean else EN_ACTION_LOG_PREFIXES
    template = rng.choice(templates[input_type])

    # 입력 타입별 포맷 인자 준비
    format_args: dict[str, str] = {}

    if input_type == InputType.DROP and turn_input.drop:
        format_args["item"] = turn_input.drop.item_id
        format_args["target"] = turn_input.drop.target_object_id
    elif input_type == InputType.CLICK and turn_input.click:
        format_args["object"] = turn_input.click.object_id
    elif input_type == InputType.ACTION:
        format_args["action"] = turn_input.text or turn_input.action_id or ""
    elif input_type == InputType.FREE_TEXT:
        # 긴 텍스트는 앞부분만 표시
        text = turn_input.text or ""
        if len(text) > 30:
            text = text[:27] + "..."
        format_args["text"] = text

    return template.format(**format_args)


# =============================================================================
# 모의 데이터 생성 헬퍼
# =============================================================================

# 한국어 내러티브 템플릿
KO_NARRATIVES = [
    "어둠 속에서 희미한 빛이 새어나옵니다. 오래된 문이 삐걱거리며 열리고, 그 너머로 알 수 없는 세계가 펼쳐집니다.",
    "발걸음 소리가 텅 빈 복도에 메아리칩니다. 벽에 걸린 초상화들의 눈이 당신을 따라 움직이는 것 같습니다.",
    "갑자기 바닥이 흔들리며, 벽에서 고대의 문자들이 빛나기 시작합니다. 무언가가 깨어나고 있습니다.",
    "안개가 걷히자, 거대한 탑이 모습을 드러냅니다. 탑 꼭대기에서 이상한 빛이 깜빡이고 있습니다.",
    "낡은 책장을 밀자, 숨겨진 통로가 나타났습니다. 통로 끝에서 기묘한 노래가 들려옵니다.",
]

# 영어 내러티브 템플릿
EN_NARRATIVES = [
    "A faint light seeps through the darkness. An ancient door creaks open, revealing an unknown world beyond.",
    "Footsteps echo through the empty corridor. The eyes of the portraits on the walls seem to follow you.",
    "Suddenly, the ground shakes and ancient runes on the walls begin to glow. Something is awakening.",
    "As the fog lifts, a massive tower reveals itself. A strange light flickers at its peak.",
    "Pushing aside the old bookshelf, you discover a hidden passage. An eerie song emanates from its depths.",
]

# 한국어 액션 카드 템플릿
KO_ACTION_CARDS = [
    {"label": "문을 열어본다", "description": "조심스럽게 문을 열어 안을 살펴본다"},
    {"label": "주변을 탐색한다", "description": "주변에 유용한 물건이 있는지 찾아본다"},
    {"label": "뒤로 물러선다", "description": "위험을 피해 안전한 곳으로 물러선다"},
    {"label": "말을 걸어본다", "description": "상대방에게 조심스럽게 말을 건다"},
    {"label": "숨어서 지켜본다", "description": "은신하여 상황을 관찰한다"},
    {"label": "공격한다", "description": "위협에 맞서 공격을 시도한다"},
]

# 영어 액션 카드 템플릿
EN_ACTION_CARDS = [
    {"label": "Open the door", "description": "Carefully open the door and look inside"},
    {"label": "Search the area", "description": "Look for useful items nearby"},
    {"label": "Step back", "description": "Retreat to a safe place to avoid danger"},
    {"label": "Speak to them", "description": "Cautiously initiate conversation"},
    {"label": "Hide and observe", "description": "Conceal yourself and watch the situation"},
    {"label": "Attack", "description": "Confront the threat with an attack"},
]

# 장면 오브젝트 템플릿
SCENE_OBJECTS_KO = [
    {"label": "낡은 문", "hint": "클릭하여 열어볼 수 있습니다"},
    {"label": "빛나는 보석", "hint": "수집할 수 있을 것 같습니다"},
    {"label": "수상한 상자", "hint": "무언가 들어있을 수 있습니다"},
    {"label": "벽의 스위치", "hint": "작동시킬 수 있습니다"},
]

SCENE_OBJECTS_EN = [
    {"label": "Old door", "hint": "Click to open"},
    {"label": "Glowing gem", "hint": "It looks collectible"},
    {"label": "Suspicious chest", "hint": "Something might be inside"},
    {"label": "Wall switch", "hint": "Can be activated"},
]


def _generate_random_box(rng: random.Random) -> Box2D:
    """랜덤 바운딩 박스 생성 (0~1000 좌표계)."""
    ymin = rng.randint(0, 700)
    xmin = rng.randint(0, 700)
    ymax = ymin + rng.randint(50, 250)
    xmax = xmin + rng.randint(50, 250)
    # 범위 보정
    ymax = min(ymax, 1000)
    xmax = min(xmax, 1000)
    return Box2D(ymin=ymin, xmin=xmin, ymax=ymax, xmax=xmax)


# =============================================================================
# MockOrchestrator 클래스
# =============================================================================


class MockOrchestrator:
    """모의 Orchestrator.

    실모델(Gemini) 없이 TurnOutput을 생성하는 모의 오케스트레이터입니다.
    seed 기반으로 결정적(재현 가능)인 결과를 생성합니다.

    Note:
        Phase 순서는 pipeline.py의 DEFAULT_STAGES가 SSOT입니다 (RU-005-Q1).

    Attributes:
        seed: 랜덤 시드 (재현성 보장)

    Example:
        >>> orchestrator = MockOrchestrator(seed=42)
        >>> turn_input = TurnInput(
        ...     language=Language.KO,
        ...     text="문을 열어본다",
        ...     client=ClientInfo(viewport_w=1920, viewport_h=1080),
        ...     economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
        ... )
        >>> output = orchestrator.generate_turn_output(turn_input)
    """

    def __init__(self, seed: int | None = None) -> None:
        """MockOrchestrator 초기화.

        Args:
            seed: 랜덤 시드. None이면 랜덤하게 생성.
        """
        self.seed = seed if seed is not None else random.randint(0, 2**32 - 1)
        self._rng = random.Random(self.seed)

    def generate_turn_output(self, turn_input: TurnInput) -> TurnOutput:
        """TurnInput을 받아 TurnOutput을 생성합니다.

        Args:
            turn_input: 사용자 입력

        Returns:
            TurnOutput: 모의 턴 결과
        """
        is_korean = turn_input.language == Language.KO

        # U-048: per-turn 결정적 RNG 생성 (입력에 따라 다른 결과)
        turn_seed = _compute_turn_seed(self.seed, turn_input)
        turn_rng = random.Random(turn_seed)

        # 내러티브 생성 (per-turn RNG 사용으로 입력별 다양성 확보)
        narratives = KO_NARRATIVES if is_korean else EN_NARRATIVES
        narrative = turn_rng.choice(narratives)

        # U-048: 입력 타입별 행동 로그 프리픽스 적용 ("말했습니다" 제거)
        input_type = _detect_input_type(turn_input)
        has_meaningful_input = (
            turn_input.drop is not None
            or turn_input.click is not None
            or turn_input.action_id is not None
            or (turn_input.text and turn_input.text.strip())
        )

        if has_meaningful_input:
            prefix = _format_action_log_prefix(turn_rng, input_type, turn_input, is_korean)
            narrative = f"{prefix} {narrative}"

        # U-048: 모든 생성에 turn_rng 사용 (입력별 결정적 다양성)
        # 액션 덱 생성 (3~6장)
        action_templates = KO_ACTION_CARDS if is_korean else EN_ACTION_CARDS
        num_cards = turn_rng.randint(3, 6)
        selected_templates = turn_rng.sample(
            action_templates, min(num_cards, len(action_templates))
        )

        action_cards: list[ActionCard] = []
        for i, template in enumerate(selected_templates):
            cost_signal = turn_rng.randint(1, 10)
            cost_shard = 1 if turn_rng.random() < 0.2 else 0  # 20% 확률로 shard 소비

            action_cards.append(
                ActionCard(
                    id=f"action_{i + 1}",
                    label=template["label"],
                    description=template["description"],
                    cost=CurrencyAmount(signal=cost_signal, memory_shard=cost_shard),
                    risk=turn_rng.choice(list(RiskLevel)),
                    hint=None,
                )
            )

        action_deck = ActionDeck(cards=action_cards)

        # 장면 오브젝트 생성 (1~3개)
        object_templates = SCENE_OBJECTS_KO if is_korean else SCENE_OBJECTS_EN
        num_objects = turn_rng.randint(1, 3)
        selected_objects = turn_rng.sample(
            object_templates, min(num_objects, len(object_templates))
        )

        scene_objects: list[SceneObject] = []
        for i, template in enumerate(selected_objects):
            scene_objects.append(
                SceneObject(
                    id=f"obj_{i + 1}",
                    label=template["label"],
                    box_2d=_generate_random_box(turn_rng),
                    interaction_hint=template["hint"],
                )
            )

        ui_output = UIOutput(action_deck=action_deck, objects=scene_objects)

        # 세계 상태 변화 (delta) - turn_rng 전달
        world_delta = self._generate_world_delta(is_korean, turn_rng)

        # 렌더링 출력 (이미지 생성은 선택적)
        should_generate_image = turn_rng.random() < 0.3  # 30% 확률로 이미지 생성
        render_output = RenderOutput(
            image_job=ImageJob(
                should_generate=should_generate_image,
                prompt="A mysterious dungeon scene" if should_generate_image else "",
                model_label=ModelLabel.FAST,
                aspect_ratio="16:9",
                image_size="1024x576",
            )
            if should_generate_image
            else None
        )

        # 경제 출력 (비용 계산)
        turn_cost = CurrencyAmount(
            signal=turn_rng.randint(1, 5),
            memory_shard=0,
        )

        # 잔액 계산 (음수 방지 - RULE-005)
        balance_signal = max(0, turn_input.economy_snapshot.signal - turn_cost.signal)
        balance_shard = max(0, turn_input.economy_snapshot.memory_shard - turn_cost.memory_shard)

        economy_output = EconomyOutput(
            cost=turn_cost,
            balance_after=CurrencyAmount(signal=balance_signal, memory_shard=balance_shard),
        )

        # 안전 출력
        safety_output = SafetyOutput(blocked=False, message=None)

        # 에이전트 콘솔
        agent_console = AgentConsole(
            current_phase=AgentPhase.COMMIT,
            badges=[
                ValidationBadge.SCHEMA_OK,
                ValidationBadge.ECONOMY_OK,
                ValidationBadge.SAFETY_OK,
                ValidationBadge.CONSISTENCY_OK,
            ],
            repair_count=0,
        )

        return TurnOutput(
            language=turn_input.language,
            narrative=narrative,
            ui=ui_output,
            world=world_delta,
            render=render_output,
            economy=economy_output,
            safety=safety_output,
            agent_console=agent_console,
        )

    def _generate_world_delta(
        self, is_korean: bool, rng: random.Random | None = None
    ) -> WorldDelta:
        """세계 상태 변화 생성.

        Args:
            is_korean: 한국어 여부
            rng: 사용할 RNG (None이면 self._rng 사용, U-048 하위호환)

        Returns:
            WorldDelta: 생성된 세계 상태 변화
        """
        # U-048: per-turn RNG 지원 (하위호환 유지)
        use_rng = rng if rng is not None else self._rng

        # 규칙 변경 (20% 확률)
        rules_changed: list[WorldRule] = []
        if use_rng.random() < 0.2:
            rules_changed.append(
                WorldRule(
                    id="rule_gravity",
                    label="중력 반전" if is_korean else "Gravity Inversion",
                    description=(
                        "이 구역에서는 중력이 반대로 작용합니다"
                        if is_korean
                        else "Gravity works in reverse in this area"
                    ),
                )
            )

        # 인벤토리 추가 (30% 확률)
        inventory_added: list[str] = []
        if use_rng.random() < 0.3:
            items_ko = ["낡은 열쇠", "신비로운 구슬", "고대의 두루마리"]
            items_en = ["Old Key", "Mysterious Orb", "Ancient Scroll"]
            items = items_ko if is_korean else items_en
            inventory_added.append(use_rng.choice(items))

        # 퀘스트 업데이트 (25% 확률)
        quests_updated: list[Quest] = []
        if use_rng.random() < 0.25:
            quests_updated.append(
                Quest(
                    id="quest_explore",
                    label="미지의 영역 탐험" if is_korean else "Explore Unknown Territory",
                    is_completed=use_rng.random() < 0.3,
                )
            )

        # 메모리 핀 (15% 확률)
        memory_pins: list[MemoryPin] = []
        if use_rng.random() < 0.15:
            memory_pins.append(
                MemoryPin(
                    id="pin_1",
                    content="이 장소의 이름은 '잊혀진 성소'"
                    if is_korean
                    else "This place is called 'Forgotten Sanctuary'",
                    cost=CurrencyAmount(signal=0, memory_shard=1),
                )
            )

        return WorldDelta(
            rules_changed=rules_changed,
            inventory_added=inventory_added,
            inventory_removed=[],
            quests_updated=quests_updated,
            relationships_changed=[],
            memory_pins=memory_pins,
        )

    def create_safe_fallback(
        self,
        language: Language,
        error_message: str | None = None,  # noqa: ARG002 - 하위 호환용 (실제로 사용하지 않음)
        economy_snapshot: CurrencyAmount | None = None,
    ) -> TurnOutput:
        """안전한 폴백 TurnOutput 생성 (RULE-004, RU-002-S1).

        스키마 검증 실패 시 반환할 안전한 기본 응답입니다.
        폴백 시 economy.balance_after는 입력 스냅샷을 그대로 유지합니다 (비용 0, 잔액 변화 없음).

        Note:
            이 메서드는 fallback.create_safe_fallback SSOT로 위임합니다 (RU-005-Q1).

        Args:
            language: 응답 언어
            error_message: 에러 메시지 (하위 호환용, 실제 미사용)
            economy_snapshot: 요청 직전 재화 스냅샷 (폴백 시 잔액 유지용)

        Returns:
            TurnOutput: 안전한 폴백 응답
        """
        # RU-005-Q1: fallback SSOT로 위임
        return _create_safe_fallback(
            language=language,
            economy_snapshot=economy_snapshot,
            repair_count=1,  # Mock에서는 기본 복구 시도 1회로 표시
            is_blocked=False,
        )
