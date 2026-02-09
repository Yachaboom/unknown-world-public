/**
 * Unknown World - Quest Panel (U-013, U-078, U-023)
 *
 * 플레이어의 현재 목표를 **주 목표(Main Objective)** + **서브 목표** 형태로 표시합니다.
 *
 * U-023 변경사항:
 *   - 주 목표: CRT glow 강화 진행률 바 + 보상 Signal 아이콘 명확화
 *   - 서브 목표: 게임스러운 체크 아이콘(◇/◆) + 활성 목표 pulse 효과
 *   - 빈 상태: 분위기 있는 탐험 메시지로 교체
 *   - 전반적으로 "겉도는 느낌" 해소 → 게임 진행과 밀접한 연결감
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

/** 주 목표 진행률 바 — U-023: CRT glow 강화 */
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

/** 주 목표 영역 — U-023: 강조 표시 + CRT glow 진행률 + 보상 */
function MainObjective({ quest }: MainObjectiveProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`main-objective ${quest.is_completed ? 'main-objective--completed' : ''}`}
      data-ui-importance="critical"
    >
      <div className="main-objective__header">
        <span className="main-objective__icon" aria-hidden="true">
          {quest.is_completed ? '\u2705' : '\uD83C\uDFAF'}
        </span>
        <span className="main-objective__badge">{t('quest.main_objective')}</span>
      </div>
      <h4 className="main-objective__title">{quest.label}</h4>
      {quest.description && <p className="main-objective__desc">{quest.description}</p>}
      <ProgressBar value={quest.progress} />
      {quest.reward_signal > 0 && !quest.is_completed && (
        <div className="main-objective__reward">
          <span className="main-objective__reward-icon" aria-hidden="true">
            {'\u26A1'}
          </span>
          <span>{t('quest.reward_preview', { signal: quest.reward_signal })}</span>
        </div>
      )}
      {quest.is_completed && (
        <div className="main-objective__complete-badge">
          <span aria-hidden="true">{'\u2728'}</span>
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
  /** 첫 번째 활성 서브 목표인지 (pulse 강조용) */
  isNext?: boolean;
}

/** 개별 서브 목표 아이템 — U-023: 게임스러운 체크 + pulse */
function SubObjectiveItem({ quest, isNext }: SubObjectiveItemProps) {
  const { t } = useTranslation();

  const activeClass = quest.is_completed
    ? 'sub-objective--completed'
    : isNext
      ? 'sub-objective--active sub-objective--next'
      : 'sub-objective--active';

  return (
    <li className={`sub-objective ${activeClass}`} data-quest-id={quest.id}>
      <span
        className={`sub-objective__check ${quest.is_completed ? 'sub-objective__check--done' : ''}`}
        aria-hidden="true"
      >
        {quest.is_completed ? '\u25C6' : '\u25C7'}
      </span>
      <span className="sub-objective__label">{quest.label}</span>
      {quest.reward_signal > 0 && !quest.is_completed && (
        <span
          className="sub-objective__reward"
          title={t('quest.reward_preview', { signal: quest.reward_signal })}
        >
          +{quest.reward_signal}
          {'\u26A1'}
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
 * Quest Panel — U-023: Quest UI 개선
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
          {'\uD83C\uDF0C'}
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
            {activeSubObjectives.map((quest, idx) => (
              <SubObjectiveItem key={quest.id} quest={quest} isNext={idx === 0} />
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
