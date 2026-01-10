import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useUIPrefsStore,
  DEFAULT_UI_SCALE,
  DEFAULT_READABLE_MODE,
  applyUIPrefsToDOM,
} from './uiPrefsStore';

// Node 환경에서 localStorage 및 document 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

const documentMock = {
  documentElement: {
    dataset: {} as Record<string, string>,
    style: {
      setProperty: vi.fn(),
      removeProperty: vi.fn(),
      getPropertyValue: vi.fn(),
    },
    removeAttribute: vi.fn(),
  },
};

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('document', documentMock);

describe('uiPrefsStore', () => {
  beforeEach(() => {
    // 스토어 상태 초기화
    useUIPrefsStore.getState().resetPrefs();
    // localStorage 클리어
    localStorage.clear();

    // DOM 모킹 초기화
    documentMock.documentElement.dataset = {};
    vi.mocked(documentMock.documentElement.style.setProperty).mockClear();
    vi.mocked(documentMock.documentElement.style.getPropertyValue).mockImplementation(
      (prop: string) => {
        if (prop === '--ui-scale-factor') return documentMock.documentElement.dataset.uiScale;
        return '';
      },
    );
  });

  it('초기 상태가 올바르게 설정되어야 한다', () => {
    const state = useUIPrefsStore.getState();
    expect(state.uiScale).toBe(DEFAULT_UI_SCALE);
    expect(state.readableMode).toBe(DEFAULT_READABLE_MODE);
  });

  it('setUIScale이 유효한 값일 때만 작동해야 한다', () => {
    const store = useUIPrefsStore.getState();

    // 유효한 값 설정
    store.setUIScale(1.2);
    expect(useUIPrefsStore.getState().uiScale).toBe(1.2);

    // 유효하지 않은 값 설정 시도 (타입 단언 사용)
    // @ts-expect-error: intentional invalid scale for testing
    store.setUIScale(1.5);
    expect(useUIPrefsStore.getState().uiScale).toBe(1.2); // 이전 값 유지
  });

  it('increaseUIScale이 상한선(1.2)을 넘지 않아야 한다', () => {
    const store = useUIPrefsStore.getState();

    store.setUIScale(1.1);
    store.increaseUIScale();
    expect(useUIPrefsStore.getState().uiScale).toBe(1.2);

    store.increaseUIScale();
    expect(useUIPrefsStore.getState().uiScale).toBe(1.2); // 1.2 고정
  });

  it('decreaseUIScale이 하한선(0.9) 미만으로 내려가지 않아야 한다', () => {
    const store = useUIPrefsStore.getState();

    store.setUIScale(1.0);
    store.decreaseUIScale();
    expect(useUIPrefsStore.getState().uiScale).toBe(0.9);

    store.decreaseUIScale();
    expect(useUIPrefsStore.getState().uiScale).toBe(0.9); // 0.9 고정
  });

  it('toggleReadableMode가 상태를 반전시켜야 한다', () => {
    const store = useUIPrefsStore.getState();

    store.toggleReadableMode();
    expect(useUIPrefsStore.getState().readableMode).toBe(true);

    store.toggleReadableMode();
    expect(useUIPrefsStore.getState().readableMode).toBe(false);
  });

  it('resetPrefs가 상태를 기본값으로 되돌려야 한다', () => {
    const store = useUIPrefsStore.getState();

    store.setUIScale(1.2);
    store.setReadableMode(true);

    store.resetPrefs();

    const state = useUIPrefsStore.getState();
    expect(state.uiScale).toBe(DEFAULT_UI_SCALE);
    expect(state.readableMode).toBe(DEFAULT_READABLE_MODE);
  });

  it('applyUIPrefsToDOM이 DOM 속성을 올바르게 설정해야 한다', () => {
    const prefs = {
      uiScale: 1.1 as const,
      readableMode: true,
    };

    applyUIPrefsToDOM(prefs);

    const docEl = document.documentElement;
    expect(docEl.style.getPropertyValue('--ui-scale-factor')).toBe('1.1');
    expect(docEl.dataset.uiScale).toBe('1.1');
    expect(docEl.dataset.readable).toBe('true');
  });

  it('restoreState가 유효한 상태만 복원해야 한다', () => {
    const store = useUIPrefsStore.getState();

    store.restoreState({
      uiScale: 0.9,
      readableMode: true,
    });

    let state = useUIPrefsStore.getState();
    expect(state.uiScale).toBe(0.9);
    expect(state.readableMode).toBe(true);

    // 유효하지 않은 값으로 복원 시도
    store.restoreState({
      // @ts-expect-error: intentional invalid scale for testing
      uiScale: 2.0,
    });

    state = useUIPrefsStore.getState();
    expect(state.uiScale).toBe(0.9); // 이전 유효한 값 유지
  });
});
