from fastapi.testclient import TestClient

from unknown_world.main import app

client = TestClient(app)


def test_health_check():
    """/health 엔드포인트가 올바른 스키마와 상태를 반환하는지 테스트합니다."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert data["service"] == "unknown-world-backend"


def test_root_endpoint():
    """루트 엔드포인트가 정상 작동하는지 테스트합니다."""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_cors_policy():
    """RULE-011에 따른 CORS 정책이 올바르게 설정되었는지 테스트합니다."""
    # 허용된 오리진 테스트 (포트 8001)
    headers = {
        "Origin": "http://localhost:8001",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:8001"

    # 허용되지 않은 오리진 테스트 (포트 9000)
    headers = {
        "Origin": "http://localhost:9000",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/health", headers=headers)
    # FastAPI/Starlette CORS 미들웨어는 허용되지 않은 경우 origin 헤더를 반환하지 않음
    assert "access-control-allow-origin" not in response.headers
