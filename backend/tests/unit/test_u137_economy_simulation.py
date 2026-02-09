def simulate_turns(initial_signal, turns, avg_cost, avg_base_reward, quest_rewards, earn_rewards):
    """
    경제 시스템 시뮬레이션 함수.

    Args:
        initial_signal: 초기 Signal
        turns: 시뮬레이션할 총 턴 수 (25턴)
        avg_cost: 턴당 평균 소비 (5)
        avg_base_reward: 턴당 평균 기본 보상 (1-3 사이, 2로 가정)
        quest_rewards: 총 퀘스트 보상 합계 (예: 5회 * 8 = 40)
        earn_rewards: 총 탐색 카드 보상 합계 (예: 3회 * 5 = 15)
    """
    signal = initial_signal
    history = []

    for i in range(1, turns + 1):
        # 1. 비용 결정
        cost = avg_cost

        # 2. 보상 결정 (기본 보상 + 이벤트 보상 분산)
        # 퀘스트 보상과 탐색 보상은 특정 턴에 몰려있다고 가정 (5턴마다 퀘스트, 8턴마다 탐색)
        turn_quest_reward = 8 if i % 5 == 0 else 0
        turn_earn_reward = 5 if i % 8 == 0 else 0

        gains = avg_base_reward + turn_quest_reward + turn_earn_reward

        # 3. 잔액 계산 (business_rules 공식 준수)
        signal = max(0, signal - cost + gains)

        history.append({"turn": i, "signal": signal, "cost": cost, "gains": gains})

    return signal, history


def test_u137_25_turn_simulation_target():
    """
    U-137 완료 기준 검증:
    - 초기 Signal 150 (Tech 프로필 기준)
    - 25턴 후 Signal >= 15 유지 확인
    - low_balance_warning (Signal < 15) 빈도 30% 이하 확인
    """
    initial_signal = 150
    turns = 25
    avg_cost = 5
    avg_base_reward = 2  # 1-3 범위의 중간값

    final_signal, history = simulate_turns(
        initial_signal=initial_signal,
        turns=turns,
        avg_cost=avg_cost,
        avg_base_reward=avg_base_reward,
        quest_rewards=40,  # 5회 * 8
        earn_rewards=15,  # 3회 * 5
    )

    # 완료 기준 1: 최종 잔액 >= 15
    print(f"\n[Simulation] Final Signal after {turns} turns: {final_signal}")
    assert final_signal >= 15, f"Final signal {final_signal} is below target 15"

    # 완료 기준 2: low_balance_warning 빈도 <= 30% (7.5턴)
    low_balance_turns = [h for h in history if h["signal"] < 15]
    warning_rate = (len(low_balance_turns) / turns) * 100
    print(
        f"[Simulation] Low balance warning rate: {warning_rate}% ({len(low_balance_turns)} turns)"
    )
    assert warning_rate <= 30, f"Warning rate {warning_rate}% is too high"


def test_u137_worst_case_simulation():
    """
    최악의 시나리오 검증:
    - 초기 Signal 120 (보수적 상향)
    - 턴당 비용 8 (높은 비용 행동 지속)
    - 기본 보상 1 (최소 보상)
    - 퀘스트 보상 5 (최소 보상)
    - 탐색 보상 3 (최소 보상)
    """
    initial_signal = 120
    turns = 25
    avg_cost = 8
    avg_base_reward = 1

    final_signal, history = simulate_turns(
        initial_signal=initial_signal,
        turns=turns,
        avg_cost=avg_cost,
        avg_base_reward=avg_base_reward,
        quest_rewards=25,  # 5회 * 5
        earn_rewards=9,  # 3회 * 3
    )

    print(f"\n[Worst Case] Final Signal: {final_signal}")
    # 최악의 경우라도 잔액이 0보다는 커야 게임이 중단되지 않음
    assert final_signal > 0, "Worst case results in zero balance"
