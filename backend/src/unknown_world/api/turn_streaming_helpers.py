"""Unknown World - Turn 스트리밍 공통 헬퍼.

NDJSON 스트리밍에서 반복되는 패턴을 추출한 헬퍼 함수들입니다.

설계 원칙:
    - RU-005-Q3: 중복되는 스트리밍 조각을 helper로 추출
    - RULE-004: 에러 경로에서도 final 1회 종료 인바리언트 유지
    - RULE-007/008: 프롬프트/내부 추론 노출 금지

참조:
    - vibe/refactors/RU-005-Q3.md
    - vibe/unit-plans/U-007[Mvp].md
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

from unknown_world.api.turn_stream_events import (
    ErrorEvent,
    FinalEvent,
    NarrativeDeltaEvent,
    StreamEventType,
    serialize_event,
)
from unknown_world.models.turn import (
    CurrencyAmount,
    Language,
    TurnOutput,
)
from unknown_world.orchestrator.fallback import create_safe_fallback

# =============================================================================
# 스트리밍 헬퍼 상수
# =============================================================================

DEFAULT_CHUNK_SIZE = 20
"""내러티브 델타 청크 크기 (문자 수)."""

DEFAULT_TYPING_DELAY_SEC = 0.02
"""타자 효과 딜레이 (초)."""

# =============================================================================
# 에러 메시지 (i18n)
# =============================================================================

ERROR_MESSAGES = {
    Language.KO: {
        "internal_error": "처리 중 오류가 발생했습니다",
        "validation_error": "입력 검증에 실패했습니다",
    },
    Language.EN: {
        "internal_error": "An error occurred during processing",
        "validation_error": "Input validation failed",
    },
}


# =============================================================================
# 내러티브 델타 스트리밍 헬퍼
# =============================================================================


async def stream_narrative_delta(
    narrative: str,
    *,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    delay_sec: float = DEFAULT_TYPING_DELAY_SEC,
) -> AsyncGenerator[str]:
    """내러티브 텍스트를 타자 효과로 스트리밍합니다.

    Args:
        narrative: 전체 내러티브 텍스트
        chunk_size: 청크당 문자 수 (기본 20)
        delay_sec: 청크 간 딜레이 (초, 기본 0.02)

    Yields:
        str: NDJSON 라인 (narrative_delta 이벤트)

    Example:
        >>> async for line in stream_narrative_delta("안녕하세요"):
        ...     print(line)
    """
    for i in range(0, len(narrative), chunk_size):
        chunk = narrative[i : i + chunk_size]
        yield serialize_event(
            NarrativeDeltaEvent(
                type=StreamEventType.NARRATIVE_DELTA,
                text=chunk,
            ).model_dump()
        )
        await asyncio.sleep(delay_sec)


# =============================================================================
# Error + Final 폴백 헬퍼
# =============================================================================


async def emit_error_with_fallback(
    language: Language,
    *,
    error_message: str | None = None,
    error_code: str = "INTERNAL_ERROR",
    economy_snapshot: CurrencyAmount | None = None,
    repair_count: int = 0,
    is_blocked: bool = False,
) -> AsyncGenerator[str]:
    """에러 이벤트와 안전한 폴백 final을 순서대로 송출합니다.

    RULE-004: 에러 경로에서도 반드시 final 1회 종료 인바리언트를 유지합니다.

    Args:
        language: 응답 언어
        error_message: 에러 메시지 (None이면 기본 메시지 사용)
        error_code: 에러 코드 (기본 "INTERNAL_ERROR")
        economy_snapshot: 현재 재화 상태
        repair_count: 복구 시도 횟수
        is_blocked: 안전 정책에 의해 차단되었는지

    Yields:
        str: NDJSON 라인 (error 이벤트 → final 이벤트)

    Example:
        >>> async for line in emit_error_with_fallback(Language.KO):
        ...     print(line)
    """
    # 에러 메시지 결정
    messages = ERROR_MESSAGES[language]
    message = error_message or messages.get("internal_error", "Error occurred")

    # 에러 이벤트 송출
    yield serialize_event(
        ErrorEvent(
            type=StreamEventType.ERROR,
            message=message,
            code=error_code,
        ).model_dump()
    )

    # 안전한 폴백 생성 및 송출
    fallback = create_safe_fallback(
        language=language,
        economy_snapshot=economy_snapshot,
        repair_count=repair_count,
        is_blocked=is_blocked,
    )
    yield serialize_event(
        FinalEvent(
            type=StreamEventType.FINAL,
            data=fallback,
        ).model_dump(mode="json")
    )


async def emit_final(output: TurnOutput) -> AsyncGenerator[str]:
    """최종 TurnOutput을 final 이벤트로 송출합니다.

    Args:
        output: 최종 TurnOutput

    Yields:
        str: NDJSON 라인 (final 이벤트)
    """
    yield serialize_event(
        FinalEvent(
            type=StreamEventType.FINAL,
            data=output,
        ).model_dump(mode="json")
    )


# =============================================================================
# 복합 헬퍼 (내러티브 + final)
# =============================================================================


async def stream_output_with_narrative(
    output: TurnOutput,
    *,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    delay_sec: float = DEFAULT_TYPING_DELAY_SEC,
) -> AsyncGenerator[str]:
    """내러티브 델타 스트리밍 후 final 이벤트를 송출합니다.

    Args:
        output: 최종 TurnOutput
        chunk_size: 청크당 문자 수
        delay_sec: 청크 간 딜레이 (초)

    Yields:
        str: NDJSON 라인 (narrative_delta 이벤트들 → final 이벤트)
    """
    # 내러티브 델타 스트리밍
    async for line in stream_narrative_delta(
        output.narrative,
        chunk_size=chunk_size,
        delay_sec=delay_sec,
    ):
        yield line

    # final 이벤트 송출
    async for line in emit_final(output):
        yield line


# =============================================================================
# 모듈 공개 API
# =============================================================================

__all__ = [
    "DEFAULT_CHUNK_SIZE",
    "DEFAULT_TYPING_DELAY_SEC",
    "ERROR_MESSAGES",
    "stream_narrative_delta",
    "emit_error_with_fallback",
    "emit_final",
    "stream_output_with_narrative",
]
