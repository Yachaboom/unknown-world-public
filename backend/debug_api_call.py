"""Debug: 서버 API 호출 테스트."""

import json

import httpx


def main():
    url = "http://localhost:8011/api/turn"
    payload = {
        "language": "ko-KR",
        "text": "문을 열어본다",
        "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
        "economy_snapshot": {"signal": 100, "memory_shard": 5},
    }

    print(f"Sending to: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False)}")
    print()

    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, json=payload)
        print(f"Status: {response.status_code}")
        print()

        lines = response.text.strip().split("\n")
        for line in lines:
            data = json.loads(line)
            event_type = data.get("type")

            if event_type == "badges":
                print(f"BADGES: {data.get('badges')}")
            elif event_type == "repair":
                print(f"REPAIR attempt={data.get('attempt')}: {data.get('message')}")
            elif event_type == "final":
                final_data = data.get("data", {})
                print(f"FINAL badges: {final_data.get('agent_console', {}).get('badges')}")
                print(
                    f"FINAL repair_count: {final_data.get('agent_console', {}).get('repair_count')}"
                )
                print(f"FINAL narrative: {final_data.get('narrative', '')[:100]}")
                print(
                    f"FINAL model_label: {final_data.get('agent_console', {}).get('model_label')}"
                )
            elif event_type == "error":
                print(f"ERROR: {data.get('message')} code={data.get('code')}")
            elif event_type == "stage":
                status = data.get("status")
                if status == "fail":
                    print(f"STAGE FAIL: {data.get('name')}")


if __name__ == "__main__":
    main()
