"""Unknown World - 멀티턴 대화 히스토리 관리 모듈 (U-127).

세션별 대화 히스토리를 관리하고, Gemini API `contents` 배열 형태로
멀티턴 컨텍스트를 제공합니다.

설계 원칙:
    - 최근 N턴(기본 5)의 대화 히스토리를 슬라이딩 윈도우로 유지
    - Gemini 3 Thought Signatures를 턴 간에 순환(circulation)
    - 토큰 예산 상한으로 비용 폭증 방지
    - 프롬프트 원문은 히스토리에 포함하지 않음 (RULE-007)
    - Option C: 사용자 텍스트 + GM 내러티브 + 핵심 상태 변화(delta)

참조:
    - vibe/unit-plans/U-127[Mvp].md
    - vibe/ref/gemini-api-guide.md (Thought Signatures)
"""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass
from typing import Any, cast

logger = logging.getLogger(__name__)

# =============================================================================
# 환경변수 기반 설정
# =============================================================================

DEFAULT_MAX_TURNS = 5
"""기본 히스토리 윈도우 크기 (턴 수)."""

DEFAULT_MAX_TOKENS = 50000
"""기본 히스토리 토큰 예산 상한."""

CHARS_PER_TOKEN_ESTIMATE = 3
"""토큰 추정 계수 (한/영 혼합 기준 약 3자당 1토큰)."""


def _get_max_turns() -> int:
    """환경변수에서 최대 턴 수를 읽습니다."""
    return int(os.environ.get("UW_HISTORY_MAX_TURNS", str(DEFAULT_MAX_TURNS)))


def _get_max_tokens() -> int:
    """환경변수에서 최대 토큰 예산을 읽습니다."""
    return int(os.environ.get("UW_HISTORY_MAX_TOKENS", str(DEFAULT_MAX_TOKENS)))


# =============================================================================
# 턴 엔트리
# =============================================================================


@dataclass
class HistoryTurnEntry:
    """단일 턴의 히스토리 엔트리.

    Attributes:
        user_content: 사용자 입력 내용 (텍스트 + 액션 요약)
        model_content: GM 응답 내용 (내러티브 + 상태 변화 요약)
        thought_signature: Gemini 3 Thought Signature (모델 응답에서 추출)
        char_count: 엔트리의 총 문자 수 (토큰 추정용)
    """

    user_content: str
    model_content: str
    thought_signature: str | None = None
    char_count: int = 0

    def __post_init__(self) -> None:
        """문자 수를 자동 계산합니다."""
        self.char_count = len(self.user_content) + len(self.model_content)


# =============================================================================
# ConversationHistory
# =============================================================================


class ConversationHistory:
    """세션별 대화 히스토리 관리자.

    MVP: 서버 메모리 기반으로 세션 ID별 히스토리를 저장합니다.
    서버 재시작 시 초기화됩니다.

    Example:
        >>> history = ConversationHistory()
        >>> history.add_turn(
        ...     user_content="문을 열어본다",
        ...     model_content="문이 삐걱거리며 열립니다... [세계 변화: 열쇠 -1]",
        ...     thought_signature="<sig_abc>",
        ... )
        >>> contents = history.get_contents(max_turns=5)
    """

    def __init__(self) -> None:
        """ConversationHistory를 초기화합니다."""
        self._entries: list[HistoryTurnEntry] = []
        self._lock = threading.Lock()

    def add_turn(
        self,
        user_content: str,
        model_content: str,
        thought_signature: str | None = None,
    ) -> None:
        """턴을 히스토리에 추가합니다.

        Args:
            user_content: 사용자 입력 요약
            model_content: GM 응답 요약 (내러티브 + 핵심 상태 변화)
            thought_signature: Gemini 3 Thought Signature
        """
        entry = HistoryTurnEntry(
            user_content=user_content,
            model_content=model_content,
            thought_signature=thought_signature,
        )
        with self._lock:
            self._entries.append(entry)
            # 최대 턴 수 초과 시 오래된 턴부터 제거
            max_turns = _get_max_turns()
            if len(self._entries) > max_turns * 2:  # 여유 버퍼 2배
                self._entries = self._entries[-max_turns:]

        logger.debug(
            "[ConversationHistory] 턴 추가",
            extra={
                "total_entries": len(self._entries),
                "has_thought_signature": thought_signature is not None,
            },
        )

    def get_contents(
        self,
        max_turns: int | None = None,
    ) -> list[dict[str, Any]]:
        """Gemini API `contents` 형태로 히스토리를 반환합니다.

        최근 N턴을 user/model 교차 메시지로 변환합니다.
        Thought Signature는 model 응답의 parts에 포함됩니다.

        Args:
            max_turns: 최대 포함 턴 수 (None이면 환경변수 기본값)

        Returns:
            Gemini API contents 배열 (user/model 교차)
        """
        if max_turns is None:
            max_turns = _get_max_turns()

        with self._lock:
            entries = list(self._entries)

        # 슬라이딩 윈도우: 최근 N턴
        entries = entries[-max_turns:]

        # 토큰 예산 제한
        entries = self._trim_to_token_budget(entries)

        # contents 배열 구성
        contents: list[dict[str, Any]] = []
        for entry in entries:
            # User 메시지
            contents.append(
                {
                    "role": "user",
                    "parts": [{"text": entry.user_content}],
                }
            )

            # Model 메시지 (Thought Signature 포함)
            model_parts: list[dict[str, Any]] = [{"text": entry.model_content}]
            if entry.thought_signature:
                # base64 인코딩된 Thought Signature를 bytes로 복원하여 API에 전달
                import base64

                try:
                    sig_bytes = base64.b64decode(entry.thought_signature)
                    model_parts[0]["thoughtSignature"] = sig_bytes
                except Exception:
                    # 디코딩 실패 시 문자열 그대로 전달 (안전한 폴백)
                    model_parts[0]["thoughtSignature"] = entry.thought_signature

            contents.append(
                {
                    "role": "model",
                    "parts": model_parts,
                }
            )

        return contents

    def get_last_thought_signature(self) -> str | None:
        """마지막 턴의 Thought Signature를 반환합니다.

        Returns:
            마지막 Thought Signature 또는 None
        """
        with self._lock:
            if not self._entries:
                return None
            return self._entries[-1].thought_signature

    def clear(self) -> None:
        """히스토리를 초기화합니다."""
        with self._lock:
            self._entries.clear()
        logger.info("[ConversationHistory] 히스토리 초기화됨")

    @property
    def turn_count(self) -> int:
        """현재 저장된 턴 수."""
        with self._lock:
            return len(self._entries)

    def _trim_to_token_budget(
        self,
        entries: list[HistoryTurnEntry],
    ) -> list[HistoryTurnEntry]:
        """토큰 예산 상한을 초과하지 않도록 오래된 턴부터 제거합니다.

        Args:
            entries: 히스토리 엔트리 목록

        Returns:
            토큰 예산 내로 잘린 엔트리 목록
        """
        max_tokens = _get_max_tokens()
        max_chars = max_tokens * CHARS_PER_TOKEN_ESTIMATE

        total_chars = sum(e.char_count for e in entries)

        # 최신 턴부터 유지하며 예산 내로 자름
        while entries and total_chars > max_chars:
            removed = entries.pop(0)  # 가장 오래된 턴 제거
            total_chars -= removed.char_count
            logger.debug(
                "[ConversationHistory] 토큰 예산 초과로 턴 제거",
                extra={
                    "removed_chars": removed.char_count,
                    "remaining_chars": total_chars,
                    "remaining_entries": len(entries),
                },
            )

        return entries


# =============================================================================
# 세션 관리자 (전역 싱글톤)
# =============================================================================

_session_histories: dict[str, ConversationHistory] = {}
_session_lock = threading.Lock()

DEFAULT_SESSION_ID = "default"
"""기본 세션 ID (MVP: 단일 플레이어)."""


def get_conversation_history(session_id: str = DEFAULT_SESSION_ID) -> ConversationHistory:
    """세션 ID에 해당하는 ConversationHistory를 반환합니다.

    존재하지 않으면 새로 생성합니다.

    Args:
        session_id: 세션 식별자 (기본: "default")

    Returns:
        ConversationHistory 인스턴스
    """
    with _session_lock:
        if session_id not in _session_histories:
            _session_histories[session_id] = ConversationHistory()
            logger.info(
                "[ConversationHistory] 새 세션 히스토리 생성",
                extra={"session_id": session_id},
            )
        return _session_histories[session_id]


def reset_conversation_history(session_id: str = DEFAULT_SESSION_ID) -> None:
    """세션 히스토리를 초기화합니다.

    Args:
        session_id: 세션 식별자 (기본: "default")
    """
    with _session_lock:
        if session_id in _session_histories:
            _session_histories[session_id].clear()
            del _session_histories[session_id]
    logger.info(
        "[ConversationHistory] 세션 히스토리 리셋",
        extra={"session_id": session_id},
    )


def reset_all_histories() -> None:
    """모든 세션 히스토리를 초기화합니다."""
    with _session_lock:
        for history in _session_histories.values():
            history.clear()
        _session_histories.clear()
    logger.info("[ConversationHistory] 전체 히스토리 리셋")


def build_model_content_summary(
    narrative: str,
    world_delta: dict[str, Any] | None = None,
) -> str:
    """모델 응답을 히스토리용 요약 문자열로 변환합니다.

    Option C: GM 내러티브 + 핵심 상태 변화(delta)

    Args:
        narrative: GM 내러티브 텍스트
        world_delta: 세계 상태 변화 요약 (선택)

    Returns:
        히스토리에 저장할 모델 응답 요약
    """
    summary = narrative

    if world_delta:
        delta_parts: list[str] = []
        # 인벤토리 추가
        added_raw: list[Any] = list(world_delta.get("inventory_added") or [])
        if added_raw:
            labels: list[str] = []
            for item in added_raw:
                if isinstance(item, dict):
                    item_dict = cast(dict[str, Any], item)
                    label_val: str = str(item_dict.get("label", "?"))
                    labels.append(label_val)
            if labels:
                delta_parts.append(f"획득: {', '.join(labels)}")
        # 인벤토리 제거
        removed_raw: list[Any] = list(world_delta.get("inventory_removed") or [])
        if removed_raw:
            removed_strs: list[str] = [str(r) for r in removed_raw]
            delta_parts.append(f"소모: {', '.join(removed_strs)}")
        # 규칙 변화
        rules_raw: list[Any] = list(world_delta.get("rules_added") or [])
        if rules_raw:
            delta_parts.append(f"규칙 추가: {len(rules_raw)}개")

        if delta_parts:
            summary += f"\n[상태 변화: {'; '.join(delta_parts)}]"

    return summary
