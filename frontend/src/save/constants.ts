/**
 * Unknown World - 세션/경제 관련 상수 SSOT (U-116[Mvp]).
 *
 * U-116: SaveGame 시스템 제거 후 정리.
 * - SaveGame 버전/마이그레이션 관련 상수 제거
 * - 언어 설정 영속화용 키 추가
 * - 경제/판매 정책 상수 유지
 *
 * @module save/constants
 */

// =============================================================================
// localStorage 키 (Storage Keys)
// =============================================================================

/**
 * 언어 설정 저장 키 (U-116: Q1 Option B).
 *
 * SaveGame 제거 후에도 언어 설정만은 유지합니다.
 * 프로필 선택 시 이전 언어로 시작할 수 있습니다.
 */
export const LANGUAGE_STORAGE_KEY = 'unknown_world_language' as const;

// =============================================================================
// Legacy localStorage 키 (부팅 시 정리 대상)
// =============================================================================

/**
 * 레거시 SaveGame 저장 키.
 * U-116에서 SaveGame 제거 후, 기존 사용자 브라우저에 남아있는 데이터를 정리할 때 사용합니다.
 */
export const LEGACY_SAVEGAME_STORAGE_KEY = 'unknown_world_savegame' as const;

/**
 * 레거시 프로필 ID 저장 키.
 * U-116에서 SaveGame 제거 후, 기존 사용자 브라우저에 남아있는 데이터를 정리할 때 사용합니다.
 */
export const LEGACY_PROFILE_STORAGE_KEY = 'unknown_world_current_profile' as const;

// =============================================================================
// Seed 생성 정책
// =============================================================================

/**
 * 데모 seed 접두사.
 *
 * 데모 프로필에서 생성되는 seed의 접두사입니다.
 * seed 형식: `{DEMO_SEED_PREFIX}-{profileId}-{timestamp}`
 *
 * @example 'demo-narrator-1706000000000'
 */
export const DEMO_SEED_PREFIX = 'demo' as const;

/**
 * Seed를 생성합니다.
 *
 * 현재 정책(now 기반)에 따라 seed 문자열을 생성합니다.
 *
 * @param profileId - 프로필 ID
 * @returns seed 문자열
 */
export function generateDemoSeed(profileId: string): string {
  const now = Date.now();
  return `${DEMO_SEED_PREFIX}-${profileId}-${now}`;
}

// =============================================================================
// Economy 정책 상수
// =============================================================================

/**
 * 잔액 부족 경고 임계값 (Signal 기준).
 *
 * Signal 잔액이 이 값 미만이면 isBalanceLow가 true가 됩니다.
 * HUD에서 경고 표시 및 대체 행동 제안에 사용됩니다.
 *
 * @see economyStore.ts#updateBalanceLowStatus
 */
export const LOW_BALANCE_THRESHOLD = 10 as const;

/**
 * 거래 장부(Ledger) 최대 보관 개수.
 * 최근 N개의 턴 거래 장부만 보관합니다 (메모리 최적화).
 * @see economyStore.ts#addLedgerEntry
 */
export const LEDGER_MAX_ENTRIES = 20 as const;

// =============================================================================
// U-079: 아이템 판매 정책
// =============================================================================

/**
 * 아이템 판매 기본 가격 (Signal).
 *
 * MVP에서는 모든 아이템의 판매 가격이 고정입니다.
 * 향후 아이템별 가격 차등화가 가능합니다.
 *
 * @see InventoryPanel.tsx - 판매 버튼
 */
export const ITEM_SELL_PRICE_SIGNAL = 5 as const;

// =============================================================================
// 초기값 정책 (Placeholder vs 주입)
// =============================================================================

/**
 * World/Economy 초기값 정책 (문서화용 주석).
 *
 * Store의 createInitialState()에서 정의하는 economy 등의 값은
 * **"플레이 전 placeholder"**로 취급합니다.
 *
 * 실제 게임 시작 값은 항상 startSessionFromProfile()에서 주입됩니다.
 *
 * @see worldStore.ts#createInitialState
 * @see sessionLifecycle.ts
 */
export const INITIAL_VALUE_POLICY = {
  description: 'Placeholder values for pre-play state',
  worldEconomy: {
    signal: 100,
    memory_shard: 5,
  },
} as const;

// =============================================================================
// 데모 프로필 기본 재화 범위 (참고용)
// =============================================================================

/**
 * 데모 프로필 재화 범위 참고 (문서화용).
 *
 * 각 프로필의 초기 재화는 demoProfiles.ts에서 직접 정의합니다.
 * 이 상수는 "정책 범위"를 문서화하기 위한 참고용입니다.
 *
 * - Narrator: 풍부한 재화 (다양한 선택지 탐색)
 * - Explorer: 적당한 재화 (균형 잡힌 플레이)
 * - Tech: 제한된 재화 (효율적 전략 필요)
 *
 * @see demoProfiles.ts
 */
export const DEMO_PROFILE_ECONOMY_REFERENCE = {
  narrator: { signal: 200, memory_shard: 10 },
  explorer: { signal: 150, memory_shard: 5 },
  tech: { signal: 80, memory_shard: 15 },
} as const;
