/**
 * Unknown World - Agent Console 상태 관리 (Zustand).
 *
 * 스트리밍 중 수신되는 단계/배지/내러티브/복구 정보를 저장하고,
 * AgentConsole 컴포넌트에서 구독할 수 있도록 합니다.
 *
 * 설계 원칙:
 *   - RULE-008: 단계/배지 가시화 (프롬프트/내부 추론 노출 금지)
 *   - RULE-003/004: 검증 후 상태 반영, 실패 시 폴백
 *
 * @module stores/agentStore
 */

import { create } from 'zustand';
import type { AgentPhase, ValidationBadge, TurnOutput } from '../schemas/turn';
import type {
  StageEvent,
  BadgesEvent,
  NarrativeDeltaEvent,
  FinalEvent,
  ErrorEvent,
} from '../api/turnStream';
import { StageStatus } from '../api/turnStream';

// =============================================================================
// 상태 타입 정의
// =============================================================================

/** 단계 상태 */
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/** 단계 정보 */
export interface PhaseInfo {
  name: AgentPhase;
  status: PhaseStatus;
}

/** 에러 정보 */
export interface AgentError {
  message: string;
  code?: string;
}

/** Agent Console 상태 */
export interface AgentState {
  /** 현재 스트리밍 중인지 */
  isStreaming: boolean;
  /** 현재 단계 */
  currentPhase: AgentPhase | null;
  /** 단계별 상태 */
  phases: PhaseInfo[];
  /** 검증 배지 목록 */
  badges: ValidationBadge[];
  /** 누적 내러티브 텍스트 (타자 효과용) */
  narrativeBuffer: string;
  /** 자동 복구 횟수 */
  repairCount: number;
  /** 최종 TurnOutput */
  finalOutput: TurnOutput | null;
  /** 에러 정보 */
  error: AgentError | null;
}

/** Agent Console 액션 */
export interface AgentActions {
  /** 스트림 시작 */
  startStream: () => void;
  /** 단계 이벤트 처리 */
  handleStage: (event: StageEvent) => void;
  /** 배지 이벤트 처리 */
  handleBadges: (event: BadgesEvent) => void;
  /** 내러티브 델타 이벤트 처리 */
  handleNarrativeDelta: (event: NarrativeDeltaEvent) => void;
  /** 최종 출력 이벤트 처리 */
  handleFinal: (event: FinalEvent) => void;
  /** 에러 이벤트 처리 */
  handleError: (event: ErrorEvent) => void;
  /** 스트림 완료 */
  completeStream: () => void;
  /** 상태 초기화 */
  reset: () => void;
}

export type AgentStore = AgentState & AgentActions;

// =============================================================================
// 초기 상태
// =============================================================================

/** 기본 단계 목록 (PRD 예시) */
const DEFAULT_PHASES: AgentPhase[] = [
  'parse',
  'validate',
  'plan',
  'resolve',
  'render',
  'verify',
  'commit',
];

/** 초기 상태 생성 */
function createInitialState(): AgentState {
  return {
    isStreaming: false,
    currentPhase: null,
    phases: DEFAULT_PHASES.map((name) => ({
      name,
      status: 'pending' as const,
    })),
    badges: [],
    narrativeBuffer: '',
    repairCount: 0,
    finalOutput: null,
    error: null,
  };
}

// =============================================================================
// Zustand Store
// =============================================================================

/**
 * Agent Console 상태 스토어.
 *
 * @example
 * ```tsx
 * // 컴포넌트에서 사용
 * const { isStreaming, phases, badges } = useAgentStore();
 * const startStream = useAgentStore((state) => state.startStream);
 * ```
 */
export const useAgentStore = create<AgentStore>((set) => ({
  // 초기 상태
  ...createInitialState(),

  // 액션
  startStream: () => {
    set({
      ...createInitialState(),
      isStreaming: true,
    });
  },

  handleStage: (event) => {
    set((state) => {
      const phaseName = event.name;
      const isStart = event.status === StageStatus.START;

      // 단계 상태 업데이트
      const phases = state.phases.map((phase) => {
        if (phase.name === phaseName) {
          return {
            ...phase,
            status: isStart ? ('in_progress' as const) : ('completed' as const),
          };
        }
        return phase;
      });

      return {
        phases,
        currentPhase: isStart ? phaseName : state.currentPhase,
      };
    });
  },

  handleBadges: (event) => {
    set({
      badges: event.badges,
    });
  },

  handleNarrativeDelta: (event) => {
    set((state) => ({
      narrativeBuffer: state.narrativeBuffer + event.text,
    }));
  },

  handleFinal: (event) => {
    set({
      finalOutput: event.data,
      repairCount: event.data.agent_console?.repair_count ?? 0,
    });
  },

  handleError: (event) => {
    set({
      error: {
        message: event.message,
        code: event.code,
      },
    });
  },

  completeStream: () => {
    set({
      isStreaming: false,
      narrativeBuffer: '', // 스트림 완료 시 버퍼 초기화
    });
  },

  reset: () => {
    set(createInitialState());
  },
}));

// =============================================================================
// 셀렉터 (성능 최적화용)
// =============================================================================

/** 스트리밍 상태 셀렉터 */
export const selectIsStreaming = (state: AgentStore) => state.isStreaming;

/** 현재 단계 셀렉터 */
export const selectCurrentPhase = (state: AgentStore) => state.currentPhase;

/** 단계 목록 셀렉터 */
export const selectPhases = (state: AgentStore) => state.phases;

/** 배지 목록 셀렉터 */
export const selectBadges = (state: AgentStore) => state.badges;

/** 내러티브 버퍼 셀렉터 */
export const selectNarrativeBuffer = (state: AgentStore) => state.narrativeBuffer;

/** 복구 횟수 셀렉터 */
export const selectRepairCount = (state: AgentStore) => state.repairCount;

/** 최종 출력 셀렉터 */
export const selectFinalOutput = (state: AgentStore) => state.finalOutput;

/** 에러 셀렉터 */
export const selectError = (state: AgentStore) => state.error;
