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
import type { CanvasSize } from '../utils/box2d';
import { useActionDeckStore } from './actionDeckStore';
import { useInventoryStore, parseInventoryAdded } from './inventoryStore';
import { useEconomyStore } from './economyStore';
import { ITEM_SELL_PRICE_SIGNAL } from '../save/constants';
import i18n from '../i18n';

// =============================================================================
// 타입 정의
// =============================================================================

/** 재화 상태 */
export interface EconomyState {
  signal: number;
  memory_shard: number;
  /** 사용 중인 크레딧 (빚, Signal 단위, U-079) */
  credit: number;
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

/**
 * U-079: 재화 획득 토스트 알림 데이터.
 * 아이템 판매, 퀘스트 보상 등 재화 변동 시 팝업 표시.
 */
export interface CurrencyToast {
  /** 토스트 고유 ID (중복 방지) */
  id: string;
  /** 변동된 Signal 양 (양수: 획득, 음수: 소비) */
  signalDelta: number;
  /** 변동 사유 표시 텍스트 */
  reason: string;
  /** 생성 시간 (자동 닫힘 계산용) */
  createdAt: number;
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

  // ============ U-085: Scene Canvas 표시 크기 (SSOT) ============

  /**
   * Scene Canvas의 실제 렌더링 크기(px) (U-085).
   * ResizeObserver로 측정된 값이 디바운스(100ms) + 5px 이상 변화 시 갱신됩니다.
   * 이미지 생성 요청 시 aspect_ratio/image_size 선택의 SSOT로 사용됩니다.
   */
  sceneCanvasSize: CanvasSize;

  // ============ U-089: 정밀분석 상태 ============

  /**
   * 정밀분석(Agentic Vision) 실행 중 여부 (U-089).
   * true일 때 SceneImage는 기존 이미지를 유지하고 분석 전용 오버레이를 표시합니다.
   */
  isAnalyzing: boolean;

  // ============ U-079: 재화 획득 토스트 알림 ============

  /**
   * 현재 표시 중인 토스트 알림 (U-079).
   * null이면 토스트 없음, 값이 있으면 일정 시간 후 자동 사라짐.
   */
  currencyToast: CurrencyToast | null;

  // ============ U-133: 첫 턴 씬 설명 맥락 ============

  /**
   * 프로필의 초기 씬 설명 텍스트 (U-133).
   * 세션 언어에 맞게 해석된 텍스트를 저장합니다.
   * 첫 턴(turnCount===0) 요청 시 TurnInput.scene_context로 전달됩니다.
   * 첫 턴 전송 후 null로 초기화됩니다.
   */
  initialSceneDescription: string | null;
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

  // ============ U-085: Scene Canvas 크기 SSOT ============

  /**
   * Scene Canvas 표시 크기를 설정합니다 (U-085).
   * SceneCanvas 컴포넌트의 ResizeObserver에서 호출합니다.
   *
   * @param size - Scene Canvas 크기 (width, height px)
   */
  setSceneCanvasSize: (size: CanvasSize) => void;

  // ============ U-071: 처리 단계 UI 관리 ============

  /**
   * 처리 단계를 설정합니다 (U-071).
   * Scene Canvas에 현재 처리 상태를 표시하기 위해 사용합니다.
   *
   * @param phase - 현재 처리 단계 (idle, processing, image_pending, rendering)
   */
  setProcessingPhase: (phase: SceneProcessingPhase) => void;

  // ============ U-089: 정밀분석 상태 관리 ============

  /**
   * 정밀분석(Agentic Vision) 실행 상태를 설정합니다 (U-089).
   * true로 설정하면 SceneImage가 기존 이미지를 유지하면서 분석 전용 오버레이를 표시합니다.
   *
   * @param analyzing - 분석 실행 중 여부
   */
  setIsAnalyzing: (analyzing: boolean) => void;

  // ============ U-079: 아이템 판매 + 토스트 ============

  /**
   * 아이템을 판매하여 Signal을 획득합니다 (U-079).
   * 인벤토리에서 수량 1 감소, economy에 판매 가격 추가, Ledger 기록.
   *
   * @param itemId - 판매할 아이템 ID
   * @param itemName - 아이템 이름 (토스트 표시용)
   */
  sellItem: (itemId: string, itemName: string) => void;

  /**
   * 재화 획득 토스트를 표시합니다 (U-079).
   * 일정 시간 후 자동으로 사라집니다.
   */
  showCurrencyToast: (toast: Omit<CurrencyToast, 'id' | 'createdAt'>) => void;

  /**
   * 토스트를 닫습니다 (U-079).
   */
  dismissCurrencyToast: () => void;
}

export type WorldStore = WorldState & WorldActions;

// =============================================================================
// 초기 상태
// =============================================================================

/**
 * 초기 상태를 생성합니다.
 *
 * ## 중요: 이 값들은 "플레이 전 placeholder"입니다.
 *
 * 실제 게임 시작 값은 startSessionFromProfile()에서 프로필 데이터로 주입됩니다.
 * profile_select 상태에서는 HUD가 노출되지 않으므로
 * 이 placeholder 값이 화면에 표시될 일은 없습니다.
 *
 * @see save/sessionLifecycle.ts
 */
function createInitialState(): WorldState {
  return {
    // RU-004-Q5: Placeholder - 실제 값은 프로필/세이브에서 주입됨
    economy: { signal: 100, memory_shard: 5, credit: 0 },
    isConnected: true,
    sceneState: {
      status: 'default',
      message: '',
      imageUrl: undefined,
      previousImageUrl: undefined,
      processingPhase: 'idle',
      imageLoading: false,
      pendingImageTurnId: undefined,
    },
    sceneObjects: [],
    narrativeEntries: [],
    turnCount: 0,
    // U-013: Quest + Rule Board 초기 상태
    quests: [],
    activeRules: [],
    mutationTimeline: [],
    // U-085: Scene Canvas 크기 (초기값 0x0, 측정 후 갱신)
    sceneCanvasSize: { width: 0, height: 0 },
    // U-089: 정밀분석 상태
    isAnalyzing: false,
    // U-079: 재화 획득 토스트
    currencyToast: null,
    // U-133: 첫 턴 씬 설명 맥락
    initialSceneDescription: null,
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

    const newNarrativeEntries = [...state.narrativeEntries, newNarrativeEntry];

    // U-072: Scanner 힌트 유도 (Option A: 백엔드 플래그 기반)
    if (output.hints?.scanner) {
      newNarrativeEntries.push({
        turn: newTurnCount,
        text: i18n.t('scanner.hint_narrative'),
        type: 'system',
      });
    }

    // 3. 경제 상태 업데이트 (RULE-005: balance_after 반영)
    const newEconomy: EconomyState = {
      signal: output.economy.balance_after.signal,
      memory_shard: output.economy.balance_after.memory_shard,
      credit: output.economy.credit,
    };

    // 4. Scene Objects 업데이트 (U-010: 핫스팟 오버레이)
    // U-090: 핫스팟 상태 관리 정책
    //   - 새 이미지 생성(장면 전환) → 핫스팟 전체 초기화 (Q1: Option A)
    //   - 서버에서 objects 비어있음(일반 턴) → 기존 핫스팟 유지
    //   - 서버에서 objects 있음(정밀분석 턴) → 기존 핫스팟에 병합
    //
    // 장면 전환 감지:
    //   - render.image_url이 존재 → 이번 턴에서 새 이미지가 생성됨 (동기 생성 완료)
    //   - render.image_job.should_generate === true → 비동기(late-binding) 이미지 생성 예정
    //   어느 경우든 새 장면이므로 기존 핫스팟을 초기화한다.
    const isNewImageGeneration =
      !!output.render?.image_url || output.render?.image_job?.should_generate === true;

    let newSceneObjects: SceneObject[];

    if (isNewImageGeneration) {
      // Q1 Option A: 장면 전환(새 이미지 생성) → 핫스팟 전체 초기화
      // 새 장면에서는 정밀분석을 다시 해야 함
      newSceneObjects = [];
    } else if (output.ui.objects.length > 0) {
      // 정밀분석 결과 있음 → 기존 핫스팟에 병합
      // 동일 ID는 새 결과로 업데이트, 새 ID는 추가
      const mergedMap = new Map(state.sceneObjects.map((o) => [o.id, o]));
      for (const obj of output.ui.objects) {
        mergedMap.set(obj.id, obj);
      }
      newSceneObjects = Array.from(mergedMap.values());
    } else {
      // 일반 턴(objects 비어있음) → 기존 핫스팟 유지
      newSceneObjects = state.sceneObjects;
    }

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
    // U-096: 아이템 소비 시 fade-out 애니메이션 후 제거
    if (output.world.inventory_removed.length > 0) {
      const removedIds = output.world.inventory_removed;
      const invStore = useInventoryStore.getState();

      // 1단계: 소비 애니메이션 시작 (fade-out CSS 클래스 적용)
      invStore.markConsuming(removedIds);

      // 2단계: 애니메이션 완료 후 실제 제거 (500ms = CSS transition 시간)
      setTimeout(() => {
        useInventoryStore.getState().clearConsuming(removedIds);
      }, 500);
    }

    // Economy Store 업데이트 (U-014: Ledger 기록)
    // U-069: 서버에서 전달된 model_label 사용 (FAST/QUALITY 티어링)
    const economyStore = useEconomyStore.getState();
    economyStore.addLedgerEntry({
      turnId: newTurnCount,
      reason: 'economy.ledger_reason.turn_cost', // U-099: i18n 키 기반 사유 (언어 혼합 방지)
      cost: output.economy.cost,
      balanceAfter: output.economy.balance_after,
      modelLabel: output.agent_console.model_label ?? 'FAST',
      lowBalanceWarning: output.economy.low_balance_warning,
    });
    // 잔액 부족 상태 업데이트
    economyStore.updateBalanceLowStatus(newEconomy);

    // 6. Quest 상태 업데이트 (U-013, U-078: 목표 시스템 강화)
    // quests_updated는 전체 퀘스트 목록이 아닌 "업데이트된" 퀘스트만 포함
    // 기존 퀘스트를 업데이트하거나 새 퀘스트를 추가
    // U-078: 서브 목표 완료 시 보상 알림 시스템 내러티브 추가
    const newQuests = [...state.quests];
    for (const updatedQuest of output.world.quests_updated) {
      const existingIndex = newQuests.findIndex((q) => q.id === updatedQuest.id);
      if (existingIndex >= 0) {
        // U-078: 미완료 → 완료 전환 감지 (보상 피드백용)
        const prevQuest = newQuests[existingIndex];
        if (
          !prevQuest.is_completed &&
          updatedQuest.is_completed &&
          updatedQuest.reward_signal > 0
        ) {
          newNarrativeEntries.push({
            turn: newTurnCount,
            text: `🎯 ${i18n.t('quest.objective_complete')} ${i18n.t('quest.reward_earned', { signal: updatedQuest.reward_signal })}`,
            type: 'system',
          });
        }
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
    // U-133: 첫 턴 성공 시 씬 설명 맥락 클리어
    set({
      turnCount: newTurnCount,
      narrativeEntries: newNarrativeEntries,
      economy: newEconomy,
      sceneObjects: newSceneObjects,
      sceneState: newSceneState,
      // U-013 확장
      quests: newQuests,
      activeRules: newActiveRules,
      mutationTimeline: updatedTimeline,
      initialSceneDescription: state.turnCount === 0 ? null : state.initialSceneDescription,
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

  // ============ U-085: Scene Canvas 크기 SSOT ============

  setSceneCanvasSize: (size) => {
    set({ sceneCanvasSize: size });
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

  // ============ U-089: 정밀분석 상태 관리 ============

  setIsAnalyzing: (analyzing) => {
    set({ isAnalyzing: analyzing });
  },

  // ============ U-079: 아이템 판매 + 토스트 ============

  sellItem: (itemId, itemName) => {
    const state = get();

    // 1. 인벤토리에서 아이템 수량 감소 (1개 제거)
    const invStore = useInventoryStore.getState();
    const item = invStore.items.find((i) => i.id === itemId);
    if (!item) return; // 아이템 없으면 무시

    // fade-out 애니메이션 후 제거
    invStore.markConsuming([itemId]);
    setTimeout(() => {
      useInventoryStore.getState().clearConsuming([itemId]);
    }, 500);

    // 2. Signal 추가 (RULE-005: 잔액 음수 금지이므로 추가만)
    const sellPrice = ITEM_SELL_PRICE_SIGNAL;
    const newEconomy: EconomyState = {
      signal: state.economy.signal + sellPrice,
      memory_shard: state.economy.memory_shard,
      credit: state.economy.credit,
    };

    // 3. 내러티브에 판매 기록 추가
    const sellText = i18n.t('inventory.sell_narrative', {
      item: itemName,
      signal: sellPrice,
    });

    set({
      economy: newEconomy,
      narrativeEntries: [
        ...state.narrativeEntries,
        {
          turn: state.turnCount,
          text: sellText,
          type: 'system' as const,
        },
      ],
    });

    // 4. Economy Store에 Ledger 기록
    const economyStore = useEconomyStore.getState();
    economyStore.addLedgerEntry({
      turnId: state.turnCount,
      reason: `inventory.sell_ledger_reason|${itemName}`, // U-099: 키|파라미터 형식
      cost: { signal: -sellPrice, memory_shard: 0 }, // 음수 cost = 수입
      balanceAfter: newEconomy,
      modelLabel: 'FAST',
    });
    economyStore.updateBalanceLowStatus(newEconomy);

    // 5. 토스트 알림
    get().showCurrencyToast({
      signalDelta: sellPrice,
      reason: i18n.t('inventory.sell_toast', { item: itemName }),
    });
  },

  showCurrencyToast: (toastData) => {
    const toast: CurrencyToast = {
      ...toastData,
      id: `toast-${Date.now()}`,
      createdAt: Date.now(),
    };
    set({ currencyToast: toast });

    // 3초 후 자동 닫힘
    setTimeout(() => {
      const current = useWorldStore.getState().currencyToast;
      if (current?.id === toast.id) {
        useWorldStore.getState().dismissCurrencyToast();
      }
    }, 3000);
  },

  dismissCurrencyToast: () => {
    set({ currencyToast: null });
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

// ============ U-078: 목표 시스템 셀렉터 ============

/** 주 목표(Main Objective) 셀렉터 - is_main=true인 첫 번째 퀘스트 */
export const selectMainObjective = (state: WorldStore) =>
  state.quests.find((q) => q.is_main) ?? null;

/** 서브 목표(Sub-objectives) 셀렉터 - is_main=false인 퀘스트 */
export const selectSubObjectives = (state: WorldStore) => state.quests.filter((q) => !q.is_main);

// ============ U-085: Scene Canvas 크기 셀렉터 ============

/** Scene Canvas 크기 셀렉터 */
export const selectSceneCanvasSize = (state: WorldStore) => state.sceneCanvasSize;

// ============ U-089: 정밀분석 셀렉터 ============

/** 정밀분석 실행 중 여부 셀렉터 */
export const selectIsAnalyzing = (state: WorldStore) => state.isAnalyzing;

/** U-079: 재화 획득 토스트 셀렉터 */
export const selectCurrencyToast = (state: WorldStore) => state.currencyToast;

// =============================================================================
// DEV: 디버그용 글로벌 노출 (프로덕션에서 제거됨)
// =============================================================================

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__worldStore = useWorldStore;
}
