"""Unknown World - 이미지 생성 API 엔드포인트 단위 테스트."""

import pytest
from fastapi.testclient import TestClient

from unknown_world.main import app
from unknown_world.services.image_generation import (
    ImageGenerationStatus,
    get_image_generator,
    reset_image_generator,
)


@pytest.fixture
def client():
    """FastAPI TestClient 픽스처."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def setup_mock_generator():
    """모든 테스트에서 Mock 생성기를 사용하도록 설정."""
    reset_image_generator()
    get_image_generator(force_mock=True)
    yield
    reset_image_generator()


def test_generate_image_success(client):
    """이미지 생성 성공 케이스 테스트."""
    payload = {
        "prompt": "A futuristic laboratory with glowing screens",
        "aspect_ratio": "1:1",
        "image_size": "1024x1024",
        "skip_on_failure": True,
    }

    response = client.post("/api/image/generate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == ImageGenerationStatus.COMPLETED
    assert data["image_id"] is not None
    assert data["image_url"] is not None


def test_generate_image_validation_error(client):
    """이미지 생성 요청 검증 실패 테스트."""
    # 너무 짧은 프롬프트
    payload = {"prompt": "A", "skip_on_failure": False}

    response = client.post("/api/image/generate", json=payload)

    assert response.status_code == 400
    assert "프롬프트가 너무 짧습니다" in response.json()["detail"]


def test_generate_image_fallback_on_error(client):
    """검증 실패 시 skip_on_failure=True일 때 폴백 동작 테스트."""
    payload = {"prompt": "A", "skip_on_failure": True}

    response = client.post("/api/image/generate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["status"] == "skipped"
    assert "프롬프트가 너무 짧습니다" in data["message"]


def test_get_image_status(client):
    """이미지 상태 조회 테스트."""
    # 먼저 생성
    gen_resp = client.post("/api/image/generate", json={"prompt": "Test status"})
    image_id = gen_resp.json()["image_id"]

    # 상태 조회
    status_resp = client.get(f"/api/image/status/{image_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["exists"] is True
    assert status_resp.json()["image_url"] is not None


def test_static_image_access(client):
    """정적 파일 경로를 통한 이미지 접근 테스트."""
    # 이미지 생성
    gen_resp = client.post("/api/image/generate", json={"prompt": "Test static access"})
    image_url = gen_resp.json()["image_url"]

    # 정적 경로로 접근
    response = client.get(image_url)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"


def test_get_image_file_not_found(client):
    """존재하지 않는 이미지 파일 요청 시 404 테스트."""
    response = client.get("/api/image/file/non_existent_id")
    assert response.status_code == 404
