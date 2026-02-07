import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ObjectiveTracker } from './ObjectiveTracker';
import { useWorldStore } from '../stores/worldStore';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

describe('ObjectiveTracker (U-078)', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
  });

  it('목표가 없을 때 아무것도 렌더링하지 않아야 한다', () => {
    const { container } = render(<ObjectiveTracker />);
    expect(container.firstChild).toBeNull();
  });

  it('주 목표만 있을 때 올바르게 표시해야 한다', () => {
    useWorldStore.setState({
      quests: [
        {
          id: 'main',
          label: '주 목표',
          is_completed: false,
          description: null,
          is_main: true,
          progress: 30,
          reward_signal: 0,
        },
      ],
    });

    render(<ObjectiveTracker />);
    expect(screen.getByText('주 목표')).toBeInTheDocument();
    // 진행률 바 확인
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    const fill = progressBar.querySelector('.objective-tracker__bar-fill');
    expect(fill).toHaveStyle({ width: '30%' });
  });

  it('서브 목표 카운트를 표시해야 한다', () => {
    useWorldStore.setState({
      quests: [
        {
          id: 'main',
          label: '주 목표',
          is_completed: false,
          description: null,
          is_main: true,
          progress: 0,
          reward_signal: 0,
        },
        {
          id: 'sub1',
          label: '서브 1',
          is_completed: true,
          description: null,
          is_main: false,
          progress: 0,
          reward_signal: 0,
        },
        {
          id: 'sub2',
          label: '서브 2',
          is_completed: false,
          description: null,
          is_main: false,
          progress: 0,
          reward_signal: 0,
        },
      ],
    });

    render(<ObjectiveTracker />);
    expect(screen.getByText('(1/2)')).toBeInTheDocument();
  });

  it('완료된 목표일 때 체크 아이콘을 표시해야 한다', () => {
    useWorldStore.setState({
      quests: [
        {
          id: 'main',
          label: '완료된 주 목표',
          is_completed: true,
          description: null,
          is_main: true,
          progress: 100,
          reward_signal: 0,
        },
      ],
    });

    render(<ObjectiveTracker />);
    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText('완료된 주 목표')).toBeInTheDocument();
  });
});
