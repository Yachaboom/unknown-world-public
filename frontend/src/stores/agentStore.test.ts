import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore } from './agentStore';
import { StreamEventType, StageStatus } from '../api/turnStream';
import type { TurnOutput } from '../schemas/turn';

describe('agentStore', () => {
  beforeEach(() => {
    useAgentStore.getState().reset();
  });

  it('should have correct initial state', () => {
    const state = useAgentStore.getState();
    expect(state.isStreaming).toBe(false);
    expect(state.phases).toHaveLength(7);
    expect(state.phases[0].status).toBe('pending');
    expect(state.badges).toEqual([]);
    expect(state.repairCount).toBe(0);
  });

  it('should handle startStream', () => {
    useAgentStore.getState().startStream();
    const state = useAgentStore.getState();
    expect(state.isStreaming).toBe(true);
  });

  it('should handle handleStage events', () => {
    const store = useAgentStore.getState();

    // Start parse phase
    store.handleStage({
      type: StreamEventType.STAGE,
      name: 'parse',
      status: StageStatus.START,
    });

    let state = useAgentStore.getState();
    expect(state.currentPhase).toBe('parse');
    expect(state.phases.find((p) => p.name === 'parse')?.status).toBe('in_progress');

    // Complete parse phase
    store.handleStage({
      type: StreamEventType.STAGE,
      name: 'parse',
      status: StageStatus.COMPLETE,
    });

    state = useAgentStore.getState();
    expect(state.phases.find((p) => p.name === 'parse')?.status).toBe('completed');
  });

  it('should handle handleBadges events', () => {
    const store = useAgentStore.getState();
    store.handleBadges({
      type: StreamEventType.BADGES,
      badges: ['schema_ok', 'economy_ok'],
    });

    const state = useAgentStore.getState();
    expect(state.badges).toEqual(['schema_ok', 'economy_ok']);
  });

  it('should handle handleNarrativeDelta events', () => {
    const store = useAgentStore.getState();
    store.handleNarrativeDelta({
      type: StreamEventType.NARRATIVE_DELTA,
      text: 'Hello ',
    });
    store.handleNarrativeDelta({
      type: StreamEventType.NARRATIVE_DELTA,
      text: 'World',
    });

    const state = useAgentStore.getState();
    expect(state.narrativeBuffer).toBe('Hello World');
  });

  it('should handle handleFinal events', () => {
    const store = useAgentStore.getState();
    const mockOutput = {
      language: 'ko-KR',
      narrative: 'Final message',
      economy: {
        cost: { signal: 0, memory_shard: 0 },
        balance_after: { signal: 100, memory_shard: 0 },
      },
      safety: { blocked: false, message: null },
      ui: { action_deck: { cards: [] }, objects: [], scene: { image_url: null, alt_text: null } },
      world: {
        rules_changed: [],
        inventory_added: [],
        inventory_removed: [],
        quests_updated: [],
        relationships_changed: [],
        memory_pins: [],
      },
      render: {
        image_job: null,
        image_url: null,
        image_id: null,
        generation_time_ms: null,
        background_removed: false,
      },
      agent_console: {
        repair_count: 2,
        current_phase: 'commit',
        badges: [],
      },
    } as TurnOutput;

    store.handleFinal({
      type: StreamEventType.FINAL,
      data: mockOutput,
    });

    const state = useAgentStore.getState();
    expect(state.finalOutput).toEqual(mockOutput);
    expect(state.repairCount).toBe(2);
  });

  it('should handle handleError events', () => {
    const store = useAgentStore.getState();
    store.handleError({
      type: StreamEventType.ERROR,
      message: 'Network error',
      code: 'ERR_NET',
    });

    const state = useAgentStore.getState();
    expect(state.error).toEqual({
      message: 'Network error',
      code: 'ERR_NET',
    });
  });

  it('should reset state on completeStream', () => {
    const store = useAgentStore.getState();
    store.handleNarrativeDelta({ type: StreamEventType.NARRATIVE_DELTA, text: 'Some text' });
    store.startStream();

    store.completeStream();

    const state = useAgentStore.getState();
    expect(state.isStreaming).toBe(false);
    expect(state.narrativeBuffer).toBe('');
  });
});
