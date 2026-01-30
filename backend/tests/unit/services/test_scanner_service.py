"""U-021 이미지 이해(Scanner) 서비스 단위 테스트."""

import pytest

from unknown_world.models.scanner import ScanStatus
from unknown_world.models.turn import Language
from unknown_world.services.image_understanding import (
    MAX_FILE_SIZE_BYTES,
    ImageUnderstandingService,
    _parse_vision_response,
    normalize_bbox,
    validate_image,
)


def test_validate_image_valid():
    """정상적인 이미지 검증 테스트."""
    content = b"a" * 1000
    assert validate_image(content, "image/png") is None
    assert validate_image(content, "image/jpeg") is None
    assert validate_image(content, "image/webp") is None


def test_validate_image_invalid_type():
    """지원하지 않는 파일 형식 검증 테스트."""
    content = b"a" * 1000
    error = validate_image(content, "text/plain")
    assert "지원하지 않는 이미지 형식" in error


def test_validate_image_too_large():
    """파일 크기 초과 검증 테스트."""
    content = b"a" * (MAX_FILE_SIZE_BYTES + 1)
    error = validate_image(content, "image/png")
    assert "파일이 너무 큽니다" in error


def test_validate_image_too_small():
    """너무 작은 파일 검증 테스트."""
    content = b"a" * 10
    error = validate_image(content, "image/png")
    assert "이미지 파일이 손상되었거나 비어있습니다" in error


def test_normalize_bbox_valid():
    """bbox 정규화 테스트 (정상 범위)."""
    bbox = {"ymin": 100, "xmin": 200, "ymax": 300, "xmax": 400}
    normalized = normalize_bbox(bbox)
    assert normalized.ymin == 100
    assert normalized.xmin == 200
    assert normalized.ymax == 300
    assert normalized.xmax == 400


def test_normalize_bbox_clamping():
    """bbox 정규화 테스트 (범위 초과 클램핑)."""
    bbox = {"ymin": -100, "xmin": 1200, "ymax": 1500, "xmax": 500}
    normalized = normalize_bbox(bbox)
    assert normalized.ymin == 0
    assert normalized.xmin == 1000  # xmin이 xmax보다 커지는 경우 normalize_bbox 로직 확인 필요
    # xmax가 500이므로 xmin이 1000으로 클램핑되면 xmin > xmax가 됨
    # normalize_bbox 구현:
    # xmin_val = max(0, min(1000, 1200)) -> 1000
    # xmax_val = max(0, min(1000, 500)) -> 500
    # if xmin_val >= xmax_val: xmax_val = min(xmin_val + 100, 1000) -> 1000
    assert normalized.xmax == 1000
    assert normalized.xmin == 1000


def test_normalize_bbox_order_correction():
    """bbox 정규화 테스트 (순서 보정)."""
    bbox = {"ymin": 500, "xmin": 500, "ymax": 200, "xmax": 200}
    normalized = normalize_bbox(bbox)
    assert normalized.ymin == 500
    assert normalized.ymax == 600  # 500 + 100
    assert normalized.xmin == 500
    assert normalized.xmax == 600  # 500 + 100


def test_parse_vision_response_valid():
    """비전 모델 응답 파싱 테스트 (정상 JSON)."""
    response_text = """
    {
      "caption": "A test image",
      "objects": [
        {
          "label": "Key",
          "box_2d": {"ymin": 100, "xmin": 100, "ymax": 200, "xmax": 200},
          "suggested_item_type": "key"
        }
      ],
      "item_candidates": [
        {
          "id": "item_1",
          "label": "Old Key",
          "description": "An old key",
          "item_type": "key",
          "source_object_index": 0
        }
      ]
    }
    """
    result = _parse_vision_response(response_text, Language.EN)
    assert result.status == ScanStatus.COMPLETED
    assert result.caption == "A test image"
    assert len(result.objects) == 1
    assert result.objects[0].label == "Key"
    assert result.objects[0].box_2d.ymin == 100
    assert len(result.item_candidates) == 1
    assert result.item_candidates[0].label == "Old Key"


def test_parse_vision_response_markdown():
    """비전 모델 응답 파싱 테스트 (마크다운 포함)."""
    response_text = """```json
    {
      "caption": "Markdown test",
      "objects": []
    }
    ```"""
    result = _parse_vision_response(response_text, Language.KO)
    assert result.status == ScanStatus.COMPLETED
    assert result.caption == "Markdown test"


def test_parse_vision_response_invalid_json():
    """비전 모델 응답 파싱 테스트 (잘못된 JSON)."""
    response_text = "This is not JSON"
    result = _parse_vision_response(response_text, Language.KO)
    assert result.status == ScanStatus.PARTIAL
    assert result.caption == "This is not JSON"
    assert "파싱할 수 없습니다" in result.message


@pytest.mark.asyncio
async def test_service_analyze_mock():
    """서비스 analyze 메서드 테스트 (Mock 모드)."""
    service = ImageUnderstandingService(force_mock=True)
    content = b"a" * 1000
    result = await service.analyze(content, "image/png", Language.KO)

    assert result.status == ScanStatus.COMPLETED
    assert "[Mock]" in result.caption
    assert len(result.objects) > 0
    assert result.analysis_time_ms >= 0
    assert result.message is None
