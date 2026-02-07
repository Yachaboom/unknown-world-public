/**
 * Unknown World - Economy HUD 컴포넌트 (U-014[Mvp]).
 *
 * Signal/Memory Shard 재화 잔액, 예상 비용, 확정 비용을 표시하고,
 * 잔액 부족 시 경고 및 대안을 안내하는 게임 HUD 컴포넌트입니다.
 *
 * RULE-002 준수: 채팅 버블이 아닌 게임 HUD 형태
 * RULE-005 준수: 예상 비용 사전 표시, 잔액 음수 표시 방지
 * RULE-008 준수: 비용/모델 선택 이유는 라벨로만 표시 (프롬프트 노출 금지)
 *
 * @see vibe/prd.md 5장 - 재화 목적/UX 요구
 * @module components/EconomyHud
 */

import { useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useWorldStore, type EconomyState } from '../stores/worldStore';
import {
  useEconomyStore,
  selectCostEstimate,
  selectLastCost,
  selectIsBalanceLow,
  selectRecentLedger,
  canAffordEstimate,
  type LedgerEntry,
} from '../stores/economyStore';
import type { CurrencyAmount } from '../schemas/turn';

// =============================================================================
// 타입 정의
// =============================================================================

export interface EconomyHudProps {
  /** 간소화 모드 (헤더용 - 잔액만 표시) */
  compact?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

// =============================================================================
// 아이콘 컴포넌트
// =============================================================================

interface CurrencyIconProps {
  type: 'signal' | 'shard';
  size?: number;
}

/** U-082: 기본 아이콘 크기를 24→28px로 확대 (가시성 향상) */
function CurrencyIcon({ type, size = 28 }: CurrencyIconProps) {
  const { t } = useTranslation();

  const iconSrc = type === 'signal' ? '/ui/icons/signal-24.png' : '/ui/icons/shard-24.png';
  const fallback = type === 'signal' ? '⚡' : '💎';
  const label = type === 'signal' ? t('economy.signal') : t('economy.shard');

  return (
    <span className="icon-wrapper" aria-label={label}>
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className="icon-img"
        style={{ width: size, height: size }}
        onError={(e) => e.currentTarget.classList.add('hidden')}
      />
      <span className="icon-fallback">{fallback}</span>
    </span>
  );
}

// =============================================================================
// 잔액 표시 컴포넌트
// =============================================================================

interface BalanceDisplayProps {
  balance: EconomyState;
  isLow?: boolean;
}

function BalanceDisplay({ balance, isLow }: BalanceDisplayProps) {
  const { t } = useTranslation();

  return (
    <div className={`economy-balance ${isLow ? 'balance-low' : ''}`} data-ui-importance="critical">
      <div className="balance-item">
        <CurrencyIcon type="signal" />
        <span className="balance-value" data-testid="signal-balance">
          {balance.signal}
        </span>
        <span className="balance-label">{t('economy.signal')}</span>
      </div>
      {balance.credit > 0 && (
        <div className="balance-credit" title={t('economy.credit_desc')}>
          <span className="credit-label">{t('economy.credit')}: </span>
          <span className="credit-value">-{balance.credit}</span>
        </div>
      )}
      <div className="balance-item">
        <CurrencyIcon type="shard" />
        <span className="balance-value" data-testid="shard-balance">
          {balance.memory_shard}
        </span>
        <span className="balance-label">{t('economy.shard')}</span>
      </div>
      {isLow && (
        <div className="balance-warning" aria-live="polite">
          <span className="warning-icon">⚠</span>
          <span className="warning-text">{t('economy.low_balance_warning')}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 비용 표시 컴포넌트
// =============================================================================

interface CostDisplayProps {
  /** 비용 유형 */
  type: 'estimate' | 'confirmed';
  /** 비용 범위 (예상) */
  min?: CurrencyAmount;
  max?: CurrencyAmount;
  /** 확정 비용 */
  cost?: CurrencyAmount;
  /** 감당 가능 여부 */
  affordable?: boolean;
  /** 라벨 */
  label?: string;
}

function CostDisplay({ type, min, max, cost, affordable, label }: CostDisplayProps) {
  const { t } = useTranslation();

  const isRange =
    min && max && (min.signal !== max.signal || min.memory_shard !== max.memory_shard);

  const titleKey = type === 'estimate' ? 'economy.estimated_cost' : 'economy.confirmed_cost';
  const cssClass = type === 'estimate' ? 'cost-estimate' : 'cost-confirmed';

  return (
    <div
      className={`economy-cost ${cssClass} ${affordable === false ? 'cost-unaffordable' : ''}`}
      data-ui-importance="critical"
    >
      <div className="cost-header">
        <span className="cost-title">{t(titleKey)}</span>
        {label && <span className="cost-label">{label}</span>}
      </div>
      <div className="cost-values">
        {/* Signal 비용 - U-082: 아이콘 크기 14→18px */}
        <div className="cost-item">
          <CurrencyIcon type="signal" size={18} />
          <span className="cost-value">
            {type === 'estimate' && min && max
              ? isRange
                ? `${min.signal}~${max.signal}`
                : min.signal
              : cost
                ? cost.signal
                : '-'}
          </span>
        </div>
        {/* Shard 비용 (0보다 클 때만 표시) */}
        {((type === 'estimate' && max && max.memory_shard > 0) ||
          (type === 'confirmed' && cost && cost.memory_shard > 0)) && (
          <div className="cost-item">
            <span className="cost-separator">|</span>
            <CurrencyIcon type="shard" size={18} />
            <span className="cost-value">
              {type === 'estimate' && min && max
                ? isRange
                  ? `${min.memory_shard}~${max.memory_shard}`
                  : min.memory_shard
                : cost
                  ? cost.memory_shard
                  : '-'}
            </span>
          </div>
        )}
      </div>
      {affordable === false && (
        <div className="cost-warning">
          <span className="warning-text">{t('economy.insufficient_funds')}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 거래 장부(Ledger) 항목 컴포넌트
// =============================================================================

function LedgerItem({ entry }: { entry: LedgerEntry }) {
  const { t } = useTranslation();

  return (
    <div className="ledger-item">
      <div className="ledger-info">
        <span className="ledger-turn">T{entry.turnId}</span>
        <span className="ledger-reason">{entry.reason}</span>
      </div>
      <div className="ledger-values">
        <span className="ledger-cost">
          -{entry.cost.signal}
          {entry.cost.memory_shard > 0 && ` / -${entry.cost.memory_shard}`}
        </span>
        <span
          className="ledger-model"
          title={entry.modelLabel ? t(`economy.model_label.${entry.modelLabel}`) : undefined}
        >
          {entry.modelLabel?.charAt(0)}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// 셀렉터 정의 (컴포넌트 외부에서 생성하여 참조 유지)
// =============================================================================

const selectHistory = selectRecentLedger(10);

// =============================================================================
// 메인 Economy HUD 컴포넌트
// =============================================================================

export function EconomyHud({ compact = false, className = '' }: EconomyHudProps) {
  const { t } = useTranslation();

  // Store 상태
  const economy = useWorldStore((state) => state.economy);
  const costEstimate = useEconomyStore(selectCostEstimate);
  const lastCost = useEconomyStore(selectLastCost);
  const isBalanceLow = useEconomyStore(selectIsBalanceLow);
  const recentLedger = useEconomyStore(useShallow(selectHistory));

  // U-049: 거래 장부(Ledger) 최신 항목이 보이도록 스크롤 (하단 스크롤)
  const ledgerListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ledgerListRef.current) {
      ledgerListRef.current.scrollTop = ledgerListRef.current.scrollHeight;
    }
  }, [recentLedger]);

  // 예상 비용 감당 가능 여부 계산
  const estimateAffordability = useMemo(() => {
    if (!costEstimate) return null;
    return canAffordEstimate(economy, costEstimate);
  }, [economy, costEstimate]);

  // Compact 모드 (헤더용): 잔액만 표시
  if (compact) {
    return (
      <div
        className={`economy-hud economy-hud-compact ${className}`}
        role="status"
        aria-live="polite"
      >
        <BalanceDisplay balance={economy} isLow={isBalanceLow} />
      </div>
    );
  }

  // Full 모드: 잔액 + 예상 비용 + 확정 비용 + 거래 장부 이력
  return (
    <div
      className={`economy-hud economy-hud-full ${className}`}
      role="region"
      aria-label={t('economy.hud_label')}
    >
      {/* 현재 잔액 */}
      <BalanceDisplay balance={economy} isLow={isBalanceLow} />

      {/* 예상 비용 (카드 선택/호버 시) */}
      {costEstimate && (
        <CostDisplay
          type="estimate"
          min={costEstimate.min}
          max={costEstimate.max}
          affordable={estimateAffordability?.affordable}
          label={costEstimate.label}
        />
      )}

      {/* 마지막 확정 비용 (예상 비용이 없을 때만 표시) */}
      {!costEstimate && lastCost && (
        <CostDisplay
          type="confirmed"
          cost={lastCost.cost}
          label={lastCost.modelLabel ? t(`economy.model_label.${lastCost.modelLabel}`) : undefined}
        />
      )}

      {/* U-079: 잔액 부족 시 대안 안내 + FAST 폴백 라벨 */}
      {isBalanceLow && (
        <div
          className="economy-alternatives economy-alternatives-enhanced"
          data-ui-importance="critical"
        >
          <div className="alternatives-header">
            <span className="alternatives-icon">{'\u26A1'}</span>
            <span className="alternatives-title">{t('economy.low_balance_title')}</span>
          </div>
          <div className="fast-fallback-notice">
            <span className="fast-fallback-badge">FAST</span>
            <span className="fast-fallback-text">{t('economy.fast_fallback_notice')}</span>
          </div>
          <ul className="alternatives-list">
            <li>{t('economy.hint_sell_items')}</li>
            <li>{t('economy.hint_earn_actions')}</li>
            <li>{t('economy.hint_complete_quests')}</li>
          </ul>
        </div>
      )}

      {/* 거래 장부 이력 (Ledger) */}
      <div className="economy-ledger">
        <div className="ledger-header">
          <span className="ledger-title">{t('economy.ledger_title')}</span>
        </div>
        {recentLedger.length > 0 ? (
          <div className="ledger-list" ref={ledgerListRef}>
            {recentLedger.map((entry) => (
              <LedgerItem key={`${entry.turnId}-${entry.timestamp}`} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="ledger-empty">{t('economy.ledger_empty')}</div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 헤더용 간소화 컴포넌트 (GameHeader 통합용)
// =============================================================================

export interface EconomyHudHeaderProps {
  signal: number;
  memoryShard: number;
  credit: number;
  isLow?: boolean;
}

/**
 * GameHeader에서 사용하는 간소화된 Economy HUD.
 * 기존 GameHeader의 economy-hud를 대체합니다.
 */
export function EconomyHudHeader({ signal, memoryShard, credit, isLow }: EconomyHudHeaderProps) {
  const { t } = useTranslation();
  const costEstimate = useEconomyStore(selectCostEstimate);

  // 예상 비용 감당 가능 여부
  const estimateAffordability = useMemo(() => {
    if (!costEstimate) return null;
    const balance = { signal, memory_shard: memoryShard };
    return canAffordEstimate(balance, costEstimate);
  }, [signal, memoryShard, costEstimate]);

  return (
    <div className={`economy-hud ${isLow ? 'economy-hud-low' : ''}`} data-ui-importance="critical">
      {/* 잔액 표시 */}
      <span className="icon-wrapper signal-icon" aria-label={t('economy.signal')}>
        <img
          src="/ui/icons/signal-24.png"
          alt=""
          aria-hidden="true"
          className="icon-img"
          onError={(e) => e.currentTarget.classList.add('hidden')}
        />
        <span className="icon-fallback">⚡</span>
      </span>
      <span className="currency-value" data-testid="header-signal">
        {t('economy.signal')}: {signal}
      </span>
      {credit > 0 && (
        <span className="credit-value header-credit" title={t('economy.credit_desc')}>
          -{credit}
        </span>
      )}
      <span className="icon-wrapper shard-icon" aria-label={t('economy.shard')}>
        <img
          src="/ui/icons/shard-24.png"
          alt=""
          aria-hidden="true"
          className="icon-img"
          onError={(e) => e.currentTarget.classList.add('hidden')}
        />
        <span className="icon-fallback">💎</span>
      </span>
      <span className="currency-value" data-testid="header-shard">
        {t('economy.shard')}: {memoryShard}
      </span>

      {/* 예상 비용 미니 표시 */}
      {costEstimate && (
        <span
          className={`economy-estimate-mini ${
            estimateAffordability?.affordable === false ? 'unaffordable' : ''
          }`}
          title={t('economy.estimated_cost')}
        >
          <span className="estimate-prefix">→</span>
          <span className="estimate-value">
            -{costEstimate.max.signal}
            {costEstimate.max.memory_shard > 0 && `/${costEstimate.max.memory_shard}`}
          </span>
        </span>
      )}

      {/* 잔액 부족 경고 아이콘 */}
      {isLow && (
        <span className="balance-warning-icon" title={t('economy.low_balance_warning')}>
          ⚠
        </span>
      )}
    </div>
  );
}

export default EconomyHud;
