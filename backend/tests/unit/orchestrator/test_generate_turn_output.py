"""Unknown World - TurnOutputGenerator 단위 테스트.

U-017[Mvp] 완료 기준 검증:
    - Structured Outputs 호출 구성 (application/json, response_schema)
    - Pydantic 검증 (model_validate_json)
    - 실패 분기 처리 (SCHEMA_FAILURE)
    - language 정책 준수
"""

import json
from unittest.mock import AsyncMock, patch

import pytest

from unknown_world.models.turn import (
    ClientInfo,
    CurrencyAmount,
    EconomySnapshot,
    Language,
    Theme,
    TurnInput,
    TurnOutput,
)
from unknown_world.orchestrator.generate_turn_output import (
    GenerationStatus,
    TurnOutputGenerator,
)
from unknown_world.services.genai_client import GenerateResponse


@pytest.fixture
def turn_input() -> TurnInput:
    """기본 턴 입력 픽스처."""
    return TurnInput(
        language=Language.KO,
        text="문을 열어본다",
        client=ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )


@pytest.fixture
def valid_turn_output_json() -> str:
    """유효한 TurnOutput JSON 문자열 픽스처."""
    return json.dumps(
        {
            "language": "ko-KR",
            "narrative": "낡은 문이 열리고 먼지가 날립니다.",
            "economy": {
                "cost": {"signal": 5, "memory_shard": 0},
                "balance_after": {"signal": 95, "memory_shard": 5},
            },
            "safety": {"blocked": False, "message": None},
            "ui": {"action_deck": {"cards": []}, "objects": []},
            "world": {
                "rules_changed": [],
                "inventory_added": [],
                "inventory_removed": [],
                "quests_updated": [],
                "memory_pins": [],
            },
            "render": {"image_job": None},
            "agent_console": {
                "current_phase": "commit",
                "badges": ["schema_ok", "economy_ok", "safety_ok"],
                "repair_count": 0,
            },
        }
    )


@pytest.mark.asyncio
async def test_generate_success(turn_input, valid_turn_output_json):
    """성공적인 생성 및 Pydantic 검증 테스트."""
    generator = TurnOutputGenerator(force_mock=True)

    # Mock GenAIClient.generate
    mock_response = GenerateResponse(text=valid_turn_output_json, model_label="fast")

    with patch(
        "unknown_world.orchestrator.generate_turn_output.get_genai_client"
    ) as mock_get_client:
        mock_client = AsyncMock()
        mock_client.generate.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = await generator.generate(turn_input)

        assert result.status == GenerationStatus.SUCCESS
        assert isinstance(result.output, TurnOutput)
        assert result.output.narrative == "낡은 문이 열리고 먼지가 날립니다."
        assert result.output.language == Language.KO

        # API 호출 인자 검증 (Structured Outputs 설정 확인)
        call_args = mock_client.generate.call_args[0][0]
        assert call_args.response_mime_type == "application/json"
        assert call_args.response_schema is not None
        assert "narrative" in call_args.response_schema["properties"]


@pytest.mark.asyncio
async def test_generate_schema_validation_failure(turn_input):
    """Pydantic 검증 실패(SCHEMA_FAILURE) 테스트."""
    generator = TurnOutputGenerator(force_mock=True)

    # 필수 필드(narrative)가 누락된 잘못된 JSON
    invalid_json = json.dumps(
        {
            "language": "ko-KR",
            # "narrative" 필드 누락
            "economy": {
                "cost": {"signal": 5, "memory_shard": 0},
                "balance_after": {"signal": 95, "memory_shard": 5},
            },
            "safety": {"blocked": False, "message": None},
        }
    )

    mock_response = GenerateResponse(text=invalid_json, model_label="fast")

    with patch(
        "unknown_world.orchestrator.generate_turn_output.get_genai_client"
    ) as mock_get_client:
        mock_client = AsyncMock()
        mock_client.generate.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = await generator.generate(turn_input)

        assert result.status == GenerationStatus.SCHEMA_FAILURE
        assert result.output is None
        assert "validation_errors" in result.error_details


@pytest.mark.asyncio
async def test_generate_json_decode_error(turn_input):
    """JSON 파싱 실패 테스트."""
    generator = TurnOutputGenerator(force_mock=True)

    # 유효하지 않은 JSON 형식
    invalid_text = "이것은 JSON이 아닙니다 { narrative: ... "

    mock_response = GenerateResponse(text=invalid_text, model_label="fast")

    with patch(
        "unknown_world.orchestrator.generate_turn_output.get_genai_client"
    ) as mock_get_client:
        mock_client = AsyncMock()
        mock_client.generate.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = await generator.generate(turn_input)

        assert result.status == GenerationStatus.SCHEMA_FAILURE
        # Pydantic model_validate_json은 JSON 파싱 실패도 ValidationError(type=json_invalid)로 보고함
        errors = result.error_details.get("validation_errors", [])
        assert any(err["type"] == "json_invalid" for err in errors)


@pytest.mark.asyncio
async def test_generate_markdown_json_extraction(turn_input, valid_turn_output_json):
    """마크다운 코드 블록 내의 JSON 추출 테스트."""
    generator = TurnOutputGenerator(force_mock=True)

    # 마크다운 코드 블록으로 감싸진 응답
    markdown_text = f"```json\n{valid_turn_output_json}\n```"

    mock_response = GenerateResponse(text=markdown_text, model_label="fast")

    with patch(
        "unknown_world.orchestrator.generate_turn_output.get_genai_client"
    ) as mock_get_client:
        mock_client = AsyncMock()
        mock_client.generate.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = await generator.generate(turn_input)

        assert result.status == GenerationStatus.SUCCESS
        assert result.output.narrative == "낡은 문이 열리고 먼지가 날립니다."


@pytest.mark.asyncio
async def test_generate_api_error(turn_input):
    """API 호출 에러 처리 테스트."""
    generator = TurnOutputGenerator(force_mock=True)

    with patch(
        "unknown_world.orchestrator.generate_turn_output.get_genai_client"
    ) as mock_get_client:
        mock_client = AsyncMock()
        mock_client.generate.side_effect = RuntimeError("API connection failed")
        mock_get_client.return_value = mock_client

        result = await generator.generate(turn_input)

        assert result.status == GenerationStatus.API_ERROR
        assert "API connection failed" in result.error_details["api_error"]


def test_create_safe_fallback():
    """안전한 폴백 생성 테스트 (RULE-004)."""
    generator = TurnOutputGenerator()

    economy_snapshot = CurrencyAmount(signal=80, memory_shard=3)
    fallback = generator.create_safe_fallback(
        language=Language.KO, error_message="Test Error", economy_snapshot=economy_snapshot
    )

    assert isinstance(fallback, TurnOutput)
    assert fallback.language == Language.KO
    assert fallback.economy.cost.signal == 0
    assert fallback.economy.balance_after.signal == 80
    assert "혼란스러운" in fallback.narrative
