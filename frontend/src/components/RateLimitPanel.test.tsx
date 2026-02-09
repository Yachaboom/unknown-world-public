import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RateLimitPanel } from './RateLimitPanel';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'error.retry_countdown') return `Retry in ${options?.seconds}s`;
      if (key === 'error.retry_button') return 'Retry Now';
      return key;
    },
  }),
}));

describe('RateLimitPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initially shows countdown and disabled retry button', () => {
    const onRetry = vi.fn();
    render(<RateLimitPanel onRetry={onRetry} />);

    // 초기 카운트다운 60초 확인 (여러 개 존재하므로 getAllByText 사용)
    const countdownElements = screen.getAllByText('Retry in 60s');
    expect(countdownElements.length).toBeGreaterThan(0);

    // 버튼 비활성화 확인
    const retryButton = screen.getByRole('button');
    expect(retryButton).toBeDisabled();
    expect(retryButton).toHaveTextContent('Retry in 60s');
  });

  it('decreases countdown over time', () => {
    render(<RateLimitPanel onRetry={() => {}} />);

    // 10초 경과
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getAllByText('Retry in 50s').length).toBeGreaterThan(0);

    // 30초 더 경과
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.getAllByText('Retry in 20s').length).toBeGreaterThan(0);
  });

  it('enables retry button when countdown reaches zero', () => {
    const onRetry = vi.fn();
    render(<RateLimitPanel onRetry={onRetry} />);

    // 60초 경과
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // 버튼 텍스트가 'Retry Now'로 변경됨
    expect(screen.getByText('Retry Now')).toBeInTheDocument();

    // 버튼 활성화 확인
    const retryButton = screen.getByRole('button');
    expect(retryButton).not.toBeDisabled();
    expect(retryButton).toHaveTextContent('Retry Now');

    // 클릭 시 콜백 호출 확인
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('allows clicking retry button multiple times after activation', () => {
    const onRetry = vi.fn();
    render(<RateLimitPanel onRetry={onRetry} />);

    // 60초 경과
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    const retryButton = screen.getByRole('button');
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});
