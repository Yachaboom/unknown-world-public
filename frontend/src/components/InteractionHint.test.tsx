import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InteractionHint } from './InteractionHint';

describe('InteractionHint', () => {
  it('전달된 텍스트를 올바르게 렌더링해야 한다', () => {
    const testText = '테스트 힌트 텍스트';
    render(<InteractionHint text={testText} />);

    expect(screen.getByText(testText)).toBeInTheDocument();
  });

  it('아이콘 타입에 따라 적절한 aria-hidden SVG를 포함해야 한다', () => {
    const { container } = render(<InteractionHint text="클릭" icon="click" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.interaction-hint-icon')).toBeInTheDocument();
  });

  it('위치 props에 따라 적절한 클래스를 가져야 한다', () => {
    const { container: topContainer } = render(<InteractionHint text="위" position="top" />);
    expect(topContainer.firstChild).toHaveClass('interaction-hint--top');

    const { container: bottomContainer } = render(
      <InteractionHint text="아래" position="bottom" />,
    );
    expect(bottomContainer.firstChild).toHaveClass('interaction-hint--bottom');
  });

  it('aria-label이 설정되어야 한다', () => {
    render(<InteractionHint text="조사하기" ariaLabel="커스텀 라벨" />);
    expect(screen.getByRole('tooltip')).toHaveAttribute('aria-label', '커스텀 라벨');
  });
});
