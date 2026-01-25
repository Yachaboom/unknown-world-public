/**
 * Scene Canvas 관련 타입 정의 (U-031: Placeholder Pack, U-020: Lazy Render)
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
 * 이미지 로딩 상태 (U-020: Lazy Render)
 * - idle: 이미지 없음/대기
 * - loading: 이미지 로딩 중
 * - loaded: 이미지 로드 완료
 * - error: 이미지 로드 실패
 */
export type ImageLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Scene Canvas 상태 데이터 구조
 *
 * U-020[Mvp] 확장:
 * - imageLoading: 이미지 로딩 상태 플래그 (로딩 인디케이터 표시용)
 * - previousImageUrl: 이전 이미지 URL (Option A: 이전 이미지 유지)
 */
export interface SceneCanvasState {
  status: SceneCanvasStatus;
  imageUrl?: string;
  message?: string;
  /** U-020: 이미지 로딩 중 여부 (로딩 인디케이터 표시용) */
  imageLoading?: boolean;
  /** U-020: 이전 이미지 URL (새 이미지 로딩 중 표시용) */
  previousImageUrl?: string;
}

/**
 * 상태별 placeholder 정보 구조
 */
export interface PlaceholderInfo {
  imagePath: string;
  fallbackEmoji: string;
  labelKey: string;
}
