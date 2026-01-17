/**
 * Unknown World - Turn Runner 모듈
 *
 * RU-003-Q3: Turn 실행/스트리밍 결합을 App.tsx에서 분리하여
 * "레이아웃 + 이벤트 라우팅"과 "오케스트레이션"을 명확히 분리합니다.
 *
 * 책임:
 *   - TurnInput 생성 (언어/클릭/드롭/클라이언트 정보/재화 스냅샷)
 *   - 스트림 시작/취소/콜백 라우팅
 *   - agentStore/worldStore로 이벤트 분배
 *
 * 설계 원칙:
 *   - RULE-002: 채팅 앱이 아닌 상태 기반 게임 시스템
 *   - RULE-003/004: 구조화 출력 + 검증/복구
 *   - RULE-006: ko/en i18n 정책 준수
 *
 * @module turn/turnRunner
 */

import type { TurnInput, DropInput } from '../schemas/turn';
import type { HotspotClickData } from '../components/SceneCanvas';
import { getResolvedLanguage } from '../i18n';
import { startTurnStream, type StreamCallbacks } from '../api/turnStream';
import { useAgentStore } from '../stores/agentStore';
import { useWorldStore } from '../stores/worldStore';

// =============================================================================
// 타입 정의
// =============================================================================

/** TurnInput 생성을 위한 파라미터 */
export interface BuildTurnInputParams {
  /** 사용자 입력 텍스트 */
  text: string;
  /** 액션 카드 ID (선택) */
  actionId?: string;
  /** 핫스팟 클릭 데이터 (U-010) */
  click?: HotspotClickData;
  /** 드롭 데이터 (U-012) */
  drop?: DropInput;
  /** 재화 스냅샷 */
  economySnapshot: { signal: number; memory_shard: number };
  /** UI 테마 */
  theme: 'dark' | 'light';
}

/** Turn 실행을 위한 파라미터 (App에서 호출 시 사용) */
export interface RunTurnParams {
  /** 사용자 입력 텍스트 */
  text: string;
  /** 액션 카드 ID (선택) */
  actionId?: string;
  /** 핫스팟 클릭 데이터 (U-010) */
  click?: HotspotClickData;
  /** 드롭 데이터 (U-012) */
  drop?: DropInput;
}

/** Turn Runner 인터페이스 */
export interface TurnRunner {
  /** 턴 실행 (스트림 시작) */
  runTurn: (params: RunTurnParams) => void;
  /** 스트림 취소 */
  cancel: () => void;
}

// =============================================================================
// TurnInput 생성
// =============================================================================

/**
 * TurnInput을 생성합니다.
 *
 * 언어, 클릭, 드롭, 클라이언트 정보, 재화 스냅샷을 조합하여
 * 서버로 전송할 TurnInput을 생성합니다.
 */
export function buildTurnInput(params: BuildTurnInputParams): TurnInput {
  const {
    text,
    actionId,
    click,
    drop,
    economySnapshot,
    theme,
  } = params;

  return {
    language: getResolvedLanguage(),
    text,
    action_id: actionId ?? null,
    // U-010: 핫스팟 클릭 데이터 포함 (Q1: Option B)
    click: click
      ? {
          object_id: click.object_id,
          box_2d: click.box_2d,
        }
      : null,
    // U-012: 아이템 드롭 데이터 포함 (Q1: Option B - target_box_2d 포함)
    drop: drop ?? null,
    client: {
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      theme,
    },
    economy_snapshot: economySnapshot,
  };
}

// =============================================================================
// Turn Runner 생성
// =============================================================================

/**
 * Turn Runner를 생성합니다.
 *
 * RU-003-Q3: App에서 Turn Runner 인스턴스를 생성하여 사용합니다.
 * 스트림 콜백은 agentStore와 worldStore로 라우팅됩니다.
 *
 * @param deps - 의존성 (i18n 번역 함수 등)
 * @returns Turn Runner 인터페이스
 *
 * @example
 * ```tsx
 * // App.tsx에서 사용
 * const runner = useMemo(() => createTurnRunner({
 *   t,
 *   theme: 'dark',
 * }), [t]);
 *
 * runner.runTurn({ text: 'hello' });
 * ```
 */
export function createTurnRunner(deps: {
  /** i18n 번역 함수 */
  t: (key: string, options?: Record<string, unknown>) => string;
  /** UI 테마 */
  theme: 'dark' | 'light';
}): TurnRunner {
  const { t, theme } = deps;

  // 취소 함수 저장
  let cancelFn: (() => void) | null = null;

  /**
   * 턴을 실행합니다.
   */
  const runTurn = (params: RunTurnParams): void => {
    // 스트리밍 중이면 무시
    const isStreaming = useAgentStore.getState().isStreaming;
    if (isStreaming) return;

    // Store 액션 가져오기 (클로저 외부에서 호출 시점에 최신 상태 참조)
    const agentStore = useAgentStore.getState();
    const worldStore = useWorldStore.getState();

    // 재화 스냅샷 가져오기
    const economySnapshot = worldStore.economy;

    // TurnInput 생성
    const turnInput = buildTurnInput({
      text: params.text || (params.actionId ? t('action.card_select', { cardId: params.actionId }) : ''),
      actionId: params.actionId,
      click: params.click,
      drop: params.drop,
      economySnapshot,
      theme,
    });

    // Agent Store 시작
    agentStore.startStream();

    // Scene Canvas를 로딩 상태로 전환 (U-031)
    worldStore.setSceneState({ status: 'loading', message: t('scene.status.syncing') });

    // 스트림 콜백 설정 (RU-003-Q3: agentStore + worldStore로 라우팅)
    const callbacks: StreamCallbacks = {
      // Stage/Badges/NarrativeDelta → agentStore로만 전달
      onStage: (event) => {
        useAgentStore.getState().handleStage(event);
      },
      onBadges: (event) => {
        useAgentStore.getState().handleBadges(event);
      },
      onNarrativeDelta: (event) => {
        useAgentStore.getState().handleNarrativeDelta(event);
      },
      // Final → agentStore.handleFinal + worldStore.applyTurnOutput
      onFinal: (event) => {
        useAgentStore.getState().handleFinal(event);
        // RU-003-Q4: TurnOutput 반영 SSOT
        useWorldStore.getState().applyTurnOutput(event.data);
      },
      // Error → agentStore.handleError + worldStore 상태 복구
      onError: (event) => {
        useAgentStore.getState().handleError(event);
        useWorldStore.getState().setConnected(false);
        // Scene Canvas를 오프라인/에러 상태로 전환 (U-031)
        const errorCode = event.code;
        if (errorCode === 'SAFETY_BLOCKED') {
          useWorldStore.getState().setSceneState({ status: 'blocked', message: event.message });
        } else if (errorCode === 'INSUFFICIENT_BALANCE') {
          useWorldStore.getState().setSceneState({ status: 'low_signal', message: event.message });
        } else {
          useWorldStore.getState().setSceneState({ status: 'offline', message: event.message });
        }
      },
      // Complete → agentStore.completeStream + worldStore 씬 상태 복구
      onComplete: () => {
        useAgentStore.getState().completeStream();
        // Scene Canvas를 기본 상태로 복원 (U-031)
        // TODO: TurnOutput에 scene.imageUrl이 있으면 scene 상태로 전환
        useWorldStore.getState().setSceneState({ status: 'default', message: '' });
      },
    };

    // 스트림 시작
    cancelFn = startTurnStream(turnInput, callbacks);
  };

  /**
   * 스트림을 취소합니다.
   *
   * 추후 Cancel/Pause/Autopilot UX를 위한 기본 골격입니다.
   * 현재 executeTurnStream은 Abort 시 onComplete를 호출하지 않으므로,
   * Cancel 버튼을 넣을 계획이라면 "취소 시 UI 복구 정책"을 별도로 명시해야 합니다.
   */
  const cancel = (): void => {
    cancelFn?.();
    cancelFn = null;
  };

  return {
    runTurn,
    cancel,
  };
}

// =============================================================================
// React Hook (선택적 사용)
// =============================================================================

/**
 * Turn Runner를 React 컴포넌트에서 사용하기 위한 훅.
 *
 * @param deps - 의존성
 * @returns Turn Runner 인터페이스 및 취소 효과
 *
 * @example
 * ```tsx
 * // 컴포넌트에서 사용
 * const { runTurn, cancel } = useTurnRunner({ t, theme: 'dark' });
 * ```
 */
import { useCallback, useEffect, useRef } from 'react';

export function useTurnRunner(deps: {
  t: (key: string, options?: Record<string, unknown>) => string;
  theme: 'dark' | 'light';
}): TurnRunner {
  const { t, theme } = deps;

  // 취소 함수 저장 ref
  const cancelFnRef = useRef<(() => void) | null>(null);

  // runTurn을 useCallback으로 정의
  const runTurn = useCallback(
    (params: RunTurnParams): void => {
      // 스트리밍 중이면 무시
      const isStreaming = useAgentStore.getState().isStreaming;
      if (isStreaming) return;

      // Store 액션 가져오기
      const agentStore = useAgentStore.getState();
      const worldStore = useWorldStore.getState();

      // 재화 스냅샷 가져오기
      const economySnapshot = worldStore.economy;

      // TurnInput 생성
      const turnInput = buildTurnInput({
        text: params.text || (params.actionId ? t('action.card_select', { cardId: params.actionId }) : ''),
        actionId: params.actionId,
        click: params.click,
        drop: params.drop,
        economySnapshot,
        theme,
      });

      // Agent Store 시작
      agentStore.startStream();

      // Scene Canvas를 로딩 상태로 전환 (U-031)
      worldStore.setSceneState({ status: 'loading', message: t('scene.status.syncing') });

      // 스트림 콜백 설정 (RU-003-Q3: agentStore + worldStore로 라우팅)
      const callbacks: StreamCallbacks = {
        onStage: (event) => {
          useAgentStore.getState().handleStage(event);
        },
        onBadges: (event) => {
          useAgentStore.getState().handleBadges(event);
        },
        onNarrativeDelta: (event) => {
          useAgentStore.getState().handleNarrativeDelta(event);
        },
        onFinal: (event) => {
          useAgentStore.getState().handleFinal(event);
          useWorldStore.getState().applyTurnOutput(event.data);
        },
        onError: (event) => {
          useAgentStore.getState().handleError(event);
          useWorldStore.getState().setConnected(false);
          const errorCode = event.code;
          if (errorCode === 'SAFETY_BLOCKED') {
            useWorldStore.getState().setSceneState({ status: 'blocked', message: event.message });
          } else if (errorCode === 'INSUFFICIENT_BALANCE') {
            useWorldStore.getState().setSceneState({ status: 'low_signal', message: event.message });
          } else {
            useWorldStore.getState().setSceneState({ status: 'offline', message: event.message });
          }
        },
        onComplete: () => {
          useAgentStore.getState().completeStream();
          useWorldStore.getState().setSceneState({ status: 'default', message: '' });
        },
      };

      // 스트림 시작 및 취소 함수 저장
      cancelFnRef.current = startTurnStream(turnInput, callbacks);
    },
    [t, theme],
  );

  // cancel 함수
  const cancel = useCallback((): void => {
    cancelFnRef.current?.();
    cancelFnRef.current = null;
  }, []);

  // 컴포넌트 언마운트 시 스트림 취소
  useEffect(() => {
    return () => {
      cancelFnRef.current?.();
    };
  }, []);

  return { runTurn, cancel };
}
