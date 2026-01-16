import { describe, it, expect, beforeEach } from 'vitest';
import { useActionDeckStore, filterAffordableCards } from './actionDeckStore';
import type { ActionCard } from '../schemas/turn';

describe('actionDeckStore', () => {
  beforeEach(() => {
    useActionDeckStore.getState().reset();
  });

  const mockCards: ActionCard[] = [
    {
      id: 'card-1',
      label: 'Card 1',
      description: null,
      cost: { signal: 10, memory_shard: 0 },
      cost_estimate: null,
      risk: 'low',
      hint: null,
      reward_hint: null,
      enabled: true,
      disabled_reason: null,
      is_alternative: false,
    },
    {
      id: 'card-2',
      label: 'Card 2',
      description: null,
      cost: { signal: 50, memory_shard: 1 },
      cost_estimate: null,
      risk: 'high',
      hint: null,
      reward_hint: null,
      enabled: true,
      disabled_reason: null,
      is_alternative: false,
    },
  ];

  it('sets cards and resets selected card', () => {
    const store = useActionDeckStore.getState();
    store.selectCard('some-id');
    expect(useActionDeckStore.getState().selectedCardId).toBe('some-id');

    store.setCards(mockCards);
    expect(useActionDeckStore.getState().cards).toEqual(mockCards);
    expect(useActionDeckStore.getState().selectedCardId).toBeNull();
  });

  it('marks a card as executed', () => {
    const store = useActionDeckStore.getState();
    store.selectCard('card-1');
    store.markExecuted('card-1');

    expect(useActionDeckStore.getState().lastExecutedCardId).toBe('card-1');
    expect(useActionDeckStore.getState().selectedCardId).toBeNull();
  });

  it('filters affordable cards correctly', () => {
    const balance = { signal: 20, memory_shard: 0 };
    const affordable = filterAffordableCards(mockCards, balance);

    expect(affordable).toHaveLength(1);
    expect(affordable[0].id).toBe('card-1');
  });

  it('respects server enabled flag in filterAffordableCards', () => {
    const disabledCards: ActionCard[] = [
      {
        ...mockCards[0],
        enabled: false,
      },
    ];
    const balance = { signal: 100, memory_shard: 100 };
    const affordable = filterAffordableCards(disabledCards, balance);

    expect(affordable).toHaveLength(0);
  });
});
