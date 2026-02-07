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
// 상수 정의 (U-069: QUALITY 트리거 액션)
// =============================================================================

/**
 * QUALITY 모델 트리거 액션 ID 목록 (U-069).
 * 백엔드 TextModelTiering.QUALITY_TRIGGER_ACTION_IDS와 동기화 필요.
 * 이 목록에 포함된 액션은 QUALITY 배지와 2x 비용이 표시됩니다.
 */
const QUALITY_TRIGGER_ACTION_IDS: ReadonlySet<string> = new Set([
  'deep_investigate',
  '정밀조사',
  'analyze',
  'examine_closely',
  'investigate_detail',
  'scrutinize',
  'thorough_search',
  'use_magnifier',
  'use_magnifying_glass',
]);

/** QUALITY 모델 비용 배수 (U-069: 2x) */
const QUALITY_COST_MULTIPLIER = 2;

/**
 * VISION(정밀분석) 트리거 액션 ID 목록 (U-076).
 * 백엔드 TextModelTiering.VISION_TRIGGER_ACTION_IDS와 동기화 필요.
 * 이 목록에 포함된 액션은 VISION 배지와 1.5x 비용이 표시됩니다.
 */
const VISION_TRIGGER_ACTION_IDS: ReadonlySet<string> = new Set([
  'deep_analyze',
  '정밀분석',
  'analyze_scene',
  'examine_scene',
  'look_closely',
]);

/** VISION 비용 배수 (U-076 Q2: 1.5x) */
const VISION_COST_MULTIPLIER = 1.5;

/**
 * U-079: 재화 획득 액션 카드 ID 접두사.
 * 이 접두사로 시작하는 카드는 재화 획득 카드로 표시합니다.
 */
const EARN_ACTION_PREFIX = 'earn_';

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
  /** U-069: QUALITY 모델 사용 여부 */
  isQualityAction: boolean;
  /** U-076: VISION(정밀분석) 사용 여부 */
  isVisionAction: boolean;
  /** U-079: 재화 획득 액션 여부 */
  isEarnAction: boolean;
  /** U-069/U-076: 배수 적용된 표시 비용 */
  displayCost: { signal: number; memory_shard: number };
}

// =============================================================================
// 기본 카드 생성 (i18n 기반)
// =============================================================================

/**
 * 기본 카드 생성 (i18n 기반) - U-065 단순화.
 * U-065: description, cost_estimate, hint, reward_hint, disabled_reason 필드 제거됨
 */
function useDefaultCards(): ActionCard[] {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        id: 'default-explore',
        label: t('action.default.explore.label'),
        cost: { signal: 1, memory_shard: 0 },
        risk: 'low' as const,
        enabled: true,
        is_alternative: false,
      },
      {
        id: 'default-investigate',
        label: t('action.default.investigate.label'),
        cost: { signal: 2, memory_shard: 0 },
        risk: 'medium' as const,
        enabled: true,
        is_alternative: false,
      },
      {
        id: 'default-talk',
        label: t('action.default.talk.label'),
        cost: { signal: 1, memory_shard: 0 },
        risk: 'low' as const,
        enabled: true,
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

/**
 * 비용 표시 컴포넌트 - U-065 단순화, U-069 QUALITY 배수 지원.
 * cost_estimate 필드 제거됨, displayCost(배수 적용) 사용
 */
function CardCostDisplay({ card }: CardCostDisplayProps) {
  const { t } = useTranslation();

  // U-069: displayCost 사용 (QUALITY 액션은 2x 배수 적용됨)
  const costDisplay = `${card.displayCost.signal}`;
  const shardCost = card.displayCost.memory_shard;

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
          <span className="icon-fallback">{'\u26A1'}</span>
        </span>
        <span
          className={`cost-value ${card.isQualityAction ? 'quality-cost' : ''} ${card.isVisionAction ? 'vision-cost' : ''}`}
        >
          {costDisplay}
          {card.isQualityAction && <span className="cost-multiplier">x2</span>}
          {card.isVisionAction && <span className="cost-multiplier">x1.5</span>}
        </span>
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
            <span className="icon-fallback">{'\u{1F48E}'}</span>
          </span>
          <span
            className={`cost-value ${card.isQualityAction ? 'quality-cost' : ''} ${card.isVisionAction ? 'vision-cost' : ''}`}
          >
            {shardCost}
            {card.isQualityAction && <span className="cost-multiplier">x2</span>}
            {card.isVisionAction && <span className="cost-multiplier">x1.5</span>}
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
          <span className="icon-fallback">{'\u26A0'}</span>
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

/**
 * U-083: 뱃지 최대 표시 개수 (Q1: Option B - 최대 2개 + "외 N개")
 */
const MAX_VISIBLE_BADGES = 2;

/**
 * 카드에 표시할 뱃지 목록을 수집한다.
 * U-083: 각 뱃지를 통합 배열로 모아 최대 2개까지만 렌더링 + 초과분 "외 N개" 표시.
 */
interface BadgeInfo {
  key: string;
  className: string;
  label: string;
  tooltip: string;
}

function collectBadges(card: CardDisplayInfo, t: (key: string) => string): BadgeInfo[] {
  const badges: BadgeInfo[] = [];

  // U-076: VISION(정밀분석) 배지 (최우선)
  if (card.isVisionAction) {
    const label = `\uD83D\uDD0D ${t('action.vision_badge')}`;
    badges.push({
      key: 'vision',
      className: 'badge-vision',
      label,
      tooltip: t('action.vision_badge'),
    });
  }

  // U-069: QUALITY 모델 배지 (VISION이 아닐 때)
  if (!card.isVisionAction && card.isQualityAction) {
    badges.push({
      key: 'quality',
      className: 'badge-quality',
      label: '\u2605 QUALITY',
      tooltip: t('economy.model_label.QUALITY'),
    });
  }

  // U-079: 재화 획득 카드 배지
  if (card.isEarnAction) {
    const label = `\u26A1 ${t('action.earn_badge')}`;
    badges.push({
      key: 'earn',
      className: 'badge-earn',
      label,
      tooltip: t('action.earn_badge'),
    });
  }

  // U-083: 대안 카드 표시 (조건 완화: 다른 뱃지가 있어도 표시될 수 있도록 함)
  // 재화 부족 등으로 '대안'이면서 'QUALITY'일 수 있는 상황 지원
  if (card.is_alternative) {
    badges.push({
      key: 'alt',
      className: 'badge-alternative',
      label: t('action.alternative'),
      tooltip: t('action.alternative'),
    });
  }

  return badges;
}

/**
 * 단일 카드 컴포넌트 - U-065 단순화, U-069 QUALITY 배지 지원.
 * U-083: 뱃지를 비용 아래 별도 행으로 이동, 최대 2개 + "외 N개", ellipsis + 툴팁
 */
function ActionCardItem({ card, onClick, onHover, disabled }: ActionCardItemProps) {
  const { t } = useTranslation();

  const cardClasses = [
    'action-card',
    'has-chrome',
    card.isDisabled ? 'card-disabled' : '',
    card.is_alternative ? 'card-alternative' : '',
    card.isQualityAction ? 'card-quality' : '',
    card.isVisionAction ? 'card-vision' : '',
    card.isEarnAction ? 'card-earn' : '',
    `risk-border-${card.risk}`,
  ]
    .filter(Boolean)
    .join(' ');

  // U-083: 뱃지 수집 및 최대 2개 제한
  const allBadges = useMemo(() => collectBadges(card, t), [card, t]);
  const visibleBadges = allBadges.slice(0, MAX_VISIBLE_BADGES);
  const overflowCount = allBadges.length - MAX_VISIBLE_BADGES;

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
      title={card.finalDisabledReason ?? undefined}
    >
      {/* 카드 타이틀 */}
      <div className="action-card-title">{card.label}</div>

      {/* 비용/위험도 정보 */}
      <CardCostDisplay card={card} />

      {/* U-083: 뱃지 컨테이너 - 비용 아래 별도 행 (Q3: Option C) */}
      {allBadges.length > 0 && (
        <div className="action-card-badges">
          {visibleBadges.map((badge) => (
            <span
              key={badge.key}
              className={`action-card-badge ${badge.className}`}
              title={badge.tooltip}
            >
              {badge.label}
            </span>
          ))}
          {/* Q1: Option B - 초과분 "외 N개" 표시 */}
          {overflowCount > 0 && (
            <span
              className="action-card-badge badge-overflow"
              title={allBadges
                .slice(MAX_VISIBLE_BADGES)
                .map((b) => b.label)
                .join(', ')}
            >
              +{overflowCount}
            </span>
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
  // U-065: cost_estimate 제거됨
  // U-069: displayCost (배수 적용) 사용
  const handleCardHover = useCallback(
    (card: CardDisplayInfo | null) => {
      if (card) {
        setCostEstimateFromCard(card.displayCost, null, card.id, card.label);
      } else {
        setCostEstimate(null);
      }
    },
    [setCostEstimateFromCard, setCostEstimate],
  );

  // 카드가 없으면 기본 카드 사용
  const displayCards = cards.length > 0 ? cards : defaultCards;

  // 카드별 실행 가능 여부 계산 (Q1: Option A - 서버 우선, 클라이언트 폴백)
  // U-065: cost_estimate, disabled_reason 필드 제거됨
  // U-069: QUALITY 모델 트리거 및 비용 배수 계산 추가
  const processedCards: CardDisplayInfo[] = useMemo(() => {
    return displayCards.map((card) => {
      // U-079: 재화 획득 카드 감지 (earn_ 접두사)
      const isEarnAction = card.id.startsWith(EARN_ACTION_PREFIX);

      // U-083: 접두사를 제거한 순수 ID (VISION/QUALITY 체크용)
      const baseId = isEarnAction ? card.id.slice(EARN_ACTION_PREFIX.length) : card.id;

      // U-076: VISION(정밀분석) 트리거 체크 (QUALITY보다 우선)
      const isVisionAction =
        VISION_TRIGGER_ACTION_IDS.has(card.id) || VISION_TRIGGER_ACTION_IDS.has(baseId);

      // U-069: QUALITY 모델 트리거 체크 (VISION이면 QUALITY 아님)
      const isQualityAction =
        !isVisionAction &&
        (QUALITY_TRIGGER_ACTION_IDS.has(card.id) || QUALITY_TRIGGER_ACTION_IDS.has(baseId));

      // U-069/U-076: 배수 적용된 표시 비용 계산
      const displayCost = isVisionAction
        ? {
            signal: Math.ceil(card.cost.signal * VISION_COST_MULTIPLIER),
            memory_shard: Math.ceil(card.cost.memory_shard * VISION_COST_MULTIPLIER),
          }
        : isQualityAction
          ? {
              signal: card.cost.signal * QUALITY_COST_MULTIPLIER,
              memory_shard: card.cost.memory_shard * QUALITY_COST_MULTIPLIER,
            }
          : { ...card.cost };

      // 서버에서 enabled를 명시적으로 false로 보냈으면 그대로 사용
      const serverEnabled = card.enabled;

      // 클라이언트 측 잔액 체크 (서버가 판단하지 않았을 때 폴백)
      // U-069: QUALITY 액션은 배수 적용된 비용으로 체크
      const costToCheck = displayCost;
      const isAffordable =
        currentBalance.signal >= costToCheck.signal &&
        currentBalance.memory_shard >= costToCheck.memory_shard;

      // 최종 비활성화 여부: 서버 판단 우선, 없으면 클라이언트 판단
      const isDisabled = !serverEnabled || !isAffordable;

      // 비활성화 사유 결정 (U-065: disabled_reason 제거됨)
      let finalDisabledReason: string | null = null;
      if (!serverEnabled) {
        finalDisabledReason = t('action.server_disabled');
      } else if (!isAffordable) {
        finalDisabledReason = t('action.insufficient_balance');
      }

      return {
        ...card,
        isAffordable,
        isDisabled,
        finalDisabledReason,
        isQualityAction,
        isVisionAction,
        isEarnAction,
        displayCost,
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
