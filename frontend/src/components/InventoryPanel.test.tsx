import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InventoryPanel } from './InventoryPanel';
import { useInventoryStore } from '../stores/inventoryStore';
import { ITEM_SELL_PRICE_SIGNAL } from '../save/constants';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'inventory.sell_tooltip' || key === 'inventory.sell_aria') {
        return `${key} (price: ${params?.price})`;
      }
      return key;
    },
    i18n: {
      language: 'ko',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

// worldStore 모킹
const mockSellItem = vi.fn();
vi.mock('../stores/worldStore', () => ({
  useWorldStore: <T,>(selector: (state: { sellItem: typeof mockSellItem }) => T) => {
    const state = {
      sellItem: mockSellItem,
    };
    return selector ? selector(state) : state;
  },
}));

// dnd-kit 모킹
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
    act(() => {
      useInventoryStore.getState().reset();
    });
  });

  it('should apply drag listeners and attributes to the entire row div', () => {
    act(() => {
      useInventoryStore.getState().addItems([
        {
          id: 'test-item-1',
          name: 'Test Item 1',
          quantity: 1,
          icon: '📦',
        },
      ]);
    });

    render(<InventoryPanel />);

    const itemRow = screen.getByRole('listbox').children[0];
    expect(itemRow).toHaveAttribute('role', 'button');
    expect(itemRow).toHaveAttribute('aria-describedby', 'DndDescribedBy-test-item-1');
    expect(itemRow).toHaveClass('inventory-item');
  });

  it('should render only the icon in DragOverlay when dragging', () => {
    const testItem = {
      id: 'test-drag-item',
      name: 'Dragging Item',
      quantity: 1,
      icon: '🔥',
    };
    act(() => {
      useInventoryStore.getState().addItems([testItem]);
      useInventoryStore.getState().startDrag(testItem.id);
    });

    render(<InventoryPanel />);

    const overlay = screen.getByTestId('drag-overlay');
    const ghostIcon = overlay.querySelector('.inventory-overlay-icon');
    expect(ghostIcon).toBeInTheDocument();
    expect(ghostIcon).toHaveTextContent('🔥');
    expect(ghostIcon).not.toHaveTextContent('Dragging Item');
  });
});

describe('InventoryPanel (U-129: Sell UX)', () => {
  beforeEach(() => {
    act(() => {
      useInventoryStore.getState().reset();
    });
    mockSellItem.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should always show sell button with correct price', () => {
    act(() => {
      useInventoryStore.getState().addItems([
        {
          id: 'test-item',
          name: 'Sellable Item',
          quantity: 1,
          icon: '💎',
        },
      ]);
    });

    render(<InventoryPanel />);

    const sellBtn = screen.getByRole('button', { name: /inventory.sell_aria/ });
    expect(sellBtn).toBeInTheDocument();
    expect(sellBtn).toHaveTextContent(`+${ITEM_SELL_PRICE_SIGNAL}`);
  });

  it('should transition to confirm state on first click', () => {
    act(() => {
      useInventoryStore.getState().addItems([
        {
          id: 'test-item',
          name: 'Sellable Item',
          quantity: 1,
          icon: '💎',
        },
      ]);
    });

    render(<InventoryPanel />);

    const sellBtn = screen.getByRole('button', { name: /inventory.sell_aria/ });
    act(() => {
      fireEvent.click(sellBtn);
    });

    expect(sellBtn).toHaveTextContent('inventory.sell_confirm');
    expect(sellBtn).toHaveClass('confirming');
    expect(mockSellItem).not.toHaveBeenCalled();
  });

  it('should execute sellItem on second click within 2 seconds', () => {
    act(() => {
      useInventoryStore.getState().addItems([
        {
          id: 'test-item',
          name: 'Sellable Item',
          quantity: 1,
          icon: '💎',
        },
      ]);
    });

    render(<InventoryPanel />);

    const sellBtn = screen.getByRole('button', { name: /inventory.sell_aria/ });
    act(() => {
      fireEvent.click(sellBtn);
    });
    act(() => {
      fireEvent.click(sellBtn);
    });

    expect(mockSellItem).toHaveBeenCalledWith('test-item', 'Sellable Item');
    expect(sellBtn).not.toHaveClass('confirming');
  });

  it('should revert to normal state after 2 seconds without second click', () => {
    act(() => {
      useInventoryStore.getState().addItems([
        {
          id: 'test-item',
          name: 'Sellable Item',
          quantity: 1,
          icon: '💎',
        },
      ]);
    });

    render(<InventoryPanel />);

    const sellBtn = screen.getByRole('button', { name: /inventory.sell_aria/ });
    act(() => {
      fireEvent.click(sellBtn);
    });
    expect(sellBtn).toHaveClass('confirming');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(sellBtn).not.toHaveClass('confirming');
    expect(sellBtn).toHaveTextContent(`+${ITEM_SELL_PRICE_SIGNAL}`);
    expect(mockSellItem).not.toHaveBeenCalled();
  });
});
