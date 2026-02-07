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
 * U-075[Mvp]: 아이템 아이콘 동적 생성
 *   - Q1: Option B (placeholder 먼저 표시 후 백그라운드 생성)
 *   - 아이콘 생성 상태 추적 및 URL 업데이트
 *
 * @module stores/inventoryStore
 */

import { create } from 'zustand';
// U-092: 프리셋 아이콘 레지스트리
import { getPresetIconUrl } from '../data/itemIconPresets';

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 아이콘 생성 상태.
 */
export type IconStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'cached';

/**
 * 인벤토리 아이템.
 * MVP에서는 최소 필드만 정의합니다.
 *
 * U-075: icon 필드는 URL 또는 이모지, iconStatus로 생성 상태 추적
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
  /** U-075: 아이콘 생성 상태 (선택) */
  iconStatus?: IconStatus;
}

/** Inventory 상태 */
export interface InventoryState {
  /** 현재 아이템 목록 */
  items: InventoryItem[];
  /** 현재 드래그 중인 아이템 ID (null이면 드래그 중 아님) */
  draggingItemId: string | null;
  /** 선택된 아이템 ID (클릭 선택, 드래그와 별개) */
  selectedItemId: string | null;
  /** U-096: 소비(삭제) 애니메이션 진행 중인 아이템 ID 집합 */
  consumingItemIds: string[];
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
  /** U-075: 아이템 아이콘 업데이트 */
  updateItemIcon: (itemId: string, icon: string, status: IconStatus) => void;
  /** U-075: 아이템 아이콘 상태만 업데이트 */
  setItemIconStatus: (itemId: string, status: IconStatus) => void;
  /**
   * U-096: 아이템을 소비(삭제) 애니메이션 상태로 전환합니다.
   * fade-out 애니메이션 시작 시 호출합니다.
   */
  markConsuming: (itemIds: string[]) => void;
  /**
   * U-096: 소비 애니메이션 완료 후 아이템을 실제로 제거합니다.
   * markConsuming → (애니메이션 대기) → clearConsuming 순서로 호출합니다.
   */
  clearConsuming: (itemIds: string[]) => void;
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
    consumingItemIds: [],
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
      const countsToRemove = itemIds.reduce(
        (acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const nextItems = state.items
        .map((item) => {
          const toRemove = countsToRemove[item.id];
          if (!toRemove) return item;

          const nextQuantity = item.quantity - toRemove;
          if (nextQuantity <= 0) return null; // 수량이 0 이하면 제거
          return { ...item, quantity: nextQuantity };
        })
        .filter((item): item is InventoryItem => item !== null);

      const removedIds = new Set(
        state.items
          .filter((item) => !nextItems.find((ni) => ni.id === item.id))
          .map((item) => item.id),
      );

      return {
        items: nextItems,
        // 완전히 제거된 아이템이 선택/드래그 중이었다면 초기화
        selectedItemId: removedIds.has(state.selectedItemId ?? '') ? null : state.selectedItemId,
        draggingItemId: removedIds.has(state.draggingItemId ?? '') ? null : state.draggingItemId,
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

  // U-075: 아이템 아이콘 업데이트
  updateItemIcon: (itemId, icon, status) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, icon, iconStatus: status } : item,
      ),
    }));
  },

  // U-075: 아이템 아이콘 상태만 업데이트
  setItemIconStatus: (itemId, status) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, iconStatus: status } : item,
      ),
    }));
  },

  // U-096: 아이템 소비 애니메이션 시작
  markConsuming: (itemIds) => {
    set((state) => ({
      consumingItemIds: [...new Set([...state.consumingItemIds, ...itemIds])],
    }));
  },

  // U-096: 소비 애니메이션 완료 후 실제 제거
  clearConsuming: (itemIds) => {
    set((state) => {
      const countsToRemove = itemIds.reduce(
        (acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const nextItems = state.items
        .map((item) => {
          const toRemove = countsToRemove[item.id];
          if (!toRemove) return item;

          const nextQuantity = item.quantity - toRemove;
          if (nextQuantity <= 0) return null;
          return { ...item, quantity: nextQuantity };
        })
        .filter((item): item is InventoryItem => item !== null);

      const removedIds = new Set(
        state.items
          .filter((item) => !nextItems.find((ni) => ni.id === item.id))
          .map((item) => item.id),
      );

      const removeSet = new Set(itemIds);
      return {
        items: nextItems,
        consumingItemIds: state.consumingItemIds.filter((id) => !removeSet.has(id)),
        // 완전히 제거된 아이템이 선택/드래그 중이었다면 초기화
        selectedItemId: removedIds.has(state.selectedItemId ?? '') ? null : state.selectedItemId,
        draggingItemId: removedIds.has(state.draggingItemId ?? '') ? null : state.draggingItemId,
      };
    });
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

/** U-096: 소비 중인 아이템 ID 목록 셀렉터 */
export const selectConsumingItemIds = (state: InventoryStore) => state.consumingItemIds;

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 서버 응답(inventory_added InventoryItemData 배열)을 InventoryItem 배열로 변환합니다.
 *
 * @param added - 추가된 아이템 데이터 목록 (서버 응답)
 * @returns InventoryItem 배열
 */
export function parseInventoryAdded(added: InventoryItemDataInput[]): InventoryItem[] {
  return added.map((item) => {
    // U-092: 프리셋 아이콘 우선 (Q2: icon_url이 있으면 항상 프리셋 우선, 동적 생성 건너뛰기)
    const presetUrl = getPresetIconUrl(item.id);
    const iconUrl = presetUrl ?? item.icon_url ?? undefined;
    const status: IconStatus = iconUrl ? 'completed' : 'pending';

    return {
      id: item.id,
      name: item.label,
      description: item.description || item.label,
      icon: iconUrl,
      quantity: item.quantity ?? 1,
      iconStatus: status,
    };
  });
}

/** 서버에서 오는 InventoryItemData 형태 (Zod 스키마와 동일) */
export interface InventoryItemDataInput {
  id: string;
  label: string;
  description?: string;
  icon_url?: string | null;
  quantity?: number;
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

// =============================================================================
// U-075: 아이콘 생성 API
// =============================================================================

/** 아이콘 생성 API 응답 */
interface IconApiResponse {
  status: string;
  icon_url: string;
  item_id: string;
  is_placeholder: boolean;
  message?: string;
}

/**
 * 아이템 아이콘 생성을 요청합니다 (U-075[Mvp]).
 *
 * Q1 결정: Option B - placeholder 먼저 반환, 백그라운드 생성
 *
 * @param itemId - 아이템 ID
 * @param description - 아이템 설명
 * @param language - 세션 언어
 * @returns 아이콘 URL 및 상태
 */
export async function requestItemIcon(
  itemId: string,
  description: string,
  language: string = 'ko-KR',
): Promise<{ iconUrl: string; status: IconStatus; isPlaceholder: boolean }> {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8011';

  try {
    const response = await fetch(`${apiUrl}/api/item/icon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: itemId,
        description: description,
        language: language,
        wait: false, // Q1: placeholder 즉시 반환
      }),
    });

    if (!response.ok) {
      console.warn(`[ItemIcon] API 요청 실패: ${response.status}`);
      return { iconUrl: '', status: 'failed', isPlaceholder: true };
    }

    const data: IconApiResponse = await response.json();
    return {
      iconUrl: data.icon_url,
      status: data.status as IconStatus,
      isPlaceholder: data.is_placeholder,
    };
  } catch (error) {
    console.warn('[ItemIcon] 아이콘 생성 요청 실패:', error);
    return { iconUrl: '', status: 'failed', isPlaceholder: true };
  }
}

/**
 * 아이콘 생성 상태를 폴링합니다 (U-075[Mvp]).
 *
 * @param itemId - 아이템 ID
 * @returns 현재 상태
 */
export async function pollIconStatus(itemId: string): Promise<IconStatus> {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8011';

  try {
    const response = await fetch(`${apiUrl}/api/item/icon/${itemId}/status`);

    if (!response.ok) {
      return 'failed';
    }

    const data = await response.json();
    return data.status as IconStatus;
  } catch {
    return 'failed';
  }
}
