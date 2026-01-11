/**
 * Scene Canvas 관련 타입 정의 (U-031: Placeholder Pack)
 */

/**
 * Scene Canvas 상태 타입
 * - default: 기본 상태 (장면 이미지 없음)
 * - loading: 데이터 로딩 중
 * - offline: 오프라인/연결 끊김
 * - blocked: 안전/정책 차단
 * - low_signal: 재화/신호 부족
 * - scene: 정상 장면 표시 (이미지 URL 포함)
 */
export type SceneCanvasStatus =
  | 'default'
  | 'loading'
  | 'offline'
  | 'blocked'
  | 'low_signal'
  | 'scene';

/**
 * Scene Canvas 상태 데이터 구조
 */
export interface SceneCanvasState {
  status: SceneCanvasStatus;
  imageUrl?: string;
  message?: string;
}

/**
 * 상태별 placeholder 정보 구조
 */
export interface PlaceholderInfo {
  imagePath: string;
  fallbackEmoji: string;
  labelKey: string;
}
