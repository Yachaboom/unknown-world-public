import { useTranslation } from 'react-i18next';
import { UI_SCALES, type UIScale } from '../stores/uiPrefsStore';

interface UIControlsProps {
  uiScale: UIScale;
  onIncreaseScale: () => void;
  onDecreaseScale: () => void;
}

export function UIControls({ uiScale, onIncreaseScale, onDecreaseScale }: UIControlsProps) {
  const { t } = useTranslation();
  const isMinScale = uiScale === UI_SCALES[0];
  const isMaxScale = uiScale === UI_SCALES[UI_SCALES.length - 1];

  return (
    <div className="ui-controls" role="group" aria-label={t('ui.scale_label')}>
      {/* UI 스케일 조절 */}
      <button
        type="button"
        className="ui-scale-btn"
        onClick={onDecreaseScale}
        disabled={isMinScale}
        aria-label={t('ui.scale_decrease')}
        title={`${t('ui.scale_decrease')} (A-)`}
      >
        A-
      </button>
      <span className="ui-scale-display" aria-live="polite">
        {Math.round(uiScale * 100)}%
      </span>
      <button
        type="button"
        className="ui-scale-btn"
        onClick={onIncreaseScale}
        disabled={isMaxScale}
        aria-label={t('ui.scale_increase')}
        title={`${t('ui.scale_increase')} (A+)`}
      >
        A+
      </button>
    </div>
  );
}
