/**
 * Unknown World - Rule Board (U-013)
 *
 * 현재 세계에 적용 중인 규칙/물리 법칙을 "룰 카드"로 표시합니다.
 *
 * 설계 원칙:
 *   - RULE-002: 채팅 UI가 아닌 게임 UI로 상시 노출
 *   - RULE-006: i18n 기반 문자열 관리
 *   - PRD 6.4/6.7: Rule Mutation + Rule Board
 *
 * @module components/RuleBoard
 */

import { useTranslation } from 'react-i18next';
import { useWorldStore, selectActiveRules } from '../stores/worldStore';
import type { WorldRule } from '../schemas/turn';

// =============================================================================
// 하위 컴포넌트
// =============================================================================

interface RuleCardProps {
  rule: WorldRule;
}

/**
 * 개별 룰 카드 렌더링
 */
function RuleCard({ rule }: RuleCardProps) {
  return (
    <div className="rule-card" data-rule-id={rule.id}>
      <div className="rule-card-header">
        <span className="rule-card-icon" aria-hidden="true">
          ⚙
        </span>
        <span className="rule-card-label">{rule.label}</span>
      </div>
      {rule.description && <p className="rule-card-description">{rule.description}</p>}
    </div>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * Rule Board
 *
 * 현재 세계에 적용 중인 규칙을 카드 형태로 표시합니다.
 * worldStore의 activeRules 상태를 구독하여 실시간 업데이트됩니다.
 */
export function RuleBoard() {
  const { t } = useTranslation();
  const activeRules = useWorldStore(selectActiveRules);

  // 빈 상태
  if (activeRules.length === 0) {
    return (
      <div className="rule-board-content rule-board-empty" data-ui-importance="critical">
        <div className="rule-board-empty-icon" aria-hidden="true">
          📜
        </div>
        <p className="rule-board-empty-text">{t('rule_board.empty')}</p>
      </div>
    );
  }

  return (
    <div className="rule-board-content" data-ui-importance="critical">
      <div className="rule-board-header">
        <span className="rule-board-count">
          {t('rule_board.active_count', { count: activeRules.length })}
        </span>
      </div>
      <div className="rule-card-list">
        {activeRules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} />
        ))}
      </div>
    </div>
  );
}

export default RuleBoard;
