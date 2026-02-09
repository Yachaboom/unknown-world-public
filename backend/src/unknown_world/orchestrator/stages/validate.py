"""Unknown World - Validate Stage.

비즈니스 룰 검증 + Repair loop 단계입니다.
U-018의 run_repair_loop()를 호출해 output/badges/repair_count를 결정합니다.

설계 원칙:
    - RULE-003: 구조화 출력(JSON Schema) + 이중 검증
    - RULE-004: 검증 실패 시 Repair loop + 안전한 폴백
    - RULE-005: 재화 인바리언트 (잔액 음수 금지)
    - RULE-008: 단계/배지 가시화

참조:
    - vibe/refactors/RU-005-Q4.md
    - vibe/unit-plans/U-018[Mvp].md
"""

from __future__ import annotations

import logging

from unknown_world.models.turn import AgentPhase, Language, ValidationBadge
from unknown_world.orchestrator.fallback import create_safe_fallback
from unknown_world.orchestrator.mock import MockOrchestrator
from unknown_world.orchestrator.repair_loop import (
    MAX_REPAIR_ATTEMPTS,
    add_business_badges,
    run_repair_loop,
)
from unknown_world.orchestrator.stages.types import (
    EmitFn,
    PipelineContext,
    PipelineEvent,
    PipelineEventType,
)
from unknown_world.validation.business_rules import validate_business_rules

logger = logging.getLogger(__name__)


async def validate_stage(ctx: PipelineContext, *, emit: EmitFn) -> PipelineContext:
    """Validate 단계를 실행합니다.

    Mock 모드와 Real 모드를 구분하여 처리합니다.
    - Mock: MockOrchestrator로 생성 + 비즈니스 룰 검증
    - Real: run_repair_loop() 호출 (Gemini API + Repair loop)

    Args:
        ctx: 파이프라인 컨텍스트
        emit: 이벤트 emit 콜백

    Returns:
        업데이트된 컨텍스트 (output, badges, repair_attempts 포함)
    """
    ctx.current_phase = AgentPhase.VALIDATE

    # Stage 시작 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_START,
            phase=AgentPhase.VALIDATE,
        )
    )

    try:
        if ctx.is_mock:
            await _validate_mock(ctx, emit)
        else:
            await _validate_real(ctx, emit)
    except Exception as e:
        # 예외 발생 시 폴백 (RULE-004, RU-005-S1)
        logger.exception(f"[Validate] Exception during validation: {e}")
        ctx.output = create_safe_fallback(
            language=ctx.turn_input.language,
            economy_snapshot=ctx.economy_snapshot,
            repair_count=ctx.repair_attempts,
        )
        ctx.is_fallback = True
        # RU-005-S1: 폴백의 배지를 스트림 이벤트와 동기화
        ctx.badges = list(ctx.output.agent_console.badges)

    # Stage 완료 이벤트
    await emit(
        PipelineEvent(
            event_type=PipelineEventType.STAGE_COMPLETE,
            phase=AgentPhase.VALIDATE,
        )
    )

    # 배지 이벤트 전송
    if ctx.badges:
        await emit(
            PipelineEvent(
                event_type=PipelineEventType.BADGES,
                badges=ctx.badges,
            )
        )

    return ctx


async def _validate_mock(ctx: PipelineContext, emit: EmitFn) -> None:
    """Mock 모드 검증을 수행합니다."""
    orchestrator = MockOrchestrator(seed=ctx.seed)
    repair_attempt = 0

    while repair_attempt <= MAX_REPAIR_ATTEMPTS:
        # 0회차는 정상 시도, 1회차부터는 repair
        if repair_attempt > 0:
            await emit(
                PipelineEvent(
                    event_type=PipelineEventType.REPAIR,
                    repair_attempt=repair_attempt,
                    repair_message=(
                        "검증 실패로 인해 다시 시도 중입니다..."
                        if ctx.turn_input.language == Language.KO
                        else "Retrying due to validation failure..."
                    ),
                )
            )
            ctx.repair_messages.append(
                "검증 실패로 인해 다시 시도 중입니다..."
                if ctx.turn_input.language == Language.KO
                else "Retrying due to validation failure..."
            )

        try:
            # Mock 생성
            turn_output = orchestrator.generate_turn_output(ctx.turn_input)

            # 비즈니스 룰 검증 (U-018)
            biz_result = validate_business_rules(ctx.turn_input, turn_output)
            if not biz_result.is_valid:
                # 비즈니스 룰 실패 → 재시도
                repair_attempt += 1
                ctx.repair_attempts = repair_attempt
                if repair_attempt > MAX_REPAIR_ATTEMPTS:
                    # 최종 실패 시 폴백 (RULE-004, RU-005-S1)
                    ctx.output = create_safe_fallback(
                        language=ctx.turn_input.language,
                        economy_snapshot=ctx.economy_snapshot,
                        repair_count=repair_attempt,
                    )
                    ctx.is_fallback = True
                    # RU-005-S1: 비즈니스 룰 실패 배지를 정확히 설정하고
                    # output과 ctx 배지를 동기화
                    failure_badges: list[ValidationBadge] = [ValidationBadge.SCHEMA_OK]
                    add_business_badges(biz_result, failure_badges)
                    ctx.output.agent_console.badges = failure_badges
                    ctx.badges = list(failure_badges)
                    return
                continue

            # 모든 검증 통과
            ctx.output = turn_output
            ctx.badges = [
                ValidationBadge.SCHEMA_OK,
                ValidationBadge.ECONOMY_OK,
                ValidationBadge.SAFETY_OK,
                ValidationBadge.CONSISTENCY_OK,
            ]
            ctx.repair_attempts = repair_attempt
            return

        except Exception as e:
            logger.warning(f"[Validate] Mock validation exception (attempt {repair_attempt}): {e}")
            repair_attempt += 1
            ctx.repair_attempts = repair_attempt
            if repair_attempt > MAX_REPAIR_ATTEMPTS:
                # 최종 실패 시 폴백 (RULE-004, RU-005-S1)
                ctx.output = create_safe_fallback(
                    language=ctx.turn_input.language,
                    economy_snapshot=ctx.economy_snapshot,
                    repair_count=repair_attempt,
                )
                ctx.is_fallback = True
                # RU-005-S1: 폴백의 배지를 스트림 이벤트와 동기화
                ctx.badges = list(ctx.output.agent_console.badges)
                return
            continue

    # 루프 종료 시에도 폴백 (RU-005-S1)
    ctx.output = create_safe_fallback(
        language=ctx.turn_input.language,
        economy_snapshot=ctx.economy_snapshot,
        repair_count=repair_attempt,
    )
    ctx.is_fallback = True
    # RU-005-S1: 폴백의 배지를 스트림 이벤트와 동기화
    ctx.badges = list(ctx.output.agent_console.badges)


async def _validate_real(ctx: PipelineContext, emit: EmitFn) -> None:
    """Real 모드 검증을 수행합니다 (Gemini API + Repair loop).

    U-127: 대화 히스토리를 repair_loop에 전달하고, Thought Signature를 추적합니다.
    """
    # U-127: 대화 히스토리를 repair_loop에 전달
    result = await run_repair_loop(
        ctx.turn_input,
        conversation_history=ctx.conversation_history,
    )

    # Repair 이벤트 송출 (시도가 있었다면)
    for i in range(result.repair_attempts):
        message = result.error_messages[i] if i < len(result.error_messages) else ""
        await emit(
            PipelineEvent(
                event_type=PipelineEventType.REPAIR,
                repair_attempt=i + 1,
                repair_message=message[:100] if message else None,
            )
        )
        if message:
            ctx.repair_messages.append(message[:100])

    ctx.output = result.output
    ctx.badges = list(result.badges)
    ctx.repair_attempts = result.repair_attempts
    ctx.is_fallback = result.is_fallback
    # U-130: rate limit 상태 전파
    ctx.is_rate_limited = result.is_rate_limited

    # U-127: Thought Signature 저장 (파이프라인 종료 시 히스토리에 기록)
    ctx.thought_signature = result.thought_signature

    # U-069: 모델 티어링 정보 전달 (PipelineContext + TurnOutput)
    # U-136: ModelLabel SSOT 통합으로 config.models.ModelLabel = models.turn.ModelLabel
    # 별도 변환 불필요 (동일 클래스)
    ctx.model_label = result.model_label
    ctx.cost_multiplier = result.cost_multiplier
    if ctx.output:
        ctx.output.agent_console.model_label = result.model_label
