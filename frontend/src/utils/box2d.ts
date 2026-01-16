/**
 * Unknown World - Box2D 좌표 변환 유틸리티
 *
 * RULE-009 준수: 좌표 규약 (0~1000 정규화, bbox=[ymin,xmin,ymax,xmax])
 * - 서버/세이브에는 항상 box_2d(0~1000)를 유지
 * - 렌더에서만 viewport 크기(canvasW/H)에 맞춰 px로 변환
 *
 * @module utils/box2d
 */

import type { Box2D } from '../schemas/turn';

// =============================================================================
// 상수 정의
// =============================================================================

/**
 * 정규화 좌표계 최댓값 (0~1000).
 * RULE-009: 좌표 규약
 */
export const NORMALIZED_MAX = 1000;

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 픽셀 단위 바운딩 박스.
 * 렌더링용으로만 사용됩니다.
 */
export interface Box2DPixel {
  /** Y 최소값 (상단, 픽셀) */
  top: number;
  /** X 최소값 (좌측, 픽셀) */
  left: number;
  /** 너비 (픽셀) */
  width: number;
  /** 높이 (픽셀) */
  height: number;
}

/**
 * 캔버스 크기 정보.
 */
export interface CanvasSize {
  /** 캔버스 너비 (픽셀) */
  width: number;
  /** 캔버스 높이 (픽셀) */
  height: number;
}

// =============================================================================
// 변환 함수
// =============================================================================

/**
 * 정규화 좌표(0~1000)를 픽셀 좌표로 변환합니다.
 *
 * RULE-009: bbox 순서는 [ymin, xmin, ymax, xmax]
 *
 * @param box - 정규화 좌표 바운딩 박스
 * @param canvas - 캔버스 크기
 * @returns 픽셀 단위 바운딩 박스
 *
 * @example
 * ```ts
 * const normalized: Box2D = { ymin: 100, xmin: 200, ymax: 500, xmax: 800 };
 * const canvas = { width: 800, height: 600 };
 * const pixel = box2dToPixel(normalized, canvas);
 * // pixel = { top: 60, left: 160, width: 480, height: 240 }
 * ```
 */
export function box2dToPixel(box: Box2D, canvas: CanvasSize): Box2DPixel {
  const scaleX = canvas.width / NORMALIZED_MAX;
  const scaleY = canvas.height / NORMALIZED_MAX;

  const top = box.ymin * scaleY;
  const left = box.xmin * scaleX;
  const bottom = box.ymax * scaleY;
  const right = box.xmax * scaleX;

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * 픽셀 좌표를 정규화 좌표(0~1000)로 변환합니다.
 *
 * 역변환이 필요한 경우 사용합니다 (예: 클릭 위치 → 정규화 좌표).
 *
 * @param pixel - 픽셀 단위 바운딩 박스
 * @param canvas - 캔버스 크기
 * @returns 정규화 좌표 바운딩 박스
 */
export function pixelToBox2d(pixel: Box2DPixel, canvas: CanvasSize): Box2D {
  const scaleX = NORMALIZED_MAX / canvas.width;
  const scaleY = NORMALIZED_MAX / canvas.height;

  const ymin = Math.round(pixel.top * scaleY);
  const xmin = Math.round(pixel.left * scaleX);
  const ymax = Math.round((pixel.top + pixel.height) * scaleY);
  const xmax = Math.round((pixel.left + pixel.width) * scaleX);

  // RULE-009: 0~1000 범위 보장
  return {
    ymin: Math.max(0, Math.min(NORMALIZED_MAX, ymin)),
    xmin: Math.max(0, Math.min(NORMALIZED_MAX, xmin)),
    ymax: Math.max(0, Math.min(NORMALIZED_MAX, ymax)),
    xmax: Math.max(0, Math.min(NORMALIZED_MAX, xmax)),
  };
}

/**
 * Box2D가 유효한지 검증합니다.
 *
 * @param box - 검증할 바운딩 박스
 * @returns 유효 여부
 */
export function isValidBox2D(box: Box2D): boolean {
  // 0~1000 범위 체크
  if (
    box.ymin < 0 ||
    box.ymin > NORMALIZED_MAX ||
    box.xmin < 0 ||
    box.xmin > NORMALIZED_MAX ||
    box.ymax < 0 ||
    box.ymax > NORMALIZED_MAX ||
    box.xmax < 0 ||
    box.xmax > NORMALIZED_MAX
  ) {
    return false;
  }

  // ymin < ymax, xmin < xmax 체크
  if (box.ymin >= box.ymax || box.xmin >= box.xmax) {
    return false;
  }

  return true;
}

/**
 * Box2D의 면적을 계산합니다 (정규화 좌표 기준).
 *
 * @param box - 바운딩 박스
 * @returns 면적 (0~1000000)
 */
export function box2dArea(box: Box2D): number {
  return (box.ymax - box.ymin) * (box.xmax - box.xmin);
}

/**
 * Box2D의 중심점을 계산합니다 (정규화 좌표 기준).
 *
 * @param box - 바운딩 박스
 * @returns 중심점 좌표 {x, y}
 */
export function box2dCenter(box: Box2D): { x: number; y: number } {
  return {
    x: (box.xmin + box.xmax) / 2,
    y: (box.ymin + box.ymax) / 2,
  };
}
