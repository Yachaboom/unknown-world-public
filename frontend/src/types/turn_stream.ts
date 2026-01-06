/**
 * Unknown World - Turn Stream 이벤트 계약(Contract).
 *
 * NDJSON 스트리밍에서 사용되는 이벤트 타입, 인터페이스를 정의합니다.
 * 이 모듈은 백엔드와 프론트엔드 간의 스트림 이벤트 계약 SSOT입니다.
 *
 * 설계 원칙:
 *   - RU-002-Q4: 이벤트 계약을 transport 계층으로 분리
 *   - RULE-003: 구조화 출력(JSON Schema) 우선 + 이중 검증
 *   - RULE-008: 단계/배지 가시화
 *
 * 참조:
 *   - vibe/unit-plans/U-007[Mvp].md
 *   - vibe/refactors/RU-002-Q4.md
 *
 * @module types/turn_stream
 */

import type { TurnOutput, AgentPhase, ValidationBadge } from '../schemas/turn';

// =============================================================================
// 스트림 이벤트 타입 상수 (서버 계약과 일치)
// =============================================================================

/** 스트림 이벤트 타입 상수 */
export const StreamEventType = {
  STAGE: 'stage',
  BADGES: 'badges',
  NARRATIVE_DELTA: 'narrative_delta',
  FINAL: 'final',
  ERROR: 'error',
} as const;

export type StreamEventTypeName = (typeof StreamEventType)[keyof typeof StreamEventType];

/** 단계 상태 상수 */
export const StageStatus = {
  START: 'start',
  COMPLETE: 'complete',
} as const;

export type StageStatusName = (typeof StageStatus)[keyof typeof StageStatus];

// =============================================================================
// 스트림 이벤트 인터페이스
// =============================================================================

/** 단계 진행 이벤트 */
export interface StageEvent {
  type: typeof StreamEventType.STAGE;
  name: AgentPhase;
  status: StageStatusName;
}

/** 배지 이벤트 */
export interface BadgesEvent {
  type: typeof StreamEventType.BADGES;
  badges: ValidationBadge[];
}

/** 내러티브 델타 이벤트 (타자 효과용) */
export interface NarrativeDeltaEvent {
  type: typeof StreamEventType.NARRATIVE_DELTA;
  text: string;
}

/** 최종 TurnOutput 이벤트 */
export interface FinalEvent {
  type: typeof StreamEventType.FINAL;
  data: TurnOutput;
}

/** 에러 이벤트 */
export interface ErrorEvent {
  type: typeof StreamEventType.ERROR;
  message: string;
  code?: string;
}

/** 스트림 이벤트 유니온 타입 */
export type StreamEvent = StageEvent | BadgesEvent | NarrativeDeltaEvent | FinalEvent | ErrorEvent;

// =============================================================================
// 스트림 콜백 인터페이스
// =============================================================================

/** 스트림 이벤트 콜백 */
export interface StreamCallbacks {
  /** 단계 진행 이벤트 */
  onStage?: (event: StageEvent) => void;
  /** 배지 이벤트 */
  onBadges?: (event: BadgesEvent) => void;
  /** 내러티브 델타 이벤트 */
  onNarrativeDelta?: (event: NarrativeDeltaEvent) => void;
  /** 최종 TurnOutput 이벤트 */
  onFinal?: (event: FinalEvent) => void;
  /** 에러 이벤트 */
  onError?: (event: ErrorEvent) => void;
  /** 스트림 완료 */
  onComplete?: () => void;
}
