import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EconomyHud } from './EconomyHud';
import { useWorldStore } from '../stores/worldStore';
import { useEconomyStore } from '../stores/economyStore';

// react-i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('EconomyHud', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
    useEconomyStore.getState().reset();
    useEconomyStore.getState().clearLedger();
  });

  it('현재 잔액을 올바르게 표시해야 한다', () => {
    useWorldStore.getState().setEconomy({ signal: 50, memory_shard: 5 });

    render(<EconomyHud />);

    expect(screen.getByTestId('signal-balance')).toHaveTextContent('50');
    expect(screen.getByTestId('shard-balance')).toHaveTextContent('5');
  });

  it('예상 비용이 있을 때 표시해야 한다', () => {
    useEconomyStore.getState().setCostEstimate({
      min: { signal: 5, memory_shard: 0 },
      max: { signal: 10, memory_shard: 0 },
      label: 'Test Action',
    });

    render(<EconomyHud />);

    expect(screen.getByText('economy.estimated_cost')).toBeInTheDocument();
    expect(screen.getByText('Test Action')).toBeInTheDocument();
    expect(screen.getByText('5~10')).toBeInTheDocument();
  });

  it('감당할 수 없는 예상 비용일 때 경고를 표시해야 한다', () => {
    useWorldStore.getState().setEconomy({ signal: 5, memory_shard: 0 });
    useEconomyStore.getState().setCostEstimate({
      min: { signal: 10, memory_shard: 0 },
      max: { signal: 15, memory_shard: 0 },
    });

    const { container } = render(<EconomyHud />);

    expect(screen.getByText('economy.insufficient_funds')).toBeInTheDocument();
    expect(container.querySelector('.cost-unaffordable')).toBeInTheDocument();
  });

  it('예상 비용이 없을 때 마지막 확정 비용을 표시해야 한다', () => {
    useEconomyStore.getState().setLastCost({
      turnId: 1,
      cost: { signal: 8, memory_shard: 1 },
      balanceAfter: { signal: 92, memory_shard: 4 },
      modelLabel: 'QUALITY',
    });

    render(<EconomyHud />);

    expect(screen.getByText('economy.confirmed_cost')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('economy.model_label.QUALITY')).toBeInTheDocument();
  });

  it('잔액 부족 시 경고 및 대안을 표시해야 한다', () => {
    // 임계값 10, 현재 잔액 5
    useWorldStore.getState().setEconomy({ signal: 5, memory_shard: 0 });
    useEconomyStore.getState().updateBalanceLowStatus({ signal: 5, memory_shard: 0 });

    render(<EconomyHud />);

    expect(screen.getByText('economy.low_balance_warning')).toBeInTheDocument();
    expect(screen.getByText('economy.alternatives_title')).toBeInTheDocument();
    expect(screen.getByText('economy.alternative_text_only')).toBeInTheDocument();
  });

  it('compact 모드에서는 잔액만 표시해야 한다', () => {
    useEconomyStore.getState().setCostEstimate({
      min: { signal: 5, memory_shard: 0 },
      max: { signal: 10, memory_shard: 0 },
    });

    render(<EconomyHud compact />);

    // 잔액은 표시됨
    expect(screen.getByTestId('signal-balance')).toBeInTheDocument();
    // 예상 비용은 표시되지 않음
    expect(screen.queryByText('economy.estimated_cost')).not.toBeInTheDocument();
  });

  it('거래 장부 이력이 있을 때 표시해야 한다', () => {
    useEconomyStore.getState().addLedgerEntry({
      turnId: 1,
      reason: 'test reason',
      cost: { signal: 5, memory_shard: 0 },
      balanceAfter: { signal: 95, memory_shard: 5 },
      modelLabel: 'FAST',
    });

    render(<EconomyHud />);

    expect(screen.getByText('economy.ledger_title')).toBeInTheDocument();
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('test reason')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
  });
});
