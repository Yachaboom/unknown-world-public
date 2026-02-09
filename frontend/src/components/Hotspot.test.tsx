import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Hotspot } from './Hotspot';
import { useOnboardingStore } from '../stores/onboardingStore';
import type { SceneObject } from '../schemas/turn';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// dnd-kit 모킹
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    isOver: false,
    setNodeRef: vi.fn(),
  }),
}));

// box2d 유틸 모킹
vi.mock('../utils/box2d', () => ({
  box2dToPixel: vi.fn(() => ({
    top: 100,
    left: 100,
    width: 200,
    height: 200,
  })),
  box2dCenter: vi.fn((box) => ({
    x: (box.xmin + box.xmax) / 2,
    y: (box.ymin + box.ymax) / 2,
  })),
  NORMALIZED_MAX: 1000,
}));

describe('Hotspot UX - Hover Hint', () => {
  const mockObject: SceneObject = {
    id: 'test-obj',
    label: '테스트 오브젝트',
    box_2d: { ymin: 100, xmin: 100, ymax: 300, xmax: 300 },
    interaction_hint: '조사 가능',
  };

  const mockCanvasSize = { width: 1000, height: 1000 };
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useOnboardingStore.getState().resetOnboarding();
  });

  it('마우스 진입 시 onboardingStore의 카운트 증가 액션이 호출되어야 한다', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={mockCanvasSize}
        onClick={mockOnClick}
        disabled={false}
      />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.mouseEnter(hotspot);

    expect(useOnboardingStore.getState().hotspotHintCount).toBe(1);
  });

  it('힌트 표시 조건(첫 N번)을 만족할 때 InteractionHint가 렌더링되어야 한다', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={mockCanvasSize}
        onClick={mockOnClick}
        disabled={false}
      />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.mouseEnter(hotspot);

    // interaction.hotspot_click 키가 렌더링되는지 확인 (InteractionHint 컴포넌트 내의 텍스트)
    expect(screen.getByText('interaction.hotspot_click')).toBeInTheDocument();
  });

  it('힌트 임계값을 초과하면 InteractionHint가 렌더링되지 않아야 한다', () => {
    // 임계값까지 카운트 올리기
    for (let i = 0; i < 3; i++) {
      useOnboardingStore.getState().incrementHotspotHint();
    }
    expect(useOnboardingStore.getState().hotspotHintCount).toBe(3);

    render(
      <Hotspot
        object={mockObject}
        canvasSize={mockCanvasSize}
        onClick={mockOnClick}
        disabled={false}
      />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.mouseEnter(hotspot);

    // 힌트가 보이지 않아야 함
    expect(screen.queryByText('interaction.hotspot_click')).not.toBeInTheDocument();
  });

  it('비활성화 상태일 때는 카운트가 증가하지 않고 힌트도 보이지 않아야 한다', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={mockCanvasSize}
        onClick={mockOnClick}
        disabled={true}
      />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.mouseEnter(hotspot);

    expect(useOnboardingStore.getState().hotspotHintCount).toBe(0);
    expect(screen.queryByText('interaction.hotspot_click')).not.toBeInTheDocument();
  });
});
