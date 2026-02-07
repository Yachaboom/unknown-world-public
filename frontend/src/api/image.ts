/**
 * Unknown World - 이미지 생성 API 클라이언트 (U-066)
 *
 * 이미지 생성을 턴과 분리하여 비동기적으로 호출합니다.
 * 텍스트 턴의 TTFB를 블로킹하지 않습니다 (RULE-008).
 *
 * 설계 원칙:
 *   - RULE-004: 실패 시 안전한 폴백 (텍스트-only 진행)
 *   - RULE-007: 프롬프트 원문 노출 금지 (로그에 해시만 기록)
 *   - RULE-008: 텍스트 우선 + Lazy 이미지 원칙
 *
 * @module api/image
 */

import type { Language } from '../schemas/turn';

// =============================================================================
// 상수 정의
// =============================================================================

/** API 베이스 URL */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8011';

/** 이미지 생성 API 엔드포인트 */
const IMAGE_GENERATE_ENDPOINT = `${API_BASE_URL}/api/image/generate`;

// =============================================================================
// 타입 정의
// =============================================================================

/** 이미지 생성 상태 */
export type ImageGenerationStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'skipped';

/** 모델 티어링 라벨 (U-066) */
export type ImageModelLabel = 'FAST' | 'QUALITY';

/** 이미지 생성 요청 파라미터 */
export interface ImageGenerationRequest {
  /** 이미지 생성 프롬프트 (필수) */
  prompt: string;
  /** 언어 (에러 메시지용) */
  language?: Language;
  /** 가로세로 비율 (U-085: UI 레이아웃 기반 자동 선택, 예: "16:9") */
  aspectRatio?: string;
  /** 이미지 크기 - SDK 값 (U-085 Q2: "1K" | "2K" | "4K") */
  imageSize?: string;
  /** 참조 이미지 ID 목록 */
  referenceImageIds?: string[];
  /** 참조 이미지 URL (U-068: 이전 턴 이미지를 참조하여 연속성 유지) */
  referenceImageUrl?: string;
  /** 세션 ID */
  sessionId?: string;
  /** 실패 시 건너뛰기 (기본값: true) */
  skipOnFailure?: boolean;
  /** 모델 티어링 라벨 (U-066: FAST/QUALITY) */
  modelLabel?: ImageModelLabel;
  /** 턴 ID (late-binding 가드용, U-066) */
  turnId?: number;
}

/** 이미지 생성 응답 */
export interface ImageGenerationResponse {
  /** 성공 여부 */
  success: boolean;
  /** 생성 상태 */
  status: ImageGenerationStatus;
  /** 생성된 이미지 ID */
  imageId?: string;
  /** 생성된 이미지 URL */
  imageUrl?: string;
  /** 상태 메시지 */
  message?: string;
  /** 생성 소요 시간 (ms) */
  generationTimeMs: number;
  /** 사용된 모델 라벨 (U-066) */
  modelLabel: ImageModelLabel;
  /** 요청 턴 ID (U-066, late-binding 가드용) */
  turnId?: number;
}

/** 이미지 생성 옵션 */
export interface GenerateImageOptions {
  /** AbortSignal (요청 취소용) */
  signal?: AbortSignal;
  /** 타임아웃 (ms, 기본값: 60000) */
  timeout?: number;
}

// =============================================================================
// API 클라이언트 함수
// =============================================================================

/**
 * 이미지를 생성합니다.
 *
 * 턴과 분리된 비동기 호출로, 텍스트 스트리밍을 블로킹하지 않습니다.
 * AbortController로 요청을 취소할 수 있습니다.
 *
 * @param request - 이미지 생성 요청 파라미터
 * @param options - 생성 옵션 (signal, timeout)
 * @returns 이미지 생성 응답
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * const response = await generateImage(
 *   { prompt: 'A dark fantasy scene...', turnId: 5, modelLabel: 'FAST' },
 *   { signal: controller.signal }
 * );
 * if (response.success) {
 *   console.log('Image URL:', response.imageUrl);
 * }
 * // 취소 시: controller.abort();
 * ```
 */
export async function generateImage(
  request: ImageGenerationRequest,
  options: GenerateImageOptions = {},
): Promise<ImageGenerationResponse> {
  const { signal, timeout = 60000 } = options;

  // 타임아웃 AbortController (signal이 없을 때 사용)
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  // 외부 signal과 타임아웃 signal 중 먼저 abort되는 것을 사용
  const combinedSignal = signal ?? timeoutController.signal;

  try {
    const response = await fetch(IMAGE_GENERATE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        language: request.language ?? 'ko-KR',
        // U-085: aspect_ratio는 UI 레이아웃 기반 선택값 사용 (기본 16:9)
        aspect_ratio: request.aspectRatio ?? '16:9',
        // U-085 Q2: image_size는 SDK 값 (1K/2K/4K) 사용
        image_size: request.imageSize ?? '1K',
        reference_image_ids: request.referenceImageIds ?? [],
        reference_image_url: request.referenceImageUrl ?? null,
        session_id: request.sessionId ?? null,
        skip_on_failure: request.skipOnFailure ?? true,
        model_label: request.modelLabel ?? 'QUALITY',
        turn_id: request.turnId ?? null,
      }),
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // HTTP 에러 응답 처리
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        status: 'failed',
        message: `HTTP ${response.status}: ${errorText}`,
        generationTimeMs: 0,
        modelLabel: request.modelLabel ?? 'QUALITY',
        turnId: request.turnId,
      };
    }

    const data = await response.json();

    // snake_case → camelCase 변환
    return {
      success: data.success,
      status: data.status,
      imageId: data.image_id,
      imageUrl: data.image_url,
      message: data.message,
      generationTimeMs: data.generation_time_ms ?? 0,
      modelLabel: data.model_label ?? request.modelLabel ?? 'QUALITY',
      turnId: data.turn_id ?? request.turnId,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // AbortError 처리 (취소됨)
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        status: 'skipped',
        message: '이미지 생성이 취소되었습니다.',
        generationTimeMs: 0,
        modelLabel: request.modelLabel ?? 'QUALITY',
        turnId: request.turnId,
      };
    }

    // 기타 네트워크 에러
    return {
      success: false,
      status: 'failed',
      message: error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.',
      generationTimeMs: 0,
      modelLabel: request.modelLabel ?? 'QUALITY',
      turnId: request.turnId,
    };
  }
}

/**
 * 이미지 생성 요청을 생성하고 AbortController를 반환합니다.
 *
 * 턴 완료 후 이미지 생성을 시작하고, 새 턴 시작 시 취소할 수 있습니다.
 *
 * @param request - 이미지 생성 요청 파라미터
 * @param onComplete - 완료 콜백
 * @param onError - 에러 콜백
 * @returns AbortController (취소용)
 *
 * @example
 * ```ts
 * const controller = startImageGeneration(
 *   { prompt: 'A dark fantasy scene...', turnId: 5 },
 *   (response) => {
 *     if (response.success) {
 *       worldStore.setSceneImage(response.imageUrl, response.turnId);
 *     }
 *   },
 *   (error) => console.error('Image generation failed:', error)
 * );
 *
 * // 새 턴 시작 시 이전 요청 취소
 * controller.abort();
 * ```
 */
export function startImageGeneration(
  request: ImageGenerationRequest,
  onComplete: (response: ImageGenerationResponse) => void,
  onError?: (error: Error) => void,
): AbortController {
  const controller = new AbortController();

  generateImage(request, { signal: controller.signal })
    .then(onComplete)
    .catch((error) => {
      if (error instanceof Error && error.name !== 'AbortError') {
        onError?.(error);
      }
    });

  return controller;
}
