import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorldStore } from './worldStore';
import type { TurnOutput } from '../schemas/turn';

// 하위 스토어 모킹 (순환 import 방지 로직 대응)
vi.mock('./actionDeckStore', () => ({
  useActionDeckStore: {
    getState: () => ({
      setCards: vi.fn(),
    }),
  },
}));

vi.mock('./inventoryStore', () => ({
  useInventoryStore: {
    getState: () => ({
      addItems: vi.fn(),
      removeItems: vi.fn(),
    }),
  },
  parseInventoryAdded: (items: unknown) => items,
}));

describe('worldStore (U-013: Quest + Rules)', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
  });

  it('초기 상태가 올바라야 한다', () => {
    const state = useWorldStore.getState();
    expect(state.quests).toEqual([]);
    expect(state.activeRules).toEqual([]);
    expect(state.mutationTimeline).toEqual([]);
  });

  it('applyTurnOutput을 통해 새 퀘스트가 추가되어야 한다', () => {
    const mockOutput: Partial<TurnOutput> = {
      narrative: '새 퀘스트 발생',
      economy: {
        cost: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
      },
      ui: {
        scene: { image_url: '', alt_text: '' },
        action_deck: { cards: [] },
        objects: [],
      },
      world: {
        inventory_added: [],
        inventory_removed: [],
        quests_updated: [
          {
            id: 'q1',
            label: '첫 번째 임무',
            is_completed: false,
          },
        ],
        rules_changed: [],
        relationships_changed: [],
        memory_pins: [],
      },
      agent_console: {
        current_phase: 'commit',
        badges: ['schema_ok'],
        repair_count: 0,
        model_label: 'FAST',
      },
      safety: { blocked: false, message: null },
    };

    useWorldStore.getState().applyTurnOutput(mockOutput as TurnOutput);

    const state = useWorldStore.getState();
    expect(state.quests).toHaveLength(1);
    expect(state.quests[0].id).toBe('q1');
    expect(state.quests[0].is_completed).toBe(false);
  });

  it('기존 퀘스트가 업데이트(완료)되어야 한다', () => {
    // 1. 초기 퀘스트 추가
    const initialState: Partial<TurnOutput> = {
      narrative: '초기화',
      economy: {
        cost: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
      },
      ui: {
        scene: { image_url: '', alt_text: '' },
        action_deck: { cards: [] },
        objects: [],
      },
      world: {
        inventory_added: [],
        inventory_removed: [],
        quests_updated: [{ id: 'q1', label: '임무', is_completed: false }],
        rules_changed: [],
        relationships_changed: [],
        memory_pins: [],
      },
      agent_console: {
        current_phase: 'commit',
        badges: ['schema_ok'],
        repair_count: 0,
        model_label: 'FAST',
      },
      safety: { blocked: false, message: null },
    };
    useWorldStore.getState().applyTurnOutput(initialState as TurnOutput);

    // 2. 퀘스트 완료 업데이트
    const updateOutput: Partial<TurnOutput> = {
      narrative: '임무 완료!',
      economy: {
        cost: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
      },
      ui: {
        scene: { image_url: '', alt_text: '' },
        action_deck: { cards: [] },
        objects: [],
      },
      world: {
        inventory_added: [],
        inventory_removed: [],
        quests_updated: [{ id: 'q1', label: '임무', is_completed: true }],
        rules_changed: [],
        relationships_changed: [],
        memory_pins: [],
      },
      agent_console: {
        current_phase: 'commit',
        badges: ['schema_ok'],
        repair_count: 0,
        model_label: 'FAST',
      },
      safety: { blocked: false, message: null },
    };
    useWorldStore.getState().applyTurnOutput(updateOutput as TurnOutput);

    const state = useWorldStore.getState();
    expect(state.quests).toHaveLength(1);
    expect(state.quests[0].is_completed).toBe(true);
  });

  it('새 규칙이 추가되고 타임라인에 기록되어야 한다', () => {
    const mockOutput: Partial<TurnOutput> = {
      narrative: '새 규칙 적용',
      economy: {
        cost: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
      },
      ui: {
        scene: { image_url: '', alt_text: '' },
        action_deck: { cards: [] },
        objects: [],
      },
      world: {
        inventory_added: [],
        inventory_removed: [],
        quests_updated: [],
        rules_changed: [
          {
            id: 'rule1',
            label: '중력 강화',
            description: '점프 높이가 절반으로 감소합니다.',
          },
        ],
        relationships_changed: [],
        memory_pins: [],
      },
      agent_console: {
        current_phase: 'commit',
        badges: ['schema_ok'],
        repair_count: 0,
        model_label: 'FAST',
      },
      safety: { blocked: false, message: null },
    };

    useWorldStore.getState().applyTurnOutput(mockOutput as TurnOutput);

    const state = useWorldStore.getState();
    expect(state.activeRules).toHaveLength(1);
    expect(state.activeRules[0].id).toBe('rule1');

    expect(state.mutationTimeline).toHaveLength(1);
    expect(state.mutationTimeline[0].ruleId).toBe('rule1');
    expect(state.mutationTimeline[0].type).toBe('added');
  });

  it('기존 규칙 수정 시 타임라인에 기록되어야 한다', () => {
    // 1. 초기 규칙 추가
    const initialState: Partial<TurnOutput> = {
      narrative: '초기화',
      economy: {
        cost: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
      },
      ui: {
        scene: { image_url: '', alt_text: '' },
        action_deck: { cards: [] },
        objects: [],
      },
      world: {
        inventory_added: [],
        inventory_removed: [],
        quests_updated: [],
        rules_changed: [{ id: 'rule1', label: '규칙', description: '기존' }],
        relationships_changed: [],
        memory_pins: [],
      },
      agent_console: {
        current_phase: 'commit',
        badges: ['schema_ok'],
        repair_count: 0,
        model_label: 'FAST',
      },
      safety: { blocked: false, message: null },
    };
    useWorldStore.getState().applyTurnOutput(initialState as TurnOutput);

    // 2. 규칙 수정
    const updateOutput: Partial<TurnOutput> = {
      narrative: '규칙 수정',
      economy: {
        cost: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
      },
      ui: {
        scene: { image_url: '', alt_text: '' },
        action_deck: { cards: [] },
        objects: [],
      },
      world: {
        inventory_added: [],
        inventory_removed: [],
        quests_updated: [],
        rules_changed: [{ id: 'rule1', label: '규칙', description: '수정됨' }],
        relationships_changed: [],
        memory_pins: [],
      },
      agent_console: {
        current_phase: 'commit',
        badges: ['schema_ok'],
        repair_count: 0,
        model_label: 'FAST',
      },
      safety: { blocked: false, message: null },
    };
    useWorldStore.getState().applyTurnOutput(updateOutput as TurnOutput);

    const state = useWorldStore.getState();
    expect(state.activeRules[0].description).toBe('수정됨');
    expect(state.mutationTimeline).toHaveLength(2);
    expect(state.mutationTimeline[0].type).toBe('modified');
  });

  describe('Initialization and Reset (U-015[Mvp])', () => {
    it('reset 액션은 모든 상태를 초기값으로 되돌려야 한다', () => {
      // 1. 임의의 상태 설정
      useWorldStore.setState({
        turnCount: 10,
        economy: { signal: 50, memory_shard: 0 },
        quests: [{ id: 'q1', label: '퀘스트', is_completed: false }],
      });

      // 2. 리셋 실행
      useWorldStore.getState().reset();

      // 3. 검증
      const state = useWorldStore.getState();
      expect(state.turnCount).toBe(0);
      expect(state.economy.signal).toBe(100);
      expect(state.quests).toEqual([]);
      expect(state.narrativeEntries).toEqual([]);
    });

    it('initialize 액션은 웰컴 메시지와 함께 초기 상태를 설정해야 한다', () => {
      const welcomeMsg = '환영합니다!';
      useWorldStore.getState().initialize(welcomeMsg);

      const state = useWorldStore.getState();
      expect(state.turnCount).toBe(0);
      expect(state.narrativeEntries).toHaveLength(1);
      expect(state.narrativeEntries[0].text).toBe(welcomeMsg);
      expect(state.narrativeEntries[0].turn).toBe(0);
    });
  });

  describe('Action Log (U-070[Mvp])', () => {
    it('appendActionLog 액션은 action_log 타입의 엔트리를 추가해야 한다', () => {
      const logMsg = '행동 실행: 아이템 사용';
      useWorldStore.getState().appendActionLog(logMsg);

      const state = useWorldStore.getState();
      const lastEntry = state.narrativeEntries[state.narrativeEntries.length - 1];
      expect(lastEntry.text).toBe(logMsg);
      expect(lastEntry.type).toBe('action_log');
      expect(lastEntry.turn).toBe(state.turnCount);
    });
  });

  describe('Processing Phase (U-071[Mvp])', () => {
    it('setProcessingPhase 액션은 sceneState의 processingPhase를 업데이트해야 한다', () => {
      const store = useWorldStore.getState();

      // 1. 초기 상태 확인
      expect(store.sceneState.processingPhase).toBeUndefined(); // 또는 'idle' (초기값 정책에 따라 다름)

      // 2. 단계 변경
      store.setProcessingPhase('processing');
      expect(useWorldStore.getState().sceneState.processingPhase).toBe('processing');

      // 3. 단계 변경 (image_pending)
      store.setProcessingPhase('image_pending');
      expect(useWorldStore.getState().sceneState.processingPhase).toBe('image_pending');

      // 4. 유휴 상태로 복귀
      store.setProcessingPhase('idle');
      expect(useWorldStore.getState().sceneState.processingPhase).toBe('idle');
    });
  });
});
