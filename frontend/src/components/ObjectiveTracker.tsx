/**
 * Unknown World - Objective Tracker (U-078 목표 시스템 강화)
 *
 * 화면 상단에 항상 보이는 미니 목표 트래커입니다.
 * 주 목표의 제목과 진행률을 간결하게 표시합니다.
 *
 * Q2 결정: Option B - 화면 상단에 미니 트래커 추가 (항상 보임)
 *
 * 설계 원칙:
 *   - RULE-002: 게임 HUD 요소로 상시 노출
 *   - RULE-006: i18n 기반 문자열
 *   - 최소 높이로 메인 콘텐츠를 침범하지 않음
 *
 * @module components/ObjectiveTracker
 */

import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useWorldStore, selectMainObjective, selectSubObjectives } from '../stores/worldStore';

/**
 * ObjectiveTracker - 미니 목표 트래커
 *
 * game-center 영역 상단에 배치하여 항상 현재 목표를 확인할 수 있습니다.
 */
export function ObjectiveTracker() {
  const { t } = useTranslation();
  const mainObjective = useWorldStore(selectMainObjective);
  const subObjectives = useWorldStore(useShallow(selectSubObjectives));

  // 서브 목표 중 완료된 것의 수
  const completedCount = subObjectives.filter((q) => q.is_completed).length;
  const totalCount = subObjectives.length;

  // 목표가 전혀 없으면 표시하지 않음
  if (!mainObjective && totalCount === 0) {
    return null;
  }

  const progress = mainObjective?.progress ?? 0;
  const isComplete = mainObjective?.is_completed ?? false;

  return (
    <div
      className={`objective-tracker ${isComplete ? 'objective-tracker--completed' : ''}`}
      data-ui-importance="critical"
    >
      <div className="objective-tracker__icon" aria-hidden="true">
        {isComplete ? '✅' : '🎯'}
      </div>
      <div className="objective-tracker__content">
        <span className="objective-tracker__title">
          {mainObjective?.label ?? t('quest.tracker_no_objective')}
        </span>
        {totalCount > 0 && (
          <span className="objective-tracker__sub-count">
            ({completedCount}/{totalCount})
          </span>
        )}
      </div>
      <div
        className="objective-tracker__bar"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="objective-tracker__bar-fill"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
}

export default ObjectiveTracker;
