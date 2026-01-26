"""Unknown World - 언어 혼합 검증 게이트 (RULE-006).

ko/en 혼합 출력을 감지하고 차단하는 Hard Gate입니다.
TurnInput.language를 SSOT로 삼아 TurnOutput의 사용자 노출 텍스트가
동일 언어로 수렴하는지 검증합니다.

설계 원칙:
    - RULE-006: ko/en 언어 정책 준수 (혼합 출력 금지)
    - RULE-004: 검증 실패 시 Repair loop로 복구
    - CP-MVP-05: 언어 혼합 금지 검증

페어링 결정:
    - Q1: Option A (보수적 - 오탐 최소, CP에서 튜닝)
    - Q2: Option A (고유명 최소치만 허용)

참조:
    - vibe/unit-plans/U-043[Mvp].md
    - vibe/ref/en-ko-issue.png (혼합 출력 사례)
    - .cursor/rules/00-core-critical.mdc
"""

from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from unknown_world.models.turn import Language

if TYPE_CHECKING:
    from unknown_world.models.turn import TurnOutput

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# 상수 및 설정
# =============================================================================

# 페어링 결정 Q1: Option A (보수적 - 오탐 최소)
# 혼합 판정 임계값 (이 비율 이상이면 "잘못된 언어"로 판정)
MIXED_THRESHOLD_RATIO = 0.15  # 15% 이상의 반대 언어 문자 → 혼합으로 판정

# 페어링 결정 Q2: Option A (고유명 최소치만 허용)
# 허용 화이트리스트 (영어 고유명 - 재화/모델 라벨 등)
# 주의: 복합어는 개별 단어도 함께 등록해야 합니다 (한글 붙은 경우 단어 경계 매칭 문제)
ALLOWED_ENGLISH_TERMS: set[str] = {
    # 재화 이름 (RULE-005)
    "signal",
    "shard",
    "memory",
    "memory shard",
    # 모델 라벨 (RULE-008)
    "fast",
    "quality",
    "cheap",
    "ref",
    # 시스템 상수
    "ok",
    "fail",
    "blocked",
    # 기타 허용 약어
    "ui",
    "api",
    "id",
    "json",
    "schema",
}

# 한글 유니코드 범위
HANGUL_JAMO_START = 0x1100
HANGUL_JAMO_END = 0x11FF
HANGUL_SYLLABLES_START = 0xAC00
HANGUL_SYLLABLES_END = 0xD7AF
HANGUL_COMPAT_JAMO_START = 0x3130
HANGUL_COMPAT_JAMO_END = 0x318F


# =============================================================================
# 언어 감지 휴리스틱
# =============================================================================


def _is_hangul(char: str) -> bool:
    """한글 문자인지 확인합니다."""
    code = ord(char)
    return (
        (HANGUL_SYLLABLES_START <= code <= HANGUL_SYLLABLES_END)
        or (HANGUL_JAMO_START <= code <= HANGUL_JAMO_END)
        or (HANGUL_COMPAT_JAMO_START <= code <= HANGUL_COMPAT_JAMO_END)
    )


def _is_latin(char: str) -> bool:
    """라틴 알파벳인지 확인합니다 (a-z, A-Z)."""
    return char.isalpha() and unicodedata.category(char).startswith("L") and not _is_hangul(char)


def _normalize_text_for_check(text: str) -> str:
    """검사용으로 텍스트를 정규화합니다.

    - 소문자 변환
    - 화이트리스트 단어 제거
    - 숫자/기호/공백/이모지 제거
    """
    normalized = text.lower()

    # 화이트리스트 단어 제거 (대소문자 무시)
    # 복합어를 먼저 처리 (긴 것부터)
    sorted_terms = sorted(ALLOWED_ENGLISH_TERMS, key=len, reverse=True)
    for term in sorted_terms:
        # 한글이 붙어있는 경우도 처리하기 위해 단어 경계 대신
        # 알파벳이 아닌 문자 또는 문자열 경계로 매칭
        # 예: "Signal가", "Memory Shard를" 등
        pattern = rf"(?<![a-zA-Z]){re.escape(term)}(?![a-zA-Z])"
        normalized = re.sub(pattern, "", normalized, flags=re.IGNORECASE)

    return normalized


@dataclass
class LanguageRatio:
    """언어 비율 측정 결과.

    Attributes:
        hangul_count: 한글 문자 수
        latin_count: 라틴 문자 수
        total_alpha: 총 알파벳 문자 수 (한글 + 라틴)
        hangul_ratio: 한글 비율 (0.0 ~ 1.0)
        latin_ratio: 라틴 비율 (0.0 ~ 1.0)
    """

    hangul_count: int = 0
    latin_count: int = 0
    total_alpha: int = 0
    hangul_ratio: float = 0.0
    latin_ratio: float = 0.0


def measure_language_ratio(text: str) -> LanguageRatio:
    """텍스트의 한글/라틴 비율을 측정합니다.

    화이트리스트 단어는 제거한 후 측정합니다.

    Args:
        text: 측정할 텍스트

    Returns:
        LanguageRatio: 언어 비율 측정 결과
    """
    if not text:
        return LanguageRatio()

    # 정규화 (화이트리스트 제거)
    normalized = _normalize_text_for_check(text)

    hangul_count = 0
    latin_count = 0

    for char in normalized:
        if _is_hangul(char):
            hangul_count += 1
        elif _is_latin(char):
            latin_count += 1

    total = hangul_count + latin_count

    if total == 0:
        return LanguageRatio()

    return LanguageRatio(
        hangul_count=hangul_count,
        latin_count=latin_count,
        total_alpha=total,
        hangul_ratio=hangul_count / total,
        latin_ratio=latin_count / total,
    )


def is_language_mixed(text: str, expected_language: Language) -> bool:
    """텍스트가 예상 언어와 다른 언어가 혼합되었는지 확인합니다.

    Args:
        text: 검사할 텍스트
        expected_language: 예상 언어 (TurnInput.language)

    Returns:
        bool: 혼합되었으면 True
    """
    if not text or len(text.strip()) == 0:
        return False

    ratio = measure_language_ratio(text)

    # 알파벳이 거의 없는 경우 (숫자/기호만) → 혼합 아님
    if ratio.total_alpha < 3:
        return False

    # 예상 언어에 따라 반대 언어 비율 체크
    if expected_language == Language.KO:
        # 한국어 예상인데 라틴 비율이 임계값 이상이면 혼합
        return ratio.latin_ratio >= MIXED_THRESHOLD_RATIO
    else:
        # 영어 예상인데 한글 비율이 임계값 이상이면 혼합
        return ratio.hangul_ratio >= MIXED_THRESHOLD_RATIO


# =============================================================================
# TurnOutput 텍스트 추출
# =============================================================================


@dataclass
class ExtractedText:
    """추출된 사용자 노출 텍스트.

    Attributes:
        field_path: 필드 경로 (예: "narrative", "ui.action_deck.cards[0].label")
        text: 텍스트 내용
    """

    field_path: str
    text: str


def extract_user_facing_texts(turn_output: TurnOutput) -> list[ExtractedText]:
    """TurnOutput에서 사용자 노출 텍스트를 추출합니다.

    검사 범위 (우선순위):
        - narrative
        - ui.action_deck.cards[].label, description, hint, reward_hint, disabled_reason
        - ui.objects[].label, interaction_hint
        - world.quests_updated[].label
        - world.rules_changed[].label, description
        - world.memory_pins[].content

    Args:
        turn_output: 검사할 TurnOutput

    Returns:
        list[ExtractedText]: 추출된 텍스트 목록
    """
    texts: list[ExtractedText] = []

    # 1. narrative (가장 중요)
    if turn_output.narrative:
        texts.append(ExtractedText(field_path="narrative", text=turn_output.narrative))

    # 2. ui.action_deck.cards[]
    for i, card in enumerate(turn_output.ui.action_deck.cards):
        texts.append(ExtractedText(field_path=f"ui.action_deck.cards[{i}].label", text=card.label))
        if card.description:
            texts.append(
                ExtractedText(
                    field_path=f"ui.action_deck.cards[{i}].description",
                    text=card.description,
                )
            )
        if card.hint:
            texts.append(
                ExtractedText(field_path=f"ui.action_deck.cards[{i}].hint", text=card.hint)
            )
        if card.reward_hint:
            texts.append(
                ExtractedText(
                    field_path=f"ui.action_deck.cards[{i}].reward_hint",
                    text=card.reward_hint,
                )
            )
        if card.disabled_reason:
            texts.append(
                ExtractedText(
                    field_path=f"ui.action_deck.cards[{i}].disabled_reason",
                    text=card.disabled_reason,
                )
            )

    # 3. ui.objects[]
    for i, obj in enumerate(turn_output.ui.objects):
        texts.append(ExtractedText(field_path=f"ui.objects[{i}].label", text=obj.label))
        if obj.interaction_hint:
            texts.append(
                ExtractedText(
                    field_path=f"ui.objects[{i}].interaction_hint",
                    text=obj.interaction_hint,
                )
            )

    # 4. world.quests_updated[]
    for i, quest in enumerate(turn_output.world.quests_updated):
        texts.append(ExtractedText(field_path=f"world.quests_updated[{i}].label", text=quest.label))

    # 5. world.rules_changed[]
    for i, rule in enumerate(turn_output.world.rules_changed):
        texts.append(ExtractedText(field_path=f"world.rules_changed[{i}].label", text=rule.label))
        if rule.description:
            texts.append(
                ExtractedText(
                    field_path=f"world.rules_changed[{i}].description",
                    text=rule.description,
                )
            )

    # 6. world.memory_pins[]
    for i, pin in enumerate(turn_output.world.memory_pins):
        texts.append(ExtractedText(field_path=f"world.memory_pins[{i}].content", text=pin.content))

    # 7. safety.message
    if turn_output.safety.message:
        texts.append(ExtractedText(field_path="safety.message", text=turn_output.safety.message))

    return texts


# =============================================================================
# 언어 혼합 검증 결과
# =============================================================================


@dataclass
class LanguageGateResult:
    """언어 혼합 검증 결과.

    Attributes:
        is_valid: 검증 통과 여부 (혼합 없음)
        violations: 위반 사항 목록 (필드 경로 + 샘플 토큰)
        expected_language: 예상 언어
    """

    is_valid: bool = True
    violations: list[dict[str, str]] = field(default_factory=lambda: [])
    expected_language: Language = Language.KO

    def add_violation(self, field_path: str, sample_text: str) -> None:
        """위반 사항을 추가합니다."""
        self.is_valid = False
        # 로그에 전체 텍스트 노출 방지 - 앞 50자만 샘플링
        truncated = sample_text[:50] + "..." if len(sample_text) > 50 else sample_text
        self.violations.append({"field": field_path, "sample": truncated})


def validate_language_consistency(
    turn_output: TurnOutput,
    expected_language: Language,
) -> LanguageGateResult:
    """TurnOutput의 언어 일관성을 검증합니다.

    사용자 노출 텍스트가 expected_language와 일치하는지 확인합니다.
    혼합 발견 시 위반 목록을 반환합니다.

    Args:
        turn_output: 검사할 TurnOutput
        expected_language: 예상 언어 (TurnInput.language)

    Returns:
        LanguageGateResult: 검증 결과

    Example:
        >>> result = validate_language_consistency(turn_output, Language.KO)
        >>> if not result.is_valid:
        ...     print(f"혼합 발견: {len(result.violations)}건")
    """
    result = LanguageGateResult(expected_language=expected_language)

    # 사용자 노출 텍스트 추출
    texts = extract_user_facing_texts(turn_output)

    # 각 텍스트 검사
    for extracted in texts:
        if is_language_mixed(extracted.text, expected_language):
            result.add_violation(extracted.field_path, extracted.text)

    if not result.is_valid:
        logger.warning(
            "[LanguageGate] 언어 혼합 감지",
            extra={
                "expected_language": expected_language.value,
                "violation_count": len(result.violations),
            },
        )

    return result


# =============================================================================
# i18n 에러 메시지 (RULE-006)
# =============================================================================

LANGUAGE_GATE_MESSAGES: dict[Language, dict[str, str]] = {
    Language.KO: {
        "summary_header": "언어 혼합이 감지되었습니다 (RULE-006 위반):",
        "violation_item": "- 필드 '{field}': 한국어로 작성해야 합니다",
        "instruction": "모든 사용자 노출 텍스트를 한국어(ko-KR)로 다시 작성하세요.",
    },
    Language.EN: {
        "summary_header": "Language mixing detected (RULE-006 violation):",
        "violation_item": "- Field '{field}': Must be written in English",
        "instruction": "Rewrite all user-facing text in English (en-US).",
    },
}


def build_language_error_summary(result: LanguageGateResult) -> str:
    """언어 혼합 검증 실패에 대한 에러 요약을 생성합니다.

    Repair 프롬프트에 포함할 요약입니다.
    전체 텍스트는 노출하지 않고 필드 경로만 표시합니다.

    Args:
        result: 언어 검증 결과

    Returns:
        str: 에러 요약 문자열
    """
    if result.is_valid:
        return ""

    messages = LANGUAGE_GATE_MESSAGES[result.expected_language]
    lines = [messages["summary_header"]]

    # 최대 5개까지만 표시 (너무 많으면 프롬프트 비대)
    for violation in result.violations[:5]:
        lines.append(messages["violation_item"].format(field=violation["field"]))

    if len(result.violations) > 5:
        remaining = len(result.violations) - 5
        if result.expected_language == Language.KO:
            lines.append(f"- (외 {remaining}건 추가 위반)")
        else:
            lines.append(f"- (and {remaining} more violations)")

    lines.append("")
    lines.append(messages["instruction"])

    return "\n".join(lines)
