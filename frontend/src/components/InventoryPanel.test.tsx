import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventoryPanel } from './InventoryPanel';
import { useInventoryStore, InventoryStore } from '../stores/inventoryStore';

// Mocking useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ko' },
  }),
}));

// Mocking store
vi.mock('../stores/inventoryStore', async () => {
  return {
    useInventoryStore: vi.fn(),
    requestItemIcon: vi.fn().mockResolvedValue({ isPlaceholder: false, iconUrl: '/test.png' }),
    pollIconStatus: vi.fn().mockResolvedValue('completed'),
    selectItems: (state: InventoryStore) => state.items,
    selectDraggingItem: (state: InventoryStore) =>
      state.items.find((i) => i.id === state.draggingItemId) || null,
    selectConsumingItemIds: (state: InventoryStore) => state.consumingItemIds || [],
    selectSelectedItemId: (state: InventoryStore) => state.selectedItemId || null,
  };
});

// Mocking onboarding store
vi.mock('../stores/onboardingStore', () => ({
  useOnboardingStore: vi.fn(() => false),
  selectShouldShowItemHint: vi.fn(() => false),
}));

// Mocking components that might cause issues
vi.mock('./InteractionHint', () => ({
  InteractionHint: () => <div data-testid="interaction-hint" />,
}));

describe('InventoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders items with dynamic icons', () => {
    const mockItems = [
      {
        id: 'item1',
        name: 'Magic Potion',
        quantity: 1,
        icon: '/api/image/file/icon123.png',
        iconStatus: 'completed' as const,
        description: 'A blue potion',
      },
      {
        id: 'item2',
        name: 'Sword',
        quantity: 1,
        icon: '⚔️',
        iconStatus: 'completed' as const,
        description: 'A sharp sword',
      },
    ];

    vi.mocked(useInventoryStore).mockImplementation(
      (selector: (state: InventoryStore) => unknown) => {
        const state = {
          items: mockItems,
          draggingItemId: null,
          consumingItemIds: [],
          selectedItemId: null,
          selectItem: vi.fn(),
          updateItemIcon: vi.fn(),
          setItemIconStatus: vi.fn(),
        } as unknown as InventoryStore;
        return selector(state);
      },
    );

    render(<InventoryPanel />);

    // Check for image icon
    const img = screen.getByAltText('Magic Potion');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/image/file/icon123.png');

    // Check for emoji icon
    expect(screen.getByText('⚔️')).toBeInTheDocument();
  });

  it('shows loading state when icon is generating', () => {
    const mockItems = [
      {
        id: 'item1',
        name: 'Loading Item',
        quantity: 1,
        icon: undefined,
        iconStatus: 'generating' as const,
        description: 'Loading...',
      },
    ];

    vi.mocked(useInventoryStore).mockImplementation(
      (selector: (state: InventoryStore) => unknown) => {
        const state = {
          items: mockItems,
          draggingItemId: null,
          consumingItemIds: [],
          selectedItemId: null,
          selectItem: vi.fn(),
          updateItemIcon: vi.fn(),
          setItemIconStatus: vi.fn(),
        } as unknown as InventoryStore;
        return selector(state);
      },
    );

    const { container } = render(<InventoryPanel />);

    // Check for loading class
    const loadingOverlay = container.querySelector('.inventory-item-icon-loading');
    expect(loadingOverlay).toBeInTheDocument();
  });

  it('displays empty state with hint when there are no items', () => {
    vi.mocked(useInventoryStore).mockImplementation(
      (selector: (state: InventoryStore) => unknown) => {
        const state = {
          items: [],
          draggingItemId: null,
          consumingItemIds: [],
          selectedItemId: null,
          selectItem: vi.fn(),
        } as unknown as InventoryStore;
        return selector(state);
      },
    );

    render(<InventoryPanel />);

    expect(screen.getByText('inventory.empty')).toBeInTheDocument();
    expect(screen.getByText('inventory.empty_hint')).toBeInTheDocument();
  });

  it('renders items in a row layout (U-088)', () => {
    const mockItems = [
      {
        id: 'item1',
        name: 'Magic Potion',
        quantity: 5,
        icon: '🧪',
        iconStatus: 'completed' as const,
      },
    ];

    vi.mocked(useInventoryStore).mockImplementation(
      (selector: (state: InventoryStore) => unknown) => {
        const state = {
          items: mockItems,
          draggingItemId: null,
          consumingItemIds: [],
          selectedItemId: null,
          selectItem: vi.fn(),
        } as unknown as InventoryStore;
        return selector(state);
      },
    );

    render(<InventoryPanel />);

    // 1. 아이템 컨테이너 확인
    const item = screen.getByLabelText('inventory.item_label');
    expect(item).toHaveClass('inventory-item');

    // 2. 아이콘 영역(드래그 핸들) 확인
    const iconContainer = item.querySelector('.inventory-item-icon');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveTextContent('🧪');

    // 3. 정보 영역(이름, 수량) 확인
    const infoContainer = item.querySelector('.inventory-item-info');
    expect(infoContainer).toBeInTheDocument();
    expect(infoContainer).toHaveTextContent('Magic Potion');
    expect(infoContainer).toHaveTextContent('x5');

    // 4. 구조적 순서 확인 (아이콘 -> 정보)
    const children = Array.from(item.children);
    expect(children[0]).toHaveClass('inventory-item-icon');
    expect(children[1]).toHaveClass('inventory-item-info');
  });

  it('handles item selection (U-088)', async () => {
    const mockSelectItem = vi.fn();
    const mockItems = [
      {
        id: 'item1',
        name: 'Magic Potion',
        quantity: 1,
        icon: '🧪',
        iconStatus: 'completed' as const,
      },
    ];

    vi.mocked(useInventoryStore).mockImplementation(
      (selector: (state: InventoryStore) => unknown) => {
        const state = {
          items: mockItems,
          draggingItemId: null,
          consumingItemIds: [],
          selectedItemId: 'item1', // item1이 이미 선택된 상태라고 가정
          selectItem: mockSelectItem,
        } as unknown as InventoryStore;
        return selector(state);
      },
    );

    render(<InventoryPanel />);

    const item = screen.getByLabelText('inventory.item_label');

    // 1. 선택된 상태 클래스 확인
    expect(item).toHaveClass('selected');
    expect(item).toHaveAttribute('aria-selected', 'true');

    // 2. 클릭 시 selectItem 호출 확인 (토글 기능이므로 null로 호출되어야 함)
    item.click();
    expect(mockSelectItem).toHaveBeenCalledWith(null);
  });
});
