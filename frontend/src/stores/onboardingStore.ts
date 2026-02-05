/**
 * Unknown World - 온보딩/인터랙션 힌트 상태 관리 스토어
 *
 * U-074[Mvp]: 핫스팟/아이템 인터랙션 안내 UX
 * - Q1 Option B: 첫 N번만 hover 힌트 표시 후 숨김 (학습 후 사라짐)
 * - Q2 Option B: 화면 코너에 작은 팝업 가이드
 * - Q3 Option B: 데모 프로필도 첫 접속 시 온보딩 표시
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
  /** 온보딩 가이드 완료 여부 */
  onboardingComplete: boolean;

  /** 핫스팟 hover 횟수 (첫 N번 후 힌트 숨김) */
  hotspotHintCount: number;

  /** 아이템 hover 횟수 (첫 N번 후 힌트 숨김) */
  itemHintCount: number;

  /** 온보딩 가이드 표시 여부 (세션 중 상태) */
  showOnboarding: boolean;

  /** 온보딩 현재 단계 (0-based) */
  onboardingStep: number;
}

interface OnboardingActions {
  /** 핫스팟 힌트 표시 횟수 증가 */
  incrementHotspotHint: () => void;

  /** 아이템 힌트 표시 횟수 증가 */
  incrementItemHint: () => void;

  /** 온보딩 완료 처리 */
  completeOnboarding: () => void;

  /** 온보딩 가이드 닫기 (스킵 또는 완료) */
  dismissOnboarding: () => void;

  /** 온보딩 가이드 표시 (세션 시작 시 호출) */
  showOnboardingGuide: () => void;

  /** 온보딩 다음 단계로 이동 */
  nextOnboardingStep: () => void;

  /** 온보딩 상태 초기화 (개발/테스트용) */
  resetOnboarding: () => void;
}

type OnboardingStore = OnboardingState & OnboardingActions;

// =============================================================================
// 초기 상태
// =============================================================================

const initialState: OnboardingState = {
  onboardingComplete: false,
  hotspotHintCount: 0,
  itemHintCount: 0,
  showOnboarding: false,
  onboardingStep: 0,
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

/**
 * 온보딩 가이드 표시 여부
 */
export const selectShowOnboarding = (state: OnboardingState): boolean =>
  state.showOnboarding && !state.onboardingComplete;

/**
 * 온보딩 현재 단계
 */
export const selectOnboardingStep = (state: OnboardingState): number => state.onboardingStep;

/**
 * 온보딩 완료 여부
 */
export const selectOnboardingComplete = (state: OnboardingState): boolean =>
  state.onboardingComplete;

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

      completeOnboarding: () => {
        set({
          onboardingComplete: true,
          showOnboarding: false,
          onboardingStep: 0,
        });
      },

      dismissOnboarding: () => {
        set({
          showOnboarding: false,
          onboardingStep: 0,
        });
      },

      showOnboardingGuide: () => {
        const { onboardingComplete } = get();
        // 온보딩 미완료 시에만 표시
        if (!onboardingComplete) {
          set({
            showOnboarding: true,
            onboardingStep: 0,
          });
        }
      },

      nextOnboardingStep: () => {
        set((state) => ({
          onboardingStep: state.onboardingStep + 1,
        }));
      },

      resetOnboarding: () => {
        set(initialState);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 세션 중 상태(showOnboarding, onboardingStep)는 저장하지 않음
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        hotspotHintCount: state.hotspotHintCount,
        itemHintCount: state.itemHintCount,
      }),
    },
  ),
);

// =============================================================================
// 헬퍼 함수 (컴포넌트 외부에서 사용)
// =============================================================================

/**
 * 온보딩 상태 초기화 (세션 시작 시 호출)
 *
 * Q3 Option B: 데모 프로필도 첫 접속 시 온보딩 표시
 */
export function initializeOnboarding(): void {
  const store = useOnboardingStore.getState();
  if (!store.onboardingComplete) {
    store.showOnboardingGuide();
  }
}

/**
 * 힌트 임계값 상수 노출 (테스트용)
 */
export const ONBOARDING_HINT_THRESHOLD = HINT_THRESHOLD;
