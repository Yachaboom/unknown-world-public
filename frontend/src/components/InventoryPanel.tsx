/**
 * Unknown World - Inventory Panel 컴포넌트 (U-011[Mvp]).
 *
 * dnd-kit 기반 드래그 가능한 인벤토리 아이템 UI를 제공합니다.
 *
 * 설계 원칙:
 *   - RULE-002: Inventory는 게임 UI로 상시 노출 (채팅 입력 대체 금지)
 *   - tech-stack: dnd-kit 기반 draggable 구현
 *   - U-012 연결: 드래그 데이터에 item_id 포함하여 드롭 타겟에 전달
 *
 * @module components/InventoryPanel
 */

import { useCallback, useMemo } from 'react';
import { useDraggable, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import {
  useInventoryStore,
  type InventoryItem,
  selectItems,
  selectDraggingItem,
  selectSelectedItemId,
} from '../stores/inventoryStore';
import { DND_TYPE, type InventoryDragData } from '../dnd/types';

// =============================================================================
// 드래그 가능한 아이템 컴포넌트
// =============================================================================

interface DraggableItemProps {
  item: InventoryItem;
  isSelected: boolean;
  onSelect: (itemId: string) => void;
  disabled?: boolean;
}

/**
 * 드래그 가능한 인벤토리 아이템.
 * dnd-kit의 useDraggable 훅을 사용합니다.
 */
function DraggableItem({ item, isSelected, onSelect, disabled = false }: DraggableItemProps) {
  const { t } = useTranslation();

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

  // 클릭 핸들러 (선택)
  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect(item.id);
    }
  }, [disabled, item.id, onSelect]);

  // 아이콘 렌더링 (이모지 또는 이미지)
  const renderIcon = () => {
    if (item.icon) {
      // URL 형태면 이미지, 아니면 이모지
      if (item.icon.startsWith('http') || item.icon.startsWith('/')) {
        return (
          <img
            src={item.icon}
            alt={item.name}
            className="inventory-item-icon-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        );
      }
      return <span className="inventory-item-icon-emoji">{item.icon}</span>;
    }
    // 기본 아이콘 (📦)
    return <span className="inventory-item-icon-emoji">📦</span>;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`inventory-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      aria-label={t('inventory.item_label', { name: item.name, quantity: item.quantity })}
      aria-selected={isSelected}
      {...attributes}
      {...listeners}
    >
      <div className="inventory-item-icon">{renderIcon()}</div>
      <div className="inventory-item-info">
        <span className="inventory-item-name">{item.name}</span>
        {item.quantity > 1 && <span className="inventory-item-quantity">x{item.quantity}</span>}
      </div>
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
 * 드래그 오버레이 아이템.
 * 드래그 중일 때 커서를 따라다니는 아이템 표시입니다.
 */
function ItemOverlay({ item }: ItemOverlayProps) {
  // 아이콘 렌더링
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
    <div className="inventory-item overlay">
      <div className="inventory-item-icon">{renderIcon()}</div>
      <div className="inventory-item-info">
        <span className="inventory-item-name">{item.name}</span>
        {item.quantity > 1 && <span className="inventory-item-quantity">x{item.quantity}</span>}
      </div>
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
 * 인벤토리 아이템을 그리드로 표시하고, 드래그 가능하게 합니다.
 * DndContext는 App 최상단에 배치됩니다 (Q1: Option A).
 *
 * @example
 * ```tsx
 * <InventoryPanel disabled={isStreaming} />
 * ```
 */
export function InventoryPanel({ disabled = false }: InventoryPanelProps) {
  const { t } = useTranslation();

  // Store 상태
  const items = useInventoryStore(selectItems);
  const draggingItem = useInventoryStore(selectDraggingItem);
  const selectedItemId = useInventoryStore(selectSelectedItemId);
  const selectItem = useInventoryStore((state) => state.selectItem);

  // 아이템 선택 핸들러
  const handleSelect = useCallback(
    (itemId: string) => {
      // 이미 선택된 아이템 클릭 시 선택 해제
      selectItem(selectedItemId === itemId ? null : itemId);
    },
    [selectedItemId, selectItem],
  );

  // 빈 인벤토리
  if (items.length === 0) {
    return (
      <div className="inventory-panel-content">
        <div className="inventory-empty">
          <span className="inventory-empty-icon">📦</span>
          <span className="inventory-empty-text">{t('inventory.empty')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-panel-content" data-ui-importance="critical">
      <div
        className="inventory-grid"
        role="listbox"
        aria-label={t('inventory.grid_label')}
        aria-multiselectable={false}
      >
        {items.map((item) => (
          <DraggableItem
            key={item.id}
            item={item}
            isSelected={selectedItemId === item.id}
            onSelect={handleSelect}
            disabled={disabled}
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
