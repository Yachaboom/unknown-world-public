/**
 * Unknown World - Onboarding Store Unit Tests
 *
 * U-117[Mvp]: 온보딩 가이드 팝업 제거 검증
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useOnboardingStore,
  selectShouldShowHotspotHint,
  selectShouldShowItemHint,
} from './onboardingStore';

describe('onboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
  });

  it('should not have popup related states (showOnboarding, onboardingStep, onboardingComplete)', () => {
    const state = useOnboardingStore.getState() as unknown as Record<string, unknown>;

    // 제거된 상태들이 존재하지 않아야 함
    expect(state.showOnboarding).toBeUndefined();
    expect(state.onboardingStep).toBeUndefined();
    expect(state.onboardingComplete).toBeUndefined();
  });

  it('should maintain hint count system for hover hints', () => {
    const state = useOnboardingStore.getState();

    expect(state.hotspotHintCount).toBe(0);
    expect(state.itemHintCount).toBe(0);

    // 힌트 표시 여부 셀렉터 작동 확인
    expect(selectShouldShowHotspotHint(state)).toBe(true);
    expect(selectShouldShowItemHint(state)).toBe(true);
  });

  it('should increment hint counts and eventually hide hints', () => {
    // 3번 증가 시도 (HINT_THRESHOLD = 3)
    useOnboardingStore.getState().incrementHotspotHint();
    useOnboardingStore.getState().incrementHotspotHint();
    useOnboardingStore.getState().incrementHotspotHint();

    const stateAfter3 = useOnboardingStore.getState();
    expect(stateAfter3.hotspotHintCount).toBe(3);
    expect(selectShouldShowHotspotHint(stateAfter3)).toBe(false); // 3회 이상이면 false

    // 더 증가하지 않아야 함 (HINT_THRESHOLD 이상이면 무시)
    useOnboardingStore.getState().incrementHotspotHint();
    expect(useOnboardingStore.getState().hotspotHintCount).toBe(3);
  });
});
