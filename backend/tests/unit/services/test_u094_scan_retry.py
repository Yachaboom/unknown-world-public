"""U-094: ImageUnderstanding 응답 파싱 예외 시 자동 재시도 단위 테스트.

이 테스트는 ImageUnderstandingService의 재시도 로직을 검증합니다.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from unknown_world.models.scanner import ScanStatus
from unknown_world.models.turn import Language
from unknown_world.services.image_understanding import (
    SCAN_MAX_RETRIES,
    SCAN_RETRY_BACKOFF_SECONDS,
    SCAN_RETRY_REINFORCEMENT,
    ImageUnderstandingService,
)


@pytest.fixture
def service():
    """ImageUnderstandingService 인스턴스 (Real 모드 강제)."""
    with patch(
        "unknown_world.services.image_understanding.ImageUnderstandingService._initialize_client"
    ):
        svc = ImageUnderstandingService(force_mock=False)
        # Real 모드 강제 (재시도 로직 활성화)
        svc._is_mock = False
        # Mock 클라이언트 주입
        svc._genai_client = MagicMock()
        svc._genai_client.aio = MagicMock()
        svc._genai_client.aio.models = MagicMock()
        svc._genai_client.aio.models.generate_content = AsyncMock()
        return svc


@pytest.mark.asyncio
async def test_retry_on_parsing_failure_success(service):
    """파싱 실패 시 재시도하여 성공하는 시나리오 테스트."""
    # 첫 번째 호출: 잘못된 JSON
    # 두 번째 호출: 정상 JSON
    mock_response_1 = MagicMock()
    mock_response_1.text = "This is not JSON"
    mock_response_1.candidates = []
    mock_response_1.prompt_feedback = None

    mock_response_2 = MagicMock()
    mock_response_2.text = (
        '{"caption": "Success after retry", "objects": [], "item_candidates": []}'
    )
    mock_response_2.candidates = []
    mock_response_2.prompt_feedback = None

    service._genai_client.aio.models.generate_content.side_effect = [
        mock_response_1,
        mock_response_2,
    ]

    with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
        result = await service.analyze(b"fake_image" * 20, "image/png", Language.KO)

        assert result.status == ScanStatus.COMPLETED
        assert result.caption == "Success after retry"
        assert service._genai_client.aio.models.generate_content.call_count == 2
        assert mock_sleep.call_count == 1
        mock_sleep.assert_called_with(SCAN_RETRY_BACKOFF_SECONDS[0])


@pytest.mark.asyncio
async def test_retry_on_api_exception_success(service):
    """API 호출 예외 발생 시 재시도하여 성공하는 시나리오 테스트."""
    # 첫 번째 호출: Exception
    # 두 번째 호출: 정상 JSON
    mock_response = MagicMock()
    mock_response.text = (
        '{"caption": "Success after exception", "objects": [], "item_candidates": []}'
    )
    mock_response.candidates = []
    mock_response.prompt_feedback = None

    service._genai_client.aio.models.generate_content.side_effect = [
        Exception("Temporary API Error"),
        mock_response,
    ]

    with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
        result = await service.analyze(b"fake_image" * 20, "image/png", Language.KO)

        assert result.status == ScanStatus.COMPLETED
        assert result.caption == "Success after exception"
        assert service._genai_client.aio.models.generate_content.call_count == 2
        assert mock_sleep.call_count == 1


@pytest.mark.asyncio
async def test_fail_after_max_retries(service):
    """모든 재시도 실패 시 폴백 응답을 반환하는지 테스트."""
    # 총 3회(초기 1 + 재시도 2) 모두 실패
    mock_response = MagicMock()
    mock_response.text = "Still not JSON"
    mock_response.candidates = []
    mock_response.prompt_feedback = None

    service._genai_client.aio.models.generate_content.return_value = mock_response

    with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
        result = await service.analyze(b"fake_image" * 20, "image/png", Language.KO)

        # 모든 재시도 실패 시 PARTIAL(캡션만 반환) 또는 FAILED
        # 현재 _parse_vision_response는 JSONDecodeError 시 PARTIAL을 반환함
        assert result.status == ScanStatus.PARTIAL
        assert "이미지 분석에 실패했습니다" in result.message
        assert service._genai_client.aio.models.generate_content.call_count == SCAN_MAX_RETRIES + 1
        assert mock_sleep.call_count == SCAN_MAX_RETRIES


@pytest.mark.asyncio
async def test_no_retry_on_safety_block(service):
    """안전 차단 시 재시도하지 않는지 테스트."""
    mock_response = MagicMock()
    # candidates[0].finish_reason = SAFETY 시뮬레이션
    mock_candidate = MagicMock()
    mock_candidate.finish_reason = "SAFETY"
    mock_response.candidates = [mock_candidate]
    mock_response.text = ""
    # prompt_feedback도 존재하면 block_reason을 체크할 수 있으므로 명시적으로 None 설정
    mock_response.prompt_feedback = None

    service._genai_client.aio.models.generate_content.return_value = mock_response

    with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
        result = await service.analyze(b"fake_image" * 20, "image/png", Language.KO)

        assert result.status == ScanStatus.BLOCKED
        assert "안전 정책" in result.message
        assert service._genai_client.aio.models.generate_content.call_count == 1
        assert mock_sleep.call_count == 0


@pytest.mark.asyncio
async def test_no_retry_on_non_retryable_api_error(service):
    """재시도 불가 API 에러 시 재시도하지 않는지 테스트."""

    # PermissionDenied 클래스 흉내
    class PermissionDenied(Exception):
        pass

    service._genai_client.aio.models.generate_content.side_effect = PermissionDenied(
        "Invalid API Key"
    )

    with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
        result = await service.analyze(b"fake_image" * 20, "image/png", Language.KO)

        assert result.status == ScanStatus.FAILED
        assert "API 오류" in result.message
        assert service._genai_client.aio.models.generate_content.call_count == 1
        assert mock_sleep.call_count == 0


@pytest.mark.asyncio
async def test_prompt_reinforcement_on_retry(service):
    """재시도 시 프롬프트에 JSON 강조 지시가 추가되는지 테스트."""
    # 첫 번째 호출은 실패해야 재시도가 일어남
    mock_response_fail = MagicMock()
    mock_response_fail.text = "fail"
    mock_response_fail.candidates = []
    mock_response_fail.prompt_feedback = None

    mock_response_ok = MagicMock()
    mock_response_ok.text = '{"caption": "ok", "objects": [], "item_candidates": []}'
    mock_response_ok.candidates = []
    mock_response_ok.prompt_feedback = None

    service._genai_client.aio.models.generate_content.side_effect = [
        mock_response_fail,
        mock_response_ok,
    ]

    with patch("asyncio.sleep", AsyncMock()):
        await service.analyze(b"fake_image" * 20, "image/png", Language.KO)

        # 호출 인자 확인
        calls = service._genai_client.aio.models.generate_content.call_args_list
        assert len(calls) == 2

        # 첫 번째 호출 프롬프트 (강조 없음)
        first_call_contents = calls[0].kwargs["contents"]
        first_prompt = first_call_contents[1].text
        assert SCAN_RETRY_REINFORCEMENT[Language.KO] not in first_prompt

        # 두 번째 호출 프롬프트 (강조 포함)
        second_call_contents = calls[1].kwargs["contents"]
        second_prompt = second_call_contents[1].text
        assert SCAN_RETRY_REINFORCEMENT[Language.KO] in second_prompt
