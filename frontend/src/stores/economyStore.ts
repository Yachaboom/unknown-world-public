/**
 * Unknown World - Economy 상태 관리 (Zustand) (U-014[Mvp]).
 *
 * Signal/Memory Shard 재화 HUD와 턴별 비용/잔액 변화를
 * **원장(ledger)**으로 추적하여 "비용/지연을 게임 메커닉"으로 UX에 반영합니다.
 *
 * 설계 원칙:
 *   - RULE-005: Economy 인바리언트 (잔액 음수 금지, 예상 비용 사전 표시)
 *   - RULE-008: 비용/모델 선택 이유는 라벨(FAST/QUALITY/REF)로만 설명
 *   - Q1 결정: Option A - 최근 N턴만 보관 (UI/메모리 절감)
 *   - RU-004-Q5: 상수는 save/constants.ts에서 중앙 관리
 *
 * @module stores/economyStore
 */

import { create } from 'zustand';
import type { CurrencyAmount, ModelLabel, CostEstimate } from '../schemas/turn';
// RU-004-Q5: 상수 중앙화 - constants.ts에서 import
import { LEDGER_MAX_ENTRIES, LOW_BALANCE_THRESHOLD } from '../save/constants';

// RU-004-Q5: 상수 re-export (기존 호출자 호환성 유지)
export { LEDGER_MAX_ENTRIES };

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 원장(Ledger) 엔트리.
 * 각 턴에서 발생한 비용과 잔액 변화를 기록합니다.
 */
export interface LedgerEntry {
  /** 턴 ID (턴 카운트) */
  turnId: number;
  /** 액션 ID (선택된 카드 ID, 선택사항) */
  actionId?: string;
  /** 비용 사유 (예: "탐색", "이미지 생성") */
  reason: string;
  /** 소비된 비용 */
  cost: CurrencyAmount;
  /** 소비 후 잔액 */
  balanceAfter: CurrencyAmount;
  /** 모델 라벨 (FAST/QUALITY/CHEAP/REF) */
  modelLabel?: ModelLabel;
  /** 기록 시간 */
  timestamp: number;
}

/**
 * 예상 비용 상태.
 * 현재 선택된 액션의 예상 비용을 추적합니다.
 */
export interface CostEstimateState {
  /** 최소 예상 비용 */
  min: CurrencyAmount;
  /** 최대 예상 비용 */
  max: CurrencyAmount;
  /** 예상 비용을 계산한 액션 ID */
  actionId?: string;
  /** 예상 비용 라벨/설명 */
  label?: string;
}

/**
 * 마지막 확정 비용 상태.
 * 가장 최근 턴에서 확정된 비용 정보입니다.
 */
export interface LastCostState {
  /** 확정된 비용 */
  cost: CurrencyAmount;
  /** 확정 후 잔액 */
  balanceAfter: CurrencyAmount;
  /** 턴 ID */
  turnId: number;
  /** 모델 라벨 */
  modelLabel?: ModelLabel;
}

/** Economy Store 상태 */
export interface EconomyStoreState {
  /** 원장 (최근 N개 엔트리, 최신순) */
  ledger: LedgerEntry[];
  /** 현재 예상 비용 (선택한 액션 기반) */
  costEstimate: CostEstimateState | null;
  /** 마지막 확정 비용 */
  lastCost: LastCostState | null;
  /** 잔액 부족 경고 여부 */
  isBalanceLow: boolean;
  /** 잔액 부족 임계값 (Signal 기준) */
  lowBalanceThreshold: number;
}

/** Economy Store 액션 */
export interface EconomyStoreActions {
  /**
   * 턴 완료 시 원장에 엔트리를 추가합니다.
   */
  addLedgerEntry: (entry: Omit<LedgerEntry, 'timestamp'>) => void;

  /**
   * SaveGame 복원 시 원장을 그대로 주입합니다 (RU-004-S1).
   *
   * - ledger는 저장된 순서(최신순)를 유지합니다.
   * - timestamp는 저장된 값을 보존합니다.
   * - lastCost는 최신 엔트리(첫 원소) 기준으로 설정합니다.
   * - isBalanceLow는 전달된 currentBalance로 재계산합니다.
   *
   * @param ledger - 저장된 원장 배열 (최신순, timestamp 포함)
   * @param currentBalance - 복원된 잔액 (isBalanceLow 계산용)
   */
  hydrateLedger: (ledger: LedgerEntry[], currentBalance: CurrencyAmount) => void;

  /**
   * 예상 비용을 설정합니다 (카드 선택/호버 시).
   */
  setCostEstimate: (estimate: CostEstimateState | null) => void;

  /**
   * 카드의 비용 정보로 예상 비용을 설정합니다.
   */
  setCostEstimateFromCard: (
    cost: CurrencyAmount,
    costEstimate: CostEstimate | null,
    actionId: string,
    label?: string,
  ) => void;

  /**
   * 마지막 확정 비용을 설정합니다 (TurnOutput 반영 시).
   */
  setLastCost: (lastCost: LastCostState) => void;

  /**
   * 잔액 부족 상태를 업데이트합니다.
   */
  updateBalanceLowStatus: (currentBalance: CurrencyAmount) => void;

  /**
   * 잔액 부족 임계값을 설정합니다.
   */
  setLowBalanceThreshold: (threshold: number) => void;

  /**
   * 원장을 초기화합니다.
   */
  clearLedger: () => void;

  /**
   * 전체 상태를 초기화합니다.
   */
  reset: () => void;
}

export type EconomyStore = EconomyStoreState & EconomyStoreActions;

// =============================================================================
// 초기 상태
// =============================================================================

function createInitialState(): EconomyStoreState {
  return {
    ledger: [],
    costEstimate: null,
    lastCost: null,
    isBalanceLow: false,
    // RU-004-Q5: 임계값 상수 SSOT (save/constants.ts)
    lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
  };
}

// =============================================================================
// Zustand Store
// =============================================================================

/**
 * Economy 상태 스토어.
 *
 * 턴별 비용/잔액 변화를 원장(ledger)으로 추적하고,
 * 예상 비용과 확정 비용을 UI에 제공합니다.
 *
 * @example
 * ```tsx
 * // 예상 비용 설정 (카드 호버 시)
 * const setCostEstimateFromCard = useEconomyStore(s => s.setCostEstimateFromCard);
 * setCostEstimateFromCard(card.cost, card.cost_estimate, card.id, card.label);
 *
 * // 턴 완료 시 원장 기록
 * const addLedgerEntry = useEconomyStore(s => s.addLedgerEntry);
 * addLedgerEntry({
 *   turnId: turnCount,
 *   reason: 'explore',
 *   cost: turnOutput.economy.cost,
 *   balanceAfter: turnOutput.economy.balance_after,
 * });
 * ```
 */
export const useEconomyStore = create<EconomyStore>((set, get) => ({
  // 초기 상태
  ...createInitialState(),

  // 액션

  addLedgerEntry: (entry) => {
    const timestamp = Date.now();
    const newEntry: LedgerEntry = { ...entry, timestamp };

    set((state) => {
      // 최신순으로 추가하고 최대 개수 유지 (Q1: Option A)
      const updatedLedger = [newEntry, ...state.ledger].slice(0, LEDGER_MAX_ENTRIES);

      return {
        ledger: updatedLedger,
        lastCost: {
          cost: entry.cost,
          balanceAfter: entry.balanceAfter,
          turnId: entry.turnId,
          modelLabel: entry.modelLabel,
        },
        // 턴 완료 후 예상 비용 초기화
        costEstimate: null,
      };
    });
  },

  hydrateLedger: (ledger, currentBalance) => {
    const { lowBalanceThreshold } = get();

    // LEDGER_MAX_ENTRIES 정책 적용 (저장된 것이 더 많을 경우 대비)
    const hydratedLedger = ledger.slice(0, LEDGER_MAX_ENTRIES);

    // lastCost는 가장 최신 엔트리(첫 원소) 기준으로 설정
    const latestEntry = hydratedLedger[0] ?? null;
    const lastCost: LastCostState | null = latestEntry
      ? {
          cost: latestEntry.cost,
          balanceAfter: latestEntry.balanceAfter,
          turnId: latestEntry.turnId,
          modelLabel: latestEntry.modelLabel,
        }
      : null;

    // isBalanceLow는 복원된 잔액 기준으로 재계산
    const isBalanceLow = currentBalance.signal < lowBalanceThreshold;

    set({
      ledger: hydratedLedger,
      lastCost,
      isBalanceLow,
      costEstimate: null,
    });
  },

  setCostEstimate: (estimate) => {
    set({ costEstimate: estimate });
  },

  setCostEstimateFromCard: (cost, costEstimate, actionId, label) => {
    if (costEstimate) {
      set({
        costEstimate: {
          min: costEstimate.min,
          max: costEstimate.max,
          actionId,
          label,
        },
      });
    } else {
      // cost_estimate가 없으면 기본 cost를 min/max로 사용
      set({
        costEstimate: {
          min: cost,
          max: cost,
          actionId,
          label,
        },
      });
    }
  },

  setLastCost: (lastCost) => {
    set({ lastCost });
  },

  updateBalanceLowStatus: (currentBalance) => {
    const { lowBalanceThreshold } = get();
    const isLow = currentBalance.signal < lowBalanceThreshold;
    set({ isBalanceLow: isLow });
  },

  setLowBalanceThreshold: (threshold) => {
    set({ lowBalanceThreshold: threshold });
  },

  clearLedger: () => {
    set({ ledger: [], lastCost: null });
  },

  reset: () => {
    set(createInitialState());
  },
}));

// =============================================================================
// 셀렉터 (성능 최적화용)
// =============================================================================

/** 원장 셀렉터 */
export const selectLedger = (state: EconomyStore) => state.ledger;

/** 예상 비용 셀렉터 */
export const selectCostEstimate = (state: EconomyStore) => state.costEstimate;

/** 마지막 확정 비용 셀렉터 */
export const selectLastCost = (state: EconomyStore) => state.lastCost;

/** 잔액 부족 상태 셀렉터 */
export const selectIsBalanceLow = (state: EconomyStore) => state.isBalanceLow;

/** 최근 N개 원장 엔트리 셀렉터 */
export const selectRecentLedger =
  (count: number) =>
  (state: EconomyStore): LedgerEntry[] =>
    state.ledger.slice(0, count);

/** 총 소비 비용 계산 셀렉터 (현재 세션) */
export const selectTotalSpent = (state: EconomyStore): CurrencyAmount => {
  return state.ledger.reduce(
    (acc, entry) => ({
      signal: acc.signal + entry.cost.signal,
      memory_shard: acc.memory_shard + entry.cost.memory_shard,
    }),
    { signal: 0, memory_shard: 0 },
  );
};

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 현재 잔액으로 예상 비용을 감당할 수 있는지 확인합니다.
 * RULE-005: 잔액 부족 시 실행 강행이 아니라 대체 행동을 제안.
 */
export function canAffordCost(
  balance: CurrencyAmount,
  cost: CurrencyAmount,
): { affordable: boolean; shortfall: CurrencyAmount } {
  const signalShortfall = Math.max(0, cost.signal - balance.signal);
  const shardShortfall = Math.max(0, cost.memory_shard - balance.memory_shard);

  return {
    affordable: signalShortfall === 0 && shardShortfall === 0,
    shortfall: { signal: signalShortfall, memory_shard: shardShortfall },
  };
}

/**
 * 예상 비용의 최대값으로 감당 가능 여부를 확인합니다.
 */
export function canAffordEstimate(
  balance: CurrencyAmount,
  estimate: CostEstimateState,
): { affordable: boolean; shortfall: CurrencyAmount } {
  return canAffordCost(balance, estimate.max);
}
