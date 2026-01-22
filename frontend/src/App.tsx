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
 * U-015[Mvp]: SaveGame + Reset + Demo Profiles
 * - 프로필 선택 화면 → 게임 시작 플로우
 * - 리셋 버튼으로 프로필 초기 상태로 복구
 * - localStorage 기반 세이브/로드
 *
 * @see vibe/ref/frontend-style-guide.md
 * @see vibe/prd.md 6.7/6.8/9장
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { RuleBoard } from './components/RuleBoard';
import { MutationTimeline } from './components/MutationTimeline';
// U-015: SaveGame + Demo Profiles
import { DemoProfileSelect } from './components/DemoProfileSelect';
import { ResetButton, ChangeProfileButton } from './components/ResetButton';
import { useAgentStore } from './stores/agentStore';
import { useInventoryStore } from './stores/inventoryStore';
import { useEconomyStore } from './stores/economyStore';
import { useUIPrefsStore, applyUIPrefsToDOM } from './stores/uiPrefsStore';
import { useWorldStore } from './stores/worldStore';
import { useTurnRunner } from './turn/turnRunner';
import type { ActionCard, DropInput } from './schemas/turn';
import { getCurrentThemeFromDOM } from './demo/demoFixtures';
import { isInventoryDragData, isHotspotDropData } from './dnd/types';
// U-015: SaveGame 유틸리티
// RU-004-S2: getValidSaveGameOrNull 도입으로 "유효한 세이브만 Continue" 보장
import {
  loadSaveGame,
  saveSaveGame,
  clearSaveGame,
  getValidSaveGameOrNull,
  createSaveGame,
  loadCurrentProfileId,
  saveCurrentProfileId,
  clearCurrentProfileId,
} from './save/saveGame';
import { useActionDeckStore } from './stores/actionDeckStore';
import { findProfileById, createSaveGameFromProfile, type DemoProfile } from './data/demoProfiles';
import { getResolvedLanguage, changeLanguage, type SupportedLanguage } from './i18n';

// =============================================================================
// 게임 상태 타입
// =============================================================================

type GamePhase = 'profile_select' | 'playing';

// =============================================================================
// 메인 App 컴포넌트
// =============================================================================

function App() {
  const { t } = useTranslation();

  // U-015: 게임 진행 상태 (프로필 선택 vs 플레이 중)
  // RU-004-S2: hasSaveGame() 대신 getValidSaveGameOrNull()로 "유효한 세이브만" 판단
  const [gamePhase, setGamePhase] = useState<GamePhase>(() => {
    // 유효한 SaveGame이 있으면 바로 플레이 상태로 시작
    const validSaveGame = getValidSaveGameOrNull();
    if (validSaveGame) {
      return 'playing';
    }
    return 'profile_select';
  });

  // 현재 선택된 프로필 ID
  // RU-004-S2: SaveGame.profileId를 SSOT로 사용 (CURRENT_PROFILE_KEY는 캐시 역할)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(() => {
    // 유효한 SaveGame이 있으면 그 profileId를 사용
    const validSaveGame = getValidSaveGameOrNull();
    if (validSaveGame?.profileId) {
      return validSaveGame.profileId;
    }
    // 폴백: CURRENT_PROFILE_KEY (호환성)
    return loadCurrentProfileId();
  });

  // 로컬 UI 상태
  const [inputText, setInputText] = useState('');

  // Store 상태
  const worldStore = useWorldStore();
  const { economy, isConnected, sceneObjects, narrativeEntries, appendSystemNarrative } =
    worldStore;

  const { startDrag, endDrag } = useInventoryStore();
  const { isStreaming, narrativeBuffer } = useAgentStore();
  const { uiScale, increaseUIScale, decreaseUIScale } = useUIPrefsStore();

  // DOM에 UI 설정 적용 (U-028→U-037)
  useEffect(() => {
    applyUIPrefsToDOM({ uiScale });
  }, [uiScale]);

  // ==========================================================================
  // U-015: 프로필/세이브 관련 로직
  // ==========================================================================

  /**
   * 저장된 게임을 복원합니다.
   *
   * RU-004-S1: async로 전환하여 언어 적용을 await
   * - 언어 적용 비동기 완료 후 상태 반영
   * - Economy 복원은 hydrateLedger로 순서/timestamp 보존
   *
   * RU-004-S2: profileId 확정/복구 추가
   * - SaveGame.profileId를 SSOT로 사용하여 currentProfileId 확정
   * - CURRENT_PROFILE_KEY도 동기화하여 드리프트 방지
   * - actionDeckStore/agentStore도 초기화
   */
  const restoreSaveGame = useCallback(async (): Promise<boolean> => {
    const saveGame = loadSaveGame();
    if (!saveGame) return false;

    // RU-004-S2: profileId 확정 (SaveGame.profileId가 SSOT)
    if (saveGame.profileId) {
      setCurrentProfileId(saveGame.profileId);
      saveCurrentProfileId(saveGame.profileId); // localStorage 동기화
    }

    // 언어 설정 적용 (RULE-006) - RU-004-S1: await 적용으로 비동기 완료 보장
    await changeLanguage(saveGame.language as SupportedLanguage);

    // RU-004-S2: 세션 초기화 시 모든 관련 store를 reset (이전 세션 잔재 제거)
    worldStore.reset();
    useActionDeckStore.getState().reset();
    useAgentStore.getState().reset();

    // Store 상태 복원
    useWorldStore.setState({
      economy: {
        signal: saveGame.economy.signal,
        memory_shard: saveGame.economy.memory_shard,
      },
      turnCount: saveGame.turnCount,
      narrativeEntries: saveGame.narrativeHistory,
      quests: saveGame.quests,
      activeRules: saveGame.activeRules,
      mutationTimeline: saveGame.mutationTimeline,
      sceneObjects: saveGame.sceneObjects,
    });

    // 인벤토리 복원
    useInventoryStore.getState().setItems(saveGame.inventory);

    // Economy 복원 (RU-004-S1: hydrateLedger로 순서/timestamp/lastCost/isBalanceLow 정합성 보장)
    useEconomyStore.getState().reset();
    useEconomyStore.getState().hydrateLedger(saveGame.economyLedger, saveGame.economy);

    return true;
  }, [worldStore]);

  /**
   * 현재 상태를 저장합니다.
   */
  const saveCurrentState = useCallback(() => {
    if (!currentProfileId) return;

    const state = useWorldStore.getState();
    const economyState = useEconomyStore.getState();
    const inventoryState = useInventoryStore.getState();

    const saveGame = createSaveGame({
      language: getResolvedLanguage(),
      profileId: currentProfileId,
      economy: state.economy,
      economyLedger: economyState.ledger,
      turnCount: state.turnCount,
      narrativeHistory: state.narrativeEntries,
      inventory: inventoryState.items,
      quests: state.quests,
      activeRules: state.activeRules,
      mutationTimeline: state.mutationTimeline,
      sceneObjects: state.sceneObjects,
    });

    saveSaveGame(saveGame);
  }, [currentProfileId]);

  /**
   * 프로필을 선택하고 게임을 시작합니다.
   *
   * RU-004-S2: 세션 초기화 시 actionDeckStore/agentStore도 reset
   */
  const handleSelectProfile = useCallback(
    (profile: DemoProfile) => {
      // 언어 설정 유지
      const language = getResolvedLanguage();

      // 프로필에서 SaveGame 생성
      const saveGame = createSaveGameFromProfile(profile, language, t);

      // RU-004-S2: 세션 초기화 시 모든 관련 store를 reset (이전 세션 잔재 제거)
      worldStore.reset();
      useInventoryStore.getState().reset();
      useEconomyStore.getState().reset();
      useActionDeckStore.getState().reset();
      useAgentStore.getState().reset();

      useWorldStore.setState({
        economy: {
          signal: saveGame.economy.signal,
          memory_shard: saveGame.economy.memory_shard,
        },
        turnCount: 0,
        narrativeEntries: saveGame.narrativeHistory,
        quests: saveGame.quests,
        activeRules: saveGame.activeRules,
        mutationTimeline: saveGame.mutationTimeline,
        sceneObjects: saveGame.sceneObjects,
      });

      useInventoryStore.getState().setItems(saveGame.inventory);

      // 프로필 ID 저장
      setCurrentProfileId(profile.id);
      saveCurrentProfileId(profile.id);

      // SaveGame 저장
      saveSaveGame(saveGame);

      // 게임 시작
      setGamePhase('playing');
    },
    [t, worldStore],
  );

  /**
   * 저장된 게임을 계속합니다.
   * RU-004-S1: async로 전환된 restoreSaveGame에 await 적용
   * RU-004-S2: 로드 실패 시 클린업 + profile_select 폴백
   */
  const handleContinue = useCallback(async () => {
    const restored = await restoreSaveGame();
    if (restored) {
      setGamePhase('playing');
    } else {
      // RU-004-S2: 로드 실패 시 클린업하고 profile_select로 폴백
      // 손상된 세이브를 제거하여 다음 Continue 시 혼란 방지
      clearSaveGame();
      clearCurrentProfileId();
      setCurrentProfileId(null);
      setGamePhase('profile_select');
      // 시스템 안내는 profile_select 화면에서 표시 (채팅 버블 금지)
      console.warn('[App] SaveGame 복원 실패, 새로 시작');
    }
  }, [restoreSaveGame]);

  /**
   * 현재 프로필의 초기 상태로 리셋합니다.
   */
  const handleReset = useCallback(() => {
    if (!currentProfileId) return;

    const profile = findProfileById(currentProfileId);
    if (!profile) return;

    // 프로필 초기 상태로 다시 시작
    handleSelectProfile(profile);
  }, [currentProfileId, handleSelectProfile]);

  /**
   * 프로필 선택 화면으로 돌아갑니다.
   *
   * RU-004-S2: 세션 초기화 시 actionDeckStore/agentStore도 reset
   */
  const handleChangeProfile = useCallback(() => {
    // 세이브 및 프로필 초기화
    clearSaveGame();
    clearCurrentProfileId();
    setCurrentProfileId(null);

    // RU-004-S2: 세션 초기화 시 모든 관련 store를 reset (이전 세션 잔재 제거)
    worldStore.reset();
    useInventoryStore.getState().reset();
    useEconomyStore.getState().reset();
    useActionDeckStore.getState().reset();
    useAgentStore.getState().reset();

    // 프로필 선택 화면으로
    setGamePhase('profile_select');
  }, [worldStore]);

  // 게임 시작 시 저장된 게임 복원
  // RU-004-S1: async 함수로 전환된 restoreSaveGame 호출 (void로 처리, 에러는 내부 로깅)
  useEffect(() => {
    if (gamePhase === 'playing' && currentProfileId) {
      void restoreSaveGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 턴 완료 시 자동 저장 (turnCount 변화 감지)
  useEffect(() => {
    if (gamePhase === 'playing' && narrativeEntries.length > 0) {
      saveCurrentState();
    }
  }, [gamePhase, narrativeEntries.length, saveCurrentState]);

  // RU-003-Q3: Turn Runner (스트림 시작/취소/콜백 라우팅 담당)
  const turnRunnerDeps = useMemo(
    () => ({
      t,
      theme: getCurrentThemeFromDOM(),
    }),
    [t],
  );
  const turnRunner = useTurnRunner(turnRunnerDeps);

  /**
   * 턴을 실행합니다.
   */
  const executeTurn = useCallback(
    (text: string, actionId?: string, clickData?: HotspotClickData, dropData?: DropInput) => {
      turnRunner.runTurn({
        text,
        actionId,
        click: clickData,
        drop: dropData,
      });
      setInputText('');
    },
    [turnRunner],
  );

  /**
   * 입력 제출 핸들러
   */
  const handleSubmit = useCallback(() => {
    if (inputText.trim()) {
      executeTurn(inputText.trim());
    }
  }, [inputText, executeTurn]);

  /**
   * 카드 클릭 핸들러
   */
  const handleCardClick = useCallback(
    (card: ActionCard) => {
      executeTurn(card.label, card.id);
    },
    [executeTurn],
  );

  /**
   * 핫스팟 클릭 핸들러 (U-010)
   */
  const handleHotspotClick = useCallback(
    (data: HotspotClickData) => {
      const clickedObject = sceneObjects.find((obj) => obj.id === data.object_id);
      const clickText = clickedObject
        ? t('scene.hotspot.click_action', { label: clickedObject.label })
        : data.object_id;

      executeTurn(clickText, undefined, data);
    },
    [executeTurn, sceneObjects, t],
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
      const { active } = event;
      if (isInventoryDragData(active.data.current)) {
        startDrag(active.data.current.item_id);
      }
    },
    [startDrag],
  );

  /**
   * 드래그 종료 핸들러 (U-011 + U-012)
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      endDrag();

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
    [endDrag, executeTurn, appendSystemNarrative, t],
  );

  // dnd-kit 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // ==========================================================================
  // 렌더링: 프로필 선택 화면
  // RU-004-S2: hasSaveGame() 대신 getValidSaveGameOrNull()으로 "유효한 세이브만" Continue 노출
  // ==========================================================================
  if (gamePhase === 'profile_select') {
    const validSaveGame = getValidSaveGameOrNull();
    const hasSavedGame = validSaveGame !== null;
    return (
      <>
        <div className="crt-overlay" aria-hidden="true" />
        <DemoProfileSelect
          onSelectProfile={handleSelectProfile}
          onContinue={hasSavedGame ? handleContinue : undefined}
          hasSavedGame={hasSavedGame}
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
            isConnected={isConnected}
            uiScale={uiScale}
            onIncreaseScale={increaseUIScale}
            onDecreaseScale={decreaseUIScale}
          >
            {/* U-015: 리셋/프로필 변경 버튼 */}
            <ResetButton onReset={handleReset} disabled={isStreaming} compact requireConfirm />
            <ChangeProfileButton onClick={handleChangeProfile} disabled={isStreaming} />
          </GameHeader>

          <aside className="sidebar-left">
            <Panel title={t('panel.inventory.title')} className="flex-1">
              <InventoryPanel />
            </Panel>
            {/* U-013: Quest Panel */}
            <Panel title={t('panel.quest.title')}>
              <QuestPanel />
            </Panel>
            {/* U-013: Rule Board + Mutation Timeline (별도 컴포넌트) */}
            <Panel title={t('panel.rule_board.title')}>
              <RuleBoard />
              <MutationTimeline />
            </Panel>
          </aside>

          <main className="game-center">
            <SceneCanvas onHotspotClick={handleHotspotClick} />
            <NarrativeFeed entries={narrativeEntries} streamingText={narrativeBuffer} />
          </main>

          <aside className="sidebar-right">
            <Panel title={t('panel.agent_console.title')} className="flex-1" hasChrome>
              <AgentConsole />
            </Panel>
            <Panel title={t('economy.hud_label')} hasChrome>
              <EconomyHud />
            </Panel>
            <Panel title={t('panel.scanner.title')} hasChrome>
              <div className="scanner-slot has-chrome">
                <p className="panel-placeholder">{t('panel.scanner.placeholder')}</p>
              </div>
            </Panel>
          </aside>

          <footer className="game-footer">
            <ActionDeck onCardClick={handleCardClick} />
            <div className="command-input-area">
              <span className="command-prompt">&gt;</span>
              <input
                type="text"
                className="command-input"
                placeholder={isStreaming ? t('ui.processing') : t('ui.command_placeholder')}
                aria-label={t('ui.command_placeholder')}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
              />
              <button type="button" onClick={handleSubmit} disabled={isStreaming}>
                {isStreaming ? t('ui.wait') : t('ui.execute')}
              </button>
            </div>
          </footer>
        </div>
      </DndContext>
    </>
  );
}

export default App;
