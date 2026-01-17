import { useTranslation } from 'react-i18next';
import { UIControls } from './UIControls';
import type { UIScale } from '../stores/uiPrefsStore';

interface GameHeaderProps {
  signal: number;
  memoryShard: number;
  isConnected: boolean;
  uiScale: UIScale;
  onIncreaseScale: () => void;
  onDecreaseScale: () => void;
}

export function GameHeader({
  signal,
  memoryShard,
  isConnected,
  uiScale,
  onIncreaseScale,
  onDecreaseScale,
}: GameHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="game-header has-chrome">
      <h1 className="game-title glitch" data-text={t('ui.logo')}>
        {t('ui.logo')}
      </h1>
      <div className="header-controls">
        {/* UI 스케일 컨트롤 (U-028→U-037: Readable 제거) */}
        <UIControls
          uiScale={uiScale}
          onIncreaseScale={onIncreaseScale}
          onDecreaseScale={onDecreaseScale}
        />
        <div className="economy-hud">
          <span className="icon-wrapper signal-icon" aria-label={t('economy.signal')}>
            <img
              src="/ui/icons/signal-24.png"
              alt=""
              aria-hidden="true"
              className="icon-img"
              onError={(e) => {
                e.currentTarget.classList.add('hidden');
              }}
            />
            <span className="icon-fallback">⚡</span>
          </span>
          <span className="currency-value">
            {t('economy.signal')}: {signal}
          </span>
          <span className="icon-wrapper shard-icon" aria-label={t('economy.shard')}>
            <img
              src="/ui/icons/shard-24.png"
              alt=""
              aria-hidden="true"
              className="icon-img"
              onError={(e) => {
                e.currentTarget.classList.add('hidden');
              }}
            />
            <span className="icon-fallback">💎</span>
          </span>
          <span className="currency-value">
            {t('economy.shard')}: {memoryShard}
          </span>
        </div>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? '' : 'offline'}`} />
          <span>{isConnected ? t('connection.online') : t('connection.offline')}</span>
        </div>
      </div>
    </header>
  );
}
