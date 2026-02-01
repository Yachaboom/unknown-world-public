"""U-052[Mvp]: 조건부 이미지 생성 제어 로직 단위 테스트.

이 테스트는 TurnOutput 내의 image_job을 분석하여 이미지 생성 여부를 판정하는
render_helpers.py의 기능들을 검증합니다.

테스트 항목:
    - extract_image_job: TurnOutput에서 ImageJob 추출 검증
    - should_generate_image: should_generate 플래그 및 프롬프트 유효성 검사
    - get_prompt_hash: 프롬프트 해싱 검증 (RULE-007)
    - can_afford_image_generation: 잔액 기반 비용 판정 검증 (RULE-005)
    - decide_image_generation: 종합 판정 로직 및 폴백 메시지 검증
"""

import pytest

from unknown_world.models.turn import (
    CurrencyAmount,
    EconomyOutput,
    EconomySnapshot,
    ImageJob,
    Language,
    RenderOutput,
    SafetyOutput,
    TurnOutput,
)
from unknown_world.orchestrator.stages.render_helpers import (
    IMAGE_GENERATION_COST_SIGNAL,
    can_afford_image_generation,
    decide_image_generation,
    extract_image_job,
    get_prompt_hash,
    should_generate_image,
)


@pytest.fixture
def base_turn_output():
    """기본 TurnOutput 객체를 생성하는 픽스처."""
    return TurnOutput(
        language=Language.KO,
        narrative="테스트 내러티브",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=5, memory_shard=0),
            balance_after=CurrencyAmount(signal=95, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
    )


def test_extract_image_job_exists(base_turn_output):
    """ImageJob이 존재하는 경우 정상적으로 추출하는지 확인."""
    image_job = ImageJob(should_generate=True, prompt="A beautiful sunset")
    base_turn_output.render = RenderOutput(image_job=image_job)

    extracted = extract_image_job(base_turn_output)
    assert extracted == image_job
    assert extracted.prompt == "A beautiful sunset"


def test_extract_image_job_none(base_turn_output):
    """ImageJob이 None인 경우 None을 반환하는지 확인."""
    base_turn_output.render = RenderOutput(image_job=None)
    assert extract_image_job(base_turn_output) is None


def test_should_generate_image_true():
    """모든 조건이 만족될 때 True를 반환하는지 확인."""
    job = ImageJob(should_generate=True, prompt="Valid prompt")
    assert should_generate_image(job) is True


def test_should_generate_image_false_flag():
    """should_generate 플래그가 False면 False를 반환하는지 확인."""
    job = ImageJob(should_generate=False, prompt="Valid prompt")
    assert should_generate_image(job) is False


def test_should_generate_image_empty_prompt():
    """프롬프트가 비어있으면 False를 반환하는지 확인."""
    job1 = ImageJob(should_generate=True, prompt="")
    job2 = ImageJob(should_generate=True, prompt="   ")
    assert should_generate_image(job1) is False
    assert should_generate_image(job2) is False


def test_should_generate_image_none():
    """ImageJob이 None이면 False를 반환하는지 확인."""
    assert should_generate_image(None) is False


def test_get_prompt_hash():
    """프롬프트 해시가 8자리이며 원문과 다른지 확인."""
    prompt = "A mysterious cave in the mountains"
    h = get_prompt_hash(prompt)
    assert len(h) == 8
    assert h != prompt
    # 동일 프롬프트는 동일 해시
    assert h == get_prompt_hash(prompt)
    # 다른 프롬프트는 다른 해시
    assert h != get_prompt_hash("Something else")


def test_can_afford_image_generation():
    """잔액 기반 비용 판정 확인."""
    cost = IMAGE_GENERATION_COST_SIGNAL  # 10

    # 충분
    snapshot_ok = EconomySnapshot(signal=cost, memory_shard=0)
    assert can_afford_image_generation(snapshot_ok) is True

    # 여유
    snapshot_rich = EconomySnapshot(signal=100, memory_shard=5)
    assert can_afford_image_generation(snapshot_rich) is True

    # 부족
    snapshot_poor = EconomySnapshot(signal=cost - 1, memory_shard=0)
    assert can_afford_image_generation(snapshot_poor) is False


def test_decide_image_generation_success(base_turn_output):
    """모든 조건이 충족되어 생성이 승인되는 케이스."""
    job = ImageJob(
        should_generate=True, prompt="A dragon flying over a castle", aspect_ratio="16:9"
    )
    base_turn_output.render = RenderOutput(image_job=job)
    economy = EconomySnapshot(signal=100, memory_shard=5)

    decision = decide_image_generation(base_turn_output, economy)

    assert decision.should_generate is True
    assert decision.reason == "all_conditions_met"
    assert decision.prompt_hash == get_prompt_hash(job.prompt)
    assert decision.aspect_ratio == "16:9"
    assert decision.estimated_cost_signal == IMAGE_GENERATION_COST_SIGNAL
    assert decision.fallback_message is None


def test_decide_image_generation_insufficient_balance(base_turn_output):
    """잔액 부족으로 거절되는 케이스 (RULE-005)."""
    job = ImageJob(should_generate=True, prompt="A treasure chest")
    base_turn_output.render = RenderOutput(image_job=job)
    # 비용 10인데 잔액 5
    economy = EconomySnapshot(signal=5, memory_shard=0)

    decision = decide_image_generation(base_turn_output, economy, language="ko-KR")

    assert decision.should_generate is False
    assert decision.reason == "insufficient_balance"
    assert "잔액이 부족하여" in decision.fallback_message
    assert decision.prompt_hash == get_prompt_hash(job.prompt)


def test_decide_image_generation_no_job(base_turn_output):
    """ImageJob이 없는 케이스."""
    base_turn_output.render = RenderOutput(image_job=None)
    economy = EconomySnapshot(signal=100, memory_shard=5)

    decision = decide_image_generation(base_turn_output, economy)

    assert decision.should_generate is False
    assert decision.reason == "no_image_job"


def test_decide_image_generation_empty_prompt(base_turn_output):
    """프롬프트가 비어있는 케이스."""
    job = ImageJob(should_generate=True, prompt=" ")
    base_turn_output.render = RenderOutput(image_job=job)
    economy = EconomySnapshot(signal=100, memory_shard=5)

    decision = decide_image_generation(base_turn_output, economy)

    assert decision.should_generate is False
    assert decision.reason == "empty_prompt"


def test_decide_image_generation_language_fallback(base_turn_output):
    """언어별 폴백 메시지 확인 (RULE-006)."""
    job = ImageJob(should_generate=True, prompt="Gold coins")
    base_turn_output.render = RenderOutput(image_job=job)
    economy = EconomySnapshot(signal=0, memory_shard=0)

    # 한국어
    decision_ko = decide_image_generation(base_turn_output, economy, language="ko-KR")
    assert "이미지를 생성할 수 없습니다" in decision_ko.fallback_message

    # 영어
    decision_en = decide_image_generation(base_turn_output, economy, language="en-US")
    assert "Insufficient balance" in decision_en.fallback_message
