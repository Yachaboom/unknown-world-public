"""Unknown World - /api/turn HTTP Streaming 통합 테스트.

NDJSON 스트리밍 이벤트의 순서, 구조, 데이터 정밀도를 검증합니다.
"""

import json

from fastapi.testclient import TestClient

from unknown_world.main import app
from unknown_world.models.turn import Language, TurnOutput

client = TestClient(app)


def test_turn_streaming_success():
    """정상적인 턴 요청 시 NDJSON 스트림이 올바른 순서로 반환되는지 테스트합니다."""
    payload = {
        "language": "ko-KR",
        "text": "테스트 입력",
        "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
        "economy_snapshot": {"signal": 100, "memory_shard": 5},
    }

    # StreamingResponse 테스트
    response = client.post("/api/turn", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/x-ndjson"

    events = []
    for line in response.iter_lines():
        if line:
            events.append(json.loads(line))

    # 1. 이벤트 존재 여부 확인
    assert len(events) > 0

    # 2. 첫 번째 이벤트는 항상 stage: parse: start 여야 함 (TTFB)
    assert events[0]["type"] == "stage"
    assert events[0]["name"] == "parse"
    assert events[0]["status"] == "start"

    # 3. 단계별 이벤트 순서 확인
    stages = [e["name"] for e in events if e["type"] == "stage" and e["status"] == "start"]
    expected_stages = ["parse", "validate", "plan", "resolve", "render", "verify", "commit"]
    assert stages == expected_stages

    # 4. 배지 이벤트 포함 여부 확인
    # U-060: badges 발생 여부가 중요, 정확한 수는 구현 세부사항이므로 >= 1로 완화
    badges_events = [e for e in events if e["type"] == "badges"]
    assert len(badges_events) >= 1, "최소 1개 이상의 badges 이벤트가 필요합니다"
    assert "schema_ok" in badges_events[0]["badges"]

    # 5. 최종 결과물 확인
    final_events = [e for e in events if e["type"] == "final"]
    assert len(final_events) == 1

    turn_output_data = final_events[0]["data"]
    # Pydantic 모델로 다시 검증 (RULE-003)
    turn_output = TurnOutput.model_validate(turn_output_data)
    assert turn_output.language == Language.KO
    assert len(turn_output.narrative) > 0


def test_turn_streaming_invalid_input():
    """잘못된 입력 요청 시 에러 이벤트가 스트리밍되는지 테스트합니다."""
    payload = {
        "language": "invalid-lang",  # 잘못된 언어 코드
        "text": "",
    }

    response = client.post("/api/turn", json=payload)
    # 입력 검증 실패 시에도 200 OK 스트림으로 에러를 보낼 수도 있고,
    # 400 Bad Request를 보낼 수도 있음. 현재 구현은 200 OK + type: error 임.
    assert response.status_code == 200

    events = [json.loads(line) for line in response.iter_lines() if line]
    assert any(e["type"] == "error" for e in events)
    assert any(e["code"] == "VALIDATION_ERROR" for e in events)


def test_turn_streaming_deterministic_seed():
    """seed 파라미터 사용 시 결과가 결정적인지 테스트합니다."""
    payload = {
        "language": "en-US",
        "text": "Hello",
        "client": {"viewport_w": 1920, "viewport_h": 1080},
        "economy_snapshot": {"signal": 100, "memory_shard": 5},
    }

    # 동일한 시드로 두 번 요청
    seed = 12345

    def get_final_output(s):
        resp = client.post(f"/api/turn?seed={s}", json=payload)
        events = [json.loads(line) for line in resp.iter_lines() if line]
        return next(e["data"] for e in events if e["type"] == "final")

    output1 = get_final_output(seed)
    output2 = get_final_output(seed)

    assert output1 == output2
    assert output1["language"] == "en-US"


def test_turn_streaming_generation_fallback(monkeypatch):
    """생성 중 ValidationError 발생 시 안전한 폴백이 반환되는지 테스트합니다."""
    from pydantic import ValidationError

    from unknown_world.orchestrator.mock import MockOrchestrator

    def mock_generate_failure(self, turn_input):
        # Pydantic ValidationError를 수동으로 생성하는 것은 복잡하므로
        # 간단한 필드 검증 오류를 시뮬레이션하거나 직접 raise 함
        # 여기서는 테스트를 위해 임의의 필드 누락 등으로 발생한다고 가정
        raise ValidationError.from_exception_data(title="MockError", line_errors=[])

    monkeypatch.setattr(MockOrchestrator, "generate_turn_output", mock_generate_failure)

    payload = {
        "language": "ko-KR",
        "text": "테스트",
        "client": {"viewport_w": 1920, "viewport_h": 1080},
        "economy_snapshot": {"signal": 100, "memory_shard": 5},
    }

    response = client.post("/api/turn", json=payload)
    events = [json.loads(line) for line in response.iter_lines() if line]

    final_event = next(e for e in events if e["type"] == "final")
    turn_output = final_event["data"]

    # 폴백 응답의 특징 확인
    # RU-005-Q1: SSOT fallback은 모든 카테고리의 배지를 일관되게 포함 (RU-005-S1)
    badges = turn_output["agent_console"]["badges"]
    assert "schema_fail" in badges, "폴백은 schema_fail 배지를 포함해야 함"
    assert "economy_ok" in badges, "폴백은 economy_ok 배지를 포함해야 함 (비용 0)"
    assert "safety_ok" in badges, "폴백은 safety_ok 배지를 포함해야 함"
    assert "consistency_ok" in badges, "폴백은 consistency_ok 배지를 포함해야 함"
    assert turn_output["agent_console"]["repair_count"] >= 1
    assert "혼란" in turn_output["narrative"] or "confusion" in turn_output["narrative"]


def test_turn_streaming_repair_loop(monkeypatch):
    """검증 실패 시 repair 이벤트가 스트림에 포함되는지 테스트합니다 (RU-002)."""
    from pydantic import ValidationError

    from unknown_world.orchestrator.mock import MockOrchestrator

    # 첫 번째 호출에서 실패하여 repair 트리거 시뮬레이션
    # (실제 구현에서는 N회 재시도 로직이 turn.py에 있어야 함)
    call_count = 0

    def mock_generate_with_repair(self, turn_input):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise ValidationError.from_exception_data(title="MockSchemaError", line_errors=[])
        return orchestrator_orig_generate(self, turn_input)

    import unknown_world.orchestrator.mock as mock_mod

    orchestrator_orig_generate = mock_mod.MockOrchestrator.generate_turn_output
    monkeypatch.setattr(MockOrchestrator, "generate_turn_output", mock_generate_with_repair)

    payload = {
        "language": "ko-KR",
        "text": "리페어 테스트",
        "client": {"viewport_w": 1920, "viewport_h": 1080},
        "economy_snapshot": {"signal": 100, "memory_shard": 5},
    }

    response = client.post("/api/turn", json=payload)
    events = [json.loads(line) for line in response.iter_lines() if line]

    # RU-002 요구사항: repair 이벤트가 명시적으로 존재해야 함
    repair_events = [e for e in events if e["type"] == "repair"]
    assert len(repair_events) >= 1
    assert "attempt" in repair_events[0]
    assert repair_events[0]["attempt"] == 1
