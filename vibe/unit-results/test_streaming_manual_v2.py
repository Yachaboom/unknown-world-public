
import json
from fastapi.testclient import TestClient
from unknown_world.main import app
from unknown_world.models.turn import ValidationBadge

client = TestClient(app)

def test_manual_verification():
    payload = {
        "language": "ko-KR",
        "text": "검증 테스트",
        "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
        "economy_snapshot": {"signal": 100, "memory_shard": 5}
    }
    
    print("\n--- [START] Scenario A/C Verification ---")
    response = client.post("/api/turn?seed=12345", json=payload)
    assert response.status_code == 200
    
    events = []
    for line in response.iter_lines():
        if line:
            event = json.loads(line)
            events.append(event)
            print(f"Event: {event['type']} | Status/Name: {event.get('status', event.get('name', ''))}")

    # 1. 스트림 종료 인바리언트 (항상 final로 끝남)
    assert events[-1]["type"] == "final", "Stream must end with final event"
    print("PASS Invariant: Stream ends with 'final'")

    # 2. RULE-008: 단계 가시화 (Parse -> Commit)
    stages = [e["name"] for e in events if e["type"] == "stage" and e.get("status") == "start"]
    expected_stages = ["parse", "validate", "plan", "resolve", "render", "verify", "commit"]
    assert stages == expected_stages, f"Stage sequence mismatch: {stages}"
    print("PASS RULE-008: 7 phases sequence OK")

    # 3. RULE-009: 좌표 규약 검증
    final_data = next(e["data"] for e in events if e["type"] == "final")
    objects = final_data["ui"]["objects"]
    if objects:
        for obj in objects:
            box = obj["box_2d"]
            # 형식 확인
            assert list(box.keys()) == ["ymin", "xmin", "ymax", "xmax"], f"Invalid BBox keys: {box.keys()}"
            # 범위 확인
            for k, v in box.items():
                assert 0 <= v <= 1000, f"Value out of range (0-1000): {k}={v}"
        print(f"PASS RULE-009: BBox [ymin, xmin, ymax, xmax] 0-1000 OK (count: {len(objects)})")

    print("\n--- [START] Scenario B Verification (Error Fallback) ---")
    invalid_payload = {"text": "", "language": "bad-lang"}
    response = client.post("/api/turn", json=invalid_payload)
    err_events = [json.loads(line) for line in response.iter_lines() if line]
    
    # error + final 순서 확인
    assert err_events[0]["type"] == "error"
    assert err_events[1]["type"] == "final"
    assert err_events[1]["data"]["agent_console"]["badges"] == ["schema_fail"]
    print("PASS Scenario B: error + final(fallback) sequence OK")
    print("--- [COMPLETE] Manual Verification ---")

if __name__ == "__main__":
    test_manual_verification()
