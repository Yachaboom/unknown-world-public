"""Unknown World - 이미지 생성 API 수동 검증 스크립트."""

import json
import os

from fastapi.testclient import TestClient

from unknown_world.main import app


def run_manual_test():
    # UW_MODE를 mock으로 강제 설정하여 API 호출 없이 로직 검증
    os.environ["UW_MODE"] = "mock"
    client = TestClient(app)

    print("=== [1] 이미지 생성 요청 테스트 ===")
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

        print(f"\n=== [2] 정적 파일 서빙 테스트 ({image_url}) ===")
        static_resp = client.get(image_url)
        print(f"Static Content-Type: {static_resp.headers.get('content-type')}")
        print(f"Static Success: {static_resp.status_code == 200}")

        print(f"\n=== [3] 이미지 상태 조회 테스트 ({image_id}) ===")
        status_resp = client.get(f"/api/image/status/{image_id}")
        print(f"Status Response: {json.dumps(status_resp.json(), indent=2, ensure_ascii=False)}")

        print(f"\n=== [4] 이미지 파일 직접 조회 테스트 (/api/image/file/{image_id}) ===")
        file_resp = client.get(f"/api/image/file/{image_id}")
        print(f"File Content-Type: {file_resp.headers.get('content-type')}")
        print(f"File Success: {file_resp.status_code == 200}")


if __name__ == "__main__":
    run_manual_test()
