/**
 * Unknown World - Rate Limit 재시도 안내 패널 (U-130).
 *
 * 429 Rate Limit 에러 시 표시되는 플로팅 패널입니다.
 * input-lock-overlay(z-index: 9990)보다 높은 z-index로 렌더링되어
 * 재시도 버튼이 항상 클릭 가능합니다.
 *
 * 설계 원칙:
 *   - RULE-002: 게임 UI (CRT 테마, 채팅 버블 금지)
 *   - RULE-006: ko/en i18n 정책 준수
 *   - RULE-008: 에이전트 상태 가시화
 *
 * @module components/RateLimitPanel
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// =============================================================================
// 상수
// =============================================================================

/** 카운트다운 초기값 (초) - 페어링 결정: 60초 */
const COUNTDOWN_INITIAL = 60;

// =============================================================================
// Props
// =============================================================================

export interface RateLimitPanelProps {
  /** 재시도 버튼 클릭 시 호출 */
  onRetry: () => void;
}

// =============================================================================
// 컴포넌트
// =============================================================================

/**
 * Rate Limit 재시도 안내 패널.
 *
 * 60초 카운트다운과 함께 재시도 버튼을 표시합니다.
 * 카운트다운이 0이 되면 재시도 버튼이 활성화됩니다.
 */
export function RateLimitPanel({ onRetry }: RateLimitPanelProps) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(COUNTDOWN_INITIAL);
  const canRetry = countdown <= 0;

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        return next <= 0 ? 0 : next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleRetry = useCallback(() => {
    if (!canRetry) return;
    onRetry();
  }, [canRetry, onRetry]);

  return (
    <div
      className="rate-limit-panel"
      role="alertdialog"
      aria-live="assertive"
      aria-label={t('error.rate_limited')}
    >
      {/* 경고 아이콘 */}
      <div className="rate-limit-icon" aria-hidden="true">
        ⚠
      </div>

      {/* 제목 */}
      <h3 className="rate-limit-title">{t('error.rate_limited')}</h3>

      {/* 상세 설명 */}
      <p className="rate-limit-detail">{t('error.rate_limited_detail')}</p>

      {/* 카운트다운 */}
      {!canRetry && (
        <div className="rate-limit-countdown" aria-live="polite">
          <div className="rate-limit-countdown-bar">
            <div
              className="rate-limit-countdown-fill"
              style={{
                width: `${((COUNTDOWN_INITIAL - countdown) / COUNTDOWN_INITIAL) * 100}%`,
              }}
            />
          </div>
          <span className="rate-limit-countdown-text">
            {t('error.retry_countdown', { seconds: countdown })}
          </span>
        </div>
      )}

      {/* 재시도 버튼 */}
      <button
        type="button"
        className="rate-limit-retry-btn"
        onClick={handleRetry}
        disabled={!canRetry}
        aria-label={t('error.retry_button')}
      >
        {canRetry ? t('error.retry_button') : t('error.retry_countdown', { seconds: countdown })}
      </button>
    </div>
  );
}
