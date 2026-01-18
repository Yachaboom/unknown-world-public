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
import { useAgentStore } from './stores/agentStore';
import { useInventoryStore } from './stores/inventoryStore';
import { useUIPrefsStore, applyUIPrefsToDOM } from './stores/uiPrefsStore';
import { useWorldStore } from './stores/worldStore';
import { useTurnRunner } from './turn/turnRunner';
import type { ActionCard, DropInput } from './schemas/turn';
import { getCurrentThemeFromDOM } from './demo/demoFixtures';
import { isInventoryDragData, isHotspotDropData } from './dnd/types';
import { useDemoInitializer } from './demo/useDemoInitializer';

// =============================================================================
// 메인 App 컴포넌트
// =============================================================================

function App() {
  const { t } = useTranslation();

  // 데모 초기화 (RU-003: 훅으로 이동)
  useDemoInitializer();

  // 로컬 UI 상태
  const [inputText, setInputText] = useState('');

  // Store 상태
  const { economy, isConnected, sceneObjects, narrativeEntries, appendSystemNarrative } =
    useWorldStore();

  const { startDrag, endDrag } = useInventoryStore();
  const { isStreaming, narrativeBuffer } = useAgentStore();
  const { uiScale, increaseUIScale, decreaseUIScale } = useUIPrefsStore();

  // DOM에 UI 설정 적용 (U-028→U-037)
  useEffect(() => {
    applyUIPrefsToDOM({ uiScale });
  }, [uiScale]);

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
          />

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
