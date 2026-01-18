/**
 * Unknown World - Scene Canvas 컴포넌트
 *
 * RULE-002 준수: 채팅 버블이 아닌 게임 UI
 * RULE-009 준수: 좌표 규약 (0~1000 정규화, bbox=[ymin,xmin,ymax,xmax])
 *
 * U-010[Mvp]: 핫스팟 오버레이 + 클릭 처리
 * - TurnOutput의 objects[]/hotspots[]를 기반으로 오버레이 렌더
 * - hover 시 하이라이트/툴팁 표시
 * - click 시 object_id + box_2d를 TurnInput에 포함해 전송
 *
 * U-012[Mvp]: DnD 드롭 타겟 확장
 * - 핫스팟을 droppable 영역으로 만들어 인벤토리 아이템 드롭 처리
 * - 드래그 오버 시 하이라이트 강화
 * - 드롭 성공/실패 즉시 시각화
 *
 * @module components/SceneCanvas
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import type { SceneCanvasStatus, PlaceholderInfo } from '../types/scene';
import type { SceneObject, Box2D } from '../schemas/turn';
import { box2dToPixel, type CanvasSize } from '../utils/box2d';
import {
  DND_TYPE,
  type HotspotDropData,
  isHotspotInteractionAllowed,
  compareHotspotPriority,
} from '../dnd/types';
import { useWorldStore } from '../stores/worldStore';
import { useAgentStore } from '../stores/agentStore';

// =============================================================================
// 상수 정의
// =============================================================================

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

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 핫스팟 클릭 이벤트 데이터 (Q1 결정: Option B - object_id + box_2d)
 */
export interface HotspotClickData {
  /** 클릭한 오브젝트 ID */
  object_id: string;
  /** 클릭한 오브젝트의 바운딩 박스 (0~1000 정규화) */
  box_2d: Box2D;
}

interface SceneCanvasProps {
  /** 핫스팟 클릭 콜백 */
  onHotspotClick?: (data: HotspotClickData) => void;
  /** 스트리밍 중 여부 (비활성화용, 생략 시 agentStore.isStreaming 사용) */
  disabled?: boolean;
}

// =============================================================================
// 내부 컴포넌트: 핫스팟 오버레이
// =============================================================================

interface HotspotOverlayProps {
  object: SceneObject;
  canvasSize: CanvasSize;
  onClick: (data: HotspotClickData) => void;
  disabled: boolean;
  /** RU-003-S2: 데모 상태 여부 (시각적 힌트 필요) */
  isDemoState?: boolean;
  /** RU-003-S2 Step 2: 우선순위 기반 z-index 스타일 */
  style?: React.CSSProperties;
}

/**
 * 개별 핫스팟 오버레이 컴포넌트 (U-010 + U-012)
 *
 * - 클릭 시 object_id + box_2d 전송 (U-010)
 * - 드롭 타겟으로 동작 - dnd-kit useDroppable 사용 (U-012)
 */
function HotspotOverlay({
  object,
  canvasSize,
  onClick,
  disabled,
  isDemoState = false,
  style,
}: HotspotOverlayProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();

  // U-012: useDroppable 훅으로 드롭 타겟 설정 (RU-003-Q1: 상수/타입 기반)
  const dropData: HotspotDropData = {
    type: DND_TYPE.HOTSPOT,
    object_id: object.id,
    box_2d: object.box_2d,
    label: object.label,
  };
  const { isOver, setNodeRef } = useDroppable({
    id: `hotspot-${object.id}`,
    data: dropData,
    disabled,
  });

  // box_2d(0~1000) → px 변환
  const pixelBox = box2dToPixel(object.box_2d, canvasSize);

  const handleClick = useCallback(() => {
    if (disabled) return;
    onClick({
      object_id: object.id,
      box_2d: object.box_2d,
    });
  }, [disabled, onClick, object.id, object.box_2d]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [disabled, handleClick],
  );

  // 드래그 오버 상태 또는 마우스 호버 상태
  const isHighlighted = isHovered || isOver;

  // RU-003-S2: 데모 상태 클래스 추가
  const demoClass = isDemoState ? 'demo-target' : '';

  return (
    <div
      ref={setNodeRef}
      className={`hotspot-overlay ${isHighlighted ? 'hovered' : ''} ${disabled ? 'disabled' : ''} ${isOver ? 'drop-target-active' : ''} ${demoClass}`}
      style={{
        position: 'absolute',
        top: `${pixelBox.top}px`,
        left: `${pixelBox.left}px`,
        width: `${pixelBox.width}px`,
        height: `${pixelBox.height}px`,
        ...style,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={object.label}
      aria-disabled={disabled}
      data-drop-target={!disabled}
      data-demo-state={isDemoState}
    >
      {/* 호버 또는 드래그 오버 시 툴팁 표시 */}
      {isHighlighted && !disabled && (
        <div className="hotspot-tooltip">
          <span className="hotspot-tooltip-label">{object.label}</span>
          {/* RU-003-S2: 데모 상태 표시 */}
          {isDemoState && (
            <span className="hotspot-tooltip-demo">{t('scene.hotspot.demo_hint')}</span>
          )}
          {/* U-012: 드래그 오버 시 드롭 힌트 표시 */}
          {isOver && (
            <span className="hotspot-tooltip-drop-hint">{t('scene.hotspot.drop_hint')}</span>
          )}
          {!isOver && !isDemoState && object.interaction_hint && (
            <span className="hotspot-tooltip-hint">
              {t('scene.hotspot.hint_prefix')}: {object.interaction_hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * Scene Canvas 컴포넌트
 *
 * U-010[Mvp]: 핫스팟 오버레이 + 클릭 처리
 * U-031[Mvp]: Placeholder Pack
 *
 * - 상태에 따라 placeholder 이미지와 라벨을 표시합니다.
 * - 'scene' 상태에서는 실제 이미지를 렌더링하며, 로드 실패 시 폴백을 제공합니다.
 * - objects 배열이 있으면 핫스팟 오버레이를 렌더링합니다.
 */
export function SceneCanvas({ onHotspotClick, disabled: propsDisabled }: SceneCanvasProps) {
  const { t } = useTranslation();

  // Store 상태 (RU-003: 컴포넌트 내에서 직접 구독)
  const state = useWorldStore((state) => state.sceneState);
  const objects = useWorldStore((state) => state.sceneObjects);
  const isStreaming = useAgentStore((state) => state.isStreaming);

  const disabled = propsDisabled ?? isStreaming;

  const { status, imageUrl, message } = state;
  const [imageError, setImageError] = useState(false);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // RU-003-S2 Step 3: ResizeObserver에 디바운스 적용
  // 드래그 중 핫스팟 영역이 과도하게 흔들리는 것을 방지
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const RESIZE_DEBOUNCE_MS = 100; // 디바운스 간격

    const resizeObserver = new ResizeObserver((entries) => {
      // 디바운스: 마지막 리사이즈 이벤트 후 일정 시간 후에만 업데이트
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          // 의미 있는 크기 변화만 적용 (5px 이상 차이)
          setCanvasSize((prev) => {
            if (Math.abs(prev.width - width) > 5 || Math.abs(prev.height - height) > 5) {
              return { width, height };
            }
            return prev;
          });
        }
      }, RESIZE_DEBOUNCE_MS);
    });

    resizeObserver.observe(element);

    // 초기 크기 설정
    const rect = element.getBoundingClientRect();
    setCanvasSize({ width: rect.width, height: rect.height });

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeObserver.disconnect();
    };
  }, []);

  // 핫스팟 클릭 핸들러
  const handleHotspotClick = useCallback(
    (data: HotspotClickData) => {
      if (onHotspotClick) {
        onHotspotClick(data);
      }
    },
    [onHotspotClick],
  );

  // 정상 장면 표시 중이거나 이미지 에러가 발생한 경우
  const isSceneActive = status === 'scene' && imageUrl && !imageError;

  // placeholder 정보 결정 (scene 상태에서 에러 시 default로 폴백)
  const effectiveStatus = status === 'scene' && imageError ? 'default' : status;
  const isPlaceholderVisible = effectiveStatus !== 'scene';

  const placeholder = isPlaceholderVisible
    ? SCENE_PLACEHOLDERS[effectiveStatus as Exclude<SceneCanvasStatus, 'scene'>]
    : null;

  // RU-003-S2 Step 1: 핫스팟 렌더링 조건을 SSOT로 고정
  // - isHotspotInteractionAllowed()로 허용 상태 검사 (scene, default)
  // - objects 존재 + 캔버스 크기 확보
  const isInteractionAllowed = isHotspotInteractionAllowed(status);
  const shouldRenderHotspots = isInteractionAllowed && objects.length > 0 && canvasSize.width > 0;

  // RU-003-S2: 데모 상태 여부 (시각적 힌트 필요)
  const isDemoState = status === 'default' && !isSceneActive;

  // RU-003-S2 Step 2: 핫스팟을 면적 기준으로 정렬 (작은 것이 뒤에 = 높은 z-index)
  const sortedObjects = useMemo(() => {
    if (objects.length <= 1) return objects;
    return [...objects].sort((a, b) => compareHotspotPriority(a.box_2d, b.box_2d));
  }, [objects]);

  return (
    <div
      ref={canvasRef}
      className={`scene-canvas ${isSceneActive ? 'scene-active' : `scene-status-${effectiveStatus}`} ${shouldRenderHotspots ? 'has-hotspots' : ''}`}
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

      {/* 핫스팟 오버레이 레이어 (RU-003-S2: 면적순 정렬) */}
      {shouldRenderHotspots && (
        <div className="hotspot-layer" aria-label={t('scene.hotspot.layer_label')}>
          {sortedObjects.map((obj, index) => (
            <HotspotOverlay
              key={obj.id}
              object={obj}
              canvasSize={canvasSize}
              onClick={handleHotspotClick}
              disabled={disabled}
              isDemoState={isDemoState}
              // RU-003-S2 Step 2: 인덱스 기반 z-index로 작은 것이 위에 표시
              style={{ zIndex: index + 1 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
