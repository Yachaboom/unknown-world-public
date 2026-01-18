/**
 * Unknown World - 데모 프로필 선택 컴포넌트 (U-015[Mvp]).
 *
 * 첫 화면에서 3종의 데모 프로필을 선택할 수 있는 UI를 제공합니다.
 * 프로필 선택 시 해당 SaveGame을 즉시 로드하고 게임을 시작합니다.
 *
 * 설계 원칙:
 *   - RULE-002: 채팅 UI 금지, 게임 UI로 상시 노출
 *   - RULE-006: i18n 키 기반 다국어 지원
 *   - PRD 6.9: 데모 프로필 선택만으로 즉시 시작
 *
 * @module components/DemoProfileSelect
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DEMO_PROFILES, type DemoProfile } from '../data/demoProfiles';

// =============================================================================
// 타입 정의
// =============================================================================

export interface DemoProfileSelectProps {
  /** 프로필 선택 시 호출되는 콜백 */
  onSelectProfile: (profile: DemoProfile) => void;
  /** 기존 세이브 로드 시 호출되는 콜백 (세이브가 있는 경우) */
  onContinue?: () => void;
  /** 기존 세이브가 있는지 여부 */
  hasSavedGame?: boolean;
}

// =============================================================================
// 컴포넌트
// =============================================================================

/**
 * 데모 프로필 선택 화면.
 * 게임 시작 전에 3종의 프로필 중 하나를 선택합니다.
 */
export function DemoProfileSelect({
  onSelectProfile,
  onContinue,
  hasSavedGame = false,
}: DemoProfileSelectProps) {
  const { t } = useTranslation();

  const handleSelectProfile = useCallback(
    (profile: DemoProfile) => {
      onSelectProfile(profile);
    },
    [onSelectProfile],
  );

  const handleContinue = useCallback(() => {
    onContinue?.();
  }, [onContinue]);

  return (
    <div className="profile-select-container" data-ui-importance="critical">
      {/* 타이틀 */}
      <header className="profile-select-header">
        <h1 className="profile-select-title glitch" data-text={t('ui.logo')}>
          {t('ui.logo')}
        </h1>
        <p className="profile-select-subtitle">{t('profile.select_title')}</p>
      </header>

      {/* 프로필 카드 목록 */}
      <div className="profile-card-grid">
        {DEMO_PROFILES.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className="profile-card"
            onClick={() => handleSelectProfile(profile)}
            style={{ '--profile-accent': profile.themeColor } as React.CSSProperties}
            aria-label={t(profile.nameKey)}
          >
            <span className="profile-card-icon" aria-hidden="true">
              {profile.icon}
            </span>
            <span className="profile-card-name">{t(profile.nameKey)}</span>
            <span className="profile-card-description">{t(profile.descriptionKey)}</span>
          </button>
        ))}
      </div>

      {/* 기존 세이브 계속하기 (있는 경우) */}
      {hasSavedGame && onContinue && (
        <div className="profile-continue-section">
          <div className="profile-continue-divider">
            <span>{t('profile.or')}</span>
          </div>
          <button type="button" className="profile-continue-btn" onClick={handleContinue}>
            {t('profile.continue_saved')}
          </button>
        </div>
      )}

      {/* 안내 문구 */}
      <footer className="profile-select-footer">
        <p className="profile-select-hint">{t('profile.select_hint')}</p>
      </footer>
    </div>
  );
}
