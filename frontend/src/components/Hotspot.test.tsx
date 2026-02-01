import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Hotspot } from './Hotspot';
import type { SceneObject } from '../schemas/turn';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// dnd-kit 모킹
vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(({ id, data, disabled }) => ({
    isOver: false,
    setNodeRef: vi.fn(),
    id,
    data,
    disabled,
  })),
}));

describe('Hotspot Component (U-058)', () => {
  const mockObject: SceneObject = {
    id: 'obj-1',
    label: 'Test Object',
    box_2d: { ymin: 100, xmin: 100, ymax: 200, xmax: 200 },
    interaction_hint: 'Try clicking this',
  };

  const canvasSize = { width: 1000, height: 1000 };
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with correct position and size based on box_2d', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={canvasSize}
        onClick={mockOnClick}
        disabled={false}
      />,
    );

    const hotspot = screen.getByRole('button');
    // ymin:100 -> top:100px, xmin:100 -> left:100px
    // ymax:200 - ymin:100 -> height:100px, xmax:200 - xmin:100 -> width:100px
    expect(hotspot).toHaveStyle({
      top: '100px',
      left: '100px',
      width: '100px',
      height: '100px',
    });
  });

  it('should have hotspot-corners div for L-shaped markers (Q2 Option A)', () => {
    const { container } = render(
      <Hotspot
        object={mockObject}
        canvasSize={canvasSize}
        onClick={mockOnClick}
        disabled={false}
      />,
    );

    const corners = container.querySelector('.hotspot-corners');
    expect(corners).toBeInTheDocument();
  });

  it('should apply "hovered" class on mouse enter', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={canvasSize}
        onClick={mockOnClick}
        disabled={false}
      />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.mouseEnter(hotspot);
    expect(hotspot).toHaveClass('hovered');

    fireEvent.mouseLeave(hotspot);
    expect(hotspot).not.toHaveClass('hovered');
  });

  it('should apply "disabled" class and aria-disabled when disabled prop is true', () => {
    render(
      <Hotspot object={mockObject} canvasSize={canvasSize} onClick={mockOnClick} disabled={true} />,
    );

    const hotspot = screen.getByRole('button');
    expect(hotspot).toHaveClass('disabled');
    expect(hotspot).toHaveAttribute('aria-disabled', 'true');
    expect(hotspot).toHaveAttribute('tabindex', '-1');
  });

  it('should apply "demo-target" class when isDemoState is true', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={canvasSize}
        onClick={mockOnClick}
        disabled={false}
        isDemoState={true}
      />,
    );

    const hotspot = screen.getByRole('button');
    expect(hotspot).toHaveClass('demo-target');
  });

  it('should show tooltip with label and hint on hover', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={canvasSize}
        onClick={mockOnClick}
        disabled={false}
      />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.mouseEnter(hotspot);

    expect(screen.getByText('Test Object')).toBeInTheDocument();
    expect(screen.getByText(/scene.hotspot.hint_prefix/)).toBeInTheDocument();
    expect(screen.getByText(/Try clicking this/)).toBeInTheDocument();
  });

  it('should show demo hint in tooltip when isDemoState is true', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={canvasSize}
        onClick={mockOnClick}
        disabled={false}
        isDemoState={true}
      />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.mouseEnter(hotspot);

    expect(screen.getByText('scene.hotspot.demo_hint')).toBeInTheDocument();
  });

  it('should call onClick when clicked and not disabled', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={canvasSize}
        onClick={mockOnClick}
        disabled={false}
      />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.click(hotspot);

    expect(mockOnClick).toHaveBeenCalledWith({
      object_id: 'obj-1',
      box_2d: mockObject.box_2d,
    });
  });

  it('should not call onClick when clicked and disabled', () => {
    render(
      <Hotspot object={mockObject} canvasSize={canvasSize} onClick={mockOnClick} disabled={true} />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.click(hotspot);

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should handle Enter key for accessibility', () => {
    render(
      <Hotspot
        object={mockObject}
        canvasSize={canvasSize}
        onClick={mockOnClick}
        disabled={false}
      />,
    );

    const hotspot = screen.getByRole('button');
    fireEvent.keyDown(hotspot, { key: 'Enter' });

    expect(mockOnClick).toHaveBeenCalled();
  });
});
