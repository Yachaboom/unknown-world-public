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

import { useCallback, useEffect, useRef } from 'react';
import type { TurnInput, DropInput, Language } from '../schemas/turn';
import type { HotspotClickData } from '../components/SceneCanvas';
import { startTurnStream, type StreamCallbacks } from '../api/turnStream';
import { startImageGeneration, type ImageModelLabel } from '../api/image';
import { useAgentStore } from '../stores/agentStore';
import { useWorldStore } from '../stores/worldStore';
import { selectImageSizing } from '../utils/imageSizing';

// =============================================================================
// U-089: 정밀분석(Agentic Vision) 트리거 감지 상수
// 백엔드 config/models.py VISION_TRIGGER_ACTION_IDS / VISION_TRIGGER_KEYWORDS와 동기화
// =============================================================================

const VISION_TRIGGER_ACTION_IDS = new Set([
  'deep_analyze',
  '정밀분석',
  'analyze_scene',
  'examine_scene',
  'look_closely',
]);

const VISION_TRIGGER_KEYWORDS = [
  '정밀분석',
  '장면 분석',
  '이미지 분석',
  '자세히 보기',
  'analyze scene',
  'deep analyze',
  'look closely',
  'examine scene',
];

/** U-089: 정밀분석 오버레이 최소 표시 시간 (ms) - 깜빡임 방지 */
const ANALYZING_MIN_DISPLAY_MS = 500;

// =============================================================================
// U-124: 사전 생성 이미지 → 백엔드 참조 URL 변환
// =============================================================================

/**
 * 프론트엔드 정적 씬 이미지 URL을 백엔드 참조 이미지 URL로 변환합니다.
 *
 * 표시용 `/ui/scenes/scene-xxx-start.webp` URL을
 * 백엔드 이미지 서비스가 인식하는 `/api/image/file/scene-xxx-start` 형식으로 변환합니다.
 * 이를 통해 첫 턴에서 사전 생성 이미지를 Gemini 참조 이미지로 전달하여
 * 시각적 연속성을 유지합니다.
 *
 * 런타임 생성 이미지 URL(/api/image/file/... 또는 http://...)은 그대로 반환합니다.
 */
function toBackendReferenceUrl(displayUrl: string | undefined | null): string | undefined {
  if (!displayUrl) return undefined;
  // /ui/scenes/scene-narrator-start.webp → /api/image/file/scene-narrator-start
  const match = displayUrl.match(/^\/ui\/scenes\/(.+)\.\w+$/);
  if (match) {
    return `/api/image/file/${match[1]}`;
  }
  return displayUrl;
}

/**
 * U-089: 정밀분석(Agentic Vision) 트리거 여부를 판단합니다.
 * 백엔드의 ModelConfig.is_vision_trigger()와 동일한 로직입니다.
 */
function isVisionTrigger(actionId?: string, text?: string): boolean {
  if (actionId && VISION_TRIGGER_ACTION_IDS.has(actionId)) return true;
  if (text) {
    const textLower = text.toLowerCase();
    for (const keyword of VISION_TRIGGER_KEYWORDS) {
      if (textLower.includes(keyword.toLowerCase())) return true;
    }
  }
  return false;
}

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
  /** U-044: 세션 언어 (외부 주입, SSOT) */
  language: Language;
  /** U-068: 이전 턴 이미지 URL (참조 이미지로 사용) */
  previousImageUrl?: string | null;
  /** U-133: 첫 턴 씬 설명 맥락 (사전 생성 이미지의 시각적 요소 기술) */
  sceneContext?: string | null;
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
 * U-044: 언어는 외부에서 주입받아 SSOT 유지 (getResolvedLanguage() 직접 호출 제거).
 * 클릭, 드롭, 클라이언트 정보, 재화 스냅샷을 조합하여
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
    language,
    previousImageUrl,
    sceneContext,
  } = params;

  return {
    language,
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
    // U-068: 이전 턴 이미지 URL (참조 이미지로 사용하여 연속성 유지)
    previous_image_url: previousImageUrl ?? null,
    // U-133: 첫 턴 씬 설명 맥락 (사전 생성 이미지의 시각적 요소를 GM에 전달)
    scene_context: sceneContext ?? null,
  };
}

// =============================================================================
// Turn Runner 생성
// =============================================================================

/**
 * Turn Runner를 생성합니다.
 *
 * RU-003-Q3: App에서 Turn Runner 인스턴스를 생성하여 사용합니다.
 * U-044: 세션 언어를 외부에서 주입받아 TurnInput 생성 시 SSOT 유지.
 * 스트림 콜백은 agentStore와 worldStore로 라우팅됩니다.
 *
 * @param deps - 의존성 (i18n 번역 함수, 테마, 세션 언어)
 * @returns Turn Runner 인터페이스
 *
 * @example
 * ```tsx
 * // App.tsx에서 사용
 * const runner = useMemo(() => createTurnRunner({
 *   t,
 *   theme: 'dark',
 *   language: sessionLanguage, // U-044: 세션 언어 SSOT
 * }), [t, sessionLanguage]);
 *
 * runner.runTurn({ text: 'hello' });
 * ```
 */
export function createTurnRunner(deps: {
  /** i18n 번역 함수 */
  t: (key: string, options?: Record<string, unknown>) => string;
  /** UI 테마 */
  theme: 'dark' | 'light';
  /** U-044: 세션 언어 (SSOT) */
  language: Language;
}): TurnRunner {
  const { t, theme, language } = deps;

  // 취소 함수 저장
  let cancelFn: (() => void) | null = null;

  // U-066: 이미지 잡 AbortController
  let imageJobController: AbortController | null = null;

  // U-080: 이미지 생성 요청 중복 방지 (StrictMode 대응)
  let imageJobPending = false;

  // U-097: onFinal에서 보관한 이미지 잡 (onComplete에서 실행)
  let pendingImageJob: { should_generate: boolean; prompt: string; model_label?: string } | null =
    null;

  // U-089: 정밀분석 오버레이 최소 표시 시간 관리
  let analyzingStartTime = 0;

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

    // U-089: 정밀분석 트리거 감지
    const visionAnalysis = isVisionTrigger(params.actionId, params.text);

    /**
     * U-089: 분석 상태를 해제합니다.
     * 최소 표시 시간(500ms)을 보장하여 오버레이 깜빡임을 방지합니다.
     */
    const finishAnalyzing = () => {
      const elapsed = Date.now() - analyzingStartTime;
      const remaining = ANALYZING_MIN_DISPLAY_MS - elapsed;
      if (remaining > 0) {
        setTimeout(() => {
          useWorldStore.getState().setIsAnalyzing(false);
        }, remaining);
      } else {
        useWorldStore.getState().setIsAnalyzing(false);
      }
    };

    // 재화 스냅샷 가져오기
    // U-097: credit 필드는 EconomyOutput 전용이므로 입력 스냅샷에서 제외
    // (백엔드 EconomySnapshot은 extra="forbid"로 설정됨)
    const { signal, memory_shard } = worldStore.economy;
    const economySnapshot = { signal, memory_shard };

    // U-068: 이전 이미지 URL 가져오기 (참조 이미지로 사용)
    // U-124: 사전 생성 정적 이미지 URL을 백엔드 참조 형식으로 변환
    const previousImageUrl = toBackendReferenceUrl(
      worldStore.sceneState.imageUrl ?? worldStore.sceneState.previousImageUrl,
    );

    // U-133: 첫 턴(turnCount===0)에서 씬 설명 맥락을 주입
    let sceneContext: string | null = null;
    if (worldStore.turnCount === 0 && worldStore.initialSceneDescription) {
      sceneContext = worldStore.initialSceneDescription;
    }

    // TurnInput 생성 (U-044: 주입된 세션 언어 사용)
    const turnInput = buildTurnInput({
      text:
        params.text ||
        (params.actionId ? t('action.card_select', { cardId: params.actionId }) : ''),
      actionId: params.actionId,
      click: params.click,
      drop: params.drop,
      economySnapshot,
      theme,
      language,
      previousImageUrl,
      sceneContext,
    });

    // Agent Store 시작
    agentStore.startStream();

    // U-089: 정밀분석 시 isAnalyzing 활성화 (기존 이미지 유지 + 분석 오버레이)
    if (visionAnalysis) {
      worldStore.setIsAnalyzing(true);
      analyzingStartTime = Date.now();
    }

    // U-071: 처리 단계를 'processing'으로 전환
    worldStore.setProcessingPhase('processing');

    // U-089: 정밀분석 시 Scene 상태를 변경하지 않음 (기존 이미지 유지)
    // 일반 턴: Scene Canvas를 로딩 상태로 전환 (U-031)
    if (!visionAnalysis) {
      worldStore.setSceneState({ status: 'loading', message: t('scene.status.syncing') });
    }

    // 스트림 콜백 설정 (RU-003-Q3: agentStore + worldStore로 라우팅)
    // RU-003-T1: sceneState 전이는 worldStore.applyTurnOutput에서 SSOT로 처리
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
      // U-097: onFinal에서는 텍스트/상태만 반영. 이미지 생성은 onComplete 이후에 시작.
      //   스트리밍 순서: narrative_delta × N → final → (스트림 종료) → onComplete
      //   onComplete에서 narrativeBuffer 초기화 후, 이미지 생성을 별도 시작.
      //   이렇게 하면 사용자가 narrative_delta를 실시간으로 본 후, final로 entries에 확정,
      //   그 다음에 이미지 생성이 시작되므로 text-first delivery가 보장됨.
      onFinal: (event) => {
        // U-097: 이미지 잡 정보를 보관 (onComplete에서 사용)
        pendingImageJob = event.data.render?.image_job ?? null;

        useAgentStore.getState().handleFinal(event);
        // U-071: 결과 렌더링 단계로 전환
        useWorldStore.getState().setProcessingPhase('rendering');
        // RU-003-Q4: TurnOutput 반영 SSOT
        useWorldStore.getState().applyTurnOutput(event.data);
        // RU-003-S1: 성공적인 final 수신 시 연결 상태 낙관적 복구
        useWorldStore.getState().setConnected(true);
      },
      // Error → agentStore.handleError + worldStore 상태 복구
      onError: (event) => {
        useAgentStore.getState().handleError(event);

        // U-130: RATE_LIMITED 에러 시 scene/연결 상태 유지 (재시도 안내 UI만 표시)
        if (event.code === 'RATE_LIMITED') {
          useWorldStore.getState().setProcessingPhase('idle');
          if (visionAnalysis) {
            finishAnalyzing();
          }
          return;
        }

        useWorldStore.getState().setConnected(false);
        // U-071: 에러 시 idle로 전환
        useWorldStore.getState().setProcessingPhase('idle');
        // U-089: 에러 시 분석 상태 해제 (최소 표시 시간 적용)
        if (visionAnalysis) {
          finishAnalyzing();
        }
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
      // Complete → U-097: 이미지 생성 시작 (text-first delivery)
      // 이 시점에서 narrative_delta 스트리밍이 모두 끝나고 final이 처리된 상태.
      // narrativeBuffer가 비워지고, entries에 텍스트가 확정된 이후에 이미지 생성을 시작한다.
      // U-087: 이미지 잡이 있으면 completeStream()을 이미지 완료까지 지연하여
      //   Agent Console 대기열에서 Render 단계가 "진행 중(◎)"으로 유지되도록 한다.
      onComplete: () => {
        // U-089: 턴 완료 시 분석 상태 해제 (최소 표시 시간 적용)
        if (visionAnalysis) {
          finishAnalyzing();
        }

        // U-097: 이미지 잡이 있으면 이 시점에서 비동기 생성 시작 (text-first delivery)
        const job = pendingImageJob;
        pendingImageJob = null;

        if (job?.should_generate && job.prompt) {
          // U-080: StrictMode 대응 - 중복 요청 방지
          if (imageJobPending) {
            useAgentStore.getState().completeStream();
            useWorldStore.getState().setProcessingPhase('idle');
            return;
          }
          imageJobPending = true;

          // U-087: Render 단계를 다시 in_progress로 설정 (이미지 렌더링 진행 표시)
          useAgentStore.getState().handleStage({
            type: 'stage',
            name: 'render',
            status: 'start',
          });

          // U-071: 이미지 생성 대기 단계로 전환
          useWorldStore.getState().setProcessingPhase('image_pending');

          const worldStore = useWorldStore.getState();
          const currentTurnId = worldStore.turnCount;

          // U-068: 이전 장면 이미지 URL 가져오기 (참조 이미지로 사용)
          // U-124: 사전 생성 정적 이미지 URL을 백엔드 참조 형식으로 변환
          const previousImageUrl = toBackendReferenceUrl(
            worldStore.sceneState.imageUrl ?? worldStore.sceneState.previousImageUrl,
          );

          // 이전 이미지 잡 취소
          imageJobController?.abort();

          // 이미지 로딩 상태로 전환
          worldStore.setImageLoading(currentTurnId);

          // 모델 라벨 결정
          const modelLabel: ImageModelLabel = job.model_label === 'FAST' ? 'FAST' : 'QUALITY';

          // U-085: Scene Canvas 크기 기반 aspect_ratio/image_size 선택
          const { width: cw, height: ch } = worldStore.sceneCanvasSize;
          const sizing = selectImageSizing(cw, ch);

          // 이미지 생성 시작
          imageJobController = startImageGeneration(
            {
              prompt: job.prompt,
              language,
              aspectRatio: sizing.aspectRatio,
              imageSize: sizing.imageSize,
              modelLabel,
              turnId: currentTurnId,
              referenceImageUrl: previousImageUrl,
            },
            (response) => {
              imageJobPending = false;
              if (response.success && response.imageUrl && response.turnId !== undefined) {
                useWorldStore.getState().applyLateBindingImage(response.imageUrl, response.turnId);
              } else {
                useWorldStore.getState().cancelImageLoading();
              }
              // U-087: Render 단계 완료 후 스트림 종료
              useAgentStore.getState().handleStage({
                type: 'stage',
                name: 'render',
                status: 'complete',
              });
              useAgentStore.getState().completeStream();
              useWorldStore.getState().setProcessingPhase('idle');
            },
            () => {
              imageJobPending = false;
              useWorldStore.getState().cancelImageLoading();
              // U-087: 이미지 생성 실패 시에도 Render 단계 완료 + 스트림 종료
              useAgentStore.getState().handleStage({
                type: 'stage',
                name: 'render',
                status: 'complete',
              });
              useAgentStore.getState().completeStream();
              useWorldStore.getState().setProcessingPhase('idle');
            },
          );
        } else {
          // 이미지 잡이 없으면 바로 스트림 종료 + idle
          useAgentStore.getState().completeStream();
          useWorldStore.getState().setProcessingPhase('idle');
        }
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
 * U-044: 세션 언어를 외부에서 주입받아 TurnInput 생성 시 SSOT 유지.
 *
 * @param deps - 의존성 (i18n 번역 함수, 테마, 세션 언어)
 * @returns Turn Runner 인터페이스 및 취소 효과
 *
 * @example
 * ```tsx
 * // 컴포넌트에서 사용
 * const { runTurn, cancel } = useTurnRunner({
 *   t,
 *   theme: 'dark',
 *   language: sessionLanguage, // U-044: 세션 언어 SSOT
 * });
 * ```
 */

export function useTurnRunner(deps: {
  t: (key: string, options?: Record<string, unknown>) => string;
  theme: 'dark' | 'light';
  /** U-044: 세션 언어 (SSOT) */
  language: Language;
}): TurnRunner {
  const { t, theme, language } = deps;

  // 취소 함수 저장 ref
  const cancelFnRef = useRef<(() => void) | null>(null);

  // U-066: 이미지 잡 AbortController ref
  const imageJobControllerRef = useRef<AbortController | null>(null);

  // U-080: 이미지 생성 요청 중복 방지 (StrictMode 대응)
  const imageJobPendingRef = useRef<boolean>(false);

  // U-097: text-first delivery - 이미지 잡을 onFinal에서 보관, onComplete에서 실행
  const pendingImageJobRef = useRef<{
    should_generate: boolean;
    prompt: string;
    model_label?: string;
  } | null>(null);

  // U-089: 정밀분석 오버레이 최소 표시 시간 관리
  const analyzingStartTimeRef = useRef<number>(0);

  // runTurn을 useCallback으로 정의
  const runTurn = useCallback(
    (params: RunTurnParams): void => {
      // 스트리밍 중이면 무시
      const isStreaming = useAgentStore.getState().isStreaming;
      if (isStreaming) return;

      // Store 액션 가져오기
      const agentStore = useAgentStore.getState();
      const worldStore = useWorldStore.getState();

      // U-089: 정밀분석 트리거 감지
      const visionAnalysis = isVisionTrigger(params.actionId, params.text);

      /**
       * U-089: 분석 상태를 해제합니다.
       * 최소 표시 시간(500ms)을 보장하여 오버레이 깜빡임을 방지합니다.
       */
      const finishAnalyzing = () => {
        const elapsed = Date.now() - analyzingStartTimeRef.current;
        const remaining = ANALYZING_MIN_DISPLAY_MS - elapsed;
        if (remaining > 0) {
          setTimeout(() => {
            useWorldStore.getState().setIsAnalyzing(false);
          }, remaining);
        } else {
          useWorldStore.getState().setIsAnalyzing(false);
        }
      };

      // 재화 스냅샷 가져오기
      // U-097: credit 필드는 EconomyOutput 전용이므로 입력 스냅샷에서 제외
      // (백엔드 EconomySnapshot은 extra="forbid"로 설정됨)
      const { signal, memory_shard } = worldStore.economy;
      const economySnapshot = { signal, memory_shard };

      // U-068: 이전 이미지 URL 가져오기 (참조 이미지로 사용)
      // U-124: 사전 생성 정적 이미지 URL을 백엔드 참조 형식으로 변환
      const previousImageUrl = toBackendReferenceUrl(
        worldStore.sceneState.imageUrl ?? worldStore.sceneState.previousImageUrl,
      );

      // U-133: 첫 턴(turnCount===0)에서 씬 설명 맥락을 주입
      let sceneContext: string | null = null;
      if (worldStore.turnCount === 0 && worldStore.initialSceneDescription) {
        sceneContext = worldStore.initialSceneDescription;
      }

      // TurnInput 생성 (U-044: 주입된 세션 언어 사용)
      const turnInput = buildTurnInput({
        text:
          params.text ||
          (params.actionId ? t('action.card_select', { cardId: params.actionId }) : ''),
        actionId: params.actionId,
        click: params.click,
        drop: params.drop,
        economySnapshot,
        theme,
        language,
        previousImageUrl,
        sceneContext,
      });

      // Agent Store 시작
      agentStore.startStream();

      // U-089: 정밀분석 시 isAnalyzing 활성화 (기존 이미지 유지 + 분석 오버레이)
      if (visionAnalysis) {
        worldStore.setIsAnalyzing(true);
        analyzingStartTimeRef.current = Date.now();
      }

      // U-071: 처리 단계를 'processing'으로 전환
      worldStore.setProcessingPhase('processing');

      // U-089: 정밀분석 시 Scene 상태를 변경하지 않음 (기존 이미지 유지)
      // 일반 턴: Scene Canvas를 로딩 상태로 전환 (U-031)
      if (!visionAnalysis) {
        worldStore.setSceneState({ status: 'loading', message: t('scene.status.syncing') });
      }

      // 스트림 콜백 설정 (RU-003-Q3: agentStore + worldStore로 라우팅)
      // RU-003-T1: sceneState 전이는 worldStore.applyTurnOutput에서 SSOT로 처리
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
        // U-097: onFinal에서는 텍스트/상태만 반영. 이미지 생성은 onComplete에서 시작.
        onFinal: (event) => {
          pendingImageJobRef.current = event.data.render?.image_job ?? null;

          useAgentStore.getState().handleFinal(event);
          useWorldStore.getState().setProcessingPhase('rendering');
          useWorldStore.getState().applyTurnOutput(event.data);
          useWorldStore.getState().setConnected(true);
        },
        onError: (event) => {
          useAgentStore.getState().handleError(event);

          // U-130: RATE_LIMITED 에러 시 scene/연결 상태 유지 (재시도 안내 UI만 표시)
          if (event.code === 'RATE_LIMITED') {
            useWorldStore.getState().setProcessingPhase('idle');
            if (visionAnalysis) {
              finishAnalyzing();
            }
            return;
          }

          useWorldStore.getState().setConnected(false);
          useWorldStore.getState().setProcessingPhase('idle');
          if (visionAnalysis) {
            finishAnalyzing();
          }
          const errorCode = event.code;
          if (errorCode === 'SAFETY_BLOCKED') {
            useWorldStore.getState().setSceneState({ status: 'blocked', message: event.message });
          } else if (errorCode === 'INSUFFICIENT_BALANCE') {
            useWorldStore
              .getState()
              .setSceneState({ status: 'low_signal', message: event.message });
          } else {
            useWorldStore.getState().setSceneState({ status: 'offline', message: event.message });
          }
        },
        // U-097: onComplete에서 이미지 생성 시작 (text-first delivery)
        // 이 시점에서 narrative_delta 스트리밍 + final 처리가 모두 완료된 상태.
        // U-087: 이미지 잡이 있으면 completeStream()을 이미지 완료까지 지연하여
        //   Agent Console 대기열에서 Render 단계가 "진행 중(◎)"으로 유지되도록 한다.
        onComplete: () => {
          if (visionAnalysis) {
            finishAnalyzing();
          }

          // U-097: 이미지 잡이 있으면 이 시점에서 비동기 생성 시작
          const job = pendingImageJobRef.current;
          pendingImageJobRef.current = null;

          if (job?.should_generate && job.prompt) {
            if (imageJobPendingRef.current) {
              useAgentStore.getState().completeStream();
              useWorldStore.getState().setProcessingPhase('idle');
              return;
            }
            imageJobPendingRef.current = true;

            // U-087: Render 단계를 다시 in_progress로 설정 (이미지 렌더링 진행 표시)
            useAgentStore.getState().handleStage({
              type: 'stage',
              name: 'render',
              status: 'start',
            });

            useWorldStore.getState().setProcessingPhase('image_pending');

            const worldStore = useWorldStore.getState();
            const currentTurnId = worldStore.turnCount;
            // U-124: 사전 생성 정적 이미지 URL을 백엔드 참조 형식으로 변환
            const previousImageUrl = toBackendReferenceUrl(
              worldStore.sceneState.imageUrl ?? worldStore.sceneState.previousImageUrl,
            );

            imageJobControllerRef.current?.abort();
            worldStore.setImageLoading(currentTurnId);

            const modelLabel: ImageModelLabel = job.model_label === 'FAST' ? 'FAST' : 'QUALITY';
            const { width: cw, height: ch } = worldStore.sceneCanvasSize;
            const sizing = selectImageSizing(cw, ch);

            imageJobControllerRef.current = startImageGeneration(
              {
                prompt: job.prompt,
                language,
                aspectRatio: sizing.aspectRatio,
                imageSize: sizing.imageSize,
                modelLabel,
                turnId: currentTurnId,
                referenceImageUrl: previousImageUrl,
              },
              (response) => {
                imageJobPendingRef.current = false;
                if (response.success && response.imageUrl && response.turnId !== undefined) {
                  useWorldStore
                    .getState()
                    .applyLateBindingImage(response.imageUrl, response.turnId);
                } else {
                  useWorldStore.getState().cancelImageLoading();
                }
                // U-087: Render 단계 완료 후 스트림 종료
                useAgentStore.getState().handleStage({
                  type: 'stage',
                  name: 'render',
                  status: 'complete',
                });
                useAgentStore.getState().completeStream();
                useWorldStore.getState().setProcessingPhase('idle');
              },
              () => {
                imageJobPendingRef.current = false;
                useWorldStore.getState().cancelImageLoading();
                // U-087: 이미지 생성 실패 시에도 Render 단계 완료 + 스트림 종료
                useAgentStore.getState().handleStage({
                  type: 'stage',
                  name: 'render',
                  status: 'complete',
                });
                useAgentStore.getState().completeStream();
                useWorldStore.getState().setProcessingPhase('idle');
              },
            );
          } else {
            // 이미지 잡이 없으면 바로 스트림 종료 + idle
            useAgentStore.getState().completeStream();
            useWorldStore.getState().setProcessingPhase('idle');
          }
        },
      };

      // 스트림 시작 및 취소 함수 저장
      cancelFnRef.current = startTurnStream(turnInput, callbacks);
    },
    [t, theme, language],
  );

  // cancel 함수
  const cancel = useCallback((): void => {
    cancelFnRef.current?.();
    cancelFnRef.current = null;
  }, []);

  // 컴포넌트 언마운트 시 스트림 및 이미지 잡 취소
  useEffect(() => {
    return () => {
      cancelFnRef.current?.();
      imageJobControllerRef.current?.abort();
    };
  }, []);

  return { runTurn, cancel };
}
