/**
 * Unknown World - UI 설정 상태 관리 (Zustand + persist).
 *
 * UI 가독성 관련 설정(스케일/Readable 모드)을 저장하고,
 * SaveGame 구조와 통합 가능하도록 직렬화 인터페이스를 제공합니다.
 *
 * 설계 원칙:
 *   - PRD 9.4: 가독성(필수) - 전역 UI 스케일 조절 제공
 *   - PRD 9.5: Readable 모드 - CRT 효과 완화 토글
 *   - Q1 결정: Option B (SaveGame에 포함) - persist + 직렬화
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

/** 기본 Readable 모드 */
export const DEFAULT_READABLE_MODE = false;

/** localStorage 키 (SaveGame 통합 시에도 사용 가능) */
export const UI_PREFS_STORAGE_KEY = 'unknown-world-ui-prefs';

// =============================================================================
// 상태 타입 정의
// =============================================================================

/** UI 설정 상태 (SaveGame 직렬화 대상) */
export interface UIPrefsState {
  /**
   * UI 스케일 (0.9 ~ 1.2)
   * - 0.9: 작은 UI (정보 밀도 높음)
   * - 1.0: 기본
   * - 1.1: 약간 확대
   * - 1.2: 큰 UI (가독성 우선)
   */
  uiScale: UIScale;

  /**
   * Readable 모드
   * - true: 스캔라인/플리커/글로우 완화, 대비 향상
   * - false: 기본 CRT 효과 유지
   */
  readableMode: boolean;
}

/** UI 설정 액션 */
export interface UIPrefsActions {
  /** UI 스케일 설정 */
  setUIScale: (scale: UIScale) => void;

  /** UI 스케일 증가 (최대 1.2) */
  increaseUIScale: () => void;

  /** UI 스케일 감소 (최소 0.9) */
  decreaseUIScale: () => void;

  /** Readable 모드 토글 */
  toggleReadableMode: () => void;

  /** Readable 모드 설정 */
  setReadableMode: (enabled: boolean) => void;

  /** 설정 초기화 */
  resetPrefs: () => void;

  /**
   * SaveGame 직렬화용 상태 추출
   * (추후 SaveGame 통합 시 사용)
   */
  getSerializableState: () => UIPrefsState;

  /**
   * SaveGame 역직렬화용 상태 복원
   * (추후 SaveGame 통합 시 사용)
   */
  restoreState: (state: Partial<UIPrefsState>) => void;
}

export type UIPrefsStore = UIPrefsState & UIPrefsActions;

// =============================================================================
// 초기 상태
// =============================================================================

/** 초기 상태 생성 */
function createInitialState(): UIPrefsState {
  return {
    uiScale: DEFAULT_UI_SCALE,
    readableMode: DEFAULT_READABLE_MODE,
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

// =============================================================================
// Zustand Store with persist
// =============================================================================

/**
 * UI 설정 스토어.
 *
 * @example
 * ```tsx
 * // 컴포넌트에서 사용
 * const { uiScale, readableMode, setUIScale, toggleReadableMode } = useUIPrefsStore();
 *
 * // DOM 적용 (App.tsx에서)
 * useEffect(() => {
 *   document.documentElement.dataset.uiScale = uiScale.toString();
 *   document.documentElement.dataset.readable = readableMode.toString();
 * }, [uiScale, readableMode]);
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

      toggleReadableMode: () => {
        set((state) => ({ readableMode: !state.readableMode }));
      },

      setReadableMode: (enabled) => {
        set({ readableMode: enabled });
      },

      resetPrefs: () => {
        set(createInitialState());
      },

      getSerializableState: () => {
        const { uiScale, readableMode } = get();
        return { uiScale, readableMode };
      },

      restoreState: (state) => {
        const updates: Partial<UIPrefsState> = {};

        if (state.uiScale !== undefined && isValidScale(state.uiScale)) {
          updates.uiScale = state.uiScale;
        }

        if (state.readableMode !== undefined) {
          updates.readableMode = state.readableMode;
        }

        if (Object.keys(updates).length > 0) {
          set(updates);
        }
      },
    }),
    {
      name: UI_PREFS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 직렬화할 필드 지정 (액션 제외)
      partialize: (state) => ({
        uiScale: state.uiScale,
        readableMode: state.readableMode,
      }),
    },
  ),
);

// =============================================================================
// 셀렉터 (성능 최적화용)
// =============================================================================

/** UI 스케일 셀렉터 */
export const selectUIScale = (state: UIPrefsStore) => state.uiScale;

/** Readable 모드 셀렉터 */
export const selectReadableMode = (state: UIPrefsStore) => state.readableMode;

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
 * Readable 모드 적용
 * 호출 시 html 요소에 data-readable 속성 설정
 */
export function applyReadableModeToDOM(enabled: boolean): void {
  document.documentElement.dataset.readable = enabled.toString();
}

/**
 * 전체 UI 설정 DOM 적용
 */
export function applyUIPrefsToDOM(state: UIPrefsState): void {
  applyUIScaleToDOM(state.uiScale);
  applyReadableModeToDOM(state.readableMode);
}
