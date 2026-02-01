/**
 * Unknown World - Action Deck 컴포넌트 (U-009[Mvp]).
 *
 * PRD 요구사항:
 *   - Action Deck(3~6장 카드)을 Footer 영역에 상시 노출
 *   - 각 카드에 예상 비용(최소/최대), 위험도, 보상 힌트 표기 (RULE-005)
 *   - 카드 클릭 시 TurnInput으로 선택된 행동 전송 (RULE-008)
 *   - 잔액 부족 시 실행 불가 표시 + 저비용 대안 노출 (RULE-005)
 *
 * RULE-002 준수: 채팅 버블/메시지 버튼이 아닌 "게임 카드" UI
 *
 * @see vibe/prd.md 6.7 - Action Deck 요구사항
 * @see .cursor/rules/10-frontend-game-ui.mdc
 * @module components/ActionDeck
 */

import { useMemo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ActionCard } from '../schemas/turn';
import { useActionDeckStore } from '../stores/actionDeckStore';
import { useWorldStore } from '../stores/worldStore';
import { useAgentStore } from '../stores/agentStore';
import { useEconomyStore } from '../stores/economyStore';

// =============================================================================
// 드래그 스크롤 훅 (U-049: 스크롤바 숨기고 드래그로 이동)
// U-063-fix: 클릭과 드래그를 구분하여 카드 클릭이 정상 동작하도록 수정
// =============================================================================

/** 드래그로 인식할 최소 이동 거리 (픽셀) */
const DRAG_THRESHOLD = 5;

function useDragScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ref로 관리하여 불필요한 리렌더링 방지
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    // mouseDown 시에는 isDragging을 설정하지 않음 (클릭 허용)
    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeftRef.current = containerRef.current.scrollLeft;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !containerRef.current) return;

    const x = e.pageX - containerRef.current.offsetLeft;
    const distance = Math.abs(x - startXRef.current);

    // 임계값을 넘어야 드래그로 인식
    if (distance > DRAG_THRESHOLD) {
      if (!hasDraggedRef.current) {
        hasDraggedRef.current = true;
        setIsDragging(true);
      }
      e.preventDefault();
      const walk = (x - startXRef.current) * 1.5; // 스크롤 속도 조절
      containerRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    // 드래그가 발생했으면 약간의 지연 후 isDragging 해제 (클릭 이벤트 차단 유지)
    if (hasDraggedRef.current) {
      setTimeout(() => {
        setIsDragging(false);
        hasDraggedRef.current = false;
      }, 0);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    isMouseDownRef.current = false;
    setIsDragging(false);
    hasDraggedRef.current = false;
  }, []);

  return {
    containerRef,
    isDragging,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
  };
}

// =============================================================================
// 타입 정의
// =============================================================================

export interface ActionDeckProps {
  /** 카드 클릭 콜백 */
  onCardClick?: (card: ActionCard) => void;
  /** 전체 비활성화 (스트리밍 중 등, 생략 시 agentStore.isStreaming 사용) */
  disabled?: boolean;
}

interface CardDisplayInfo extends ActionCard {
  /** 클라이언트 측 실행 가능 여부 (서버 enabled가 없을 때 폴백) */
  isAffordable: boolean;
  /** 최종 비활성화 여부 */
  isDisabled: boolean;
  /** 최종 비활성화 사유 */
  finalDisabledReason: string | null;
}

// =============================================================================
// 기본 카드 생성 (i18n 기반)
// =============================================================================

function useDefaultCards(): ActionCard[] {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        id: 'default-explore',
        label: t('action.default.explore.label'),
        description: t('action.default.explore.description'),
        cost: { signal: 1, memory_shard: 0 },
        cost_estimate: null,
        risk: 'low' as const,
        hint: null,
        reward_hint: null,
        enabled: true,
        disabled_reason: null,
        is_alternative: false,
      },
      {
        id: 'default-investigate',
        label: t('action.default.investigate.label'),
        description: t('action.default.investigate.description'),
        cost: { signal: 2, memory_shard: 0 },
        cost_estimate: null,
        risk: 'medium' as const,
        hint: null,
        reward_hint: null,
        enabled: true,
        disabled_reason: null,
        is_alternative: false,
      },
      {
        id: 'default-talk',
        label: t('action.default.talk.label'),
        description: t('action.default.talk.description'),
        cost: { signal: 1, memory_shard: 0 },
        cost_estimate: null,
        risk: 'low' as const,
        hint: null,
        reward_hint: null,
        enabled: true,
        disabled_reason: null,
        is_alternative: false,
      },
    ],
    [t],
  );
}

// =============================================================================
// 카드 비용 표시 컴포넌트
// =============================================================================

interface CardCostDisplayProps {
  card: CardDisplayInfo;
}

function CardCostDisplay({ card }: CardCostDisplayProps) {
  const { t } = useTranslation();

  // 비용 추정 범위가 있으면 min~max 표시, 없으면 기본 cost 표시
  const costDisplay = card.cost_estimate
    ? `${card.cost_estimate.min.signal}~${card.cost_estimate.max.signal}`
    : `${card.cost.signal}`;

  const shardCost = card.cost_estimate
    ? card.cost_estimate.max.memory_shard
    : card.cost.memory_shard;

  return (
    <div className="action-card-cost" data-ui-importance="critical">
      {/* Signal 비용 */}
      <span className="cost-item">
        <span className="icon-wrapper" aria-label={t('economy.signal_cost')}>
          <img
            src="/ui/icons/signal-16.png"
            alt=""
            aria-hidden="true"
            className="icon-img"
            style={{ width: 14, height: 14 }}
            onError={(e) => e.currentTarget.classList.add('hidden')}
          />
          <span className="icon-fallback">⚡</span>
        </span>
        <span className="cost-value">{costDisplay}</span>
      </span>

      {/* Shard 비용 (0보다 클 때만 표시) */}
      {shardCost > 0 && (
        <span className="cost-item">
          <span className="cost-separator">|</span>
          <span className="icon-wrapper" aria-label={t('economy.shard_cost')}>
            <img
              src="/ui/icons/shard-16.png"
              alt=""
              aria-hidden="true"
              className="icon-img"
              style={{ width: 14, height: 14 }}
              onError={(e) => e.currentTarget.classList.add('hidden')}
            />
            <span className="icon-fallback">💎</span>
          </span>
          <span className="cost-value">
            {card.cost_estimate
              ? `${card.cost_estimate.min.memory_shard}~${card.cost_estimate.max.memory_shard}`
              : card.cost.memory_shard}
          </span>
        </span>
      )}

      {/* 위험도 */}
      <span className="cost-item">
        <span className="cost-separator">|</span>
        <span className="icon-wrapper" aria-label={t('economy.risk_level')}>
          <img
            src={`/ui/icons/risk-${card.risk}-16.png`}
            alt=""
            aria-hidden="true"
            className={`icon-img risk-${card.risk}`}
            style={{ width: 14, height: 14 }}
            onError={(e) => e.currentTarget.classList.add('hidden')}
          />
          <span className="icon-fallback">⚠</span>
        </span>
        <span className={`risk-label risk-${card.risk}`}>{t(`action.risk.${card.risk}`)}</span>
      </span>
    </div>
  );
}

// =============================================================================
// 단일 카드 컴포넌트
// =============================================================================

interface ActionCardItemProps {
  card: CardDisplayInfo;
  onClick: () => void;
  onHover: (card: CardDisplayInfo | null) => void;
  disabled: boolean;
}

function ActionCardItem({ card, onClick, onHover, disabled }: ActionCardItemProps) {
  const { t } = useTranslation();

  const cardClasses = [
    'action-card',
    'has-chrome',
    card.isDisabled ? 'card-disabled' : '',
    card.is_alternative ? 'card-alternative' : '',
    `risk-border-${card.risk}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cardClasses}
      onClick={onClick}
      onMouseEnter={() => onHover(card)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(card)}
      onBlur={() => onHover(null)}
      disabled={disabled || card.isDisabled}
      aria-disabled={disabled || card.isDisabled}
      title={card.finalDisabledReason ?? card.description ?? undefined}
    >
      {/* 대안 카드 표시 */}
      {card.is_alternative && <span className="alternative-badge">{t('action.alternative')}</span>}

      {/* 카드 타이틀 */}
      <div className="action-card-title">{card.label}</div>

      {/* 카드 설명 (있을 때만) */}
      {card.description && <div className="action-card-description">{card.description}</div>}

      {/* 비용/위험도 정보 */}
      <CardCostDisplay card={card} />

      {/* 힌트 영역 */}
      {(card.hint || card.reward_hint) && (
        <div className="action-card-hints">
          {card.hint && (
            <div className="hint-item hint-risk">
              <span className="hint-icon">⚠</span>
              <span className="hint-text">{card.hint}</span>
            </div>
          )}
          {card.reward_hint && (
            <div className="hint-item hint-reward">
              <span className="hint-icon">★</span>
              <span className="hint-text">{card.reward_hint}</span>
            </div>
          )}
        </div>
      )}

      {/* 비활성화 오버레이 */}
      {card.isDisabled && (
        <div className="card-disabled-overlay">
          <span className="disabled-reason">
            {card.finalDisabledReason ?? t('action.insufficient_balance')}
          </span>
        </div>
      )}
    </button>
  );
}

// =============================================================================
// 메인 Action Deck 컴포넌트
// =============================================================================

export function ActionDeck({ onCardClick, disabled: propsDisabled }: ActionDeckProps) {
  const { t } = useTranslation();
  const defaultCards = useDefaultCards();

  // Store 상태 (RU-003: 컴포넌트 내에서 직접 구독)
  const cards = useActionDeckStore((state) => state.cards);
  const currentBalance = useWorldStore((state) => state.economy);
  const isStreaming = useAgentStore((state) => state.isStreaming);
  const setCostEstimateFromCard = useEconomyStore((state) => state.setCostEstimateFromCard);
  const setCostEstimate = useEconomyStore((state) => state.setCostEstimate);

  // U-049: 드래그 스크롤
  const { containerRef, isDragging, handlers: dragHandlers } = useDragScroll();

  const disabled = propsDisabled ?? isStreaming;

  // 카드 호버 핸들러 (U-014: 예상 비용 표시)
  const handleCardHover = useCallback(
    (card: CardDisplayInfo | null) => {
      if (card) {
        setCostEstimateFromCard(card.cost, card.cost_estimate, card.id, card.label);
      } else {
        setCostEstimate(null);
      }
    },
    [setCostEstimateFromCard, setCostEstimate],
  );

  // 카드가 없으면 기본 카드 사용
  const displayCards = cards.length > 0 ? cards : defaultCards;

  // 카드별 실행 가능 여부 계산 (Q1: Option A - 서버 우선, 클라이언트 폴백)
  const processedCards: CardDisplayInfo[] = useMemo(() => {
    return displayCards.map((card) => {
      // 서버에서 enabled를 명시적으로 false로 보냈으면 그대로 사용
      const serverEnabled = card.enabled;

      // 클라이언트 측 잔액 체크 (서버가 판단하지 않았을 때 폴백)
      const costToCheck = card.cost_estimate?.max ?? card.cost;
      const isAffordable =
        currentBalance.signal >= costToCheck.signal &&
        currentBalance.memory_shard >= costToCheck.memory_shard;

      // 최종 비활성화 여부: 서버 판단 우선, 없으면 클라이언트 판단
      const isDisabled = !serverEnabled || !isAffordable;

      // 비활성화 사유 결정
      let finalDisabledReason: string | null = null;
      if (!serverEnabled && card.disabled_reason) {
        finalDisabledReason = card.disabled_reason;
      } else if (!isAffordable) {
        finalDisabledReason = t('action.insufficient_balance');
      }

      return {
        ...card,
        isAffordable,
        isDisabled,
        finalDisabledReason,
      };
    });
  }, [displayCards, currentBalance, t]);

  // 일반 카드와 대안 카드 분리 (대안 카드는 뒤에 배치)
  const sortedCards = useMemo(() => {
    const regular = processedCards.filter((c) => !c.is_alternative);
    const alternatives = processedCards.filter((c) => c.is_alternative);
    return [...regular, ...alternatives];
  }, [processedCards]);

  return (
    <div
      ref={containerRef}
      className={`action-deck ${isDragging ? 'is-dragging' : ''}`}
      role="group"
      aria-label={t('action.deck_label')}
      {...dragHandlers}
    >
      {sortedCards.map((card) => (
        <ActionCardItem
          key={card.id}
          card={card}
          onClick={() => onCardClick?.(card)}
          onHover={handleCardHover}
          disabled={disabled || isDragging} /* 드래그 중 클릭 방지 */
        />
      ))}

      {/* 모든 카드가 비활성화되었을 때 안내 */}
      {sortedCards.every((c) => c.isDisabled) && !disabled && (
        <div className="deck-empty-notice">{t('action.all_disabled_notice')}</div>
      )}
    </div>
  );
}

export default ActionDeck;
