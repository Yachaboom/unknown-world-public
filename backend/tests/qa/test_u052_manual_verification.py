"""U-052[Mvp]: 조건부 이미지 생성 제어 로직 수동 검증 스크립트.

이 스크립트는 런북의 시나리오 A, B, C, D를 실행하고 로그 출력을 확인합니다.
특히 RULE-007(프롬프트 해시)과 RULE-005(잔액 부족 폴백)를 중점적으로 확인합니다.
"""

import logging
import sys

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
from unknown_world.orchestrator.stages.render_helpers import decide_image_generation

# 로그 설정 (표준 출력으로 로그 출력)
logging.basicConfig(level=logging.DEBUG, format="%(levelname)s - %(message)s", stream=sys.stdout)
logger = logging.getLogger("U-052-Verification")


def print_separator(title):
    print("\n" + "=" * 60)
    print(f"  SCENARIO: {title}")
    print("=" * 60)


def run_verification():
    # -------------------------------------------------------------------------
    # 시나리오 A: 이미지 생성 승인 (should_generate=true, 잔액 충분)
    # -------------------------------------------------------------------------
    print_separator("A: Image Generation Approved")
    turn_output_a = TurnOutput(
        language=Language.KO,
        narrative="어두운 숲길에 들어섰다.",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=5, memory_shard=0),
            balance_after=CurrencyAmount(signal=95, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(
            image_job=ImageJob(
                should_generate=True,
                prompt="A dark forest path with moonlight filtering through the trees",
                aspect_ratio="16:9",
            )
        ),
    )
    economy_a = EconomySnapshot(signal=100, memory_shard=5)

    logger.info("Starting Scenario A...")
    decision_a = decide_image_generation(turn_output_a, economy_a, "ko-KR")

    print(f"\nResult: should_generate={decision_a.should_generate}")
    print(f"Reason: {decision_a.reason}")
    print(f"Prompt Hash: {decision_a.prompt_hash}")

    # -------------------------------------------------------------------------
    # 시나리오 B: 이미지 생성 미요청 (should_generate=false)
    # -------------------------------------------------------------------------
    print_separator("B: Image Generation Not Requested")
    turn_output_b = TurnOutput(
        language=Language.KO,
        narrative="방 안을 둘러보았다.",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=3, memory_shard=0),
            balance_after=CurrencyAmount(signal=97, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(image_job=ImageJob(should_generate=False, prompt="")),
    )
    economy_b = EconomySnapshot(signal=100, memory_shard=5)

    logger.info("Starting Scenario B...")
    decision_b = decide_image_generation(turn_output_b, economy_b, "ko-KR")

    print(f"\nResult: should_generate={decision_b.should_generate}")
    print(f"Reason: {decision_b.reason}")

    # -------------------------------------------------------------------------
    # 시나리오 C: 잔액 부족 (RULE-005)
    # -------------------------------------------------------------------------
    print_separator("C: Insufficient Balance (RULE-005)")
    turn_output_c = TurnOutput(
        language=Language.KO,
        narrative="보물 상자를 발견했다!",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=3, memory_shard=0),
            balance_after=CurrencyAmount(signal=5, memory_shard=0),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(
            image_job=ImageJob(should_generate=True, prompt="A golden treasure chest")
        ),
    )
    economy_c = EconomySnapshot(signal=5, memory_shard=0)

    logger.info(f"Starting Scenario C (Balance: {economy_c.signal} Signal)...")
    decision_c = decide_image_generation(turn_output_c, economy_c, "ko-KR")

    print(f"\nResult: should_generate={decision_c.should_generate}")
    print(f"Reason: {decision_c.reason}")
    print(f"Fallback Message: {decision_c.fallback_message}")

    # -------------------------------------------------------------------------
    # 시나리오 D: 빈 프롬프트 방어
    # -------------------------------------------------------------------------
    print_separator("D: Empty Prompt Defense")
    turn_output_d = TurnOutput(
        language=Language.EN,
        narrative="You entered the dungeon.",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=5, memory_shard=0),
            balance_after=CurrencyAmount(signal=95, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(image_job=ImageJob(should_generate=True, prompt="   ")),
    )
    economy_d = EconomySnapshot(signal=100, memory_shard=5)

    logger.info("Starting Scenario D...")
    decision_d = decide_image_generation(turn_output_d, economy_d, "en-US")

    print(f"\nResult: should_generate={decision_d.should_generate}")
    print(f"Reason: {decision_d.reason}")


if __name__ == "__main__":
    run_verification()
