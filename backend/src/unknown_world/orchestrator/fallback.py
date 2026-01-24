"""Unknown World - 안전한 폴백 TurnOutput 생성기.

최종 복구 실패 시에도 UI가 빈 화면이 되지 않도록
스키마를 만족하는 안전한 TurnOutput을 생성합니다.

설계 원칙:
    - RULE-004: 검증 실패 시 안전한 폴백 제공
    - RULE-005: 재화 인바리언트 (비용 0, 잔액 유지)
    - RULE-006: ko/en 언어 정책 준수

참조:
    - vibe/unit-plans/U-018[Mvp].md
    - vibe/prd.md 8.7 (TurnOutput 스키마)
"""

from __future__ import annotations

from unknown_world.models.turn import (
    ActionCard,
    ActionDeck,
    AgentConsole,
    AgentPhase,
    CurrencyAmount,
    EconomyOutput,
    Language,
    RenderOutput,
    RiskLevel,
    SafetyOutput,
    TurnOutput,
    UIOutput,
    ValidationBadge,
    WorldDelta,
)

# =============================================================================
# 폴백 메시지 (i18n)
# =============================================================================

FALLBACK_MESSAGES = {
    Language.KO: {
        "narrative": "잠시 혼란스러운 순간이 지나갑니다. 다시 집중해봅시다.",
        "narrative_blocked": "안전 정책에 따라 이 요청을 처리할 수 없습니다. 다른 행동을 시도해보세요.",
        "alternative_label": "텍스트로 진행하기",
        "alternative_desc": "이미지 생성 없이 저비용으로 진행합니다",
    },
    Language.EN: {
        "narrative": "A moment of confusion passes. Let's focus again.",
        "narrative_blocked": "This request cannot be processed due to safety policies. Please try a different action.",
        "alternative_label": "Continue with text",
        "alternative_desc": "Proceed at low cost without image generation",
    },
}


# =============================================================================
# 폴백 생성 함수
# =============================================================================


def create_safe_fallback(
    language: Language,
    economy_snapshot: CurrencyAmount | None = None,
    repair_count: int = 0,
    is_blocked: bool = False,
) -> TurnOutput:
    """안전한 폴백 TurnOutput을 생성합니다.

    최종 복구 실패 시 사용합니다.
    스키마를 만족하고, 비용 0으로 잔액을 유지합니다.

    Args:
        language: 응답 언어
        economy_snapshot: 현재 재화 상태 (비용 0으로 유지)
        repair_count: 복구 시도 횟수
        is_blocked: 안전 정책에 의해 차단되었는지

    Returns:
        안전한 폴백 TurnOutput

    Example:
        >>> fallback = create_safe_fallback(
        ...     language=Language.KO,
        ...     economy_snapshot=CurrencyAmount(signal=50, memory_shard=3),
        ...     repair_count=2,
        ... )
        >>> print(fallback.narrative)
    """
    messages = FALLBACK_MESSAGES[language]

    # 내러티브 선택
    narrative = messages["narrative_blocked"] if is_blocked else messages["narrative"]

    # 재화 유지 (비용 0)
    balance = economy_snapshot or CurrencyAmount(signal=100, memory_shard=5)

    # 저비용 대안 카드 제공 (RULE-005)
    alternative_card = ActionCard(
        id="fallback_text_only",
        label=messages["alternative_label"],
        description=messages["alternative_desc"],
        cost=CurrencyAmount(signal=1, memory_shard=0),
        risk=RiskLevel.LOW,
        enabled=True,
        is_alternative=True,
    )

    # 배지 결정
    badges: list[ValidationBadge] = []
    if is_blocked:
        badges.append(ValidationBadge.SAFETY_BLOCKED)
    else:
        badges.append(ValidationBadge.SCHEMA_FAIL)

    return TurnOutput(
        language=language,
        narrative=narrative,
        ui=UIOutput(
            action_deck=ActionDeck(cards=[alternative_card]),
            objects=[],
        ),
        world=WorldDelta(),
        render=RenderOutput(image_job=None),  # 이미지 생성 안 함
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=0, memory_shard=0),
            balance_after=balance,
        ),
        safety=SafetyOutput(
            blocked=is_blocked,
            message=messages["narrative_blocked"] if is_blocked else None,
        ),
        agent_console=AgentConsole(
            current_phase=AgentPhase.COMMIT,
            badges=badges,
            repair_count=repair_count,
        ),
    )
