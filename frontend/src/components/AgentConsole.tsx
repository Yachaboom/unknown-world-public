/**
 * Unknown World - Agent Console 컴포넌트.
 *
 * 에이전트형 시스템임을 UI로 증명하기 위한 컴포넌트입니다.
 * Plan/Queue/Badges/Auto-repair 트레이스를 실시간으로 표시합니다.
 *
 * 설계 원칙:
 *   - RULE-008: 단계/배지/복구만 보여줌 (프롬프트/내부 추론 노출 금지)
 *   - RULE-002: 게임 UI로 표현 (채팅 버블 금지)
 *
 * @module components/AgentConsole
 */

import { useTranslation } from 'react-i18next';
import {
  useAgentStore,
  selectIsStreaming,
  selectPhases,
  selectBadges,
  selectRepairCount,
  selectError,
  selectModelLabel,
  type PhaseInfo,
} from '../stores/agentStore';
import type { ValidationBadge, ModelLabel } from '../schemas/turn';

// =============================================================================
// 상수 정의
// =============================================================================

/** 단계 표시 이름 i18n 키 */
const PHASE_KEYS: Record<string, string> = {
  parse: 'agent.console.phase.parse',
  validate: 'agent.console.phase.validate',
  plan: 'agent.console.phase.plan',
  resolve: 'agent.console.phase.resolve',
  render: 'agent.console.phase.render',
  verify: 'agent.console.phase.verify',
  commit: 'agent.console.phase.commit',
};

/** 배지 표시 정보 (i18n 키 기반) */
const BADGE_INFO: Record<ValidationBadge, { labelKey: string; isOk: boolean }> = {
  schema_ok: { labelKey: 'agent.console.badge.schema', isOk: true },
  schema_fail: { labelKey: 'agent.console.badge.schema', isOk: false },
  economy_ok: { labelKey: 'agent.console.badge.economy', isOk: true },
  economy_fail: { labelKey: 'agent.console.badge.economy', isOk: false },
  safety_ok: { labelKey: 'agent.console.badge.safety', isOk: true },
  safety_blocked: { labelKey: 'agent.console.badge.safety', isOk: false },
  consistency_ok: { labelKey: 'agent.console.badge.consistency', isOk: true },
  consistency_fail: { labelKey: 'agent.console.badge.consistency', isOk: false },
};

/** 모델 라벨 표시 정보 (U-069: FAST/QUALITY) */
const MODEL_LABEL_INFO: Record<ModelLabel, { labelKey: string; icon: string; colorClass: string }> =
  {
    FAST: { labelKey: 'agent.console.model.fast', icon: '\u26A1', colorClass: 'model-fast' },
    QUALITY: {
      labelKey: 'agent.console.model.quality',
      icon: '\u2605',
      colorClass: 'model-quality',
    },
    CHEAP: { labelKey: 'agent.console.model.cheap', icon: '\u{1F4B0}', colorClass: 'model-cheap' },
    REF: { labelKey: 'agent.console.model.ref', icon: '\u{1F4F7}', colorClass: 'model-ref' },
  };

// =============================================================================
// 하위 컴포넌트
// =============================================================================

/** 단계 상태 아이콘 */
function PhaseIcon({ status }: { status: PhaseInfo['status'] }) {
  switch (status) {
    case 'pending':
      return <span className="phase-icon pending">○</span>;
    case 'in_progress':
      return <span className="phase-icon in-progress">◎</span>;
    case 'completed':
      return <span className="phase-icon completed">●</span>;
    case 'failed':
      return <span className="phase-icon failed">✕</span>;
    default:
      return <span className="phase-icon">○</span>;
  }
}

/** 단계 큐 항목 */
function PhaseQueueItem({ phase }: { phase: PhaseInfo }) {
  const { t } = useTranslation();
  const key = PHASE_KEYS[phase.name];
  const label = key ? t(key) : phase.name;
  const statusClass = `phase-item ${phase.status}`;

  return (
    <div className={statusClass}>
      <PhaseIcon status={phase.status} />
      <span className="phase-label">{label}</span>
    </div>
  );
}

/** 단계 큐 */
function PhaseQueue() {
  const { t } = useTranslation();
  const phases = useAgentStore(selectPhases);

  return (
    <div className="phase-queue">
      <div className="queue-label">{t('agent.console.queue')}</div>
      <div className="queue-items">
        {phases.map((phase) => (
          <PhaseQueueItem key={phase.name} phase={phase} />
        ))}
      </div>
    </div>
  );
}

/** 배지 아이템 */
function BadgeItem({ badge }: { badge: ValidationBadge }) {
  const { t } = useTranslation();
  const info = BADGE_INFO[badge];
  if (!info) return null;

  const statusClass = info.isOk ? 'badge-ok' : 'badge-fail';
  const statusText = info.isOk ? t('agent.console.badge.ok') : t('agent.console.badge.fail');
  const iconName = info.isOk ? 'badge-ok-24.png' : 'badge-fail-24.png';
  const fallbackIcon = info.isOk ? '✓' : '✗';

  return (
    <div className={`badge-item ${statusClass}`}>
      <span className="badge-label">{t(info.labelKey)}</span>
      <span className="badge-status">
        <span className="icon-wrapper">
          <img
            src={`/ui/icons/${iconName}`}
            alt=""
            aria-hidden="true"
            className="badge-icon-img"
            onError={(e) => e.currentTarget.classList.add('hidden')}
          />
          <span className="icon-fallback" style={{ fontSize: '0.625rem' }}>
            {fallbackIcon}
          </span>
        </span>
        {statusText}
      </span>
    </div>
  );
}

/** 배지 패널 */
function BadgesPanel() {
  const { t } = useTranslation();
  const badges = useAgentStore(selectBadges);

  if (badges.length === 0) {
    return (
      <div className="badges-panel">
        <div className="badges-label">{t('agent.console.badges')}</div>
        <div className="badges-empty">{t('agent.console.badges_empty')}</div>
      </div>
    );
  }

  return (
    <div className="badges-panel">
      <div className="badges-label">{t('agent.console.badges')}</div>
      <div className="badges-grid">
        {badges.map((badge, index) => (
          <BadgeItem key={`${badge}-${index}`} badge={badge} />
        ))}
      </div>
    </div>
  );
}

/** Auto-repair 트레이스 */
function RepairTrace() {
  const { t } = useTranslation();
  const repairCount = useAgentStore(selectRepairCount);
  const isStreaming = useAgentStore(selectIsStreaming);

  if (repairCount === 0 && !isStreaming) {
    return null;
  }

  return (
    <div className="repair-trace">
      <span className="repair-label">{t('agent.console.repair')}</span>
      <span className="repair-count">#{repairCount}</span>
      {repairCount > 0 && (
        <span className="repair-status text-warning"> {t('agent.console.repaired')}</span>
      )}
    </div>
  );
}

/**
 * 모델 라벨 배지 (U-069: FAST/QUALITY 표시)
 *
 * 현재 텍스트 생성에 사용된 모델을 시각적으로 표시합니다.
 * - FAST: 빠른 응답, 기본 비용 (⚡)
 * - QUALITY: 고품질 응답, 2배 비용 (★)
 */
function ModelLabelBadge() {
  const { t } = useTranslation();
  const modelLabel = useAgentStore(selectModelLabel);
  const info = MODEL_LABEL_INFO[modelLabel];

  if (!info) return null;

  // i18n 키가 없으면 폴백 텍스트 사용
  const label = t(info.labelKey, { defaultValue: modelLabel });

  return (
    <div className={`model-label-badge ${info.colorClass}`}>
      <span className="model-icon">{info.icon}</span>
      <span className="model-text">{label}</span>
    </div>
  );
}

/** 에러 표시 */
function ErrorDisplay() {
  const error = useAgentStore(selectError);

  if (!error) return null;

  return (
    <div className="agent-error">
      <span className="error-icon">⚠</span>
      <span className="error-message">{error.message}</span>
      {error.code && <span className="error-code">[{error.code}]</span>}
    </div>
  );
}

/** 스트리밍 상태 표시 */
function StreamingStatus() {
  const { t } = useTranslation();
  const isStreaming = useAgentStore(selectIsStreaming);

  return (
    <div className="streaming-status">
      <span className={`status-dot ${isStreaming ? 'active' : ''}`} />
      <span className="status-text">
        {isStreaming ? t('agent.console.status.processing') : t('agent.console.status.idle')}
      </span>
    </div>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * Agent Console 컴포넌트.
 *
 * Plan/Queue/Badges/Auto-repair를 실시간으로 표시합니다.
 * RULE-008에 따라 프롬프트/내부 추론은 노출하지 않습니다.
 *
 * U-037: data-ui-importance="critical" 마킹으로 가독성 보장
 * U-069: 현재 사용 중인 모델 라벨(FAST/QUALITY) 표시 추가
 */
export function AgentConsole() {
  return (
    <div className="agent-console-content" data-ui-importance="critical">
      <StreamingStatus />
      <ModelLabelBadge />
      <PhaseQueue />
      <BadgesPanel />
      <RepairTrace />
      <ErrorDisplay />
    </div>
  );
}

export default AgentConsole;
