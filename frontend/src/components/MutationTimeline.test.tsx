import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MutationTimeline } from './MutationTimeline';
import { useWorldStore } from '../stores/worldStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.turn !== undefined) return `T${options.turn}`;
      if (options?.count !== undefined) return `${key} (count: ${options.count})`;
      return key;
    },
  }),
}));

describe('MutationTimeline (U-013)', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
  });

  it('변형 이력이 없을 때 빈 상태를 표시해야 한다', () => {
    render(<MutationTimeline />);
    expect(screen.getByText('mutation.empty')).toBeInTheDocument();
  });

  it('변형 이벤트 목록을 최신순으로 표시해야 한다', () => {
    useWorldStore.setState({
      mutationTimeline: [
        {
          turn: 2,
          ruleId: 'r2',
          type: 'modified',
          label: '수정된 규칙',
          timestamp: Date.now(),
        },
        {
          turn: 1,
          ruleId: 'r1',
          type: 'added',
          label: '새 규칙',
          timestamp: Date.now() - 1000,
        },
      ],
    });

    render(<MutationTimeline />);
    expect(screen.getByText('mutation.timeline_title')).toBeInTheDocument();
    expect(screen.getAllByText('T2')).toHaveLength(1);
    expect(screen.getByText('수정된 규칙')).toBeInTheDocument();
    expect(screen.getByText('mutation.type.modified')).toBeInTheDocument();

    expect(screen.getAllByText('T1')).toHaveLength(1);
    expect(screen.getByText('새 규칙')).toBeInTheDocument();
    expect(screen.getByText('mutation.type.added')).toBeInTheDocument();
  });

  it('이벤트가 많을 때 "더 보기" 표시를 해야 한다 (최대 10개 기준)', () => {
    const manyEvents = Array.from({ length: 12 }, (_, i) => ({
      turn: i + 1,
      ruleId: `r${i}`,
      type: 'added' as const,
      label: `규칙 ${i}`,
      timestamp: Date.now(),
    })).reverse(); // 최신순

    useWorldStore.setState({ mutationTimeline: manyEvents });

    const { container } = render(<MutationTimeline />);
    // 10개만 렌더링됨
    expect(container.getElementsByClassName('timeline-event')).toHaveLength(10);
    // +2개 더 보기 표시
    expect(screen.getByText('mutation.more_events (count: 2)')).toBeInTheDocument();
  });
});
