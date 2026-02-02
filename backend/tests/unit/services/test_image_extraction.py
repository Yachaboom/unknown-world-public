"""Unknown World - 이미지 추출 로직 단위 테스트."""

from unittest.mock import MagicMock

import pytest

from unknown_world.services.image_generation import ImageGenerator


@pytest.fixture
def generator():
    """ImageGenerator 인스턴스 픽스처 (클라이언트 초기화 생략)."""
    with MagicMock():
        # Client 초기화를 모킹하여 실제 Vertex AI 연결 방지
        return ImageGenerator(project="test-project", location="test-location")


def test_extract_image_success(generator):
    """정상적인 응답에서 이미지 바이트를 성공적으로 추출하는지 테스트."""
    # Gemini 응답 구조 모킹
    mock_part = MagicMock()
    mock_part.text = "A beautiful sunset"
    mock_part.inline_data.data = b"fake-image-bytes"

    mock_content = MagicMock()
    mock_content.parts = [mock_part]

    mock_candidate = MagicMock()
    mock_candidate.content = mock_content

    mock_response = MagicMock()
    mock_response.candidates = [mock_candidate]

    image_bytes = generator._extract_image_from_response(mock_response)

    assert image_bytes == b"fake-image-bytes"


def test_extract_image_text_only(generator):
    """텍스트만 포함된 응답에서 None을 반환하는지 테스트."""
    mock_part = MagicMock()
    mock_part.text = "Thinking about the image..."
    mock_part.inline_data = None  # 이미지 없음

    mock_content = MagicMock()
    mock_content.parts = [mock_part]

    mock_candidate = MagicMock()
    mock_candidate.content = mock_content

    mock_response = MagicMock()
    mock_response.candidates = [mock_candidate]

    image_bytes = generator._extract_image_from_response(mock_response)

    assert image_bytes is None


def test_extract_image_empty_response(generator):
    """비어있는 응답에서 None을 반환하는지 테스트."""
    mock_response = MagicMock()
    mock_response.candidates = []

    image_bytes = generator._extract_image_from_response(mock_response)

    assert image_bytes is None


def test_extract_image_multiple_parts(generator):
    """여러 파트 중 이미지가 있는 파트를 올바르게 찾는지 테스트."""
    mock_part_text = MagicMock()
    mock_part_text.text = "Here is your image"
    mock_part_text.inline_data = None

    mock_part_image = MagicMock()
    mock_part_image.inline_data.data = b"image-data"

    mock_content = MagicMock()
    mock_content.parts = [mock_part_text, mock_part_image]

    mock_candidate = MagicMock()
    mock_candidate.content = mock_content

    mock_response = MagicMock()
    mock_response.candidates = [mock_candidate]

    image_bytes = generator._extract_image_from_response(mock_response)

    assert image_bytes == b"image-data"


def test_extract_image_malformed_part(generator):
    """필드가 누락된 잘못된 형식의 파트를 안전하게 건너뛰는지 테스트."""
    mock_part = MagicMock(spec=[])  # 아무 속성도 없는 객체

    mock_content = MagicMock()
    mock_content.parts = [mock_part]

    mock_candidate = MagicMock()
    mock_candidate.content = mock_content

    mock_response = MagicMock()
    mock_response.candidates = [mock_candidate]

    # AttributeError 등이 발생하지 않고 None을 반환해야 함
    image_bytes = generator._extract_image_from_response(mock_response)

    assert image_bytes is None
