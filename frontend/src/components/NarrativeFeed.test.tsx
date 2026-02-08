import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { NarrativeFeed } from './NarrativeFeed';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'narrative.turn_label') return `Turn ${params?.turn}`;
      if (key === 'narrative.streaming_label') return 'Streaming';
      return key;
    },
  }),
}));

describe('NarrativeFeed (U-066: Typewriter Effect)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // prefers-reduced-motion 모킹
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('텍스트가 타이핑 효과와 함께 점진적으로 표시되어야 한다', () => {
    const entries = [{ turn: 1, text: 'Hello World' }];
    render(<NarrativeFeed entries={entries} streamingText="" />);

    // 처음에는 한 글자 또는 일부만 표시됨 (TYPING_TICK_MS 지나기 전)
    // 컴포넌트 내부에서 첫 렌더링 시 typedLen은 0임
    expect(screen.queryByText('Hello World')).toBeNull();

    // 시간 진행
    act(() => {
      vi.advanceTimersByTime(500); // 충분한 시간 진행
    });

    // 일부 텍스트가 표시됨 (정확한 글자 수는 CPS에 따라 다름)
    const textElement = screen.getByText(/Hel/);
    expect(textElement).toBeDefined();

    // 완료될 때까지 시간 진행
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('클릭 시 Fast-forward가 동작하여 즉시 전체 텍스트가 표시되어야 한다', () => {
    const entries = [{ turn: 1, text: 'This is a long text to test fast forward' }];
    render(<NarrativeFeed entries={entries} streamingText="" />);

    expect(screen.queryByText(entries[0].text)).toBeNull();

    // 클릭 이벤트 발생
    const feed = screen.getByRole('log');
    fireEvent.click(feed);

    // 즉시 전체 표시됨
    expect(screen.getByText(entries[0].text)).toBeDefined();
  });

  it('스트리밍 중에는 스트리밍 텍스트에 타이핑 효과가 적용되어야 한다', () => {
    const entries = [{ turn: 1, text: 'Previous text' }];
    const streamingText = 'Current streaming text';
    render(<NarrativeFeed entries={entries} streamingText={streamingText} isStreaming={true} />);

    // 이전 텍스트는 보이고, 스트리밍 텍스트는 타이핑 중
    expect(screen.getByText('Previous text')).toBeDefined();
    expect(screen.queryByText('Current streaming text')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(30000); // TARGET_DURATION_MS_WHILE_STREAMING
    });

    expect(screen.getByText('Current streaming text')).toBeDefined();
  });

  it('isImageLoading 상태에 따라 타이핑 완료 시점이 달라져야 한다 (U-086)', () => {
    // 약 100자 정도의 텍스트 (CPS 계산을 위해)
    const text =
      'This is a test narrative text that should take some time to type out completely for testing.'.repeat(
        2,
      );
    const entries = [{ turn: 1, text }];

    // 1. 이미지 로딩 중 (느린 모드: ~12초 목표)
    const { unmount } = render(
      <NarrativeFeed entries={entries} streamingText="" isImageLoading={true} />,
    );

    // 5초 경과 시점 - 아직 완료되지 않아야 함 (12초 목표이므로)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText(text)).toBeNull();

    // 13초 경과 시점 - 완료되어야 함
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText(text)).toBeDefined();
    unmount();

    // 2. 이미지 완료/없음 상태 (빠른 모드: ~2.5초 목표)
    render(<NarrativeFeed entries={entries} streamingText="" isImageLoading={false} />);

    // 1초 경과 시점 - 아직 미완료
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText(text)).toBeNull();

    // 3초 경과 시점 - 완료되어야 함
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(text)).toBeDefined();
  });

  it('타이핑 완료 후 이미지 로딩 중이면 상태 라벨이 표시되고, 로딩 완료 시 사라져야 한다 (U-086)', () => {
    const text = 'Short text';
    const entries = [{ turn: 1, text }];
    const { rerender } = render(
      <NarrativeFeed entries={entries} streamingText="" isImageLoading={true} />,
    );

    // 1. 타이핑 완료 전 - 라벨 없음
    expect(screen.queryByText('narrative.image_pending_label')).toBeNull();

    // 2. 타이핑 완료 - 라벨 노출
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(text)).toBeDefined();
    expect(screen.getByText('narrative.image_pending_label')).toBeDefined();

    // 3. 이미지 로딩 완료 - 라벨 제거
    rerender(<NarrativeFeed entries={entries} streamingText="" isImageLoading={false} />);
    expect(screen.queryByText('narrative.image_pending_label')).toBeNull();
  });

  it('타이핑 중 이미지가 도착하면 속도가 빨라져야 한다 (U-086)', () => {
    const longText = 'Very long text... '.repeat(30);
    const entries = [{ turn: 1, text: longText }];
    const { rerender } = render(
      <NarrativeFeed entries={entries} streamingText="" isImageLoading={true} />,
    );

    // 2초 경과 (느린 모드)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const lenAt2s = screen.queryByText(/Very long/)?.textContent?.length || 0;

    // 이미지가 도중에 도착함
    rerender(<NarrativeFeed entries={entries} streamingText="" isImageLoading={false} />);

    // 1초 더 경과 (이제 빠른 모드이므로 훨씬 더 많이 출력되어야 함)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const lenAt3s = screen.queryByText(/Very long/)?.textContent?.length || 0;

    const progressAfterImage = lenAt3s - lenAt2s;
    const progressBeforeImage = lenAt2s;

    // 1초(빠른 모드) 진행분이 2초(느린 모드) 진행분보다 많아야 함 (12s vs 2.5s 비율상)
    expect(progressAfterImage).toBeGreaterThan(progressBeforeImage / 2);
  });

  it('action_log 타입의 엔트리는 ▶ 아이콘과 함께 표시되어야 한다 (U-070)', () => {
    const entries = [{ turn: 1, text: 'Action log message', type: 'action_log' as const }];
    render(<NarrativeFeed entries={entries} streamingText="" />);

    // Fast-forward로 즉시 표시
    fireEvent.click(screen.getByRole('log'));

    expect(screen.getByText('Action log message')).toBeDefined();
    expect(screen.getByText('▶')).toBeDefined();
    // action-log-entry 클래스가 포함된 요소가 있어야 함
    const entry = screen.getByText('Action log message').closest('.narrative-entry');
    expect(entry?.className).toContain('action-log-entry');
  });
});
