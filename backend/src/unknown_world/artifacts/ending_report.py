"""Unknown World - 엔딩 리포트 생성기.

세션 데이터를 기반으로 엔딩 리포트 아티팩트를 생성합니다.
PRD 6.5 동적 엔딩 생성기 요구사항을 충족합니다.

설계 원칙:
    - RULE-005: 경제 결산은 ledger 기반 (잔액 불일치 표시)
    - RULE-006: 리포트 언어는 세션 언어와 동일 (혼합 금지)
    - RULE-004: 데이터 부족 시에도 텍스트-only 리포트 생성

참조:
    - vibe/unit-plans/U-025[Mvp].md
    - vibe/prd.md 6.5
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from pydantic import BaseModel, Field

from unknown_world.models.turn import CurrencyAmount, Language

logger = logging.getLogger(__name__)

# =============================================================================
# 요청 모델 (프론트엔드 → 백엔드)
# =============================================================================


class NarrativeEntryData(BaseModel):
    """내러티브 엔트리 데이터."""

    text: str
    type: str = "narrative"
    turn: int = 0


class QuestData(BaseModel):
    """퀘스트 데이터."""

    id: str
    label: str
    is_completed: bool = False
    is_main: bool = False
    progress: int = 0
    reward_signal: int = 0


class LedgerEntryData(BaseModel):
    """거래 장부 엔트리 데이터."""

    reason: str
    cost_signal: int = 0
    cost_memory_shard: int = 0
    balance_signal: int = 0
    balance_memory_shard: int = 0
    turn_id: int = 0


class RuleData(BaseModel):
    """규칙 데이터."""

    id: str
    label: str


class MutationEventData(BaseModel):
    """룰 변형 이벤트 데이터."""

    turn: int
    rule_id: str
    type: str  # added / modified / removed
    label: str
    description: str = ""


class ItemData(BaseModel):
    """아이템 데이터."""

    id: str
    name: str
    quantity: int = 1


class SessionSummaryRequest(BaseModel):
    """세션 요약 요청 (프론트엔드에서 전송).

    세션의 모든 상태를 수집하여 엔딩 리포트 생성에 필요한 데이터를 전달합니다.
    """

    language: Language
    profile_id: str
    turn_count: int = 0
    narrative_entries: list[NarrativeEntryData] = []
    quests: list[QuestData] = []
    economy_ledger: list[LedgerEntryData] = []
    balance_final: CurrencyAmount = Field(
        default_factory=lambda: CurrencyAmount(signal=0, memory_shard=0)
    )
    balance_initial: CurrencyAmount = Field(
        default_factory=lambda: CurrencyAmount(signal=100, memory_shard=5)
    )
    active_rules: list[RuleData] = []
    mutation_events: list[MutationEventData] = []
    inventory_items: list[ItemData] = []


# =============================================================================
# 리포트 모델 (백엔드 → 프론트엔드)
# =============================================================================


class QuestSummary(BaseModel):
    """퀘스트 요약."""

    label: str
    is_completed: bool
    is_main: bool
    progress: int


class QuestAchievement(BaseModel):
    """퀘스트 달성도."""

    total: int
    completed: int
    completion_rate: float  # 0.0 ~ 1.0
    quests: list[QuestSummary]


class EconomySettlement(BaseModel):
    """경제 결산."""

    initial_signal: int
    final_signal: int
    initial_memory_shard: int
    final_memory_shard: int
    total_spent_signal: int
    total_earned_signal: int
    transaction_count: int
    balance_consistent: bool  # ledger 기반 일관성 검증 결과


class RuleTimelineEvent(BaseModel):
    """룰 변형 타임라인 이벤트."""

    turn: int
    type: str
    label: str
    description: str = ""


class PlayStats(BaseModel):
    """플레이 통계."""

    turn_count: int
    items_collected: int
    active_rules_count: int
    profile_id: str


class EndingReport(BaseModel):
    """엔딩 리포트 아티팩트.

    PRD 6.5 요구사항:
    - 내러티브 요약 (언어 고정)
    - 룰 변형 타임라인 (핵심 이벤트)
    - 퀘스트 달성도 (완료율)
    - 재화 결산 (ledger 기반)
    """

    language: Language
    title: str
    narrative_summary: str
    quest_achievement: QuestAchievement
    economy_settlement: EconomySettlement
    rule_timeline: list[RuleTimelineEvent]
    play_stats: PlayStats
    generated_at: str  # ISO 8601


# =============================================================================
# 리포트 생성 (i18n 메시지)
# =============================================================================

REPORT_MESSAGES = {
    Language.KO: {
        "title": "세션 리포트",
        "no_narrative": "이번 세션에서 특별한 이야기는 없었습니다.",
        "summary_template": "{opening}\n\n---\n\n{closing}",
        "opening_prefix": "시작: ",
        "closing_prefix": "마지막: ",
        "single_narrative": "이 세계에서의 여정이 기록되었습니다.",
    },
    Language.EN: {
        "title": "Session Report",
        "no_narrative": "No remarkable stories emerged from this session.",
        "summary_template": "{opening}\n\n---\n\n{closing}",
        "opening_prefix": "Beginning: ",
        "closing_prefix": "Final: ",
        "single_narrative": "Your journey through this world has been recorded.",
    },
}


# =============================================================================
# 리포트 생성 함수
# =============================================================================


def generate_ending_report(session: SessionSummaryRequest) -> EndingReport:
    """세션 데이터로부터 엔딩 리포트를 생성합니다.

    Args:
        session: 프론트엔드에서 전달된 세션 요약 데이터

    Returns:
        EndingReport: 구조화된 엔딩 리포트
    """
    logger.info(
        "[EndingReport] Generating report for profile=%s, turns=%d",
        session.profile_id,
        session.turn_count,
    )

    messages = REPORT_MESSAGES[session.language]

    # 1. 내러티브 요약 생성
    narrative_summary = _build_narrative_summary(session, messages)

    # 2. 퀘스트 달성도 계산
    quest_achievement = _build_quest_achievement(session)

    # 3. 경제 결산
    economy_settlement = _build_economy_settlement(session)

    # 4. 룰 변형 타임라인
    rule_timeline = _build_rule_timeline(session)

    # 5. 플레이 통계
    play_stats = PlayStats(
        turn_count=session.turn_count,
        items_collected=sum(item.quantity for item in session.inventory_items),
        active_rules_count=len(session.active_rules),
        profile_id=session.profile_id,
    )

    report = EndingReport(
        language=session.language,
        title=messages["title"],
        narrative_summary=narrative_summary,
        quest_achievement=quest_achievement,
        economy_settlement=economy_settlement,
        rule_timeline=rule_timeline,
        play_stats=play_stats,
        generated_at=datetime.now(UTC).isoformat(),
    )

    logger.info(
        "[EndingReport] Report generated: quests=%d/%d, turns=%d",
        quest_achievement.completed,
        quest_achievement.total,
        session.turn_count,
    )

    return report


def _build_narrative_summary(
    session: SessionSummaryRequest,
    messages: dict[str, str],
) -> str:
    """내러티브 요약을 생성합니다."""
    # 내러티브 타입 엔트리만 필터링
    narratives = [e for e in session.narrative_entries if e.type == "narrative"]

    if not narratives:
        return messages["no_narrative"]

    if len(narratives) == 1:
        return narratives[0].text

    # 첫 번째(오프닝)와 마지막(클로징) 내러티브를 사용
    opening = narratives[0].text
    closing = narratives[-1].text

    # 길이 제한 (가독성 유지: MVP는 짧고 강하게)
    max_len = 300
    if len(opening) > max_len:
        opening = opening[:max_len] + "..."
    if len(closing) > max_len:
        closing = closing[:max_len] + "..."

    return messages["summary_template"].format(
        opening=opening,
        closing=closing,
    )


def _build_quest_achievement(session: SessionSummaryRequest) -> QuestAchievement:
    """퀘스트 달성도를 계산합니다."""
    quests = session.quests
    total = len(quests)
    completed = sum(1 for q in quests if q.is_completed)
    rate = completed / total if total > 0 else 0.0

    return QuestAchievement(
        total=total,
        completed=completed,
        completion_rate=round(rate, 2),
        quests=[
            QuestSummary(
                label=q.label,
                is_completed=q.is_completed,
                is_main=q.is_main,
                progress=q.progress,
            )
            for q in quests
        ],
    )


def _build_economy_settlement(session: SessionSummaryRequest) -> EconomySettlement:
    """경제 결산을 생성합니다. (RULE-005: ledger 기반)"""
    ledger = session.economy_ledger

    total_spent = sum(e.cost_signal for e in ledger)
    # 보상(gains)은 잔액 증가분에서 추론
    # ledger에서 비용이 0이면서 잔액이 증가한 경우를 보상으로 간주
    total_earned = 0
    for i, entry in enumerate(ledger):
        if entry.cost_signal == 0 and i > 0:
            prev = ledger[i - 1]
            diff = entry.balance_signal - prev.balance_signal
            if diff > 0:
                total_earned += diff

    # Fallback: 총 보상이 0이면 초기-최종+소비로 역산
    if total_earned == 0 and total_spent > 0:
        total_earned = max(
            0,
            session.balance_final.signal - session.balance_initial.signal + total_spent,
        )

    # 일관성 검증: 최종 잔액이 초기 - 소비 + 획득과 일치하는지
    expected_final = session.balance_initial.signal - total_spent + total_earned
    balance_consistent = abs(expected_final - session.balance_final.signal) <= 5  # 오차 허용

    return EconomySettlement(
        initial_signal=session.balance_initial.signal,
        final_signal=session.balance_final.signal,
        initial_memory_shard=session.balance_initial.memory_shard,
        final_memory_shard=session.balance_final.memory_shard,
        total_spent_signal=total_spent,
        total_earned_signal=total_earned,
        transaction_count=len(ledger),
        balance_consistent=balance_consistent,
    )


def _build_rule_timeline(
    session: SessionSummaryRequest,
) -> list[RuleTimelineEvent]:
    """룰 변형 타임라인을 생성합니다."""
    return [
        RuleTimelineEvent(
            turn=event.turn,
            type=event.type,
            label=event.label,
            description=event.description,
        )
        for event in session.mutation_events
    ]
