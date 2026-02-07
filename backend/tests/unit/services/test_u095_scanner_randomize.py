"""U-095 Scanner 아이템 생성 개수 랜덤화 단위 테스트."""

from collections import Counter
from unittest.mock import MagicMock, patch

import pytest

from unknown_world.models.scanner import ItemCandidate, ScanStatus
from unknown_world.models.turn import Language
from unknown_world.services.image_understanding import (
    ImageUnderstandingService,
    ScanResult,
    _adjust_item_count,
    determine_item_count,
)


def test_determine_item_count_distribution():
    """아이템 생성 개수 분포 테스트 (가중치 랜덤 검증)."""
    iterations = 1000
    counts = [determine_item_count() for _ in range(iterations)]
    distribution = Counter(counts)

    # 가중치: 1개=60%, 2개=30%, 3개=10%
    # 1000회 실행 시 대략적인 범위 확인 (여유 있게 5% 오차 허용)
    assert 500 <= distribution[1] <= 700
    assert 200 <= distribution[2] <= 400
    assert 50 <= distribution[3] <= 150
    assert len(distribution) == 3
    assert all(c in [1, 2, 3] for c in distribution)


def test_adjust_item_count_excess():
    """아이템 수가 목표보다 많을 때 조정 테스트."""
    items = [
        ItemCandidate(id="1", label="Item 1", description="Desc 1", item_type="tool"),
        ItemCandidate(id="2", label="Item 2", description="Desc 2", item_type="tool"),
        ItemCandidate(id="3", label="Item 3", description="Desc 3", item_type="tool"),
    ]
    result = ScanResult(
        status=ScanStatus.COMPLETED,
        caption="Test",
        objects=[],
        item_candidates=items,
        analysis_time_ms=100,
    )

    adjusted = _adjust_item_count(result, target_count=2)
    assert len(adjusted.item_candidates) == 2
    assert adjusted.item_candidates[0].id == "1"
    assert adjusted.item_candidates[1].id == "2"


def test_adjust_item_count_fewer():
    """아이템 수가 목표보다 적을 때 조정 테스트 (그대로 유지)."""
    items = [
        ItemCandidate(id="1", label="Item 1", description="Desc 1", item_type="tool"),
    ]
    result = ScanResult(
        status=ScanStatus.COMPLETED,
        caption="Test",
        objects=[],
        item_candidates=items,
        analysis_time_ms=100,
    )

    adjusted = _adjust_item_count(result, target_count=3)
    assert len(adjusted.item_candidates) == 1
    assert adjusted.item_candidates[0].id == "1"


def test_adjust_item_count_duplicate_labels():
    """중복된 이름의 아이템 제거 테스트."""
    items = [
        ItemCandidate(id="1", label="Key", description="Desc 1", item_type="key"),
        ItemCandidate(id="2", label="Key", description="Desc 2", item_type="key"),
        ItemCandidate(id="3", label="Lock", description="Desc 3", item_type="tool"),
    ]
    result = ScanResult(
        status=ScanStatus.COMPLETED,
        caption="Test",
        objects=[],
        item_candidates=items,
        analysis_time_ms=100,
    )

    adjusted = _adjust_item_count(result, target_count=3)
    assert len(adjusted.item_candidates) == 2
    assert adjusted.item_candidates[0].label == "Key"
    assert adjusted.item_candidates[1].label == "Lock"


@pytest.mark.asyncio
async def test_service_analyze_uses_correct_item_count():
    """analyze 메서드가 결정된 item_count를 비전 호출에 전달하는지 테스트."""
    service = ImageUnderstandingService(force_mock=False)
    service._is_mock = False
    # Mocking genai client
    service._genai_client = MagicMock()
    service._genai_client.aio.models.generate_content = MagicMock()

    # Mock response
    mock_response = MagicMock()
    mock_response.text = '{"caption": "test", "objects": [], "item_candidates": [{"id": "i1", "label": "L1", "description": "D1", "item_type": "tool"}]}'
    service._genai_client.aio.models.generate_content.return_value = mock_response

    with (
        patch(
            "unknown_world.services.image_understanding.determine_item_count", return_value=3
        ) as mock_count,
        patch(
            "unknown_world.services.image_understanding.load_prompt",
            return_value="Test prompt {count}",
        ) as mock_load,
    ):
        await service.analyze(b"fake_image" * 100, "image/png", Language.KO)

        # determine_item_count가 호출되었는지 확인
        mock_count.assert_called_once()

        # load_prompt가 "scan", "scan_instructions"로 호출되었는지 확인
        mock_load.assert_any_call("scan", "scan_instructions", Language.KO)

        # 비전 호출 시 프롬프트에 {count}가 3으로 치환되었는지 확인
        call_args = service._genai_client.aio.models.generate_content.call_args
        prompt_part = call_args[1]["contents"][1]
        assert "Test prompt 3" in prompt_part.text
