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
    selectSelectedItemId: (state: InventoryStore) => state.selectedItemId,
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
});
