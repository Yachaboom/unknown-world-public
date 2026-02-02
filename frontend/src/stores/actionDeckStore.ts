/**
 * Unknown World - Action Deck 상태 관리 (Zustand) (U-009[Mvp]).
 *
 * Action Deck의 카드 목록, 선택 상태, 잔액 기반 필터링을 관리합니다.
 *
 * 설계 원칙:
 *   - RULE-005: 잔액 부족 시 실행 불가 표시 + 대안 제공
 *   - RULE-008: 카드 클릭 → TurnInput 연결
 *
 * @module stores/actionDeckStore
 */

import { create } from 'zustand';
import type { ActionCard } from '../schemas/turn';

// =============================================================================
// 상태 타입 정의
// =============================================================================

/** Action Deck 상태 */
export interface ActionDeckState {
  /** 현재 카드 목록 (서버에서 받은 원본) */
  cards: ActionCard[];
  /** 선택된 카드 ID (클릭 후 실행 전까지) */
  selectedCardId: string | null;
  /** 마지막으로 실행된 카드 ID */
  lastExecutedCardId: string | null;
}

/** Action Deck 액션 */
export interface ActionDeckActions {
  /** 카드 목록 설정 (TurnOutput 수신 시) */
  setCards: (cards: ActionCard[]) => void;
  /** 카드 선택 */
  selectCard: (cardId: string | null) => void;
  /** 카드 실행 완료 기록 */
  markExecuted: (cardId: string) => void;
  /** 상태 초기화 */
  reset: () => void;
}

export type ActionDeckStore = ActionDeckState & ActionDeckActions;

// =============================================================================
// 초기 상태
// =============================================================================

function createInitialState(): ActionDeckState {
  return {
    cards: [],
    selectedCardId: null,
    lastExecutedCardId: null,
  };
}

// =============================================================================
// Zustand Store
// =============================================================================

/**
 * Action Deck 상태 스토어.
 *
 * @example
 * ```tsx
 * const { cards, setCards, selectCard } = useActionDeckStore();
 *
 * // TurnOutput 수신 시
 * setCards(turnOutput.ui.action_deck.cards);
 *
 * // 카드 클릭 시
 * selectCard(card.id);
 * ```
 */
export const useActionDeckStore = create<ActionDeckStore>((set) => ({
  // 초기 상태
  ...createInitialState(),

  // 액션
  setCards: (cards) => {
    set({
      cards,
      selectedCardId: null, // 새 카드 목록 수신 시 선택 초기화
    });
  },

  selectCard: (cardId) => {
    set({ selectedCardId: cardId });
  },

  markExecuted: (cardId) => {
    set({
      lastExecutedCardId: cardId,
      selectedCardId: null,
    });
  },

  reset: () => {
    set(createInitialState());
  },
}));

// =============================================================================
// 셀렉터 (성능 최적화용)
// =============================================================================

/** 카드 목록 셀렉터 */
export const selectCards = (state: ActionDeckStore) => state.cards;

/** 선택된 카드 ID 셀렉터 */
export const selectSelectedCardId = (state: ActionDeckStore) => state.selectedCardId;

/** 선택된 카드 객체 셀렉터 */
export const selectSelectedCard = (state: ActionDeckStore) =>
  state.cards.find((c) => c.id === state.selectedCardId) ?? null;

/** 마지막 실행 카드 ID 셀렉터 */
export const selectLastExecutedCardId = (state: ActionDeckStore) => state.lastExecutedCardId;

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 잔액 기반으로 실행 가능한 카드만 필터링합니다.
 * (컴포넌트에서 사용하거나, 서버 응답이 enabled를 제공하지 않을 때 폴백으로 사용)
 *
 * U-065: cost_estimate 필드 제거됨, cost만 사용
 *
 * @param cards - 원본 카드 목록
 * @param balance - 현재 잔액
 * @returns 실행 가능한 카드 목록
 */
export function filterAffordableCards(
  cards: ActionCard[],
  balance: { signal: number; memory_shard: number },
): ActionCard[] {
  return cards.filter((card) => {
    // 서버에서 이미 enabled=false로 판단했으면 제외
    if (!card.enabled) return false;

    // U-065: cost_estimate 제거됨, cost만 사용
    const cost = card.cost;
    return balance.signal >= cost.signal && balance.memory_shard >= cost.memory_shard;
  });
}

/**
 * 대안 카드(is_alternative=true)만 필터링합니다.
 *
 * @param cards - 원본 카드 목록
 * @returns 대안 카드 목록
 */
export function filterAlternativeCards(cards: ActionCard[]): ActionCard[] {
  return cards.filter((card) => card.is_alternative);
}

/**
 * 일반 카드(is_alternative=false)만 필터링합니다.
 *
 * @param cards - 원본 카드 목록
 * @returns 일반 카드 목록
 */
export function filterRegularCards(cards: ActionCard[]): ActionCard[] {
  return cards.filter((card) => !card.is_alternative);
}
