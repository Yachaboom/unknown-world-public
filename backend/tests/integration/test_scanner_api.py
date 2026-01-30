"""U-021 이미지 이해(Scanner) API 통합 테스트."""

from fastapi.testclient import TestClient

from unknown_world.main import app
from unknown_world.models.scanner import ScanStatus

client = TestClient(app)


def test_scanner_health():
    """Scanner 헬스체크 엔드포인트 테스트."""
    response = client.get("/api/scan/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "mode" in data
    assert "supported_formats" in data


def test_scan_image_mock_ko():
    """이미지 스캔 테스트 (Mock 모드, 한국어)."""
    # 테스트용 이미지 데이터 (100바이트 이상 필요)
    file_content = b"fake image content" * 10
    files = {"file": ("test.png", file_content, "image/png")}
    data = {"language": "ko-KR"}

    # UW_MODE=mock 환경에서 실행된다고 가정
    response = client.post("/api/scan", files=files, data=data)

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["status"] == ScanStatus.COMPLETED
    assert "[Mock]" in res_data["caption"]
    assert res_data["language"] == "ko-KR"
    assert len(res_data["objects"]) > 0
    assert len(res_data["item_candidates"]) > 0


def test_scan_image_mock_en():
    """이미지 스캔 테스트 (Mock 모드, 영어)."""
    file_content = b"fake image content" * 10
    files = {"file": ("test.png", file_content, "image/png")}
    data = {"language": "en-US"}

    response = client.post("/api/scan", files=files, data=data)

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert "[Mock]" in res_data["caption"]
    assert res_data["language"] == "en-US"


def test_scan_image_invalid_type():
    """지원하지 않는 파일 형식 테스트."""
    file_content = b"some text"
    files = {"file": ("test.txt", file_content, "text/plain")}

    response = client.post("/api/scan", files=files)

    assert response.status_code == 200  # 실패하더라도 200 응답 + success=False (RULE-004)
    res_data = response.json()
    assert res_data["success"] is False
    assert res_data["status"] == ScanStatus.FAILED
    assert "지원하지 않는 이미지 형식" in res_data["message"]


def test_scan_image_too_large():
    """파일 크기 초과 테스트."""
    # 20MB + 1 byte
    large_content = b"a" * (20 * 1024 * 1024 + 1)
    files = {"file": ("large.png", large_content, "image/png")}

    response = client.post("/api/scan", files=files)

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is False
    assert "파일이 너무 큽니다" in res_data["message"]
