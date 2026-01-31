/**
 * Unknown World - Scanner(이미지 이해) API 클라이언트.
 *
 * U-022[Mvp]: Scanner 슬롯 UI에서 이미지 업로드 시 백엔드 `/api/scan` 호출.
 * U-021 의존: 백엔드 Scanner 엔드포인트와 연동.
 *
 * 설계 원칙:
 *   - RULE-004: 실패 시 안전한 폴백 (에러 메시지 반환)
 *   - RULE-007: 파일 내용/프롬프트 로깅 금지
 *   - RULE-009: bbox는 0~1000 정규화 + [ymin, xmin, ymax, xmax]
 *
 * @module api/scanner
 */

import { z } from 'zod';
import { Box2DSchema, type Language } from '../schemas/turn';

// =============================================================================
// 상수
// =============================================================================

/** Scanner API 엔드포인트 기본 URL */
const SCANNER_API_BASE = '/api/scan';

/** 지원하는 이미지 MIME 타입 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

/** 최대 파일 크기 (20MB) */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// =============================================================================
// Zod 스키마 정의 (백엔드 응답과 1:1 대응)
// =============================================================================

/**
 * 스캔 상태 Enum.
 */
export const ScanStatusSchema = z.enum(['completed', 'partial', 'failed', 'blocked']);
export type ScanStatus = z.infer<typeof ScanStatusSchema>;

/**
 * 감지된 오브젝트.
 * RULE-009: bbox는 0~1000 정규화.
 */
export const DetectedObjectSchema = z.object({
  label: z.string(),
  box_2d: Box2DSchema,
  confidence: z.number().min(0).max(1).nullable().optional(),
  suggested_item_type: z.string().nullable().optional(),
});
export type DetectedObject = z.infer<typeof DetectedObjectSchema>;

/**
 * 아이템 후보.
 * 스캔 결과로 생성되는 게임 아이템 후보.
 */
export const ItemCandidateSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().default(''),
  item_type: z.string().default('material'),
  source_object_index: z.number().int().min(0).nullable().optional(),
});
export type ItemCandidate = z.infer<typeof ItemCandidateSchema>;

/**
 * Scanner API 응답.
 * RU-006-S1: original_image_key, original_image_url 추가
 */
export const ScannerResponseSchema = z.object({
  success: z.boolean(),
  status: ScanStatusSchema,
  caption: z.string().default(''),
  objects: z.array(DetectedObjectSchema).default([]),
  item_candidates: z.array(ItemCandidateSchema).default([]),
  message: z.string().nullable().optional(),
  analysis_time_ms: z.number().int().min(0).default(0),
  language: z.enum(['ko-KR', 'en-US']),
  original_image_key: z.string().nullable().optional(),
  original_image_url: z.string().nullable().optional(),
});
export type ScannerResponse = z.infer<typeof ScannerResponseSchema>;

// =============================================================================
// API 클라이언트 함수
// =============================================================================

/**
 * 스캔 결과 타입.
 */
export type ScanResult =
  | { success: true; data: ScannerResponse }
  | { success: false; error: string; status: ScanStatus };

/**
 * 스캔 옵션.
 * RU-006-S1: preserve_original 옵션 추가
 */
export interface ScanOptions {
  /** 원본 이미지 저장 여부 (디버깅/재분석용) */
  preserveOriginal?: boolean;
  /** 세션 ID (이미지 그룹화용) */
  sessionId?: string;
}

/**
 * 이미지를 스캔하여 오브젝트와 아이템 후보를 추출합니다.
 *
 * @param file - 분석할 이미지 파일
 * @param language - 응답 언어
 * @param options - 스캔 옵션 (RU-006-S1)
 * @returns 스캔 결과
 */
export async function scanImage(
  file: File,
  language: Language,
  options?: ScanOptions,
): Promise<ScanResult> {
  // 클라이언트 측 파일 검증
  const validationError = validateFile(file);
  if (validationError) {
    return {
      success: false,
      error: validationError,
      status: 'failed',
    };
  }

  // FormData 생성
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', language);

  // RU-006-S1: 선택적 파라미터 추가
  if (options?.preserveOriginal) {
    formData.append('preserve_original', 'true');
  }
  if (options?.sessionId) {
    formData.append('session_id', options.sessionId);
  }

  try {
    const response = await fetch(SCANNER_API_BASE, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('[ScannerAPI] HTTP error', {
        status: response.status,
        statusText: response.statusText,
      });
      return {
        success: false,
        error:
          language === 'ko-KR'
            ? `서버 오류: ${response.status}`
            : `Server error: ${response.status}`,
        status: 'failed',
      };
    }

    const json = await response.json();
    const parseResult = ScannerResponseSchema.safeParse(json);

    if (!parseResult.success) {
      console.error('[ScannerAPI] Response validation failed', parseResult.error);
      return {
        success: false,
        error:
          language === 'ko-KR'
            ? '응답 데이터 형식이 올바르지 않습니다.'
            : 'Invalid response data format.',
        status: 'failed',
      };
    }

    const data = parseResult.data;

    // 성공/부분 성공 여부 확인
    if (data.status === 'completed' || data.status === 'partial') {
      return { success: true, data };
    }

    // 실패/차단 응답
    return {
      success: false,
      error: data.message ?? (language === 'ko-KR' ? '분석 실패' : 'Analysis failed'),
      status: data.status,
    };
  } catch (error) {
    console.error('[ScannerAPI] Network error', { errorType: (error as Error).name });
    return {
      success: false,
      error:
        language === 'ko-KR'
          ? '네트워크 오류가 발생했습니다. 다시 시도해 주세요.'
          : 'Network error occurred. Please try again.',
      status: 'failed',
    };
  }
}

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 파일 유효성 검사.
 *
 * @param file - 검증할 파일
 * @returns 오류 메시지 (없으면 null)
 */
export function validateFile(file: File): string | null {
  // MIME 타입 검증
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return `지원하지 않는 파일 형식입니다: ${file.type || '알 수 없음'}`;
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return `파일이 너무 큽니다: ${sizeMB}MB (최대 20MB)`;
  }

  return null;
}

/**
 * 지원 파일 형식인지 확인.
 *
 * @param file - 확인할 파일
 * @returns 지원 여부
 */
export function isSupportedImageFile(file: File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number]);
}

/**
 * ItemCandidate를 InventoryItem으로 변환합니다.
 *
 * @param candidate - 아이템 후보
 * @returns InventoryItem 형태의 객체
 */
export function candidateToInventoryItem(candidate: ItemCandidate) {
  return {
    id: candidate.id,
    name: candidate.label,
    description: candidate.description,
    icon: getItemTypeEmoji(candidate.item_type),
    quantity: 1,
  };
}

/**
 * 아이템 유형에 따른 이모지 반환.
 *
 * @param itemType - 아이템 유형
 * @returns 이모지
 */
function getItemTypeEmoji(itemType: string): string {
  const emojiMap: Record<string, string> = {
    key: '🔑',
    weapon: '⚔️',
    tool: '🔧',
    clue: '🔍',
    material: '📦',
    consumable: '💊',
    document: '📄',
    artifact: '💎',
  };
  return emojiMap[itemType] ?? '📦';
}
