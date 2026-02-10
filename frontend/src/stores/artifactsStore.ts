/**
 * Unknown World - Artifacts 상태 관리 (Zustand) (U-025[Mvp]).
 *
 * 엔딩 리포트 등 게임 아티팩트의 생성/표시 상태를 관리합니다.
 *
 * 설계 원칙:
 *   - RULE-003: 구조화 출력 (Zod로 리포트 검증)
 *   - RULE-006: 리포트 언어는 세션 언어와 동일
 *   - RULE-005: 경제 결산은 ledger 기반
 *
 * @module stores/artifactsStore
 */

import { create } from 'zustand';

// =============================================================================
// 타입 정의
// =============================================================================

/** 퀘스트 요약 */
export interface QuestSummary {
  label: string;
  is_completed: boolean;
  is_main: boolean;
  progress: number;
}

/** 퀘스트 달성도 */
export interface QuestAchievement {
  total: number;
  completed: number;
  completion_rate: number;
  quests: QuestSummary[];
}

/** 경제 결산 */
export interface EconomySettlement {
  initial_signal: number;
  final_signal: number;
  initial_memory_shard: number;
  final_memory_shard: number;
  total_spent_signal: number;
  total_earned_signal: number;
  transaction_count: number;
  balance_consistent: boolean;
}

/** 룰 타임라인 이벤트 */
export interface RuleTimelineEvent {
  turn: number;
  type: string;
  label: string;
  description: string;
}

/** 플레이 통계 */
export interface PlayStats {
  turn_count: number;
  items_collected: number;
  active_rules_count: number;
  profile_id: string;
}

/** 엔딩 리포트 */
export interface EndingReport {
  language: string;
  title: string;
  narrative_summary: string;
  quest_achievement: QuestAchievement;
  economy_settlement: EconomySettlement;
  rule_timeline: RuleTimelineEvent[];
  play_stats: PlayStats;
  generated_at: string;
}

/** Artifacts Store 상태 */
export interface ArtifactsStoreState {
  /** 엔딩 리포트 (생성 완료 시 값이 설정됨) */
  endingReport: EndingReport | null;
  /** 리포트 생성 중 여부 */
  isGenerating: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 리포트 모달 표시 여부 */
  isReportOpen: boolean;
}

/** Artifacts Store 액션 */
export interface ArtifactsStoreActions {
  /** 엔딩 리포트 생성 요청 */
  generateReport: (sessionData: SessionDataForReport) => Promise<void>;
  /** 리포트 모달 열기 */
  openReport: () => void;
  /** 리포트 모달 닫기 */
  closeReport: () => void;
  /** 상태 초기화 */
  reset: () => void;
}

export type ArtifactsStore = ArtifactsStoreState & ArtifactsStoreActions;

/** 리포트 생성을 위한 세션 데이터 */
export interface SessionDataForReport {
  language: string;
  profileId: string;
  turnCount: number;
  narrativeEntries: Array<{ text: string; type?: string; turn: number }>;
  quests: Array<{
    id: string;
    label: string;
    is_completed: boolean;
    is_main: boolean;
    progress: number;
    reward_signal: number;
  }>;
  economyLedger: Array<{
    reason: string;
    cost: { signal: number; memory_shard: number };
    balanceAfter: { signal: number; memory_shard: number };
    turnId: number;
  }>;
  balanceFinal: { signal: number; memory_shard: number };
  balanceInitial: { signal: number; memory_shard: number };
  activeRules: Array<{ id: string; label: string }>;
  mutationEvents: Array<{
    turn: number;
    ruleId: string;
    type: string;
    label: string;
    description?: string;
  }>;
  inventoryItems: Array<{ id: string; name: string; quantity: number }>;
}

// =============================================================================
// API 호출
// =============================================================================

/** 백엔드 API URL - 프록시 경유 시 상대 경로, 직접 연결 시 절대 경로 */
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function fetchEndingReport(sessionData: SessionDataForReport): Promise<EndingReport> {
  const body = {
    language: sessionData.language,
    profile_id: sessionData.profileId,
    turn_count: sessionData.turnCount,
    narrative_entries: sessionData.narrativeEntries.map((e) => ({
      text: e.text,
      type: e.type ?? 'narrative',
      turn: e.turn,
    })),
    quests: sessionData.quests.map((q) => ({
      id: q.id,
      label: q.label,
      is_completed: q.is_completed,
      is_main: q.is_main,
      progress: q.progress,
      reward_signal: q.reward_signal,
    })),
    economy_ledger: sessionData.economyLedger.map((e) => ({
      reason: e.reason,
      cost_signal: e.cost.signal,
      cost_memory_shard: e.cost.memory_shard,
      balance_signal: e.balanceAfter.signal,
      balance_memory_shard: e.balanceAfter.memory_shard,
      turn_id: e.turnId,
    })),
    balance_final: sessionData.balanceFinal,
    balance_initial: sessionData.balanceInitial,
    active_rules: sessionData.activeRules,
    mutation_events: sessionData.mutationEvents.map((e) => ({
      turn: e.turn,
      rule_id: e.ruleId,
      type: e.type,
      label: e.label,
      description: e.description ?? '',
    })),
    inventory_items: sessionData.inventoryItems,
  };

  const response = await fetch(`${BACKEND_URL}/api/ending-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate report: ${response.status}`);
  }

  return response.json() as Promise<EndingReport>;
}

// =============================================================================
// Zustand Store
// =============================================================================

function createInitialState(): ArtifactsStoreState {
  return {
    endingReport: null,
    isGenerating: false,
    error: null,
    isReportOpen: false,
  };
}

export const useArtifactsStore = create<ArtifactsStore>((set) => ({
  ...createInitialState(),

  generateReport: async (sessionData) => {
    set({ isGenerating: true, error: null });

    try {
      const report = await fetchEndingReport(sessionData);
      set({ endingReport: report, isGenerating: false, isReportOpen: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isGenerating: false });
    }
  },

  openReport: () => set({ isReportOpen: true }),

  closeReport: () => set({ isReportOpen: false }),

  reset: () => set(createInitialState()),
}));

// =============================================================================
// 셀렉터
// =============================================================================

export const selectEndingReport = (state: ArtifactsStore) => state.endingReport;
export const selectIsGenerating = (state: ArtifactsStore) => state.isGenerating;
export const selectIsReportOpen = (state: ArtifactsStore) => state.isReportOpen;
