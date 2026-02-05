/**
 * Unknown World - 온보딩 가이드 컴포넌트
 *
 * U-074[Mvp]: 핫스팟/아이템 인터랙션 안내 UX
 * - Q2 Option B: 화면 코너에 작은 팝업 가이드
 * - Q3 Option B: 데모 프로필도 첫 접속 시 온보딩 표시
 *
 * 첫 세션 시작 시 핫스팟/아이템/스캐너 사용법을 순서대로 안내합니다.
 * "스킵" 버튼으로 건너뛰기 가능하며, localStorage로 완료 상태를 저장합니다.
 *
 * RULE-006 준수: i18n 키 기반 텍스트
 * RULE-002 준수: 채팅 UI가 아닌 게임 UI
 *
 * @module components/OnboardingGuide
 */

import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useOnboardingStore,
  selectShowOnboarding,
  selectOnboardingStep,
} from '../stores/onboardingStore';
import '../styles/onboarding-guide.css';

// =============================================================================
// 상수 정의
// =============================================================================

/** 온보딩 단계 정의 */
interface OnboardingStepData {
  /** 단계 식별자 (CSS 타겟 하이라이트용) */
  target: 'hotspot' | 'inventory' | 'scanner';
  /** i18n 키 */
  textKey: string;
  /** 아이콘 이모지 */
  icon: string;
}

const ONBOARDING_STEPS: OnboardingStepData[] = [
  {
    target: 'hotspot',
    textKey: 'interaction.onboarding_hotspot',
    icon: '🎯',
  },
  {
    target: 'inventory',
    textKey: 'interaction.onboarding_item',
    icon: '📦',
  },
  {
    target: 'scanner',
    textKey: 'interaction.onboarding_scanner',
    icon: '📷',
  },
];

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * 온보딩 가이드 컴포넌트
 *
 * 화면 우하단에 작은 팝업 형태로 표시되며,
 * 핫스팟/아이템/스캐너 사용법을 순서대로 안내합니다.
 *
 * @example
 * ```tsx
 * // App.tsx에서 사용
 * <OnboardingGuide />
 * ```
 */
export function OnboardingGuide() {
  const { t } = useTranslation();

  // Store 상태
  const showOnboarding = useOnboardingStore(selectShowOnboarding);
  const currentStep = useOnboardingStore(selectOnboardingStep);
  const nextStep = useOnboardingStore((state) => state.nextOnboardingStep);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const dismissOnboarding = useOnboardingStore((state) => state.dismissOnboarding);

  // 현재 단계 데이터
  const stepData = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep >= ONBOARDING_STEPS.length - 1;

  // 키보드 단축키: ESC로 스킵, Enter/Space로 다음/완료
  useEffect(() => {
    if (!showOnboarding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnboarding, currentStep, isLastStep]);

  // 스킵 핸들러
  const handleSkip = useCallback(() => {
    dismissOnboarding();
    completeOnboarding();
  }, [dismissOnboarding, completeOnboarding]);

  // 다음/완료 핸들러
  const handleNext = useCallback(() => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      nextStep();
    }
  }, [isLastStep, completeOnboarding, nextStep]);

  // 표시 조건 확인
  if (!showOnboarding || !stepData) {
    return null;
  }

  return (
    <div
      className="onboarding-guide"
      role="dialog"
      aria-modal="false"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      {/* 헤더 */}
      <div className="onboarding-guide-header">
        <span className="onboarding-guide-icon" aria-hidden="true">
          {stepData.icon}
        </span>
        <span id="onboarding-title" className="onboarding-guide-title">
          {t('interaction.onboarding_title')}
        </span>
        <span className="onboarding-guide-progress">
          {currentStep + 1}/{ONBOARDING_STEPS.length}
        </span>
      </div>

      {/* 내용 */}
      <p id="onboarding-description" className="onboarding-guide-text">
        {t(stepData.textKey)}
      </p>

      {/* 진행 인디케이터 */}
      <div className="onboarding-guide-dots" aria-hidden="true">
        {ONBOARDING_STEPS.map((_, index) => (
          <span
            key={index}
            className={`onboarding-guide-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
          />
        ))}
      </div>

      {/* 버튼 영역 */}
      <div className="onboarding-guide-actions">
        <button
          type="button"
          className="onboarding-guide-skip"
          onClick={handleSkip}
          aria-label={t('interaction.onboarding_skip')}
        >
          {t('interaction.onboarding_skip')}
        </button>
        <button
          type="button"
          className="onboarding-guide-next"
          onClick={handleNext}
          aria-label={isLastStep ? t('interaction.onboarding_start') : t('common.next')}
        >
          {isLastStep ? t('interaction.onboarding_start') : t('common.next')}
        </button>
      </div>
    </div>
  );
}

export default OnboardingGuide;
