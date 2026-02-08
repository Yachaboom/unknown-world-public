/**
 * Unknown World - UI 설정 상태 관리 (Zustand + persist) (U-116[Mvp]).
 *
 * UI 스케일 설정을 LocalStorage에 영속화합니다.
 * U-116: SaveGame 시스템 제거에 따라 독립적인 persist 스토어로 유지됩니다.
 *
 * 설계 원칙:
 *   - PRD 9.4: 가독성(필수) - 전역 UI 스케일 조절 제공
 *   - U-037: Readable 모드 제거 → critical/ambient 중요도 기반 스타일로 대체
 *   - U-116: SaveGame 통합 로직 제거
 *
 * @module stores/uiPrefsStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// =============================================================================
// 상수 정의
// =============================================================================

/** 지원하는 UI 스케일 값 */
export const UI_SCALES = [0.9, 1.0, 1.1, 1.2] as const;
export type UIScale = (typeof UI_SCALES)[number];

/** 기본 UI 스케일 */
export const DEFAULT_UI_SCALE: UIScale = 1.0;

/** localStorage 키 */
export const UI_PREFS_STORAGE_KEY = 'unknown-world-ui-prefs';

// =============================================================================
// 상태 타입 정의
// =============================================================================

/** UI 설정 상태 */
export interface UIPrefsState {
  /**
   * UI 스케일 (0.9 ~ 1.2)
   * - 0.9: 작은 UI (정보 밀도 높음)
   * - 1.0: 기본
   * - 1.1: 약간 확대
   * - 1.2: 큰 UI (가독성 우선)
   */
  uiScale: UIScale;
}

/** UI 설정 액션 */
export interface UIPrefsActions {
  /** UI 스케일 설정 */
  setUIScale: (scale: UIScale) => void;

  /** UI 스케일 증가 (최대 1.2) */
  increaseUIScale: () => void;

  /** UI 스케일 감소 (최소 0.9) */
  decreaseUIScale: () => void;

  /** 설정 초기화 */
  resetPrefs: () => void;
}

export type UIPrefsStore = UIPrefsState & UIPrefsActions;

// =============================================================================
// 초기 상태
// =============================================================================

/** 초기 상태 생성 */
function createInitialState(): UIPrefsState {
  return {
    uiScale: DEFAULT_UI_SCALE,
  };
}

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 주어진 스케일이 유효한지 확인
 */
function isValidScale(scale: number): scale is UIScale {
  return UI_SCALES.includes(scale as UIScale);
}

/**
 * 스케일 인덱스 반환
 */
function getScaleIndex(scale: UIScale): number {
  return UI_SCALES.indexOf(scale);
}

/**
 * U-037: legacy 저장값(readableMode) 마이그레이션/무시
 * @internal exported for testing
 */
export function migrateUIPrefs(persistedState: unknown, version: number | undefined): UIPrefsState {
  // version 0 또는 undefined에서 version 1로 마이그레이션
  // readableMode 필드가 있으면 제거
  if (version === 0 || version === undefined) {
    const state = persistedState as Record<string, unknown>;
    // readableMode 필드 제거 (무시)
    if ('readableMode' in state) {
      const { readableMode: _, ...rest } = state;
      return { ...rest, uiScale: state.uiScale ?? DEFAULT_UI_SCALE } as UIPrefsState;
    }
    return { ...state, uiScale: state.uiScale ?? DEFAULT_UI_SCALE } as UIPrefsState;
  }
  return persistedState as UIPrefsState;
}

// =============================================================================
// Zustand Store with persist
// =============================================================================

/**
 * UI 설정 스토어.
 *
 * U-037: Readable 모드 제거됨. CRT 효과는 critical/ambient 중요도 기반으로 자동 적용됩니다.
 *
 * @example
 * ```tsx
 * // 컴포넌트에서 사용
 * const { uiScale, setUIScale } = useUIPrefsStore();
 *
 * // DOM 적용 (App.tsx에서)
 * useEffect(() => {
 *   document.documentElement.dataset.uiScale = uiScale.toString();
 *   document.documentElement.style.setProperty('--ui-scale-factor', uiScale.toString());
 * }, [uiScale]);
 * ```
 */
export const useUIPrefsStore = create<UIPrefsStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      ...createInitialState(),

      // 액션
      setUIScale: (scale) => {
        if (isValidScale(scale)) {
          set({ uiScale: scale });
        }
      },

      increaseUIScale: () => {
        const currentIndex = getScaleIndex(get().uiScale);
        const nextIndex = Math.min(currentIndex + 1, UI_SCALES.length - 1);
        set({ uiScale: UI_SCALES[nextIndex] });
      },

      decreaseUIScale: () => {
        const currentIndex = getScaleIndex(get().uiScale);
        const prevIndex = Math.max(currentIndex - 1, 0);
        set({ uiScale: UI_SCALES[prevIndex] });
      },

      resetPrefs: () => {
        set(createInitialState());
      },
    }),
    {
      name: UI_PREFS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 직렬화할 필드 지정 (액션 제외)
      partialize: (state) => ({
        uiScale: state.uiScale,
      }),
      // U-037: legacy 저장값(readableMode) 마이그레이션/무시
      version: 1,
      migrate: migrateUIPrefs,
    },
  ),
);

// =============================================================================
// 셀렉터 (성능 최적화용)
// =============================================================================

/** UI 스케일 셀렉터 */
export const selectUIScale = (state: UIPrefsStore) => state.uiScale;

// =============================================================================
// DOM 적용 헬퍼
// =============================================================================

/**
 * CSS 변수로 UI 스케일 적용
 * 호출 시 html 요소에 --ui-scale-factor 변수를 설정
 */
export function applyUIScaleToDOM(scale: UIScale): void {
  document.documentElement.style.setProperty('--ui-scale-factor', scale.toString());
  document.documentElement.dataset.uiScale = scale.toString();
}

/**
 * 전체 UI 설정 DOM 적용
 * U-037: readableMode 제거됨 - 스케일만 적용
 */
export function applyUIPrefsToDOM(state: UIPrefsState): void {
  applyUIScaleToDOM(state.uiScale);
}
