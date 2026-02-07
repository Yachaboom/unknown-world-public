/**
 * Unknown World - Scene Canvas 크기 → (aspect_ratio, image_size) 선택 유틸
 *
 * U-085[Mvp]: 이미지 크기를 현재 UI 레이아웃(Scene Canvas)에 최대한 맞춤으로 생성
 *
 * 설계 원칙:
 *   - RULE-009: 좌표 규약(0~1000) 무관 (비율만 제어)
 *   - RULE-010: 지원 비율/크기는 SDK SSOT에 고정
 *   - 페어링 Q1: UI 레이아웃 우선 (image_job.aspect_ratio보다 우선)
 *   - 페어링 Q2: image_size는 SDK 값 (1K/2K/4K) 사용
 *
 * 참조:
 *   - vibe/ref/image-generate-guide.md: "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
 *   - image_size: "1K" | "2K" | "4K" (대문자 K 필수)
 *
 * @module utils/imageSizing
 */

// =============================================================================
// 타입 정의
// =============================================================================

/** SDK가 지원하는 aspect_ratio 문자열 */
export type SupportedAspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9';

/** SDK가 지원하는 image_size 값 */
export type SupportedImageSize = '1K' | '2K' | '4K';

/** 이미지 사이징 결과 */
export interface ImageSizingResult {
  /** 선택된 가로세로 비율 */
  aspectRatio: SupportedAspectRatio;
  /** 선택된 이미지 크기 (SDK 값) */
  imageSize: SupportedImageSize;
  /** 디버그/로그용 라벨 (예: "IMAGE 16:9@1K") */
  label: string;
}

// =============================================================================
// 상수 정의
// =============================================================================

/**
 * 지원하는 aspect_ratio 후보와 실수 비율값 매핑.
 * SDK 공식 지원 비율: "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
 *
 * 게임 UI에서는 가로 레이아웃이 일반적이므로 16:9를 우선 후보로 배치.
 */
const ASPECT_RATIO_MAP: ReadonlyArray<{
  ratio: SupportedAspectRatio;
  value: number;
}> = [
  { ratio: '21:9', value: 21 / 9 }, // 2.333
  { ratio: '16:9', value: 16 / 9 }, // 1.778
  { ratio: '3:2', value: 3 / 2 }, // 1.500
  { ratio: '4:3', value: 4 / 3 }, // 1.333
  { ratio: '5:4', value: 5 / 4 }, // 1.250
  { ratio: '1:1', value: 1 / 1 }, // 1.000
  { ratio: '4:5', value: 4 / 5 }, // 0.800
  { ratio: '3:4', value: 3 / 4 }, // 0.750
  { ratio: '2:3', value: 2 / 3 }, // 0.667
  { ratio: '9:16', value: 9 / 16 }, // 0.563
];

/**
 * 기본 이미지 사이징 결과.
 * 측정 실패/비정상 값 시 안전한 폴백.
 */
const DEFAULT_SIZING: ImageSizingResult = {
  aspectRatio: '16:9',
  imageSize: '1K',
  label: 'IMAGE 16:9@1K',
};

/**
 * 유효한 Scene Canvas 크기 최소값 (px).
 * 이보다 작으면 측정 실패로 간주하고 기본값 사용.
 */
const MIN_VALID_DIMENSION = 50;

// =============================================================================
// 핵심 함수
// =============================================================================

/**
 * Scene Canvas 표시 크기(px)를 기반으로 최적의 aspect_ratio와 image_size를 선택합니다.
 *
 * - 지원 후보 중 "가장 가까운 비율"을 선택합니다.
 * - image_size는 MVP에서 '1K'로 고정합니다 (비용 효율, 데모 체감 충분).
 * - 측정 실패(0 또는 비정상 값) 시 기본값(16:9 + 1K)으로 폴백합니다.
 *
 * @param width - Scene Canvas 너비 (px)
 * @param height - Scene Canvas 높이 (px)
 * @returns 선택된 aspect_ratio, image_size, 로그 라벨
 *
 * @example
 * ```ts
 * const result = selectImageSizing(800, 450);
 * // { aspectRatio: '16:9', imageSize: '1K', label: 'IMAGE 16:9@1K' }
 *
 * const result2 = selectImageSizing(600, 800);
 * // { aspectRatio: '3:4', imageSize: '1K', label: 'IMAGE 3:4@1K' }
 * ```
 */
export function selectImageSizing(width: number, height: number): ImageSizingResult {
  // 유효성 검사: 비정상 값이면 기본값 폴백
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < MIN_VALID_DIMENSION ||
    height < MIN_VALID_DIMENSION
  ) {
    return DEFAULT_SIZING;
  }

  // 목표 비율 계산
  const targetRatio = width / height;

  // 가장 가까운 비율 찾기 (절대 차이 최소화)
  let bestMatch = ASPECT_RATIO_MAP[0];
  let bestDiff = Math.abs(targetRatio - bestMatch.value);

  for (let i = 1; i < ASPECT_RATIO_MAP.length; i++) {
    const diff = Math.abs(targetRatio - ASPECT_RATIO_MAP[i].value);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMatch = ASPECT_RATIO_MAP[i];
    }
  }

  // MVP에서는 1K 고정 (비용 효율 + 데모 체감 충분)
  // MMP에서 해상도 자동 선택 도입 가능
  const imageSize: SupportedImageSize = '1K';

  return {
    aspectRatio: bestMatch.ratio,
    imageSize,
    label: `IMAGE ${bestMatch.ratio}@${imageSize}`,
  };
}

/**
 * 기본 이미지 사이징 결과를 반환합니다.
 * Scene Canvas 크기를 아직 측정하지 못한 경우 사용합니다.
 */
export function getDefaultImageSizing(): ImageSizingResult {
  return { ...DEFAULT_SIZING };
}
