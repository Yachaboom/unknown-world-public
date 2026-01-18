/**
 * Unknown World - Mutation Timeline (U-013)
 *
 * 규칙 변형 이벤트를 시간순으로 표시하는 타임라인 컴포넌트입니다.
 * "세계가 변했다"를 UI로 체감할 수 있게 합니다.
 *
 * 설계 원칙:
 *   - RULE-002: 채팅 UI가 아닌 게임 UI로 상시 노출
 *   - RULE-006: i18n 기반 문자열 관리
 *   - PRD 6.4: Rule Mutation Timeline
 *   - Q1 결정: Option B - 별도 Timeline 컴포넌트 (가독성/확장 용이)
 *
 * @module components/MutationTimeline
 */

import { useTranslation } from 'react-i18next';
import { useWorldStore, selectMutationTimeline } from '../stores/worldStore';
import type { MutationEvent } from '../stores/worldStore';

// =============================================================================
// 상수
// =============================================================================

/** 표시할 최대 이벤트 수 (MMP에서 스크롤/요약 전략 적용 예정) */
const MAX_DISPLAY_EVENTS = 10;

// =============================================================================
// 하위 컴포넌트
// =============================================================================

interface TimelineEventProps {
  event: MutationEvent;
}

/**
 * 개별 타임라인 이벤트 렌더링
 */
function TimelineEvent({ event }: TimelineEventProps) {
  const { t } = useTranslation();

  // 이벤트 유형별 아이콘
  const typeIcon = {
    added: '➕',
    modified: '🔄',
    removed: '➖',
  }[event.type];

  // 이벤트 유형별 CSS 클래스
  const typeClass = `timeline-event-${event.type}`;

  return (
    <div className={`timeline-event ${typeClass}`} data-event-type={event.type}>
      <div className="timeline-event-marker">
        <span className="timeline-event-icon" aria-hidden="true">
          {typeIcon}
        </span>
        <span className="timeline-event-turn">
          {t('mutation.turn_label', { turn: event.turn })}
        </span>
      </div>
      <div className="timeline-event-content">
        <span className="timeline-event-label">{event.label}</span>
        <span className="timeline-event-type">{t(`mutation.type.${event.type}`)}</span>
        {event.description && <p className="timeline-event-description">{event.description}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * Mutation Timeline
 *
 * 규칙 변형 이벤트를 시간순(최신 먼저)으로 표시합니다.
 * worldStore의 mutationTimeline 상태를 구독하여 실시간 업데이트됩니다.
 */
export function MutationTimeline() {
  const { t } = useTranslation();
  const mutationTimeline = useWorldStore(selectMutationTimeline);

  // 표시할 이벤트 (최대 개수 제한)
  const displayEvents = mutationTimeline.slice(0, MAX_DISPLAY_EVENTS);
  const hasMore = mutationTimeline.length > MAX_DISPLAY_EVENTS;

  // 빈 상태
  if (mutationTimeline.length === 0) {
    return (
      <div className="mutation-timeline-content timeline-empty" data-ui-importance="critical">
        <div className="timeline-empty-icon" aria-hidden="true">
          📊
        </div>
        <p className="timeline-empty-text">{t('mutation.empty')}</p>
      </div>
    );
  }

  return (
    <div className="mutation-timeline-content" data-ui-importance="critical">
      <div className="timeline-header">
        <span className="timeline-title">{t('mutation.timeline_title')}</span>
        <span className="timeline-count">
          {t('mutation.event_count', { count: mutationTimeline.length })}
        </span>
      </div>
      <div className="timeline-events" role="list" aria-label={t('mutation.timeline_title')}>
        {displayEvents.map((event, index) => (
          <TimelineEvent key={`${event.ruleId}-${event.turn}-${index}`} event={event} />
        ))}
      </div>
      {hasMore && (
        <div className="timeline-more">
          <span className="timeline-more-text">
            {t('mutation.more_events', { count: mutationTimeline.length - MAX_DISPLAY_EVENTS })}
          </span>
        </div>
      )}
    </div>
  );
}

export default MutationTimeline;
