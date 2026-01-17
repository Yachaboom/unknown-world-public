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

// =============================================================================
// RU-003-S2: 인터랙션 허용 정책 (SSOT)
// =============================================================================

/**
 * 핫스팟 인터랙션이 허용되는 Scene 상태 목록.
 *
 * RU-003-S2 Step 1: Option A(데모 유지) 결정
 * - 'scene': 실제 장면 활성화 상태
 * - 'default': 데모/플레이스홀더 상태 (시각적 힌트 필요)
 *
 * @see SceneCanvas.tsx의 shouldRenderHotspots 조건
 */
export const HOTSPOT_INTERACTION_ALLOWED_STATES = ['scene', 'default'] as const;

/**
 * 인터랙션 허용 상태 타입.
 */
export type HotspotInteractionState = (typeof HOTSPOT_INTERACTION_ALLOWED_STATES)[number];

/**
 * 주어진 상태에서 핫스팟 인터랙션이 허용되는지 검사합니다.
 *
 * RU-003-S2: 인터랙션 가능 조건을 SSOT로 고정
 *
 * @param status - Scene 상태
 * @returns 인터랙션 허용 여부
 */
export function isHotspotInteractionAllowed(status: string): boolean {
  return HOTSPOT_INTERACTION_ALLOWED_STATES.includes(status as HotspotInteractionState);
}

// =============================================================================
// RU-003-S2 Step 4: 스트리밍 비활성화 정책 (SSOT)
// =============================================================================

/**
 * 스트리밍 비활성화 정책.
 *
 * RU-003-S2 Step 4: disabled 플래그의 SSOT 고정
 * - isStreaming은 agentStore에서만 제공
 * - 모든 인터랙션 컴포넌트(SceneCanvas, InventoryPanel, ActionDeck)는
 *   동일한 disabled 플래그를 공유해야 함
 * - 향후 worldStore/Turn Runner 도입 시에도 이 원칙을 유지
 *
 * @see App.tsx의 isStreaming 사용 패턴
 * @see agentStore.ts의 isStreaming 상태
 */
export const STREAMING_DISABLED_POLICY = {
  /** 스트리밍 상태 SSOT 출처 */
  source: 'agentStore.isStreaming',
  /** 비활성화 적용 대상 컴포넌트 */
  affectedComponents: ['SceneCanvas', 'InventoryPanel', 'ActionDeck', 'CommandInput'],
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

// =============================================================================
// RU-003-S2 Step 2: 핫스팟 우선순위 정책 (SSOT)
// =============================================================================

/**
 * 바운딩 박스의 면적을 계산합니다.
 *
 * @param box - { ymin, xmin, ymax, xmax } 형식의 바운딩 박스
 * @returns 박스 면적
 */
export function calculateBoxArea(box: Box2D): number {
  const { ymin, xmin, ymax, xmax } = box;
  return Math.abs(ymax - ymin) * Math.abs(xmax - xmin);
}

/**
 * 핫스팟 우선순위 계산을 위한 비교 함수.
 *
 * RU-003-S2 Step 2: 작은 bbox가 더 높은 우선순위를 가짐
 * - 더 작은 오브젝트가 더 구체적인 타겟이라고 가정
 * - z-index 관점에서 작은 것이 위에 렌더되어야 함
 *
 * @param a - 첫 번째 바운딩 박스
 * @param b - 두 번째 바운딩 박스
 * @returns 정렬 순서 (작은 것이 뒤로 가서 z-index가 높아짐)
 */
export function compareHotspotPriority(a: Box2D, b: Box2D): number {
  return calculateBoxArea(b) - calculateBoxArea(a);
}
