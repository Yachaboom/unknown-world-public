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

  it('isImageLoading일 때 더 느리게 타이핑되어야 한다 (shouldBuyTime)', () => {
    // 매우 긴 텍스트 사용 (IDLE 모드에서 charsPerTick > 1이 되도록)
    const longText = 'This is a very long narrative text. '.repeat(20); // 약 720자
    const entries = [{ turn: 1, text: longText }];

    // 1. 일반 상태 (IDLE: TARGET_DURATION_MS_IDLE = 8000ms)
    // CPS = 720 / 8 = 90. MAX_CPS = 80으로 클램핑됨.
    // charsPerTick = round(80 * 0.032) = round(2.56) = 3.
    const { unmount } = render(
      <NarrativeFeed entries={entries} streamingText="" isImageLoading={false} />,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const len1 = screen.getByText(new RegExp(longText.slice(0, 5))).textContent?.length || 0;
    unmount();

    // 2. 이미지 로딩 중 (shouldBuyTime: TARGET_DURATION_MS_WHILE_STREAMING = 30000ms)
    // CPS = 720 / 30 = 24.
    // charsPerTick = round(24 * 0.032) = round(0.768) = 1.
    render(<NarrativeFeed entries={entries} streamingText="" isImageLoading={true} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const len2 = screen.getByText(new RegExp(longText.slice(0, 5))).textContent?.length || 0;

    // 로딩 중일 때 더 적은 글자가 표시되어야 함 (1 < 3)
    expect(len2).toBeLessThan(len1);
  });
});
