/**
 * Unknown World - 아이템 아이콘 프리셋 레지스트리 (U-092[Mvp]).
 *
 * nanobanana mcp로 사전 제작된 아이템 아이콘의 매핑 테이블입니다.
 * 초기 데모 프로필 아이템 + 자주 등장하는 공통 아이템을 포함합니다.
 *
 * 설계 원칙:
 *   - RULE-007: nanobanana mcp는 개발/에셋 제작용으로만 사용 (정적 배포)
 *   - Q2 결정: icon_url이 있으면 항상 프리셋 우선 (동적 생성 건너뛰기)
 *   - 에셋 SSOT: frontend/public/ui/items/ 경로, kebab-case, 64x64 PNG
 *
 * @module data/itemIconPresets
 */

// =============================================================================
// 프리셋 아이콘 경로 상수
// =============================================================================

/** 아이템 아이콘 에셋 기본 경로 (public 디렉토리 기준) */
const ITEMS_BASE = '/ui/items';

// =============================================================================
// 프리셋 레지스트리
// =============================================================================

/**
 * 아이템 ID → 프리셋 아이콘 URL 매핑.
 *
 * 키: 아이템 ID (kebab-case, demoProfiles 및 GM 출력에서 사용하는 ID)
 * 값: 정적 에셋 URL 경로 (/ui/items/xxx-64.png)
 *
 * 게임 도중 GM이 생성하는 아이템의 ID가 이 맵에 존재하면
 * 동적 생성을 건너뛰고 프리셋 아이콘을 즉시 사용합니다.
 */
export const ITEM_ICON_PRESETS: Readonly<Record<string, string>> = {
  // ─── 초기 아이템: Narrator 프로필 ───
  'ancient-tome': `${ITEMS_BASE}/ancient-tome-64.png`,
  'quill-pen': `${ITEMS_BASE}/quill-pen-64.png`,
  'memory-fragment': `${ITEMS_BASE}/memory-fragment-64.png`,

  // ─── 초기 아이템: Explorer 프로필 ───
  compass: `${ITEMS_BASE}/compass-64.png`,
  rope: `${ITEMS_BASE}/rope-64.png`,
  lantern: `${ITEMS_BASE}/lantern-64.png`,
  'map-fragment': `${ITEMS_BASE}/map-fragment-64.png`,

  // ─── 초기 아이템: Tech Enthusiast 프로필 ───
  'data-core': `${ITEMS_BASE}/data-core-64.png`,
  'circuit-board': `${ITEMS_BASE}/circuit-board-64.png`,
  'energy-cell': `${ITEMS_BASE}/energy-cell-64.png`,
  'scanner-device': `${ITEMS_BASE}/scanner-device-64.png`,

  // ─── 공통 아이템 (게임 중 자주 등장) ───
  sword: `${ITEMS_BASE}/sword-64.png`,
  shield: `${ITEMS_BASE}/shield-64.png`,
  potion: `${ITEMS_BASE}/potion-64.png`,
  key: `${ITEMS_BASE}/key-64.png`,
  gem: `${ITEMS_BASE}/gem-64.png`,
  scroll: `${ITEMS_BASE}/scroll-64.png`,
  torch: `${ITEMS_BASE}/torch-64.png`,
  herb: `${ITEMS_BASE}/herb-64.png`,
  coin: `${ITEMS_BASE}/coin-64.png`,
  ring: `${ITEMS_BASE}/ring-64.png`,
  amulet: `${ITEMS_BASE}/amulet-64.png`,
  dagger: `${ITEMS_BASE}/dagger-64.png`,
  flask: `${ITEMS_BASE}/flask-64.png`,
  crystal: `${ITEMS_BASE}/crystal-64.png`,
  lockpick: `${ITEMS_BASE}/lockpick-64.png`,
} as const;

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 아이템 ID로 프리셋 아이콘 URL을 조회합니다.
 *
 * @param itemId - 아이템 ID (kebab-case)
 * @returns 프리셋 아이콘 URL 또는 undefined (프리셋 없음)
 */
export function getPresetIconUrl(itemId: string): string | undefined {
  // 정확한 ID 매칭
  if (itemId in ITEM_ICON_PRESETS) {
    return ITEM_ICON_PRESETS[itemId];
  }

  // 부분 매칭: 아이템 ID에 프리셋 키가 포함된 경우 (예: "rusty-sword" → "sword")
  for (const [key, url] of Object.entries(ITEM_ICON_PRESETS)) {
    if (itemId.includes(key)) {
      return url;
    }
  }

  return undefined;
}

/**
 * 아이템 ID에 프리셋 아이콘이 존재하는지 확인합니다.
 *
 * @param itemId - 아이템 ID
 * @returns 프리셋 존재 여부
 */
export function hasPresetIcon(itemId: string): boolean {
  return getPresetIconUrl(itemId) !== undefined;
}
