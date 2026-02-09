"""Unknown World - Artifacts 패키지.

게임 세션에서 생성되는 아티팩트(엔딩 리포트 등)를 관리합니다.

참조:
    - vibe/unit-plans/U-025[Mvp].md
    - vibe/prd.md 6.5 (동적 엔딩 생성기)
"""

from unknown_world.artifacts.ending_report import (
    EndingReport,
    SessionSummaryRequest,
    generate_ending_report,
)

__all__ = [
    "EndingReport",
    "SessionSummaryRequest",
    "generate_ending_report",
]
