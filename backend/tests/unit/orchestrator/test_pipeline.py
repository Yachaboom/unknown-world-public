"""Unknown World - Pipeline 단위/통합 테스트.

RU-005[Mvp] 리팩토링 검증:
    - Stage 기반 모듈화 동작 보존
    - PipelineContext 상태 전이 확인
    - 이벤트 emit 순서 및 정합성 (RULE-008)
    - U-018 비즈니스 룰 검증 및 Repair 루프 통합 확인
"""

from unittest.mock import AsyncMock, patch

import pytest

from unknown_world.models.turn import (
    AgentPhase,
    ClientInfo,
    EconomySnapshot,
    Language,
    Theme,
    TurnInput,
    TurnOutput,
    ValidationBadge,
)
from unknown_world.orchestrator.pipeline import (
    create_pipeline_context,
    run_pipeline,
)
from unknown_world.orchestrator.stages.types import (
    PipelineEvent,
    PipelineEventType,
)


@pytest.fixture
def turn_input() -> TurnInput:
    """기본 턴 입력 픽스처."""
    return TurnInput(
        language=Language.KO,
        text="문을 열어본다",
        client=ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )


def test_create_pipeline_context(turn_input):
    """컨텍스트 초기화 검증."""
    ctx = create_pipeline_context(turn_input, seed=42, is_mock=True)

    assert ctx.turn_input == turn_input
    assert ctx.economy_snapshot.signal == 100
    assert ctx.economy_snapshot.memory_shard == 5
    assert ctx.is_mock is True
    assert ctx.seed == 42
    assert ctx.output is None
    assert ctx.badges == []


@pytest.mark.asyncio
async def test_run_pipeline_happy_path_mock(turn_input):
    """Mock 모드에서 정상적인 파이프라인 실행 확인 (Happy Path)."""
    ctx = create_pipeline_context(turn_input, seed=42, is_mock=True)
    events = []

    async def emit(event: PipelineEvent):
        events.append(event)

    ctx = await run_pipeline(ctx, emit=emit)

    # 1. 최종 결과 확인
    assert ctx.output is not None
    assert isinstance(ctx.output, TurnOutput)
    assert ctx.is_fallback is False
    assert ctx.repair_attempts == 0

    # 2. 이벤트 순서 확인 (일부 핵심 단계만)
    event_types = [e.event_type for e in events]
    phases = [e.phase for e in events if e.phase is not None]

    assert PipelineEventType.STAGE_START in event_types
    assert PipelineEventType.STAGE_COMPLETE in event_types
    assert PipelineEventType.BADGES in event_types

    # PRD 순서: Parse -> Validate -> ... -> Commit
    assert AgentPhase.PARSE in phases
    assert AgentPhase.VALIDATE in phases
    assert AgentPhase.COMMIT in phases

    # 3. 배지 확인
    badges_events = [e for e in events if e.event_type == PipelineEventType.BADGES]
    assert len(badges_events) > 0
    assert ValidationBadge.SCHEMA_OK in badges_events[0].badges


@pytest.mark.asyncio
async def test_run_pipeline_validation_failure_repair_mock(turn_input):
    """비즈니스 룰 위반 시 Repair 루프 발생 확인 (Mock)."""
    ctx = create_pipeline_context(turn_input, seed=42, is_mock=True)
    events = []

    async def emit(event: PipelineEvent):
        events.append(event)

    # validate_business_rules를 모킹하여 첫 번째 시도에서 실패하게 함
    with patch(
        "unknown_world.orchestrator.stages.validate.validate_business_rules"
    ) as mock_validate:
        from unknown_world.validation.business_rules import BusinessRuleValidationResult

        mock_validate.side_effect = [
            BusinessRuleValidationResult(
                is_valid=False, errors=[{"type": "economy_insufficient", "message": "error"}]
            ),
            BusinessRuleValidationResult(is_valid=True, errors=[]),
        ]

        ctx = await run_pipeline(ctx, emit=emit)

    # Repair 이벤트가 발생했는지 확인
    repair_events = [e for e in events if e.event_type == PipelineEventType.REPAIR]
    assert len(repair_events) == 1
    assert repair_events[0].repair_attempt == 1
    assert ctx.repair_attempts == 1
    assert ctx.is_fallback is False


@pytest.mark.asyncio
async def test_run_pipeline_exception_fallback(turn_input):
    """스테이지 실행 중 예외 발생 시 폴백 확인."""
    ctx = create_pipeline_context(turn_input, is_mock=True)

    async def emit(event: PipelineEvent):
        pass

    # 예외를 던지는 가짜 스테이지
    async def failing_stage(c, *, emit):
        raise RuntimeError("Unexpected error")

    # 가짜 스테이지를 직접 전달하여 실행
    ctx = await run_pipeline(ctx, emit=emit, stages=[failing_stage])

    assert ctx.is_fallback is True
    assert ctx.output is not None
    assert "혼란스러운 순간" in ctx.output.narrative
    # 폴백 시 비용 0 확인 (RULE-005)
    assert ctx.output.economy.cost.signal == 0
    assert ctx.output.economy.balance_after.signal == 100


@pytest.mark.asyncio
async def test_validate_stage_real_delegation(turn_input):
    """validate_stage가 Real 모드에서 run_repair_loop를 호출하는지 확인."""
    from unknown_world.models.turn import AgentConsole, TurnOutput
    from unknown_world.orchestrator.repair_loop import RepairLoopResult
    from unknown_world.orchestrator.stages.validate import validate_stage

    ctx = create_pipeline_context(turn_input, is_mock=False)
    events = []

    async def emit(event: PipelineEvent):
        events.append(event)

    # 실제 객체 생성 후 필요한 필드만 모킹
    mock_output = AsyncMock(spec=TurnOutput)
    # dataclass 필드들에 대한 attribute 에러 방지를 위해 수동 설정
    mock_output.agent_console = AgentConsole(
        badges=[ValidationBadge.SCHEMA_OK], current_phase=AgentPhase.VALIDATE
    )

    with patch("unknown_world.orchestrator.stages.validate.run_repair_loop") as mock_run:
        mock_run.return_value = RepairLoopResult(
            output=mock_output,
            repair_attempts=1,
            is_fallback=False,
            badges=[ValidationBadge.SCHEMA_OK],
            error_messages=["repair test"],
        )

        ctx = await validate_stage(ctx, emit=emit)

    assert mock_run.called
    assert ctx.repair_attempts == 1
    assert PipelineEventType.REPAIR in [e.event_type for e in events]
    assert ctx.output == mock_output


@pytest.mark.asyncio
async def test_validate_stage_mock_max_retries_fallback(turn_input):
    """Mock 모드에서 최대 재시도 횟수 초과 시 폴백 확인."""
    from unknown_world.orchestrator.repair_loop import MAX_REPAIR_ATTEMPTS
    from unknown_world.orchestrator.stages.validate import validate_stage

    ctx = create_pipeline_context(turn_input, seed=42, is_mock=True)
    events = []

    async def emit(event: PipelineEvent):
        events.append(event)

    # 항상 실패하는 비즈니스 룰 검증 결과 반환
    with patch(
        "unknown_world.orchestrator.stages.validate.validate_business_rules"
    ) as mock_validate:
        from unknown_world.validation.business_rules import BusinessRuleValidationResult

        mock_validate.return_value = BusinessRuleValidationResult(
            is_valid=False, errors=[{"type": "economy_insufficient", "message": "error"}]
        )

        ctx = await validate_stage(ctx, emit=emit)

    assert ctx.is_fallback is True
    assert ctx.repair_attempts == MAX_REPAIR_ATTEMPTS + 1  # 0회차 + 1회차 + 2회차 시도 후 실패
    assert ValidationBadge.ECONOMY_FAIL in ctx.badges
    assert ctx.output.economy.cost.signal == 0


@pytest.mark.asyncio
async def test_validate_stage_mock_unexpected_exception(turn_input):
    """Mock 검증 루프 내에서 예외 발생 시 폴백 확인."""
    from unknown_world.orchestrator.stages.validate import validate_stage

    ctx = create_pipeline_context(turn_input, seed=42, is_mock=True)
    events = []

    async def emit(event: PipelineEvent):
        events.append(event)

    # generate_turn_output 호출 시 예외 발생
    with patch(
        "unknown_world.orchestrator.mock.MockOrchestrator.generate_turn_output",
        side_effect=RuntimeError("Mock error"),
    ):
        ctx = await validate_stage(ctx, emit=emit)

    assert ctx.is_fallback is True
    # _validate_mock 내부 try-except 루프가 MAX_REPAIR_ATTEMPTS만큼 돌고 결국 폴백
    assert ctx.repair_attempts > 0
