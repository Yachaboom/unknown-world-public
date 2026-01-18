import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { UIControls } from './UIControls';
import { EconomyHudHeader } from './EconomyHud';
import type { UIScale } from '../stores/uiPrefsStore';
import { useEconomyStore, selectIsBalanceLow } from '../stores/economyStore';

interface GameHeaderProps {
  signal: number;
  memoryShard: number;
  isConnected: boolean;
  uiScale: UIScale;
  onIncreaseScale: () => void;
  onDecreaseScale: () => void;
  /** U-015: 추가 컨트롤 (리셋/프로필 변경 버튼 등) */
  children?: ReactNode;
}

export function GameHeader({
  signal,
  memoryShard,
  isConnected,
  uiScale,
  onIncreaseScale,
  onDecreaseScale,
  children,
}: GameHeaderProps) {
  const { t } = useTranslation();
  const isBalanceLow = useEconomyStore(selectIsBalanceLow);

  return (
    <header className="game-header has-chrome">
      <h1 className="game-title glitch" data-text={t('ui.logo')}>
        {t('ui.logo')}
      </h1>
      <div className="header-controls">
        {/* U-015: 리셋/프로필 변경 등 추가 컨트롤 */}
        {children}
        {/* UI 스케일 컨트롤 (U-028→U-037: Readable 제거) */}
        <UIControls
          uiScale={uiScale}
          onIncreaseScale={onIncreaseScale}
          onDecreaseScale={onDecreaseScale}
        />
        {/* Economy HUD (U-014: 예상 비용/확정 비용 표시 포함) */}
        <EconomyHudHeader signal={signal} memoryShard={memoryShard} isLow={isBalanceLow} />
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? '' : 'offline'}`} />
          <span>{isConnected ? t('connection.online') : t('connection.offline')}</span>
        </div>
      </div>
    </header>
  );
}
