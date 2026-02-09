import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useInventoryStore } from './inventoryStore';
import { useWorldStore } from './worldStore';
import type { TurnOutput } from '../schemas/turn';

// 하위 스토어 모킹 방지 (실제 로직 테스트를 위해)
vi.unmock('./inventoryStore');
vi.unmock('./economyStore');
vi.unmock('./actionDeckStore');

describe('Item Consumption (U-096)', () => {
  beforeEach(() => {
    useInventoryStore.getState().reset();
    useWorldStore.getState().reset();
    vi.useFakeTimers();
  });

  describe('InventoryStore Consumption Logic', () => {
    it('markConsuming: 아이템을 소비 중인 상태로 표시해야 한다', () => {
      const { markConsuming } = useInventoryStore.getState();
      markConsuming(['item1', 'item2']);

      const state = useInventoryStore.getState();
      expect(state.consumingItemIds).toContain('item1');
      expect(state.consumingItemIds).toContain('item2');
    });

    it('clearConsuming: 소비 애니메이션 완료 후 아이템을 실제로 제거해야 한다 (수량 1)', () => {
      const { addItems, markConsuming, clearConsuming } = useInventoryStore.getState();
      addItems([{ id: 'item1', name: 'Key', quantity: 1 }]);
      markConsuming(['item1']);

      clearConsuming(['item1']);

      const state = useInventoryStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.consumingItemIds).not.toContain('item1');
    });

    it('clearConsuming: 수량이 여러 개인 경우 수량만 감소시켜야 한다', () => {
      const { addItems, markConsuming, clearConsuming } = useInventoryStore.getState();
      addItems([{ id: 'potion', name: 'Potion', quantity: 3 }]);
      markConsuming(['potion']);

      clearConsuming(['potion']);

      const state = useInventoryStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(2);
      expect(state.consumingItemIds).not.toContain('potion');
    });

    it('clearConsuming: 중복 ID 제거 시 수량이 그만큼 감소해야 한다', () => {
      const { addItems, markConsuming, clearConsuming } = useInventoryStore.getState();
      addItems([{ id: 'potion', name: 'Potion', quantity: 3 }]);
      markConsuming(['potion']);

      clearConsuming(['potion', 'potion']);

      const state = useInventoryStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(1);
    });
  });

  describe('WorldStore Integration', () => {
    it('applyTurnOutput: inventory_removed가 포함되면 소비 애니메이션을 트리거해야 한다', () => {
      const { addItems } = useInventoryStore.getState();
      addItems([{ id: 'key_01', name: 'Iron Key', quantity: 1 }]);

      const mockOutput: Partial<TurnOutput> = {
        narrative: '열쇠를 사용했습니다.',
        language: 'ko-KR' as 'ko-KR' | 'en-US',
        economy: {
          cost: { signal: 0, memory_shard: 0 },
          gains: { signal: 0, memory_shard: 0 },
          balance_after: { signal: 100, memory_shard: 5 },
          credit: 0,
          low_balance_warning: false,
        },
        ui: {
          action_deck: { cards: [] },
          objects: [],
          scene: { image_url: '', alt_text: '' },
        },
        world: {
          inventory_added: [],
          inventory_removed: ['key_01'],
          quests_updated: [],
          rules_changed: [],
          relationships_changed: [],
          memory_pins: [],
        },
        agent_console: {
          current_phase: 'commit' as
            | 'parse'
            | 'validate'
            | 'plan'
            | 'resolve'
            | 'render'
            | 'verify'
            | 'commit',
          badges: [],
          repair_count: 0,
          model_label: 'FAST' as 'FAST' | 'QUALITY' | 'CHEAP' | 'REF',
        },
        safety: { blocked: false, message: null },
      };

      useWorldStore.getState().applyTurnOutput(mockOutput as TurnOutput);

      // 1단계: markConsuming 호출 확인
      expect(useInventoryStore.getState().consumingItemIds).toContain('key_01');
      expect(useInventoryStore.getState().items).toHaveLength(1); // 아직 제거 전

      // 2단계: 500ms 경과 후 제거 확인
      vi.advanceTimersByTime(500);
      expect(useInventoryStore.getState().items).toHaveLength(0); // 제거됨
      expect(useInventoryStore.getState().consumingItemIds).not.toContain('key_01');
    });
  });
});
