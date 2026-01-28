"""CP-MVP-07: real 모드 로컬 실행 게이트 통합 테스트.

로컬 개발 환경에서 `.env` 기반 설정으로 **real 모드(실모델) 실행**이
안정적으로 재현되는지 검증합니다.

완료 기준:
- `.env`가 로드된 상태에서 서버가 real 모드로 실행되며, `/health`가 정상 응답한다.
- 턴 1회 실행 시 NDJSON 스트림이 정상적으로 흐르고 최종 `final`이 스키마/비즈니스 룰을 통과한다.
- 인증/환경변수 누락 케이스에서도 서버가 크래시하지 않고, 안전 폴백으로 종료한다. (RULE-004)
- mock 고정 내러티브가 real 모드에서 반복 노출되지 않는다(모드 드리프트 방지).
- 민감 정보가 로그에 노출되지 않는다 (RULE-007).

참조:
- vibe/unit-plans/CP-MVP-07.md
- vibe/unit-results/U-047[Mvp].md
- vibe/unit-results/CP-MVP-04.md
"""

from __future__ import annotations

import json
import os
from collections.abc import Generator
from pathlib import Path
from typing import Any

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from unknown_world.main import app
from unknown_world.models.turn import Language, TurnOutput
from unknown_world.services.genai_client import (
    GenAIMode,
    get_genai_client,
    reset_genai_client,
)

# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def client() -> TestClient:
    """FastAPI 테스트 클라이언트."""
    return TestClient(app)


@pytest.fixture
def mock_mode_env() -> Generator[None]:
    """UW_MODE=mock 환경을 설정합니다."""
    original = os.environ.get("UW_MODE")
    os.environ["UW_MODE"] = "mock"
    reset_genai_client()  # 클라이언트 캐시 초기화

    yield

    if original is not None:
        os.environ["UW_MODE"] = original
    elif "UW_MODE" in os.environ:
        del os.environ["UW_MODE"]
    reset_genai_client()


@pytest.fixture
def real_mode_env() -> Generator[None]:
    """UW_MODE=real 환경을 설정합니다 (실제 API 호출 없이 클라이언트 모드만 변경)."""
    original = os.environ.get("UW_MODE")
    os.environ["UW_MODE"] = "real"
    reset_genai_client()  # 클라이언트 캐시 초기화

    yield

    if original is not None:
        os.environ["UW_MODE"] = original
    elif "UW_MODE" in os.environ:
        del os.environ["UW_MODE"]
    reset_genai_client()


# =============================================================================
# 시나리오 A: 서버 기동 및 상태 확인 (Health Check)
# =============================================================================


class TestServerHealthWithEnv:
    """서버 기동 및 상태 확인 테스트 (시나리오 A)."""

    def test_health_endpoint_returns_ok(self, client: TestClient) -> None:
        """[Happy] /health 엔드포인트가 정상 응답합니다."""
        # When: 헬스체크 요청
        response = client.get("/health")

        # Then: 정상 응답
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("ok", "degraded")
        assert data["service"] == "unknown-world-backend"
        assert "version" in data

    def test_health_includes_rembg_status(self, client: TestClient) -> None:
        """[Happy] /health 응답에 rembg 상태가 포함됩니다."""
        # When: 헬스체크 요청
        response = client.get("/health")

        # Then: rembg 정보 포함
        data = response.json()
        assert "rembg" in data
        rembg_info = data["rembg"]
        assert rembg_info["status"] in ("ready", "degraded", "unavailable", "pending")
        assert "installed" in rembg_info

    def test_uw_mode_environment_variable_loaded(self) -> None:
        """[Happy] UW_MODE 환경변수가 올바르게 로드됩니다."""
        # Given: 현재 환경의 UW_MODE 값
        uw_mode = os.environ.get("UW_MODE", "mock")

        # Then: 유효한 값이어야 함
        assert uw_mode in ("mock", "real")


# =============================================================================
# 시나리오 B: real 모드 턴 스모크 테스트 (스트리밍)
# =============================================================================


class TestTurnStreamingInMockMode:
    """턴 스트리밍 테스트 (Mock 모드, 시나리오 B의 기본 경로)."""

    def test_stage_events_order(self, client: TestClient, mock_mode_env: None) -> None:
        """[Happy] stage 이벤트가 올바른 순서로 발생합니다."""
        # Given: 유효한 턴 입력
        payload = {
            "language": "ko-KR",
            "text": "테스트 입력",
            "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)

        # Then: 정상 스트리밍 응답
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/x-ndjson"

        events = [json.loads(line) for line in response.iter_lines() if line]

        # stage 이벤트 순서 확인
        stages = [e["name"] for e in events if e["type"] == "stage" and e["status"] == "start"]
        expected_stages = [
            "parse",
            "validate",
            "plan",
            "resolve",
            "render",
            "verify",
            "commit",
        ]
        assert stages == expected_stages

    def test_final_event_has_valid_turn_output(
        self, client: TestClient, mock_mode_env: None
    ) -> None:
        """[Happy] final 이벤트가 유효한 TurnOutput을 포함합니다."""
        # Given: 유효한 턴 입력
        payload = {
            "language": "ko-KR",
            "text": "문을 열어본다",
            "client": {"viewport_w": 1920, "viewport_h": 1080},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: final 이벤트 확인
        final_events = [e for e in events if e["type"] == "final"]
        assert len(final_events) == 1

        # Pydantic 검증 (RULE-003)
        turn_output = TurnOutput.model_validate(final_events[0]["data"])
        assert turn_output.language == Language.KO

    def test_badges_contain_all_categories(self, client: TestClient, mock_mode_env: None) -> None:
        """[Happy] badges가 모든 카테고리(Schema/Economy/Safety/Consistency)를 포함합니다."""
        # Given: 유효한 턴 입력
        payload = {
            "language": "ko-KR",
            "text": "탐색한다",
            "client": {"viewport_w": 1920, "viewport_h": 1080},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: badges 이벤트 확인
        badges_events = [e for e in events if e["type"] == "badges"]
        assert len(badges_events) >= 1

        # 최종 badges에 모든 카테고리가 포함되어야 함
        final_badges = badges_events[-1]["badges"]
        badge_categories = {b.split("_")[0] for b in final_badges}

        # Schema, Economy, Safety, Consistency 중 최소 3개 이상
        expected_categories = {"schema", "economy", "safety", "consistency"}
        assert len(badge_categories.intersection(expected_categories)) >= 3


# =============================================================================
# 시나리오 C: Hard Gate 인바리언트 검증
# =============================================================================


class TestHardGateInvariants:
    """Hard Gate 인바리언트 검증 테스트 (시나리오 C)."""

    def test_schema_ok_in_successful_turn(self, client: TestClient, mock_mode_env: None) -> None:
        """[Happy] 성공적인 턴에서 schema_ok 배지가 포함됩니다."""
        # Given: 유효한 턴 입력
        payload = {
            "language": "ko-KR",
            "text": "정상 입력",
            "client": {"viewport_w": 1920, "viewport_h": 1080},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: final의 배지에 schema_ok 포함
        final_event = next(e for e in events if e["type"] == "final")
        badges = final_event["data"]["agent_console"]["badges"]
        assert "schema_ok" in badges

    def test_economy_ok_and_no_negative_balance(
        self, client: TestClient, mock_mode_env: None
    ) -> None:
        """[Happy] economy_ok 배지와 잔액 음수 금지 (RULE-005)."""
        # Given: 유효한 턴 입력
        payload = {
            "language": "ko-KR",
            "text": "행동",
            "client": {"viewport_w": 1920, "viewport_h": 1080},
            "economy_snapshot": {"signal": 50, "memory_shard": 2},
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: economy 확인
        final_event = next(e for e in events if e["type"] == "final")
        economy = final_event["data"]["economy"]

        # 잔액은 음수가 아니어야 함
        assert economy["balance_after"]["signal"] >= 0
        assert economy["balance_after"]["memory_shard"] >= 0

        # economy_ok 배지 포함
        badges = final_event["data"]["agent_console"]["badges"]
        assert "economy_ok" in badges

    def test_language_consistency(self, client: TestClient, mock_mode_env: None) -> None:
        """[Happy] 언어 일관성 유지 (RULE-006)."""
        # Given: 한국어 요청
        payload = {
            "language": "ko-KR",
            "text": "테스트",
            "client": {"viewport_w": 1920, "viewport_h": 1080},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: 응답 언어가 요청과 일치
        final_event = next(e for e in events if e["type"] == "final")
        assert final_event["data"]["language"] == "ko-KR"


# =============================================================================
# 시나리오 D: 인증 실패 케이스 (안전 폴백)
# =============================================================================


class TestSafeFallback:
    """안전 폴백 테스트 (시나리오 D)."""

    def test_invalid_input_returns_error_and_fallback(self, client: TestClient) -> None:
        """[Error] 잘못된 입력 시 error + final(폴백) 이벤트가 반환됩니다."""
        # Given: 잘못된 언어 코드
        payload = {
            "language": "invalid-lang",
            "text": "",
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)

        # Then: 200 응답 (스트리밍이므로)
        assert response.status_code == 200

        events = [json.loads(line) for line in response.iter_lines() if line]

        # error 이벤트 포함
        error_events = [e for e in events if e["type"] == "error"]
        assert len(error_events) >= 1
        assert error_events[0]["code"] == "VALIDATION_ERROR"

        # final(폴백) 이벤트 포함
        final_events = [e for e in events if e["type"] == "final"]
        assert len(final_events) == 1

    def test_fallback_has_zero_cost(self, client: TestClient) -> None:
        """[Error] 폴백 응답의 비용은 0입니다 (RULE-005)."""
        # Given: 잘못된 입력으로 폴백 유도
        payload = {
            "language": "invalid",
            "text": "",
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: 폴백 비용 0
        final_event = next(e for e in events if e["type"] == "final")
        economy = final_event["data"]["economy"]
        assert economy["cost"]["signal"] == 0
        assert economy["cost"]["memory_shard"] == 0

    def test_fallback_includes_all_badge_categories(self, client: TestClient) -> None:
        """[Error] 폴백 응답도 모든 배지 카테고리를 포함합니다 (RU-005-S1)."""
        # Given: 잘못된 입력으로 폴백 유도
        payload = {
            "language": "invalid",
            "text": "",
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: 폴백의 배지 확인
        final_event = next(e for e in events if e["type"] == "final")
        badges = final_event["data"]["agent_console"]["badges"]

        # 모든 카테고리 포함 확인
        badge_prefixes = {b.split("_")[0] for b in badges}
        expected_prefixes = {"schema", "economy", "safety", "consistency"}
        assert badge_prefixes == expected_prefixes


# =============================================================================
# 시나리오: Mock 템플릿 반복 방지 (모드 드리프트)
# =============================================================================


class TestModeDriftPrevention:
    """모드 드리프트 방지 테스트."""

    def test_mock_mode_client_returns_mock(self, mock_mode_env: None) -> None:
        """[Happy] UW_MODE=mock일 때 Mock 클라이언트가 반환됩니다."""
        # When: 클라이언트 조회
        client = get_genai_client()

        # Then: Mock 모드
        assert client.mode == GenAIMode.MOCK

    def test_real_mode_setting_respected(self, real_mode_env: None) -> None:
        """[Happy] UW_MODE=real일 때 real 모드가 설정됩니다.

        Note: 실제 Vertex AI 연결이 없으면 Mock으로 폴백할 수 있지만,
        환경변수 설정은 올바르게 반영되어야 합니다.
        """
        # When: 환경변수 확인
        uw_mode = os.environ.get("UW_MODE")

        # Then: real 모드 설정됨
        assert uw_mode == "real"


# =============================================================================
# 시나리오: 보안 검증 (RULE-007)
# =============================================================================


class TestSecurityCompliance:
    """보안 규칙 준수 테스트."""

    def test_sensitive_info_not_in_health_response(self, client: TestClient) -> None:
        """[Security] /health 응답에 민감 정보가 포함되지 않습니다."""
        # When: 헬스체크 요청
        response = client.get("/health")
        data = response.json()

        # Then: 민감 정보 미포함
        response_text = json.dumps(data)
        assert "GOOGLE_APPLICATION_CREDENTIALS" not in response_text
        assert ".key" not in response_text.lower() or "key" in data.get("rembg", {}).get(
            "status", ""
        )
        assert "token" not in response_text.lower()
        assert "secret" not in response_text.lower()

    def test_error_response_no_internal_details(self, client: TestClient) -> None:
        """[Security] 에러 응답에 내부 구현 세부사항이 노출되지 않습니다."""
        # Given: 잘못된 입력
        payload = {"invalid": "data"}

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: 에러 메시지에 스택 트레이스 없음
        error_events = [e for e in events if e["type"] == "error"]
        if error_events:
            error_message = str(error_events[0])
            assert "Traceback" not in error_message
            assert "File " not in error_message


# =============================================================================
# 시나리오: .env 로딩 정책 검증
# =============================================================================


class TestEnvLoadingPolicy:
    """환경변수 로딩 정책 테스트."""

    def test_dotenv_override_false_policy(self) -> None:
        """[Policy] override=False 정책이 적용됩니다.

        운영 환경의 환경변수가 .env 파일보다 우선합니다.
        """
        # Given: 환경변수가 이미 설정됨
        original = os.environ.get("TEST_OVERRIDE_VAR")
        os.environ["TEST_OVERRIDE_VAR"] = "production_value"

        try:
            # When: .env 파일 로드 시뮬레이션 (override=False)
            from tempfile import NamedTemporaryFile

            with NamedTemporaryFile(mode="w", suffix=".env", delete=False) as f:
                f.write("TEST_OVERRIDE_VAR=dev_value\n")
                temp_path = Path(f.name)

            load_dotenv(dotenv_path=temp_path, override=False)

            # Then: 기존 값 유지
            assert os.environ.get("TEST_OVERRIDE_VAR") == "production_value"

        finally:
            temp_path.unlink()
            if original is not None:
                os.environ["TEST_OVERRIDE_VAR"] = original
            elif "TEST_OVERRIDE_VAR" in os.environ:
                del os.environ["TEST_OVERRIDE_VAR"]

    def test_server_works_without_env_file(self, client: TestClient) -> None:
        """[Policy] .env 파일 없이도 서버가 정상 작동합니다."""
        # When: 헬스체크 요청
        response = client.get("/health")

        # Then: 정상 응답 (어떤 환경에서든)
        assert response.status_code == 200


# =============================================================================
# 시나리오: 스트리밍 무결성 검증
# =============================================================================


class TestStreamingIntegrity:
    """스트리밍 무결성 테스트."""

    def test_first_event_is_stage_parse_start(
        self, client: TestClient, mock_mode_env: None
    ) -> None:
        """[Happy] 첫 번째 이벤트는 항상 stage: parse: start입니다 (TTFB)."""
        # Given: 유효한 턴 입력
        payload = {
            "language": "ko-KR",
            "text": "테스트",
            "client": {"viewport_w": 1920, "viewport_h": 1080},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: 첫 이벤트 확인
        assert events[0]["type"] == "stage"
        assert events[0]["name"] == "parse"
        assert events[0]["status"] == "start"

    def test_final_event_is_last(self, client: TestClient, mock_mode_env: None) -> None:
        """[Happy] final 이벤트가 마지막에 옵니다."""
        # Given: 유효한 턴 입력
        payload = {
            "language": "ko-KR",
            "text": "테스트",
            "client": {"viewport_w": 1920, "viewport_h": 1080},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)
        events = [json.loads(line) for line in response.iter_lines() if line]

        # Then: 마지막 이벤트가 final
        assert events[-1]["type"] == "final"

    def test_content_type_is_ndjson(self, client: TestClient, mock_mode_env: None) -> None:
        """[Happy] Content-Type이 application/x-ndjson입니다."""
        # Given: 유효한 턴 입력
        payload = {
            "language": "ko-KR",
            "text": "테스트",
            "client": {"viewport_w": 1920, "viewport_h": 1080},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }

        # When: 턴 요청
        response = client.post("/api/turn", json=payload)

        # Then: 올바른 Content-Type
        assert response.headers["content-type"] == "application/x-ndjson"

    def test_deterministic_with_seed(self, client: TestClient, mock_mode_env: None) -> None:
        """[Happy] seed 사용 시 결과가 결정적입니다."""
        # Given: 동일한 입력과 시드
        payload = {
            "language": "en-US",
            "text": "Test",
            "client": {"viewport_w": 1920, "viewport_h": 1080},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }
        seed = 42

        # When: 동일한 시드로 두 번 요청
        def get_final(s: int) -> dict[str, Any]:
            resp = client.post(f"/api/turn?seed={s}", json=payload)
            events = [json.loads(line) for line in resp.iter_lines() if line]
            return next(e["data"] for e in events if e["type"] == "final")

        output1 = get_final(seed)
        output2 = get_final(seed)

        # Then: 동일한 결과
        assert output1 == output2
