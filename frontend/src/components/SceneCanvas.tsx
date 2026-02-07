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
 * U-020[Mvp]: 이미지 Lazy Render (placeholder/폴백)
 * - RULE-004/008 준수: 텍스트 우선 + Lazy 이미지 정책
 * - Q1 Option A: 이전 이미지 유지 + 로딩 인디케이터 표시
 * - 이미지 실패 시에도 핫스팟/패널/로그는 계속 동작 (텍스트-only 진행)
 *
 * U-058[Mvp]: 핫스팟 디자인 개선
 * - Q1 Option C: Magenta/Purple 계열 강조
 * - Q2 Option A: L자 브라켓 코너 마커
 * - Hotspot 컴포넌트 분리로 시각적 품질 향상
 *
 * @module components/SceneCanvas
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type CanvasSize } from '../utils/box2d';
import { isHotspotInteractionAllowed, compareHotspotPriority } from '../dnd/types';
import { useWorldStore } from '../stores/worldStore';
import { useAgentStore } from '../stores/agentStore';
import { SceneImage } from './SceneImage';
import { Hotspot, type HotspotClickData } from './Hotspot';

// =============================================================================
// 타입 정의 (Re-export for backward compatibility)
// =============================================================================

export type { HotspotClickData };

interface SceneCanvasProps {
  /** 핫스팟 클릭 콜백 */
  onHotspotClick?: (data: HotspotClickData) => void;
  /** 스트리밍 중 여부 (비활성화용, 생략 시 agentStore.isStreaming 사용) */
  disabled?: boolean;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * Scene Canvas 컴포넌트
 *
 * U-010[Mvp]: 핫스팟 오버레이 + 클릭 처리
 * U-020[Mvp]: Lazy Render (placeholder/폴백)
 * U-031[Mvp]: Placeholder Pack
 *
 * - 상태에 따라 placeholder 이미지와 라벨을 표시합니다.
 * - 'scene' 상태에서는 실제 이미지를 렌더링하며, 로드 실패 시 폴백을 제공합니다.
 * - U-020: Q1 Option A - 이전 이미지 유지 + 로딩 인디케이터 표시
 * - objects 배열이 있으면 핫스팟 오버레이를 렌더링합니다.
 */
export function SceneCanvas({ onHotspotClick, disabled: propsDisabled }: SceneCanvasProps) {
  const { t } = useTranslation();

  // Store 상태 (RU-003: 컴포넌트 내에서 직접 구독)
  const state = useWorldStore((state) => state.sceneState);
  const objects = useWorldStore((state) => state.sceneObjects);
  const isAnalyzing = useWorldStore((state) => state.isAnalyzing);
  const isStreaming = useAgentStore((state) => state.isStreaming);

  const disabled = propsDisabled ?? isStreaming;

  // U-071: 처리 단계 및 이미지 로딩 상태 추출
  const { status, imageUrl, message, processingPhase, imageLoading } = state;

  // U-085: Store에서 setSceneCanvasSize 가져오기 (SSOT)
  const setSceneCanvasSize = useWorldStore((state) => state.setSceneCanvasSize);

  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // RU-003-S2 Step 3: ResizeObserver에 디바운스 적용
  // 드래그 중 핫스팟 영역이 과도하게 흔들리는 것을 방지
  // U-085: 측정된 크기를 Store에도 반영 (이미지 사이징 SSOT)
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
              const newSize = { width, height };
              // U-085: Store에도 반영 (이미지 잡 실행 시 참조)
              setSceneCanvasSize(newSize);
              return newSize;
            }
            return prev;
          });
        }
      }, RESIZE_DEBOUNCE_MS);
    });

    resizeObserver.observe(element);

    // 초기 크기 설정
    const rect = element.getBoundingClientRect();
    const initialSize = { width: rect.width, height: rect.height };
    setCanvasSize(initialSize);
    // U-085: 초기 크기도 Store에 반영
    setSceneCanvasSize(initialSize);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeObserver.disconnect();
    };
  }, [setSceneCanvasSize]);

  // 핫스팟 클릭 핸들러
  const handleHotspotClick = useCallback(
    (data: HotspotClickData) => {
      if (onHotspotClick) {
        onHotspotClick(data);
      }
    },
    [onHotspotClick],
  );

  // RU-003-S2 Step 1: 핫스팟 렌더링 조건을 SSOT로 고정
  // - isHotspotInteractionAllowed()로 허용 상태 검사 (scene, default)
  // - objects 존재 + 캔버스 크기 확보
  // U-020: 이미지 유무와 무관하게 핫스팟은 동작 (RULE-004)
  const isInteractionAllowed = isHotspotInteractionAllowed(status);
  const shouldRenderHotspots = isInteractionAllowed && objects.length > 0 && canvasSize.width > 0;

  // RU-003-S2: 데모 상태 여부 (시각적 힌트 필요)
  const isDemoState = status === 'default';

  // RU-003-S2 Step 2: 핫스팟을 면적 기준으로 정렬 (작은 것이 뒤에 = 높은 z-index)
  const sortedObjects = useMemo(() => {
    if (objects.length <= 1) return objects;
    return [...objects].sort((a, b) => compareHotspotPriority(a.box_2d, b.box_2d));
  }, [objects]);

  return (
    <div ref={canvasRef} className="scene-canvas">
      {/* U-020: 장면 이미지 (Lazy loading + placeholder/폴백 포함) */}
      {/* U-071: 처리 단계 및 이미지 생성 상태 전달 */}
      {/* U-089: 정밀분석 상태 전달 (기존 이미지 유지 + 분석 오버레이) */}
      <SceneImage
        status={status}
        imageUrl={imageUrl}
        message={message}
        processingPhase={processingPhase}
        isGenerating={imageLoading}
        isAnalyzing={isAnalyzing}
      />

      {/* 핫스팟 오버레이 레이어 (RU-003-S2: 면적순 정렬) */}
      {/* U-020: 이미지 유무와 무관하게 핫스팟은 항상 렌더 (RULE-004) */}
      {/* U-058: Hotspot 컴포넌트 분리 (Magenta 테마 + L자 코너) */}
      {shouldRenderHotspots && (
        <div className="hotspot-layer" aria-label={t('scene.hotspot.layer_label')}>
          {sortedObjects.map((obj, index) => (
            <Hotspot
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
