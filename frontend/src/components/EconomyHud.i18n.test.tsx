import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EconomyHud } from './EconomyHud';
import { useEconomyStore } from '../stores/economyStore';
import { useWorldStore } from '../stores/worldStore';

// react-i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // t 함수가 호출됨을 검증하기 위해 키를 변형하여 반환
    t: (key: string) => `translated_${key}`,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

describe('EconomyHud i18n 정합성 테스트 (U-099)', () => {
  beforeEach(() => {
    useEconomyStore.getState().reset();
    useWorldStore.getState().reset();
    useEconomyStore.getState().clearLedger();
  });

  it('거래 장부의 항목이 t 함수를 통해 번역되어 표시되어야 한다', () => {
    const { addLedgerEntry } = useEconomyStore.getState();

    // 1. 일반 키 추가
    addLedgerEntry({
      turnId: 1,
      reason: 'economy.ledger_reason.turn_cost',
      cost: { signal: 10, memory_shard: 0 },
      balanceAfter: { signal: 90, memory_shard: 5 },
      modelLabel: 'FAST',
    });

    // 2. 파라미터 포함 키 추가 (key|param)
    addLedgerEntry({
      turnId: 2,
      reason: 'inventory.sell_ledger_reason|Ancient Tome',
      cost: { signal: -50, memory_shard: 0 },
      balanceAfter: { signal: 140, memory_shard: 5 },
      modelLabel: 'FAST',
    });

    render(<EconomyHud />);

    // 일반 키 번역 확인
    expect(screen.getByText('translated_economy.ledger_reason.turn_cost')).toBeInTheDocument();

    // 파라미터 포함 키 번역 확인
    // "translated_inventory.sell_ledger_reason: Ancient Tome" 형식이 되어야 함
    expect(
      screen.getByText('translated_inventory.sell_ledger_reason: Ancient Tome'),
    ).toBeInTheDocument();
  });
});
