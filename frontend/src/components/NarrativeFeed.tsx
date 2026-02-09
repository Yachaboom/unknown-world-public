/**
 * Unknown World - NarrativeFeed 컴포넌트 (U-066 + U-086: 텍스트 우선 타이핑 출력)
 *
 * 내러티브 텍스트에 타이핑(Typewriter) 효과를 적용하여,
 * 이미지 생성 지연을 자연스럽게 흡수합니다.
 *
 * 설계 원칙 (U-086 + streaming buffering):
 *   - 스트리밍 중: useStreamingTypewriter로 서버 속도와 무관하게 ~12초에 걸쳐 점진 출력
 *   - 스트리밍 종료 후: useTypewriter로 entries 텍스트 이어서 타이핑
 *   - 이미지 생성 중(isImageLoading): 느린 타이핑 속도
 *   - 타이핑 완료 후에도 이미지 미도착 시: "이미지 형성 중…" 상태 라인 표시
 *   - fast-forward 없음: 항상 점진 출력
 *   - 접근성: prefers-reduced-motion 설정 존중
 *
 * @module components/NarrativeFeed
 */

import { useEffect, useRef, useState, useMemo, memo } from 'react';
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
// 커스텀 훅: useStreamingTypewriter (스트리밍 텍스트 버퍼링)
// =============================================================================

/**
 * 스트리밍 중인 텍스트를 점진적으로 표시하는 훅.
 *
 * 서버에서 narrative_delta가 빠르게 도착해도 화면에는 CPS 제한에 따라
 * 천천히 표시되어 이미지 생성 시간(~10초)을 자연스럽게 흡수합니다.
 * fast-forward 기능 없음 — 항상 점진 출력.
 *
 * @param streamingText - 서버에서 누적된 스트리밍 텍스트 (빈 문자열이면 비활성)
 * @returns displayedText, displayedLen, isTyping
 */
function useStreamingTypewriter(streamingText: string) {
  const [displayedLen, setDisplayedLen] = useState(0);

  // prefers-reduced-motion 감지
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 새로운 스트리밍이 시작될 때만 displayedLen 리셋
  const [prevStreaming, setPrevStreaming] = useState(streamingText);
  if (streamingText && !prevStreaming) {
    setPrevStreaming(streamingText);
    setDisplayedLen(0);
  } else if (streamingText !== prevStreaming) {
    setPrevStreaming(streamingText);
  }

  // CPS 계산: 현재 버퍼 길이 기준으로 목표 시간에 맞춤
  const charsPerTick = useMemo(() => {
    if (!streamingText || streamingText.length === 0) return 1;
    const cps = clamp(
      streamingText.length / (TARGET_DURATION_MS_WHILE_STREAMING / 1000),
      MIN_CPS,
      MAX_CPS,
    );
    return Math.max(1, Math.round((cps * TYPING_TICK_MS) / 1000));
  }, [streamingText]);

  // 타이핑 루프
  useEffect(() => {
    if (!streamingText || prefersReducedMotion) return;
    if (displayedLen >= streamingText.length) return;

    const intervalId = setInterval(() => {
      setDisplayedLen((prev) => {
        const next = prev + charsPerTick;
        return next >= streamingText.length ? streamingText.length : next;
      });
    }, TYPING_TICK_MS);

    return () => clearInterval(intervalId);
  }, [streamingText, displayedLen, charsPerTick, prefersReducedMotion]);

  const displayedText = useMemo(() => {
    if (!streamingText) return '';
    if (prefersReducedMotion) return streamingText;
    return streamingText.slice(0, displayedLen);
  }, [streamingText, displayedLen, prefersReducedMotion]);

  const isTyping = !!streamingText && displayedLen < streamingText.length && !prefersReducedMotion;

  return { displayedText, displayedLen, isTyping };
}

// =============================================================================
// 커스텀 훅: useTypewriter (U-066)
// =============================================================================

/**
 * 타이핑 효과를 위한 커스텀 훅
 *
 * @param targetText - 타이핑 대상 텍스트
 * @param shouldBuyTime - 느린 타이핑 모드 사용 여부
 * @param initialLength - 이미 표시된 문자 수 (스트리밍 후 전환 시 재타이핑 방지, U-097)
 * @returns 타이핑 상태 및 제어 함수
 */
function useTypewriter(targetText: string, shouldBuyTime: boolean, initialLength: number = 0) {
  const [typedLen, setTypedLen] = useState(0);
  const [lastTargetText, setLastTargetText] = useState(targetText);

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
  // U-097: initialLength가 있으면 이미 표시된 위치부터 시작 (스트리밍→entries 전환 시 플래시 방지)
  if (targetText !== lastTargetText) {
    setLastTargetText(targetText);
    const startPos = initialLength > 0 ? Math.min(initialLength, targetText.length) : 0;
    setTypedLen(startPos);
  }

  // 타이핑 루프
  useEffect(() => {
    // 이미 완료된 경우
    if (typedLen >= targetText.length) {
      return;
    }

    // reduced-motion이면 즉시 완료
    if (prefersReducedMotion) {
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
  }, [targetText, typedLen, charsPerTick, prefersReducedMotion]);

  // 표시할 텍스트 계산
  const visibleText = useMemo(() => {
    if (prefersReducedMotion) {
      return targetText;
    }
    return targetText.slice(0, typedLen);
  }, [targetText, typedLen, prefersReducedMotion]);

  // 타이핑 진행 중인지 여부
  const isTyping = typedLen < targetText.length && !prefersReducedMotion;

  return {
    visibleText,
    isTyping,
  };
}

// =============================================================================
// 컴포넌트 구현
// =============================================================================

export const NarrativeFeed = memo(function NarrativeFeed({
  entries,
  streamingText,
  isStreaming: _isStreaming = false, // U-097: prop 유지 (향후 사용 가능, API 호환성)
  isImageLoading = false,
}: NarrativeFeedProps) {
  const { t } = useTranslation();
  const feedRef = useRef<HTMLDivElement>(null);

  // 스트리밍 텍스트 버퍼링 타이프라이터
  const {
    displayedText: streamingDisplayedText,
    displayedLen: streamingDisplayedLen,
    isTyping: isStreamTyping,
  } = useStreamingTypewriter(streamingText);

  // U-097: 스트리밍에서 실제 화면에 표시된 길이를 추적 (스트리밍→entries 전환 시 재타이핑 방지)
  const [initialLength, setInitialLength] = useState(0);

  // 스트리밍 종료 감지 및 initialLength 설정
  const [prevStreamingForInit, setPrevStreamingForInit] = useState(streamingText);
  if (streamingText !== prevStreamingForInit) {
    setPrevStreamingForInit(streamingText);
    if (!streamingText && streamingDisplayedLen > 0) {
      setInitialLength(streamingDisplayedLen);
    }
  }

  // U-097: typewriter 대상 텍스트 결정
  // 스트리밍 중: typewriter 사용하지 않음 (streamingText를 직접 표시)
  // 스트리밍 종료 후: entries의 마지막 텍스트를 typewriter 대상으로 설정
  const typewriterTarget = useMemo(() => {
    if (streamingText) return ''; // 스트리밍 중엔 typewriter 불필요
    if (entries.length > 0) return entries[entries.length - 1].text;
    return '';
  }, [streamingText, entries]);

  // U-097: initialLength가 사용된 후 리셋 (다음 턴에 영향 방지)
  useEffect(() => {
    if (initialLength > 0 && typewriterTarget) {
      // typewriter가 initialLength를 참조한 후 다음 렌더에서 리셋
      const raf = requestAnimationFrame(() => setInitialLength(0));
      return () => cancelAnimationFrame(raf);
    }
  }, [initialLength, typewriterTarget]);

  // U-066: 시간을 벌어야 하는지 여부 (느린 타이핑)
  const shouldBuyTime = isImageLoading;

  // U-066: 타이핑 효과 훅 (스트리밍 중에는 빈 문자열이므로 비활성)
  const { visibleText, isTyping } = useTypewriter(typewriterTarget, shouldBuyTime, initialLength);

  // 새 엔트리 추가 시 스크롤 (스트리밍 표시 텍스트 변경 시에도 스크롤)
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [entries, visibleText, streamingDisplayedText]);

  // U-066: 마지막 엔트리 타이핑 중 중복 표시 방지
  const shouldHideLastEntry = !streamingText && entries.length > 0 && isTyping;

  // U-097: 활성 텍스트 영역 표시 여부
  // 스트리밍 중이거나 타이핑 중일 때 활성 텍스트 영역을 표시
  const showActiveTextArea = !!streamingText || shouldHideLastEntry;

  return (
    <div className="narrative-feed" ref={feedRef} role="log" aria-live="polite">
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
        // U-125: 이전 턴 vs 현재 턴 시각 계층 구분
        // - 유휴 상태(showActiveTextArea=false)이고 마지막 엔트리 → 현재 턴으로 밝게 유지
        // - 그 외 → 이전 턴으로 약화 (past-entry)
        const isCurrentIdleTurn = isLastEntry && !showActiveTextArea;
        const entryClassName = [
          'narrative-entry',
          isCurrentIdleTurn ? 'narrative-active-text' : 'past-entry',
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

      {/* U-097: 활성 텍스트 영역 - 스트리밍 실시간 출력 또는 타이핑 효과 */}
      {/* U-125: narrative-active-text 클래스로 현재 턴 강조 유지 */}
      {showActiveTextArea && (
        <div
          className={`narrative-entry narrative-active-text ${streamingText ? 'streaming' : 'typing'}`}
        >
          <span className="narrative-timestamp">
            {streamingText
              ? t('narrative.streaming_label')
              : t('narrative.turn_label', { turn: entries[entries.length - 1]?.turn ?? 0 })}
          </span>
          {/* 스트리밍 중 → 버퍼링된 텍스트 점진 표시, 아니면 → typewriter 결과 */}
          <span className="narrative-text">{streamingDisplayedText || visibleText}</span>
          {(isStreamTyping || isTyping) && <span className="cursor-blink">▌</span>}
        </div>
      )}

      {/* U-086: 이미지 pending 상태 라인
          타이핑이 완료된 후에도 이미지가 아직 생성 중이면 대기 이유를 명확히 표시.
          RULE-002: 게임 로그 시스템 메시지 스타일 (채팅 버블 아님)
          RULE-006: i18n 키 기반 메시지 */}
      {!isTyping && !isStreamTyping && !streamingText && isImageLoading && (
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
});
