/**
 * Unknown World - Quest Panel (U-013, U-078 목표 시스템 강화)
 *
 * 플레이어의 현재 목표를 **주 목표(Main Objective)** + **서브 목표** 형태로 표시합니다.
 *
 * U-078 변경사항:
 *   - 주 목표(is_main=true): 상단 강조 영역, 진행률 바, 보상 미리보기
 *   - 서브 목표(is_main=false): 체크리스트, 완료 시 취소선 + 보상 피드백
 *   - 목표 없을 때: "자유 탐색 중" 안내
 *   - 완료 시 체크 애니메이션 (Q4: Option B)
 *
 * 설계 원칙:
 *   - RULE-002: 채팅 UI가 아닌 게임 UI로 상시 노출
 *   - RULE-006: i18n 기반 문자열 관리
 *   - PRD 6.7: Quest/Objective Panel
 *
 * @module components/QuestPanel
 */

import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useWorldStore, selectMainObjective, selectSubObjectives } from '../stores/worldStore';
import type { Quest } from '../schemas/turn';

// =============================================================================
// 진행률 바 하위 컴포넌트
// =============================================================================

interface ProgressBarProps {
  value: number; // 0-100
}

/** 주 목표 진행률 바 */
function ProgressBar({ value }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  return (
    <div
      className="objective-progress-bar"
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="objective-progress-fill" style={{ width: `${clampedValue}%` }} />
      <span className="objective-progress-text">{clampedValue}%</span>
    </div>
  );
}

// =============================================================================
// 주 목표 하위 컴포넌트
// =============================================================================

interface MainObjectiveProps {
  quest: Quest;
}

/** 주 목표 영역 - 강조 표시 + 진행률 + 보상 */
function MainObjective({ quest }: MainObjectiveProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`main-objective ${quest.is_completed ? 'main-objective--completed' : ''}`}
      data-ui-importance="critical"
    >
      <div className="main-objective__header">
        <span className="main-objective__icon" aria-hidden="true">
          🎯
        </span>
        <span className="main-objective__badge">{t('quest.main_objective')}</span>
      </div>
      <h4 className="main-objective__title">{quest.label}</h4>
      {quest.description && <p className="main-objective__desc">{quest.description}</p>}
      <ProgressBar value={quest.progress} />
      {quest.reward_signal > 0 && !quest.is_completed && (
        <div className="main-objective__reward">
          <span className="main-objective__reward-icon" aria-hidden="true">
            💰
          </span>
          <span>{t('quest.reward_preview', { signal: quest.reward_signal })}</span>
        </div>
      )}
      {quest.is_completed && (
        <div className="main-objective__complete-badge">
          <span aria-hidden="true">✅</span>
          <span>{t('quest.objective_complete')}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 서브 목표 하위 컴포넌트
// =============================================================================

interface SubObjectiveItemProps {
  quest: Quest;
}

/** 개별 서브 목표 아이템 */
function SubObjectiveItem({ quest }: SubObjectiveItemProps) {
  const { t } = useTranslation();

  return (
    <li
      className={`sub-objective ${quest.is_completed ? 'sub-objective--completed' : 'sub-objective--active'}`}
      data-quest-id={quest.id}
    >
      <span
        className={`sub-objective__check ${quest.is_completed ? 'sub-objective__check--done' : ''}`}
        aria-hidden="true"
      >
        {quest.is_completed ? '✓' : '○'}
      </span>
      <span className="sub-objective__label">{quest.label}</span>
      {quest.reward_signal > 0 && !quest.is_completed && (
        <span
          className="sub-objective__reward"
          title={t('quest.reward_preview', { signal: quest.reward_signal })}
        >
          +{quest.reward_signal}⚡
        </span>
      )}
      {quest.is_completed && quest.reward_signal > 0 && (
        <span className="sub-objective__earned">
          {t('quest.reward_earned', { signal: quest.reward_signal })}
        </span>
      )}
    </li>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * Quest Panel - U-078 목표 시스템 강화
 *
 * 주 목표(Main Objective) + 서브 목표(Sub-objectives)를 분리 표시합니다.
 * worldStore의 quests 상태를 구독하여 실시간 업데이트됩니다.
 */
export function QuestPanel() {
  const { t } = useTranslation();
  const mainObjective = useWorldStore(selectMainObjective);
  const subObjectives = useWorldStore(useShallow(selectSubObjectives));

  const activeSubObjectives = subObjectives.filter((q) => !q.is_completed);
  const completedSubObjectives = subObjectives.filter((q) => q.is_completed);

  // 주 목표도 없고 서브 목표도 없는 빈 상태
  if (!mainObjective && subObjectives.length === 0) {
    return (
      <div className="quest-panel-content quest-empty" data-ui-importance="critical">
        <div className="quest-empty-icon" aria-hidden="true">
          🧭
        </div>
        <p className="quest-empty-text">{t('quest.free_exploration')}</p>
        <p className="quest-empty-hint">{t('quest.free_exploration_desc')}</p>
      </div>
    );
  }

  return (
    <div className="quest-panel-content" data-ui-importance="critical">
      {/* 주 목표 영역 */}
      {mainObjective && <MainObjective quest={mainObjective} />}

      {/* 서브 목표: 진행 중 */}
      {activeSubObjectives.length > 0 && (
        <div className="quest-section quest-section-active">
          <h4 className="quest-section-title">{t('quest.sub_objectives')}</h4>
          <ul className="sub-objective-list" role="list" aria-label={t('quest.sub_objectives')}>
            {activeSubObjectives.map((quest) => (
              <SubObjectiveItem key={quest.id} quest={quest} />
            ))}
          </ul>
        </div>
      )}

      {/* 서브 목표: 완료됨 */}
      {completedSubObjectives.length > 0 && (
        <div className="quest-section quest-section-completed">
          <h4 className="quest-section-title">{t('quest.section.completed')}</h4>
          <ul
            className="sub-objective-list sub-objective-list--completed"
            role="list"
            aria-label={t('quest.section.completed')}
          >
            {completedSubObjectives.map((quest) => (
              <SubObjectiveItem key={quest.id} quest={quest} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default QuestPanel;
