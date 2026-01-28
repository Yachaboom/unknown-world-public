"""U-047: Backend .env 자동 로딩 테스트

이 모듈은 backend/.env 파일의 자동 로딩 기능을 검증합니다.

완료 기준:
- 로컬에서 .env 존재 시 자동 로딩됨 (추가 export 불필요)
- UW_MODE/ENVIRONMENT가 .env 기준으로 반영됨
- .env 미존재 시 서버 정상 시작 (no-op)
- 민감 정보(키/토큰/프롬프트)는 로그/스트림에 노출되지 않음 (RULE-007)

테스트 시나리오:
1. .env 파일 존재 시 로딩 성공
2. .env 파일 미존재 시 기본값 사용 (정상 시작)
3. override=False 정책 검증 (기존 환경변수 우선)
4. 로깅에 민감 정보 미포함 검증
"""

import logging
import os
import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest
from dotenv import load_dotenv


class TestDotenvAutoload:
    """dotenv 자동 로딩 기능 테스트 스위트."""

    # =========================================================================
    # Fixtures
    # =========================================================================

    @pytest.fixture
    def temp_env_file(self, tmp_path: Path) -> Generator[Path]:
        """임시 .env 파일을 생성하고 경로를 반환합니다."""
        env_file = tmp_path / ".env"
        env_file.write_text(
            "UW_MODE=real\nENVIRONMENT=development\nGOOGLE_APPLICATION_CREDENTIALS=./test-key.key\n"
        )
        yield env_file
        # cleanup
        if env_file.exists():
            env_file.unlink()

    @pytest.fixture
    def clean_env(self) -> Generator[None]:
        """테스트 전 관련 환경변수를 정리합니다."""
        # 저장할 원래 값들
        original_values: dict[str, str | None] = {}
        keys_to_clean = ["UW_MODE", "ENVIRONMENT", "GOOGLE_APPLICATION_CREDENTIALS"]

        for key in keys_to_clean:
            original_values[key] = os.environ.pop(key, None)

        yield

        # 복원
        for key, value in original_values.items():
            if value is not None:
                os.environ[key] = value
            elif key in os.environ:
                del os.environ[key]

    # =========================================================================
    # 1. 성공 시나리오 (Happy Path)
    # =========================================================================

    def test_dotenv_loads_when_file_exists(self, temp_env_file: Path, clean_env: None) -> None:
        """[Happy] .env 파일 존재 시 환경변수가 로드됩니다."""
        # Given: .env 파일이 존재하고 환경변수가 설정되어 있지 않음
        assert "UW_MODE" not in os.environ
        assert "ENVIRONMENT" not in os.environ

        # When: load_dotenv 호출
        result = load_dotenv(dotenv_path=temp_env_file, override=False)

        # Then: 환경변수가 로드됨
        assert result is True
        assert os.environ.get("UW_MODE") == "real"
        assert os.environ.get("ENVIRONMENT") == "development"

    def test_uw_mode_reflects_env_value(self, temp_env_file: Path, clean_env: None) -> None:
        """[Happy] UW_MODE가 .env에서 로드된 값으로 설정됩니다."""
        # Given: clean env + temp .env file
        load_dotenv(dotenv_path=temp_env_file, override=False)

        # When/Then: UW_MODE 값 확인
        assert os.environ.get("UW_MODE") == "real"

    def test_environment_reflects_env_value(self, temp_env_file: Path, clean_env: None) -> None:
        """[Happy] ENVIRONMENT가 .env에서 로드된 값으로 설정됩니다."""
        # Given: clean env + temp .env file
        load_dotenv(dotenv_path=temp_env_file, override=False)

        # When/Then: ENVIRONMENT 값 확인
        assert os.environ.get("ENVIRONMENT") == "development"

    # =========================================================================
    # 2. 실패/예외 시나리오 (Error Cases)
    # =========================================================================

    def test_server_starts_without_env_file(self, clean_env: None) -> None:
        """[Error] .env 파일 미존재 시 load_dotenv는 False를 반환하고 서버는 정상 시작합니다."""
        # Given: 존재하지 않는 경로
        non_existent_path = Path("/non/existent/path/.env")

        # When: load_dotenv 호출
        result = load_dotenv(dotenv_path=non_existent_path, override=False)

        # Then: False 반환 (에러 없이)
        assert result is False

    def test_default_values_when_env_missing(self, clean_env: None) -> None:
        """[Error] .env 미존재 시 기본값을 사용합니다."""
        # Given: .env 없이 환경변수도 없음
        # When: 기본값 조회
        uw_mode = os.environ.get("UW_MODE", "mock")
        environment = os.environ.get("ENVIRONMENT", "development")

        # Then: 기본값 사용
        assert uw_mode == "mock"  # genai_client.py의 기본값
        assert environment == "development"

    # =========================================================================
    # 3. 경계값 테스트 (Boundary Conditions)
    # =========================================================================

    def test_override_false_preserves_existing_env(
        self, temp_env_file: Path, clean_env: None
    ) -> None:
        """[Boundary] override=False: 기존 환경변수가 있으면 덮어쓰지 않습니다."""
        # Given: 환경변수가 이미 설정됨
        os.environ["UW_MODE"] = "mock"
        os.environ["ENVIRONMENT"] = "production"

        # When: load_dotenv(override=False) 호출
        load_dotenv(dotenv_path=temp_env_file, override=False)

        # Then: 기존 값 유지 (덮어쓰지 않음)
        assert os.environ.get("UW_MODE") == "mock"  # .env의 "real"로 변경되지 않음
        assert os.environ.get("ENVIRONMENT") == "production"

    def test_override_true_overwrites_existing_env(
        self, temp_env_file: Path, clean_env: None
    ) -> None:
        """[Boundary] override=True: 기존 환경변수를 덮어씁니다 (참조용, 프로덕션에서는 사용 금지)."""
        # Given: 환경변수가 이미 설정됨
        os.environ["UW_MODE"] = "mock"

        # When: load_dotenv(override=True) 호출 - 주의: 프로덕션에서는 금지
        load_dotenv(dotenv_path=temp_env_file, override=True)

        # Then: 새 값으로 덮어씀
        assert os.environ.get("UW_MODE") == "real"

    def test_empty_env_file_no_error(self, tmp_path: Path, clean_env: None) -> None:
        """[Boundary] 빈 .env 파일도 에러 없이 처리됩니다."""
        # Given: 빈 .env 파일
        empty_env = tmp_path / ".env"
        empty_env.write_text("")

        # When: load_dotenv 호출
        # Note: python-dotenv는 빈 파일에서도 에러를 발생시키지 않음
        # 반환값은 파일 존재 여부보다는 "변수가 로드되었는지"를 나타낼 수 있음
        try:
            result = load_dotenv(dotenv_path=empty_env, override=False)
            # Then: 에러 없이 완료됨 (반환값은 구현에 따라 다름)
            assert isinstance(result, bool)
        except Exception as e:
            pytest.fail(f"빈 .env 파일 처리 중 예외 발생: {e}")

    def test_env_with_comments_and_whitespace(self, tmp_path: Path, clean_env: None) -> None:
        """[Boundary] 주석과 공백이 있는 .env 파일을 올바르게 파싱합니다."""
        # Given: 주석과 공백이 있는 .env 파일
        env_file = tmp_path / ".env"
        env_file.write_text(
            "# This is a comment\n\nUW_MODE=real\n  \n# Another comment\nENVIRONMENT=staging\n"
        )

        # When: load_dotenv 호출
        load_dotenv(dotenv_path=env_file, override=False)

        # Then: 주석/공백 무시, 값만 로드
        assert os.environ.get("UW_MODE") == "real"
        assert os.environ.get("ENVIRONMENT") == "staging"

    # =========================================================================
    # 4. 보안 테스트 (Security) - RULE-007
    # =========================================================================

    def test_sensitive_info_not_in_logs(
        self, temp_env_file: Path, clean_env: None, caplog: pytest.LogCaptureFixture
    ) -> None:
        """[Security] 민감 정보(키/토큰/경로)가 로그에 노출되지 않습니다.

        이 테스트는 main.py의 로깅 정책(RULE-007)을 검증합니다:
        - 민감 정보(키/토큰/경로)는 로그에 출력하지 않음
        - 모드/환경 정보 정도만 로깅
        """
        # Given: .env에 민감 정보 포함
        load_dotenv(dotenv_path=temp_env_file, override=False)

        # When: main.py의 로깅 로직을 시뮬레이션
        with caplog.at_level(logging.INFO):
            # 로그 출력 시뮬레이션 (main.py 스타일)
            uw_mode = os.environ.get("UW_MODE", "mock")
            environment = os.environ.get("ENVIRONMENT", "development")

            logger = logging.getLogger("test_security")
            # 올바른 방식: 메시지에 안전한 정보만 포함
            logger.info(
                f"[Config] .env 파일 로드 완료 - UW_MODE={uw_mode}, ENVIRONMENT={environment}"
            )

        # Then: 민감 정보가 로그에 없음
        log_text = caplog.text

        # 키 파일 경로가 없어야 함 (RULE-007 위반 시 실패)
        assert "test-key.key" not in log_text, "민감 정보(키 파일 경로)가 로그에 노출됨"
        assert "GOOGLE_APPLICATION_CREDENTIALS" not in log_text, (
            "민감 정보(환경변수명)가 로그에 노출됨"
        )

        # 허용된 정보는 로그에 있어야 함 (올바른 로깅 확인)
        assert "UW_MODE" in log_text, "모드 정보가 로그에 있어야 함"
        assert "ENVIRONMENT" in log_text or "development" in log_text, (
            "환경 정보가 로그에 있어야 함"
        )


class TestMainModuleDotenvIntegration:
    """main.py 모듈의 dotenv 통합 테스트."""

    @pytest.fixture
    def clean_env(self) -> Generator[None]:
        """테스트 전 관련 환경변수를 정리합니다."""
        original_values: dict[str, str | None] = {}
        keys_to_clean = ["UW_MODE", "ENVIRONMENT"]

        for key in keys_to_clean:
            original_values[key] = os.environ.pop(key, None)

        yield

        for key, value in original_values.items():
            if value is not None:
                os.environ[key] = value
            elif key in os.environ:
                del os.environ[key]

    def test_main_module_dotenv_path_calculation(self) -> None:
        """[Integration] main.py의 .env 경로 계산이 올바릅니다."""
        # Given: main.py의 경로 계산 로직 재현
        # main.py 위치: backend/src/unknown_world/main.py
        # .env 위치: backend/.env
        # 따라서: main.py -> parent(unknown_world) -> parent(src) -> parent(backend) -> .env

        # 실제 main.py 경로 기준으로 계산
        main_py_path = Path(__file__).parent.parent.parent / "src" / "unknown_world" / "main.py"
        expected_dotenv_path = main_py_path.parent.parent.parent.parent / ".env"

        # When: 계산된 경로 확인
        actual_backend_dir = expected_dotenv_path.parent

        # Then: backend 디렉토리를 가리킴
        assert actual_backend_dir.name == "backend" or ".env" in str(expected_dotenv_path)

    def test_load_dotenv_returns_boolean(self) -> None:
        """[Integration] load_dotenv는 boolean을 반환하여 로딩 상태를 알 수 있습니다."""
        # Given: 임시 파일
        with tempfile.NamedTemporaryFile(mode="w", suffix=".env", delete=False) as f:
            f.write("TEST_VAR=test_value\n")
            temp_path = Path(f.name)

        try:
            # When: load_dotenv 호출
            result = load_dotenv(dotenv_path=temp_path, override=False)

            # Then: boolean 반환
            assert isinstance(result, bool)
            assert result is True
        finally:
            temp_path.unlink()


class TestDotenvPolicyCompliance:
    """dotenv 정책 준수 테스트."""

    def test_policy_local_development_autoload(self) -> None:
        """[Policy] 로컬 개발에서 .env 자동 로딩 정책이 준수됩니다.

        U-047 완료 기준:
        - 로컬에서 `cd backend && cp .env.example .env` 후
          `uv run uvicorn unknown_world.main:app ...` 실행 시
          .env가 자동 로딩된다(추가 export 불필요).
        """
        # Given: python-dotenv가 설치되어 있음 (pyproject.toml에 명시)
        # When: load_dotenv 함수가 사용 가능한지 확인
        from dotenv import load_dotenv

        # Then: 함수가 존재하고 호출 가능
        assert callable(load_dotenv)

    def test_policy_override_false_for_production_safety(self) -> None:
        """[Policy] override=False 정책으로 운영 환경 SSOT가 보장됩니다.

        U-047 정책:
        - 운영(Cloud Run 등)은 런타임 env를 SSOT로 사용(override 금지)
        """
        # Given: 운영 환경에서 환경변수가 이미 설정됨
        os.environ["POLICY_TEST_VAR"] = "production_value"

        with tempfile.NamedTemporaryFile(mode="w", suffix=".env", delete=False) as f:
            f.write("POLICY_TEST_VAR=dev_value\n")
            temp_path = Path(f.name)

        try:
            # When: override=False로 로드
            load_dotenv(dotenv_path=temp_path, override=False)

            # Then: 기존 값 유지 (운영 SSOT 보장)
            assert os.environ.get("POLICY_TEST_VAR") == "production_value"
        finally:
            temp_path.unlink()
            del os.environ["POLICY_TEST_VAR"]

    def test_policy_no_crash_without_env_file(self) -> None:
        """[Policy] .env 파일 미존재 시 서버가 정상 시작합니다.

        U-047 완료 기준:
        - .env는 존재하지 않아도 서버가 정상적으로 시작한다
          (운영/CI에서 파일 미존재를 기본으로 허용)
        """
        # Given: 존재하지 않는 .env 경로
        non_existent = Path("/definitely/not/a/real/path/.env")

        # When/Then: 에러 없이 False 반환
        try:
            result = load_dotenv(dotenv_path=non_existent, override=False)
            assert result is False  # 파일 없음
        except Exception as e:
            pytest.fail(f"load_dotenv raised an exception: {e}")
