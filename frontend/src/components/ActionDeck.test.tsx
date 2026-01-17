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

describe('ActionDeck Component', () => {
  const mockCards: ActionCard[] = [
    {
      id: 'card-1',
      label: 'Regular Action',
      description: 'Test Description',
      cost: { signal: 10, memory_shard: 0 },
      cost_estimate: {
        min: { signal: 8, memory_shard: 0 },
        max: { signal: 12, memory_shard: 0 },
      },
      risk: 'low',
      hint: 'Positive hint',
      reward_hint: 'Bonus item',
      enabled: true,
      disabled_reason: null,
      is_alternative: false,
    },
    {
      id: 'card-2',
      label: 'Expensive Action',
      description: null,
      cost: { signal: 50, memory_shard: 1 },
      cost_estimate: null,
      risk: 'high',
      hint: 'Risky hint',
      reward_hint: null,
      enabled: true,
      disabled_reason: null,
      is_alternative: false,
    },
    {
      id: 'card-alt',
      label: 'Alternative Action',
      description: null,
      cost: { signal: 2, memory_shard: 0 },
      cost_estimate: null,
      risk: 'low',
      hint: null,
      reward_hint: null,
      enabled: true,
      disabled_reason: null,
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

  it('displays cost estimates as ranges when available', () => {
    useActionDeckStore.setState({ cards: mockCards });
    render(<ActionDeck />);
    // card-1 has cost_estimate: 8~12
    expect(screen.getByText('8~12')).toBeInTheDocument();
    // card-2 has cost: 50
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('disables cards when balance is insufficient in worldStore', () => {
    useActionDeckStore.setState({ cards: mockCards });
    useWorldStore.setState({ economy: { signal: 5, memory_shard: 0 } });
    
    render(<ActionDeck />);

    // Regular Action (cost 10/estimate max 12) -> disabled
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

  it('displays server-provided disabled reason', () => {
    const disabledCard: ActionCard[] = [
      {
        ...mockCards[0],
        enabled: false,
        disabled_reason: 'Locked by story',
      },
    ];
    useActionDeckStore.setState({ cards: disabledCard });
    render(<ActionDeck />);
    expect(screen.getByText('Locked by story')).toBeInTheDocument();
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
