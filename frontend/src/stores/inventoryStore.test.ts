import { describe, it, expect, beforeEach } from 'vitest';
import { useInventoryStore, parseInventoryAdded } from './inventoryStore';

describe('inventoryStore', () => {
  beforeEach(() => {
    useInventoryStore.getState().reset();
  });

  it('초기 상태는 비어 있어야 한다', () => {
    const state = useInventoryStore.getState();
    expect(state.items).toEqual([]);
    expect(state.draggingItemId).toBeNull();
    expect(state.selectedItemId).toBeNull();
  });

  it('addItems: 새 아이템을 추가할 수 있어야 한다', () => {
    const { addItems } = useInventoryStore.getState();
    const newItem = { id: 'item1', name: 'Item 1', quantity: 1 };

    addItems([newItem]);

    const state = useInventoryStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual(newItem);
  });

  it('addItems: 중복된 ID의 아이템 추가 시 수량이 증가해야 한다', () => {
    const { addItems } = useInventoryStore.getState();
    const item1 = { id: 'item1', name: 'Item 1', quantity: 1 };

    addItems([item1]);
    addItems([{ id: 'item1', name: 'Item 1', quantity: 2 }]);

    const state = useInventoryStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
  });

  it('removeItems: 아이템을 제거할 수 있어야 한다', () => {
    const { addItems, removeItems } = useInventoryStore.getState();
    addItems([
      { id: 'item1', name: 'Item 1', quantity: 1 },
      { id: 'item2', name: 'Item 2', quantity: 1 },
    ]);

    removeItems(['item1']);

    const state = useInventoryStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('item2');
  });

  it('removeItems: 제거된 아이템이 선택/드래그 중이면 초기화해야 한다', () => {
    const { addItems, removeItems, selectItem, startDrag } = useInventoryStore.getState();
    addItems([{ id: 'item1', name: 'Item 1', quantity: 1 }]);

    selectItem('item1');
    startDrag('item1');

    removeItems(['item1']);

    const state = useInventoryStore.getState();
    expect(state.selectedItemId).toBeNull();
    expect(state.draggingItemId).toBeNull();
  });

  it('startDrag/endDrag: 드래그 상태를 관리해야 한다', () => {
    const { startDrag, endDrag } = useInventoryStore.getState();

    startDrag('item1');
    expect(useInventoryStore.getState().draggingItemId).toBe('item1');

    endDrag();
    expect(useInventoryStore.getState().draggingItemId).toBeNull();
  });

  it('parseInventoryAdded: 문자열 ID 목록을 InventoryItem 배열로 변환해야 한다 (U-075)', () => {
    const addedIds = ['item-a', 'item-b'];
    const parsed = parseInventoryAdded(addedIds);

    expect(parsed).toHaveLength(2);
    // U-075: description과 iconStatus 필드 추가됨
    expect(parsed[0]).toEqual({
      id: 'item-a',
      name: 'item-a',
      description: 'item-a',
      quantity: 1,
      iconStatus: 'pending',
    });
    expect(parsed[1]).toEqual({
      id: 'item-b',
      name: 'item-b',
      description: 'item-b',
      quantity: 1,
      iconStatus: 'pending',
    });
  });
});
