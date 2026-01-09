/**
 * Unknown World - Turn Stream 이벤트 계약(Contract).
 *
 * NDJSON 스트리밍에서 사용되는 이벤트 타입, 인터페이스를 정의합니다.
 * 이 모듈은 백엔드와 프론트엔드 간의 스트림 이벤트 계약 SSOT입니다.
 *
 * 설계 원칙:
 *   - RU-002-Q4: 이벤트 계약을 transport 계층으로 분리
 *   - RU-002-S2: 이벤트별 Zod 검증 + Unknown/확장 이벤트 폴백
 *   - RULE-003: 구조화 출력(JSON Schema) 우선 + 이중 검증
 *   - RULE-008: 단계/배지 가시화
 *
 * 참조:
 *   - vibe/unit-plans/U-007[Mvp].md
 *   - vibe/refactors/RU-002-Q4.md
 *   - vibe/refactors/RU-002-S2.md
 *
 * @module types/turn_stream
 */

import { z } from 'zod';
import {
  AgentPhaseSchema,
  ValidationBadgeSchema,
  type TurnOutput,
  type AgentPhase,
  type ValidationBadge,
} from '../schemas/turn';

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
  REPAIR: 'repair',
} as const;

export type StreamEventTypeName = (typeof StreamEventType)[keyof typeof StreamEventType];

/**
 * 단계 상태 상수.
 * RU-002-S2/RU-002-Q2: v1(complete) 및 v2(ok/fail) 별칭 모두 지원.
 */
export const StageStatus = {
  START: 'start',
  COMPLETE: 'complete',
  /** 단계 실패 */
  FAIL: 'fail',
} as const;

export type StageStatusName = (typeof StageStatus)[keyof typeof StageStatus];

// =============================================================================
// RU-002-S2: 이벤트별 Zod 스키마 (경량 검증 + 폴백)
// =============================================================================

/**
 * stage.status 스키마.
 * v1(complete) 및 v2(ok/fail) 별칭 모두 허용.
 */
export const StageStatusSchema = z.enum(['start', 'complete', 'ok', 'fail']);

/**
 * StageEvent Zod 스키마.
 * 단계 진행 이벤트 검증용.
 */
export const StageEventSchema = z.object({
  type: z.literal(StreamEventType.STAGE),
  name: AgentPhaseSchema,
  status: StageStatusSchema,
});

/**
 * RepairEvent Zod 스키마.
 * 자동 복구 시도 이벤트 검증용.
 */
export const RepairEventSchema = z.object({
  type: z.literal(StreamEventType.REPAIR),
  attempt: z.number(),
  message: z.string().optional(),
});

/**
 * BadgesEvent Zod 스키마 (v1: 배열).
 * v1은 badges: string[] 형식.
 */
export const BadgesEventSchemaV1 = z.object({
  type: z.literal(StreamEventType.BADGES),
  badges: z.array(ValidationBadgeSchema),
});

/**
 * BadgesEvent Zod 스키마 (v2: 객체/맵).
 * 향후 v2는 badges: { [key]: status } 형식을 지원할 수 있음.
 * 현재는 v1만 사용하므로 이 스키마는 확장성을 위해 정의.
 */
export const BadgesEventSchemaV2 = z.object({
  type: z.literal(StreamEventType.BADGES),
  badges: z.record(z.string(), z.boolean()),
});

/**
 * BadgesEvent 통합 스키마.
 * v1(배열) 또는 v2(객체) 모두 허용.
 */
export const BadgesEventSchema = z.union([BadgesEventSchemaV1, BadgesEventSchemaV2]);

/**
 * NarrativeDeltaEvent Zod 스키마.
 * 타자 효과용 내러티브 델타 이벤트 검증용.
 */
export const NarrativeDeltaEventSchema = z.object({
  type: z.literal(StreamEventType.NARRATIVE_DELTA),
  text: z.string(),
});

/**
 * FinalEvent 원시 스키마.
 * v1(data) 및 v2(turn_output) 별칭 모두 허용.
 * TurnOutput 자체 검증은 turnStream.ts에서 safeParseTurnOutput으로 수행.
 */
export const FinalEventRawSchema = z.object({
  type: z.literal(StreamEventType.FINAL),
  data: z.unknown(),
});

/**
 * ErrorEvent Zod 스키마.
 * 에러 이벤트 검증용.
 */
export const ErrorEventSchema = z.object({
  type: z.literal(StreamEventType.ERROR),
  message: z.string(),
  code: z.string().optional(),
});

/**
 * 이벤트 타입 추출용 최소 스키마.
 * Unknown 이벤트 판별에 사용.
 */
export const BaseEventSchema = z.object({
  type: z.string(),
});

// =============================================================================
// 이벤트 파싱 유틸리티 (RU-002-S2)
// =============================================================================

/** 이벤트 검증 결과 타입 */
export type EventParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * StageEvent를 안전하게 파싱합니다.
 */
export function safeParseStageEvent(
  data: unknown,
): EventParseResult<z.infer<typeof StageEventSchema>> {
  const result = StageEventSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

/**
 * RepairEvent를 안전하게 파싱합니다.
 */
export function safeParseRepairEvent(
  data: unknown,
): EventParseResult<z.infer<typeof RepairEventSchema>> {
  const result = RepairEventSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

/**
 * BadgesEvent를 안전하게 파싱합니다.
 * v1(배열) 형태로 정규화하여 반환합니다.
 */
export function safeParseBadgesEvent(data: unknown): EventParseResult<BadgesEvent> {
  const result = BadgesEventSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  // v2(객체) 형태인 경우 v1(배열)로 정규화
  const parsed = result.data;
  if (Array.isArray(parsed.badges)) {
    // v1 형태: 그대로 반환
    return {
      success: true,
      data: { type: StreamEventType.BADGES, badges: parsed.badges as ValidationBadge[] },
    };
  } else {
    // v2 형태: true인 키만 추출하여 배열로 변환
    const badgeArray = Object.entries(parsed.badges)
      .filter(([, value]) => value)
      .map(([key]) => key as ValidationBadge);
    return {
      success: true,
      data: { type: StreamEventType.BADGES, badges: badgeArray },
    };
  }
}

/**
 * NarrativeDeltaEvent를 안전하게 파싱합니다.
 */
export function safeParseNarrativeDeltaEvent(
  data: unknown,
): EventParseResult<z.infer<typeof NarrativeDeltaEventSchema>> {
  const result = NarrativeDeltaEventSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

/**
 * FinalEvent 원시 형태를 안전하게 파싱합니다.
 * TurnOutput 자체 검증은 별도로 수행해야 합니다.
 */
export function safeParseFinalEventRaw(
  data: unknown,
): EventParseResult<z.infer<typeof FinalEventRawSchema>> {
  const result = FinalEventRawSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

/**
 * ErrorEvent를 안전하게 파싱합니다.
 */
export function safeParseErrorEvent(
  data: unknown,
): EventParseResult<z.infer<typeof ErrorEventSchema>> {
  const result = ErrorEventSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

/**
 * stage.status 정규화 헬퍼.
 * 'ok'를 'complete'로, 'fail'은 그대로 유지.
 */
export function normalizeStageStatus(status: string): 'start' | 'complete' | 'fail' {
  if (status === 'ok') return 'complete';
  if (status === 'fail') return 'fail';
  if (status === 'start') return 'start';
  return 'complete';
}

// =============================================================================
// 스트림 이벤트 인터페이스
// =============================================================================

/**
 * 단계 진행 이벤트.
 * RU-002-S2: status에 'fail' 추가하여 단계 실패 표현 지원.
 */
export interface StageEvent {
  type: typeof StreamEventType.STAGE;
  name: AgentPhase;
  /** 'start' | 'complete' | 'ok' | 'fail'. ok는 complete로 정규화됨. */
  status: StageStatusName;
}

/** 자동 복구(Repair) 이벤트 */
export interface RepairEvent {
  type: typeof StreamEventType.REPAIR;
  attempt: number;
  message?: string;
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

/** 최종 TurnOutput 이벤트
 *
 * RU-002-Q2: v1은 `data`, v2는 `turn_output` 사용.
 * 하위호환을 위해 두 필드 모두 선언하되, 정규화된 인터페이스는 `data`를 사용.
 */
export interface FinalEvent {
  type: typeof StreamEventType.FINAL;
  /** v1 현행 계약: TurnOutput 페이로드 */
  data: TurnOutput;
}

/** FinalEvent 원시 수신 형태 */
export interface FinalEventRaw {
  type: typeof StreamEventType.FINAL;
  /** TurnOutput 페이로드 */
  data: TurnOutput;
}

/** 에러 이벤트 */
export interface ErrorEvent {
  type: typeof StreamEventType.ERROR;
  message: string;
  code?: string;
}

/** 스트림 이벤트 유니온 타입 */
export type StreamEvent =
  | StageEvent
  | RepairEvent
  | BadgesEvent
  | NarrativeDeltaEvent
  | FinalEvent
  | ErrorEvent;

// =============================================================================
// 스트림 콜백 인터페이스
// =============================================================================

/** 스트림 이벤트 콜백 */
export interface StreamCallbacks {
  /** 단계 진행 이벤트 */
  onStage?: (event: StageEvent) => void;
  /** 자동 복구 이벤트 */
  onRepair?: (event: RepairEvent) => void;
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
