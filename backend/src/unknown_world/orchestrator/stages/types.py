"""Unknown World - Pipeline Stage 타입 정의.

Pipeline에서 사용하는 컨텍스트와 emit 콜백 인터페이스를 정의합니다.

설계 원칙:
    - Option A (RU-005 Q1 결정): 클래스 도입 없이 함수 체인 방식
    - 레이어링 보호: 오케스트레이터가 FastAPI에 직접 의존하지 않도록 emit 콜백 사용
    - RULE-007/008: 프롬프트/내부 추론 노출 금지, 단계/배지만 표시
    - U-051: 이미지 생성 서비스 의존성 주입 (순환 의존 방지를 위해 TYPE_CHECKING 활용)
    - U-127: 멀티턴 대화 히스토리 전달 경로

참조:
    - vibe/refactors/RU-005-Q4.md
    - vibe/unit-results/U-018[Mvp].md
    - vibe/unit-results/U-019[Mvp].md
    - vibe/unit-plans/U-127[Mvp].md
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any, Protocol

from unknown_world.models.turn import (
    AgentPhase,
    CurrencyAmount,
    ModelLabel,
    TurnInput,
    TurnOutput,
    ValidationBadge,
)

if TYPE_CHECKING:
    from unknown_world.orchestrator.conversation_history import ConversationHistory
    from unknown_world.services.image_generation import ImageGeneratorType

# =============================================================================
# Emit 콜백 타입 (오케스트레이터 → API 레이어)
# =============================================================================


class PipelineEventType(str, Enum):
    """파이프라인 이벤트 타입.

    오케스트레이터가 API 레이어로 전달하는 도메인 이벤트 타입입니다.
    API 레이어는 이를 StageEvent/BadgesEvent/RepairEvent 등으로 변환합니다.
    """

    STAGE_START = "stage_start"
    STAGE_COMPLETE = "stage_complete"
    STAGE_FAIL = "stage_fail"
    BADGES = "badges"
    REPAIR = "repair"
    NARRATIVE_DELTA = "narrative_delta"


@dataclass
class PipelineEvent:
    """파이프라인 이벤트.

    오케스트레이터가 emit 콜백으로 전달하는 도메인 이벤트입니다.
    API 레이어에서 스트림 이벤트로 변환됩니다.

    Attributes:
        event_type: 이벤트 타입
        phase: 관련 단계 (stage 이벤트용)
        badges: 배지 목록 (badges 이벤트용)
        repair_attempt: 복구 시도 횟수 (repair 이벤트용)
        repair_message: 복구 메시지 (repair 이벤트용)
        text: 텍스트 (narrative_delta 이벤트용)
        extra: 추가 데이터
    """

    event_type: PipelineEventType
    phase: AgentPhase | None = None
    badges: list[ValidationBadge] | None = None
    repair_attempt: int = 0
    repair_message: str | None = None
    text: str | None = None
    extra: dict[str, Any] = field(default_factory=lambda: {})


# Emit 함수 타입: async callable로 도메인 이벤트를 전달
EmitFn = Callable[[PipelineEvent], Awaitable[None]]


# =============================================================================
# Pipeline Context
# =============================================================================


@dataclass
class PipelineContext:
    """파이프라인 컨텍스트.

    Stage 함수들이 공유하는 컨텍스트입니다.
    각 stage는 ctx를 받아 수정하고 반환합니다 (Option A: 함수 체인).

    Attributes:
        turn_input: 사용자 턴 입력
        economy_snapshot: 요청 시점 재화 스냅샷 (폴백 시 보존용)
        output: 생성된 TurnOutput (validate stage 이후)
        badges: 현재까지 수집된 배지 목록
        repair_messages: 복구 시도 시 발생한 메시지 목록
        repair_attempts: 복구 시도 횟수
        current_phase: 현재 단계
        is_fallback: 폴백으로 종료되었는지
        is_mock: Mock 모드인지
        seed: Mock 모드 시드 (재현성 보장)
        image_generator: 이미지 생성 서비스 (U-051, 선택적 주입)
            None이면 이미지 생성을 건너뛰고 pass-through로 동작합니다.
            테스트 시 MockImageGenerator를 주입하여 실제 API 호출 없이 검증 가능합니다.
        model_label: 현재 사용 중인 텍스트 모델 라벨 (U-069: FAST/QUALITY)
        cost_multiplier: 비용 배수 (U-069: FAST=1.0, QUALITY=2.0)
        conversation_history: 멀티턴 대화 히스토리 (U-127, 선택적 주입)
        thought_signature: 현재 턴의 Thought Signature (U-127, validate 후 설정)
    """

    turn_input: TurnInput
    economy_snapshot: CurrencyAmount
    output: TurnOutput | None = None
    badges: list[ValidationBadge] = field(default_factory=lambda: [])
    repair_messages: list[str] = field(default_factory=lambda: [])
    repair_attempts: int = 0
    current_phase: AgentPhase = AgentPhase.PARSE
    is_fallback: bool = False
    is_mock: bool = False
    seed: int | None = None
    image_generator: ImageGeneratorType | None = None
    model_label: ModelLabel = ModelLabel.FAST
    cost_multiplier: float = 1.0
    conversation_history: ConversationHistory | None = None
    thought_signature: str | None = None


# =============================================================================
# Stage 함수 타입
# =============================================================================


class StageFn(Protocol):
    """Stage 함수 프로토콜.

    각 stage 함수는 이 프로토콜을 따릅니다.
    ctx를 받아 수정하고 반환하며, emit 콜백으로 이벤트를 전달합니다.
    """

    async def __call__(self, ctx: PipelineContext, *, emit: EmitFn) -> PipelineContext: ...
