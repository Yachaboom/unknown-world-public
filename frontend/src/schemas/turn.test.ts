import { describe, it, expect } from 'vitest';
import {
  TurnInputSchema,
  TurnOutputSchema,
  safeParseTurnOutput,
  parseTurnInput,
  safeParseTurnInput,
  SCHEMA_VERSION,
} from './turn';

describe('Turn schemas', () => {
  describe('SCHEMA_VERSION', () => {
    it('should have correct version', () => {
      expect(SCHEMA_VERSION).toBe('1.0.0');
    });
  });

  describe('TurnInputSchema', () => {
    const validTurnInput = {
      language: 'ko-KR',
      text: '테스트 입력',
      client: {
        viewport_w: 1920,
        viewport_h: 1080,
        theme: 'dark',
      },
      economy_snapshot: {
        signal: 100,
        memory_shard: 5,
      },
    };

    it('should validate a valid TurnInput', () => {
      const result = TurnInputSchema.safeParse(validTurnInput);
      expect(result.success).toBe(true);
    });

    it('should fail on invalid language', () => {
      const result = TurnInputSchema.safeParse({
        ...validTurnInput,
        language: 'fr-FR',
      });
      expect(result.success).toBe(false);
    });

    it('should fail on negative economy values', () => {
      const result = TurnInputSchema.safeParse({
        ...validTurnInput,
        economy_snapshot: {
          signal: -1,
          memory_shard: 0,
        },
      });
      expect(result.success).toBe(false);
    });

    it('should fail on extra fields (strict)', () => {
      const result = TurnInputSchema.safeParse({
        ...validTurnInput,
        extra_field: 'not allowed',
      });
      expect(result.success).toBe(false);
    });

    it('should validate click input with bbox', () => {
      const result = TurnInputSchema.safeParse({
        ...validTurnInput,
        click: {
          object_id: 'door_01',
          box_2d: {
            ymin: 100,
            xmin: 100,
            ymax: 500,
            xmax: 500,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should fail on invalid bbox coordinates (out of range 0-1000)', () => {
      const result = TurnInputSchema.safeParse({
        ...validTurnInput,
        click: {
          object_id: 'door_01',
          box_2d: {
            ymin: -1,
            xmin: 0,
            ymax: 1001,
            xmax: 500,
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should fail on non-positive viewport dimensions', () => {
      const result = TurnInputSchema.safeParse({
        ...validTurnInput,
        client: {
          viewport_w: 0,
          viewport_h: -100,
          theme: 'dark',
        },
      });
      expect(result.success).toBe(false);
    });

    it('should fail on non-integer coordinates', () => {
      const result = TurnInputSchema.safeParse({
        ...validTurnInput,
        click: {
          object_id: 'obj',
          box_2d: {
            ymin: 10.5,
            xmin: 20,
            ymax: 30,
            xmax: 40,
          },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TurnOutputSchema', () => {
    const validTurnOutput = {
      language: 'ko-KR',
      narrative: '테스트 내러티브',
      economy: {
        cost: { signal: 5, memory_shard: 0 },
        balance_after: { signal: 95, memory_shard: 5 },
      },
      safety: {
        blocked: false,
      },
      agent_console: {
        current_phase: 'commit',
        badges: ['schema_ok', 'economy_ok'],
        repair_count: 0,
      },
    };

    it('should validate a valid TurnOutput', () => {
      const result = TurnOutputSchema.safeParse(validTurnOutput);
      expect(result.success).toBe(true);
    });

    it('should fail if required fields are missing', () => {
      const { narrative: _narrative, ...invalidOutput } = validTurnOutput;
      const result = TurnOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should handle default values for optional fields', () => {
      const result = TurnOutputSchema.safeParse(validTurnOutput);
      if (result.success) {
        expect(result.data.ui).toBeDefined();
        expect(result.data.ui.action_deck.cards).toEqual([]);
        expect(result.data.world.rules_changed).toEqual([]);
      } else {
        throw new Error('Validation failed');
      }
    });

    it('should fail if there are too many action cards (max 10)', () => {
      const cards = Array.from({ length: 11 }, (_, i) => ({
        id: `card_${i}`,
        label: `Card ${i}`,
        cost: { signal: 0, memory_shard: 0 },
        risk: 'low',
      }));
      const result = TurnOutputSchema.safeParse({
        ...validTurnOutput,
        ui: {
          action_deck: { cards },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should fail on negative repair_count', () => {
      const result = TurnOutputSchema.safeParse({
        ...validTurnOutput,
        agent_console: {
          current_phase: 'commit',
          badges: [],
          repair_count: -1,
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('safeParseTurnOutput', () => {
    it('should return success for valid data', () => {
      const validTurnOutput = {
        language: 'en-US',
        narrative: 'Test narrative',
        economy: {
          cost: { signal: 0, memory_shard: 0 },
          balance_after: { signal: 100, memory_shard: 0 },
        },
        safety: { blocked: false },
      };
      const result = safeParseTurnOutput(validTurnOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe('en-US');
      }
    });

    it('should return fallback for invalid data', () => {
      const invalidData = { some: 'garbage' };
      const result = safeParseTurnOutput(invalidData, 'ko-KR', 1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fallback).toBeDefined();
        expect(result.fallback.language).toBe('ko-KR');
        expect(result.fallback.agent_console.badges).toContain('schema_fail');
        expect(result.fallback.agent_console.repair_count).toBe(1);
      }
    });
  });

  describe('Input Parsing Utilities', () => {
    const validTurnInput = {
      language: 'ko-KR',
      text: '테스트 입력',
      client: {
        viewport_w: 1920,
        viewport_h: 1080,
        theme: 'dark',
      },
      economy_snapshot: {
        signal: 100,
        memory_shard: 5,
      },
    };

    describe('parseTurnInput', () => {
      it('should parse valid input', () => {
        const result = parseTurnInput(validTurnInput);
        expect(result.text).toBe('테스트 입력');
      });

      it('should throw error for invalid input', () => {
        expect(() => parseTurnInput({})).toThrow();
      });
    });

    describe('safeParseTurnInput', () => {
      it('should return success for valid input', () => {
        const result = safeParseTurnInput(validTurnInput);
        expect(result.success).toBe(true);
      });

      it('should return failure for invalid input', () => {
        const result = safeParseTurnInput({});
        expect(result.success).toBe(false);
      });
    });
  });
});
