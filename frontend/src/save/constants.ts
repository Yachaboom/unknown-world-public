/**
 * Unknown World - SaveGame/세션 관련 상수 SSOT (RU-004-Q5).
 *
 * 정책/초기값을 한 곳으로 모아 변경 시 누락 위험을 방지합니다.
 * 모든 SaveGame/세션 관련 상수는 이 파일에서 관리합니다.
 *
 * 설계 원칙:
 *   - RU-004-Q5: 하드코딩 정리 - 상수 중앙화
 *   - RULE-010: DB 도입 금지, SaveGame JSON 직렬화 기반
 *   - 향후 확장: U-026(리플레이), U-025(엔딩 리포트) 호환
 *
 * @module save/constants
 */

// =============================================================================
// SaveGame 버전 관리
// =============================================================================

/**
 * 현재 SaveGame 스키마 버전.
 *
 * 버전 변경 시:
 * 1. migrations.ts에 마이그레이션 함수 추가
 * 2. SUPPORTED_SAVEGAME_VERSIONS에 이전 버전 추가
 * 3. migrations.ts의 VERSION_ORDER에 새 버전 추가
 *
 * 버전 형식: semver (major.minor.patch)
 *
 * @see saveGame.ts#migrateSaveGame
 * @see migrations.ts#upgradeToLatest
 */
export const SAVEGAME_VERSION = '1.0.0' as const;

/**
 * 지원하는 SaveGame 버전 목록.
 *
 * 마이그레이션 가능한 이전 버전들을 포함합니다.
 * 이 목록에 없는 버전은 마이그레이션 불가로 처리됩니다.
 *
 * U-041: 마이그레이션 체인이 있는 모든 버전을 포함
 * - 0.9.0: 테스트/데모용 구버전 (sceneObjects, economyLedger 등 누락)
 * - 1.0.0: 현재 버전
 */
export const SUPPORTED_SAVEGAME_VERSIONS: readonly string[] = ['0.9.0', '1.0.0'] as const;

/**
 * 마이그레이션 가능한 최소 버전.
 *
 * 이 버전보다 낮은 버전은 마이그레이션이 불가능하며,
 * 저장 데이터가 폐기되고 새로 시작해야 합니다.
 *
 * U-041: migrations.ts의 VERSION_ORDER와 동기화 필요
 */
export const MIN_MIGRATABLE_VERSION = '0.9.0' as const;

// =============================================================================
// localStorage 키 (Storage Keys)
// =============================================================================

/**
 * SaveGame 저장 키.
 *
 * localStorage에서 세이브 데이터를 저장/로드할 때 사용합니다.
 * 이 키를 변경하면 기존 세이브 데이터가 무효화됩니다.
 */
export const SAVEGAME_STORAGE_KEY = 'unknown_world_savegame' as const;

/**
 * 현재 선택된 프로필 ID 저장 키.
 *
 * localStorage에서 현재 프로필 ID를 저장/로드할 때 사용합니다.
 * SaveGame.profileId가 SSOT이며, 이 키는 폴백/호환성용입니다.
 *
 * @see sessionLifecycle.ts#getInitialProfileId
 */
export const CURRENT_PROFILE_KEY = 'unknown_world_current_profile' as const;

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
 * Seed 생성 정책 (문서화용 주석).
 *
 * ## 현재 정책: now 기반 seed (세션 다양성 중시)
 *
 * 프로필 시작 시마다 새로운 seed가 생성됩니다.
 * - 장점: 매 세션마다 다른 초기 상태/이벤트 가능
 * - 단점: 데모 반복성(동일 시작) 보장 어려움
 *
 * ## 대안: 고정 seed (데모 반복성 중시)
 *
 * 프로필 ID만으로 seed를 생성합니다.
 * - 장점: 동일 프로필은 항상 동일한 시작 상태
 * - 단점: 세션 다양성 부족
 *
 * ## 향후 확장 (U-026: 리플레이)
 *
 * seed를 SaveGame에 저장하여 리플레이 시 동일 결과 재현 가능.
 * 엔딩 리포트(U-025)에서도 seed를 기록하여 결과 분석에 활용.
 *
 * @see demoProfiles.ts#profileToSaveGameInput
 */
export const SEED_POLICY = {
  /** 현재 적용 중인 정책 */
  current: 'timestamp' as const,
  /** 가능한 정책 목록 */
  options: ['timestamp', 'fixed', 'hybrid'] as const,
} as const;

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
 * ## 설계 원칙
 *
 * Store의 createInitialState()에서 정의하는 economy 등의 값은
 * **"플레이 전 placeholder"**로 취급합니다.
 *
 * 실제 게임 시작 값은 항상 다음 중 하나에서 주입됩니다:
 * 1. 프로필 초기 SaveGame (startSessionFromProfile)
 * 2. 저장된 SaveGame 복원 (continueSession)
 *
 * ## Placeholder 값의 의미
 *
 * - worldStore.economy: { signal: 100, memory_shard: 5 }
 *   → playing 진입 전 profile_select 상태에서는 HUD가 노출되지 않음
 *   → 따라서 이 값이 화면에 표시될 일은 없음
 *
 * ## 향후 개선 (S2 선행 필요)
 *
 * S2(잘못된 playing 진입)가 해결되면:
 * - economy: null 같은 "미초기화 상태"로 변경 가능
 * - playing 진입 전에 반드시 프로필/세이브 주입을 강제
 * - "placeholder가 화면에 보이는" 문제를 원천 차단
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
