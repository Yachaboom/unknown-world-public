import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorldStore, selectMainObjective, selectSubObjectives } from './worldStore';
import type { TurnOutput } from '../schemas/turn';

// i18next 모킹 (U-072)
vi.mock('../i18n', () => ({
  default: {
    t: (key: string) => key,
  },
}));

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
        gains: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
        credit: 0,
        low_balance_warning: false,
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
            description: null,
            is_main: false,
            progress: 0,
            reward_signal: 0,
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
        gains: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
        credit: 0,
        low_balance_warning: false,
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
            label: '임무',
            is_completed: false,
            description: null,
            is_main: false,
            progress: 0,
            reward_signal: 0,
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
    useWorldStore.getState().applyTurnOutput(initialState as TurnOutput);

    // 2. 퀘스트 완료 업데이트
    const updateOutput: Partial<TurnOutput> = {
      narrative: '임무 완료!',
      economy: {
        cost: { signal: 0, memory_shard: 0 },
        gains: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
        credit: 0,
        low_balance_warning: false,
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
            label: '임무',
            is_completed: true,
            description: null,
            is_main: false,
            progress: 100,
            reward_signal: 0,
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
        gains: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
        credit: 0,
        low_balance_warning: false,
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
        gains: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
        credit: 0,
        low_balance_warning: false,
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
        gains: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 5 },
        credit: 0,
        low_balance_warning: false,
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
        economy: { signal: 50, memory_shard: 0, credit: 0 },
        sceneState: {
          status: 'scene',
          imageUrl: 'test.png',
          processingPhase: 'rendering',
        },
        quests: [
          {
            id: 'q1',
            label: '퀘스트',
            is_completed: false,
            description: null,
            is_main: false,
            progress: 0,
            reward_signal: 0,
          },
        ],
      });

      // 2. 리셋 실행
      useWorldStore.getState().reset();

      // 3. 검증
      const state = useWorldStore.getState();
      expect(state.turnCount).toBe(0);
      expect(state.economy.signal).toBe(100);
      expect(state.sceneState.status).toBe('default');
      expect(state.sceneState.imageUrl).toBeUndefined();
      expect(state.sceneState.processingPhase).toBe('idle');
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
      expect(store.sceneState.processingPhase).toBe('idle');

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

  describe('Scanner Hints (U-072[Mvp])', () => {
    it('applyTurnOutput에서 hints.scanner가 true이면 힌트 내러티브가 추가되어야 한다', () => {
      const mockOutput: Partial<TurnOutput> = {
        narrative: '일반 내러티브',
        economy: {
          cost: { signal: 0, memory_shard: 0 },
          gains: { signal: 0, memory_shard: 0 },
          balance_after: { signal: 100, memory_shard: 5 },
          credit: 0,
          low_balance_warning: false,
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
        hints: {
          scanner: true,
        },
      };

      useWorldStore.getState().applyTurnOutput(mockOutput as TurnOutput);

      const state = useWorldStore.getState();
      // 일반 내러티브 + 스캐너 힌트 총 2개여야 함
      expect(state.narrativeEntries).toHaveLength(2);
      expect(state.narrativeEntries[0].text).toBe('일반 내러티브');
      expect(state.narrativeEntries[1].text).toBe('scanner.hint_narrative');
      expect(state.narrativeEntries[1].type).toBe('system');
    });

    it('hints.scanner가 없으면 힌트 내러티브가 추가되지 않아야 한다', () => {
      const mockOutput: Partial<TurnOutput> = {
        narrative: '일반 내러티브',
        economy: {
          cost: { signal: 0, memory_shard: 0 },
          gains: { signal: 0, memory_shard: 0 },
          balance_after: { signal: 100, memory_shard: 5 },
          credit: 0,
          low_balance_warning: false,
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
      expect(state.narrativeEntries).toHaveLength(1);
      expect(state.narrativeEntries[0].text).toBe('일반 내러티브');
    });
  });

  describe('Objective System (U-078[Mvp])', () => {
    it('selectMainObjective는 is_main=true인 퀘스트를 반환해야 한다', () => {
      useWorldStore.setState({
        quests: [
          {
            id: 'q1',
            label: '서브',
            is_main: false,
            is_completed: false,
            progress: 0,
            reward_signal: 0,
            description: null,
          },
          {
            id: 'q2',
            label: '메인',
            is_main: true,
            is_completed: false,
            progress: 50,
            reward_signal: 100,
            description: null,
          },
        ],
      });

      const main = selectMainObjective(useWorldStore.getState());
      expect(main?.id).toBe('q2');
    });

    it('selectSubObjectives는 is_main=false인 퀘스트들을 반환해야 한다', () => {
      useWorldStore.setState({
        quests: [
          {
            id: 'q1',
            label: '서브1',
            is_main: false,
            is_completed: false,
            progress: 0,
            reward_signal: 0,
            description: null,
          },
          {
            id: 'q2',
            label: '메인',
            is_main: true,
            is_completed: false,
            progress: 50,
            reward_signal: 100,
            description: null,
          },
          {
            id: 'q3',
            label: '서브2',
            is_main: false,
            is_completed: false,
            progress: 0,
            reward_signal: 0,
            description: null,
          },
        ],
      });

      const subs = selectSubObjectives(useWorldStore.getState());
      expect(subs).toHaveLength(2);
      expect(subs.map((s) => s.id)).toContain('q1');
      expect(subs.map((s) => s.id)).toContain('q3');
    });

    it('퀘스트 완료 시 reward_signal이 있으면 알림 메시지가 추가되어야 한다', () => {
      // 1. 초기 상태: 미완료 퀘스트
      useWorldStore.setState({
        quests: [
          {
            id: 'q1',
            label: '임무',
            is_main: false,
            is_completed: false,
            progress: 0,
            reward_signal: 50,
            description: null,
          },
        ],
      });

      // 2. 완료 업데이트
      const output: Partial<TurnOutput> = {
        narrative: '임무 완료',
        economy: {
          cost: { signal: 0, memory_shard: 0 },
          gains: { signal: 0, memory_shard: 0 },
          balance_after: { signal: 150, memory_shard: 5 },
          credit: 0,
          low_balance_warning: false,
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
              label: '임무',
              is_main: false,
              is_completed: true,
              progress: 100,
              reward_signal: 50,
              description: null,
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

      useWorldStore.getState().applyTurnOutput(output as TurnOutput);

      const state = useWorldStore.getState();
      // 일반 내러티브 + 보상 알림 총 2개
      expect(state.narrativeEntries).toHaveLength(2);
      expect(state.narrativeEntries[1].text).toContain('quest.objective_complete');
      expect(state.narrativeEntries[1].text).toContain('quest.reward_earned');
      expect(state.narrativeEntries[1].type).toBe('system');
    });
  });

  describe('Hotspot Policy (U-090[Mvp])', () => {
    it('새 이미지 생성 시 핫스팟이 초기화되어야 한다 (Q1: Option A)', () => {
      // 1. 기존 핫스팟 설정
      useWorldStore.setState({
        sceneObjects: [
          {
            id: 'old',
            label: '과거',
            box_2d: { ymin: 0, xmin: 0, ymax: 100, xmax: 100 },
            interaction_hint: null,
          },
        ],
      });

      // 2. 새 이미지 생성이 포함된 턴 (image_url 존재)
      const mockOutput: Partial<TurnOutput> = {
        narrative: '새 장면',
        economy: {
          cost: { signal: 0, memory_shard: 0 },
          gains: { signal: 0, memory_shard: 0 },
          balance_after: { signal: 100, memory_shard: 5 },
          credit: 0,
          low_balance_warning: false,
        },
        ui: {
          scene: { image_url: 'new_img.png', alt_text: '' },
          action_deck: { cards: [] },
          objects: [],
        },
        render: {
          image_url: 'new_img.png',
          image_job: null,
          image_id: 'img_1',
          generation_time_ms: 1000,
        },
        world: {
          inventory_added: [],
          inventory_removed: [],
          quests_updated: [],
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
      expect(state.sceneObjects).toHaveLength(0); // 초기화됨
    });

    it('새 이미지 생성이 포함된 턴 (should_generate=true)에서도 핫스팟이 초기화되어야 한다', () => {
      // 1. 기존 핫스팟 설정
      useWorldStore.setState({
        sceneObjects: [
          {
            id: 'old',
            label: '과거',
            box_2d: { ymin: 0, xmin: 0, ymax: 100, xmax: 100 },
            interaction_hint: null,
          },
        ],
      });

      // 2. 이미지 생성 예정인 턴
      const mockOutput: Partial<TurnOutput> = {
        narrative: '장면 전환 중...',
        economy: {
          cost: { signal: 0, memory_shard: 0 },
          gains: { signal: 0, memory_shard: 0 },
          balance_after: { signal: 100, memory_shard: 5 },
          credit: 0,
          low_balance_warning: false,
        },
        ui: {
          scene: { image_url: '', alt_text: '' },
          action_deck: { cards: [] },
          objects: [],
        },
        render: {
          image_url: null,
          image_job: {
            should_generate: true,
            prompt: 'A new scene',
            model_label: 'FAST',
            aspect_ratio: '16:9',
            image_size: '1024x1024',
            reference_image_ids: [],
            reference_image_url: null,
          },
          image_id: null,
          generation_time_ms: null,
        },
        world: {
          inventory_added: [],
          inventory_removed: [],
          quests_updated: [],
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
      expect(state.sceneObjects).toHaveLength(0); // 초기화됨
    });

    it('일반 턴(objects 비어있음)에서는 기존 핫스팟이 유지되어야 한다', () => {
      // 1. 기존 핫스팟 설정
      const oldObjects = [
        {
          id: 'obj1',
          label: '물체1',
          box_2d: { ymin: 100, xmin: 100, ymax: 200, xmax: 200 },
          interaction_hint: null,
        },
      ];
      useWorldStore.setState({
        sceneObjects: oldObjects,
      });

      // 2. 일반 턴 (objects 비어있음, 이미지 생성 없음)
      const mockOutput: Partial<TurnOutput> = {
        narrative: '아무 일도 일어나지 않습니다.',
        economy: {
          cost: { signal: 0, memory_shard: 0 },
          gains: { signal: 0, memory_shard: 0 },
          balance_after: { signal: 100, memory_shard: 5 },
          credit: 0,
          low_balance_warning: false,
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
      expect(state.sceneObjects).toEqual(oldObjects); // 유지됨
    });

    it('정밀분석 결과(objects 존재)는 기존 핫스팟에 병합되어야 한다', () => {
      // 1. 기존 핫스팟 설정
      const oldObjects = [
        {
          id: 'obj1',
          label: '물체1',
          box_2d: { ymin: 100, xmin: 100, ymax: 200, xmax: 200 },
          interaction_hint: null,
        },
      ];
      useWorldStore.setState({
        sceneObjects: oldObjects,
      });

      // 2. 정밀분석 결과 턴
      const newObject = {
        id: 'obj2',
        label: '물체2',
        box_2d: { ymin: 300, xmin: 300, ymax: 400, xmax: 400 },
        interaction_hint: null,
      };
      const mockOutput: Partial<TurnOutput> = {
        narrative: '자세히 보니 새로운 것이 보입니다.',
        economy: {
          cost: { signal: 0, memory_shard: 0 },
          gains: { signal: 0, memory_shard: 0 },
          balance_after: { signal: 100, memory_shard: 5 },
          credit: 0,
          low_balance_warning: false,
        },
        ui: {
          scene: { image_url: '', alt_text: '' },
          action_deck: { cards: [] },
          objects: [newObject],
        },
        world: {
          inventory_added: [],
          inventory_removed: [],
          quests_updated: [],
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
      expect(state.sceneObjects).toHaveLength(2);
      expect(state.sceneObjects).toContainEqual(oldObjects[0]);
      expect(state.sceneObjects).toContainEqual(newObject);
    });
  });
});
