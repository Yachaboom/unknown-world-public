import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventoryPanel } from './InventoryPanel';
import { useInventoryStore } from '../stores/inventoryStore';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'ko',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

// dnd-kit 모킹
// useDraggable이 반환하는 attributes, listeners가 최상위 div에 적용되는지 확인하기 위함
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    useDraggable: vi.fn(({ id }) => ({
      attributes: { role: 'button', 'aria-describedby': `DndDescribedBy-${id}` },
      listeners: { onPointerDown: vi.fn() },
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    })),
    DragOverlay: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="drag-overlay">{children}</div>
    ),
  };
});

describe('InventoryPanel (U-117)', () => {
  beforeEach(() => {
    useInventoryStore.getState().reset();
  });

  it('should apply drag listeners and attributes to the entire row div', () => {
    // 테스트 아이템 추가
    useInventoryStore.getState().addItems([
      {
        id: 'test-item-1',
        name: 'Test Item 1',
        quantity: 1,
        icon: '📦',
      },
    ]);

    render(<InventoryPanel />);

    // 아이템 Row 찾기
    const itemRow = screen.getByRole('listbox').children[0];

    // U-117: 최상위 div(itemRow)에 드래그 속성이 적용되어야 함
    expect(itemRow).toHaveAttribute('role', 'button');
    expect(itemRow).toHaveAttribute('aria-describedby', 'DndDescribedBy-test-item-1');

    // 클래스 확인 (inventory-item 클래스가 있어야 함)
    expect(itemRow).toHaveClass('inventory-item');
  });

  it('should render only the icon in DragOverlay when dragging', () => {
    // 1. 아이템 추가
    const testItem = {
      id: 'test-drag-item',
      name: 'Dragging Item',
      quantity: 1,
      icon: '🔥',
    };
    useInventoryStore.getState().addItems([testItem]);

    // 2. 드래그 상태로 설정
    useInventoryStore.getState().startDrag(testItem.id);

    render(<InventoryPanel />);

    // 3. DragOverlay 내부 확인
    const overlay = screen.getByTestId('drag-overlay');

    // U-117: 고스트 이미지는 아이콘만 표시되어야 함 (inventory-overlay-icon 클래스)
    const ghostIcon = overlay.querySelector('.inventory-overlay-icon');
    expect(ghostIcon).toBeInTheDocument();
    expect(ghostIcon).toHaveTextContent('🔥');

    // 이름이나 다른 정보가 오버레이에 포함되지 않았는지 확인
    expect(ghostIcon).not.toHaveTextContent('Dragging Item');
  });
});
