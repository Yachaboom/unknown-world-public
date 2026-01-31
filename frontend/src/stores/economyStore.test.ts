import { describe, it, expect, beforeEach } from 'vitest';
import {
  useEconomyStore,
  LEDGER_MAX_ENTRIES,
  canAffordCost,
  canAffordEstimate,
} from './economyStore';
import type { CurrencyAmount, CostEstimate } from '../schemas/turn';

describe('economyStore', () => {
  beforeEach(() => {
    useEconomyStore.getState().reset();
    useEconomyStore.getState().clearLedger();
  });

  it('초기 상태가 올바르게 설정되어야 한다', () => {
    const state = useEconomyStore.getState();
    expect(state.ledger).toEqual([]);
    expect(state.costEstimate).toBeNull();
    expect(state.lastCost).toBeNull();
    expect(state.isBalanceLow).toBe(false);
    expect(state.lowBalanceThreshold).toBe(10);
  });

  it('addLedgerEntry가 엔트리를 추가하고 lastCost를 업데이트해야 한다', () => {
    const entry = {
      turnId: 1,
      reason: 'explore',
      cost: { signal: 5, memory_shard: 0 },
      balanceAfter: { signal: 95, memory_shard: 10 },
      modelLabel: 'FAST' as const,
    };

    useEconomyStore.getState().addLedgerEntry(entry);

    const state = useEconomyStore.getState();
    expect(state.ledger.length).toBe(1);
    expect(state.ledger[0].turnId).toBe(1);
    expect(state.ledger[0].timestamp).toBeDefined();
    expect(state.lastCost).toEqual({
      cost: entry.cost,
      balanceAfter: entry.balanceAfter,
      turnId: entry.turnId,
      modelLabel: entry.modelLabel,
    });
  });

  it(`Ledger는 최대 ${LEDGER_MAX_ENTRIES}개까지만 보관해야 한다`, () => {
    const store = useEconomyStore.getState();

    // 25개 엔트리 추가
    for (let i = 1; i <= 25; i++) {
      store.addLedgerEntry({
        turnId: i,
        reason: `test-${i}`,
        cost: { signal: 1, memory_shard: 0 },
        balanceAfter: { signal: 100 - i, memory_shard: 0 },
      });
    }

    const state = useEconomyStore.getState();
    expect(state.ledger.length).toBe(LEDGER_MAX_ENTRIES);
    // 최신순(내림차순) 정렬 확인
    expect(state.ledger[0].turnId).toBe(25);
    expect(state.ledger[LEDGER_MAX_ENTRIES - 1].turnId).toBe(25 - LEDGER_MAX_ENTRIES + 1);
  });

  it('setCostEstimateFromCard가 예상 비용을 올바르게 설정해야 한다', () => {
    const cost: CurrencyAmount = { signal: 5, memory_shard: 0 };
    const estimate: CostEstimate = {
      min: { signal: 3, memory_shard: 0 },
      max: { signal: 7, memory_shard: 0 },
    };

    // 1. cost_estimate가 제공된 경우
    useEconomyStore.getState().setCostEstimateFromCard(cost, estimate, 'action-1', 'Test Label');
    let state = useEconomyStore.getState();
    expect(state.costEstimate).toEqual({
      min: estimate.min,
      max: estimate.max,
      actionId: 'action-1',
      label: 'Test Label',
    });

    // 2. cost_estimate가 null인 경우 (기본 cost 사용)
    useEconomyStore.getState().setCostEstimateFromCard(cost, null, 'action-2');
    state = useEconomyStore.getState();
    expect(state.costEstimate).toEqual({
      min: cost,
      max: cost,
      actionId: 'action-2',
      label: undefined,
    });
  });

  it('updateBalanceLowStatus가 임계값에 따라 상태를 업데이트해야 한다', () => {
    const store = useEconomyStore.getState();

    // 기본 임계값 10
    store.updateBalanceLowStatus({ signal: 15, memory_shard: 0 });
    expect(useEconomyStore.getState().isBalanceLow).toBe(false);

    store.updateBalanceLowStatus({ signal: 5, memory_shard: 0 });
    expect(useEconomyStore.getState().isBalanceLow).toBe(true);

    // 임계값 변경 테스트
    store.setLowBalanceThreshold(20);
    store.updateBalanceLowStatus({ signal: 15, memory_shard: 0 });
    expect(useEconomyStore.getState().isBalanceLow).toBe(true);
  });

  describe('Utility: canAffordCost & canAffordEstimate', () => {
    const balance: CurrencyAmount = { signal: 10, memory_shard: 2 };

    it('canAffordCost: 잔액이 충분할 때', () => {
      const cost: CurrencyAmount = { signal: 5, memory_shard: 1 };
      const result = canAffordCost(balance, cost);
      expect(result.affordable).toBe(true);
      expect(result.shortfall).toEqual({ signal: 0, memory_shard: 0 });
    });

    it('canAffordCost: 잔액이 부족할 때 (Signal)', () => {
      const cost: CurrencyAmount = { signal: 15, memory_shard: 1 };
      const result = canAffordCost(balance, cost);
      expect(result.affordable).toBe(false);
      expect(result.shortfall.signal).toBe(5);
    });

    it('canAffordCost: 잔액이 부족할 때 (Shard)', () => {
      const cost: CurrencyAmount = { signal: 5, memory_shard: 5 };
      const result = canAffordCost(balance, cost);
      expect(result.affordable).toBe(false);
      expect(result.shortfall.memory_shard).toBe(3);
    });

    it('canAffordEstimate: 최대 예상 비용 기준으로 체크해야 한다', () => {
      const estimate = {
        min: { signal: 5, memory_shard: 0 },
        max: { signal: 15, memory_shard: 0 },
      };
      // Signal 10 < Max 15 이므로 감당 불가
      const result = canAffordEstimate(balance, estimate);
      expect(result.affordable).toBe(false);
      expect(result.shortfall.signal).toBe(5);
    });
  });
});
