import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { SceneCanvas } from './SceneCanvas';
import { useWorldStore } from '../stores/worldStore';

// ResizeObserver 모킹
interface MockObserver {
  callback: ResizeObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

const observerInstances: MockObserver[] = [];
const MockResizeObserver = vi.fn().mockImplementation(function (
  this: MockObserver,
  callback: ResizeObserverCallback,
) {
  this.callback = callback;
  this.observe = vi.fn();
  this.unobserve = vi.fn();
  this.disconnect = vi.fn();
  observerInstances.push(this);
});

vi.stubGlobal('ResizeObserver', MockResizeObserver);

describe('SceneCanvas Rendering Stability (U-097)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // console.error 감시 (React 렌더링 중 업데이트 경고는 console.error로 출력됨)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Store 초기화
    useWorldStore.getState().reset();
    observerInstances.length = 0;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should not throw "Cannot update a component while rendering" warning', async () => {
    // Given: SceneCanvas 렌더링
    render(<SceneCanvas />);

    // Then: 렌더링 직후 console.error에 React 경고가 없어야 함
    const hasWarning = consoleErrorSpy.mock.calls.some(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('Cannot update a component'),
    );

    expect(hasWarning).toBe(false);
  });

  it('should update Zustand store via useEffect, not during render', async () => {
    vi.useFakeTimers();

    // getBoundingClientRect 모킹 (초기 크기 설정용)
    const getBoundingClientRectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        width: 1024,
        height: 768,
        top: 0,
        left: 0,
        bottom: 768,
        right: 1024,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

    // Store의 setSceneCanvasSize를 스파이
    const setSceneCanvasSizeSpy = vi.spyOn(useWorldStore.getState(), 'setSceneCanvasSize');

    // SceneCanvas 렌더링
    render(<SceneCanvas />);

    // useEffect가 실행되도록 대기
    await act(async () => {
      vi.runAllTimers();
    });

    // setSceneCanvasSize가 호출되었는지 확인
    expect(setSceneCanvasSizeSpy).toHaveBeenCalled();

    // ResizeObserver 트리거 시뮬레이션
    const observerInstance = observerInstances[0];
    const mockEntry = {
      contentRect: { width: 800, height: 600 },
    } as unknown as ResizeObserverEntry;

    await act(async () => {
      observerInstance.callback([mockEntry], observerInstance as unknown as ResizeObserver);
    });

    // 100ms 디바운스 대기
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    // Store 업데이트 확인
    expect(useWorldStore.getState().sceneCanvasSize).toEqual({ width: 800, height: 600 });

    // 이 과정에서 렌더링 중 업데이트 경고가 발생하지 않았는지 최종 확인
    const hasWarning = consoleErrorSpy.mock.calls.some(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('Cannot update a component'),
    );
    expect(hasWarning).toBe(false);

    getBoundingClientRectSpy.mockRestore();
  });
});
