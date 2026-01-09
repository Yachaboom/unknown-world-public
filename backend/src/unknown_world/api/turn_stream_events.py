"""Unknown World - Turn Stream 이벤트 계약(Contract).

NDJSON 스트리밍에서 사용되는 이벤트 타입, 모델, 유틸리티를 정의합니다.
이 모듈은 Orchestrator ↔ API ↔ Frontend 간의 스트림 이벤트 계약 SSOT입니다.

설계 원칙:
    - RU-002-Q4: 이벤트 계약을 transport 계층으로 분리
    - RULE-003: 구조화 출력(JSON Schema) 우선 + Pydantic 검증
    - RULE-008: 단계/배지 가시화

참조:
    - vibe/unit-plans/U-007[Mvp].md
    - vibe/refactors/RU-002-Q4.md
"""

from __future__ import annotations

import json
from typing import Annotated, Any

from pydantic import BaseModel, Field

# =============================================================================
# 스트림 이벤트 타입 상수
# =============================================================================


class StreamEventType:
    """스트림 이벤트 타입 상수.

    NDJSON 스트리밍에서 사용되는 이벤트 타입입니다.
    PRD 예시 단계: Parse→Validate→Plan→Resolve→Render→Verify→Commit
    """

    STAGE = "stage"
    BADGES = "badges"
    NARRATIVE_DELTA = "narrative_delta"
    FINAL = "final"
    ERROR = "error"
    REPAIR = "repair"


class StageStatus:
    """단계 상태 상수."""

    START = "start"
    COMPLETE = "complete"
    FAIL = "fail"


# =============================================================================
# 스트림 이벤트 모델 (Pydantic)
# =============================================================================


class StageEvent(BaseModel):
    """단계 진행 이벤트.

    Attributes:
        type: 이벤트 타입 ("stage")
        name: 단계 이름 (Parse, Validate, Plan, Resolve, Render, Verify, Commit)
        status: 상태 (start, complete)
    """

    type: Annotated[str, Field(default=StreamEventType.STAGE)]
    name: str
    status: str


class RepairEvent(BaseModel):
    """자동 복구(Repair) 이벤트.

    Attributes:
        type: 이벤트 타입 ("repair")
        attempt: 현재 시도 횟수
        message: 복구 메시지 (선택)
    """

    type: Annotated[str, Field(default=StreamEventType.REPAIR)]
    attempt: int
    message: str | None = None


class BadgesEvent(BaseModel):
    """배지 이벤트.

    Attributes:
        type: 이벤트 타입 ("badges")
        badges: 검증 배지 목록
    """

    type: Annotated[str, Field(default=StreamEventType.BADGES)]
    badges: list[str]


class NarrativeDeltaEvent(BaseModel):
    """내러티브 델타 이벤트 (타자 효과용).

    Attributes:
        type: 이벤트 타입 ("narrative_delta")
        text: 추가된 텍스트 조각
    """

    type: Annotated[str, Field(default=StreamEventType.NARRATIVE_DELTA)]
    text: str


class FinalEvent(BaseModel):
    """최종 TurnOutput 이벤트.

    Attributes:
        type: 이벤트 타입 ("final")
        data: 완전한 TurnOutput

    Note:
        TurnOutput은 TYPE_CHECKING 블록에서 import되며,
        런타임에는 Any로 처리됩니다.
    """

    type: Annotated[str, Field(default=StreamEventType.FINAL)]
    data: Any  # TurnOutput (순환 import 방지)


class ErrorEvent(BaseModel):
    """에러 이벤트.

    Attributes:
        type: 이벤트 타입 ("error")
        message: 에러 메시지 (프롬프트/내부 추론 노출 금지)
        code: 에러 코드 (선택)
    """

    type: Annotated[str, Field(default=StreamEventType.ERROR)]
    message: str
    code: str | None = None


# =============================================================================
# 유틸리티 함수
# =============================================================================


def serialize_event(event: dict[str, Any]) -> str:
    """이벤트를 NDJSON 라인으로 직렬화합니다.

    Args:
        event: 직렬화할 이벤트 딕셔너리

    Returns:
        str: NDJSON 형식 문자열 (줄바꿈 포함)
    """
    return json.dumps(event, ensure_ascii=False) + "\n"


# =============================================================================
# 모듈 공개 API
# =============================================================================

__all__ = [
    "StreamEventType",
    "StageStatus",
    "StageEvent",
    "RepairEvent",
    "BadgesEvent",
    "NarrativeDeltaEvent",
    "FinalEvent",
    "ErrorEvent",
    "serialize_event",
]
