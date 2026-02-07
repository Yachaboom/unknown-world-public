"""Unknown World - U-085 이미지 API 통합 테스트."""

from fastapi.testclient import TestClient

from unknown_world.main import app
from unknown_world.services.image_generation import ImageGenerationStatus

client = TestClient(app)


def test_generate_image_endpoint_with_sdk_size():
    """/api/image/generate 엔드포인트가 SDK 크기 값을 수락하는지 테스트합니다."""
    request_data = {
        "prompt": "A futuristic city in the clouds",
        "aspect_ratio": "16:9",
        "image_size": "1K",
        "model_label": "FAST",
        "skip_on_failure": True,
    }

    response = client.post("/api/image/generate", json=request_data)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == ImageGenerationStatus.COMPLETED
    assert "image_url" in data


def test_generate_image_endpoint_with_legacy_size():
    """/api/image/generate 엔드포인트가 레거시 크기 값을 수락하고 정규화하는지 테스트합니다."""
    request_data = {
        "prompt": "A futuristic city in the clouds",
        "aspect_ratio": "1:1",
        "image_size": "1024x1024",
        "model_label": "FAST",
        "skip_on_failure": True,
    }

    response = client.post("/api/image/generate", json=request_data)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # 백엔드 내부에서 1K로 정규화되어 처리됨


def test_generate_image_endpoint_invalid_size():
    """/api/image/generate 엔드포인트가 잘못된 크기 값에 대해 에러를 반환하는지 테스트합니다."""
    request_data = {
        "prompt": "A futuristic city in the clouds",
        "aspect_ratio": "16:9",
        "image_size": "unknown_size",
        "model_label": "FAST",
        "skip_on_failure": False,  # 에러 발생을 위해 False 설정
    }

    response = client.post("/api/image/generate", json=request_data)

    assert response.status_code == 400
    assert "지원하지 않는 이미지 크기" in response.json()["detail"]


def test_image_health_endpoint():
    """/api/image/health 엔드포인트 테스트."""
    response = client.get("/api/image/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "mode" in data
    assert data["model"] == "gemini-3-pro-image-preview"
