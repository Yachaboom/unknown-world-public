/**
 * Unknown World - Quest Panel (U-013)
 *
 * 플레이어의 현재 목표/서브목표를 체크리스트 형태로 표시합니다.
 *
 * 설계 원칙:
 *   - RULE-002: 채팅 UI가 아닌 게임 UI로 상시 노출
 *   - RULE-006: i18n 기반 문자열 관리
 *   - PRD 6.7: Quest/Objective Panel
 *
 * @module components/QuestPanel
 */

import { useTranslation } from 'react-i18next';
import { useWorldStore, selectQuests } from '../stores/worldStore';
import type { Quest } from '../schemas/turn';

// =============================================================================
// 하위 컴포넌트
// =============================================================================

interface QuestItemProps {
  quest: Quest;
}

/**
 * 개별 퀘스트 아이템 렌더링
 */
function QuestItem({ quest }: QuestItemProps) {
  const { t } = useTranslation();

  return (
    <li
      className={`quest-item ${quest.is_completed ? 'quest-completed' : 'quest-active'}`}
      data-quest-id={quest.id}
    >
      <span className="quest-checkbox" aria-hidden="true">
        {quest.is_completed ? '☑' : '☐'}
      </span>
      <span className="quest-label">{quest.label}</span>
      {quest.is_completed && <span className="quest-status-badge">{t('quest.completed')}</span>}
    </li>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * Quest Panel
 *
 * 현재 목표/서브목표를 체크리스트 형태로 표시합니다.
 * worldStore의 quests 상태를 구독하여 실시간 업데이트됩니다.
 */
export function QuestPanel() {
  const { t } = useTranslation();
  const quests = useWorldStore(selectQuests);

  // 진행 중 / 완료 분리
  const activeQuests = quests.filter((q) => !q.is_completed);
  const completedQuests = quests.filter((q) => q.is_completed);

  // 빈 상태
  if (quests.length === 0) {
    return (
      <div className="quest-panel-content quest-empty" data-ui-importance="critical">
        <div className="quest-empty-icon" aria-hidden="true">
          📋
        </div>
        <p className="quest-empty-text">{t('quest.empty')}</p>
      </div>
    );
  }

  return (
    <div className="quest-panel-content" data-ui-importance="critical">
      {/* 진행 중인 퀘스트 */}
      {activeQuests.length > 0 && (
        <div className="quest-section quest-section-active">
          <h4 className="quest-section-title">{t('quest.section.active')}</h4>
          <ul className="quest-list" role="list" aria-label={t('quest.section.active')}>
            {activeQuests.map((quest) => (
              <QuestItem key={quest.id} quest={quest} />
            ))}
          </ul>
        </div>
      )}

      {/* 완료된 퀘스트 */}
      {completedQuests.length > 0 && (
        <div className="quest-section quest-section-completed">
          <h4 className="quest-section-title">{t('quest.section.completed')}</h4>
          <ul
            className="quest-list quest-list-completed"
            role="list"
            aria-label={t('quest.section.completed')}
          >
            {completedQuests.map((quest) => (
              <QuestItem key={quest.id} quest={quest} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default QuestPanel;
