import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SceneCanvas } from './SceneCanvas';
import type { SceneObject } from '../schemas/turn';
import type { SceneCanvasState } from '../types/scene';
import { useWorldStore } from '../stores/worldStore';
import { useAgentStore } from '../stores/agentStore';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// ResizeObserver 모킹
let resizeCallback: (entries: ResizeObserverEntry[]) => void;
class MockResizeObserver {
  constructor(callback: (entries: ResizeObserverEntry[]) => void) {
    resizeCallback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

/**
 * 리사이즈 이벤트를 수동으로 트리거합니다.
 */
function triggerResize(width: number, height: number) {
  if (resizeCallback) {
    act(() => {
      resizeCallback([
        {
          contentRect: { width, height } as DOMRectReadOnly,
          target: document.querySelector('.scene-canvas') as Element,
        } as ResizeObserverEntry,
      ]);
    });
  }
}

// getBoundingClientRect 모킹
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  x: 0,
  y: 0,
  toJSON: () => {},
})) as unknown as () => DOMRect;

describe('SceneCanvas Hotspots', () => {
  const defaultState: SceneCanvasState = {
    status: 'scene',
    imageUrl: 'https://example.com/scene.png',
  };

  const mockObjects: SceneObject[] = [
    {
      id: 'obj-1',
      label: 'Object 1',
      box_2d: { ymin: 100, xmin: 100, ymax: 200, xmax: 200 },
      interaction_hint: 'Click me',
    },
    {
      id: 'obj-2',
      label: 'Object 2',
      box_2d: { ymin: 500, xmin: 500, ymax: 700, xmax: 700 },
      interaction_hint: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // 스토어 초기화
    useWorldStore.setState({
      sceneState: { status: 'default', message: '' },
      sceneObjects: [],
    });
    useAgentStore.setState({ isStreaming: false });
  });

  it('should render hotspots when objects are provided in worldStore and status is scene (sorted by area)', () => {
    useWorldStore.setState({
      sceneState: defaultState,
      sceneObjects: mockObjects,
    });
    
    render(<SceneCanvas />);

    // 핫스팟 레이어 확인
    const layer = screen.getByLabelText('scene.hotspot.layer_label');
    expect(layer).toBeInTheDocument();

    // 개별 핫스팟 확인 (role="button")
    // RU-003-S2: 면적 기반 정렬 - 큰 것이 먼저 렌더링되어 낮은 z-index를 가짐
    // Object 1: 100x100 = 10,000
    // Object 2: 200x200 = 40,000
    // 따라서 Object 2가 먼저 오고 Object 1이 나중에 옴
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(mockObjects.length);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Object 2');
    expect(buttons[1]).toHaveAttribute('aria-label', 'Object 1');
    
    // z-index 확인 (RU-003-S2: HotspotOverlay 자체에 style로 적용됨)
    expect(buttons[0]).toHaveStyle({ zIndex: '1' });
    expect(buttons[1]).toHaveStyle({ zIndex: '2' });
  });

  it('should not render hotspots when status is loading', () => {
    useWorldStore.setState({
      sceneState: { status: 'loading' },
      sceneObjects: mockObjects,
    });
    
    render(<SceneCanvas />);

    const layer = screen.queryByLabelText('scene.hotspot.layer_label');
    expect(layer).not.toBeInTheDocument();
  });

  it('should call onHotspotClick when a hotspot is clicked', () => {
    const onHotspotClick = vi.fn();
    useWorldStore.setState({
      sceneState: defaultState,
      sceneObjects: mockObjects,
    });

    render(<SceneCanvas onHotspotClick={onHotspotClick} />);

    const firstHotspot = screen.getByLabelText('Object 1');
    fireEvent.click(firstHotspot);

    expect(onHotspotClick).toHaveBeenCalledWith({
      object_id: 'obj-1',
      box_2d: mockObjects[0].box_2d,
    });
  });

  it('should show tooltip on hover', async () => {
    useWorldStore.setState({
      sceneState: defaultState,
      sceneObjects: mockObjects,
    });

    render(<SceneCanvas />);

    const firstHotspot = screen.getByLabelText('Object 1');

    // Hover 시작
    fireEvent.mouseEnter(firstHotspot);

    // 툴팁 라벨 확인
    expect(screen.getByText('Object 1')).toBeInTheDocument();
    expect(screen.getByText(/scene.hotspot.hint_prefix/)).toBeInTheDocument();
    expect(screen.getByText(/Click me/)).toBeInTheDocument();

    // Hover 종료
    fireEvent.mouseLeave(firstHotspot);
    expect(screen.queryByText('Object 1')).not.toBeInTheDocument();
  });

  it('should be disabled when agentStore.isStreaming is true', () => {
    const onHotspotClick = vi.fn();
    useWorldStore.setState({
      sceneState: defaultState,
      sceneObjects: mockObjects,
    });
    useAgentStore.setState({ isStreaming: true });

    render(<SceneCanvas onHotspotClick={onHotspotClick} />);

    const firstHotspot = screen.getByLabelText('Object 1');
    expect(firstHotspot).toHaveAttribute('aria-disabled', 'true');
    expect(firstHotspot).toHaveAttribute('tabindex', '-1');

    fireEvent.click(firstHotspot);
    expect(onHotspotClick).not.toHaveBeenCalled();
  });

  it('should reposition hotspots when canvas size changes (reactive resize)', async () => {
    vi.useFakeTimers();
    useWorldStore.setState({
      sceneState: defaultState,
      sceneObjects: mockObjects,
    });
    
    render(<SceneCanvas />);

    // Object 1 찾기 (정렬에 의해 두 번째 버튼일 수 있음)
    const firstHotspot = screen.getByLabelText('Object 1');

    // 초기 크기 (800x600) 기반 위치 확인
    expect(firstHotspot).toHaveStyle({
      top: '60px',
      left: '80px',
      width: '80px',
      height: '60px',
    });

    // 크기 변경 트리거 (400x300)
    triggerResize(400, 300);
    
    // RU-003-S2: ResizeObserver 디바운스(100ms) 대기
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // 변경된 크기 기반 위치 확인
    expect(firstHotspot).toHaveStyle({
      top: '30px',
      left: '40px',
      width: '40px',
      height: '30px',
    });
    
    vi.useRealTimers();
  });
});
