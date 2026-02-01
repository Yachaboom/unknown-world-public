import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryPanel } from './InventoryPanel';
import { useInventoryStore } from '../stores/inventoryStore';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'inventory.empty') return 'Inventory is empty';
      if (key === 'inventory.grid_label') return 'Inventory Grid';
      return key;
    },
  }),
}));

// dnd-kit 모킹 (필요시)
// dnd-kit hooks often return attributes/listeners/setNodeRef
// For basic rendering test, we might not need to mock them if they don't crash jsdom

describe('InventoryPanel Component', () => {
  beforeEach(() => {
    useInventoryStore.getState().reset();
  });

  it('아이템이 없을 때 빈 상태 메시지를 표시해야 한다', () => {
    render(<InventoryPanel />);
    expect(screen.getByText('Inventory is empty')).toBeInTheDocument();
  });

  it('아이템이 있을 때 목록을 렌더링해야 한다', () => {
    const { addItems } = useInventoryStore.getState();
    addItems([
      { id: 'item1', name: 'Item 1', quantity: 1, icon: '🍎' },
      { id: 'item2', name: 'Item 2', quantity: 3, icon: '🗡️' },
    ]);

    render(<InventoryPanel />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('🍎')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('🗡️')).toBeInTheDocument();
    expect(screen.getByText('x3')).toBeInTheDocument();
  });

  it('아이템 클릭 시 선택되어야 한다', () => {
    const { addItems } = useInventoryStore.getState();
    addItems([{ id: 'item1', name: 'Item 1', quantity: 1 }]);

    render(<InventoryPanel />);

    const item = screen.getByText('Item 1').closest('.inventory-item');
    expect(item).not.toHaveClass('selected');

    fireEvent.click(screen.getByText('Item 1'));

    expect(item).toHaveClass('selected');
    expect(useInventoryStore.getState().selectedItemId).toBe('item1');
  });

  it('disabled 프로프가 true일 때 아이템 클릭이 무시되어야 한다', () => {
    const { addItems } = useInventoryStore.getState();
    addItems([{ id: 'item1', name: 'Item 1', quantity: 1 }]);

    render(<InventoryPanel disabled={true} />);

    fireEvent.click(screen.getByText('Item 1'));

    const item = screen.getByText('Item 1').closest('.inventory-item');
    expect(item).not.toHaveClass('selected');
    expect(useInventoryStore.getState().selectedItemId).toBeNull();
  });

  it('아이템 호버 시 툴팁(title)이 표시되어야 한다 (U-056)', () => {
    const { addItems } = useInventoryStore.getState();
    addItems([
      { id: 'item1', name: 'Long Item Name', quantity: 1 },
      { id: 'item2', name: 'Stackable Item', quantity: 5 },
    ]);

    render(<InventoryPanel />);

    const item1 = screen.getByText('Long Item Name').closest('.inventory-item');
    const item2 = screen.getByText('Stackable Item').closest('.inventory-item');

    expect(item1).toHaveAttribute('title', 'Long Item Name');
    expect(item2).toHaveAttribute('title', 'Stackable Item x 5');
  });
});
