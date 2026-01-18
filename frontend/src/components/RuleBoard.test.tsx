import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RuleBoard } from './RuleBoard';
import { useWorldStore } from '../stores/worldStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.count !== undefined) return `${key} (count: ${options.count})`;
      return key;
    },
  }),
}));

describe('RuleBoard (U-013)', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
  });

  it('규칙이 없을 때 빈 상태를 표시해야 한다', () => {
    render(<RuleBoard />);
    expect(screen.getByText('rule_board.empty')).toBeInTheDocument();
  });

  it('활성 규칙 목록을 표시해야 한다', () => {
    useWorldStore.setState({
      activeRules: [
        { id: 'r1', label: '중력', description: '떨어진다' },
        { id: 'r2', label: '산소', description: '필요하다' },
      ],
    });

    render(<RuleBoard />);
    expect(screen.getByText('rule_board.active_count (count: 2)')).toBeInTheDocument();
    expect(screen.getByText('중력')).toBeInTheDocument();
    expect(screen.getByText('떨어진다')).toBeInTheDocument();
    expect(screen.getByText('산소')).toBeInTheDocument();
  });
});
