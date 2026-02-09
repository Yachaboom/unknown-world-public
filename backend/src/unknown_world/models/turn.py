"""Unknown World - TurnInput/TurnOutput Pydantic 스키마.

이 모듈은 Unknown World의 핵심 데이터 모델을 정의합니다.
Gemini Structured Outputs에 투입 가능한 JSON Schema(부분집합)를 생성할 수 있습니다.

설계 원칙:
    - RULE-003: 구조화 출력(JSON Schema) 우선 + 이중 검증
    - RULE-005: 재화 인바리언트 (cost, balance_after 필수, 잔액 음수 금지)
    - RULE-006: ko/en 언어 정책 (Language enum으로 고정)
    - RULE-009: 좌표 규약 (0~1000, bbox [ymin,xmin,ymax,xmax])

사용 예시:
    # Gemini Structured Outputs용 JSON Schema 생성
    schema = TurnOutput.model_json_schema()

    # 응답 검증
    output = TurnOutput.model_validate_json(gemini_response_text)

참조:
    - vibe/prd.md 8.7 (데이터 모델 설계)
    - vibe/ref/structured-outputs-guide.md
    - .cursor/rules/00-core-critical.mdc
"""

from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# 공통 Enum 타입
# =============================================================================


class Language(str, Enum):
    """지원 언어 (RULE-006).

    ko/en 혼합 출력 금지. TurnInput.language를 SSOT로 삼아
    모든 UI/내러티브/시스템 메시지는 동일 언어로 고정합니다.
    """

    KO = "ko-KR"
    EN = "en-US"


class Theme(str, Enum):
    """테마 설정."""

    DARK = "dark"
    LIGHT = "light"


class AgentPhase(str, Enum):
    """에이전트 실행 단계 (RULE-008).

    에이전트형 시스템임을 UI로 증명하기 위한 단계 표시.
    """

    PARSE = "parse"
    VALIDATE = "validate"
    PLAN = "plan"
    RESOLVE = "resolve"
    RENDER = "render"
    VERIFY = "verify"
    COMMIT = "commit"


class ValidationBadge(str, Enum):
    """검증 배지 (RULE-008).

    턴 결과에 대한 검증 상태를 표시합니다.
    """

    SCHEMA_OK = "schema_ok"
    SCHEMA_FAIL = "schema_fail"
    ECONOMY_OK = "economy_ok"
    ECONOMY_FAIL = "economy_fail"
    SAFETY_OK = "safety_ok"
    SAFETY_BLOCKED = "safety_blocked"
    CONSISTENCY_OK = "consistency_ok"
    CONSISTENCY_FAIL = "consistency_fail"


class ModelLabel(str, Enum):
    """모델/품질 선택 라벨 (RULE-008).

    프롬프트 노출 없이 "왜 이 선택이었는지"를 사용자 친화 라벨로 표시.
    """

    FAST = "FAST"
    QUALITY = "QUALITY"
    CHEAP = "CHEAP"
    REF = "REF"


class RiskLevel(str, Enum):
    """행동 위험도 수준."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# =============================================================================
# 공통 하위 타입
# =============================================================================

# RULE-009: 좌표는 0~1000 정규화 좌표계 (이미지 이해 bbox 포맷과 호환)
Coordinate = Annotated[int, Field(ge=0, le=1000, description="정규화 좌표 (0~1000)")]


class Box2D(BaseModel):
    """2D 바운딩 박스 (RULE-009).

    좌표는 0~1000 정규화 좌표계이며, bbox는 [ymin, xmin, ymax, xmax] 순서입니다.
    이미지 이해 bbox 포맷과 호환됩니다.

    Attributes:
        ymin: Y 최소값 (상단)
        xmin: X 최소값 (좌측)
        ymax: Y 최대값 (하단)
        xmax: X 최대값 (우측)
    """

    model_config = ConfigDict(extra="forbid")

    ymin: Coordinate
    xmin: Coordinate
    ymax: Coordinate
    xmax: Coordinate


class CurrencyAmount(BaseModel):
    """재화 수량.

    Attributes:
        signal: 기본 재화 (텍스트 턴/이미지 생성/고급 기능에 소비)
        memory_shard: 희귀 재화 (중요 설정 고정, 고해상도 이미지 등에 소비)
    """

    model_config = ConfigDict(extra="forbid")

    signal: Annotated[int, Field(ge=0, description="시그널 (기본 재화, 0 이상)")]
    memory_shard: Annotated[int, Field(ge=0, description="기억 파편 (희귀 재화, 0 이상)")]


# =============================================================================
# TurnInput 관련 타입
# =============================================================================


class ClickInput(BaseModel):
    """클릭 입력 정보.

    화면 오브젝트 클릭 시 전달되는 정보입니다.

    Attributes:
        object_id: 클릭한 오브젝트 ID
        box_2d: 클릭 위치의 바운딩 박스 (선택)
    """

    model_config = ConfigDict(extra="forbid")

    object_id: str = Field(description="클릭한 오브젝트 ID")
    box_2d: Box2D | None = Field(default=None, description="클릭 위치 바운딩 박스 (선택)")


class DropInput(BaseModel):
    """드롭 입력 정보 (U-012).

    인벤토리 아이템을 핫스팟에 드롭할 때 전달되는 정보입니다.

    Attributes:
        item_id: 드롭한 인벤토리 아이템 ID
        target_object_id: 드롭 대상 핫스팟 오브젝트 ID
        target_box_2d: 드롭 대상의 바운딩 박스 (0~1000 정규화)
    """

    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(description="드롭한 인벤토리 아이템 ID")
    target_object_id: str = Field(description="드롭 대상 핫스팟 오브젝트 ID")
    target_box_2d: Box2D = Field(description="드롭 대상의 바운딩 박스 (0~1000 정규화)")


class ClientInfo(BaseModel):
    """클라이언트 정보.

    Attributes:
        viewport_w: 뷰포트 너비 (픽셀)
        viewport_h: 뷰포트 높이 (픽셀)
        theme: 현재 테마 (dark/light)
    """

    model_config = ConfigDict(extra="forbid")

    viewport_w: Annotated[int, Field(gt=0, description="뷰포트 너비 (픽셀)")]
    viewport_h: Annotated[int, Field(gt=0, description="뷰포트 높이 (픽셀)")]
    theme: Theme = Field(default=Theme.DARK, description="현재 테마")


class EconomySnapshot(BaseModel):
    """재화 스냅샷 (클라이언트 → 서버).

    클라이언트가 보유한 현재 재화 상태입니다.
    서버는 이를 검증하고 비용 계산에 사용합니다.

    Attributes:
        signal: 현재 시그널 잔액
        memory_shard: 현재 기억 파편 잔액
    """

    model_config = ConfigDict(extra="forbid")

    signal: Annotated[int, Field(ge=0, description="현재 시그널 잔액 (0 이상)")]
    memory_shard: Annotated[int, Field(ge=0, description="현재 기억 파편 잔액 (0 이상)")]


class TurnInput(BaseModel):
    """턴 입력 (클라이언트 → 서버).

    사용자가 턴을 진행할 때 서버로 전송하는 입력 데이터입니다.

    Attributes:
        language: 요청 언어 (응답도 동일 언어로 고정)
        text: 사용자 자연어 입력
        action_id: 선택한 액션 카드 ID (선택)
        click: 오브젝트 클릭 정보 (선택)
        client: 클라이언트 환경 정보
        economy_snapshot: 현재 재화 상태

    Example:
        >>> input_data = TurnInput(
        ...     language=Language.KO,
        ...     text="문을 열어본다",
        ...     economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
        ...     client=ClientInfo(viewport_w=1920, viewport_h=1080),
        ... )
    """

    model_config = ConfigDict(extra="forbid")

    language: Language = Field(description="요청 언어 (응답도 동일 언어로 고정)")
    text: str = Field(default="", description="사용자 자연어 입력")
    action_id: str | None = Field(default=None, description="선택한 액션 카드 ID (선택)")
    click: ClickInput | None = Field(default=None, description="오브젝트 클릭 정보 (선택)")
    drop: DropInput | None = Field(default=None, description="아이템 드롭 정보 (선택, U-012)")
    client: ClientInfo = Field(description="클라이언트 환경 정보")
    economy_snapshot: EconomySnapshot = Field(description="현재 재화 상태")
    previous_image_url: str | None = Field(
        default=None,
        description="이전 턴 이미지 URL (U-068: 참조 이미지로 사용하여 연속성 유지)",
    )
    scene_context: str | None = Field(
        default=None,
        description=(
            "첫 턴 씬 설명 맥락 (U-133: 사전 생성 이미지의 시각적 요소를 텍스트로 기술). "
            "첫 턴에서만 사용되며, GM이 해당 장면에서 자연스럽게 이야기를 시작하도록 돕는다."
        ),
    )


# =============================================================================
# TurnOutput 관련 타입 - UI
# =============================================================================


class CostEstimate(BaseModel):
    """비용 추정치 (최소/최대 범위)."""

    model_config = ConfigDict(extra="forbid")

    min: CurrencyAmount = Field(description="최소 예상 비용")
    max: CurrencyAmount = Field(description="최대 예상 비용")


class ActionCard(BaseModel):
    """액션 카드 (Action Deck) - U-065 단순화.

    매 턴 AI가 추천하는 행동 카드입니다.
    Gemini Structured Outputs 제한 대응을 위해 핵심 필드만 유지합니다.

    U-065 단순화:
        - 제거된 필드: description, cost_estimate, hint, reward_hint, disabled_reason
        - risk, is_alternative는 유지 (게임 메카닉에 필수)
        - 제거된 정보는 narrative에서 자연어로 표현

    Attributes:
        id: 카드 고유 ID
        label: 카드 라벨 (표시용)
        cost: 예상 비용 (기본)
        risk: 위험도
        enabled: 실행 가능 여부 (서버 판단)
        is_alternative: 저비용 대안 카드 여부
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="카드 고유 ID")
    label: str = Field(description="카드 라벨 (표시용)")
    cost: CurrencyAmount = Field(description="예상 비용 (기본)")
    risk: RiskLevel = Field(default=RiskLevel.LOW, description="위험도")
    enabled: bool = Field(default=True, description="실행 가능 여부 (서버 판단)")
    is_alternative: bool = Field(default=False, description="저비용 대안 카드 여부")


class SceneObject(BaseModel):
    """장면 오브젝트 (클릭 가능한 핫스팟).

    화면에서 클릭 가능한 오브젝트입니다.
    좌표는 0~1000 정규화 좌표계를 사용합니다 (RULE-009).

    Attributes:
        id: 오브젝트 고유 ID
        label: 오브젝트 라벨 (표시용)
        box_2d: 바운딩 박스 [ymin, xmin, ymax, xmax]
        interaction_hint: 상호작용 힌트 (선택)
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="오브젝트 고유 ID")
    label: str = Field(description="오브젝트 라벨 (표시용)")
    box_2d: Box2D = Field(description="바운딩 박스")
    interaction_hint: str | None = Field(default=None, description="상호작용 힌트 (선택)")


class ActionDeck(BaseModel):
    """액션 덱 (Q1 결정: ui.action_deck.cards[] 구조) - U-065 단순화.

    매 턴 AI가 제시하는 추천 행동 카드 덱입니다.

    U-065 단순화:
        - max_length: 10 → 5 (Gemini 스키마 제한 대응, Q2 결정)

    Attributes:
        cards: 액션 카드 목록 (3~5장 권장)
    """

    model_config = ConfigDict(extra="forbid")

    cards: list[ActionCard] = Field(
        default=[],
        min_length=0,
        max_length=5,
        description="액션 카드 목록 (3~5장 권장)",
    )


class UIOutput(BaseModel):
    """UI 출력 데이터 - U-065 단순화.

    AI가 생성한 UI 요소들입니다.
    채팅 버블이 아닌 게임 UI로 표현됩니다 (RULE-002).

    U-065 단순화:
        - objects max_length: 5로 제한 (Q2 결정)

    Attributes:
        action_deck: 액션 카드 덱 (Q1 결정: Option A 채택)
        objects: 클릭 가능한 장면 오브젝트 목록 (최대 5개)
    """

    model_config = ConfigDict(extra="forbid")

    action_deck: ActionDeck = Field(default_factory=ActionDeck, description="액션 카드 덱")
    objects: list[SceneObject] = Field(
        default=[], max_length=5, description="클릭 가능한 장면 오브젝트 목록 (최대 5개)"
    )


# =============================================================================
# TurnOutput 관련 타입 - World
# =============================================================================


class MemoryPin(BaseModel):
    """중요 설정 고정 후보.

    사용자가 Memory Shard를 소비해 고정할 수 있는 중요 설정입니다.

    Attributes:
        id: 핀 고유 ID
        content: 고정할 내용
        cost: 고정에 필요한 비용
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="핀 고유 ID")
    content: str = Field(description="고정할 내용")
    cost: CurrencyAmount = Field(description="고정에 필요한 비용")


class WorldRule(BaseModel):
    """세계 규칙 (Rule Board).

    현재 세계에 적용 중인 물리 법칙이나 메타 규칙입니다.

    Attributes:
        id: 규칙 고유 ID
        label: 규칙 이름
        description: 규칙 상세 설명 (선택)
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="규칙 고유 ID")
    label: str = Field(description="규칙 이름")
    description: str | None = Field(default=None, description="규칙 상세 설명 (선택)")


class Quest(BaseModel):
    """퀘스트/목표 (Quest Panel) - U-078 목표 시스템 강화.

    플레이어가 달성해야 하는 현재 목표입니다.
    is_main=true인 퀘스트가 주 목표(Main Objective)이며,
    나머지는 서브 목표(Sub-objectives)로 표시됩니다.

    Attributes:
        id: 퀘스트 고유 ID
        label: 퀘스트 이름
        is_completed: 달성 여부
        description: 목표 상세 설명 (선택)
        is_main: 주 목표 여부 (true이면 Quest 패널 상단에 강조 표시)
        progress: 진행률 (0~100, 주 목표에서 사용)
        reward_signal: 달성 시 Signal 보상량 (0이면 보상 없음)
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="퀘스트 고유 ID")
    label: str = Field(description="퀘스트 이름")
    is_completed: bool = Field(default=False, description="달성 여부")
    description: str | None = Field(default=None, description="목표 상세 설명 (선택)")
    is_main: bool = Field(default=False, description="주 목표 여부")
    progress: Annotated[int, Field(ge=0, le=100, description="진행률 (0~100)")] = 0
    reward_signal: Annotated[int, Field(ge=0, description="달성 시 Signal 보상량")] = 0


class InventoryItemData(BaseModel):
    """인벤토리 아이템 데이터 (U-075[Mvp]).

    TurnOutput에서 추가되는 아이템의 상세 정보입니다.
    아이콘 URL은 별도 API로 생성됩니다 (Q1: placeholder 먼저 표시).

    Attributes:
        id: 아이템 고유 ID
        label: 아이템 표시 이름 (현재 언어에 맞게)
        description: 아이템 설명 (아이콘 생성용)
        icon_url: 아이콘 URL (선택, 캐시된 경우)
        quantity: 아이템 수량
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="아이템 고유 ID")
    label: str = Field(description="아이템 표시 이름 (현재 언어에 맞게)")
    description: str = Field(default="", description="아이템 설명 (아이콘 생성용)")
    icon_url: str | None = Field(default=None, description="아이콘 URL (선택, 캐시된 경우)")
    quantity: int = Field(default=1, ge=1, description="아이템 수량")


class WorldDelta(BaseModel):
    """세계 상태 변화 (Q2 결정: Option A - delta 중심) - U-065 단순화.

    이번 턴에서 변경된 세계 상태를 나타냅니다.
    snapshot은 SaveGame에만 저장하고, 매 턴은 delta만 전송합니다.

    U-065 단순화 (Q3 결정: Option A):
        - rules_changed, quests_updated → 배열 크기 제한 (최대 3개)
        - memory_pins → 배열 크기 제한 (최대 2개)
        - 복잡한 중첩 객체의 배열 크기 축소
        - 상세 정보는 narrative에서 자연어로 표현

    Attributes:
        rules_changed: 변경되거나 추가된 규칙 목록 (최대 3개)
        inventory_added: 추가된 인벤토리 아이템 (최대 5개)
        inventory_removed: 제거된 인벤토리 아이템 (최대 5개)
        quests_updated: 업데이트된 퀘스트(목표) 목록 (최대 3개)
        relationships_changed: 변경된 관계 (최대 3개)
        memory_pins: 중요 설정 고정 후보 (최대 2개)
    """

    model_config = ConfigDict(extra="forbid")

    rules_changed: list[WorldRule] = Field(
        default=[], max_length=3, description="변경된 규칙 목록 (최대 3개)"
    )
    inventory_added: list[InventoryItemData] = Field(
        default=[], max_length=5, description="추가된 인벤토리 아이템 (최대 5개)"
    )
    inventory_removed: list[str] = Field(
        default=[], max_length=5, description="제거된 인벤토리 아이템 (최대 5개)"
    )
    quests_updated: list[Quest] = Field(
        default=[], max_length=3, description="업데이트된 퀘스트/목표 목록 (최대 3개)"
    )
    relationships_changed: list[str] = Field(
        default=[], max_length=3, description="변경된 관계 (최대 3개)"
    )
    memory_pins: list[MemoryPin] = Field(
        default=[], max_length=2, description="중요 설정 고정 후보 (최대 2개)"
    )


# =============================================================================
# TurnOutput 관련 타입 - Render
# =============================================================================


class ImageJob(BaseModel):
    """이미지 생성 작업 - U-065 단순화.

    조건부 이미지 생성/편집 요청입니다.
    이미지 생성이 느릴 경우 텍스트 우선 출력 + Lazy Loading을 사용합니다.

    U-065 단순화:
        - reference_image_ids: 배열 크기 제한 (최대 2개)
        - 기타 필드는 유지 (이미지 파이프라인 필수)

    Attributes:
        should_generate: 이미지를 생성해야 하는지
        prompt: 이미지 생성 프롬프트
        model_label: 모델 선택 라벨 (FAST/QUALITY/CHEAP/REF)
        aspect_ratio: 가로세로 비율 (예: "16:9", "1:1")
        image_size: 이미지 크기 (예: "1024x1024")
        reference_image_ids: 참조 이미지 ID 목록 (최대 2개)
    """

    model_config = ConfigDict(extra="forbid")

    should_generate: bool = Field(description="이미지를 생성해야 하는지")
    prompt: str = Field(default="", description="이미지 생성 프롬프트")
    model_label: ModelLabel = Field(default=ModelLabel.FAST, description="모델 선택 라벨")
    aspect_ratio: str = Field(default="16:9", description="가로세로 비율")
    image_size: str = Field(default="1024x1024", description="이미지 크기")
    reference_image_ids: list[str] = Field(
        default=[], max_length=2, description="참조 이미지 ID 목록 (최대 2개)"
    )
    reference_image_url: str | None = Field(
        default=None,
        description="참조 이미지 URL (U-068: 이전 턴 이미지를 참조하여 연속성 유지)",
    )


class RenderOutput(BaseModel):
    """렌더링 출력 데이터.

    이미지 생성/편집 관련 정보입니다.
    image_job은 AI 모델이 생성하고, image_url/image_id는 후처리에서 채워집니다.

    Attributes:
        image_job: 이미지 생성 작업 (선택, AI 모델 생성)
        image_url: 생성된 이미지 URL (선택, 후처리에서 채움, U-053)
        image_id: 생성된 이미지 ID (선택, 후처리에서 채움, U-053)
        generation_time_ms: 이미지 생성 소요 시간 (밀리초, 선택, U-053)
    """

    model_config = ConfigDict(extra="forbid")

    image_job: ImageJob | None = Field(default=None, description="이미지 생성 작업 (선택)")
    image_url: str | None = Field(
        default=None, description="생성된 이미지 URL (후처리에서 채움, U-053)"
    )
    image_id: str | None = Field(
        default=None, description="생성된 이미지 ID (후처리에서 채움, U-053)"
    )
    generation_time_ms: int | None = Field(
        default=None, description="이미지 생성 소요 시간 (ms, U-053)"
    )


# =============================================================================
# TurnOutput 관련 타입 - Economy
# =============================================================================


class EconomyOutput(BaseModel):
    """경제 출력 데이터 (RULE-005).

    이번 턴의 비용과 잔액 정보입니다.
    잔액 음수는 절대 불가 (서버 Hard gate).

    Attributes:
        cost: 이번 턴에 소비된 비용
        balance_after: 소비 후 잔액
        credit: 사용 중인 크레딧 (빚, Signal 단위, U-079)
        low_balance_warning: 잔액 부족 경고 여부 (U-079)

    Important:
        - cost와 balance_after는 항상 포함되어야 합니다.
        - balance_after의 signal과 memory_shard는 0 이상이어야 합니다.
    """

    model_config = ConfigDict(extra="forbid")

    cost: CurrencyAmount = Field(description="이번 턴에 소비된 비용")
    balance_after: CurrencyAmount = Field(description="소비 후 잔액")
    credit: int = Field(default=0, description="사용 중인 크레딧 (빚, Signal 단위)")
    low_balance_warning: bool = Field(default=False, description="잔액 부족 경고 여부")


# =============================================================================
# TurnOutput 관련 타입 - Safety
# =============================================================================


class SafetyOutput(BaseModel):
    """안전 출력 데이터.

    안전 정책 관련 정보입니다.
    차단 시 명시적 메시지와 함께 안전한 대체 결과를 제공합니다.

    Attributes:
        blocked: 안전 정책에 의해 차단되었는지
        message: 차단 시 사용자에게 표시할 메시지 (선택)
    """

    model_config = ConfigDict(extra="forbid")

    blocked: bool = Field(default=False, description="안전 정책에 의해 차단되었는지")
    message: str | None = Field(default=None, description="차단 시 사용자에게 표시할 메시지 (선택)")


# =============================================================================
# TurnOutput 관련 타입 - Agent Console
# =============================================================================


class AgentConsole(BaseModel):
    """에이전트 콘솔 데이터 (RULE-008) - U-065 단순화.

    에이전트형 시스템임을 UI로 증명하기 위한 정보입니다.
    계획/실행/검증/복구의 흔적을 표시합니다.

    U-065 단순화:
        - badges: 배열 크기 제한 (최대 4개)

    U-069 추가:
        - model_label: 현재 사용 중인 텍스트 모델 라벨 (FAST/QUALITY)

    Attributes:
        current_phase: 현재 실행 단계
        badges: 검증 배지 목록 (최대 4개)
        repair_count: 자동 복구 시도 횟수
        model_label: 현재 사용 중인 텍스트 모델 라벨 (U-069)
    """

    model_config = ConfigDict(extra="forbid")

    current_phase: AgentPhase = Field(default=AgentPhase.COMMIT, description="현재 실행 단계")
    badges: list[ValidationBadge] = Field(
        default=[], max_length=4, description="검증 배지 목록 (최대 4개)"
    )
    repair_count: Annotated[int, Field(ge=0, description="자동 복구 시도 횟수")] = 0
    model_label: ModelLabel = Field(
        default=ModelLabel.FAST,
        description="현재 사용 중인 텍스트 모델 라벨 (U-069: FAST/QUALITY)",
    )


# =============================================================================
# TurnOutput (메인 응답 스키마)
# =============================================================================


class TurnOutput(BaseModel):
    """턴 출력 (서버 → 클라이언트).

    서버가 턴 처리 후 클라이언트로 반환하는 구조화된 응답입니다.
    Gemini Structured Outputs(JSON Schema)로 강제됩니다.

    Hard Gate 필드 (RULE-003/004/005):
        - economy: cost와 balance_after 필수, 잔액 음수 금지
        - safety: blocked 시 안전한 대체 결과 제공
        - language: 요청 언어와 동일하게 고정 (혼합 출력 금지)

    Attributes:
        language: 응답 언어 (요청과 동일)
        narrative: 내러티브 텍스트 (표시용)
        ui: UI 요소 (액션 덱, 오브젝트)
        world: 세계 상태 변화 (delta 중심)
        render: 렌더링 정보 (이미지 생성 작업)
        economy: 경제 정보 (비용, 잔액)
        safety: 안전 정책 정보
        agent_console: 에이전트 실행 정보 (단계, 배지, 복구 횟수)

    Example:
        >>> output = TurnOutput(
        ...     language=Language.KO,
        ...     narrative="문이 삐걱거리며 열립니다...",
        ...     economy=EconomyOutput(
        ...         cost=CurrencyAmount(signal=5, memory_shard=0),
        ...         balance_after=CurrencyAmount(signal=95, memory_shard=5),
        ...     ),
        ...     safety=SafetyOutput(blocked=False),
        ... )
        >>> schema = TurnOutput.model_json_schema()

    Schema Generation:
        >>> # Gemini Structured Outputs용 JSON Schema 생성
        >>> json_schema = TurnOutput.model_json_schema()
        >>> # response_json_schema 파라미터에 전달
        >>> config = {
        ...     "response_mime_type": "application/json",
        ...     "response_json_schema": json_schema,
        ... }
    """

    model_config = ConfigDict(extra="forbid")

    # 필수 필드 (Hard Gate)
    language: Language = Field(description="응답 언어 (요청과 동일)")
    narrative: str = Field(description="내러티브 텍스트 (표시용)")
    economy: EconomyOutput = Field(description="경제 정보 (비용, 잔액)")
    safety: SafetyOutput = Field(description="안전 정책 정보")

    # UI 관련 필드
    ui: UIOutput = Field(default_factory=UIOutput, description="UI 요소")

    # 세계 상태 필드
    world: WorldDelta = Field(default_factory=WorldDelta, description="세계 상태 변화 (delta)")

    # 렌더링 필드
    render: RenderOutput = Field(default_factory=RenderOutput, description="렌더링 정보")

    # 에이전트 콘솔 필드
    agent_console: AgentConsole = Field(
        default_factory=AgentConsole, description="에이전트 실행 정보"
    )
