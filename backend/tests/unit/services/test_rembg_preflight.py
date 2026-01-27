"""U-045[Mvp] rembg preflight 서비스 단위 테스트.

이 테스트는 서버 시작 시 rembg 설치 여부와 모델 캐시를 점검하고
필요한 경우 다운로드하는 로직을 검증합니다.
"""

import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from unknown_world.services.rembg_preflight import (
    PreflightConfig,
    RembgPreflight,
    RembgReadyStatus,
)


class TestRembgPreflight(unittest.TestCase):
    """RembgPreflight 단위 테스트."""

    def setUp(self) -> None:
        self.config = PreflightConfig(
            models_to_prefetch=["test-model"],
            preflight_timeout_seconds=5,
            model_download_timeout_seconds=2,
        )
        self.preflight = RembgPreflight(self.config)

    @patch("unknown_world.services.rembg_preflight.subprocess.run")
    def test_check_rembg_installed_success(self, mock_run: MagicMock) -> None:
        """rembg 설치 확인 성공 테스트."""
        mock_run.return_value = MagicMock(returncode=0, stdout="rembg 2.0.67")
        installed, version = self.preflight._check_rembg_installed()
        self.assertTrue(installed)
        self.assertEqual(version, "rembg 2.0.67")

    @patch("unknown_world.services.rembg_preflight.subprocess.run")
    def test_check_rembg_installed_failure(self, mock_run: MagicMock) -> None:
        """rembg 미설치 확인 테스트."""
        mock_run.side_effect = FileNotFoundError()
        installed, version = self.preflight._check_rembg_installed()
        self.assertFalse(installed)
        self.assertIsNone(version)

    @patch("unknown_world.services.rembg_preflight.Path.exists")
    @patch("unknown_world.services.rembg_preflight.Path.home")
    def test_check_model_available(self, mock_home: MagicMock, mock_exists: MagicMock) -> None:
        """모델 캐시 존재 여부 확인 테스트."""
        mock_home.return_value = Path("/home/user")

        # 1. 모델 있음
        mock_exists.return_value = True
        self.assertTrue(self.preflight._check_model_available("test-model"))

        # 2. 모델 없음
        mock_exists.return_value = False
        self.assertFalse(self.preflight._check_model_available("test-model"))

    @patch("unknown_world.services.rembg_preflight.subprocess.run")
    def test_download_model_success(self, mock_run: MagicMock) -> None:
        """모델 다운로드 성공 테스트."""
        mock_run.return_value = MagicMock(returncode=0)
        self.assertTrue(self.preflight._download_model("test-model"))
        mock_run.assert_called_with(
            ["rembg", "d", "test-model"], capture_output=True, text=True, timeout=2
        )

    @patch("unknown_world.services.rembg_preflight.subprocess.run")
    def test_download_model_failure(self, mock_run: MagicMock) -> None:
        """모델 다운로드 실패 테스트."""
        mock_run.return_value = MagicMock(returncode=1, stderr="network error")
        self.assertFalse(self.preflight._download_model("test-model"))

    @patch("unknown_world.services.rembg_preflight.RembgPreflight._process_model")
    @patch("unknown_world.services.rembg_preflight.RembgPreflight._check_rembg_installed")
    def test_run_ready(self, mock_check_installed: MagicMock, mock_process: MagicMock) -> None:
        """전체 실행 성공 (READY) 테스트."""
        mock_check_installed.return_value = (True, "2.0.67")
        mock_process.return_value = MagicMock(name="test-model", available=True)

        result = self.preflight.run()

        self.assertEqual(result.status, RembgReadyStatus.READY)
        self.assertTrue(result.installed)
        self.assertIn("test-model", result.preloaded_models)
        self.assertEqual(len(result.missing_models), 0)

    @patch("unknown_world.services.rembg_preflight.RembgPreflight._process_model")
    @patch("unknown_world.services.rembg_preflight.RembgPreflight._check_rembg_installed")
    def test_run_degraded(self, mock_check_installed: MagicMock, mock_process: MagicMock) -> None:
        """일부 모델 누락 시 DEGRADED 테스트."""
        mock_check_installed.return_value = (True, "2.0.67")
        mock_process.return_value = MagicMock(name="test-model", available=False)

        result = self.preflight.run()

        self.assertEqual(result.status, RembgReadyStatus.DEGRADED)
        self.assertIn("test-model", result.missing_models)

    @patch("unknown_world.services.rembg_preflight.RembgPreflight._check_rembg_installed")
    def test_run_unavailable(self, mock_check_installed: MagicMock) -> None:
        """rembg 미설치 시 UNAVAILABLE 테스트."""
        mock_check_installed.return_value = (False, None)

        result = self.preflight.run()

        self.assertEqual(result.status, RembgReadyStatus.UNAVAILABLE)
        self.assertFalse(result.installed)


if __name__ == "__main__":
    unittest.main()
