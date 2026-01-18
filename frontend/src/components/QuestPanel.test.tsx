import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestPanel } from './QuestPanel';
import { useWorldStore } from '../stores/worldStore';

// i18next 모킹 (t 함수가 키를 반환하도록)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('QuestPanel (U-013)', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
  });

  it('퀘스트가 없을 때 빈 상태를 표시해야 한다', () => {
    render(<QuestPanel />);
    expect(screen.getByText('quest.empty')).toBeInTheDocument();
  });

  it('진행 중인 퀘스트를 목록에 표시해야 한다', () => {
    useWorldStore.setState({
      quests: [{ id: 'q1', label: '액티브 퀘스트', is_completed: false }],
    });

    render(<QuestPanel />);
    expect(screen.getByText('quest.section.active')).toBeInTheDocument();
    expect(screen.getByText('액티브 퀘스트')).toBeInTheDocument();
    expect(screen.getByText('☐')).toBeInTheDocument();
  });

  it('완료된 퀘스트를 목록에 표시해야 한다', () => {
    useWorldStore.setState({
      quests: [{ id: 'q2', label: '완료된 퀘스트', is_completed: true }],
    });

    render(<QuestPanel />);
    expect(screen.getByText('quest.section.completed')).toBeInTheDocument();
    expect(screen.getByText('완료된 퀘스트')).toBeInTheDocument();
    expect(screen.getByText('☑')).toBeInTheDocument();
    expect(screen.getByText('quest.completed')).toBeInTheDocument();
  });

  it('진행 중인 퀘스트와 완료된 퀘스트를 모두 표시해야 한다', () => {
    useWorldStore.setState({
      quests: [
        { id: 'q1', label: '액티브', is_completed: false },
        { id: 'q2', label: '완료', is_completed: true },
      ],
    });

    render(<QuestPanel />);
    expect(screen.getByText('액티브')).toBeInTheDocument();
    expect(screen.getByText('완료')).toBeInTheDocument();
  });
});
