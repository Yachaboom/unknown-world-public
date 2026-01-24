"""Unknown World - Repair Loop (제한된 재시도).

스키마/비즈니스 룰 검증 실패 시 자동으로 재시도하는 루프입니다.
max_repair_attempts 내에서 repair 재요청을 수행하고,
최종 실패 시 안전한 폴백으로 종료합니다.

설계 원칙:
    - RULE-004: 검증 실패 시 Repair loop + 안전한 폴백
    - RULE-007/008: 프롬프트 원문/내부 추론 노출 금지, 결과/횟수만 표시

페어링 결정:
    - Q1: max_repair_attempts = 2 (Option A)

참조:
    - vibe/unit-plans/U-018[Mvp].md
    - vibe/unit-results/U-017[Mvp].md
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from unknown_world.config.models import ModelLabel
from unknown_world.models.turn import (
    CurrencyAmount,
    TurnInput,
    TurnOutput,
    ValidationBadge,
)
from unknown_world.orchestrator.fallback import create_safe_fallback
from unknown_world.orchestrator.generate_turn_output import (
    GenerationResult,
    GenerationStatus,
    get_turn_output_generator,
)
from unknown_world.validation.business_rules import (
    BusinessRuleValidationResult,
    validate_business_rules,
)

if TYPE_CHECKING:
    pass

# =============================================================================
# 로거 설정 (프롬프트/내부 추론 노출 금지 - RULE-007/008)
# =============================================================================

logger = logging.getLogger(__name__)


# =============================================================================
# 설정 상수
# =============================================================================

# 페어링 결정: Q1 = Option A (2회)
MAX_REPAIR_ATTEMPTS = 2
"""최대 복구 시도 횟수."""


# =============================================================================
# Repair Loop 결과 타입
# =============================================================================


@dataclass
class RepairLoopResult:
    """Repair Loop 결과.

    Attributes:
        output: 최종 TurnOutput (성공 또는 폴백)
        total_attempts: 총 시도 횟수 (초기 시도 포함)
        repair_attempts: 복구 시도 횟수 (초기 시도 제외)
        is_fallback: 폴백으로 종료되었는지
        badges: 검증 배지 목록
        error_messages: 각 시도의 에러 메시지 (UI 노출용)
    """

    output: TurnOutput
    total_attempts: int = 1
    repair_attempts: int = 0
    is_fallback: bool = False
    badges: list[ValidationBadge] = field(default_factory=lambda: [])
    error_messages: list[str] = field(default_factory=lambda: [])


# =============================================================================
# Repair Loop 함수
# =============================================================================


async def run_repair_loop(
    turn_input: TurnInput,
    *,
    model_label: ModelLabel | None = None,
    world_context: str = "",
    force_mock: bool = False,
    max_attempts: int = MAX_REPAIR_ATTEMPTS,
) -> RepairLoopResult:
    """Repair Loop를 실행합니다.

    초기 생성을 시도하고, 실패 시 max_attempts까지 재시도합니다.
    최종 실패 시 안전한 폴백을 반환합니다.

    Args:
        turn_input: 사용자 턴 입력
        model_label: 사용할 모델 라벨 (None이면 기본값 FAST)
        world_context: 현재 세계 상태 요약 (선택)
        force_mock: Mock 클라이언트 강제 사용 여부
        max_attempts: 최대 복구 시도 횟수

    Returns:
        RepairLoopResult: 최종 결과 (성공 또는 폴백)

    Example:
        >>> result = await run_repair_loop(turn_input)
        >>> if result.is_fallback:
        ...     print(f"폴백으로 종료 (시도: {result.repair_attempts})")
        >>> print(result.output.narrative)
    """
    generator = get_turn_output_generator(force_mock=force_mock)
    economy_snapshot = CurrencyAmount(
        signal=turn_input.economy_snapshot.signal,
        memory_shard=turn_input.economy_snapshot.memory_shard,
    )

    error_messages: list[str] = []
    badges: list[ValidationBadge] = []
    repair_context = ""  # 재시도 시 추가할 컨텍스트

    last_attempt = 0
    for attempt in range(max_attempts + 1):  # 0 = 초기 시도, 1~max = 복구 시도
        badges = []  # 매 시도마다 배지 초기화 (최종 시도 상태만 유지)
        last_attempt = attempt
        is_repair = attempt > 0

        # 로그 기록 (프롬프트 노출 금지)
        logger.info(
            "[RepairLoop] 시도",
            extra={
                "attempt": attempt,
                "is_repair": is_repair,
                "language": turn_input.language.value,
            },
        )

        # 컨텍스트 구성 (복구 시 에러 요약 추가)
        current_context = world_context
        if is_repair and repair_context:
            current_context = f"{world_context}\n\n{repair_context}"

        # 생성 시도
        gen_result = await generator.generate(
            turn_input,
            model_label=model_label,
            world_context=current_context,
        )

        # 1. 스키마 검증 실패 (JSON 파싱/Pydantic 실패)
        if gen_result.status == GenerationStatus.SCHEMA_FAILURE:
            badges.append(ValidationBadge.SCHEMA_FAIL)
            error_messages.append(gen_result.error_message)
            repair_context = _build_repair_context_schema(gen_result)
            continue

        # 2. API 에러
        if gen_result.status == GenerationStatus.API_ERROR:
            badges.append(ValidationBadge.SCHEMA_FAIL)
            error_messages.append(gen_result.error_message)
            # API 에러는 재시도해도 동일한 결과일 가능성이 높음
            # 하지만 일시적 오류일 수 있으므로 재시도 허용
            repair_context = ""
            continue

        # 3. 스키마 검증 성공 → 비즈니스 룰 검증
        if gen_result.status == GenerationStatus.SUCCESS and gen_result.output:
            badges.append(ValidationBadge.SCHEMA_OK)

            # 비즈니스 룰 검증
            biz_result = validate_business_rules(turn_input, gen_result.output)

            if biz_result.is_valid:
                # 모든 검증 통과
                badges.extend(
                    [
                        ValidationBadge.ECONOMY_OK,
                        ValidationBadge.SAFETY_OK,
                        ValidationBadge.CONSISTENCY_OK,
                    ]
                )

                # 서버 검증 결과로 업데이트 (RULE-003/004/008)
                gen_result.output.agent_console.badges = badges
                gen_result.output.agent_console.repair_count = attempt

                logger.info(
                    "[RepairLoop] 성공",
                    extra={
                        "total_attempts": attempt + 1,
                        "repair_attempts": attempt,
                    },
                )

                return RepairLoopResult(
                    output=gen_result.output,
                    total_attempts=attempt + 1,
                    repair_attempts=attempt,
                    is_fallback=False,
                    badges=badges,
                    error_messages=error_messages,
                )

            # 비즈니스 룰 실패
            add_business_badges(biz_result, badges)
            error_messages.append(biz_result.error_summary)
            repair_context = _build_repair_context_business(biz_result)
            continue

        # 4. 안전 차단
        if gen_result.status == GenerationStatus.SAFETY_BLOCKED:
            badges.append(ValidationBadge.SAFETY_BLOCKED)
            # 안전 차단은 재시도 불가 → 즉시 폴백
            logger.warning(
                "[RepairLoop] 안전 차단으로 폴백",
                extra={"attempt": attempt},
            )
            break

    # 최종 실패 → 안전한 폴백 반환
    logger.warning(
        "[RepairLoop] 최종 폴백 반환",
        extra={
            "max_attempts": max_attempts,
            "actual_attempts": last_attempt,
        },
    )

    fallback = create_safe_fallback(
        language=turn_input.language,
        economy_snapshot=economy_snapshot,
        repair_count=last_attempt,
        is_blocked=ValidationBadge.SAFETY_BLOCKED in badges,
    )

    return RepairLoopResult(
        output=fallback,
        total_attempts=last_attempt + 1,
        repair_attempts=last_attempt,
        is_fallback=True,
        badges=badges,
        error_messages=error_messages,
    )


# =============================================================================
# 헬퍼 함수
# =============================================================================


def _build_repair_context_schema(gen_result: GenerationResult) -> str:
    """스키마 실패에 대한 Repair 컨텍스트를 구성합니다.

    프롬프트 원문/상세 오류는 노출하지 않고, 간단한 지시만 포함합니다.
    """
    # 짧은 요약만 포함 (RULE-007/008)
    return """
## 이전 시도 결과

응답 형식이 올바르지 않았습니다.
TurnOutput JSON Schema를 정확히 준수하여 다시 생성하세요.
"""


def _build_repair_context_business(biz_result: BusinessRuleValidationResult) -> str:
    """비즈니스 룰 실패에 대한 Repair 컨텍스트를 구성합니다."""
    return f"""
## 이전 시도 결과

{biz_result.error_summary}

위 규칙을 준수하여 다시 생성하세요.
"""


def add_business_badges(
    biz_result: BusinessRuleValidationResult,
    badges: list[ValidationBadge],
) -> None:
    """비즈니스 룰 검증 결과에 따라 배지를 추가합니다.

    에러 타입 접두어 → 배지 매핑:
        - economy_* → ECONOMY_FAIL
        - safety_* → SAFETY_BLOCKED
        - language_* 또는 box2d_* → CONSISTENCY_FAIL

    RU-005-S1: consistency 에러가 누락되지 않도록 매핑을 완전하게 구현.

    Args:
        biz_result: 비즈니스 룰 검증 결과
        badges: 배지 목록 (in-place 수정)
    """
    # 에러 타입별 배지 매핑 (RU-005-S1)
    has_economy_error = any("economy" in err["type"] for err in biz_result.errors)
    has_safety_error = any("safety" in err["type"] for err in biz_result.errors)
    has_consistency_error = any(
        "language" in err["type"] or "box2d" in err["type"] for err in biz_result.errors
    )

    # Economy 배지
    if has_economy_error:
        badges.append(ValidationBadge.ECONOMY_FAIL)
    else:
        badges.append(ValidationBadge.ECONOMY_OK)

    # Safety 배지
    if has_safety_error:
        badges.append(ValidationBadge.SAFETY_BLOCKED)
    else:
        badges.append(ValidationBadge.SAFETY_OK)

    # Consistency 배지 (RU-005-S1: 언어/좌표 규약 위반 표시)
    if has_consistency_error:
        badges.append(ValidationBadge.CONSISTENCY_FAIL)
    else:
        badges.append(ValidationBadge.CONSISTENCY_OK)
