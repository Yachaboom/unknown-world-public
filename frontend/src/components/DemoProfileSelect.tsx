/**
 * Unknown World - 데모 프로필 선택 컴포넌트 (U-015[Mvp], U-116[Mvp]).
 *
 * 첫 화면에서 3종의 데모 프로필을 선택할 수 있는 UI를 제공합니다.
 * U-116: SaveGame 제거 후 항상 이 화면에서 시작합니다.
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
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';

// =============================================================================
// 타입 정의
// =============================================================================

export interface DemoProfileSelectProps {
  /** 프로필 선택 시 호출되는 콜백 */
  onSelectProfile: (profile: DemoProfile) => void;
  /** U-044: 현재 선택된 언어 */
  currentLanguage?: SupportedLanguage;
  /** U-044: 언어 변경 콜백 (profile_select에서만 허용) */
  onLanguageChange?: (language: SupportedLanguage) => void;
}

// =============================================================================
// 컴포넌트
// =============================================================================

/** U-044: 언어 표시 레이블 매핑 */
const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'ko-KR': '한국어',
  'en-US': 'English',
};

/**
 * 데모 프로필 선택 화면.
 * 게임 시작 전에 3종의 프로필 중 하나를 선택합니다.
 * U-044: 언어 선택 UI 포함 (profile_select에서만 변경 가능).
 * U-116: SaveGame 제거 후 Continue 버튼 제거.
 */
export function DemoProfileSelect({
  onSelectProfile,
  currentLanguage = 'en-US',
  onLanguageChange,
}: DemoProfileSelectProps) {
  const { t } = useTranslation();

  const handleSelectProfile = useCallback(
    (profile: DemoProfile) => {
      onSelectProfile(profile);
    },
    [onSelectProfile],
  );

  /** U-044: 언어 토글 핸들러 */
  const nextLanguage =
    SUPPORTED_LANGUAGES[
      (SUPPORTED_LANGUAGES.indexOf(currentLanguage) + 1) % SUPPORTED_LANGUAGES.length
    ];

  const handleLanguageToggle = useCallback(() => {
    if (!onLanguageChange) return;
    onLanguageChange(nextLanguage);
  }, [nextLanguage, onLanguageChange]);

  return (
    <div className="profile-select-container" data-ui-importance="critical">
      {/* U-044: 언어 선택 토글 (우측 상단) — 전환 대상 언어를 표시 */}
      {onLanguageChange && (
        <div className="language-toggle-container">
          <button
            type="button"
            className="language-toggle-btn"
            onClick={handleLanguageToggle}
            aria-label={t('language.toggle')}
            title={t('language.toggle_tooltip')}
          >
            <span className="language-toggle-icon" aria-hidden="true">
              🌐
            </span>
            <span className="language-toggle-label">{LANGUAGE_LABELS[nextLanguage]}</span>
          </button>
        </div>
      )}

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

      {/* 안내 문구 */}
      <footer className="profile-select-footer">
        <p className="profile-select-hint">{t('profile.select_hint')}</p>
      </footer>
    </div>
  );
}
