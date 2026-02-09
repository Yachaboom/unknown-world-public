import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

describe('NarrativeFeed (U-125: Visual Hierarchy)', () => {
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

  it('유휴 상태일 때 마지막 엔트리는 narrative-active-text 클래스를 가져야 한다', () => {
    const entries = [
      { turn: 1, text: 'First turn' },
      { turn: 2, text: 'Second turn' },
    ];
    render(<NarrativeFeed entries={entries} streamingText="" />);

    // 타이핑 완료를 위해 시간 진행
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    const entry1 = screen.getByText('First turn').closest('.narrative-entry');
    const entry2 = screen.getByText('Second turn').closest('.narrative-entry');

    expect(entry1?.className).toContain('past-entry');
    expect(entry1?.className).not.toContain('narrative-active-text');

    expect(entry2?.className).toContain('narrative-active-text');
    expect(entry2?.className).not.toContain('past-entry');
  });

  it('스트리밍 중일 때 모든 기존 엔트리는 past-entry 클래스를 가져야 한다', () => {
    const entries = [
      { turn: 1, text: 'First turn' },
      { turn: 2, text: 'Second turn' },
    ];
    const streamingText = 'Current streaming...';
    render(<NarrativeFeed entries={entries} streamingText={streamingText} />);

    // 타이핑 진행을 위해 시간 진행
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const entry1 = screen.getByText('First turn').closest('.narrative-entry');
    const entry2 = screen.getByText('Second turn').closest('.narrative-entry');

    // 스트리밍 중이므로 마지막 엔트리(Second turn)도 past-entry여야 함
    expect(entry1?.className).toContain('past-entry');
    expect(entry2?.className).toContain('past-entry');

    // 스트리밍 텍스트 영역 확인
    const activeArea = screen.getByText(/Current/).closest('.narrative-entry');
    expect(activeArea?.className).toContain('narrative-active-text');
  });

  it('타이핑 중일 때 마지막 엔트리는 숨겨지고 활성 영역에 표시되어야 한다', () => {
    const entries = [
      { turn: 1, text: 'First turn' },
      { turn: 2, text: 'Second turn' },
    ];
    render(<NarrativeFeed entries={entries} streamingText="" />);

    // 타이핑 진행을 위해 시간 진행
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // 타이핑 시작 직후 (Second turn이 entries에서 숨겨지고 typewriter로 표시됨)
    const entry1 = screen.getByText('First turn').closest('.narrative-entry');
    expect(entry1?.className).toContain('past-entry');

    // entries의 Second turn은 숨겨져야 함 (shouldHideLastEntry=true)
    // screen.getByText('Second turn')은 typewriter 결과물을 찾을 것임
    const activeText = screen.getByText(/Sec/);
    const activeArea = activeText.closest('.narrative-entry');
    expect(activeArea?.className).toContain('narrative-active-text');

    // entries 내부의 Second turn은 렌더링되지 않으므로, past-entry 클래스를 가진 Second turn은 없어야 함
    const allPastEntries = document.querySelectorAll('.past-entry');
    expect(allPastEntries.length).toBe(1);
    expect(allPastEntries[0].textContent).toContain('First turn');
  });
});
