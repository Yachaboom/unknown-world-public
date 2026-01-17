/**
 * Unknown World - DnD 타입 및 상수 정의 (RU-003-Q1).
 *
 * DnD 데이터 계약을 SSOT로 관리하여 타입 안전성을 확보합니다.
 * 모든 드래그/드롭 이벤트에서 동일한 상수/타입을 사용합니다.
 *
 * 설계 원칙:
 *   - SSOT: 드래그/드롭 타입 문자열은 이 모듈에서만 정의
 *   - 타입 안전성: dnd-kit의 data.current를 타입 가드로 검증
 *   - 과도한 추상화 금지: 상수/타입만 제공, 로직은 컴포넌트에 유지
 *
 * @module dnd/types
 */

import type { Box2D } from '../schemas/turn';
import type { InventoryItem } from '../stores/inventoryStore';

// =============================================================================
// DnD 타입 상수 (SSOT)
// =============================================================================

/**
 * DnD 타입 상수.
 * 드래그/드롭 데이터의 type 필드에 사용됩니다.
 */
export const DND_TYPE = {
  /** 인벤토리 아이템 드래그 */
  INVENTORY_ITEM: 'inventory-item',
  /** 핫스팟 드롭 타겟 */
  HOTSPOT: 'hotspot',
} as const;

/**
 * DnD 타입 유니온.
 */
export type DndType = (typeof DND_TYPE)[keyof typeof DND_TYPE];

// =============================================================================
// 드래그 데이터 타입
// =============================================================================

/**
 * 인벤토리 아이템 드래그 데이터.
 * InventoryPanel에서 드래그 시작 시 설정됩니다.
 */
export interface InventoryDragData {
  /** 드래그 타입 (항상 'inventory-item') */
  type: typeof DND_TYPE.INVENTORY_ITEM;
  /** 드래그 중인 아이템 ID */
  item_id: string;
  /** 드래그 중인 아이템 객체 */
  item: InventoryItem;
}

// =============================================================================
// 드롭 데이터 타입
// =============================================================================

/**
 * 핫스팟 드롭 타겟 데이터.
 * SceneCanvas의 핫스팟에서 설정됩니다.
 */
export interface HotspotDropData {
  /** 드롭 타겟 타입 (항상 'hotspot') */
  type: typeof DND_TYPE.HOTSPOT;
  /** 핫스팟 오브젝트 ID */
  object_id: string;
  /** 핫스팟 바운딩 박스 (0~1000 정규화) */
  box_2d: Box2D;
  /** 핫스팟 라벨 (표시용) */
  label: string;
}

// =============================================================================
// 타입 가드 함수
// =============================================================================

/**
 * 데이터가 InventoryDragData인지 검사합니다.
 *
 * @param data - dnd-kit의 active.data.current
 * @returns InventoryDragData이면 true
 */
export function isInventoryDragData(data: unknown): data is InventoryDragData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    obj.type === DND_TYPE.INVENTORY_ITEM &&
    typeof obj.item_id === 'string' &&
    typeof obj.item === 'object' &&
    obj.item !== null
  );
}

/**
 * 데이터가 HotspotDropData인지 검사합니다.
 *
 * @param data - dnd-kit의 over.data.current
 * @returns HotspotDropData이면 true
 */
export function isHotspotDropData(data: unknown): data is HotspotDropData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    obj.type === DND_TYPE.HOTSPOT &&
    typeof obj.object_id === 'string' &&
    typeof obj.box_2d === 'object' &&
    obj.box_2d !== null &&
    typeof obj.label === 'string'
  );
}
