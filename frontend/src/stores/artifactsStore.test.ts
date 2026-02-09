import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useArtifactsStore } from './artifactsStore';

// fetch 모킹
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('artifactsStore (U-025)', () => {
  beforeEach(() => {
    useArtifactsStore.getState().reset();
    vi.clearAllMocks();
  });

  it('초기 상태가 올바른지 확인합니다.', () => {
    const state = useArtifactsStore.getState();
    expect(state.endingReport).toBeNull();
    expect(state.isGenerating).toBe(false);
    expect(state.isReportOpen).toBe(false);
  });

  it('openReport 및 closeReport 액션을 검증합니다.', () => {
    useArtifactsStore.getState().openReport();
    expect(useArtifactsStore.getState().isReportOpen).toBe(true);

    useArtifactsStore.getState().closeReport();
    expect(useArtifactsStore.getState().isReportOpen).toBe(false);
  });

  it('generateReport 성공 시 상태 변화를 검증합니다.', async () => {
    const mockReport = {
      language: 'ko-KR',
      title: '세션 리포트',
      narrative_summary: '이야기 요약',
      quest_achievement: { total: 1, completed: 1, completion_rate: 1.0, quests: [] },
      economy_settlement: { balance_consistent: true },
      rule_timeline: [],
      play_stats: { turn_count: 1 },
      generated_at: '2026-02-10T00:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReport,
    });

    const sessionData = {
      language: 'ko-KR',
      profileId: 'explorer',
      turnCount: 1,
      narrativeEntries: [],
      quests: [],
      economyLedger: [],
      balanceFinal: { signal: 100, memory_shard: 5 },
      balanceInitial: { signal: 100, memory_shard: 5 },
      activeRules: [],
      mutationEvents: [],
      inventoryItems: [],
    };

    await useArtifactsStore.getState().generateReport(sessionData);

    const state = useArtifactsStore.getState();
    expect(state.endingReport).toEqual(mockReport);
    expect(state.isGenerating).toBe(false);
    expect(state.isReportOpen).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('generateReport 실패 시 에러 상태를 검증합니다.', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const sessionData = {
      language: 'ko-KR',
      profileId: 'explorer',
      turnCount: 1,
      narrativeEntries: [],
      quests: [],
      economyLedger: [],
      balanceFinal: { signal: 100, memory_shard: 5 },
      balanceInitial: { signal: 100, memory_shard: 5 },
      activeRules: [],
      mutationEvents: [],
      inventoryItems: [],
    };

    await useArtifactsStore.getState().generateReport(sessionData);

    const state = useArtifactsStore.getState();
    expect(state.endingReport).toBeNull();
    expect(state.error).toContain('500');
    expect(state.isGenerating).toBe(false);
  });
});
