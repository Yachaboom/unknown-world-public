"""Unknown World - /api/ending-report 엔딩 리포트 생성 엔드포인트.

POST 요청으로 세션 데이터를 받아 구조화된 엔딩 리포트를 반환합니다.

설계 원칙:
    - RULE-003: 구조화 출력(JSON Schema) 우선 + Pydantic 검증
    - RULE-005: 경제 결산은 ledger 기반 일관성 검증
    - RULE-006: 리포트 언어는 세션 언어와 동일

참조:
    - vibe/unit-plans/U-025[Mvp].md
    - vibe/prd.md 6.5
"""

from __future__ import annotations

import logging

from fastapi import APIRouter

from unknown_world.artifacts.ending_report import (
    EndingReport,
    SessionSummaryRequest,
    generate_ending_report,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Artifacts"])


@router.post(
    "/ending-report",
    response_model=EndingReport,
    summary="Generate ending report",
    description="Generates a structured ending report artifact from session data.",
)
async def create_ending_report(session: SessionSummaryRequest) -> EndingReport:
    """세션 데이터로부터 엔딩 리포트를 생성합니다.

    프론트엔드에서 세션 종료 시 수집한 데이터를 전달받아
    구조화된 엔딩 리포트 아티팩트를 반환합니다.

    Args:
        session: 세션 요약 데이터 (내러티브, 퀘스트, 경제, 룰 등)

    Returns:
        EndingReport: 구조화된 엔딩 리포트
    """
    logger.info(
        "[EndingReport] API request: profile=%s, language=%s, turns=%d",
        session.profile_id,
        session.language.value,
        session.turn_count,
    )

    report = generate_ending_report(session)

    logger.info("[EndingReport] API response: generated_at=%s", report.generated_at)

    return report
