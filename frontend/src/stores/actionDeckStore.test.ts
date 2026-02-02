import { describe, it, expect, beforeEach } from 'vitest';
import { useActionDeckStore, filterAffordableCards } from './actionDeckStore';
import type { ActionCard } from '../schemas/turn';

describe('actionDeckStore', () => {
  beforeEach(() => {
    useActionDeckStore.getState().reset();
  });

  // U-065: 단순화된 ActionCard 스키마 (제거됨: description, cost_estimate, hint, reward_hint, disabled_reason)
  const mockCards: ActionCard[] = [
    {
      id: 'card-1',
      label: 'Card 1',
      cost: { signal: 10, memory_shard: 0 },
      risk: 'low',
      enabled: true,
      is_alternative: false,
    },
    {
      id: 'card-2',
      label: 'Card 2',
      cost: { signal: 50, memory_shard: 1 },
      risk: 'high',
      enabled: true,
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
