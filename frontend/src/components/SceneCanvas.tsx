import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SceneCanvasStatus, SceneCanvasState, PlaceholderInfo } from '../types/scene';

/**
 * 상태별 placeholder 정보 (U-031: Placeholder Pack)
 * labelKey는 i18n 번역 키로 사용됩니다.
 */
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

interface SceneCanvasProps {
  state: SceneCanvasState;
}

/**
 * Scene Canvas 컴포넌트 (U-031: Placeholder Pack)
 *
 * - 상태에 따라 placeholder 이미지와 라벨을 표시합니다.
 * - 'scene' 상태에서는 실제 이미지를 렌더링하며, 로드 실패 시 폴백을 제공합니다.
 */
export function SceneCanvas({ state }: SceneCanvasProps) {
  const { status, imageUrl, message } = state;
  const [imageError, setImageError] = useState(false);
  const { t } = useTranslation();

  // 정상 장면 표시 중이거나 이미지 에러가 발생한 경우
  const isSceneActive = status === 'scene' && imageUrl && !imageError;

  // placeholder 정보 결정 (scene 상태에서 에러 시 default로 폴백)
  const effectiveStatus = status === 'scene' && imageError ? 'default' : status;
  const isPlaceholderVisible = effectiveStatus !== 'scene';

  const placeholder = isPlaceholderVisible
    ? SCENE_PLACEHOLDERS[effectiveStatus as Exclude<SceneCanvasStatus, 'scene'>]
    : null;

  return (
    <div
      className={`scene-canvas ${isSceneActive ? 'scene-active' : `scene-status-${effectiveStatus}`}`}
      style={placeholder ? { backgroundImage: `url('${placeholder.imagePath}')` } : {}}
    >
      {isSceneActive && (
        <img
          src={imageUrl}
          alt={t('scene.status.alt')}
          className="scene-image"
          onError={() => setImageError(true)}
        />
      )}

      {isPlaceholderVisible && placeholder && (
        <div className="scene-placeholder">
          {/* 텍스트 폴백 (이미지 로드 실패 시에도 표시) */}
          <p className="text-glow scene-status-label">
            <span className="scene-status-emoji" aria-hidden="true">
              {placeholder.fallbackEmoji}
            </span>{' '}
            {t(placeholder.labelKey)}
          </p>
          {(message || (status === 'scene' && imageError)) && (
            <p className="scene-status-message">
              {message || (imageError ? t('scene.status.image_error') : '')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
