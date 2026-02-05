/**
 * Unknown World - 인터랙션 힌트 컴포넌트
 *
 * U-074[Mvp]: 핫스팟/아이템 인터랙션 안내 UX
 * - 재사용 가능한 힌트 툴팁 컴포넌트
 * - 클릭/드래그/드롭 아이콘 + 텍스트 표시
 * - Q1 Option B: 첫 N번만 표시 후 숨김
 *
 * RULE-006 준수: i18n 키 기반 텍스트
 * RULE-002 준수: 채팅 UI가 아닌 게임 UI
 *
 * @module components/InteractionHint
 */

import { memo } from 'react';
import '../styles/interaction-hint.css';

// =============================================================================
// 타입 정의
// =============================================================================

export type HintIconType = 'click' | 'drag' | 'drop' | 'scanner';
export type HintPosition = 'top' | 'bottom' | 'left' | 'right';

interface InteractionHintProps {
  /** 힌트 텍스트 (i18n 처리된 문자열) */
  text: string;

  /** 아이콘 타입 */
  icon?: HintIconType;

  /** 힌트 위치 */
  position?: HintPosition;

  /** 추가 CSS 클래스 */
  className?: string;

  /** 접근성: aria-label 오버라이드 */
  ariaLabel?: string;
}

// =============================================================================
// 아이콘 컴포넌트
// =============================================================================

/**
 * 힌트 아이콘 SVG
 *
 * 간단한 인라인 SVG로 아이콘을 표현합니다.
 * 외부 이미지 에셋 없이 순수 CSS/SVG로 구현.
 */
function HintIcon({ type }: { type: HintIconType }) {
  switch (type) {
    case 'click':
      // 마우스 클릭 아이콘 (간단한 포인터)
      return (
        <svg
          className="interaction-hint-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* 마우스 포인터 모양 */}
          <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
          <line x1="13.5" y1="13.5" x2="19" y2="19" />
        </svg>
      );

    case 'drag':
      // 드래그 아이콘 (손 + 화살표)
      return (
        <svg
          className="interaction-hint-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* 손 모양 */}
          <path d="M18 11V6a2 2 0 0 0-4 0v5" />
          <path d="M14 10V4a2 2 0 0 0-4 0v6" />
          <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
          <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      );

    case 'drop':
      // 드롭 아이콘 (다운 화살표 + 박스)
      return (
        <svg
          className="interaction-hint-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* 박스 */}
          <rect x="3" y="11" width="18" height="10" rx="2" />
          {/* 다운 화살표 */}
          <path d="M12 3v8" />
          <path d="M8 7l4 4 4-4" />
        </svg>
      );

    case 'scanner':
      // 스캐너 아이콘 (카메라/업로드)
      return (
        <svg
          className="interaction-hint-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* 업로드 아이콘 */}
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );

    default:
      return null;
  }
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * 인터랙션 힌트 컴포넌트
 *
 * 핫스팟/아이템 위에 표시되는 작은 툴팁 형태의 힌트입니다.
 * U-074[Mvp] Q1 Option B에 따라 첫 N번만 표시됩니다.
 *
 * @example
 * ```tsx
 * <InteractionHint
 *   text={t('interaction.hotspot_click')}
 *   icon="click"
 *   position="top"
 * />
 * ```
 */
function InteractionHintComponent({
  text,
  icon,
  position = 'top',
  className = '',
  ariaLabel,
}: InteractionHintProps) {
  const positionClass = `interaction-hint--${position}`;

  return (
    <div
      className={`interaction-hint ${positionClass} ${className}`.trim()}
      role="tooltip"
      aria-label={ariaLabel ?? text}
    >
      <div className="interaction-hint-content">
        {icon && <HintIcon type={icon} />}
        <span className="interaction-hint-text">{text}</span>
      </div>
    </div>
  );
}

/**
 * Memoized 인터랙션 힌트 컴포넌트
 *
 * 빈번한 호버 이벤트에서 불필요한 리렌더를 방지합니다.
 */
export const InteractionHint = memo(InteractionHintComponent);

InteractionHint.displayName = 'InteractionHint';

// Re-export types
export type { InteractionHintProps };
