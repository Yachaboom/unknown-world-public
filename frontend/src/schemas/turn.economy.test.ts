import { describe, it, expect } from 'vitest';
import { safeParseTurnOutput } from './turn';

describe('U-063: Economy Balance Preservation in safeParseTurnOutput', () => {
  it('should preserve economy balance in fallback when validation fails', () => {
    const invalidData = { some: 'invalid data' };
    const economySnapshot = { signal: 42, memory_shard: 7 };

    const result = safeParseTurnOutput(invalidData, 'ko-KR', 0, economySnapshot);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fallback.economy.balance_after.signal).toBe(42);
      expect(result.fallback.economy.balance_after.memory_shard).toBe(7);
      expect(result.fallback.economy.cost.signal).toBe(0);
      expect(result.fallback.economy.cost.memory_shard).toBe(0);
    }
  });

  it('should use default values if economySnapshot is not provided', () => {
    const invalidData = { some: 'invalid data' };

    const result = safeParseTurnOutput(invalidData, 'ko-KR', 0);

    expect(result.success).toBe(false);
    if (!result.success) {
      // 기본값 { signal: 100, memory_shard: 5 } 확인 (turn.ts에 정의됨)
      expect(result.fallback.economy.balance_after.signal).toBe(100);
      expect(result.fallback.economy.balance_after.memory_shard).toBe(5);
    }
  });
});
