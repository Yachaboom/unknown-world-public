/**
 * Unknown World - 메인 게임 UI 레이아웃
 *
 * RULE-002 준수: 채팅 버블 UI 금지
 * - 내러티브는 "채팅"이 아니라 "게임 로그/내러티브 피드" 형태
 * - 고정 패널: Scene Canvas, Action Deck, Inventory, Quest,
 *   Rule Board, Economy HUD, Agent Console, Scanner Slot
 *
 * RULE-008: Agent Console에서 단계/배지/복구만 표시 (프롬프트 노출 금지)
 *
 * RU-003-Q4: App.tsx는 "레이아웃 + 이벤트 라우팅"에 집중
 * - 세션/월드 상태는 worldStore로 이동
 * - TurnOutput 반영은 worldStore.applyTurnOutput으로 단일화
 *
 * RU-004-Q4: 세션 라이프사이클 SSOT
 * - 세션 초기화/복원/리셋/변경은 sessionLifecycle 모듈로 단일화
 * - App.tsx는 세션 API 호출 + UI 전환만 담당
 *
 * U-015[Mvp]: SaveGame + Reset + Demo Profiles
 * - 프로필 선택 화면 → 게임 시작 플로우
 * - 리셋 버튼으로 프로필 초기 상태로 복구
 * - localStorage 기반 세이브/로드
 *
 * @see vibe/ref/frontend-style-guide.md
 * @see vibe/prd.md 6.7/6.8/9장
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import { Panel } from './components/Panel';
import { GameHeader } from './components/GameHeader';
import { NarrativeFeed } from './components/NarrativeFeed';
import { AgentConsole } from './components/AgentConsole';
import { EconomyHud } from './components/EconomyHud';
import { SceneCanvas, type HotspotClickData } from './components/SceneCanvas';
import { ActionDeck } from './components/ActionDeck';
import { InventoryPanel } from './components/InventoryPanel';
// U-013: Quest + Rule Board + Mutation Timeline
import { QuestPanel } from './components/QuestPanel';
// U-078: Objective Tracker (미니 트래커)
import { ObjectiveTracker } from './components/ObjectiveTracker';
import { RuleBoard } from './components/RuleBoard';
import { MutationTimeline } from './components/MutationTimeline';
// U-022: Scanner Slot
import { ScannerSlot } from './components/ScannerSlot';
// U-015: SaveGame + Demo Profiles
import { DemoProfileSelect } from './components/DemoProfileSelect';
import { ResetButton, ChangeProfileButton } from './components/ResetButton';
// U-117: OnboardingGuide 제거 (온보딩 팝업 삭제, hover 힌트는 유지)
import { useAgentStore } from './stores/agentStore';
import { useInventoryStore, selectItemCount } from './stores/inventoryStore';
import { useUIPrefsStore, applyUIPrefsToDOM } from './stores/uiPrefsStore';
import { useWorldStore } from './stores/worldStore';
import { useTurnRunner, type RunTurnParams } from './turn/turnRunner';
import type { ActionCard, DropInput } from './schemas/turn';
import { RateLimitPanel } from './components/RateLimitPanel';
import { getCurrentThemeFromDOM } from './demo/demoFixtures';
import { isInventoryDragData, isHotspotDropData } from './dnd/types';
// U-117: initializeOnboarding 제거 (온보딩 가이드 삭제)
// U-116: 세션 라이프사이클 SSOT (SaveGame 제거)
import {
  bootstrapSession,
  startSessionFromProfile,
  resetToCurrentProfile,
  clearSessionAndReturnToSelect,
  setSessionLanguage,
  getInitialSessionLanguage,
} from './save/sessionLifecycle';
import type { DemoProfile } from './data/demoProfiles';
import type { SupportedLanguage } from './i18n';

// =============================================================================
// 게임 상태 타입
// =============================================================================

type GamePhase = 'profile_select' | 'playing';

// =============================================================================
// 메인 App 컴포넌트
// =============================================================================

function App() {
  const { t } = useTranslation();

  // U-116: 항상 profile_select로 시작 (SaveGame 제거)
  const [gamePhase, setGamePhase] = useState<GamePhase>(() => {
    bootstrapSession(); // 레거시 데이터 정리
    return 'profile_select';
  });

  // 현재 선택된 프로필 ID (세션 내에서만 유지, 새로고침 시 초기화)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  // U-044: 세션 언어 SSOT
  // - SaveGame.language를 권위자로 사용하여 드리프트 방지
  // - profile_select에서만 변경 가능 (토글=리셋 정책)
  const [sessionLanguage, setSessionLanguageState] = useState<SupportedLanguage>(() => {
    return getInitialSessionLanguage();
  });

  // 로컬 UI 상태
  const [inputText, setInputText] = useState('');

  // Store 상태 (셀렉터 최적화)
  const economy = useWorldStore((state) => state.economy);
  const isConnected = useWorldStore((state) => state.isConnected);
  const sceneObjects = useWorldStore((state) => state.sceneObjects);
  const narrativeEntries = useWorldStore((state) => state.narrativeEntries);
  const appendSystemNarrative = useWorldStore((state) => state.appendSystemNarrative);
  const appendActionLog = useWorldStore((state) => state.appendActionLog);

  const { startDrag, endDrag } = useInventoryStore();
  const inventoryItemCount = useInventoryStore(selectItemCount);

  // AgentStore 셀렉터
  const isStreaming = useAgentStore((state) => state.isStreaming);
  const narrativeBuffer = useAgentStore((state) => state.narrativeBuffer);
  // U-130: rate limit 상태 셀렉터
  const isRateLimited = useAgentStore((state) => state.isRateLimited);

  // U-087: 입력 잠금 SSOT - 처리 중 모든 사용자 입력을 차단
  // U-130: rate limit 시에도 입력 잠금 유지 (재시도 버튼만 활성화)
  const processingPhase = useWorldStore((state) => state.sceneState.processingPhase);
  const imageLoading = useWorldStore((state) => state.sceneState.imageLoading);
  const isInputLocked =
    isStreaming || processingPhase !== 'idle' || imageLoading === true || isRateLimited;

  // U-130: 마지막 턴 파라미터 저장 (재시도용)
  const lastTurnParamsRef = useRef<RunTurnParams | null>(null);

  const { uiScale, increaseUIScale, decreaseUIScale } = useUIPrefsStore();

  // DOM에 UI 설정 적용 (U-028→U-037)
  useEffect(() => {
    applyUIPrefsToDOM({ uiScale });
  }, [uiScale]);

  // ==========================================================================
  // U-015 + RU-004-Q4: 프로필/세이브 관련 로직 (sessionLifecycle SSOT)
  // ==========================================================================

  /**
   * 프로필을 선택하고 게임을 시작합니다.
   * U-116: SaveGame 없이 store에 직접 적용합니다.
   */
  const handleSelectProfile = useCallback(
    (profile: DemoProfile) => {
      const result = startSessionFromProfile({ profile, t, language: sessionLanguage });
      if (result.success) {
        setCurrentProfileId(result.profileId);
        setGamePhase('playing');
      }
    },
    [t, sessionLanguage],
  );

  /**
   * U-044: profile_select에서 언어를 변경합니다.
   * 토글=리셋 정책에 따라 profile_select에서만 호출 가능합니다.
   */
  const handleLanguageChange = useCallback(async (language: SupportedLanguage) => {
    await setSessionLanguage(language);
    setSessionLanguageState(language);
  }, []);

  /**
   * 현재 프로필의 초기 상태로 리셋합니다.
   * U-116: store 전체 초기화 + 동일 프로필로 재시작합니다.
   */
  const handleReset = useCallback(() => {
    const result = resetToCurrentProfile({ t, currentProfileId });
    if (result.success && result.profileId) {
      setCurrentProfileId(result.profileId);
    }
  }, [t, currentProfileId]);

  /**
   * 프로필 선택 화면으로 돌아갑니다.
   * U-116: 모든 store 초기화 + profile_select로 전환합니다.
   */
  const handleChangeProfile = useCallback(() => {
    clearSessionAndReturnToSelect();
    setCurrentProfileId(null);
    setGamePhase('profile_select');
  }, []);

  // U-117: 온보딩 가이드 초기화 제거 (팝업 삭제, hover 힌트만 유지)

  // RU-003-Q3: Turn Runner (스트림 시작/취소/콜백 라우팅 담당)
  // U-044: 세션 언어를 SSOT로 주입하여 드리프트 방지
  const turnRunnerDeps = useMemo(
    () => ({
      t,
      theme: getCurrentThemeFromDOM(),
      language: sessionLanguage,
    }),
    [t, sessionLanguage],
  );
  const turnRunner = useTurnRunner(turnRunnerDeps);

  /**
   * 턴을 실행합니다.
   */
  const executeTurn = useCallback(
    (text: string, actionId?: string, clickData?: HotspotClickData, dropData?: DropInput) => {
      const params: RunTurnParams = {
        text,
        actionId,
        click: clickData,
        drop: dropData,
      };
      // U-130: 재시도를 위해 마지막 턴 파라미터 저장
      lastTurnParamsRef.current = params;
      turnRunner.runTurn(params);
      setInputText('');
    },
    [turnRunner],
  );

  /**
   * U-130: Rate limit 시 재시도 핸들러.
   * 마지막 실패한 턴 파라미터로 다시 실행합니다.
   */
  const handleRetry = useCallback(() => {
    const params = lastTurnParamsRef.current;
    if (!params) return;
    // agentStore.startStream() 호출 시 isRateLimited가 false로 초기화됨
    turnRunner.runTurn(params);
  }, [turnRunner]);

  /**
   * 입력 제출 핸들러
   */
  const handleSubmit = useCallback(() => {
    // U-087: 입력 잠금 시 제출 차단
    if (isInputLocked) return;
    if (inputText.trim()) {
      executeTurn(inputText.trim());
    }
  }, [inputText, executeTurn, isInputLocked]);

  /**
   * 카드 클릭 핸들러
   * U-070: Q2 Option A - 모든 플레이어 행동에 액션 로그 적용
   */
  const handleCardClick = useCallback(
    (card: ActionCard) => {
      // U-087: 입력 잠금 시 허위 액션 로그 방지 (즉시 반환)
      if (isInputLocked) return;
      // U-070: 액션 로그 추가 (TurnInput 전송 전에 즉각적 피드백)
      appendActionLog(t('action_log.click_action', { action: card.label }));
      executeTurn(card.label, card.id);
    },
    [executeTurn, appendActionLog, t, isInputLocked],
  );

  /**
   * 핫스팟 클릭 핸들러 (U-010)
   * U-070: 핫스팟 클릭에도 액션 로그 적용
   */
  const handleHotspotClick = useCallback(
    (data: HotspotClickData) => {
      // U-087: 입력 잠금 시 허위 액션 로그 방지 (즉시 반환)
      if (isInputLocked) return;
      const clickedObject = sceneObjects.find((obj) => obj.id === data.object_id);
      const clickText = clickedObject
        ? t('scene.hotspot.click_action', { label: clickedObject.label })
        : data.object_id;

      // U-070: 액션 로그 추가 (TurnInput 전송 전에 즉각적 피드백)
      const hotspotLabel = clickedObject?.label ?? data.object_id;
      appendActionLog(t('action_log.click_hotspot', { hotspot: hotspotLabel }));

      executeTurn(clickText, undefined, data);
    },
    [executeTurn, sceneObjects, t, appendActionLog, isInputLocked],
  );

  /**
   * 키보드 이벤트 핸들러
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  /**
   * 드래그 시작 핸들러 (U-011)
   */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      // U-087: 입력 잠금 시 드래그 시작 차단
      if (isInputLocked) return;
      const { active } = event;
      if (isInventoryDragData(active.data.current)) {
        startDrag(active.data.current.item_id);
      }
    },
    [startDrag, isInputLocked],
  );

  /**
   * 드래그 종료 핸들러 (U-011 + U-012)
   * U-070: 아이템→핫스팟 드롭 시 액션 로그 추가
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      endDrag();

      // U-087: 입력 잠금 시 드롭 처리 차단 (허위 액션 로그 방지)
      if (isInputLocked) return;

      const activeData = active.data.current;
      if (!isInventoryDragData(activeData)) {
        return;
      }

      const itemId = activeData.item_id;
      const itemName = activeData.item.name;

      const overData = over?.data.current;
      if (!over || !isHotspotDropData(overData)) {
        appendSystemNarrative(
          `[${t('connection.online')}] ${t('scene.hotspot.drop_invalid', { item: itemName })}`,
        );
        return;
      }

      const { object_id: targetObjectId, box_2d: targetBox2d, label: targetLabel } = overData;

      // U-070: 액션 로그 추가 (TurnInput 전송 전에 즉각적 피드백)
      appendActionLog(
        t('action_log.use_item_on_hotspot', {
          item: itemName,
          hotspot: targetLabel,
        }),
      );

      const dropText = t('scene.hotspot.drop_action', {
        item: itemName,
        target: targetLabel,
      });

      const dropInput: DropInput = {
        item_id: itemId,
        target_object_id: targetObjectId,
        target_box_2d: targetBox2d,
      };

      executeTurn(dropText, undefined, undefined, dropInput);
    },
    [endDrag, executeTurn, appendSystemNarrative, appendActionLog, t, isInputLocked],
  );

  // dnd-kit 센서 설정 (U-117: distance 5px로 클릭/드래그 구분)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // ==========================================================================
  // 렌더링: 프로필 선택 화면
  // U-116: SaveGame 제거 → Continue 버튼 불필요, 항상 새 세션 시작
  // ==========================================================================
  if (gamePhase === 'profile_select') {
    return (
      <>
        <div className="crt-overlay" aria-hidden="true" />
        <DemoProfileSelect
          onSelectProfile={handleSelectProfile}
          currentLanguage={sessionLanguage}
          onLanguageChange={handleLanguageChange}
        />
      </>
    );
  }

  // ==========================================================================
  // 렌더링: 게임 플레이 화면
  // ==========================================================================
  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="game-container">
          <GameHeader
            signal={economy.signal}
            memoryShard={economy.memory_shard}
            credit={economy.credit}
            isConnected={isConnected}
            uiScale={uiScale}
            onIncreaseScale={increaseUIScale}
            onDecreaseScale={decreaseUIScale}
          >
            {/* U-015: 리셋/프로필 변경 버튼 (U-087: isInputLocked로 확장) */}
            <ResetButton onReset={handleReset} disabled={isInputLocked} compact requireConfirm />
            <ChangeProfileButton onClick={handleChangeProfile} disabled={isInputLocked} />
          </GameHeader>

          {/* U-077: 좌측 사이드바 패널 영역 분배 (U-081 흡수) */}
          <aside className="sidebar-left">
            {/* U-077: Inventory - flex-1 + min-height 보장, 아이템 개수 동적 타이틀 */}
            <Panel
              title={
                inventoryItemCount > 0
                  ? t('inventory.count', { count: inventoryItemCount })
                  : t('panel.inventory.title')
              }
              className="panel-inventory flex-1"
            >
              <InventoryPanel />
            </Panel>
            {/* U-013: Quest Panel (U-077: max-height + 내부 스크롤) */}
            <Panel title={t('panel.quest.title')} className="panel-quest">
              <QuestPanel />
            </Panel>
            {/* U-013: Rule Board + Mutation Timeline (U-077: max-height + 내부 스크롤) */}
            <Panel title={t('panel.rule_board.title')} className="panel-rule-board">
              <RuleBoard />
              <MutationTimeline />
            </Panel>
          </aside>

          <main className="game-center">
            {/* U-078: 목표 미니 트래커 (항상 상단에 표시, Q2: Option B) */}
            <ObjectiveTracker />
            {/* U-087: isInputLocked로 핫스팟 클릭/드롭 비활성화 */}
            <SceneCanvas onHotspotClick={handleHotspotClick} disabled={isInputLocked} />
            {/* U-086: isStreaming/isImageLoading 전달 → 텍스트 우선 타이핑 + 이미지 pending 상태 라인 */}
            <NarrativeFeed
              entries={narrativeEntries}
              streamingText={narrativeBuffer}
              isStreaming={isStreaming}
              isImageLoading={imageLoading === true}
            />
          </main>

          {/* U-082: 우측 사이드바 - Agent Console 축소 + Economy HUD flex-1 확대
               (U-049 Q1 Option A 반전: Economy가 유연 확장, Agent Console은 콘텐츠 기반) */}
          <aside className="sidebar-right">
            <Panel title={t('panel.agent_console.title')} className="panel-agent-console" hasChrome>
              <AgentConsole />
            </Panel>
            <Panel title={t('economy.hud_label')} className="panel-economy" hasChrome>
              <EconomyHud />
            </Panel>
            <Panel title={t('panel.scanner.title')} className="panel-scanner" hasChrome>
              {/* U-087: isInputLocked로 확장 (스트리밍+이미지+처리 단계 모두 차단) */}
              <ScannerSlot language={sessionLanguage} disabled={isInputLocked} />
            </Panel>
          </aside>

          <footer className="game-footer">
            {/* U-087: isInputLocked로 ActionDeck 전체 비활성화 */}
            <ActionDeck onCardClick={handleCardClick} disabled={isInputLocked} />
            <div className="command-input-area">
              <span className="command-prompt">&gt;</span>
              <input
                type="text"
                className="command-input"
                placeholder={isInputLocked ? t('ui.input_locked') : t('ui.command_placeholder')}
                aria-label={t('ui.command_placeholder')}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isInputLocked}
              />
              <button type="button" onClick={handleSubmit} disabled={isInputLocked}>
                {isInputLocked ? t('ui.wait') : t('ui.execute')}
              </button>
            </div>
          </footer>
          {/* U-079: 재화 획득 토스트 알림 */}
          <CurrencyToastUI />
        </div>
      </DndContext>

      {/* U-087: 입력 잠금 오버레이 - 처리 중 pointer-events 차단 */}
      {isInputLocked && (
        <div className="input-lock-overlay" aria-live="polite" role="status">
          <span className="input-lock-label">{t('ui.input_locked')}</span>
        </div>
      )}

      {/* U-130: Rate Limit 재시도 안내 패널 (input-lock-overlay보다 높은 z-index) */}
      {isRateLimited && <RateLimitPanel onRetry={handleRetry} />}

      {/* U-117: 온보딩 가이드 팝업 제거 (hover 힌트는 InteractionHint로 유지) */}
    </>
  );
}

/**
 * U-079: 재화 획득 토스트 알림 컴포넌트.
 * worldStore.currencyToast 상태를 구독하여 팝업 표시.
 */
function CurrencyToastUI() {
  const toast = useWorldStore((state) => state.currencyToast);
  const dismiss = useWorldStore((state) => state.dismissCurrencyToast);

  if (!toast) return null;

  return (
    <div className="currency-toast" role="alert" aria-live="assertive">
      <span className="currency-toast-icon">
        {toast.signalDelta > 0 ? '\u26A1' : '\uD83D\uDCB8'}
      </span>
      <span className="currency-toast-amount">
        {toast.signalDelta > 0 ? '+' : ''}
        {toast.signalDelta} Signal
      </span>
      <span className="currency-toast-reason">{toast.reason}</span>
      <button type="button" className="currency-toast-close" onClick={dismiss} aria-label="Close">
        {'\u2715'}
      </button>
    </div>
  );
}

export default App;
