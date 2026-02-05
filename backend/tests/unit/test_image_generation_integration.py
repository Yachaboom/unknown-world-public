"""U-035[Mvp] 이미지 생성 서비스와 배경 제거 통합 테스트.

ImageGenerator 및 MockImageGenerator가 배경 제거 옵션을 올바르게 처리하는지 검증합니다.
"""

import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from unknown_world.services.image_generation import (
    ImageGenerationRequest,
    ImageGenerationStatus,
    MockImageGenerator,
)


class TestImageGenerationIntegration(unittest.IsolatedAsyncioTestCase):
    """이미지 생성 및 배경 제거 통합 테스트."""

    @patch("unknown_world.services.image_postprocess.ImagePostprocessor.remove_background")
    @patch("unknown_world.services.image_postprocess.ImagePostprocessor.is_available")
    async def test_mock_generator_rembg_integration(
        self, mock_available: MagicMock, mock_remove: MagicMock
    ) -> None:
        """MockImageGenerator가 배경 제거를 호출하는지 테스트합니다."""
        mock_available.return_value = True
        mock_remove.return_value = MagicMock(
            status=MagicMock(value="success"),
            model_used="birefnet-general",
            output_path=Path("img_123_nobg.png"),
            processing_time_ms=100,
        )

        generator = MockImageGenerator(output_dir=Path("test_output"))

        # 1. 배경 제거 활성화 요청
        request = ImageGenerationRequest(
            prompt="A cute cat", remove_background=True, image_type_hint="object"
        )

        # Path.write_bytes 모킹 (파일 생성 방지)
        with patch.object(Path, "write_bytes"):
            response = await generator.generate(request)

            self.assertEqual(response.status, ImageGenerationStatus.COMPLETED)
            self.assertTrue(response.background_removed)
            self.assertEqual(response.rembg_model_used, "birefnet-general")
            self.assertIn("_nobg.png", response.image_url)

            # rembg 후처리가 호출되었는지 확인
            mock_remove.assert_called_once()

    @patch("unknown_world.services.image_postprocess.ImagePostprocessor.remove_background")
    @patch("unknown_world.services.image_postprocess.ImagePostprocessor.is_available")
    async def test_mock_generator_no_rembg(
        self, mock_available: MagicMock, mock_remove: MagicMock
    ) -> None:
        """배경 제거 옵션이 꺼져있을 때 호출되지 않는지 테스트합니다."""
        generator = MockImageGenerator(output_dir=Path("test_output"))

        request = ImageGenerationRequest(prompt="A landscape", remove_background=False)

        with patch.object(Path, "write_bytes"):
            response = await generator.generate(request)

            self.assertEqual(response.status, ImageGenerationStatus.COMPLETED)
            self.assertFalse(response.background_removed)
            self.assertNotIn("_nobg.png", response.image_url)

            # rembg 후처리가 호출되지 않아야 함
            mock_remove.assert_not_called()

    @patch("unknown_world.services.image_generation.ImageGenerator._initialize_client")
    @patch("unknown_world.services.image_postprocess.ImagePostprocessor.remove_background")
    async def test_real_generator_rembg_integration(
        self, mock_remove: MagicMock, mock_init: MagicMock
    ) -> None:
        """실제 ImageGenerator(Gemini API)와 rembg 통합을 테스트합니다."""
        from unknown_world.services.image_generation import ImageGenerator

        # 클라이언트 모킹 (U-080 대응: generate_images -> generate_content)
        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock()

        # 모의 이미지 생성 결과 (Candidate 구조 모킹)
        mock_image_part = MagicMock()
        mock_image_part.inline_data.data = b"fake_png_data"
        mock_image_part.inline_data.mime_type = "image/png"
        # part에 image_bytes 대신 inline_data.data가 있도록 함
        del mock_image_part.text  # 텍스트가 없는 순수 이미지 파트

        mock_candidate = MagicMock()
        mock_candidate.content.parts = [mock_image_part]

        mock_resp = MagicMock()
        mock_resp.candidates = [mock_candidate]
        mock_client.aio.models.generate_content.return_value = mock_resp

        generator = ImageGenerator(api_key="fake_key", output_dir=Path("test_output"))
        generator._client = mock_client
        generator._available = True

        mock_remove.return_value = MagicMock(
            status=MagicMock(value="success"),
            model_used="birefnet-general",
            output_path=Path("img_real_nobg.png"),
            processing_time_ms=150,
        )

        request = ImageGenerationRequest(
            prompt="A high quality product photo", remove_background=True, image_type_hint="product"
        )

        with patch.object(Path, "write_bytes"):
            response = await generator.generate(request)

            self.assertEqual(response.status, ImageGenerationStatus.COMPLETED)
            self.assertTrue(response.background_removed)
            mock_remove.assert_called_once()


if __name__ == "__main__":
    unittest.main()
