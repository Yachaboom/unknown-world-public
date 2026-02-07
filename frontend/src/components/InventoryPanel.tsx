/**
 * Unknown World - Inventory Panel 컴포넌트 (U-011[Mvp], U-088[Mvp]).
 *
 * dnd-kit 기반 드래그 가능한 인벤토리 아이템 UI를 Row(행) 형태로 제공합니다.
 *
 * 설계 원칙:
 *   - RULE-002: Inventory는 게임 UI로 상시 노출 (채팅 입력 대체 금지)
 *   - tech-stack: dnd-kit 기반 draggable 구현
 *   - U-012 연결: 드래그 데이터에 item_id 포함하여 드롭 타겟에 전달
 *
 * U-088[Mvp]: Row 형태 전환
 *   - Q1: Row 48px, 아이콘 32px (컴팩트)
 *   - Q2: 구분선 + 줄무늬 조합
 *   - Q3: Hover 툴팁만 (U-056 유지)
 *   - Q4: 아이콘 영역만 드래그 가능, 아이콘만 드래그 이미지
 *
 * U-074[Mvp]: 아이템 인터랙션 안내 UX
 *   - Q1 Option B: 첫 N번만 hover 힌트 표시 (학습 후 사라짐)
 *   - hover 시 "드래그하여 사용" 힌트 표시
 *
 * U-075[Mvp]: 아이템 아이콘 동적 생성
 *   - Q1: Option B (placeholder 먼저 표시 후 백그라운드 생성)
 *   - Q2: Option A (64x64 픽셀)
 *   - Q3: Option A (픽셀 아트 스타일)
 *
 * @module components/InventoryPanel
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { useDraggable, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import {
  useInventoryStore,
  type InventoryItem,
  selectItems,
  selectDraggingItem,
  selectConsumingItemIds,
  requestItemIcon,
  pollIconStatus,
} from '../stores/inventoryStore';
import { useOnboardingStore, selectShouldShowItemHint } from '../stores/onboardingStore';
import { InteractionHint } from './InteractionHint';
import { DND_TYPE, type InventoryDragData } from '../dnd/types';

// =============================================================================
// 드래그 가능한 아이템 컴포넌트
// =============================================================================

interface DraggableItemProps {
  item: InventoryItem;
  disabled?: boolean;
  /** U-096: 소비 중(fade-out 진행 중) 여부 */
  isConsuming?: boolean;
  /** U-088: 선택 여부 */
  isSelected?: boolean;
  /** U-088: 선택 핸들러 */
  onSelect?: (itemId: string) => void;
}

/**
 * 드래그 가능한 인벤토리 아이템.
 * dnd-kit의 useDraggable 훅을 사용합니다.
 * U-056: 잘린 아이템 이름에 대한 툴팁 지원
 * U-074: 첫 N번만 hover 힌트 표시
 */
function DraggableItem({
  item,
  disabled = false,
  isConsuming = false,
  isSelected = false,
  onSelect,
}: DraggableItemProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  // U-074: 아이템 힌트 상태 (첫 N번만 표시)
  const shouldShowHint = useOnboardingStore(selectShouldShowItemHint);
  const incrementItemHint = useOnboardingStore((state) => state.incrementItemHint);

  // U-074: hover 시작 시 힌트 카운트 증가
  useEffect(() => {
    if (isHovered && !disabled) {
      incrementItemHint();
    }
  }, [isHovered, disabled, incrementItemHint]);

  // dnd-kit 드래그 설정 (RU-003-Q1: 상수/타입 기반)
  const dragData: InventoryDragData = {
    type: DND_TYPE.INVENTORY_ITEM,
    item_id: item.id,
    item,
  };
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: dragData,
    disabled,
  });

  // 변환 스타일 계산
  // 드래그 중일 때는 원본 아이템이 제자리에 있도록 transform 적용하지 않음
  // DragOverlay가 별도로 렌더링되므로 원본은 위치 고정
  const style = useMemo(
    () => ({
      transform: isDragging ? undefined : CSS.Translate.toString(transform),
      opacity: isDragging ? 0.3 : 1,
    }),
    [transform, isDragging],
  );

  // U-075: 아이콘 렌더링 (이모지 또는 이미지, 로딩 상태 포함)
  const renderIcon = () => {
    const isLoading = item.iconStatus === 'generating' || item.iconStatus === 'pending';

    if (item.icon) {
      // URL 형태면 이미지
      if (item.icon.startsWith('http') || item.icon.startsWith('/')) {
        return (
          <div className="inventory-item-icon-wrapper">
            <img
              src={item.icon}
              alt={item.name}
              className={`inventory-item-icon-img ${isLoading ? 'loading' : ''}`}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {isLoading && <div className="inventory-item-icon-loading" />}
          </div>
        );
      }
      // 이모지 + 로딩 상태 (U-075: 이모지여도 생성 중이면 스피너 표시)
      return (
        <div className="inventory-item-icon-wrapper">
          <span className="inventory-item-icon-emoji">{item.icon}</span>
          {isLoading && <div className="inventory-item-icon-loading" />}
        </div>
      );
    }

    // 기본 아이콘 (📦) + 로딩 상태
    return (
      <div className="inventory-item-icon-wrapper">
        <span className="inventory-item-icon-emoji">📦</span>
        {isLoading && <div className="inventory-item-icon-loading" />}
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`inventory-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${isConsuming ? 'item-consumed' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !disabled && onSelect?.(item.id)}
      aria-label={t('inventory.item_label', { name: item.name, quantity: item.quantity })}
      aria-selected={isSelected}
      // U-056: 네이티브 툴팁 (단수는 이름만, 복수는 "이름 x 갯수")
      title={item.quantity > 1 ? `${item.name} x ${item.quantity}` : item.name}
    >
      {/* U-088 Q4: 아이콘 영역만 드래그 핸들 */}
      <div className="inventory-item-icon" {...attributes} {...listeners}>
        {renderIcon()}
      </div>
      <div className="inventory-item-info">
        <span className="inventory-item-name">{item.name}</span>
        {item.quantity > 1 && <span className="inventory-item-quantity">x{item.quantity}</span>}
      </div>

      {/* U-074: 첫 N번만 표시되는 드래그 힌트 */}
      {isHovered && !disabled && !isDragging && shouldShowHint && (
        <InteractionHint
          text={t('interaction.item_drag')}
          icon="drag"
          position="top"
          className="interaction-hint--inventory"
        />
      )}
    </div>
  );
}

// =============================================================================
// 드래그 오버레이 (드래그 중 표시되는 아이템)
// =============================================================================

interface ItemOverlayProps {
  item: InventoryItem;
}

/**
 * 드래그 오버레이 — 아이콘만 표시 (U-088 Q4: Option B).
 * 드래그 중일 때 커서를 따라다니는 아이콘입니다.
 */
function ItemOverlay({ item }: ItemOverlayProps) {
  const renderIcon = () => {
    if (item.icon) {
      if (item.icon.startsWith('http') || item.icon.startsWith('/')) {
        return <img src={item.icon} alt={item.name} className="inventory-item-icon-img" />;
      }
      return <span className="inventory-item-icon-emoji">{item.icon}</span>;
    }
    return <span className="inventory-item-icon-emoji">📦</span>;
  };

  return (
    <div className="inventory-overlay-icon" title={item.name}>
      {renderIcon()}
    </div>
  );
}

// =============================================================================
// 메인 Inventory Panel 컴포넌트
// =============================================================================

interface InventoryPanelProps {
  /** 상호작용 비활성화 (스트리밍 중 등) */
  disabled?: boolean;
}

/**
 * Inventory Panel 컴포넌트.
 *
 * U-088: 인벤토리 아이템을 Row(행) 형태로 표시합니다.
 * 아이콘 영역만 드래그 핸들(Q4: Option B), DndContext는 App 최상단(Q1: Option A).
 *
 * U-075: 아이템 추가 시 아이콘 동적 생성 요청
 *
 * @example
 * ```tsx
 * <InventoryPanel disabled={isStreaming} />
 * ```
 */
export function InventoryPanel({ disabled = false }: InventoryPanelProps) {
  const { t, i18n } = useTranslation();

  // Store 상태
  const items = useInventoryStore(selectItems);
  const draggingItem = useInventoryStore(selectDraggingItem);
  const selectedItemId = useInventoryStore((state) => state.selectedItemId);
  const consumingItemIds = useInventoryStore(selectConsumingItemIds);
  const selectItem = useInventoryStore((state) => state.selectItem);
  const updateItemIcon = useInventoryStore((state) => state.updateItemIcon);
  const setItemIconStatus = useInventoryStore((state) => state.setItemIconStatus);

  // U-075: 아이콘 생성 요청 추적 (중복 요청 방지)
  const iconRequestedRef = useRef<Set<string>>(new Set());

  // U-075: 아이템 추가 시 아이콘 생성 요청
  useEffect(() => {
    const requestIconsForNewItems = async () => {
      for (const item of items) {
        // 이미 요청한 경우 스킵
        if (iconRequestedRef.current.has(item.id)) continue;

        // 이미 완료된 아이콘이 있는 경우 스킵
        if (item.iconStatus === 'completed' || item.iconStatus === 'cached') continue;

        // URL 형태의 실제 아이콘이 있으면 스킵 (이모지는 무시)
        const hasRealIcon =
          item.icon &&
          (item.icon.startsWith('http') || item.icon.startsWith('/')) &&
          !item.icon.includes('placeholder');
        if (hasRealIcon) continue;

        // iconStatus가 없거나 pending/generating/failed인 경우 아이콘 생성 시도
        // (failed인 경우도 재시도 허용)

        // 요청 추적
        iconRequestedRef.current.add(item.id);

        // 아이콘 생성 요청 (비동기)
        const description = item.description || item.name;
        const language = i18n.language === 'ko' ? 'ko-KR' : 'en-US';

        setItemIconStatus(item.id, 'generating');

        try {
          const result = await requestItemIcon(item.id, description, language);

          if (result.isPlaceholder) {
            // Placeholder 반환됨 - 폴링 시작
            setItemIconStatus(item.id, 'generating');

            // 백그라운드에서 폴링 (최대 30초)
            let attempts = 0;
            const maxAttempts = 15;
            const pollInterval = 2000; // 2초

            const poll = async () => {
              if (attempts >= maxAttempts) {
                setItemIconStatus(item.id, 'failed');
                return;
              }
              attempts++;

              const status = await pollIconStatus(item.id);
              if (status === 'completed' || status === 'cached') {
                // 완료됨 - 아이콘 URL 다시 요청
                const finalResult = await requestItemIcon(item.id, description, language);
                if (!finalResult.isPlaceholder && finalResult.iconUrl) {
                  updateItemIcon(item.id, finalResult.iconUrl, 'completed');
                }
              } else if (status === 'failed') {
                setItemIconStatus(item.id, 'failed');
              } else {
                // 계속 생성 중 - 다시 폴링
                setTimeout(poll, pollInterval);
              }
            };

            setTimeout(poll, pollInterval);
          } else if (result.iconUrl) {
            // 즉시 완료 (캐시)
            updateItemIcon(item.id, result.iconUrl, result.status);
          }
        } catch (error) {
          console.warn(`[InventoryPanel] 아이콘 생성 실패: ${item.id}`, error);
          setItemIconStatus(item.id, 'failed');
        }
      }
    };

    requestIconsForNewItems();
  }, [items, i18n.language, updateItemIcon, setItemIconStatus]);

  // 아이템 선택 핸들러 (토글 기능 포함)
  const handleSelect = (itemId: string) => {
    selectItem(itemId === selectedItemId ? null : itemId);
  };

  // 빈 인벤토리 (U-077: Q3 Option B - 아이템 획득 힌트 포함)
  if (items.length === 0) {
    return (
      <div className="inventory-panel-content">
        <div className="inventory-empty">
          <span className="inventory-empty-icon">📦</span>
          <span className="inventory-empty-text">{t('inventory.empty')}</span>
          <span className="inventory-empty-hint">{t('inventory.empty_hint')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-panel-content" data-ui-importance="critical">
      <div
        className="inventory-list"
        role="listbox"
        aria-label={t('inventory.list_label')}
        aria-multiselectable={false}
      >
        {items.map((item) => (
          <DraggableItem
            key={item.id}
            item={item}
            disabled={disabled || consumingItemIds.includes(item.id)}
            isConsuming={consumingItemIds.includes(item.id)}
            isSelected={selectedItemId === item.id}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* 드래그 오버레이 */}
      <DragOverlay dropAnimation={null}>
        {draggingItem ? <ItemOverlay item={draggingItem} /> : null}
      </DragOverlay>
    </div>
  );
}

export default InventoryPanel;
