/**
 * Unknown World - World/Session 상태 관리 (Zustand) (RU-003-Q4).
 *
 * TurnOutput 반영으로 갱신되는 세션 월드/UI 상태를 SSOT로 관리합니다.
 * App.tsx의 로컬 상태를 이 스토어로 이동하여 책임 경계를 명확히 합니다.
 *
 * 설계 원칙:
 *   - RU-003 Q1 결정: 도메인별 store 분리 (Option A)
 *   - RULE-005: Economy 인바리언트 (잔액 음수 금지)
 *   - RULE-006: ko/en i18n 정책 준수
 *
 * 순환 import 방지:
 *   - worldStore → (actionDeckStore/inventoryStore) 단방향만 허용
 *   - 역방향 import 금지
 *
 * @module stores/worldStore
 */

import { create } from 'zustand';
import type { TurnOutput, SceneObject } from '../schemas/turn';
import type { SceneCanvasState } from '../types/scene';
import { useActionDeckStore } from './actionDeckStore';
import { useInventoryStore, parseInventoryAdded } from './inventoryStore';

// =============================================================================
// 타입 정의
// =============================================================================

/** 재화 상태 */
export interface EconomyState {
  signal: number;
  memory_shard: number;
}

/** 내러티브 엔트리 */
export interface NarrativeEntry {
  turn: number;
  text: string;
}

/** World/Session 상태 */
export interface WorldState {
  /** 재화 상태 (RULE-005) */
  economy: EconomyState;
  /** 연결 상태 */
  isConnected: boolean;
  /** Scene Canvas 상태 (U-031) */
  sceneState: SceneCanvasState;
  /** Scene Objects (U-010: 핫스팟 오버레이) */
  sceneObjects: SceneObject[];
  /** 내러티브 히스토리 */
  narrativeEntries: NarrativeEntry[];
  /** 현재 턴 카운트 */
  turnCount: number;
}

/** World Store 액션 */
export interface WorldActions {
  /**
   * TurnOutput을 받아 모든 관련 상태를 업데이트합니다.
   * 이 메서드가 TurnOutput 반영의 SSOT입니다.
   */
  applyTurnOutput: (output: TurnOutput) => void;

  /**
   * 시스템 내러티브를 추가합니다 (턴 미발생 피드백용).
   * 드롭 실패 등 턴을 발생시키지 않는 피드백에 사용합니다.
   */
  appendSystemNarrative: (text: string) => void;

  /** Scene 상태 설정 */
  setSceneState: (state: SceneCanvasState) => void;

  /** 연결 상태 설정 */
  setConnected: (connected: boolean) => void;

  /** 경제 상태 설정 (직접 조작용, 일반적으로 applyTurnOutput 사용) */
  setEconomy: (economy: EconomyState) => void;

  /** Scene Objects 설정 (직접 조작용) */
  setSceneObjects: (objects: SceneObject[]) => void;

  /** 초기화 (초기 내러티브 메시지 포함) */
  initialize: (welcomeMessage: string) => void;

  /** 상태 완전 초기화 */
  reset: () => void;
}

export type WorldStore = WorldState & WorldActions;

// =============================================================================
// 초기 상태
// =============================================================================

function createInitialState(): WorldState {
  return {
    economy: { signal: 100, memory_shard: 5 },
    isConnected: true,
    sceneState: { status: 'default', message: '' },
    sceneObjects: [],
    narrativeEntries: [],
    turnCount: 0,
  };
}

// =============================================================================
// Zustand Store
// =============================================================================

/**
 * World/Session 상태 스토어.
 *
 * TurnOutput 반영의 SSOT로, App.tsx의 로컬 상태를 대체합니다.
 *
 * @example
 * ```tsx
 * // 컴포넌트에서 상태 구독
 * const { economy, narrativeEntries } = useWorldStore();
 *
 * // TurnOutput 반영 (스트림 완료 시)
 * const applyTurnOutput = useWorldStore((state) => state.applyTurnOutput);
 * applyTurnOutput(turnOutput);
 *
 * // 시스템 피드백 추가 (드롭 실패 등)
 * const appendSystemNarrative = useWorldStore((state) => state.appendSystemNarrative);
 * appendSystemNarrative('아이템을 사용할 수 없습니다.');
 * ```
 */
export const useWorldStore = create<WorldStore>((set, get) => ({
  // 초기 상태
  ...createInitialState(),

  // 액션

  applyTurnOutput: (output) => {
    const state = get();

    // 1. 턴 카운트 증가
    const newTurnCount = state.turnCount + 1;

    // 2. 내러티브 추가
    const newNarrativeEntry: NarrativeEntry = {
      turn: newTurnCount,
      text: output.narrative,
    };

    // 3. 경제 상태 업데이트 (RULE-005: balance_after 반영)
    const newEconomy: EconomyState = {
      signal: output.economy.balance_after.signal,
      memory_shard: output.economy.balance_after.memory_shard,
    };

    // 4. Scene Objects 업데이트 (U-010: 핫스팟 오버레이)
    const newSceneObjects = output.ui.objects;

    // 5. 하위 스토어 업데이트 (순환 import 방지: worldStore → 하위 store 단방향)
    // Action Deck 카드 업데이트 (U-009)
    useActionDeckStore.getState().setCards(output.ui.action_deck.cards);

    // Inventory 업데이트 (U-011)
    if (output.world.inventory_added.length > 0) {
      useInventoryStore.getState().addItems(parseInventoryAdded(output.world.inventory_added));
    }
    if (output.world.inventory_removed.length > 0) {
      useInventoryStore.getState().removeItems(output.world.inventory_removed);
    }

    // 6. 상태 업데이트
    set({
      turnCount: newTurnCount,
      narrativeEntries: [...state.narrativeEntries, newNarrativeEntry],
      economy: newEconomy,
      sceneObjects: newSceneObjects,
    });

    // === 향후 확장 슬롯 (RU-003-Q4 Step 4) ===
    // TODO: output.world.rules_changed → RuleBoard 업데이트
    // TODO: output.world.quests_updated → Quest 패널 업데이트
    // TODO: output.world.memory_pins → Memory Pin 패널 업데이트
  },

  appendSystemNarrative: (text) => {
    set((state) => ({
      narrativeEntries: [
        ...state.narrativeEntries,
        {
          turn: state.turnCount, // 현재 턴으로 기록 (턴 증가 없음)
          text,
        },
      ],
    }));
  },

  setSceneState: (sceneState) => {
    set({ sceneState });
  },

  setConnected: (isConnected) => {
    set({ isConnected });
  },

  setEconomy: (economy) => {
    set({ economy });
  },

  setSceneObjects: (sceneObjects) => {
    set({ sceneObjects });
  },

  initialize: (welcomeMessage) => {
    set({
      ...createInitialState(),
      narrativeEntries: [{ turn: 0, text: welcomeMessage }],
    });
  },

  reset: () => {
    set(createInitialState());
  },
}));

// =============================================================================
// 셀렉터 (성능 최적화용)
// =============================================================================

/** 경제 상태 셀렉터 */
export const selectEconomy = (state: WorldStore) => state.economy;

/** Signal 잔액 셀렉터 */
export const selectSignal = (state: WorldStore) => state.economy.signal;

/** Memory Shard 잔액 셀렉터 */
export const selectMemoryShard = (state: WorldStore) => state.economy.memory_shard;

/** 연결 상태 셀렉터 */
export const selectIsConnected = (state: WorldStore) => state.isConnected;

/** Scene 상태 셀렉터 */
export const selectSceneState = (state: WorldStore) => state.sceneState;

/** Scene Objects 셀렉터 */
export const selectSceneObjects = (state: WorldStore) => state.sceneObjects;

/** 내러티브 엔트리 셀렉터 */
export const selectNarrativeEntries = (state: WorldStore) => state.narrativeEntries;

/** 턴 카운트 셀렉터 */
export const selectTurnCount = (state: WorldStore) => state.turnCount;
