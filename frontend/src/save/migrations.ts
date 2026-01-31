/**
 * Unknown World - SaveGame 버전 마이그레이션 모듈 (U-041[Mvp]).
 *
 * SaveGame 스키마가 변경되어도 기존 저장 데이터를 최신 버전으로 변환하여
 * 데모 루프가 끊기지 않도록 합니다.
 *
 * 설계 원칙:
 *   - RULE-005: economy 마이그레이션 시 잔액 음수 금지
 *   - RULE-010: 버전/스택 고정, 임의 변경 금지
 *   - U-041: "버전 판별 → 마이그레이션 → 검증" 흐름
 *
 * @module save/migrations
 */

import { SAVEGAME_VERSION, SUPPORTED_SAVEGAME_VERSIONS } from './constants';

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 단일 마이그레이션 단계.
 *
 * from 버전에서 to 버전으로 SaveGame 데이터를 변환합니다.
 */
export interface Migration {
  /** 소스 버전 */
  from: string;
  /** 타겟 버전 */
  to: string;
  /** 변환 함수 - unknown 입력을 받아 unknown 출력 (스키마 검증은 최종 단계에서) */
  migrate: (input: unknown) => unknown;
  /** 마이그레이션 설명 (로깅/디버그용) */
  description: string;
}

/**
 * 마이그레이션 결과.
 */
export interface MigrationResult {
  success: true;
  data: unknown;
  migratedFrom: string;
  migratedTo: string;
  appliedMigrations: string[];
}

/**
 * 마이그레이션 실패 결과.
 */
export interface MigrationFailure {
  success: false;
  error: string;
  originalVersion: string;
}

export type MigrationOutcome = MigrationResult | MigrationFailure;

// =============================================================================
// 마이그레이션 체인 정의
// =============================================================================

/**
 * 버전 순서 맵.
 *
 * 마이그레이션 경로를 결정하기 위한 버전 순서입니다.
 * 낮은 인덱스 = 더 오래된 버전
 */
const VERSION_ORDER: readonly string[] = [
  '0.9.0', // 예시 구버전 (테스트/데모용)
  '1.0.0', // 현재 버전
] as const;

/**
 * 버전별 마이그레이션 정의.
 *
 * 각 마이그레이션은 from → to 변환을 정의합니다.
 * 체인으로 연결되어 여러 버전을 건너뛰어도 순차 적용됩니다.
 */
const MIGRATIONS: readonly Migration[] = [
  {
    from: '0.9.0',
    to: '1.0.0',
    description: '0.9.0 → 1.0.0: sceneObjects 필드 추가, economy 필드명 정규화',
    migrate: (input: unknown): unknown => {
      const data = input as Record<string, unknown>;

      // 1. sceneObjects 필드가 없으면 빈 배열로 추가
      if (!Array.isArray(data.sceneObjects)) {
        data.sceneObjects = [];
      }

      // 2. economy 필드 정규화 (legacy 형식 지원)
      if (data.economy && typeof data.economy === 'object') {
        const economy = data.economy as Record<string, unknown>;

        // legacy: memory_shards → memory_shard (오타 수정)
        if ('memory_shards' in economy && !('memory_shard' in economy)) {
          economy.memory_shard = economy.memory_shards;
          delete economy.memory_shards;
        }

        // 기본값 보장 (RULE-005: 잔액 음수 금지)
        if (typeof economy.signal !== 'number' || economy.signal < 0) {
          economy.signal = 100;
        }
        if (typeof economy.memory_shard !== 'number' || economy.memory_shard < 0) {
          economy.memory_shard = 5;
        }
      }

      // 3. economyLedger 필드가 없으면 빈 배열로 추가
      if (!Array.isArray(data.economyLedger)) {
        data.economyLedger = [];
      }

      // 4. mutationTimeline 필드가 없으면 빈 배열로 추가
      if (!Array.isArray(data.mutationTimeline)) {
        data.mutationTimeline = [];
      }

      // 5. 버전 업데이트
      data.version = '1.0.0';

      return data;
    },
  },
] as const;

// =============================================================================
// 마이그레이션 유틸리티
// =============================================================================

/**
 * 버전 인덱스를 반환합니다.
 *
 * @param version - 버전 문자열
 * @returns 버전 인덱스 또는 -1 (알 수 없는 버전)
 */
function getVersionIndex(version: string): number {
  return VERSION_ORDER.indexOf(version);
}

/**
 * 버전이 마이그레이션 가능한지 확인합니다.
 *
 * @param version - 확인할 버전
 * @returns 마이그레이션 가능 여부
 */
export function isMigratableVersion(version: string): boolean {
  return VERSION_ORDER.includes(version);
}

/**
 * 버전이 지원되는 버전인지 확인합니다.
 *
 * @param version - 확인할 버전
 * @returns 지원 여부
 */
export function isSupportedVersion(version: string): boolean {
  return SUPPORTED_SAVEGAME_VERSIONS.includes(version);
}

/**
 * 버전 간 마이그레이션 경로를 찾습니다.
 *
 * @param fromVersion - 소스 버전
 * @param toVersion - 타겟 버전
 * @returns 적용할 마이그레이션 목록 (순서대로)
 */
function findMigrationPath(fromVersion: string, toVersion: string): Migration[] {
  const fromIndex = getVersionIndex(fromVersion);
  const toIndex = getVersionIndex(toVersion);

  if (fromIndex === -1 || toIndex === -1) {
    return [];
  }

  if (fromIndex >= toIndex) {
    // 다운그레이드는 지원하지 않음
    return [];
  }

  const path: Migration[] = [];
  let currentVersion = fromVersion;

  while (currentVersion !== toVersion) {
    const migration = MIGRATIONS.find((m) => m.from === currentVersion);
    if (!migration) {
      // 마이그레이션 경로가 끊김
      break;
    }
    path.push(migration);
    currentVersion = migration.to;
  }

  return path;
}

// =============================================================================
// 공개 API
// =============================================================================

/**
 * SaveGame을 최신 버전으로 업그레이드합니다.
 *
 * @param input - 마이그레이션할 SaveGame 데이터 (unknown)
 * @param fromVersion - 현재 버전
 * @returns 마이그레이션 결과
 */
export function upgradeToLatest(input: unknown, fromVersion: string): MigrationOutcome {
  // 이미 최신 버전이면 그대로 반환
  if (fromVersion === SAVEGAME_VERSION) {
    return {
      success: true,
      data: input,
      migratedFrom: fromVersion,
      migratedTo: SAVEGAME_VERSION,
      appliedMigrations: [],
    };
  }

  // 마이그레이션 가능한 버전인지 확인
  if (!isMigratableVersion(fromVersion)) {
    return {
      success: false,
      error: `Unsupported version: ${fromVersion}. Cannot migrate.`,
      originalVersion: fromVersion,
    };
  }

  // 마이그레이션 경로 찾기
  const migrationPath = findMigrationPath(fromVersion, SAVEGAME_VERSION);
  if (migrationPath.length === 0) {
    return {
      success: false,
      error: `No migration path found from ${fromVersion} to ${SAVEGAME_VERSION}`,
      originalVersion: fromVersion,
    };
  }

  // 마이그레이션 순차 적용
  let currentData: unknown = input;
  const appliedMigrations: string[] = [];

  for (const migration of migrationPath) {
    try {
      console.log(`[Migration] Applying: ${migration.description}`);
      currentData = migration.migrate(currentData);
      appliedMigrations.push(`${migration.from} → ${migration.to}`);
    } catch (error) {
      return {
        success: false,
        error: `Migration failed at ${migration.from} → ${migration.to}: ${error}`,
        originalVersion: fromVersion,
      };
    }
  }

  return {
    success: true,
    data: currentData,
    migratedFrom: fromVersion,
    migratedTo: SAVEGAME_VERSION,
    appliedMigrations,
  };
}

/**
 * JSON 데이터에서 버전을 안전하게 추출합니다.
 *
 * 최소한의 파싱만 수행하여 버전을 확인합니다.
 * 전체 스키마 검증 전에 버전을 먼저 확인하기 위한 헬퍼입니다.
 *
 * @param data - 파싱된 JSON 데이터 (unknown)
 * @returns 버전 문자열 또는 null
 */
export function extractVersion(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;
  if (typeof obj.version === 'string' && obj.version.length > 0) {
    return obj.version;
  }

  return null;
}

/**
 * 마이그레이션 통계를 반환합니다.
 *
 * 디버그/로깅용으로 현재 마이그레이션 시스템의 상태를 확인합니다.
 */
export function getMigrationStats(): {
  currentVersion: string;
  supportedVersions: readonly string[];
  migratableVersions: readonly string[];
  migrationCount: number;
} {
  return {
    currentVersion: SAVEGAME_VERSION,
    supportedVersions: SUPPORTED_SAVEGAME_VERSIONS,
    migratableVersions: VERSION_ORDER,
    migrationCount: MIGRATIONS.length,
  };
}
