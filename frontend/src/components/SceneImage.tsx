/**
 * Unknown World - Scene Image 컴포넌트 (U-020: Lazy Render)
 *
 * RULE-004 준수: 실패 시에도 안전한 폴백 제공
 * RULE-008 준수: 텍스트 우선 + Lazy 이미지 정책
 *
 * @module components/SceneImage
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SceneCanvasStatus, PlaceholderInfo, ImageLoadingState } from '../types/scene';

// =============================================================================
// 상수 정의
// =============================================================================

export const SCENE_PLACEHOLDERS: Record<Exclude<SceneCanvasStatus, 'scene'>, PlaceholderInfo> = {
  default: {
    imagePath: '/ui/placeholders/scene-placeholder-default.png',
    fallbackEmoji: '📡',
    labelKey: 'scene.status.default',
  },
  loading: {
    imagePath: '/ui/placeholders/scene-loading.webp',
    fallbackEmoji: '⏳',
    labelKey: 'scene.status.loading',
  },
  offline: {
    imagePath: '/ui/placeholders/scene-offline.webp',
    fallbackEmoji: '🔌',
    labelKey: 'scene.status.offline',
  },
  blocked: {
    imagePath: '/ui/placeholders/scene-blocked.webp',
    fallbackEmoji: '🚫',
    labelKey: 'scene.status.blocked',
  },
  low_signal: {
    imagePath: '/ui/placeholders/scene-low-signal.webp',
    fallbackEmoji: '📉',
    labelKey: 'scene.status.low_signal',
  },
};

// =============================================================================
// 타입 정의
// =============================================================================

interface SceneImageProps {
  status: SceneCanvasStatus;
  imageUrl?: string;
  message?: string;
  className?: string;
}

// =============================================================================
// 컴포넌트 구현
// =============================================================================

/**
 * 장면 이미지 렌더링 컴포넌트
 *
 * - Lazy loading: 새 이미지를 프리로드하고 완료 시 교체합니다.
 * - Option A: 새 이미지 로딩 중에도 이전 이미지를 유지합니다.
 * - 폴백: 로드 실패 시 에러 배지를 표시하고 이전 이미지를 유지합니다.
 */
export function SceneImage({ status, imageUrl, message, className = '' }: SceneImageProps) {
  const { t } = useTranslation();

  // 내부 상태 관리
  const [imageError, setImageError] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);

  // 파생 상태: 로딩 중 여부
  // - 목표 URL(imageUrl)이 존재하고, 현재 표시 중인 이미지와 다르며, 에러가 아닌 경우
  const isImageLoading = useMemo(() => {
    return !!imageUrl && imageUrl !== displayImageUrl && !imageError;
  }, [imageUrl, displayImageUrl, imageError]);

  // 이미지 URL 변경 시 로딩 프로세스 시작
  useEffect(() => {
    // 1. URL이 없거나 이미 표시 중인 경우 초기화 및 종료
    if (!imageUrl || imageUrl === displayImageUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImageError(false);
      return;
    }

    // 2. 새 이미지 프리로드 시작

    setImageError(false);

    let isMounted = true;
    const img = new Image();
    const currentUrl = imageUrl;

    const handleLoad = () => {
      if (!isMounted) return;
      setDisplayImageUrl(currentUrl);
      setImageError(false);
    };

    const handleError = () => {
      if (!isMounted) return;
      setImageError(true);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    img.src = imageUrl;

    return () => {
      isMounted = false;
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [imageUrl, displayImageUrl]);

  // 이미지 로딩 상태 타입 파생 (CSS 클래스용)
  const imageLoadingState: ImageLoadingState = useMemo(() => {
    if (isImageLoading) return 'loading';
    if (imageError) return 'error';
    if (displayImageUrl) return 'loaded';
    return 'idle';
  }, [isImageLoading, imageError, displayImageUrl]);

  const hasDisplayImage = !!displayImageUrl;
  const isSceneActive = status === 'scene' && hasDisplayImage && !imageError;

  // placeholder 정보 결정
  const effectiveStatus = status === 'scene' && !hasDisplayImage ? 'default' : status;

  const isPlaceholderVisible = !hasDisplayImage;

  const placeholder = isPlaceholderVisible
    ? SCENE_PLACEHOLDERS[effectiveStatus as Exclude<SceneCanvasStatus, 'scene'>]
    : null;

  return (
    <div
      className={`scene-image-container ${isSceneActive ? 'scene-active' : `scene-status-${effectiveStatus}`} ${isImageLoading ? 'image-loading' : ''} ${className}`}
      style={placeholder ? { backgroundImage: `url('${placeholder.imagePath}')` } : {}}
    >
      {/* 장면 이미지 */}
      {hasDisplayImage && (
        <img
          src={displayImageUrl}
          alt={t('scene.status.alt')}
          className={`scene-image ${imageLoadingState === 'loaded' ? 'scene-image-loaded' : ''}`}
        />
      )}

      {/* 로딩 인디케이터 */}
      {isImageLoading && (
        <div className="scene-loading-indicator" aria-live="polite">
          <div className="scene-loading-spinner" aria-hidden="true" />
          <span className="scene-loading-text">{t('scene.status.image_loading')}</span>
        </div>
      )}

      {/* 이미지 에러 배지 */}
      {imageError && (
        <div className="scene-error-badge" role="alert">
          <span className="scene-error-icon" aria-hidden="true">
            ⚠️
          </span>
          <span className="scene-error-text">{t('scene.status.image_error')}</span>
        </div>
      )}

      {/* Placeholder 영역 */}
      {isPlaceholderVisible && placeholder && (
        <div className="scene-placeholder">
          <p className="text-glow scene-status-label">
            <span className="scene-status-emoji" aria-hidden="true">
              {placeholder.fallbackEmoji}
            </span>{' '}
            {t(placeholder.labelKey)}
          </p>
          {message && <p className="scene-status-message">{message}</p>}
        </div>
      )}
    </div>
  );
}
