/**
 * Unknown World - NarrativeFeed 컴포넌트 (U-066 + U-086: 텍스트 우선 타이핑 출력)
 *
 * 내러티브 텍스트에 타이핑(Typewriter) 효과를 적용하여,
 * 이미지 생성 지연을 자연스럽게 흡수합니다.
 *
 * 설계 원칙 (U-086):
 *   - 이미지 생성 중(isImageLoading): 느린 타이핑 속도 (~12초에 걸쳐 출력)
 *   - 이미지 완료/없음: 빠른 타이핑 속도 (~2.5초)
 *   - 타이핑 완료 후에도 이미지 미도착 시: "이미지 형성 중…" 상태 라인 표시
 *   - Fast-forward: 클릭/Enter/Space로 즉시 전체 표시
 *   - 접근성: prefers-reduced-motion 설정 존중
 *
 * @module components/NarrativeFeed
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { NarrativeEntry } from '../stores/worldStore';

// =============================================================================
// 상수 정의 (U-066 + U-086)
// =============================================================================

/** 타이핑 인터벌 (ms) - ~30fps로 부드러운 타이핑 연출 */
const TYPING_TICK_MS = 32;

/**
 * 이미지 생성 중 느린 모드 목표 시간 (ms)
 * U-086 Q1 Option A: isImageLoading이면 무조건 느린 모드 (~12초 목표, 체감 우선)
 */
const TARGET_DURATION_MS_WHILE_STREAMING = 12000;

/**
 * 유휴 상태(이미지 완료/없음) 빠른 모드 목표 시간 (ms)
 * 이미지가 도착하면 남은 텍스트를 빠르게 출력
 */
const TARGET_DURATION_MS_IDLE = 2500;

/** 최소 CPS (characters per second) - 매우 긴 텍스트에서도 최소 속도 보장 */
const MIN_CPS = 10;

/** 최대 CPS - 짧은 텍스트도 빠르게 표시 가능 */
const MAX_CPS = 400;

// =============================================================================
// 유틸리티 함수
// =============================================================================

/** 값을 min~max 범위로 제한합니다. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// =============================================================================
// 타입 정의
// =============================================================================

interface NarrativeFeedProps {
  entries: NarrativeEntry[];
  streamingText: string;
  /** U-066: 스트리밍 중인지 여부 (타이핑 속도 결정에 사용) */
  isStreaming?: boolean;
  /** U-066: 이미지 로딩 중인지 여부 (타이핑 속도 결정에 사용) */
  isImageLoading?: boolean;
}

// =============================================================================
// 커스텀 훅: useTypewriter (U-066)
// =============================================================================

/**
 * 타이핑 효과를 위한 커스텀 훅
 *
 * @param targetText - 타이핑 대상 텍스트
 * @param shouldBuyTime - 느린 타이핑 모드 사용 여부
 * @returns 타이핑 상태 및 제어 함수
 */
function useTypewriter(targetText: string, shouldBuyTime: boolean) {
  const [typedLen, setTypedLen] = useState(0);
  const [fastForward, setFastForward] = useState(false);
  const [lastTargetText, setLastTargetText] = useState('');

  // prefers-reduced-motion 감지
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // CPS 계산
  const cps = useMemo(() => {
    if (!targetText || targetText.length === 0) return MIN_CPS;
    const durationMs = shouldBuyTime ? TARGET_DURATION_MS_WHILE_STREAMING : TARGET_DURATION_MS_IDLE;
    const calculatedCps = targetText.length / (durationMs / 1000);
    return clamp(calculatedCps, MIN_CPS, MAX_CPS);
  }, [targetText, shouldBuyTime]);

  // 틱당 문자 수 계산
  const charsPerTick = useMemo(() => {
    return Math.max(1, Math.round((cps * TYPING_TICK_MS) / 1000));
  }, [cps]);

  // reduced-motion 미디어 쿼리 감지
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 타이핑 대상 텍스트가 변경되면 상태 초기화
  // 외부 데이터(targetText) 변경에 대한 동기화이므로 eslint 규칙 예외 적용
  useEffect(() => {
    if (targetText !== lastTargetText) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 데이터 동기화
      setLastTargetText(targetText);
      setTypedLen(0);
      setFastForward(false);
    }
  }, [targetText, lastTargetText]);

  // 타이핑 루프
  useEffect(() => {
    // reduced-motion이거나 fastForward면 즉시 전체 표시
    const shouldSkipTyping = prefersReducedMotion || fastForward;

    // 이미 완료된 경우
    if (typedLen >= targetText.length) {
      return;
    }

    // 애니메이션 비활성화 시 즉시 완료
    if (shouldSkipTyping) {
      // 다음 프레임에서 상태 업데이트 (렌더링 중 setState 방지)
      const rafId = requestAnimationFrame(() => {
        setTypedLen(targetText.length);
      });
      return () => cancelAnimationFrame(rafId);
    }

    const intervalId = setInterval(() => {
      setTypedLen((prev) => {
        const next = prev + charsPerTick;
        return next >= targetText.length ? targetText.length : next;
      });
    }, TYPING_TICK_MS);

    return () => clearInterval(intervalId);
  }, [targetText, typedLen, charsPerTick, prefersReducedMotion, fastForward]);

  // 표시할 텍스트 계산
  const visibleText = useMemo(() => {
    if (prefersReducedMotion || fastForward) {
      return targetText;
    }
    return targetText.slice(0, typedLen);
  }, [targetText, typedLen, prefersReducedMotion, fastForward]);

  // 타이핑 진행 중인지 여부
  const isTyping = typedLen < targetText.length && !prefersReducedMotion && !fastForward;

  return {
    visibleText,
    isTyping,
    fastForward: () => setFastForward(true),
  };
}

// =============================================================================
// 컴포넌트 구현
// =============================================================================

export function NarrativeFeed({
  entries,
  streamingText,
  isStreaming = false,
  isImageLoading = false,
}: NarrativeFeedProps) {
  const { t } = useTranslation();
  const feedRef = useRef<HTMLDivElement>(null);

  // U-066: 타이핑 대상 텍스트 결정
  // 스트리밍 중이면 streamingText, 아니면 마지막 entries의 텍스트
  const targetText = useMemo(() => {
    if (streamingText) {
      return streamingText;
    }
    if (entries.length > 0) {
      return entries[entries.length - 1].text;
    }
    return '';
  }, [streamingText, entries]);

  // U-066: 시간을 벌어야 하는지 여부 (느린 타이핑)
  const shouldBuyTime = isStreaming || isImageLoading;

  // U-066: 타이핑 효과 훅 사용
  const { visibleText, isTyping, fastForward } = useTypewriter(targetText, shouldBuyTime);

  // U-066: Fast-forward 핸들러
  const handleFastForward = useCallback(() => {
    if (isTyping) {
      fastForward();
    }
  }, [isTyping, fastForward]);

  // U-066: 키보드 이벤트 핸들러
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && isTyping) {
        e.preventDefault();
        fastForward();
      }
    },
    [isTyping, fastForward],
  );

  // 새 엔트리 추가 시 스크롤
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [entries, visibleText]);

  // U-066: 마지막 엔트리 타이핑 중 중복 표시 방지
  // 스트리밍 중이 아닐 때, 마지막 entries와 타이핑 텍스트가 같으면 entries에서 마지막 항목 숨김
  const shouldHideLastEntry = !streamingText && entries.length > 0 && isTyping;

  return (
    <div
      className="narrative-feed"
      ref={feedRef}
      onClick={handleFastForward}
      onKeyDown={handleKeyDown}
      role="log"
      aria-live="polite"
      tabIndex={0}
      title={isTyping ? t('narrative.fast_forward_title') : undefined}
      aria-label={isTyping ? t('narrative.fast_forward_aria') : undefined}
    >
      {entries.map((entry, index) => {
        // U-066: 마지막 엔트리 타이핑 중 숨김 처리
        const isLastEntry = index === entries.length - 1;
        if (shouldHideLastEntry && isLastEntry) {
          return null;
        }

        // U-070: 엔트리 타입에 따른 클래스 및 스타일 결정
        const entryType = entry.type ?? 'narrative';
        const isActionLog = entryType === 'action_log';
        const isSystem = entryType === 'system';
        const entryClassName = [
          'narrative-entry',
          isActionLog && 'action-log-entry',
          isSystem && 'system-entry',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={`${entry.turn}-${index}`} className={entryClassName}>
            {/* U-070: 액션 로그는 ▶ 아이콘 표시, 턴 라벨 숨김 */}
            {isActionLog ? (
              <span className="action-log-icon" aria-hidden="true">
                ▶
              </span>
            ) : (
              <span className="narrative-timestamp">
                {t('narrative.turn_label', { turn: entry.turn })}
              </span>
            )}
            <span className="narrative-text">{entry.text}</span>
          </div>
        );
      })}

      {/* U-066: 타이핑 효과가 적용된 현재 텍스트 */}
      {(streamingText || shouldHideLastEntry) && (
        <div className={`narrative-entry ${streamingText ? 'streaming' : 'typing'}`}>
          <span className="narrative-timestamp">
            {streamingText
              ? t('narrative.streaming_label')
              : t('narrative.turn_label', { turn: entries[entries.length - 1]?.turn ?? 0 })}
          </span>
          <span className="narrative-text">{visibleText}</span>
          {isTyping && <span className="cursor-blink">▌</span>}
        </div>
      )}

      {/* U-086: 이미지 pending 상태 라인
          타이핑이 완료된 후에도 이미지가 아직 생성 중이면 대기 이유를 명확히 표시.
          RULE-002: 게임 로그 시스템 메시지 스타일 (채팅 버블 아님)
          RULE-006: i18n 키 기반 메시지 */}
      {!isTyping && !streamingText && isImageLoading && (
        <div
          className="narrative-entry system-entry image-pending-line"
          role="status"
          aria-live="polite"
        >
          <span className="image-pending-label">{t('narrative.image_pending_label')}</span>
          <span className="image-pending-cursor" aria-hidden="true">
            ▌
          </span>
        </div>
      )}
    </div>
  );
}
