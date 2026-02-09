"""Unknown World - RATE_LIMITED 에러 흐름 통합 테스트 (U-130).

백엔드에서 429 에러로 모든 재시도가 소진되었을 때,
스트림으로 code: "RATE_LIMITED" 에러 이벤트가 송출되는지 검증합니다.
"""

import json
import os
from unittest.mock import patch

import pytest

# 테스트 환경에서 Mock 모드 강제
os.environ["UW_MODE"] = "mock"

from fastapi.testclient import TestClient

from unknown_world.main import app
from unknown_world.models.turn import (
    ClientInfo,
    CurrencyAmount,
    EconomySnapshot,
    Language,
    TurnInput,
)
from unknown_world.orchestrator.stages.types import PipelineContext

client = TestClient(app)


@pytest.fixture
def base_turn_input() -> TurnInput:
    return TurnInput(
        language=Language.KO,
        text="테스트",
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )


@pytest.mark.asyncio
async def test_rate_limit_error_streaming(base_turn_input):
    """429 에러 상황에서 RATE_LIMITED 에러 이벤트가 송출되는지 테스트합니다."""
    payload = base_turn_input.model_dump(mode="json")

    # Pipeline 실행 결과로 is_rate_limited=True인 컨텍스트를 반환하도록 모킹
    mock_context = PipelineContext(
        turn_input=base_turn_input,
        economy_snapshot=CurrencyAmount(signal=100, memory_shard=5),
        is_rate_limited=True,
        is_fallback=True,
        repair_attempts=2,
    )

    with patch("unknown_world.api.turn.run_pipeline", return_value=mock_context):
        response = client.post("/api/turn", json=payload)

        assert response.status_code == 200
        events = [json.loads(line) for line in response.iter_lines() if line]

        # 1. 에러 이벤트 확인
        error_events = [e for e in events if e["type"] == "error"]
        assert len(error_events) == 1
        assert error_events[0]["code"] == "RATE_LIMITED"

        # 2. RATE_LIMITED 시에는 final 이벤트가 없어야 함 (재시도 UI 유도)
        final_events = [e for e in events if e["type"] == "final"]
        assert len(final_events) == 0


@pytest.mark.asyncio
async def test_normal_error_fallback_streaming(base_turn_input):
    """일반적인 에러 상황에서는 final(폴백)이 포함되어야 함."""
    payload = base_turn_input.model_dump(mode="json")

    # Pipeline이 예외를 발생시키도록 모킹
    # run_pipeline_task 내부에서 Exception을 잡아서 create_safe_fallback을 호출함
    with patch("unknown_world.api.turn.run_pipeline", side_effect=RuntimeError("Generic Error")):
        response = client.post("/api/turn", json=payload)

        assert response.status_code == 200
        events = [json.loads(line) for line in response.iter_lines() if line]

        # 일반 에러 시에는 final(폴백) 이벤트가 포함되어야 함 (RULE-004)
        final_events = [e for e in events if e["type"] == "final"]
        assert len(final_events) == 1
        assert (
            "혼란" in final_events[0]["data"]["narrative"]
            or "confusion" in final_events[0]["data"]["narrative"].lower()
        )
