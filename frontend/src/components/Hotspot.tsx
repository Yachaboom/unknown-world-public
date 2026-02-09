/**
 * Unknown World - Hotspot 컴포넌트
 *
 * U-115[Mvp]: 핫스팟 컴팩트 원형(Circle) 디자인
 * - Q1 Option B: 고정 반지름 (모든 마커 동일 크기)
 * - bbox 중앙에 원형 마커 렌더링, 펄스 애니메이션
 * - 기존 bbox 데이터 규약(0~1000) 유지, 렌더링만 원형으로 변환
 *
 * U-058[Mvp]: 핫스팟 디자인 기반 (Magenta 테마)
 * U-074[Mvp]: 핫스팟 인터랙션 안내 UX
 * - Q1 Option B: 첫 N번만 hover 힌트 표시 (학습 후 사라짐)
 *
 * RULE-002 준수: 채팅 버블이 아닌 게임 UI
 * RULE-009 준수: 좌표 규약 (0~1000 정규화, bbox=[ymin,xmin,ymax,xmax])
 *
 * U-010[Mvp]: 핫스팟 오버레이 기본 구현
 * U-012[Mvp]: DnD 드롭 타겟 확장
 *
 * @module components/Hotspot
 */

import { useState, useCallback, memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import type { SceneObject, Box2D } from '../schemas/turn';
import { box2dCenter, type CanvasSize, NORMALIZED_MAX } from '../utils/box2d';
import { DND_TYPE, type HotspotDropData } from '../dnd/types';
import { useOnboardingStore, selectShouldShowHotspotHint } from '../stores/onboardingStore';
import { InteractionHint } from './InteractionHint';
import '../styles/hotspot.css';

// =============================================================================
// U-115: 원형 마커 상수
// =============================================================================

/**
 * 원형 마커 반지름 (px) - Q1 Option B: 고정 반지름.
 * 22px → 직경 44px = 최소 터치 타겟 사이즈 충족.
 */
const CIRCLE_RADIUS_PX = 22;

/**
 * 히트 영역 패딩 (px).
 * 원형 마커 주변에 추가 클릭 영역을 확보합니다.
 */
const HIT_AREA_PADDING_PX = 6;

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 핫스팟 클릭 이벤트 데이터
 */
export interface HotspotClickData {
  /** 클릭한 오브젝트 ID */
  object_id: string;
  /** 클릭한 오브젝트의 바운딩 박스 (0~1000 정규화) */
  box_2d: Box2D;
}

interface HotspotProps {
  /** 씬 오브젝트 데이터 */
  object: SceneObject;
  /** 캔버스 크기 (좌표 변환용) */
  canvasSize: CanvasSize;
  /** 클릭 핸들러 */
  onClick: (data: HotspotClickData) => void;
  /** 비활성화 여부 (스트리밍 중 등) */
  disabled: boolean;
  /** 데모 상태 여부 (시각적 힌트 필요) */
  isDemoState?: boolean;
  /** 우선순위 기반 z-index 스타일 */
  style?: React.CSSProperties;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * 핫스팟 컴포넌트
 *
 * Scene Canvas 위에 오버레이되는 클릭/드롭 가능한 영역입니다.
 * L자 코너 마커 + Magenta 테마로 시각적 품질을 향상시킵니다.
 *
 * @example
 * ```tsx
 * <Hotspot
 *   object={sceneObject}
 *   canvasSize={{ width: 800, height: 600 }}
 *   onClick={handleClick}
 *   disabled={isStreaming}
 * />
 * ```
 */
function HotspotComponent({
  object,
  canvasSize,
  onClick,
  disabled,
  isDemoState = false,
  style,
}: HotspotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();

  // U-074: 핫스팟 힌트 상태 (첫 N번만 표시)
  const shouldShowHint = useOnboardingStore(selectShouldShowHotspotHint);
  const incrementHotspotHint = useOnboardingStore((state) => state.incrementHotspotHint);

  // U-074: hover 시작 시 힌트 카운트 증가
  useEffect(() => {
    if (isHovered && !disabled) {
      incrementHotspotHint();
    }
  }, [isHovered, disabled, incrementHotspotHint]);

  // U-012: useDroppable 훅으로 드롭 타겟 설정
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

  // U-115: bbox 중심점 → 픽셀 좌표 변환 (RULE-009)
  // 데이터 레벨(box_2d)은 유지, 렌더링만 원형으로 변환
  const center = box2dCenter(object.box_2d);
  const centerPxX = (center.x / NORMALIZED_MAX) * canvasSize.width;
  const centerPxY = (center.y / NORMALIZED_MAX) * canvasSize.height;

  // 히트 영역 크기 (원형 + 패딩)
  const hitSize = (CIRCLE_RADIUS_PX + HIT_AREA_PADDING_PX) * 2;

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    if (disabled) return;
    onClick({
      object_id: object.id,
      box_2d: object.box_2d,
    });
  }, [disabled, onClick, object.id, object.box_2d]);

  // 키보드 접근성
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

  // 상태 결정
  const isHighlighted = isHovered || isOver;

  // 툴팁 방향 결정: 상단 여백이 부족하면 아래쪽으로 표시
  const TOOLTIP_FLIP_THRESHOLD = 80;
  const tooltipBelow = centerPxY - CIRCLE_RADIUS_PX < TOOLTIP_FLIP_THRESHOLD;

  // CSS 클래스 조합
  const classNames = [
    'hotspot-circle',
    isHighlighted && !disabled ? 'hovered' : '',
    disabled ? 'disabled' : '',
    isOver ? 'drop-target-active' : '',
    isDemoState ? 'demo-target' : '',
    tooltipBelow ? 'tooltip-below' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      className={classNames}
      style={{
        // U-115: 중심점 기반 위치 지정 (원형의 중앙이 bbox 중앙에 오도록)
        top: `${centerPxY - hitSize / 2}px`,
        left: `${centerPxX - hitSize / 2}px`,
        width: `${hitSize}px`,
        height: `${hitSize}px`,
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
      data-object-id={object.id}
    >
      {/* U-115: 원형 마커 (펄스 애니메이션은 CSS에서 처리) */}
      <div className="hotspot-circle-marker" aria-hidden="true" />

      {/* 호버 또는 드래그 오버 시 툴팁 표시 */}
      {isHighlighted && !disabled && (
        <div className="hotspot-tooltip">
          <span className="hotspot-tooltip-label">{object.label}</span>

          {/* 드래그 오버 시 드롭 힌트 표시 */}
          {isOver && (
            <span className="hotspot-tooltip-drop-hint">{t('scene.hotspot.drop_hint')}</span>
          )}

          {/* 일반 상호작용 힌트 */}
          {!isOver && object.interaction_hint && (
            <span className="hotspot-tooltip-hint">
              {t('scene.hotspot.hint_prefix')}: {object.interaction_hint}
            </span>
          )}
        </div>
      )}

      {/* U-074: 첫 N번만 표시되는 클릭 힌트 (툴팁 외부) */}
      {isHovered && !disabled && !isOver && shouldShowHint && (
        <InteractionHint
          text={t('interaction.hotspot_click')}
          icon="click"
          position="bottom"
          className="interaction-hint--hotspot"
        />
      )}
    </div>
  );
}

/**
 * Memoized Hotspot 컴포넌트
 *
 * 다수의 핫스팟이 동시에 렌더될 때 성능 최적화를 위해 메모이제이션 적용.
 * object.id, canvasSize, disabled가 변경되지 않으면 리렌더 방지.
 */
export const Hotspot = memo(HotspotComponent, (prevProps, nextProps) => {
  // 핵심 props만 비교하여 불필요한 리렌더 방지
  return (
    prevProps.object.id === nextProps.object.id &&
    prevProps.object.label === nextProps.object.label &&
    prevProps.object.box_2d.ymin === nextProps.object.box_2d.ymin &&
    prevProps.object.box_2d.xmin === nextProps.object.box_2d.xmin &&
    prevProps.object.box_2d.ymax === nextProps.object.box_2d.ymax &&
    prevProps.object.box_2d.xmax === nextProps.object.box_2d.xmax &&
    prevProps.canvasSize.width === nextProps.canvasSize.width &&
    prevProps.canvasSize.height === nextProps.canvasSize.height &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.isDemoState === nextProps.isDemoState
  );
});

Hotspot.displayName = 'Hotspot';

// Re-export for convenience
export type { HotspotProps };
