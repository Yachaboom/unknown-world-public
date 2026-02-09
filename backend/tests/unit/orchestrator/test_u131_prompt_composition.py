# pyright: reportPrivateUsage=false

import pytest

from unknown_world.models.turn import ClientInfo, EconomySnapshot, Language, TurnInput
from unknown_world.orchestrator.generate_turn_output import TurnOutputGenerator


@pytest.mark.asyncio
async def test_u131_overarching_mystery_prompt_injection_ko():
    """한국어 시스템 프롬프트에 Overarching Mystery 섹션이 포함되는지 검증 (U-131)."""
    generator = TurnOutputGenerator()
    turn_input = TurnInput(
        language=Language.KO,
        text="테스트 입력",
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=10),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )

    # 시스템 인스트럭션 빌드
    instruction = generator._build_system_instruction(turn_input, world_context="세계 상태")

    # 1. 미스터리 섹션 태그 확인
    assert "<overarching_mystery>" in instruction
    assert "</overarching_mystery>" in instruction

    # 2. 핵심 키워드 '메아리' 확인
    assert "메아리(Echo)" in instruction
    assert "모든 이야기, 모든 선택, 모든 잊힌 진실을 묶는 공명" in instruction

    # 3. 퀘스트 연결 지침 확인 (turn_output_instructions에서 로드됨)
    assert "Overarching Mystery 연결 (U-131)" in instruction
    assert '직접적으로 "메아리를 찾아라"라고 명시하지 마세요' in instruction


@pytest.mark.asyncio
async def test_u131_overarching_mystery_prompt_injection_en():
    """영어 시스템 프롬프트에 Overarching Mystery 섹션이 포함되는지 검증 (U-131)."""
    generator = TurnOutputGenerator()
    turn_input = TurnInput(
        language=Language.EN,
        text="Test Input",
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=10),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )

    # 시스템 인스트럭션 빌드
    instruction = generator._build_system_instruction(turn_input, world_context="World Context")

    # 1. 미스터리 섹션 태그 확인
    assert "<overarching_mystery>" in instruction
    assert "</overarching_mystery>" in instruction

    # 2. 핵심 키워드 'Echo' 확인
    assert "Echo" in instruction
    assert "resonance that binds all stories, all choices, all forgotten truths" in instruction

    # 3. 퀘스트 연결 지침 확인
    assert "Overarching Mystery Connection (U-131)" in instruction
    assert 'Do NOT explicitly state "find the Echo"' in instruction
