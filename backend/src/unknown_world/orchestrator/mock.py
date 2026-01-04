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
    - .cursor/rules/20-backend-orchestrator.mdc
"""

import random
from typing import Annotated

from pydantic import BaseModel, Field

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

# =============================================================================
# 스트림 이벤트 타입 (NDJSON 계약)
# =============================================================================


class StreamEventType:
    """스트림 이벤트 타입 상수.

    NDJSON 스트리밍에서 사용되는 이벤트 타입입니다.
    PRD 예시 단계: Parse→Validate→Plan→Resolve→Render→Verify→Commit
    """

    STAGE = "stage"
    BADGES = "badges"
    NARRATIVE_DELTA = "narrative_delta"
    FINAL = "final"
    ERROR = "error"


class StageStatus:
    """단계 상태 상수."""

    START = "start"
    COMPLETE = "complete"


class StageEvent(BaseModel):
    """단계 진행 이벤트.

    Attributes:
        type: 이벤트 타입 ("stage")
        name: 단계 이름 (Parse, Validate, Plan, Resolve, Render, Verify, Commit)
        status: 상태 (start, complete)
    """

    type: Annotated[str, Field(default=StreamEventType.STAGE)]
    name: str
    status: str


class BadgesEvent(BaseModel):
    """배지 이벤트.

    Attributes:
        type: 이벤트 타입 ("badges")
        badges: 검증 배지 목록
    """

    type: Annotated[str, Field(default=StreamEventType.BADGES)]
    badges: list[str]


class NarrativeDeltaEvent(BaseModel):
    """내러티브 델타 이벤트 (타자 효과용).

    Attributes:
        type: 이벤트 타입 ("narrative_delta")
        text: 추가된 텍스트 조각
    """

    type: Annotated[str, Field(default=StreamEventType.NARRATIVE_DELTA)]
    text: str


class FinalEvent(BaseModel):
    """최종 TurnOutput 이벤트.

    Attributes:
        type: 이벤트 타입 ("final")
        data: 완전한 TurnOutput
    """

    type: Annotated[str, Field(default=StreamEventType.FINAL)]
    data: TurnOutput


class ErrorEvent(BaseModel):
    """에러 이벤트.

    Attributes:
        type: 이벤트 타입 ("error")
        message: 에러 메시지 (프롬프트/내부 추론 노출 금지)
        code: 에러 코드 (선택)
    """

    type: Annotated[str, Field(default=StreamEventType.ERROR)]
    message: str
    code: str | None = None


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

    # 단계 목록 (PRD 예시)
    PHASES = [
        AgentPhase.PARSE,
        AgentPhase.VALIDATE,
        AgentPhase.PLAN,
        AgentPhase.RESOLVE,
        AgentPhase.RENDER,
        AgentPhase.VERIFY,
        AgentPhase.COMMIT,
    ]

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

        # 내러티브 생성
        narratives = KO_NARRATIVES if is_korean else EN_NARRATIVES
        narrative = self._rng.choice(narratives)

        # 사용자 텍스트가 있으면 반영
        if turn_input.text:
            prefix = (
                f'당신은 "{turn_input.text}"라고 말했습니다. '
                if is_korean
                else f'You said "{turn_input.text}". '
            )
            narrative = prefix + narrative

        # 액션 덱 생성 (3~6장)
        action_templates = KO_ACTION_CARDS if is_korean else EN_ACTION_CARDS
        num_cards = self._rng.randint(3, 6)
        selected_templates = self._rng.sample(
            action_templates, min(num_cards, len(action_templates))
        )

        action_cards: list[ActionCard] = []
        for i, template in enumerate(selected_templates):
            cost_signal = self._rng.randint(1, 10)
            cost_shard = 1 if self._rng.random() < 0.2 else 0  # 20% 확률로 shard 소비

            action_cards.append(
                ActionCard(
                    id=f"action_{i + 1}",
                    label=template["label"],
                    description=template["description"],
                    cost=CurrencyAmount(signal=cost_signal, memory_shard=cost_shard),
                    risk=self._rng.choice(list(RiskLevel)),
                    hint=None,
                )
            )

        action_deck = ActionDeck(cards=action_cards)

        # 장면 오브젝트 생성 (1~3개)
        object_templates = SCENE_OBJECTS_KO if is_korean else SCENE_OBJECTS_EN
        num_objects = self._rng.randint(1, 3)
        selected_objects = self._rng.sample(
            object_templates, min(num_objects, len(object_templates))
        )

        scene_objects: list[SceneObject] = []
        for i, template in enumerate(selected_objects):
            scene_objects.append(
                SceneObject(
                    id=f"obj_{i + 1}",
                    label=template["label"],
                    box_2d=_generate_random_box(self._rng),
                    interaction_hint=template["hint"],
                )
            )

        ui_output = UIOutput(action_deck=action_deck, objects=scene_objects)

        # 세계 상태 변화 (delta)
        world_delta = self._generate_world_delta(is_korean)

        # 렌더링 출력 (이미지 생성은 선택적)
        should_generate_image = self._rng.random() < 0.3  # 30% 확률로 이미지 생성
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
            signal=self._rng.randint(1, 5),
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

    def _generate_world_delta(self, is_korean: bool) -> WorldDelta:
        """세계 상태 변화 생성."""
        # 규칙 변경 (20% 확률)
        rules_changed: list[WorldRule] = []
        if self._rng.random() < 0.2:
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
        if self._rng.random() < 0.3:
            items_ko = ["낡은 열쇠", "신비로운 구슬", "고대의 두루마리"]
            items_en = ["Old Key", "Mysterious Orb", "Ancient Scroll"]
            items = items_ko if is_korean else items_en
            inventory_added.append(self._rng.choice(items))

        # 퀘스트 업데이트 (25% 확률)
        quests_updated: list[Quest] = []
        if self._rng.random() < 0.25:
            quests_updated.append(
                Quest(
                    id="quest_explore",
                    label="미지의 영역 탐험" if is_korean else "Explore Unknown Territory",
                    is_completed=self._rng.random() < 0.3,
                )
            )

        # 메모리 핀 (15% 확률)
        memory_pins: list[MemoryPin] = []
        if self._rng.random() < 0.15:
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
        self, language: Language, error_message: str | None = None
    ) -> TurnOutput:
        """안전한 폴백 TurnOutput 생성 (RULE-004).

        스키마 검증 실패 시 반환할 안전한 기본 응답입니다.

        Args:
            language: 응답 언어
            error_message: 에러 메시지 (내부용, UI에 노출하지 않음)

        Returns:
            TurnOutput: 안전한 폴백 응답
        """
        is_korean = language == Language.KO

        narrative = (
            "잠시 혼란이 있었습니다. 다시 시도해주세요."
            if is_korean
            else "There was a momentary confusion. Please try again."
        )

        return TurnOutput(
            language=language,
            narrative=narrative,
            ui=UIOutput(action_deck=ActionDeck(cards=[]), objects=[]),
            world=WorldDelta(),
            render=RenderOutput(image_job=None),
            economy=EconomyOutput(
                cost=CurrencyAmount(signal=0, memory_shard=0),
                balance_after=CurrencyAmount(signal=100, memory_shard=5),  # 기본 잔액
            ),
            safety=SafetyOutput(blocked=False, message=None),
            agent_console=AgentConsole(
                current_phase=AgentPhase.COMMIT,
                badges=[ValidationBadge.SCHEMA_FAIL],  # 실패 표시
                repair_count=1,  # 복구 시도 횟수
            ),
        )
