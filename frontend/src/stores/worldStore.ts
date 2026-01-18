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
 * 확장 (U-013):
 *   - Quest/Rules/MutationEvent 상태 추가
 *   - applyTurnOutput에서 quests_updated, rules_changed 반영
 *
 * 순환 import 방지:
 *   - worldStore → (actionDeckStore/inventoryStore) 단방향만 허용
 *   - 역방향 import 금지
 *
 * @module stores/worldStore
 */

import { create } from 'zustand';
import type { TurnOutput, SceneObject, Quest, WorldRule } from '../schemas/turn';
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

/**
 * 룰 변형 이벤트 (U-013: Mutation Timeline)
 * 규칙이 변경된 시점과 내용을 기록합니다.
 */
export interface MutationEvent {
  /** 변형 발생 턴 */
  turn: number;
  /** 변형된 규칙 ID */
  ruleId: string;
  /** 변형 유형: 추가/수정/제거 */
  type: 'added' | 'modified' | 'removed';
  /** 규칙 라벨 (표시용) */
  label: string;
  /** 규칙 설명 (선택) */
  description?: string;
  /** 타임스탬프 */
  timestamp: number;
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

  // ============ U-013: Quest + Rule Board 확장 ============

  /** 현재 퀘스트/목표 목록 */
  quests: Quest[];
  /** 현재 적용 중인 규칙 목록 */
  activeRules: WorldRule[];
  /** 룰 변형 이벤트 타임라인 (최신순) */
  mutationTimeline: MutationEvent[];
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
    // U-013: Quest + Rule Board 초기 상태
    quests: [],
    activeRules: [],
    mutationTimeline: [],
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

    // 5. Scene 상태 전이 (RU-003-T1: Scene 이미지 SSOT)
    // - output.ui.scene.image_url이 존재하면 'scene' 상태로 전환
    // - 없으면 'default' 상태 유지
    // - safety.blocked인 경우 'blocked' 상태로 전환
    let newSceneState: SceneCanvasState;
    if (output.safety.blocked) {
      newSceneState = {
        status: 'blocked',
        message: output.safety.message ?? undefined,
      };
    } else if (output.ui.scene?.image_url) {
      newSceneState = {
        status: 'scene',
        imageUrl: output.ui.scene.image_url,
        message: output.ui.scene.alt_text ?? undefined,
      };
    } else {
      newSceneState = {
        status: 'default',
        message: '',
      };
    }

    // 7. 하위 스토어 업데이트 (순환 import 방지: worldStore → 하위 store 단방향)
    // Action Deck 카드 업데이트 (U-009)
    useActionDeckStore.getState().setCards(output.ui.action_deck.cards);

    // Inventory 업데이트 (U-011)
    if (output.world.inventory_added.length > 0) {
      useInventoryStore.getState().addItems(parseInventoryAdded(output.world.inventory_added));
    }
    if (output.world.inventory_removed.length > 0) {
      useInventoryStore.getState().removeItems(output.world.inventory_removed);
    }

    // 6. Quest 상태 업데이트 (U-013)
    // quests_updated는 전체 퀘스트 목록이 아닌 "업데이트된" 퀘스트만 포함
    // 기존 퀘스트를 업데이트하거나 새 퀘스트를 추가
    const newQuests = [...state.quests];
    for (const updatedQuest of output.world.quests_updated) {
      const existingIndex = newQuests.findIndex((q) => q.id === updatedQuest.id);
      if (existingIndex >= 0) {
        // 기존 퀘스트 업데이트
        newQuests[existingIndex] = updatedQuest;
      } else {
        // 새 퀘스트 추가
        newQuests.push(updatedQuest);
      }
    }

    // 7. Rules 상태 업데이트 + Mutation Timeline 기록 (U-013)
    const newActiveRules = [...state.activeRules];
    const newMutationEvents: MutationEvent[] = [];
    const now = Date.now();

    for (const changedRule of output.world.rules_changed) {
      const existingIndex = newActiveRules.findIndex((r) => r.id === changedRule.id);
      if (existingIndex >= 0) {
        // 기존 규칙 수정
        newActiveRules[existingIndex] = changedRule;
        newMutationEvents.push({
          turn: newTurnCount,
          ruleId: changedRule.id,
          type: 'modified',
          label: changedRule.label,
          description: changedRule.description ?? undefined,
          timestamp: now,
        });
      } else {
        // 새 규칙 추가
        newActiveRules.push(changedRule);
        newMutationEvents.push({
          turn: newTurnCount,
          ruleId: changedRule.id,
          type: 'added',
          label: changedRule.label,
          description: changedRule.description ?? undefined,
          timestamp: now,
        });
      }
    }

    // 타임라인에 새 이벤트 추가 (최신순 정렬)
    const updatedTimeline = [...newMutationEvents, ...state.mutationTimeline];

    // 8. 상태 업데이트 (RU-003-T1: sceneState 포함, U-013: quest/rules)
    set({
      turnCount: newTurnCount,
      narrativeEntries: [...state.narrativeEntries, newNarrativeEntry],
      economy: newEconomy,
      sceneObjects: newSceneObjects,
      sceneState: newSceneState,
      // U-013 확장
      quests: newQuests,
      activeRules: newActiveRules,
      mutationTimeline: updatedTimeline,
    });

    // === 향후 확장 슬롯 (RU-003-Q4 Step 4) ===
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

// ============ U-013: Quest + Rule Board 셀렉터 ============

/** 퀘스트 목록 셀렉터 */
export const selectQuests = (state: WorldStore) => state.quests;

/** 활성 규칙 목록 셀렉터 */
export const selectActiveRules = (state: WorldStore) => state.activeRules;

/** 뮤테이션 타임라인 셀렉터 */
export const selectMutationTimeline = (state: WorldStore) => state.mutationTimeline;

/** 진행 중인 퀘스트 셀렉터 */
export const selectActiveQuests = (state: WorldStore) =>
  state.quests.filter((q) => !q.is_completed);

/** 완료된 퀘스트 셀렉터 */
export const selectCompletedQuests = (state: WorldStore) =>
  state.quests.filter((q) => q.is_completed);
