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
import { useUIPrefsStore, applyUIPrefsToDOM } from './stores/uiPrefsStore';
import { useWorldStore } from './stores/worldStore';
import { useTurnRunner } from './turn/turnRunner';
import type { ActionCard, DropInput } from './schemas/turn';
import { getCurrentThemeFromDOM } from './demo/demoFixtures';
import { isInventoryDragData, isHotspotDropData } from './dnd/types';
// RU-004-Q4: 세션 라이프사이클 SSOT
import {
  bootstrapSession,
  hasValidSaveGame,
  startSessionFromProfile,
  continueSession,
  resetToCurrentProfile,
  clearSessionAndReturnToSelect,
  saveCurrentSession,
  getInitialProfileId,
} from './save/sessionLifecycle';
import type { DemoProfile } from './data/demoProfiles';

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
  // RU-004-Q4: bootstrapSession()으로 초기 phase 결정 (SSOT)
  const [gamePhase, setGamePhase] = useState<GamePhase>(() => {
    const bootstrap = bootstrapSession();
    return bootstrap.phase;
  });

  // 현재 선택된 프로필 ID
  // RU-004-Q4: getInitialProfileId()로 초기 profileId 결정 (SSOT)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(() => {
    return getInitialProfileId();
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
  // U-015 + RU-004-Q4: 프로필/세이브 관련 로직 (sessionLifecycle SSOT)
  // ==========================================================================

  /**
   * 프로필을 선택하고 게임을 시작합니다.
   *
   * RU-004-Q4: sessionLifecycle.startSessionFromProfile 호출
   */
  const handleSelectProfile = useCallback(
    (profile: DemoProfile) => {
      const result = startSessionFromProfile({ profile, t });
      if (result.success) {
        setCurrentProfileId(result.profileId);
        setGamePhase('playing');
      }
    },
    [t],
  );

  /**
   * 저장된 게임을 계속합니다.
   *
   * RU-004-Q4: sessionLifecycle.continueSession 호출
   */
  const handleContinue = useCallback(async () => {
    const result = await continueSession();
    if (result) {
      setCurrentProfileId(result.profileId);
      setGamePhase('playing');
    } else {
      // 로드 실패 시 profile_select로 폴백
      setCurrentProfileId(null);
      setGamePhase('profile_select');
      console.warn('[App] SaveGame 복원 실패, 새로 시작');
    }
  }, []);

  /**
   * 현재 프로필의 초기 상태로 리셋합니다.
   *
   * RU-004-Q4: sessionLifecycle.resetToCurrentProfile 호출
   */
  const handleReset = useCallback(() => {
    const result = resetToCurrentProfile({ t, currentProfileId });
    if (result.success && result.profileId) {
      setCurrentProfileId(result.profileId);
      // 게임 상태는 이미 playing이므로 별도 설정 불필요
    }
  }, [t, currentProfileId]);

  /**
   * 프로필 선택 화면으로 돌아갑니다.
   *
   * RU-004-Q4: sessionLifecycle.clearSessionAndReturnToSelect 호출
   */
  const handleChangeProfile = useCallback(() => {
    clearSessionAndReturnToSelect();
    setCurrentProfileId(null);
    setGamePhase('profile_select');
  }, []);

  // 게임 시작 시 저장된 게임 복원
  // RU-004-Q4: sessionLifecycle.continueSession 호출
  useEffect(() => {
    if (gamePhase === 'playing' && currentProfileId) {
      void continueSession().then((result) => {
        if (result) {
          setCurrentProfileId(result.profileId);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 턴 완료 시 자동 저장 (turnCount 변화 감지)
  // RU-004-Q4: sessionLifecycle.saveCurrentSession 호출
  useEffect(() => {
    if (gamePhase === 'playing' && narrativeEntries.length > 0) {
      saveCurrentSession(currentProfileId);
    }
  }, [gamePhase, narrativeEntries.length, currentProfileId]);

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
  // RU-004-Q4: hasValidSaveGame()으로 "유효한 세이브만" Continue 노출
  // ==========================================================================
  if (gamePhase === 'profile_select') {
    const hasSavedGame = hasValidSaveGame();
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
