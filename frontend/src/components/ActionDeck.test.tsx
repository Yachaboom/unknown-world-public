import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionDeck } from './ActionDeck';
import type { ActionCard } from '../schemas/turn';
import { useActionDeckStore } from '../stores/actionDeckStore';
import { useWorldStore } from '../stores/worldStore';
import { useAgentStore } from '../stores/agentStore';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.turn !== undefined) return `Turn ${params.turn}`;
      if (key === 'action.risk.low') return 'Low';
      if (key === 'action.risk.medium') return 'Medium';
      if (key === 'action.risk.high') return 'High';
      if (key === 'action.insufficient_balance') return 'Insufficient Balance';
      if (key === 'action.alternative') return 'Alt';
      return key;
    },
  }),
}));

// U-065: 단순화된 ActionCard 스키마 (제거됨: description, cost_estimate, hint, reward_hint, disabled_reason)
describe('ActionDeck Component', () => {
  const mockCards: ActionCard[] = [
    {
      id: 'card-1',
      label: 'Regular Action',
      cost: { signal: 10, memory_shard: 0 },
      risk: 'low',
      enabled: true,
      is_alternative: false,
    },
    {
      id: 'card-2',
      label: 'Expensive Action',
      cost: { signal: 50, memory_shard: 1 },
      risk: 'high',
      enabled: true,
      is_alternative: false,
    },
    {
      id: 'card-alt',
      label: 'Alternative Action',
      cost: { signal: 2, memory_shard: 0 },
      risk: 'low',
      enabled: true,
      is_alternative: true,
    },
  ];

  beforeEach(() => {
    // 스토어 초기화
    useActionDeckStore.setState({ cards: [] });
    useWorldStore.setState({ economy: { signal: 100, memory_shard: 5 } });
    useAgentStore.setState({ isStreaming: false });
  });

  it('renders provided cards from store', () => {
    useActionDeckStore.setState({ cards: mockCards });
    render(<ActionDeck />);
    expect(screen.getByText('Regular Action')).toBeInTheDocument();
    expect(screen.getByText('Expensive Action')).toBeInTheDocument();
    expect(screen.getByText('Alternative Action')).toBeInTheDocument();
  });

  // U-065: cost_estimate 제거됨, cost만 표시
  it('displays cost values', () => {
    useActionDeckStore.setState({ cards: mockCards });
    render(<ActionDeck />);
    // card-1 has cost: 10
    expect(screen.getByText('10')).toBeInTheDocument();
    // card-2 has cost: 50
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  // U-065: cost_estimate 제거됨, cost만 사용
  it('disables cards when balance is insufficient in worldStore', () => {
    useActionDeckStore.setState({ cards: mockCards });
    useWorldStore.setState({ economy: { signal: 5, memory_shard: 0 } });

    render(<ActionDeck />);

    // Regular Action (cost 10) -> disabled
    const card1 = screen.getByRole('button', { name: /Regular Action/i });
    expect(card1).toBeDisabled();
    expect(screen.getAllByText('Insufficient Balance').length).toBeGreaterThan(0);

    // Alternative Action (cost 2) -> enabled
    const cardAlt = screen.getByRole('button', { name: /Alternative Action/i });
    expect(cardAlt).not.toBeDisabled();
  });

  it('renders alternative badge for alternative cards', () => {
    useActionDeckStore.setState({ cards: mockCards });
    render(<ActionDeck />);
    expect(screen.getByText('Alt')).toBeInTheDocument();
  });

  it('calls onCardClick when an enabled card is clicked', () => {
    const onCardClick = vi.fn();
    useActionDeckStore.setState({ cards: mockCards });
    render(<ActionDeck onCardClick={onCardClick} />);

    fireEvent.click(screen.getByText('Regular Action'));
    expect(onCardClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'card-1' }));
  });

  // U-065: disabled_reason 제거됨, 서버에서 enabled=false면 기본 메시지 표시
  it('displays default disabled message when server disables card', () => {
    const disabledCard: ActionCard[] = [
      {
        ...mockCards[0],
        enabled: false,
      },
    ];
    useActionDeckStore.setState({ cards: disabledCard });
    render(<ActionDeck />);
    // action.server_disabled 키가 그대로 출력됨 (모킹에서 처리 안 됨)
    const card = screen.getByRole('button', { name: /Regular Action/i });
    expect(card).toBeDisabled();
  });

  it('renders default cards when store cards are empty', () => {
    useActionDeckStore.setState({ cards: [] });
    render(<ActionDeck />);
    // useDefaultCards should provide some default labels
    expect(screen.getByText('action.default.explore.label')).toBeInTheDocument();
  });

  it('disables all cards when isStreaming is true in agentStore', () => {
    useActionDeckStore.setState({ cards: mockCards });
    useAgentStore.setState({ isStreaming: true });

    render(<ActionDeck />);

    const card1 = screen.getByRole('button', { name: /Regular Action/i });
    const cardAlt = screen.getByRole('button', { name: /Alternative Action/i });

    expect(card1).toBeDisabled();
    expect(cardAlt).toBeDisabled();
  });
});
