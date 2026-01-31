import { describe, it, expect } from 'vitest';
import { extractVersion, upgradeToLatest, isMigratableVersion } from './migrations';
import { SAVEGAME_VERSION } from './constants';

describe('SaveGame Migrations (U-041[Mvp])', () => {
  describe('extractVersion', () => {
    it('객체에서 version 필드를 올바르게 추출해야 한다', () => {
      expect(extractVersion({ version: '1.0.0' })).toBe('1.0.0');
      expect(extractVersion({ version: '0.9.0' })).toBe('0.9.0');
    });

    it('유효하지 않은 입력에 대해 null을 반환해야 한다', () => {
      expect(extractVersion(null)).toBeNull();
      expect(extractVersion(undefined)).toBeNull();
      expect(extractVersion('string')).toBeNull();
      expect(extractVersion({})).toBeNull();
      expect(extractVersion({ ver: '1.0.0' })).toBeNull();
    });
  });

  describe('isMigratableVersion', () => {
    it('지원되는 버전에 대해 true를 반환해야 한다', () => {
      expect(isMigratableVersion('0.9.0')).toBe(true);
      expect(isMigratableVersion('1.0.0')).toBe(true);
    });

    it('지원되지 않는 버전에 대해 false를 반환해야 한다', () => {
      expect(isMigratableVersion('0.1.0')).toBe(false);
      expect(isMigratableVersion('unknown')).toBe(false);
    });
  });

  describe('upgradeToLatest (0.9.0 -> 1.0.0)', () => {
    it('0.9.0 데이터를 1.0.0으로 올바르게 변환해야 한다', () => {
      const oldData = {
        version: '0.9.0',
        language: 'ko-KR',
        economy: {
          signal: 50,
          memory_shards: 3, // 구버전 오타 필드
        },
        // sceneObjects, economyLedger, mutationTimeline 누락됨
      };

      const result = upgradeToLatest(oldData, '0.9.0');

      expect(result.success).toBe(true);
      if (result.success) {
        const migrated = result.data as Record<string, unknown>;
        const economy = migrated.economy as Record<string, unknown>;
        expect(migrated.version).toBe('1.0.0');
        expect(economy.signal).toBe(50);
        expect(economy.memory_shard).toBe(3); // 오타 수정됨
        expect(economy.memory_shards).toBeUndefined();
        expect(migrated.sceneObjects).toEqual([]);
        expect(migrated.economyLedger).toEqual([]);
        expect(migrated.mutationTimeline).toEqual([]);
        expect(result.appliedMigrations).toContain('0.9.0 → 1.0.0');
      }
    });

    it('잘못된 economy 데이터가 있을 경우 기본값으로 보정해야 한다', () => {
      const brokenData = {
        version: '0.9.0',
        economy: {
          signal: -10, // 음수
          memory_shard: 'invalid', // 타입 오류
        },
      };

      const result = upgradeToLatest(brokenData, '0.9.0');

      expect(result.success).toBe(true);
      if (result.success) {
        const migrated = result.data as Record<string, unknown>;
        const economy = migrated.economy as Record<string, unknown>;
        expect(economy.signal).toBe(100); // 기본값
        expect(economy.memory_shard).toBe(5); // 기본값
      }
    });

    it('이미 최신 버전인 경우 그대로 반환해야 한다', () => {
      const currentData = { version: SAVEGAME_VERSION, language: 'en-US' };
      const result = upgradeToLatest(currentData, SAVEGAME_VERSION);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(currentData);
        expect(result.appliedMigrations).toHaveLength(0);
      }
    });

    it('지원되지 않는 버전인 경우 실패를 반환해야 한다', () => {
      const result = upgradeToLatest({ version: '0.1.0' }, '0.1.0');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unsupported version');
      }
    });
  });
});
