/**
 * Unknown World - 엔딩 리포트 모달 (U-025[Mvp]).
 *
 * 세션 종료 시 생성된 엔딩 리포트를 CRT 테마로 표시합니다.
 * PRD 6.5 동적 엔딩 생성기 요구사항을 충족합니다.
 *
 * 설계 원칙:
 *   - RULE-001: 게임 아티팩트로 표시 (채팅 UI 아님)
 *   - RULE-005: 경제 결산은 ledger 기반
 *   - RULE-006: 리포트 언어는 세션 언어와 동일
 *
 * @module components/EndingReportModal
 */

import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useArtifactsStore,
  selectEndingReport,
  selectIsReportOpen,
  selectIsGenerating,
} from '../stores/artifactsStore';
import type { EndingReport } from '../stores/artifactsStore';

// =============================================================================
// 메인 컴포넌트
// =============================================================================

export const EndingReportModal = React.memo(function EndingReportModal() {
  const { t } = useTranslation();
  const report = useArtifactsStore(selectEndingReport);
  const isOpen = useArtifactsStore(selectIsReportOpen);
  const isGenerating = useArtifactsStore(selectIsGenerating);
  const error = useArtifactsStore((s) => s.error);
  const closeReport = useArtifactsStore((s) => s.closeReport);

  // ESC 키로 닫기
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeReport();
      }
    },
    [isOpen, closeReport],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  // 로딩 상태
  if (isGenerating) {
    return (
      <div className="ending-report-overlay" role="dialog" aria-modal="true">
        <div className="ending-report-modal ending-report-loading">
          <div className="ending-report-spinner" />
          <p className="ending-report-loading-text">{t('ending_report.generating')}</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="ending-report-overlay" role="dialog" aria-modal="true">
        <div className="ending-report-modal ending-report-error">
          <p className="ending-report-error-text">{t('ending_report.error')}</p>
          <p className="ending-report-error-detail">{error}</p>
          <button type="button" className="ending-report-close-btn" onClick={closeReport}>
            {t('ending_report.close')}
          </button>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (!report) {
    return (
      <div className="ending-report-overlay" role="dialog" aria-modal="true">
        <div className="ending-report-modal">
          <p>{t('ending_report.no_data')}</p>
          <button type="button" className="ending-report-close-btn" onClick={closeReport}>
            {t('ending_report.close')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ending-report-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('ending_report.title')}
    >
      <div className="ending-report-modal">
        {/* 헤더 */}
        <div className="ending-report-header">
          <h2 className="ending-report-title">{t('ending_report.title')}</h2>
          <button
            type="button"
            className="ending-report-close-btn"
            onClick={closeReport}
            aria-label={t('ending_report.close')}
          >
            {'\u2715'}
          </button>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="ending-report-content">
          <NarrativeSummarySection report={report} />
          <QuestAchievementSection report={report} />
          <EconomySettlementSection report={report} />
          <RuleTimelineSection report={report} />
          <PlayStatsSection report={report} />
        </div>

        {/* 푸터 */}
        <div className="ending-report-footer">
          <button type="button" className="ending-report-action-btn" onClick={closeReport}>
            {t('ending_report.close')}
          </button>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// 섹션 컴포넌트들
// =============================================================================

function NarrativeSummarySection({ report }: { report: EndingReport }) {
  const { t } = useTranslation();
  return (
    <section className="ending-report-section">
      <h3 className="ending-report-section-title">
        <span className="section-icon">{'\u{1F4DC}'}</span>
        {t('ending_report.section_summary')}
      </h3>
      <div className="ending-report-narrative">
        {report.narrative_summary.split('\n').map((line, i) => {
          if (line.trim() === '---') {
            return <hr key={i} className="ending-report-divider" />;
          }
          return line.trim() ? <p key={i}>{line}</p> : null;
        })}
      </div>
    </section>
  );
}

function QuestAchievementSection({ report }: { report: EndingReport }) {
  const { t } = useTranslation();
  const qa = report.quest_achievement;

  return (
    <section className="ending-report-section">
      <h3 className="ending-report-section-title">
        <span className="section-icon">{'\u{1F3AF}'}</span>
        {t('ending_report.section_quests')}
      </h3>

      {/* 달성률 바 */}
      <div className="ending-report-progress-bar-container">
        <div className="ending-report-progress-bar">
          <div
            className="ending-report-progress-fill"
            style={{ width: `${qa.completion_rate * 100}%` }}
          />
        </div>
        <span className="ending-report-progress-label">
          {t('ending_report.quest_completion', {
            completed: qa.completed,
            total: qa.total,
            rate: Math.round(qa.completion_rate * 100),
          })}
        </span>
      </div>

      {/* 퀘스트 목록 */}
      <ul className="ending-report-quest-list">
        {qa.quests.map((quest, i) => (
          <li
            key={i}
            className={`ending-report-quest-item ${quest.is_completed ? 'quest-complete' : 'quest-incomplete'}`}
          >
            <span className="quest-marker">{quest.is_completed ? '\u25C6' : '\u25C7'}</span>
            <span className="quest-label">{quest.label}</span>
            {quest.is_main && (
              <span className="quest-badge quest-badge-main">{t('ending_report.quest_main')}</span>
            )}
            <span
              className={`quest-badge ${quest.is_completed ? 'quest-badge-complete' : 'quest-badge-progress'}`}
            >
              {quest.is_completed ? t('ending_report.quest_complete') : `${quest.progress}%`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EconomySettlementSection({ report }: { report: EndingReport }) {
  const { t } = useTranslation();
  const es = report.economy_settlement;

  return (
    <section className="ending-report-section">
      <h3 className="ending-report-section-title">
        <span className="section-icon">{'\u26A1'}</span>
        {t('ending_report.section_economy')}
      </h3>

      <div className="ending-report-economy-grid">
        <div className="economy-stat">
          <span className="economy-stat-label">{t('ending_report.economy_initial')}</span>
          <span className="economy-stat-value">{es.initial_signal} Signal</span>
        </div>
        <div className="economy-stat">
          <span className="economy-stat-label">{t('ending_report.economy_final')}</span>
          <span className="economy-stat-value economy-stat-highlight">
            {es.final_signal} Signal
          </span>
        </div>
        <div className="economy-stat">
          <span className="economy-stat-label">{t('ending_report.economy_spent')}</span>
          <span className="economy-stat-value economy-stat-negative">-{es.total_spent_signal}</span>
        </div>
        <div className="economy-stat">
          <span className="economy-stat-label">{t('ending_report.economy_earned')}</span>
          <span className="economy-stat-value economy-stat-positive">
            +{es.total_earned_signal}
          </span>
        </div>
        <div className="economy-stat economy-stat-wide">
          <span className="economy-stat-label">{t('ending_report.economy_transactions')}</span>
          <span className="economy-stat-value">{es.transaction_count}</span>
        </div>
      </div>

      {/* Ledger 일관성 배지 */}
      <div
        className={`ending-report-consistency ${es.balance_consistent ? 'consistent' : 'inconsistent'}`}
      >
        {es.balance_consistent
          ? `\u2705 ${t('ending_report.economy_consistent')}`
          : `\u26A0\uFE0F ${t('ending_report.economy_inconsistent')}`}
      </div>
    </section>
  );
}

function RuleTimelineSection({ report }: { report: EndingReport }) {
  const { t } = useTranslation();
  const timeline = report.rule_timeline;

  return (
    <section className="ending-report-section">
      <h3 className="ending-report-section-title">
        <span className="section-icon">{'\u{1F504}'}</span>
        {t('ending_report.section_timeline')}
      </h3>

      {timeline.length === 0 ? (
        <p className="ending-report-empty">{t('ending_report.timeline_empty')}</p>
      ) : (
        <div className="ending-report-timeline">
          {timeline.map((event, i) => (
            <div key={i} className={`timeline-event timeline-event-${event.type}`}>
              <span className="timeline-turn">
                {t('ending_report.timeline_turn', { turn: event.turn })}
              </span>
              <span className={`timeline-badge timeline-badge-${event.type}`}>
                {t(`ending_report.timeline_${event.type}`)}
              </span>
              <span className="timeline-label">{event.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PlayStatsSection({ report }: { report: EndingReport }) {
  const { t } = useTranslation();
  const stats = report.play_stats;

  return (
    <section className="ending-report-section">
      <h3 className="ending-report-section-title">
        <span className="section-icon">{'\u{1F4CA}'}</span>
        {t('ending_report.section_stats')}
      </h3>

      <div className="ending-report-stats-grid">
        <div className="stat-item">
          <span className="stat-value">{stats.turn_count}</span>
          <span className="stat-label">{t('ending_report.stats_turns')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.items_collected}</span>
          <span className="stat-label">{t('ending_report.stats_items')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.active_rules_count}</span>
          <span className="stat-label">{t('ending_report.stats_rules')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value stat-value-text">{stats.profile_id}</span>
          <span className="stat-label">{t('ending_report.stats_profile')}</span>
        </div>
      </div>
    </section>
  );
}
