import { useTranslation } from 'react-i18next';

interface PanelProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
  /** U-032: Chrome 장식 적용 여부 */
  hasChrome?: boolean;
  /** 기본 placeholder i18n 키 (children이 없을 때 사용) */
  placeholderKey?: string;
}

export function Panel({
  title,
  children,
  className = '',
  hasChrome = false,
  placeholderKey,
}: PanelProps) {
  const { t } = useTranslation();
  const panelClass = `panel ${className} ${hasChrome ? 'has-chrome' : ''}`.trim();
  const headerClass = `panel-header ${hasChrome ? 'has-chrome' : ''}`.trim();

  return (
    <div className={panelClass}>
      <div className={headerClass}>
        <span className="panel-title">{title}</span>
      </div>
      <div className="panel-content">
        {children || (
          <p className="panel-placeholder">
            {placeholderKey ? t(placeholderKey) : t('ui.panel_placeholder')}
          </p>
        )}
      </div>
    </div>
  );
}
