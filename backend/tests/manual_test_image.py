"""Unknown World - 이미지 생성 API 수동 검증 스크립트."""

import json
import os

from fastapi.testclient import TestClient

from unknown_world.main import app


def run_manual_test():
    # UW_MODE를 mock으로 강제 설정하여 API 호출 없이 로직 검증
    os.environ["UW_MODE"] = "mock"
    client = TestClient(app)

    print("=== [1] Image Generation Request Test ===")
    payload = {
        "prompt": "A retro-future computer terminal with green text",
        "aspect_ratio": "1:1",
        "image_size": "1024x1024",
    }

    response = client.post("/api/image/generate", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

    if response.status_code == 200:
        data = response.json()
        image_url = data["image_url"]
        image_id = data["image_id"]

        print(f"\n=== [2] Static File Serving Test ({image_url}) ===")
        static_resp = client.get(image_url)
        print(f"Static Content-Type: {static_resp.headers.get('content-type')}")
        print(f"Static Success: {static_resp.status_code == 200}")

        print(f"\n=== [3] Image Status Query Test ({image_id}) ===")
        status_resp = client.get(f"/api/image/status/{image_id}")
        print(f"Status Response: {json.dumps(status_resp.json(), indent=2, ensure_ascii=False)}")

        print(f"\n=== [4] Direct Image File Query Test (/api/image/file/{image_id}) ===")
        file_resp = client.get(f"/api/image/file/{image_id}")
        print(f"File Content-Type: {file_resp.headers.get('content-type')}")
        print(f"File Success: {file_resp.status_code == 200}")


if __name__ == "__main__":
    run_manual_test()
