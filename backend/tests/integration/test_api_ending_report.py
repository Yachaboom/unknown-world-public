"""Unknown World - 엔딩 리포트 API 통합 테스트.

U-025[Mvp] /api/ending-report 엔드포인트의 동작을 검증합니다.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from unknown_world.main import app


@pytest.mark.asyncio
async def test_create_ending_report_api_success():
    """엔딩 리포트 생성 API 성공 시나리오를 검증합니다."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        session_data = {
            "language": "ko-KR",
            "profile_id": "explorer",
            "turn_count": 10,
            "balance_initial": {"signal": 100, "memory_shard": 5},
            "balance_final": {"signal": 150, "memory_shard": 5},
            "narrative_entries": [
                {"text": "모험의 시작", "turn": 1, "type": "narrative"},
                {"text": "모험의 끝", "turn": 10, "type": "narrative"},
            ],
            "quests": [{"id": "q1", "label": "첫 과제", "is_completed": True, "is_main": True}],
            "economy_ledger": [
                {"reason": "초기", "cost_signal": 0, "balance_signal": 100},
                {"reason": "보상", "cost_signal": 0, "balance_signal": 150},
            ],
        }

        response = await ac.post("/api/ending-report", json=session_data)

    assert response.status_code == 200
    report = response.json()

    assert report["title"] == "세션 리포트"
    assert "모험의 시작" in report["narrative_summary"]
    assert report["quest_achievement"]["completion_rate"] == 1.0
    assert report["economy_settlement"]["balance_consistent"] is True
    assert "generated_at" in report
