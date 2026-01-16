/**
 * Unknown World - Inventory 상태 관리 (Zustand) (U-011[Mvp]).
 *
 * Inventory의 아이템 목록, 드래그 상태, 선택 상태를 관리합니다.
 *
 * 설계 원칙:
 *   - RULE-002: Inventory는 게임 UI로 상시 노출
 *   - U-006 의존: WorldDelta.inventory_added / inventory_removed 필드 연동
 *   - U-012 연결: 드래그 데이터에 item_id를 실어 드롭 타겟(핫스팟)에 전달
 *
 * @module stores/inventoryStore
 */

import { create } from 'zustand';

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 인벤토리 아이템.
 * MVP에서는 최소 필드만 정의합니다.
 */
export interface InventoryItem {
  /** 아이템 고유 ID */
  id: string;
  /** 아이템 이름 (표시용) */
  name: string;
  /** 아이템 설명 (선택) */
  description?: string;
  /** 아이템 아이콘 URL 또는 이모지 (선택) */
  icon?: string;
  /** 아이템 수량 (기본값: 1) */
  quantity: number;
}

/** Inventory 상태 */
export interface InventoryState {
  /** 현재 아이템 목록 */
  items: InventoryItem[];
  /** 현재 드래그 중인 아이템 ID (null이면 드래그 중 아님) */
  draggingItemId: string | null;
  /** 선택된 아이템 ID (클릭 선택, 드래그와 별개) */
  selectedItemId: string | null;
}

/** Inventory 액션 */
export interface InventoryActions {
  /** 아이템 목록 설정 (전체 교체) */
  setItems: (items: InventoryItem[]) => void;
  /** 아이템 추가 (중복 ID면 수량 증가) */
  addItems: (items: InventoryItem[]) => void;
  /** 아이템 제거 (ID 목록) */
  removeItems: (itemIds: string[]) => void;
  /** 드래그 시작 */
  startDrag: (itemId: string) => void;
  /** 드래그 종료 */
  endDrag: () => void;
  /** 아이템 선택 */
  selectItem: (itemId: string | null) => void;
  /** 상태 초기화 */
  reset: () => void;
}

export type InventoryStore = InventoryState & InventoryActions;

// =============================================================================
// 초기 상태
// =============================================================================

function createInitialState(): InventoryState {
  return {
    items: [],
    draggingItemId: null,
    selectedItemId: null,
  };
}

// =============================================================================
// Zustand Store
// =============================================================================

/**
 * Inventory 상태 스토어.
 *
 * @example
 * ```tsx
 * const { items, addItems, removeItems, startDrag, endDrag } = useInventoryStore();
 *
 * // TurnOutput.world.inventory_added 수신 시
 * addItems(inventoryAddedItems);
 *
 * // TurnOutput.world.inventory_removed 수신 시
 * removeItems(inventoryRemovedIds);
 *
 * // dnd-kit onDragStart
 * startDrag(itemId);
 *
 * // dnd-kit onDragEnd
 * endDrag();
 * ```
 */
export const useInventoryStore = create<InventoryStore>((set) => ({
  // 초기 상태
  ...createInitialState(),

  // 액션
  setItems: (items) => {
    set({
      items,
      draggingItemId: null,
      selectedItemId: null,
    });
  },

  addItems: (newItems) => {
    set((state) => {
      const itemsMap = new Map(state.items.map((item) => [item.id, item]));

      for (const newItem of newItems) {
        const existing = itemsMap.get(newItem.id);
        if (existing) {
          // 기존 아이템이면 수량 증가
          itemsMap.set(newItem.id, {
            ...existing,
            quantity: existing.quantity + newItem.quantity,
          });
        } else {
          // 새 아이템 추가
          itemsMap.set(newItem.id, newItem);
        }
      }

      return { items: Array.from(itemsMap.values()) };
    });
  },

  removeItems: (itemIds) => {
    set((state) => {
      const removeSet = new Set(itemIds);
      return {
        items: state.items.filter((item) => !removeSet.has(item.id)),
        // 제거된 아이템이 선택/드래그 중이었다면 초기화
        selectedItemId: removeSet.has(state.selectedItemId ?? '') ? null : state.selectedItemId,
        draggingItemId: removeSet.has(state.draggingItemId ?? '') ? null : state.draggingItemId,
      };
    });
  },

  startDrag: (itemId) => {
    set({ draggingItemId: itemId });
  },

  endDrag: () => {
    set({ draggingItemId: null });
  },

  selectItem: (itemId) => {
    set({ selectedItemId: itemId });
  },

  reset: () => {
    set(createInitialState());
  },
}));

// =============================================================================
// 셀렉터 (성능 최적화용)
// =============================================================================

/** 아이템 목록 셀렉터 */
export const selectItems = (state: InventoryStore) => state.items;

/** 드래그 중인 아이템 ID 셀렉터 */
export const selectDraggingItemId = (state: InventoryStore) => state.draggingItemId;

/** 드래그 중인 아이템 객체 셀렉터 */
export const selectDraggingItem = (state: InventoryStore) =>
  state.items.find((item) => item.id === state.draggingItemId) ?? null;

/** 선택된 아이템 ID 셀렉터 */
export const selectSelectedItemId = (state: InventoryStore) => state.selectedItemId;

/** 선택된 아이템 객체 셀렉터 */
export const selectSelectedItem = (state: InventoryStore) =>
  state.items.find((item) => item.id === state.selectedItemId) ?? null;

/** 아이템 개수 셀렉터 */
export const selectItemCount = (state: InventoryStore) => state.items.length;

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 서버 응답(inventory_added 문자열 배열)을 InventoryItem 배열로 변환합니다.
 * MVP에서는 문자열 ID를 기본 아이템으로 변환합니다.
 *
 * @param addedIds - 추가된 아이템 ID 목록 (서버 응답)
 * @returns InventoryItem 배열
 */
export function parseInventoryAdded(addedIds: string[]): InventoryItem[] {
  return addedIds.map((id) => ({
    id,
    name: id, // MVP: ID를 이름으로 사용
    quantity: 1,
  }));
}

/**
 * 아이템 ID로 아이템을 찾습니다.
 *
 * @param items - 아이템 목록
 * @param itemId - 찾을 아이템 ID
 * @returns 아이템 또는 undefined
 */
export function findItemById(items: InventoryItem[], itemId: string): InventoryItem | undefined {
  return items.find((item) => item.id === itemId);
}
