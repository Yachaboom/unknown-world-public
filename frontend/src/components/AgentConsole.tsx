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

import {
  useAgentStore,
  selectIsStreaming,
  selectPhases,
  selectBadges,
  selectRepairCount,
  selectError,
  type PhaseInfo,
} from '../stores/agentStore';
import type { ValidationBadge } from '../schemas/turn';

// =============================================================================
// 상수 정의
// =============================================================================

/** 단계 표시 이름 (한국어) */
const PHASE_LABELS: Record<string, string> = {
  parse: 'Parse',
  validate: 'Validate',
  plan: 'Plan',
  resolve: 'Resolve',
  render: 'Render',
  verify: 'Verify',
  commit: 'Commit',
};

/** 배지 표시 정보 */
const BADGE_INFO: Record<ValidationBadge, { label: string; isOk: boolean }> = {
  schema_ok: { label: 'Schema', isOk: true },
  schema_fail: { label: 'Schema', isOk: false },
  economy_ok: { label: 'Economy', isOk: true },
  economy_fail: { label: 'Economy', isOk: false },
  safety_ok: { label: 'Safety', isOk: true },
  safety_blocked: { label: 'Safety', isOk: false },
  consistency_ok: { label: 'Consistency', isOk: true },
  consistency_fail: { label: 'Consistency', isOk: false },
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
  const label = PHASE_LABELS[phase.name] ?? phase.name;
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
  const phases = useAgentStore(selectPhases);

  return (
    <div className="phase-queue">
      <div className="queue-label">Queue</div>
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
  const info = BADGE_INFO[badge];
  if (!info) return null;

  const statusClass = info.isOk ? 'badge-ok' : 'badge-fail';
  const statusText = info.isOk ? 'OK' : 'FAIL';
  const iconName = info.isOk ? 'badge-ok-24.png' : 'badge-fail-24.png';
  const fallbackIcon = info.isOk ? '✓' : '✗';

  return (
    <div className={`badge-item ${statusClass}`}>
      <span className="badge-label">{info.label}</span>
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
  const badges = useAgentStore(selectBadges);

  if (badges.length === 0) {
    return (
      <div className="badges-panel">
        <div className="badges-label">Badges</div>
        <div className="badges-empty">[ 검증 대기 중 ]</div>
      </div>
    );
  }

  return (
    <div className="badges-panel">
      <div className="badges-label">Badges</div>
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
  const repairCount = useAgentStore(selectRepairCount);
  const isStreaming = useAgentStore(selectIsStreaming);

  if (repairCount === 0 && !isStreaming) {
    return null;
  }

  return (
    <div className="repair-trace">
      <span className="repair-label">Auto-repair</span>
      <span className="repair-count">#{repairCount}</span>
      {repairCount > 0 && <span className="repair-status text-warning"> (복구됨)</span>}
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
  const isStreaming = useAgentStore(selectIsStreaming);

  return (
    <div className="streaming-status">
      <span className={`status-dot ${isStreaming ? 'active' : ''}`} />
      <span className="status-text">{isStreaming ? 'PROCESSING' : 'IDLE'}</span>
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
 */
export function AgentConsole() {
  return (
    <div className="agent-console-content" data-ui-importance="critical">
      <StreamingStatus />
      <PhaseQueue />
      <BadgesPanel />
      <RepairTrace />
      <ErrorDisplay />
    </div>
  );
}

export default AgentConsole;
