"""Unknown World - Repair Loop (제한된 재시도).

스키마/비즈니스 룰 검증 실패 시 자동으로 재시도하는 루프입니다.
max_repair_attempts 내에서 repair 재요청을 수행하고,
최종 실패 시 안전한 폴백으로 종료합니다.

U-127 변경:
    - 멀티턴 대화 히스토리 전달 지원
    - Pro→Flash 모델 폴백 (API 에러 시 자동 전환)
    - Thought Signature 추적

설계 원칙:
    - RULE-004: 검증 실패 시 Repair loop + 안전한 폴백
    - RULE-007/008: 프롬프트 원문/내부 추론 노출 금지, 결과/횟수만 표시

페어링 결정:
    - Q1: max_repair_attempts = 2 (Option A)

참조:
    - vibe/unit-plans/U-018[Mvp].md
    - vibe/unit-plans/U-127[Mvp].md
    - vibe/unit-results/U-017[Mvp].md
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from unknown_world.config.models import MODEL_FALLBACK_LABEL, ModelLabel
from unknown_world.models.turn import (
    CurrencyAmount,
    Language,
    TurnInput,
    TurnOutput,
    ValidationBadge,
)
from unknown_world.orchestrator.conversation_history import ConversationHistory
from unknown_world.orchestrator.fallback import create_safe_fallback
from unknown_world.orchestrator.generate_turn_output import (
    GenerationResult,
    GenerationStatus,
    TurnOutputGenerator,
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
# i18n Repair 컨텍스트 메시지 (RULE-006, RU-005-S2)
# =============================================================================

REPAIR_CONTEXT_MESSAGES: dict[Language, dict[str, str]] = {
    Language.KO: {
        "schema_header": "## 이전 시도 결과",
        "schema_error": "응답 형식이 올바르지 않았습니다.",
        "schema_instruction": "TurnOutput JSON Schema를 정확히 준수하여 다시 생성하세요.",
        "business_header": "## 이전 시도 결과",
        "business_instruction": "위 규칙을 준수하여 다시 생성하세요.",
        # U-043: 언어 교정 전용 피드백
        "language_header": "## 언어 혼합 오류",
        "language_instruction": (
            "사용자 노출 텍스트에 영어가 섞여 있습니다. "
            "모든 텍스트를 한국어(ko-KR)로만 작성하세요. "
            "스키마 구조는 유지하고 텍스트 값만 한국어로 수정합니다. "
            "예외: Signal, Shard 등 재화 이름은 영어로 유지 가능합니다."
        ),
    },
    Language.EN: {
        "schema_header": "## Previous Attempt Result",
        "schema_error": "The response format was invalid.",
        "schema_instruction": "Please regenerate following the TurnOutput JSON Schema exactly.",
        "business_header": "## Previous Attempt Result",
        "business_instruction": "Please regenerate following the rules above.",
        # U-043: 언어 교정 전용 피드백
        "language_header": "## Language Mixing Error",
        "language_instruction": (
            "User-facing text contains Korean characters. "
            "Rewrite all text in English (en-US) only. "
            "Keep the schema structure intact and only modify text values to English. "
            "Exception: Currency names like Signal, Shard may remain in English."
        ),
    },
}


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
        model_label: 사용된 텍스트 모델 라벨 (U-069: FAST/QUALITY)
        cost_multiplier: 비용 배수 (U-069: FAST=1.0, QUALITY=2.0)
        thought_signature: Gemini 3 Thought Signature (U-127). 히스토리에 저장.
    """

    output: TurnOutput
    total_attempts: int = 1
    repair_attempts: int = 0
    is_fallback: bool = False
    is_rate_limited: bool = False
    badges: list[ValidationBadge] = field(default_factory=lambda: [])
    error_messages: list[str] = field(default_factory=lambda: [])
    model_label: ModelLabel = ModelLabel.FAST
    cost_multiplier: float = 1.0
    thought_signature: str | None = None


# =============================================================================
# Repair Loop 함수
# =============================================================================


async def run_repair_loop(
    turn_input: TurnInput,
    *,
    world_context: str = "",
    conversation_history: ConversationHistory | None = None,
    force_mock: bool = False,
    max_attempts: int = MAX_REPAIR_ATTEMPTS,
) -> RepairLoopResult:
    """Repair Loop를 실행합니다.

    초기 생성을 시도하고, 실패 시 max_attempts까지 재시도합니다.
    최종 실패 시 안전한 폴백을 반환합니다.

    U-127 변경:
        - 멀티턴 대화 히스토리 전달 (conversation_history)
        - API 에러 시 Pro→Flash 모델 자동 폴백
        - Thought Signature 추적 (RepairLoopResult에 포함)

    Args:
        turn_input: 사용자 턴 입력
        world_context: 현재 세계 상태 요약 (선택)
        conversation_history: 멀티턴 대화 히스토리 (U-127, 선택)
        force_mock: Mock 클라이언트 강제 사용 여부
        max_attempts: 최대 복구 시도 횟수

    Returns:
        RepairLoopResult: 최종 결과 (성공 또는 폴백, 모델 라벨/비용 배수 포함)

    Example:
        >>> result = await run_repair_loop(turn_input, conversation_history=history)
        >>> if result.is_fallback:
        ...     print(f"폴백으로 종료 (시도: {result.repair_attempts})")
        >>> print(f"사용 모델: {result.model_label}, 비용 배수: {result.cost_multiplier}")
        >>> print(result.output.narrative)
    """
    generator = get_turn_output_generator(force_mock=force_mock)
    # U-127: Flash 폴백용 생성기 (Pro API 에러 시 사용)
    fallback_generator: TurnOutputGenerator | None = None

    economy_snapshot = CurrencyAmount(
        signal=turn_input.economy_snapshot.signal,
        memory_shard=turn_input.economy_snapshot.memory_shard,
    )

    error_messages: list[str] = []
    badges: list[ValidationBadge] = []
    repair_context = ""  # 재시도 시 추가할 컨텍스트

    # U-069: 모델 티어링 - 최초 시도에서 결정된 모델 정보 저장
    selected_model_label: ModelLabel = ModelLabel.FAST
    selected_cost_multiplier: float = 1.0
    # U-127: Thought Signature 추적
    last_thought_signature: str | None = None
    # U-127: Pro→Flash 폴백 상태
    model_fell_back = False
    # U-130: 마지막 실패가 API 에러(429 등)인지 추적
    last_failure_was_api_error = False

    last_attempt = 0
    for attempt in range(max_attempts + 1):  # 0 = 초기 시도, 1~max = 복구 시도
        badges = []  # 매 시도마다 배지 초기화 (최종 시도 상태만 유지)
        last_attempt = attempt
        is_repair = attempt > 0

        # U-127: 폴백 상태에서는 Flash 생성기 사용
        current_generator = (
            fallback_generator if model_fell_back and fallback_generator else generator
        )

        # 로그 기록 (프롬프트 노출 금지)
        logger.info(
            "[RepairLoop] 시도",
            extra={
                "attempt": attempt,
                "is_repair": is_repair,
                "language": turn_input.language.value,
                "model_fell_back": model_fell_back,
            },
        )

        # 컨텍스트 구성 (복구 시 에러 요약 추가)
        current_context = world_context
        if is_repair and repair_context:
            current_context = f"{world_context}\n\n{repair_context}"

        # 생성 시도 (U-127: 멀티턴 히스토리 전달)
        gen_result = await current_generator.generate(
            turn_input,
            world_context=current_context,
            conversation_history=conversation_history,
        )

        # U-069: 모델 티어링 - 생성 결과에서 모델 정보 저장
        selected_model_label = gen_result.model_label
        selected_cost_multiplier = gen_result.cost_multiplier

        # 1. 스키마 검증 실패 (JSON 파싱/Pydantic 실패)
        if gen_result.status == GenerationStatus.SCHEMA_FAILURE:
            badges.append(ValidationBadge.SCHEMA_FAIL)
            error_messages.append(gen_result.error_message)
            # U-130: 스키마 실패는 rate limit이 아님
            last_failure_was_api_error = False
            # RU-005-S2: language에 따라 repair 메시지 분기
            repair_context = _build_repair_context_schema(gen_result, turn_input.language)
            continue

        # 2. API 에러 (429 RESOURCE_EXHAUSTED, 5xx, timeout 등)
        if gen_result.status == GenerationStatus.API_ERROR:
            badges.append(ValidationBadge.SCHEMA_FAIL)
            error_messages.append(gen_result.error_message)
            # U-130: API 에러 추적 (최종 실패 시 RATE_LIMITED 판정용)
            last_failure_was_api_error = True

            # U-127: Pro→Flash 모델 폴백 시도
            if not model_fell_back:
                model_fell_back = True
                fallback_generator = TurnOutputGenerator(
                    default_model_label=MODEL_FALLBACK_LABEL,
                    force_mock=force_mock,
                )
                logger.warning(
                    "[RepairLoop] Pro→Flash 모델 폴백 전환 (U-127)",
                    extra={
                        "attempt": attempt,
                        "from_model": gen_result.model_label,
                        "to_model": MODEL_FALLBACK_LABEL,
                    },
                )
                # 폴백 전환 시 짧은 대기
                await asyncio.sleep(1.0)
                repair_context = ""
                continue

            # 이미 폴백 상태에서도 실패 → 지수 백오프 대기 후 재시도
            backoff_seconds = 2.0 * (2**attempt)  # 2s → 4s → 8s
            logger.warning(
                "[RepairLoop] API 에러 (Flash 폴백 후) — %.1fs 대기 후 재시도",
                backoff_seconds,
                extra={
                    "attempt": attempt,
                    "error_message": gen_result.error_message,
                    "error_details": gen_result.error_details,
                    "backoff_seconds": backoff_seconds,
                },
            )
            await asyncio.sleep(backoff_seconds)
            repair_context = ""
            continue

        # 3. 스키마 검증 성공 → 비즈니스 룰 검증
        if gen_result.status == GenerationStatus.SUCCESS and gen_result.output:
            badges.append(ValidationBadge.SCHEMA_OK)
            # U-127: Thought Signature 추적
            last_thought_signature = gen_result.thought_signature

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
                        "model_fell_back": model_fell_back,
                        "has_thought_signature": last_thought_signature is not None,
                    },
                )

                return RepairLoopResult(
                    output=gen_result.output,
                    total_attempts=attempt + 1,
                    repair_attempts=attempt,
                    is_fallback=False,
                    badges=badges,
                    error_messages=error_messages,
                    model_label=selected_model_label,
                    cost_multiplier=selected_cost_multiplier,
                    thought_signature=last_thought_signature,
                )

            # 비즈니스 룰 실패
            add_business_badges(biz_result, badges)
            error_messages.append(biz_result.error_summary)
            # RU-005-S2: language에 따라 repair 메시지 분기
            repair_context = _build_repair_context_business(biz_result, turn_input.language)
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

    # U-130: API 에러로 모든 재시도(폴백 포함) 소진 시 rate limited 판정
    rate_limited = last_failure_was_api_error and model_fell_back

    # 최종 실패 → 안전한 폴백 반환
    logger.warning(
        "[RepairLoop] 최종 폴백 반환",
        extra={
            "max_attempts": max_attempts,
            "actual_attempts": last_attempt,
            "model_fell_back": model_fell_back,
            "is_rate_limited": rate_limited,
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
        is_rate_limited=rate_limited,
        badges=badges,
        error_messages=error_messages,
        model_label=selected_model_label,
        cost_multiplier=selected_cost_multiplier,
        thought_signature=last_thought_signature,
    )


# =============================================================================
# 헬퍼 함수
# =============================================================================


def _build_repair_context_schema(gen_result: GenerationResult, language: Language) -> str:
    """스키마 실패에 대한 Repair 컨텍스트를 구성합니다.

    프롬프트 원문/상세 오류는 노출하지 않고, 간단한 지시만 포함합니다.
    언어에 따라 메시지를 분기합니다 (RULE-006, RU-005-S2).

    Args:
        gen_result: 생성 결과
        language: 응답 언어
    """
    # 짧은 요약만 포함 (RULE-007/008)
    messages = REPAIR_CONTEXT_MESSAGES[language]
    return f"""
{messages["schema_header"]}

{messages["schema_error"]}
{messages["schema_instruction"]}
"""


def _build_repair_context_business(
    biz_result: BusinessRuleValidationResult, language: Language
) -> str:
    """비즈니스 룰 실패에 대한 Repair 컨텍스트를 구성합니다.

    언어에 따라 메시지를 분기합니다 (RULE-006, RU-005-S2).
    언어 혼합 에러가 있으면 특별한 지시를 추가합니다 (U-043).

    Args:
        biz_result: 비즈니스 룰 검증 결과
        language: 응답 언어
    """
    messages = REPAIR_CONTEXT_MESSAGES[language]

    # U-043: 언어 혼합 에러가 있는지 확인
    has_language_content_error = any(
        "language_content_mixed" in err["type"] for err in biz_result.errors
    )

    # 언어 혼합 에러가 있으면 특별한 지시 추가
    if has_language_content_error:
        return f"""
{messages["language_header"]}

{biz_result.error_summary}

{messages["language_instruction"]}
"""

    # 일반 비즈니스 룰 에러
    return f"""
{messages["business_header"]}

{biz_result.error_summary}

{messages["business_instruction"]}
"""


def add_business_badges(
    biz_result: BusinessRuleValidationResult,
    badges: list[ValidationBadge],
) -> None:
    """비즈니스 룰 검증 결과에 따라 배지를 추가합니다.

    에러 타입 접두어 → 배지 매핑:
        - economy_* → ECONOMY_FAIL
        - safety_* → SAFETY_BLOCKED
        - language_* (mismatch/content_mixed) 또는 box2d_* → CONSISTENCY_FAIL

    RU-005-S1: consistency 에러가 누락되지 않도록 매핑을 완전하게 구현.
    U-043: language_content_mixed도 CONSISTENCY_FAIL로 매핑.

    Args:
        biz_result: 비즈니스 룰 검증 결과
        badges: 배지 목록 (in-place 수정)
    """
    # 에러 타입별 배지 매핑 (RU-005-S1, U-043)
    has_economy_error = any("economy" in err["type"] for err in biz_result.errors)
    has_safety_error = any("safety" in err["type"] for err in biz_result.errors)
    # U-043: language_mismatch, language_content_mixed, box2d_* 모두 consistency로 매핑
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
