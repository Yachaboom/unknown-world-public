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
import type { SceneCanvasState, SceneProcessingPhase } from '../types/scene';
import { useActionDeckStore } from './actionDeckStore';
import { useInventoryStore, parseInventoryAdded } from './inventoryStore';
import { useEconomyStore } from './economyStore';

// =============================================================================
// 타입 정의
// =============================================================================

/** 재화 상태 */
export interface EconomyState {
  signal: number;
  memory_shard: number;
}

/**
 * 내러티브 엔트리 타입
 *
 * U-070[Mvp]: 액션 로그 지원을 위해 type 필드 추가
 * - "narrative": 일반 게임 내러티브 (서버에서 생성)
 * - "action_log": 플레이어 행동 로그 (클라이언트에서 생성, 즉각적 피드백)
 * - "system": 시스템 메시지 (드롭 실패 등)
 */
export type NarrativeEntryType = 'narrative' | 'action_log' | 'system';

/** 내러티브 엔트리 */
export interface NarrativeEntry {
  turn: number;
  text: string;
  /** U-070: 엔트리 타입 (기본값: "narrative") */
  type?: NarrativeEntryType;
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

  /**
   * U-070[Mvp]: 액션 로그를 추가합니다.
   * 플레이어 행동에 대한 즉각적 피드백으로, TurnInput 전송 전에 호출합니다.
   * PRD 9.0: "행동 실행: ..." 형식으로 표시됩니다.
   */
  appendActionLog: (text: string) => void;

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

  // ============ U-066: Late-binding 이미지 관리 ============

  /**
   * 이미지 로딩 상태를 설정합니다 (U-066).
   * 이미지 생성 시작 시 호출하여 로딩 인디케이터를 표시합니다.
   *
   * @param turnId - 이미지를 요청한 턴 ID
   */
  setImageLoading: (turnId: number) => void;

  /**
   * Late-binding 이미지를 적용합니다 (U-066).
   * 이미지 생성 완료 시 호출하여, turnId가 일치할 때만 이미지를 반영합니다.
   *
   * @param imageUrl - 생성된 이미지 URL
   * @param turnId - 이미지를 요청한 턴 ID (가드용)
   * @returns 이미지가 적용되었는지 여부
   */
  applyLateBindingImage: (imageUrl: string, turnId: number) => boolean;

  /**
   * 이미지 로딩을 취소합니다 (U-066).
   * 새 턴 시작 또는 이미지 생성 실패 시 호출합니다.
   */
  cancelImageLoading: () => void;

  // ============ U-071: 처리 단계 UI 관리 ============

  /**
   * 처리 단계를 설정합니다 (U-071).
   * Scene Canvas에 현재 처리 상태를 표시하기 위해 사용합니다.
   *
   * @param phase - 현재 처리 단계 (idle, processing, image_pending, rendering)
   */
  setProcessingPhase: (phase: SceneProcessingPhase) => void;
}

export type WorldStore = WorldState & WorldActions;

// =============================================================================
// 초기 상태
// =============================================================================

/**
 * 초기 상태를 생성합니다.
 *
 * RU-004-Q5: 초기값 정책 SSOT
 *
 * ## 중요: 이 값들은 "플레이 전 placeholder"입니다.
 *
 * 실제 게임 시작 값은 항상 다음 중 하나에서 주입됩니다:
 * 1. 프로필 초기 SaveGame (startSessionFromProfile)
 * 2. 저장된 SaveGame 복원 (continueSession)
 *
 * profile_select 상태에서는 HUD가 노출되지 않으므로
 * 이 placeholder 값이 화면에 표시될 일은 없습니다.
 *
 * @see save/constants.ts#INITIAL_VALUE_POLICY
 * @see save/sessionLifecycle.ts
 */
function createInitialState(): WorldState {
  return {
    // RU-004-Q5: Placeholder - 실제 값은 프로필/세이브에서 주입됨
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

    // 2. 내러티브 추가 (U-070: type 명시)
    const newNarrativeEntry: NarrativeEntry = {
      turn: newTurnCount,
      text: output.narrative,
      type: 'narrative',
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
    const currentImageUrl = state.sceneState.imageUrl ?? state.sceneState.previousImageUrl;

    if (output.safety.blocked) {
      newSceneState = {
        status: 'blocked',
        message: output.safety.message ?? undefined,
        previousImageUrl: currentImageUrl,
      };
    } else if (output.ui.scene?.image_url || output.render?.image_url) {
      // U-053: render.image_url 또는 ui.scene.image_url 중 하나라도 있으면 scene 상태로 전환
      const imageUrl = output.ui.scene?.image_url || output.render?.image_url;
      newSceneState = {
        status: 'scene',
        imageUrl: imageUrl!,
        message: output.ui.scene?.alt_text ?? undefined,
        // 새로운 이미지가 왔으므로 이전 이미지는 보존 (로딩 중이 아님)
        previousImageUrl: currentImageUrl,
      };
    } else {
      newSceneState = {
        status: 'default',
        message: '',
        previousImageUrl: currentImageUrl,
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

    // Economy Store 업데이트 (U-014: Ledger 기록)
    // U-069: 서버에서 전달된 model_label 사용 (FAST/QUALITY 티어링)
    const economyStore = useEconomyStore.getState();
    economyStore.addLedgerEntry({
      turnId: newTurnCount,
      reason: output.narrative.slice(0, 50), // 내러티브 앞 50자를 사유로 사용
      cost: output.economy.cost,
      balanceAfter: output.economy.balance_after,
      modelLabel: output.agent_console.model_label ?? 'FAST',
    });
    // 잔액 부족 상태 업데이트
    economyStore.updateBalanceLowStatus(newEconomy);

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
          type: 'system',
        },
      ],
    }));
  },

  // U-070[Mvp]: 액션 로그 추가
  appendActionLog: (text) => {
    set((state) => ({
      narrativeEntries: [
        ...state.narrativeEntries,
        {
          turn: state.turnCount, // 현재 턴으로 기록 (턴 증가 없음)
          text,
          type: 'action_log',
        },
      ],
    }));
  },

  setSceneState: (sceneState) => {
    // U-071 버그 수정: processingPhase를 보존하며 병합
    set((state) => ({
      sceneState: {
        ...state.sceneState,
        ...sceneState,
      },
    }));
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
      narrativeEntries: [{ turn: 0, text: welcomeMessage, type: 'narrative' }],
    });
  },

  reset: () => {
    set(createInitialState());
  },

  // ============ U-066: Late-binding 이미지 관리 ============

  setImageLoading: (turnId) => {
    set((state) => ({
      sceneState: {
        ...state.sceneState,
        imageLoading: true,
        pendingImageTurnId: turnId,
        sceneRevision: turnId,
        // 이전 이미지 URL 보존 (Option A: 이전 이미지 유지)
        previousImageUrl: state.sceneState.imageUrl ?? state.sceneState.previousImageUrl,
      },
    }));
  },

  applyLateBindingImage: (imageUrl, turnId) => {
    const state = get();

    // late-binding 가드: pendingImageTurnId와 일치할 때만 적용
    if (state.sceneState.pendingImageTurnId !== turnId) {
      // 이미 새 턴이 시작되어 이전 요청은 무시
      return false;
    }

    set({
      sceneState: {
        status: 'scene',
        imageUrl,
        imageLoading: false,
        pendingImageTurnId: undefined,
        sceneRevision: turnId,
        // 이전 이미지 URL은 성공 시 현재 이미지로 대체
        previousImageUrl: undefined,
      },
    });

    return true;
  },

  cancelImageLoading: () => {
    set((state) => ({
      sceneState: {
        ...state.sceneState,
        imageLoading: false,
        pendingImageTurnId: undefined,
        // 이전 이미지 유지 (폴백)
        imageUrl: state.sceneState.previousImageUrl ?? state.sceneState.imageUrl,
        previousImageUrl: undefined,
      },
    }));
  },

  // ============ U-071: 처리 단계 UI 관리 ============

  setProcessingPhase: (phase) => {
    set((state) => ({
      sceneState: {
        ...state.sceneState,
        processingPhase: phase,
      },
    }));
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
