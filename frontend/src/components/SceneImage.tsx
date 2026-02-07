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
import type {
  SceneCanvasStatus,
  PlaceholderInfo,
  ImageLoadingState,
  SceneProcessingPhase,
} from '../types/scene';

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
  /** U-066: 이미지 생성 중 여부 (외부 상태) */
  isGenerating?: boolean;
  /** U-071: 현재 처리 단계 (로딩 인디케이터 강화) */
  processingPhase?: SceneProcessingPhase;
  /** U-089: 정밀분석(Agentic Vision) 실행 중 여부 */
  isAnalyzing?: boolean;
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
 * - U-066: isGenerating 상태에서 "새 장면 생성 중" 인디케이터를 표시합니다.
 */
export function SceneImage({
  status,
  imageUrl,
  message,
  className = '',
  isGenerating = false,
  processingPhase = 'idle',
  isAnalyzing = false,
}: SceneImageProps) {
  const { t } = useTranslation();

  // U-071: 처리 중 여부 (processing 또는 image_pending)
  // U-089: 정밀분석 시에는 별도 오버레이를 사용하므로 isProcessing에서 제외
  const isProcessing =
    !isAnalyzing && (processingPhase === 'processing' || processingPhase === 'image_pending');

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
  // U-071: 처리 중일 때는 scene-active 해제 (placeholder 표시를 위해)
  // U-089: 정밀분석 중에는 scene-active 유지 (기존 이미지 표시)
  const isSceneActive =
    status === 'scene' && hasDisplayImage && !imageError && !isProcessing && !isAnalyzing;

  // placeholder 정보 결정
  // U-071 Option C: 처리 중일 때도 placeholder 상태로 전환
  // U-089: 정밀분석 시에는 placeholder 미표시 (기존 이미지 유지)
  const effectiveStatus = isProcessing
    ? 'loading'
    : status === 'scene' && !hasDisplayImage
      ? 'default'
      : status;

  // U-071 Option C: 처리 중일 때 placeholder + 오버레이 표시
  // U-089: 정밀분석 시에는 기존 이미지를 유지하므로 placeholder 미표시
  const isPlaceholderVisible = (!hasDisplayImage || isProcessing) && !isAnalyzing;

  const placeholder = isPlaceholderVisible
    ? SCENE_PLACEHOLDERS[effectiveStatus as Exclude<SceneCanvasStatus, 'scene'>]
    : null;

  // U-071: 처리 단계별 메시지 키 매핑
  const processingMessageKey =
    processingPhase === 'image_pending'
      ? 'scene.processing.image_pending'
      : processingPhase === 'rendering'
        ? 'scene.processing.rendering'
        : 'scene.processing.processing';

  return (
    <div
      className={`scene-image-container ${isSceneActive || isAnalyzing ? 'scene-active' : `scene-status-${effectiveStatus}`} ${isImageLoading ? 'image-loading' : ''} ${isProcessing ? 'scene-processing' : ''} ${isAnalyzing ? 'scene-analyzing' : ''} ${className}`}
      style={placeholder ? { backgroundImage: `url('${placeholder.imagePath}')` } : {}}
    >
      {/* 장면 이미지
        - U-071 Option C: 처리 중일 때 숨김
        - U-089: 정밀분석 중에는 기존 이미지 유지 (opacity/tint는 CSS에서 처리)
      */}
      {hasDisplayImage && (!isProcessing || isAnalyzing) && (
        <img
          src={displayImageUrl}
          alt={t('scene.status.alt')}
          className={`scene-image ${imageLoadingState === 'loaded' ? 'scene-image-loaded' : ''}`}
        />
      )}

      {/* U-089: 정밀분석 전용 오버레이 (스캔라인 스윕 + 시안 글로우 라벨) */}
      {isAnalyzing && (
        <div className="scene-analyzing-overlay" aria-live="polite" role="status">
          {/* 스캔라인 스윕 효과 (위→아래 반복) */}
          <div className="scene-analyzing-scanline" aria-hidden="true" />
          {/* 시안 글로우 라벨 */}
          <span className="scene-analyzing-text">{t('scene.analyzing.message')}</span>
          {/* 서브 텍스트 (단계 힌트) */}
          <span className="scene-analyzing-subtext">{t('scene.analyzing.hint')}</span>
        </div>
      )}

      {/* U-071: 처리 중 오버레이 (CRT 테마) - 정밀분석이 아닐 때만 */}
      {isProcessing && !isAnalyzing && (
        <div className="scene-processing-overlay" aria-live="polite" role="status">
          <div className="scene-processing-spinner" aria-hidden="true">
            <div className="spinner-ring spinner-ring-outer" />
            <div className="spinner-ring spinner-ring-inner" />
            <div className="spinner-glow" />
          </div>
          <span className="scene-processing-text">{t(processingMessageKey)}</span>
          {/* CRT 스캔라인 효과 */}
          <div className="scene-processing-scanlines" aria-hidden="true" />
        </div>
      )}

      {/* 로딩 인디케이터 (이미지 URL 로딩) - 처리 중/분석 중이 아닐 때만 */}
      {isImageLoading && !isGenerating && !isProcessing && !isAnalyzing && (
        <div className="scene-loading-indicator" aria-live="polite">
          <div className="scene-loading-spinner" aria-hidden="true" />
          <span className="scene-loading-text">{t('scene.status.image_loading')}</span>
        </div>
      )}

      {/* U-066: 이미지 생성 중 인디케이터 - 처리 중/분석 중이 아닐 때만 */}
      {isGenerating && !isProcessing && !isAnalyzing && (
        <div className="scene-generating-indicator" aria-live="polite">
          <div className="scene-generating-spinner" aria-hidden="true" />
          <span className="scene-generating-text">{t('scene.status.image_generating')}</span>
        </div>
      )}

      {/* 이미지 에러 배지 - 처리 중/분석 중이 아닐 때만 */}
      {imageError && !isProcessing && !isAnalyzing && (
        <div className="scene-error-badge" role="alert">
          <span className="scene-error-icon" aria-hidden="true">
            ⚠️
          </span>
          <span className="scene-error-text">{t('scene.status.image_error')}</span>
        </div>
      )}

      {/* Placeholder 영역 - 처리 중일 때는 오버레이만 표시, 분석 중일 때는 미표시 */}
      {isPlaceholderVisible && placeholder && !isProcessing && (
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
