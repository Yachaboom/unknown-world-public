/**
 * Unknown World - 인터랙션 힌트 상태 관리 스토어
 *
 * U-074[Mvp]: 핫스팟/아이템 인터랙션 안내 UX
 * - Q1 Option B: 첫 N번만 hover 힌트 표시 후 숨김 (학습 후 사라짐)
 *
 * U-117[Mvp]: 온보딩 가이드 팝업 제거
 * - showOnboarding, onboardingStep, onboardingComplete 상태 제거
 * - 관련 액션/셀렉터/initializeOnboarding 함수 제거
 * - hover 힌트 시스템(첫 N회 노출 후 숨김)만 유지
 *
 * RULE-006 준수: i18n 키 기반 텍스트
 *
 * @module stores/onboardingStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// =============================================================================
// 상수 정의
// =============================================================================

/** 힌트를 표시할 최대 횟수 (이후 숨김) */
const HINT_THRESHOLD = 3;

/** localStorage 키 */
const STORAGE_KEY = 'unknown-world-onboarding';

// =============================================================================
// 타입 정의
// =============================================================================

interface OnboardingState {
  /** 핫스팟 hover 횟수 (첫 N번 후 힌트 숨김) */
  hotspotHintCount: number;

  /** 아이템 hover 횟수 (첫 N번 후 힌트 숨김) */
  itemHintCount: number;
}

interface OnboardingActions {
  /** 핫스팟 힌트 표시 횟수 증가 */
  incrementHotspotHint: () => void;

  /** 아이템 힌트 표시 횟수 증가 */
  incrementItemHint: () => void;

  /** 힌트 상태 초기화 (개발/테스트용) */
  resetOnboarding: () => void;
}

type OnboardingStore = OnboardingState & OnboardingActions;

// =============================================================================
// 초기 상태
// =============================================================================

const initialState: OnboardingState = {
  hotspotHintCount: 0,
  itemHintCount: 0,
};

// =============================================================================
// 셀렉터 함수 (성능 최적화)
// =============================================================================

/**
 * 핫스팟 힌트 표시 여부 (첫 N번만 true)
 */
export const selectShouldShowHotspotHint = (state: OnboardingState): boolean =>
  state.hotspotHintCount < HINT_THRESHOLD;

/**
 * 아이템 힌트 표시 여부 (첫 N번만 true)
 */
export const selectShouldShowItemHint = (state: OnboardingState): boolean =>
  state.itemHintCount < HINT_THRESHOLD;

// =============================================================================
// Zustand Store
// =============================================================================

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      incrementHotspotHint: () => {
        const { hotspotHintCount } = get();
        if (hotspotHintCount < HINT_THRESHOLD) {
          set({ hotspotHintCount: hotspotHintCount + 1 });
        }
      },

      incrementItemHint: () => {
        const { itemHintCount } = get();
        if (itemHintCount < HINT_THRESHOLD) {
          set({ itemHintCount: itemHintCount + 1 });
        }
      },

      resetOnboarding: () => {
        set(initialState);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hotspotHintCount: state.hotspotHintCount,
        itemHintCount: state.itemHintCount,
      }),
    },
  ),
);

// =============================================================================
// 상수 노출 (테스트용)
// =============================================================================

/**
 * 힌트 임계값 상수 노출 (테스트용)
 */
export const ONBOARDING_HINT_THRESHOLD = HINT_THRESHOLD;
