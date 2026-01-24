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

if TYPE_CHECKING:
    from unknown_world.models.turn import TurnInput, TurnOutput

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)


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
    """

    is_valid: bool = True
    errors: list[dict[str, str]] = field(default_factory=lambda: [])
    error_summary: str = ""

    def add_error(self, error_type: BusinessRuleError, message: str) -> None:
        """에러를 추가합니다."""
        self.is_valid = False
        self.errors.append({"type": error_type.value, "message": message})

    def build_summary(self) -> str:
        """에러 요약을 생성합니다 (Repair 프롬프트용)."""
        if not self.errors:
            self.error_summary = ""
            return ""

        summary_lines = ["다음 비즈니스 룰을 위반했습니다:"]
        for err in self.errors:
            summary_lines.append(f"- {err['message']}")

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
    - snapshot 대비 과도한 비용 청구 금지
    - cost와 balance_after 일관성
    """
    economy = turn_output.economy
    snapshot = turn_input.economy_snapshot

    # 1. 과도한 비용 청구 금지 (snapshot < cost)
    if snapshot.signal < economy.cost.signal:
        result.add_error(
            BusinessRuleError.ECONOMY_NEGATIVE_BALANCE,
            f"Signal 재화가 부족합니다: 보유 {snapshot.signal}, 필요 {economy.cost.signal}",
        )

    if snapshot.memory_shard < economy.cost.memory_shard:
        result.add_error(
            BusinessRuleError.ECONOMY_NEGATIVE_BALANCE,
            f"Memory Shard 재화가 부족합니다: 보유 {snapshot.memory_shard}, 필요 {economy.cost.memory_shard}",
        )

    # 2. 잔액 음수 금지 (이미 필드 수준 ge=0 검증이 있지만, 비즈니스 룰에서도 명시)
    if economy.balance_after.signal < 0:
        result.add_error(
            BusinessRuleError.ECONOMY_NEGATIVE_BALANCE,
            f"Signal 잔액이 음수입니다: {economy.balance_after.signal}",
        )

    if economy.balance_after.memory_shard < 0:
        result.add_error(
            BusinessRuleError.ECONOMY_NEGATIVE_BALANCE,
            f"Memory Shard 잔액이 음수입니다: {economy.balance_after.memory_shard}",
        )

    # 3. cost와 balance_after 일관성 검증
    # balance_after = snapshot - cost 여야 함
    expected_signal = snapshot.signal - economy.cost.signal
    expected_shard = snapshot.memory_shard - economy.cost.memory_shard

    # 이미 위에서 snapshot < cost 체크를 했으므로,
    # 여기서는 단순 일치 여부만 확인 (음수 결과는 위에서 차단됨)
    if economy.balance_after.signal != expected_signal:
        result.add_error(
            BusinessRuleError.ECONOMY_COST_MISMATCH,
            f"Signal 잔액 불일치: 예상 {expected_signal}, 실제 {economy.balance_after.signal}",
        )

    if economy.balance_after.memory_shard != expected_shard:
        result.add_error(
            BusinessRuleError.ECONOMY_COST_MISMATCH,
            f"Memory Shard 잔액 불일치: 예상 {expected_shard}, 실제 {economy.balance_after.memory_shard}",
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
        result.add_error(
            BusinessRuleError.LANGUAGE_MISMATCH,
            f"언어 불일치: 입력 {turn_input.language.value}, 출력 {turn_output.language.value}",
        )


def _validate_box2d(
    turn_output: TurnOutput,
    result: BusinessRuleValidationResult,
) -> None:
    """Box2D 좌표 규칙을 검증합니다 (RULE-009).

    검증 항목:
    - 0~1000 범위
    - ymin < ymax, xmin < xmax 순서
    """
    # UI 오브젝트의 box2d 검증
    for obj in turn_output.ui.objects:
        box = obj.box_2d

        # 범위 검증 (0~1000)
        coords = [box.ymin, box.xmin, box.ymax, box.xmax]
        for coord in coords:
            if coord < 0 or coord > 1000:
                result.add_error(
                    BusinessRuleError.BOX2D_OUT_OF_RANGE,
                    f"오브젝트 '{obj.id}'의 좌표가 범위를 벗어남: {coord}",
                )
                break  # 한 오브젝트에 대해 한 번만 보고

        # 순서 검증 (ymin < ymax, xmin < xmax)
        if box.ymin >= box.ymax:
            result.add_error(
                BusinessRuleError.BOX2D_INVALID_ORDER,
                f"오브젝트 '{obj.id}'의 ymin({box.ymin}) >= ymax({box.ymax})",
            )

        if box.xmin >= box.xmax:
            result.add_error(
                BusinessRuleError.BOX2D_INVALID_ORDER,
                f"오브젝트 '{obj.id}'의 xmin({box.xmin}) >= xmax({box.xmax})",
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

    # 차단 시에도 narrative가 있어야 함 (안전한 대체 결과)
    if safety.blocked and (not turn_output.narrative or len(turn_output.narrative.strip()) == 0):
        result.add_error(
            BusinessRuleError.SAFETY_BLOCKED_NO_FALLBACK,
            "안전 정책에 의해 차단되었지만 대체 텍스트가 없습니다",
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
    result = BusinessRuleValidationResult()

    # 1. Economy 검증 (RULE-005)
    _validate_economy(turn_input, turn_output, result)

    # 2. Language 검증 (RULE-006)
    _validate_language(turn_input, turn_output, result)

    # 3. Box2D 검증 (RULE-009)
    _validate_box2d(turn_output, result)

    # 4. Safety 검증
    _validate_safety(turn_output, result)

    # 에러 요약 생성
    if not result.is_valid:
        result.build_summary()
        logger.warning(
            "[BusinessRules] 검증 실패",
            extra={"error_count": len(result.errors)},
        )

    return result
