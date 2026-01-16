import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SceneCanvas } from './SceneCanvas';
import type { SceneObject } from '../schemas/turn';
import type { SceneCanvasState } from '../types/scene';

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
  });

  it('should render hotspots when objects are provided and status is scene', () => {
    render(<SceneCanvas state={defaultState} objects={mockObjects} />);

    // 핫스팟 레이어 확인
    const layer = screen.getByLabelText('scene.hotspot.layer_label');
    expect(layer).toBeInTheDocument();

    // 개별 핫스팟 확인 (role="button")
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(mockObjects.length);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Object 1');
    expect(buttons[1]).toHaveAttribute('aria-label', 'Object 2');
  });

  it('should not render hotspots when status is loading', () => {
    const loadingState: SceneCanvasState = { status: 'loading' };
    render(<SceneCanvas state={loadingState} objects={mockObjects} />);

    const layer = screen.queryByLabelText('scene.hotspot.layer_label');
    expect(layer).not.toBeInTheDocument();
  });

  it('should call onHotspotClick when a hotspot is clicked', () => {
    const onHotspotClick = vi.fn();
    render(
      <SceneCanvas state={defaultState} objects={mockObjects} onHotspotClick={onHotspotClick} />,
    );

    const firstHotspot = screen.getByLabelText('Object 1');
    fireEvent.click(firstHotspot);

    expect(onHotspotClick).toHaveBeenCalledWith({
      object_id: 'obj-1',
      box_2d: mockObjects[0].box_2d,
    });
  });

  it('should show tooltip on hover', async () => {
    render(<SceneCanvas state={defaultState} objects={mockObjects} />);

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

  it('should be disabled when disabled prop is true', () => {
    const onHotspotClick = vi.fn();
    render(
      <SceneCanvas
        state={defaultState}
        objects={mockObjects}
        onHotspotClick={onHotspotClick}
        disabled={true}
      />,
    );

    const firstHotspot = screen.getByLabelText('Object 1');
    expect(firstHotspot).toHaveAttribute('aria-disabled', 'true');
    expect(firstHotspot).toHaveAttribute('tabindex', '-1');

    fireEvent.click(firstHotspot);
    expect(onHotspotClick).not.toHaveBeenCalled();
  });

  it('should reposition hotspots when canvas size changes (reactive resize)', () => {
    render(<SceneCanvas state={defaultState} objects={mockObjects} />);

    const firstHotspot = screen.getByLabelText('Object 1');

    // 초기 크기 (800x600) 기반 위치 확인
    // ymin: 100, xmin: 100, ymax: 200, xmax: 200
    // top: 100 * (600/1000) = 60px
    // left: 100 * (800/1000) = 80px
    expect(firstHotspot).toHaveStyle({
      top: '60px',
      left: '80px',
      width: '80px',
      height: '60px',
    });

    // 크기 변경 트리거 (400x300)
    triggerResize(400, 300);

    // 변경된 크기 기반 위치 확인
    // top: 100 * (300/1000) = 30px
    // left: 100 * (400/1000) = 40px
    expect(firstHotspot).toHaveStyle({
      top: '30px',
      left: '40px',
      width: '40px',
      height: '30px',
    });
  });
});
