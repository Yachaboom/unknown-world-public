import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from unknown_world.config.models import (
    MODEL_FAST,
    MODEL_IMAGE,
    MODEL_QUALITY,
    MODEL_VISION,
    ModelLabel,
    get_model_id,
)
from unknown_world.services.genai_client import (
    ENV_UW_MODE,
    GenAIClient,
    GenAIMode,
    GenerateRequest,
    GenerateResponse,
    MockGenAIClient,
    get_genai_client,
    reset_genai_client,
)


def test_model_id_mapping():
    """ModelLabel이 tech-stack.md의 ID와 올바르게 매핑되는지 확인합니다."""
    assert get_model_id(ModelLabel.FAST) == MODEL_FAST
    assert get_model_id(ModelLabel.QUALITY) == MODEL_QUALITY
    assert get_model_id(ModelLabel.IMAGE) == MODEL_IMAGE
    assert get_model_id(ModelLabel.VISION) == MODEL_VISION

    assert MODEL_FAST == "gemini-3-flash-preview"
    assert MODEL_QUALITY == "gemini-3-pro-preview"
    assert MODEL_IMAGE == "gemini-3-pro-image-preview"


def test_get_genai_client_mock_mode():
    """UW_MODE=mock일 때 MockGenAIClient가 반환되는지 확인합니다."""
    reset_genai_client()
    with patch.dict(os.environ, {ENV_UW_MODE: "mock"}):
        client = get_genai_client(force_new=True)
        assert isinstance(client, MockGenAIClient)
        assert client.mode == GenAIMode.MOCK


@pytest.mark.asyncio
async def test_mock_client_generate():
    """MockGenAIClient의 generate 메서드 동작을 확인합니다."""
    client = MockGenAIClient()
    request = GenerateRequest(prompt="test prompt", model_label=ModelLabel.FAST)
    response = await client.generate(request)

    assert isinstance(response, GenerateResponse)
    assert "[Mock Response]" in response.text
    assert response.model_label == ModelLabel.FAST
    assert "total_tokens" in response.usage


@pytest.mark.asyncio
async def test_mock_client_generate_stream():
    """MockGenAIClient의 generate_stream 메서드 동작을 확인합니다."""
    client = MockGenAIClient()
    request = GenerateRequest(prompt="test prompt", model_label=ModelLabel.QUALITY)

    chunks = []
    async for chunk in client.generate_stream(request):
        chunks.append(chunk)

    assert len(chunks) > 0
    assert any(ModelLabel.QUALITY in c for c in chunks)


def test_singleton_pattern():
    """get_genai_client가 싱글톤으로 동작하는지 확인합니다."""
    reset_genai_client()
    with patch.dict(os.environ, {ENV_UW_MODE: "mock"}):
        client1 = get_genai_client()
        client2 = get_genai_client()
        assert client1 is client2


def test_genai_client_initialization():
    """GenAIClient(real)가 SDK를 올바르게 초기화하는지 확인합니다."""
    with patch("google.genai.Client") as mock_genai_client:
        # VERTEX_PROJECT와 LOCATION 설정
        project = "test-project"
        location = "global"

        client = GenAIClient(project=project, location=location)

        # genai.Client가 vertexai=True와 함께 호출되었는지 확인
        mock_genai_client.assert_called_once()
        args, kwargs = mock_genai_client.call_args
        assert kwargs["vertexai"] is True
        assert kwargs["project"] == project
        assert kwargs["location"] == location
        assert client.is_available() is True


@pytest.mark.asyncio
async def test_genai_client_generate_real_call():
    """GenAIClient가 SDK의 generate_content를 올바르게 호출하는지 확인합니다."""
    with patch("google.genai.Client") as mock_client_class:
        mock_instance = mock_client_class.return_value
        # mock aio.models.generate_content
        mock_response = MagicMock()
        mock_response.text = "Actual response"
        mock_response.candidates = [MagicMock(finish_reason="STOP")]
        mock_response.usage_metadata = MagicMock(
            prompt_token_count=10, candidates_token_count=20, total_token_count=30
        )

        mock_instance.aio.models.generate_content = AsyncMock(return_value=mock_response)

        client = GenAIClient(project="p", location="l")
        request = GenerateRequest(prompt="hello", model_label=ModelLabel.QUALITY, max_tokens=100)

        response = await client.generate(request)

        # U-060: 호출 인자 확인 - GenerateContentConfig 객체로 전달되므로 타입 + 핵심 속성 검증
        mock_instance.aio.models.generate_content.assert_called_once()
        call_kwargs = mock_instance.aio.models.generate_content.call_args.kwargs
        assert call_kwargs["model"] == MODEL_QUALITY
        assert call_kwargs["contents"] == "hello"
        # config는 GenerateContentConfig 객체이므로 속성 검증
        config = call_kwargs["config"]
        assert config is not None
        assert config.max_output_tokens == 100
        assert response.text == "Actual response"
        assert response.usage["total_tokens"] == 30


def test_genai_client_initialization_failure():
    """인증 오류 등으로 SDK 초기화 실패 시 동작을 확인합니다."""
    with patch("google.genai.Client", side_effect=Exception("Auth error")):
        client = GenAIClient()
        assert client.is_available() is False
        assert client.mode == GenAIMode.REAL


def test_get_genai_client_force_new():
    """force_new=True일 때 새 인스턴스가 생성되는지 확인합니다."""
    reset_genai_client()
    with patch.dict(os.environ, {ENV_UW_MODE: "mock"}):
        client1 = get_genai_client()
        client2 = get_genai_client(force_new=True)
        assert client1 is not client2


@pytest.mark.asyncio
async def test_genai_client_generate_stream_real_call():
    """GenAIClient가 스트리밍 호출을 올바르게 수행하는지 확인합니다."""
    with patch("google.genai.Client") as mock_client_class:
        mock_instance = mock_client_class.return_value

        # mock aio.models.generate_content_stream
        async def mock_stream():
            yield MagicMock(text="chunk1")
            yield MagicMock(text="chunk2")

        mock_instance.aio.models.generate_content_stream = AsyncMock(return_value=mock_stream())

        client = GenAIClient(project="p", location="l")
        request = GenerateRequest(prompt="hello", model_label=ModelLabel.FAST)

        chunks = []
        async for chunk in client.generate_stream(request):
            chunks.append(chunk)

        assert chunks == ["chunk1", "chunk2"]
        mock_instance.aio.models.generate_content_stream.assert_called_once()


@pytest.mark.asyncio
async def test_genai_client_unavailable_raises_error():
    """사용 불가능한 클라이언트 호출 시 RuntimeError가 발생하는지 확인합니다."""
    with patch("google.genai.Client", side_effect=Exception("Init error")):
        client = GenAIClient()
        assert client.is_available() is False

        request = GenerateRequest(prompt="hi")
        with pytest.raises(RuntimeError, match="초기화되지 않았습니다"):
            await client.generate(request)

        with pytest.raises(RuntimeError, match="초기화되지 않았습니다"):
            async for _ in client.generate_stream(request):
                pass


@pytest.mark.asyncio
async def test_genai_client_full_config():
    """max_tokens와 temperature가 SDK 호출 시 올바르게 전달되는지 확인합니다."""
    with patch("google.genai.Client") as mock_client_class:
        mock_instance = mock_client_class.return_value
        mock_instance.aio.models.generate_content = AsyncMock(return_value=MagicMock(text="ok"))

        async def mock_stream():
            yield MagicMock(text="ok")

        mock_instance.aio.models.generate_content_stream = AsyncMock(return_value=mock_stream())

        client = GenAIClient(project="p")
        request = GenerateRequest(prompt="hi", max_tokens=50, temperature=0.7)

        # generate 호출 검증
        # U-060: GenerateContentConfig 객체로 전달되므로 타입 + 핵심 속성 검증
        await client.generate(request)
        mock_instance.aio.models.generate_content.assert_called_once()
        gen_call_kwargs = mock_instance.aio.models.generate_content.call_args.kwargs
        assert gen_call_kwargs["model"] == MODEL_FAST
        assert gen_call_kwargs["contents"] == "hi"
        gen_config = gen_call_kwargs["config"]
        assert gen_config is not None
        assert gen_config.max_output_tokens == 50
        assert gen_config.temperature == 0.7

        # generate_stream 호출 검증
        async for _ in client.generate_stream(request):
            pass
        mock_instance.aio.models.generate_content_stream.assert_called_once()
        stream_call_kwargs = mock_instance.aio.models.generate_content_stream.call_args.kwargs
        assert stream_call_kwargs["model"] == MODEL_FAST
        assert stream_call_kwargs["contents"] == "hi"
        stream_config = stream_call_kwargs["config"]
        assert stream_config is not None
        assert stream_config.max_output_tokens == 50
        assert stream_config.temperature == 0.7


def test_get_genai_client_real_init_failure_fallback():
    """실제 클라이언트 초기화 실패 시 Mock 클라이언트로 폴백되는지 확인합니다."""
    reset_genai_client()
    with (
        patch.dict(os.environ, {ENV_UW_MODE: "real"}),
        patch("unknown_world.services.genai_client.GenAIClient.is_available", return_value=False),
    ):
        client = get_genai_client(force_new=True)
        assert isinstance(client, MockGenAIClient)


def test_reset_genai_client():
    """reset_genai_client가 캐시를 올바르게 비우는지 확인합니다."""
    reset_genai_client()
    with patch.dict(os.environ, {ENV_UW_MODE: "mock"}):
        client1 = get_genai_client()
        reset_genai_client()
        client2 = get_genai_client()
        assert client1 is not client2


def test_mock_client_is_available():
    """MockGenAIClient가 항상 사용 가능한지 확인합니다."""
    client = MockGenAIClient()
    assert client.is_available() is True


def test_get_genai_client_invalid_mode():
    """유효하지 않은 UW_MODE일 때 기본값(REAL)으로 동작하는지 확인합니다."""
    reset_genai_client()
    with (
        patch.dict(os.environ, {ENV_UW_MODE: "invalid"}),
        patch(
            "unknown_world.services.genai_client.GenAIClient", return_value=MagicMock()
        ) as mock_real,
    ):
        get_genai_client(force_new=True)
        mock_real.assert_called_once()


def test_get_genai_client_force_mock():
    """force_mock=True일 때 환경변수와 무관하게 Mock 클라이언트를 반환하는지 확인합니다."""
    reset_genai_client()
    with patch.dict(os.environ, {ENV_UW_MODE: "real"}):
        client = get_genai_client(force_mock=True, force_new=True)
        assert isinstance(client, MockGenAIClient)
