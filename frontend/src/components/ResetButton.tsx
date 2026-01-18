/**
 * Unknown World - 리셋 버튼 컴포넌트 (U-015[Mvp]).
 *
 * 1회 클릭으로 현재 프로필의 초기 상태로 복구하는 버튼입니다.
 * 데모 반복 가능성을 보장합니다.
 *
 * 설계 원칙:
 *   - PRD 6.9: 즉시 리셋 1회로 데모 반복 가능
 *   - RULE-006: i18n 키 기반 다국어 지원
 *
 * @module components/ResetButton
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

// =============================================================================
// 타입 정의
// =============================================================================

export interface ResetButtonProps {
  /** 리셋 클릭 시 호출되는 콜백 */
  onReset: () => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 확인 필요 여부 (기본: true) */
  requireConfirm?: boolean;
  /** 추가 클래스명 */
  className?: string;
  /** 컴팩트 모드 (아이콘만 표시) */
  compact?: boolean;
}

// =============================================================================
// 컴포넌트
// =============================================================================

/**
 * 게임 리셋 버튼.
 * 현재 프로필의 초기 상태로 복구합니다.
 */
export function ResetButton({
  onReset,
  disabled = false,
  requireConfirm = true,
  className = '',
  compact = false,
}: ResetButtonProps) {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleClick = useCallback(() => {
    if (requireConfirm && !isConfirming) {
      // 확인 모드로 전환
      setIsConfirming(true);
      // 3초 후 자동 취소
      setTimeout(() => setIsConfirming(false), 3000);
      return;
    }

    // 리셋 실행
    onReset();
    setIsConfirming(false);
  }, [onReset, requireConfirm, isConfirming]);

  const handleCancel = useCallback(() => {
    setIsConfirming(false);
  }, []);

  const buttonText = isConfirming ? t('reset.confirm') : compact ? '' : t('reset.button');

  const buttonAriaLabel = isConfirming ? t('reset.confirm') : t('reset.button');

  return (
    <div className={`reset-button-wrapper ${className}`.trim()}>
      <button
        type="button"
        className={`reset-button ${isConfirming ? 'confirming' : ''} ${compact ? 'compact' : ''}`}
        onClick={handleClick}
        disabled={disabled}
        aria-label={buttonAriaLabel}
        title={t('reset.tooltip')}
      >
        <span className="reset-icon" aria-hidden="true">
          🔄
        </span>
        {buttonText && <span className="reset-text">{buttonText}</span>}
      </button>

      {isConfirming && requireConfirm && (
        <button
          type="button"
          className="reset-cancel-button"
          onClick={handleCancel}
          aria-label={t('reset.cancel')}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// =============================================================================
// 프로필 변경 버튼 (별도 컴포넌트)
// =============================================================================

export interface ChangeProfileButtonProps {
  /** 클릭 시 호출되는 콜백 */
  onClick: () => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 프로필 변경 버튼.
 * 클릭 시 프로필 선택 화면으로 이동합니다.
 */
export function ChangeProfileButton({
  onClick,
  disabled = false,
  className = '',
}: ChangeProfileButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`change-profile-button ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={t('profile.change')}
      title={t('profile.change_tooltip')}
    >
      <span className="change-profile-icon" aria-hidden="true">
        👤
      </span>
      <span className="change-profile-text">{t('profile.change')}</span>
    </button>
  );
}
