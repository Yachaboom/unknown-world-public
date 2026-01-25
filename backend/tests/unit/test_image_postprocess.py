"""U-035[Mvp] 이미지 후처리 서비스 단위 테스트.

이 테스트는 rembg 배경 제거 로직의 모델 선택 및 폴백 동작을 검증합니다.
"""

import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from unknown_world.services.image_postprocess import (
    BackgroundRemovalStatus,
    ImagePostprocessor,
    RembgModel,
    _create_output_path,
    select_model_from_hint,
)


class TestImagePostprocess(unittest.TestCase):
    """ImagePostprocess 단위 테스트."""

    def test_select_model_from_hint(self) -> None:
        """힌트에 따른 모델 선택 로직을 테스트합니다."""
        # 1. 명확한 매칭
        model, alpha = select_model_from_hint("object")
        self.assertEqual(model, RembgModel.BIREFNET_GENERAL)
        self.assertFalse(alpha)

        model, alpha = select_model_from_hint("character")
        self.assertEqual(model, RembgModel.ISNET_ANIME)
        self.assertFalse(alpha)

        model, alpha = select_model_from_hint("portrait")
        self.assertEqual(model, RembgModel.BIREFNET_PORTRAIT)
        self.assertTrue(alpha)

        # 2. 대소문자 및 공백 처리
        model, _ = select_model_from_hint("  ANIME  ")
        self.assertEqual(model, RembgModel.ISNET_ANIME)

        # 3. 키워드 포함 검색
        model, _ = select_model_from_hint("game_item_icon")
        self.assertEqual(model, RembgModel.BIREFNET_GENERAL)

        # 4. 기본값 (알 수 없는 힌트)
        model, alpha = select_model_from_hint("unknown_hint")
        self.assertEqual(model, RembgModel.BIREFNET_GENERAL)
        self.assertFalse(alpha)

        # 5. None 처리
        model, alpha = select_model_from_hint(None)
        self.assertEqual(model, RembgModel.BIREFNET_GENERAL)
        self.assertFalse(alpha)

    def test_create_output_path(self) -> None:
        """출력 경로 생성 규칙을 테스트합니다."""
        input_path = Path("test/image.png")
        output_path = _create_output_path(input_path)
        self.assertEqual(output_path, Path("test/image_nobg.png"))

        input_path = Path("asset.jpg")
        output_path = _create_output_path(input_path, suffix="_clean")
        self.assertEqual(output_path, Path("asset_clean.png"))  # 확장자는 항상 png로 변환

    @patch("unknown_world.services.image_postprocess.subprocess.run")
    def test_is_available_success(self, mock_run: MagicMock) -> None:
        """rembg 설치 확인 성공 시나리오."""
        mock_run.return_value = MagicMock(returncode=0, stdout="rembg 2.0.67")

        processor = ImagePostprocessor()
        self.assertTrue(processor.is_available())
        mock_run.assert_called_with(
            ["rembg", "--version"], capture_output=True, text=True, timeout=5
        )

    @patch("unknown_world.services.image_postprocess.subprocess.run")
    def test_is_available_failure(self, mock_run: MagicMock) -> None:
        """rembg 미설치 또는 실행 실패 시나리오."""
        mock_run.side_effect = FileNotFoundError()

        processor = ImagePostprocessor()
        self.assertFalse(processor.is_available())

    @patch("shutil.copy")
    @patch("unknown_world.services.image_postprocess.ImagePostprocessor.is_available")
    def test_remove_background_fallback(
        self, mock_available: MagicMock, mock_copy: MagicMock
    ) -> None:
        """rembg 사용 불가 시 원본을 복사하는 폴백 시나리오."""
        mock_available.return_value = False
        processor = ImagePostprocessor()

        input_path = Path("dummy.png")
        with patch.object(Path, "exists", return_value=True):
            result = processor.remove_background(input_path)

            self.assertEqual(result.status, BackgroundRemovalStatus.FAILED)
            self.assertEqual(result.output_path, Path("dummy_nobg.png"))
            mock_copy.assert_called_once()

    @patch("unknown_world.services.image_postprocess.subprocess.run")
    @patch("unknown_world.services.image_postprocess.ImagePostprocessor.is_available")
    def test_remove_background_success(
        self, mock_available: MagicMock, mock_run: MagicMock
    ) -> None:
        """rembg 실행 성공 시나리오."""
        mock_available.return_value = True
        mock_run.return_value = MagicMock(returncode=0)

        processor = ImagePostprocessor()
        input_path = Path("input.png")

        with patch.object(Path, "exists", side_effect=[True, True, True]):
            result = processor.remove_background(input_path, image_type_hint="character")

            self.assertEqual(result.status, BackgroundRemovalStatus.SUCCESS)
            self.assertEqual(result.model_used, RembgModel.ISNET_ANIME)
            # 명령어에 모델 인자가 포함되었는지 확인
            args, _ = mock_run.call_args
            self.assertIn(RembgModel.ISNET_ANIME, args[0])


if __name__ == "__main__":
    unittest.main()
