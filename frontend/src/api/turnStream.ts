/**
 * Unknown World - HTTP Streaming 클라이언트 + NDJSON 파서.
 *
 * fetch 기반으로 POST 요청을 보내고 응답 스트림을 NDJSON으로 파싱합니다.
 * 중간 청크 파싱 실패가 전체 UI를 멈추지 않도록 설계되었습니다.
 *
 * 설계 원칙:
 *   - RULE-003: 구조화 출력(JSON Schema) 우선 + 이중 검증
 *   - RULE-004: 검증 실패 시 안전 폴백 제공
 *   - RULE-008: 단계/배지 가시화 (프롬프트/내부 추론 노출 금지)
 *   - RULE-011: 백엔드 포트 8011 사용
 *
 * @module api/turnStream
 */

import type { TurnInput, Language } from '../schemas/turn';
import { safeParseTurnOutput } from '../schemas/turn';
import type {
  StageEvent,
  BadgesEvent,
  NarrativeDeltaEvent,
  ErrorEvent,
  StreamCallbacks,
} from '../types/turn_stream';
import { StreamEventType } from '../types/turn_stream';

// Re-export 스트림 이벤트 타입들 (하위 호환성 유지)
export type {
  StreamEventTypeName,
  StageStatusName,
  StageEvent,
  BadgesEvent,
  NarrativeDeltaEvent,
  FinalEvent,
  ErrorEvent,
  StreamEvent,
  StreamCallbacks,
} from '../types/turn_stream';
export { StreamEventType, StageStatus } from '../types/turn_stream';

// =============================================================================
// NDJSON 파서 (Q1 결정: Option A - 직접 구현)
// =============================================================================

/**
 * NDJSON 라인 파서.
 * 부분 청크를 버퍼링하고 완전한 라인을 파싱합니다.
 */
export class NDJSONParser {
  private buffer = '';

  /**
   * 청크를 파싱하고 완전한 JSON 객체들을 반환합니다.
   *
   * @param chunk - 수신된 텍스트 청크
   * @returns 파싱된 JSON 객체 배열
   */
  parse(chunk: string): unknown[] {
    this.buffer += chunk;
    const results: unknown[] = [];

    // 줄바꿈으로 분할
    const lines = this.buffer.split('\n');

    // 마지막 라인은 불완전할 수 있으므로 버퍼에 유지
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;

      try {
        const parsed = JSON.parse(trimmed);
        results.push(parsed);
      } catch {
        // 파싱 실패 시 해당 라인 무시 (RULE-004: 전체 중단 방지)
        console.warn('[NDJSON] Failed to parse line:', trimmed);
      }
    }

    return results;
  }

  /**
   * 버퍼를 초기화합니다.
   */
  reset(): void {
    this.buffer = '';
  }

  /**
   * 남은 버퍼를 플러시하고 마지막 객체를 파싱합니다.
   */
  flush(): unknown | null {
    const trimmed = this.buffer.trim();
    this.buffer = '';

    if (trimmed === '') return null;

    try {
      return JSON.parse(trimmed);
    } catch {
      console.warn('[NDJSON] Failed to parse remaining buffer:', trimmed);
      return null;
    }
  }
}

// =============================================================================
// 스트림 이벤트 핸들러
// =============================================================================

/**
 * 파싱된 이벤트를 타입별로 분배합니다.
 *
 * @param event - 파싱된 이벤트 객체
 * @param callbacks - 콜백 함수들
 * @param language - 폴백 언어
 */
function dispatchEvent(event: unknown, callbacks: StreamCallbacks, language: Language): void {
  if (!event || typeof event !== 'object') return;

  const e = event as Record<string, unknown>;
  const type = e.type;

  switch (type) {
    case StreamEventType.STAGE:
      callbacks.onStage?.(event as StageEvent);
      break;

    case StreamEventType.BADGES:
      callbacks.onBadges?.(event as BadgesEvent);
      break;

    case StreamEventType.NARRATIVE_DELTA:
      callbacks.onNarrativeDelta?.(event as NarrativeDeltaEvent);
      break;

    case StreamEventType.FINAL: {
      // RULE-003/004: Zod strict parse + 폴백
      const finalEvent = event as { type: string; data: unknown };
      const parseResult = safeParseTurnOutput(finalEvent.data, language);

      if (parseResult.success) {
        callbacks.onFinal?.({
          type: StreamEventType.FINAL,
          data: parseResult.data,
        });
      } else {
        console.warn('[TurnStream] TurnOutput validation failed:', parseResult.error);
        callbacks.onFinal?.({
          type: StreamEventType.FINAL,
          data: parseResult.fallback,
        });
      }
      break;
    }

    case StreamEventType.ERROR:
      callbacks.onError?.(event as ErrorEvent);
      break;

    default:
      console.warn('[TurnStream] Unknown event type:', type);
  }
}

// =============================================================================
// API 설정
// =============================================================================

/** 백엔드 API URL (RULE-011: 포트 8011) */
const API_BASE_URL = 'http://localhost:8011';

/** 턴 스트림 API 엔드포인트 */
const TURN_ENDPOINT = `${API_BASE_URL}/api/turn`;

// =============================================================================
// 스트림 클라이언트
// =============================================================================

/** 스트림 요청 옵션 */
export interface TurnStreamOptions {
  /** 요청 타임아웃 (ms) */
  timeout?: number;
  /** AbortSignal */
  signal?: AbortSignal;
}

/**
 * 턴 스트림 요청을 실행합니다.
 *
 * @param input - 턴 입력 데이터
 * @param callbacks - 이벤트 콜백
 * @param options - 요청 옵션
 * @returns 취소 함수
 */
export async function executeTurnStream(
  input: TurnInput,
  callbacks: StreamCallbacks,
  options?: TurnStreamOptions,
): Promise<void> {
  const parser = new NDJSONParser();
  const controller = new AbortController();
  const signal = options?.signal ?? controller.signal;

  try {
    const response = await fetch(TURN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
      },
      body: JSON.stringify(input),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    // 스트림 읽기 루프
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const events = parser.parse(chunk);

      for (const event of events) {
        dispatchEvent(event, callbacks, input.language);
      }
    }

    // 남은 버퍼 플러시
    const remaining = parser.flush();
    if (remaining) {
      dispatchEvent(remaining, callbacks, input.language);
    }

    callbacks.onComplete?.();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // 사용자가 취소한 경우
      return;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    callbacks.onError?.({
      type: StreamEventType.ERROR,
      message: errorMessage,
      code: 'STREAM_ERROR',
    });
  }
}

/**
 * 턴 스트림을 시작하고 취소 함수를 반환합니다.
 *
 * @param input - 턴 입력 데이터
 * @param callbacks - 이벤트 콜백
 * @returns 취소 함수
 */
export function startTurnStream(input: TurnInput, callbacks: StreamCallbacks): () => void {
  const controller = new AbortController();

  executeTurnStream(input, callbacks, { signal: controller.signal });

  return () => controller.abort();
}
