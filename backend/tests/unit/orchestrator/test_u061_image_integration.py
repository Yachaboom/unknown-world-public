import pytest

from unknown_world.models.turn import Language, TurnInput
from unknown_world.orchestrator.generate_turn_output import TurnOutputGenerator
from unknown_world.orchestrator.prompt_loader import load_image_prompt


def test_load_image_prompt_languages():
    """언어별 이미지 프롬프트 로드 및 폴백 테스트."""
    # 한국어 로드
    ko_prompt = load_image_prompt(Language.KO)
    assert "다크 판타지" in ko_prompt
    assert "dark fantasy" in ko_prompt.lower()

    # 영어 로드
    en_prompt = load_image_prompt(Language.EN)
    assert "Dark fantasy" in en_prompt
    assert "dark fantasy" in en_prompt.lower()

    # 두 내용이 서로 다른지 확인 (번역됨)
    assert ko_prompt != en_prompt


def test_generate_turn_output_prompt_integration():
    """TurnOutputGenerator에서 이미지 가이드라인이 시스템 프롬프트에 포함되는지 테스트."""
    generator = TurnOutputGenerator(force_mock=True)

    from unknown_world.models.turn import ClientInfo, EconomySnapshot, Theme

    client_info = ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK)

    turn_input_ko = TurnInput(
        text="테스트 입력",
        language=Language.KO,
        client=client_info,
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=10),
    )

    prompt_ko = generator._build_prompt(turn_input_ko)

    # 이미지 가이드라인 섹션이 포함되어 있는지 확인
    assert "## 이미지 생성 지침 (Image Generation Guidelines)" in prompt_ko
    # 한국어 지침 내용이 포함되어 있는지 확인
    assert "다크 판타지" in prompt_ko

    turn_input_en = TurnInput(
        text="Test input",
        language=Language.EN,
        client=client_info,
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=10),
    )

    prompt_en = generator._build_prompt(turn_input_en)

    assert "## 이미지 생성 지침 (Image Generation Guidelines)" in prompt_en
    # 영어 지침 내용이 포함되어 있는지 확인
    assert "Dark fantasy" in prompt_en
    assert "다크 판타지" not in prompt_en  # 영어 프롬프트에는 한국어 설명이 없어야 함 (본문 기준)


@pytest.mark.asyncio
async def test_generate_turn_output_full_flow_mock(monkeypatch):
    """전체 생성 흐름에서 이미지 프롬프트가 생성되는지 확인 (Mock)."""
    # GenAIClient.generate가 유효한 TurnOutput JSON을 반환하도록 모킹
    import json

    from unknown_world.services.genai_client import GenerateResponse, MockGenAIClient

    mock_turn_output = {
        "language": "ko-KR",
        "narrative": "테스트 내러티브",
        "ui": {"action_deck": {"cards": []}, "objects": []},
        "world": {
            "rules_changed": [],
            "inventory_added": [],
            "inventory_removed": [],
            "quests_updated": [],
            "relationships_changed": [],
            "memory_pins": [],
        },
        "render": {
            "image_job": {
                "should_generate": True,
                "prompt": "A beautiful dark fantasy landscape, cinematic lighting, highly detailed",
                "model_label": "FAST",
                "aspect_ratio": "16:9",
                "image_size": "1024x1024",
            }
        },
        "economy": {
            "cost": {"signal": 5, "memory_shard": 0},
            "balance_after": {"signal": 95, "memory_shard": 10},
        },
        "safety": {"blocked": False},
        "agent_console": {"current_phase": "commit", "badges": ["schema_ok"], "repair_count": 0},
    }

    async def mock_generate(*args, **kwargs):
        return GenerateResponse(text=json.dumps(mock_turn_output), model_label="FAST")

    monkeypatch.setattr(MockGenAIClient, "generate", mock_generate)

    generator = TurnOutputGenerator(force_mock=True)

    from unknown_world.models.turn import ClientInfo, EconomySnapshot, Theme

    client_info = ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK)

    turn_input = TurnInput(
        text="어두운 숲으로 들어갑니다.",
        language=Language.KO,
        client=client_info,
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=10),
    )

    result = await generator.generate(turn_input)

    assert result.status == "success"
    assert result.output is not None
    assert result.output.render.image_job.should_generate is True
    assert "dark fantasy" in result.output.render.image_job.prompt.lower()
