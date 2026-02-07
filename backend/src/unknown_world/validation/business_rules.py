"""Unknown World - 비즈니스 룰 검증기 (Hard Gate).

스키마 검증 이후에도 남는 "의미적 실패"를 검증합니다:
- Economy: cost/balance_after 일관성, 잔액 음수 금지
- Language: TurnInput.language와 TurnOutput.language 불일치 차단
- Box2D: 0~1000 범위 + [ymin,xmin,ymax,xmax] 순서 검증
- Safety: blocked 시 안전한 대체 결과 제공 확인

설계 원칙:
    - RULE-003: 구조화 출력(JSON Schema) 우선 + 이중 검증
    - RULE-004: 검증 실패 시 Repair loop + 안전한 폴백
    - RULE-005: 재화 인바리언트 (잔액 음수 금지)
    - RULE-006: ko/en 언어 정책 준수
    - RULE-009: 좌표 규약 (0~1000, bbox [ymin,xmin,ymax,xmax])

참조:
    - vibe/unit-plans/U-018[Mvp].md
    - vibe/unit-results/U-017[Mvp].md
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import StrEnum
from typing import TYPE_CHECKING

from unknown_world.config.economy import MAX_CREDIT
from unknown_world.models.turn import Language
from unknown_world.validation.language_gate import (
    LanguageGateResult,
    build_language_error_summary,
    validate_language_consistency,
)

if TYPE_CHECKING:
    from unknown_world.models.turn import TurnInput, TurnOutput

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)


# =============================================================================
# i18n 에러 메시지 (RULE-006: ko/en 언어 정책 준수)
# =============================================================================

BUSINESS_RULE_MESSAGES: dict[Language, dict[str, str]] = {
    Language.KO: {
        "summary_header": "다음 비즈니스 룰을 위반했습니다:",
        "signal_insufficient": "Signal 재화가 부족합니다: 보유 {have}, 필요 {need}",
        "memory_shard_insufficient": "Memory Shard 재화가 부족합니다: 보유 {have}, 필요 {need}",
        "signal_negative": "Signal 잔액이 음수입니다: {value}",
        "memory_shard_negative": "Memory Shard 잔액이 음수입니다: {value}",
        "signal_mismatch": "Signal 잔액 불일치: 예상 {expected}, 실제 {actual}",
        "memory_shard_mismatch": "Memory Shard 잔액 불일치: 예상 {expected}, 실제 {actual}",
        "language_mismatch": "언어 불일치: 입력 {input_lang}, 출력 {output_lang}",
        "language_content_mixed": "언어 혼합 감지: {violation_count}개 필드에서 ko/en 혼합 발견",
        "box2d_out_of_range": "오브젝트 '{obj_id}'의 좌표가 범위를 벗어남: {coord}",
        "box2d_invalid_yorder": "오브젝트 '{obj_id}'의 ymin({ymin}) >= ymax({ymax})",
        "box2d_invalid_xorder": "오브젝트 '{obj_id}'의 xmin({xmin}) >= xmax({xmax})",
        "safety_blocked_no_fallback": "안전 정책에 의해 차단되었지만 대체 텍스트가 없습니다",
    },
    Language.EN: {
        "summary_header": "The following business rules were violated:",
        "signal_insufficient": "Insufficient Signal: have {have}, need {need}",
        "memory_shard_insufficient": "Insufficient Memory Shard: have {have}, need {need}",
        "signal_negative": "Signal balance is negative: {value}",
        "memory_shard_negative": "Memory Shard balance is negative: {value}",
        "signal_mismatch": "Signal balance mismatch: expected {expected}, actual {actual}",
        "memory_shard_mismatch": "Memory Shard balance mismatch: expected {expected}, actual {actual}",
        "language_mismatch": "Language mismatch: input {input_lang}, output {output_lang}",
        "language_content_mixed": "Language mixing detected: {violation_count} fields contain ko/en mixing",
        "box2d_out_of_range": "Object '{obj_id}' coordinate out of range: {coord}",
        "box2d_invalid_yorder": "Object '{obj_id}' ymin({ymin}) >= ymax({ymax})",
        "box2d_invalid_xorder": "Object '{obj_id}' xmin({xmin}) >= xmax({xmax})",
        "safety_blocked_no_fallback": "Blocked by safety policy but no fallback text provided",
    },
}


# =============================================================================
# 에러 타입
# =============================================================================


class BusinessRuleError(StrEnum):
    """비즈니스 룰 위반 타입."""

    # Economy 규칙 (RULE-005)
    ECONOMY_NEGATIVE_BALANCE = "economy_negative_balance"
    """잔액이 음수입니다 (금지)"""

    ECONOMY_COST_MISMATCH = "economy_cost_mismatch"
    """비용과 잔액 변화가 일치하지 않습니다"""

    ECONOMY_COST_MISSING = "economy_cost_missing"
    """비용 정보가 누락되었습니다"""

    # Language 규칙 (RULE-006)
    LANGUAGE_MISMATCH = "language_mismatch"
    """입력과 출력 언어가 일치하지 않습니다"""

    LANGUAGE_CONTENT_MIXED = "language_content_mixed"
    """사용자 노출 텍스트에 ko/en이 혼합되어 있습니다 (U-043)"""

    # Box2D 규칙 (RULE-009)
    BOX2D_OUT_OF_RANGE = "box2d_out_of_range"
    """좌표가 0~1000 범위를 벗어났습니다"""

    BOX2D_INVALID_ORDER = "box2d_invalid_order"
    """bbox 순서가 올바르지 않습니다 (ymin < ymax, xmin < xmax 필요)"""

    # Safety 규칙
    SAFETY_BLOCKED_NO_FALLBACK = "safety_blocked_no_fallback"
    """차단되었지만 안전한 대체 결과가 제공되지 않았습니다"""


# =============================================================================
# 검증 결과 타입
# =============================================================================


@dataclass
class BusinessRuleValidationResult:
    """비즈니스 룰 검증 결과.

    Attributes:
        is_valid: 모든 검증 통과 여부
        errors: 발견된 위반 목록
        error_summary: 에러 요약 (Repair 프롬프트용)
        language: 응답 언어 (RULE-006)
        language_gate_result: 언어 혼합 검증 결과 (U-043)
    """

    is_valid: bool = True
    errors: list[dict[str, str]] = field(default_factory=lambda: [])
    error_summary: str = ""
    language: Language = Language.KO
    language_gate_result: LanguageGateResult | None = None

    def add_error(self, error_type: BusinessRuleError, message: str) -> None:
        """에러를 추가합니다."""
        self.is_valid = False
        self.errors.append({"type": error_type.value, "message": message})

    def build_summary(self) -> str:
        """에러 요약을 생성합니다 (Repair 프롬프트용).

        언어에 따라 헤더 메시지를 분기합니다 (RULE-006).
        언어 혼합 에러가 있으면 상세 지시를 추가합니다 (U-043).
        """
        if not self.errors:
            self.error_summary = ""
            return ""

        messages = BUSINESS_RULE_MESSAGES[self.language]
        summary_lines = [messages["summary_header"]]
        for err in self.errors:
            summary_lines.append(f"- {err['message']}")

        # U-043: 언어 혼합 에러가 있으면 상세 지시 추가
        if self.language_gate_result and not self.language_gate_result.is_valid:
            summary_lines.append("")
            summary_lines.append(build_language_error_summary(self.language_gate_result))

        self.error_summary = "\n".join(summary_lines)
        return self.error_summary


# =============================================================================
# 개별 검증 함수
# =============================================================================


def _validate_economy(
    turn_input: TurnInput,
    turn_output: TurnOutput,
    result: BusinessRuleValidationResult,
) -> None:
    """Economy 규칙을 검증합니다 (RULE-005).

    검증 항목:
    - 잔액 음수 금지
    - snapshot 대비 과도한 비용 청구 금지 (U-079: 크레딧 허용)
    - cost와 balance_after 일관성
    """
    economy = turn_output.economy
    snapshot = turn_input.economy_snapshot
    messages = BUSINESS_RULE_MESSAGES[result.language]

    # 1. 과도한 비용 청구 금지 (snapshot < cost)
    # U-079: 크레딧(빚)을 허용하여 잔액보다 큰 비용 지불 가능
    # 허용 범위: snapshot.signal + MAX_CREDIT >= cost.signal
    effective_signal = snapshot.signal + MAX_CREDIT

    if effective_signal < economy.cost.signal:
        result.add_error(
            BusinessRuleError.ECONOMY_NEGATIVE_BALANCE,
            messages["signal_insufficient"].format(have=snapshot.signal, need=economy.cost.signal),
        )

    if snapshot.memory_shard < economy.cost.memory_shard:
        result.add_error(
            BusinessRuleError.ECONOMY_NEGATIVE_BALANCE,
            messages["memory_shard_insufficient"].format(
                have=snapshot.memory_shard, need=economy.cost.memory_shard
            ),
        )

    # 2. 잔액 음수 금지 (이미 필드 수준 ge=0 검증이 있지만, 비즈니스 룰에서도 명시)
    if economy.balance_after.signal < 0:
        result.add_error(
            BusinessRuleError.ECONOMY_NEGATIVE_BALANCE,
            messages["signal_negative"].format(value=economy.balance_after.signal),
        )

    if economy.balance_after.memory_shard < 0:
        result.add_error(
            BusinessRuleError.ECONOMY_NEGATIVE_BALANCE,
            messages["memory_shard_negative"].format(value=economy.balance_after.memory_shard),
        )

    # 3. cost와 balance_after 일관성 검증
    # balance_after = snapshot - cost + credit_delta 여야 함
    # (또는 credit 필드가 사용 중인 총 빚을 나타냄)
    # U-079 단순화: balance_after.signal = max(0, snapshot.signal - cost.signal)
    # credit = max(0, cost.signal - snapshot.signal)
    expected_signal = max(0, snapshot.signal - economy.cost.signal)
    expected_shard = max(0, snapshot.memory_shard - economy.cost.memory_shard)
    expected_credit = max(0, economy.cost.signal - snapshot.signal)

    if economy.balance_after.signal != expected_signal:
        result.add_error(
            BusinessRuleError.ECONOMY_COST_MISMATCH,
            messages["signal_mismatch"].format(
                expected=expected_signal, actual=economy.balance_after.signal
            ),
        )

    if economy.balance_after.memory_shard != expected_shard:
        result.add_error(
            BusinessRuleError.ECONOMY_COST_MISMATCH,
            messages["memory_shard_mismatch"].format(
                expected=expected_shard, actual=economy.balance_after.memory_shard
            ),
        )

    # credit 일관성 검증
    if economy.credit != expected_credit:
        result.add_error(
            BusinessRuleError.ECONOMY_COST_MISMATCH,
            f"Credit mismatch: expected {expected_credit}, actual {economy.credit}",
        )


def _validate_language(
    turn_input: TurnInput,
    turn_output: TurnOutput,
    result: BusinessRuleValidationResult,
) -> None:
    """Language 규칙을 검증합니다 (RULE-006).

    검증 항목:
    - TurnInput.language와 TurnOutput.language 일치
    """
    if turn_input.language != turn_output.language:
        messages = BUSINESS_RULE_MESSAGES[result.language]
        result.add_error(
            BusinessRuleError.LANGUAGE_MISMATCH,
            messages["language_mismatch"].format(
                input_lang=turn_input.language.value,
                output_lang=turn_output.language.value,
            ),
        )


def _validate_language_content(
    turn_input: TurnInput,
    turn_output: TurnOutput,
    result: BusinessRuleValidationResult,
) -> None:
    """Language 콘텐츠 혼합을 검증합니다 (RULE-006, U-043).

    검증 항목:
    - 사용자 노출 텍스트가 TurnInput.language와 동일 언어인지 확인
    - ko/en 혼합 시 LANGUAGE_CONTENT_MIXED 에러 추가
    """
    # 언어 혼합 검증 (U-043)
    lang_result = validate_language_consistency(turn_output, turn_input.language)

    if not lang_result.is_valid:
        messages = BUSINESS_RULE_MESSAGES[result.language]
        result.add_error(
            BusinessRuleError.LANGUAGE_CONTENT_MIXED,
            messages["language_content_mixed"].format(violation_count=len(lang_result.violations)),
        )
        # 상세 에러 요약 생성을 위해 결과 저장
        result.language_gate_result = lang_result


def _validate_box2d(
    turn_output: TurnOutput,
    result: BusinessRuleValidationResult,
) -> None:
    """Box2D 좌표 규칙을 검증합니다 (RULE-009).

    검증 항목:
    - 0~1000 범위
    - ymin < ymax, xmin < xmax 순서
    """
    messages = BUSINESS_RULE_MESSAGES[result.language]

    # UI 오브젝트의 box2d 검증
    for obj in turn_output.ui.objects:
        box = obj.box_2d

        # 범위 검증 (0~1000)
        coords = [box.ymin, box.xmin, box.ymax, box.xmax]
        for coord in coords:
            if coord < 0 or coord > 1000:
                result.add_error(
                    BusinessRuleError.BOX2D_OUT_OF_RANGE,
                    messages["box2d_out_of_range"].format(obj_id=obj.id, coord=coord),
                )
                break  # 한 오브젝트에 대해 한 번만 보고

        # 순서 검증 (ymin < ymax, xmin < xmax)
        if box.ymin >= box.ymax:
            result.add_error(
                BusinessRuleError.BOX2D_INVALID_ORDER,
                messages["box2d_invalid_yorder"].format(
                    obj_id=obj.id, ymin=box.ymin, ymax=box.ymax
                ),
            )

        if box.xmin >= box.xmax:
            result.add_error(
                BusinessRuleError.BOX2D_INVALID_ORDER,
                messages["box2d_invalid_xorder"].format(
                    obj_id=obj.id, xmin=box.xmin, xmax=box.xmax
                ),
            )


def _validate_safety(
    turn_output: TurnOutput,
    result: BusinessRuleValidationResult,
) -> None:
    """Safety 규칙을 검증합니다.

    검증 항목:
    - blocked 시 안전한 대체 결과(narrative) 제공 확인
    """
    safety = turn_output.safety
    messages = BUSINESS_RULE_MESSAGES[result.language]

    # 차단 시에도 narrative가 있어야 함 (안전한 대체 결과)
    if safety.blocked and (not turn_output.narrative or len(turn_output.narrative.strip()) == 0):
        result.add_error(
            BusinessRuleError.SAFETY_BLOCKED_NO_FALLBACK,
            messages["safety_blocked_no_fallback"],
        )


# =============================================================================
# 메인 검증 함수
# =============================================================================


def validate_business_rules(
    turn_input: TurnInput,
    turn_output: TurnOutput,
) -> BusinessRuleValidationResult:
    """비즈니스 룰을 검증합니다.

    스키마 검증 이후 호출되며, 의미적 규칙을 검증합니다.
    에러 메시지는 turn_input.language에 따라 분기됩니다 (RULE-006).

    Args:
        turn_input: 사용자 턴 입력
        turn_output: 생성된 턴 출력

    Returns:
        BusinessRuleValidationResult: 검증 결과

    Example:
        >>> result = validate_business_rules(turn_input, turn_output)
        >>> if not result.is_valid:
        ...     print(result.build_summary())
    """
    # RU-005-S2: turn_input.language에 따라 에러 메시지 i18n 분기
    result = BusinessRuleValidationResult(language=turn_input.language)

    # 1. Economy 검증 (RULE-005)
    _validate_economy(turn_input, turn_output, result)

    # 2. Language enum 검증 (RULE-006)
    _validate_language(turn_input, turn_output, result)

    # 3. Language 콘텐츠 혼합 검증 (RULE-006, U-043)
    _validate_language_content(turn_input, turn_output, result)

    # 4. Box2D 검증 (RULE-009)
    _validate_box2d(turn_output, result)

    # 5. Safety 검증
    _validate_safety(turn_output, result)

    # 에러 요약 생성
    if not result.is_valid:
        result.build_summary()
        logger.warning(
            "[BusinessRules] 검증 실패",
            extra={"error_count": len(result.errors)},
        )

    return result
