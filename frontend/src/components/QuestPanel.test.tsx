import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestPanel } from './QuestPanel';
import { useWorldStore } from '../stores/worldStore';

// i18next 모킹 (t 함수가 키를 반환하도록)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

describe('QuestPanel (U-013)', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
  });

  it('퀘스트가 없을 때 자유 탐색 상태를 표시해야 한다', () => {
    render(<QuestPanel />);
    // U-078: 빈 상태 → "자유 탐색" 안내로 변경
    expect(screen.getByText('quest.free_exploration')).toBeInTheDocument();
    expect(screen.getByText('quest.free_exploration_desc')).toBeInTheDocument();
  });

  it('진행 중인 퀘스트를 목록에 표시해야 한다', () => {
    useWorldStore.setState({
      quests: [
        {
          id: 'q1',
          label: '액티브 퀘스트',
          is_completed: false,
          description: null,
          is_main: false,
          progress: 0,
          reward_signal: 0,
        },
      ],
    });

    render(<QuestPanel />);
    expect(screen.getByText('액티브 퀘스트')).toBeInTheDocument();
  });

  it('완료된 퀘스트를 목록에 표시해야 한다', () => {
    useWorldStore.setState({
      quests: [
        {
          id: 'q2',
          label: '완료된 퀘스트',
          is_completed: true,
          description: null,
          is_main: false,
          progress: 100,
          reward_signal: 10,
        },
      ],
    });

    render(<QuestPanel />);
    expect(screen.getByText('완료된 퀘스트')).toBeInTheDocument();
  });

  it('주 목표와 세부 목표를 구분하여 표시해야 한다', () => {
    useWorldStore.setState({
      quests: [
        {
          id: 'q1',
          label: '주 목표',
          is_completed: false,
          description: '주 목표 설명',
          is_main: true,
          progress: 50,
          reward_signal: 100,
        },
        {
          id: 'q2',
          label: '세부 목표',
          is_completed: false,
          description: null,
          is_main: false,
          progress: 0,
          reward_signal: 20,
        },
      ],
    });

    render(<QuestPanel />);
    expect(screen.getByText('주 목표')).toBeInTheDocument();
    expect(screen.getByText('세부 목표')).toBeInTheDocument();
  });
});
