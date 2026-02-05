import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryPanel } from './InventoryPanel';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useInventoryStore } from '../stores/inventoryStore';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// dnd-kit 모킹
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('InventoryPanel UX - Hover Hint', () => {
  const mockItems = [{ id: 'item-1', name: '테스트 아이템', quantity: 1, icon: '📦' }];

  beforeEach(() => {
    vi.clearAllMocks();
    useOnboardingStore.getState().resetOnboarding();

    // inventoryStore 상태 설정
    useInventoryStore.setState({
      items: mockItems,
      selectedItemId: null,
      draggingItemId: null,
    });
  });

  it('아이템 마우스 진입 시 onboardingStore의 카운트 증가 액션이 호출되어야 한다', () => {
    render(<InventoryPanel />);

    const item = screen.getByLabelText('inventory.item_label');
    fireEvent.mouseEnter(item);

    expect(useOnboardingStore.getState().itemHintCount).toBe(1);
  });

  it('힌트 표시 조건일 때 InteractionHint가 렌더링되어야 한다', () => {
    render(<InventoryPanel />);

    const item = screen.getByLabelText('inventory.item_label');
    fireEvent.mouseEnter(item);

    expect(screen.getByText('interaction.item_drag')).toBeInTheDocument();
  });

  it('임계값 초과 시 힌트가 보이지 않아야 한다', () => {
    for (let i = 0; i < 3; i++) {
      useOnboardingStore.getState().incrementItemHint();
    }

    render(<InventoryPanel />);

    const item = screen.getByLabelText('inventory.item_label');
    fireEvent.mouseEnter(item);

    expect(screen.queryByText('interaction.item_drag')).not.toBeInTheDocument();
  });
});
