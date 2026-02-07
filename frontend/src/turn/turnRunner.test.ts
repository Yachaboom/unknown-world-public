import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createTurnRunner } from './turnRunner';
import type { TurnInput } from '../schemas/turn';
import type { StreamCallbacks } from '../api/turnStream';

// 모킹
vi.mock('../api/turnStream', () => ({
  startTurnStream: vi.fn(() => vi.fn()),
}));

vi.mock('../api/image', () => ({
  startImageGeneration: vi.fn(),
}));

const mockWorldStore = {
  economy: { signal: 100, memory_shard: 5 },
  sceneState: { status: 'scene', imageUrl: 'old-url.png' },
  setIsAnalyzing: vi.fn(),
  setSceneState: vi.fn(),
  setProcessingPhase: vi.fn(),
  turnCount: 1,
};

vi.mock('../stores/worldStore', () => ({
  useWorldStore: {
    getState: vi.fn(() => mockWorldStore),
  },
}));

vi.mock('../stores/agentStore', () => ({
  useAgentStore: {
    getState: vi.fn(() => ({
      isStreaming: false,
      startStream: vi.fn(),
      completeStream: vi.fn(),
      handleStage: vi.fn(),
      handleBadges: vi.fn(),
      handleNarrativeDelta: vi.fn(),
      handleFinal: vi.fn(),
      handleError: vi.fn(),
    })),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('turnRunner (U-089[Mvp])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('정밀분석 키워드 감지 시 isAnalyzing을 true로 설정해야 함', () => {
    const runner = createTurnRunner({
      t: (key: string) => key,
      theme: 'dark',
      language: 'ko-KR',
    });

    // 1. "정밀분석" 텍스트 입력
    runner.runTurn({ text: '정밀분석 해줘' });
    expect(mockWorldStore.setIsAnalyzing).toHaveBeenCalledWith(true);

    // 2. 일반 텍스트 입력 시에는 설정하지 않아야 함
    vi.clearAllMocks();
    runner.runTurn({ text: '안녕하세요' });
    expect(mockWorldStore.setIsAnalyzing).not.toHaveBeenCalled();
  });

  it('정밀분석 actionId 감지 시 isAnalyzing을 true로 설정해야 함', () => {
    const runner = createTurnRunner({
      t: (key: string) => key,
      theme: 'dark',
      language: 'ko-KR',
    });

    runner.runTurn({ text: '', actionId: 'deep_analyze' });
    expect(mockWorldStore.setIsAnalyzing).toHaveBeenCalledWith(true);
  });

  it('정밀분석 중에는 setSceneState({status: "loading"})을 호출하지 않아야 함 (기존 이미지 유지)', () => {
    const runner = createTurnRunner({
      t: (key: string) => key,
      theme: 'dark',
      language: 'ko-KR',
    });

    runner.runTurn({ text: '정밀분석' });

    // isAnalyzing은 true
    expect(mockWorldStore.setIsAnalyzing).toHaveBeenCalledWith(true);
    // status: 'loading'은 호출되지 않아야 함
    expect(mockWorldStore.setSceneState).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'loading' }),
    );
  });

  it('턴 완료 시 최소 표시 시간 이후 isAnalyzing을 false로 설정해야 함', async () => {
    vi.useFakeTimers();
    const runner = createTurnRunner({
      t: (key: string) => key,
      theme: 'dark',
      language: 'ko-KR',
    });

    const { startTurnStream } = (await import('../api/turnStream')) as unknown as {
      startTurnStream: Mock;
    };
    let completeCallback: () => void = () => {};

    startTurnStream.mockImplementation((_input: TurnInput, callbacks: StreamCallbacks) => {
      completeCallback = callbacks.onComplete!;
      return vi.fn();
    });

    runner.runTurn({ text: '정밀분석' });
    expect(mockWorldStore.setIsAnalyzing).toHaveBeenCalledWith(true);

    // 턴 완료 호출
    completeCallback();

    // 즉시는 false가 되지 않아야 함 (최소 표시 시간 때문)
    expect(mockWorldStore.setIsAnalyzing).not.toHaveBeenLastCalledWith(false);

    // 500ms 경과 후
    vi.advanceTimersByTime(500);
    expect(mockWorldStore.setIsAnalyzing).toHaveBeenLastCalledWith(false);

    vi.useRealTimers();
  });
});
