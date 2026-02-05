import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore, ONBOARDING_HINT_THRESHOLD } from './onboardingStore';

describe('onboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
    // localStorage 모킹은 필요 시 추가
  });

  describe('Hint Counts', () => {
    it('핫스팟 힌트 카운트가 증가해야 한다', () => {
      const store = useOnboardingStore.getState();
      expect(store.hotspotHintCount).toBe(0);

      store.incrementHotspotHint();
      expect(useOnboardingStore.getState().hotspotHintCount).toBe(1);
    });

    it('아이템 힌트 카운트가 증가해야 한다', () => {
      const store = useOnboardingStore.getState();
      expect(store.itemHintCount).toBe(0);

      store.incrementItemHint();
      expect(useOnboardingStore.getState().itemHintCount).toBe(1);
    });

    it('카운트가 임계값(THRESHOLD)을 넘지 않아야 한다', () => {
      const store = useOnboardingStore.getState();

      // 임계값보다 많이 호출
      for (let i = 0; i < ONBOARDING_HINT_THRESHOLD + 2; i++) {
        store.incrementHotspotHint();
      }

      expect(useOnboardingStore.getState().hotspotHintCount).toBe(ONBOARDING_HINT_THRESHOLD);
    });
  });

  describe('Onboarding Guide Flow', () => {
    it('온보딩 가이드를 표시할 수 있어야 한다', () => {
      const store = useOnboardingStore.getState();
      expect(store.showOnboarding).toBe(false);

      store.showOnboardingGuide();
      expect(useOnboardingStore.getState().showOnboarding).toBe(true);
      expect(useOnboardingStore.getState().onboardingStep).toBe(0);
    });

    it('이미 완료된 온보딩은 다시 표시되지 않아야 한다', () => {
      const store = useOnboardingStore.getState();
      store.completeOnboarding();
      expect(useOnboardingStore.getState().onboardingComplete).toBe(true);

      store.showOnboardingGuide();
      expect(useOnboardingStore.getState().showOnboarding).toBe(false);
    });

    it('다음 단계로 이동할 수 있어야 한다', () => {
      const store = useOnboardingStore.getState();
      store.showOnboardingGuide();
      expect(useOnboardingStore.getState().onboardingStep).toBe(0);

      store.nextOnboardingStep();
      expect(useOnboardingStore.getState().onboardingStep).toBe(1);
    });

    it('온보딩을 완료하면 상태가 업데이트되어야 한다', () => {
      const store = useOnboardingStore.getState();
      store.showOnboardingGuide();
      store.completeOnboarding();

      const state = useOnboardingStore.getState();
      expect(state.onboardingComplete).toBe(true);
      expect(state.showOnboarding).toBe(false);
      expect(state.onboardingStep).toBe(0);
    });

    it('온보딩을 닫으면(dismiss) 완료되지는 않지만 표시만 안 되어야 한다', () => {
      const store = useOnboardingStore.getState();
      store.showOnboardingGuide();
      store.dismissOnboarding();

      const state = useOnboardingStore.getState();
      expect(state.onboardingComplete).toBe(false);
      expect(state.showOnboarding).toBe(false);
    });
  });
});
