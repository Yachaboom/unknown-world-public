import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingGuide } from './OnboardingGuide';
import { useOnboardingStore } from '../stores/onboardingStore';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('OnboardingGuide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOnboardingStore.getState().resetOnboarding();
  });

  it('showOnboarding이 false이면 아무것도 렌더링하지 않아야 한다', () => {
    const { container } = render(<OnboardingGuide />);
    expect(container.firstChild).toBeNull();
  });

  it('showOnboarding이 true이면 가이드가 렌더링되어야 한다', () => {
    useOnboardingStore.getState().showOnboardingGuide();
    render(<OnboardingGuide />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('interaction.onboarding_title')).toBeInTheDocument();
  });

  it('Next 버튼 클릭 시 다음 단계로 이동해야 한다', () => {
    useOnboardingStore.getState().showOnboardingGuide();
    render(<OnboardingGuide />);

    // 첫 단계 텍스트 확인 (핫스팟)
    expect(screen.getByText('interaction.onboarding_hotspot')).toBeInTheDocument();

    // Next 클릭
    const nextButton = screen.getByLabelText('common.next');
    fireEvent.click(nextButton);

    // 다음 단계 텍스트 확인 (아이템)
    expect(screen.getByText('interaction.onboarding_item')).toBeInTheDocument();
    expect(useOnboardingStore.getState().onboardingStep).toBe(1);
  });

  it('Skip 버튼 클릭 시 온보딩이 완료되어야 한다', () => {
    useOnboardingStore.getState().showOnboardingGuide();
    render(<OnboardingGuide />);

    const skipButton = screen.getByLabelText('interaction.onboarding_skip');
    fireEvent.click(skipButton);

    const state = useOnboardingStore.getState();
    expect(state.onboardingComplete).toBe(true);
    expect(state.showOnboarding).toBe(false);
  });

  it('마지막 단계에서 Start 버튼 클릭 시 온보딩이 완료되어야 한다', () => {
    const store = useOnboardingStore.getState();
    store.showOnboardingGuide();
    store.nextOnboardingStep();
    store.nextOnboardingStep(); // 마지막 단계 (2)

    render(<OnboardingGuide />);

    expect(screen.getByText('interaction.onboarding_scanner')).toBeInTheDocument();

    const startButton = screen.getByLabelText('interaction.onboarding_start');
    fireEvent.click(startButton);

    const state = useOnboardingStore.getState();
    expect(state.onboardingComplete).toBe(true);
  });

  it('Enter 키 입력 시 다음 단계로 이동해야 한다', () => {
    useOnboardingStore.getState().showOnboardingGuide();
    render(<OnboardingGuide />);

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(useOnboardingStore.getState().onboardingStep).toBe(1);
  });
});
