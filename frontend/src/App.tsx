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
import { AgentConsole } from './components/AgentConsole';
import { SceneCanvas, type HotspotClickData } from './components/SceneCanvas';
import { ActionDeck } from './components/ActionDeck';
import { InventoryPanel } from './components/InventoryPanel';
import { useAgentStore } from './stores/agentStore';
import { useActionDeckStore } from './stores/actionDeckStore';
import { useInventoryStore } from './stores/inventoryStore';
import { useUIPrefsStore, applyUIPrefsToDOM, UI_SCALES, type UIScale } from './stores/uiPrefsStore';
import {
  useWorldStore,
  type NarrativeEntry,
} from './stores/worldStore';
import { useTurnRunner } from './turn/turnRunner';
import type { ActionCard, DropInput, Box2D } from './schemas/turn';

// =============================================================================
// 패널 컴포넌트
// =============================================================================

interface PanelProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
  /** U-032: Chrome 장식 적용 여부 */
  hasChrome?: boolean;
  /** 기본 placeholder i18n 키 (children이 없을 때 사용) */
  placeholderKey?: string;
}

function Panel({ title, children, className = '', hasChrome = false, placeholderKey }: PanelProps) {
  const { t } = useTranslation();
  const panelClass = `panel ${className} ${hasChrome ? 'has-chrome' : ''}`.trim();
  const headerClass = `panel-header ${hasChrome ? 'has-chrome' : ''}`.trim();

  return (
    <div className={panelClass}>
      <div className={headerClass}>
        <span className="panel-title">{title}</span>
      </div>
      <div className="panel-content">
        {children || (
          <p className="panel-placeholder">
            {placeholderKey ? t(placeholderKey) : t('ui.panel_placeholder')}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 내러티브 피드 컴포넌트
// =============================================================================

interface NarrativeFeedProps {
  entries: NarrativeEntry[];
  streamingText: string;
}

function NarrativeFeed({ entries, streamingText }: NarrativeFeedProps) {
  const { t } = useTranslation();
  const feedRef = useRef<HTMLDivElement>(null);

  // 새 엔트리 추가 시 스크롤
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [entries, streamingText]);

  return (
    <div className="narrative-feed" ref={feedRef}>
      {entries.map((entry, index) => (
        <div key={`${entry.turn}-${index}`} className="narrative-entry">
          <span className="narrative-timestamp">
            {t('narrative.turn_label', { turn: entry.turn })}
          </span>
          <span className="narrative-text">{entry.text}</span>
        </div>
      ))}
      {streamingText && (
        <div className="narrative-entry streaming">
          <span className="narrative-timestamp">{t('narrative.streaming_label')}</span>
          <span className="narrative-text">{streamingText}</span>
          <span className="cursor-blink">▌</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// UI 컨트롤 컴포넌트 (U-028→U-037: Readable 모드 제거, 스케일만 유지)
// =============================================================================

interface UIControlsProps {
  uiScale: UIScale;
  onIncreaseScale: () => void;
  onDecreaseScale: () => void;
}

function UIControls({ uiScale, onIncreaseScale, onDecreaseScale }: UIControlsProps) {
  const { t } = useTranslation();
  const isMinScale = uiScale === UI_SCALES[0];
  const isMaxScale = uiScale === UI_SCALES[UI_SCALES.length - 1];

  return (
    <div className="ui-controls" role="group" aria-label={t('ui.scale_label')}>
      {/* UI 스케일 조절 */}
      <button
        type="button"
        className="ui-scale-btn"
        onClick={onDecreaseScale}
        disabled={isMinScale}
        aria-label={t('ui.scale_decrease')}
        title={`${t('ui.scale_decrease')} (A-)`}
      >
        A-
      </button>
      <span className="ui-scale-display" aria-live="polite">
        {Math.round(uiScale * 100)}%
      </span>
      <button
        type="button"
        className="ui-scale-btn"
        onClick={onIncreaseScale}
        disabled={isMaxScale}
        aria-label={t('ui.scale_increase')}
        title={`${t('ui.scale_increase')} (A+)`}
      >
        A+
      </button>
    </div>
  );
}

// =============================================================================
// 헤더 컴포넌트
// =============================================================================

interface GameHeaderProps {
  signal: number;
  memoryShard: number;
  isConnected: boolean;
  uiScale: UIScale;
  onIncreaseScale: () => void;
  onDecreaseScale: () => void;
}

function GameHeader({
  signal,
  memoryShard,
  isConnected,
  uiScale,
  onIncreaseScale,
  onDecreaseScale,
}: GameHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="game-header has-chrome">
      <h1 className="game-title glitch" data-text={t('ui.logo')}>
        {t('ui.logo')}
      </h1>
      <div className="header-controls">
        {/* UI 스케일 컨트롤 (U-028→U-037: Readable 제거) */}
        <UIControls
          uiScale={uiScale}
          onIncreaseScale={onIncreaseScale}
          onDecreaseScale={onDecreaseScale}
        />
        <div className="economy-hud">
          <span className="icon-wrapper signal-icon" aria-label={t('economy.signal')}>
            <img
              src="/ui/icons/signal-24.png"
              alt=""
              aria-hidden="true"
              className="icon-img"
              onError={(e) => {
                e.currentTarget.classList.add('hidden');
              }}
            />
            <span className="icon-fallback">⚡</span>
          </span>
          <span className="currency-value">
            {t('economy.signal')}: {signal}
          </span>
          <span className="icon-wrapper shard-icon" aria-label={t('economy.shard')}>
            <img
              src="/ui/icons/shard-24.png"
              alt=""
              aria-hidden="true"
              className="icon-img"
              onError={(e) => {
                e.currentTarget.classList.add('hidden');
              }}
            />
            <span className="icon-fallback">💎</span>
          </span>
          <span className="currency-value">
            {t('economy.shard')}: {memoryShard}
          </span>
        </div>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? '' : 'offline'}`} />
          <span>{isConnected ? t('connection.online') : t('connection.offline')}</span>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// 메인 App 컴포넌트
// =============================================================================

function App() {
  const { t } = useTranslation();

  // 로컬 UI 상태 (App 내에서만 관리하는 상태)
  const [inputText, setInputText] = useState('');

  // World Store (RU-003-Q4: 세션/월드 상태 SSOT)
  // RU-003-Q3: applyTurnOutput, setSceneState, setConnected는 Turn Runner로 이동
  const {
    economy,
    isConnected,
    sceneState,
    sceneObjects,
    narrativeEntries,
    appendSystemNarrative,
    setSceneObjects,
    initialize: initializeWorld,
  } = useWorldStore();

  // Action Deck Store (U-009)
  const { cards: actionCards } = useActionDeckStore();

  // Inventory Store (U-011)
  const {
    addItems: addInventoryItems,
    startDrag,
    endDrag,
    items: inventoryItems,
  } = useInventoryStore();

  // 초기화: 월드 상태 및 데모용 mock 데이터 (RU-003-Q4)
  useEffect(() => {
    // 월드 초기화 (환영 메시지)
    if (narrativeEntries.length === 0) {
      initializeWorld(t('narrative.welcome'));
    }

    // DEV: 데모용 mock 인벤토리 초기화 (U-011)
    if (inventoryItems.length === 0) {
      addInventoryItems([
        { id: 'keycard-alpha', name: '키카드 A', icon: '🔑', quantity: 1 },
        { id: 'medkit', name: '응급 키트', icon: '🩹', quantity: 2 },
        { id: 'flashlight', name: '손전등', icon: '🔦', quantity: 1 },
        { id: 'data-chip', name: '데이터칩', icon: '💾', quantity: 3 },
      ]);
    }

    // DEV: 데모용 mock Scene Objects 초기화 (U-010)
    if (sceneObjects.length === 0) {
      setSceneObjects([
        {
          id: 'demo-terminal',
          label: '터미널',
          box_2d: { ymin: 300, xmin: 100, ymax: 600, xmax: 400 },
          interaction_hint: '활성화된 터미널이다',
        },
        {
          id: 'demo-door',
          label: '문',
          box_2d: { ymin: 200, xmin: 600, ymax: 800, xmax: 900 },
          interaction_hint: '잠겨있는 것 같다',
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dnd-kit 센서 설정 (U-011: Q1 Option A - App 최상단에 DndContext)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이상 움직여야 드래그 시작
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Agent Store 상태 (RU-003-Q3: 액션은 Turn Runner로 이동)
  const { isStreaming, narrativeBuffer } = useAgentStore();

  // UI Prefs Store (U-028→U-037: Readable 모드 제거)
  const { uiScale, increaseUIScale, decreaseUIScale } = useUIPrefsStore();

  // DOM에 UI 설정 적용 (U-028→U-037)
  useEffect(() => {
    applyUIPrefsToDOM({ uiScale });
  }, [uiScale]);

  // RU-003-Q3: Turn Runner (스트림 시작/취소/콜백 라우팅 담당)
  const turnRunnerDeps = useMemo(
    () => ({
      t,
      theme: 'dark' as const,
    }),
    [t],
  );
  const turnRunner = useTurnRunner(turnRunnerDeps);

  /**
   * 턴을 실행합니다.
   *
   * RU-003-Q3: Turn Runner로 위임하여 App은 "이벤트 라우팅"만 담당합니다.
   * - TurnInput 생성, 스트림 시작/취소, 콜백 라우팅은 모두 Turn Runner가 처리합니다.
   *
   * U-010: click 파라미터 (핫스팟 클릭)
   * U-012: drop 파라미터 (인벤토리 아이템 → 핫스팟 드롭)
   */
  const executeTurn = useCallback(
    (text: string, actionId?: string, clickData?: HotspotClickData, dropData?: DropInput) => {
      // RU-003-Q3: Turn Runner에 위임
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
   * 클릭한 오브젝트 정보를 TurnInput에 포함하여 서버로 전송합니다.
   */
  const handleHotspotClick = useCallback(
    (data: HotspotClickData) => {
      // 클릭한 오브젝트의 라벨을 찾아 텍스트로 사용
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

  // RU-003-Q3: 컴포넌트 언마운트 시 스트림 취소는 useTurnRunner 훅에서 자동 처리

  /**
   * 드래그 시작 핸들러 (U-011)
   */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      if (active.data.current?.type === 'inventory-item') {
        startDrag(active.id as string);
      }
    },
    [startDrag],
  );

  /**
   * 드래그 종료 핸들러 (U-011 + U-012)
   *
   * U-012: 핫스팟에 드롭 시 TurnInput(drop)을 생성하여 턴 실행.
   * - 드롭 성공: item_id + target_object_id + target_box_2d로 TurnInput 생성
   * - 드롭 실패: 즉시 피드백 (무반응 금지)
   * RU-003-Q4: 시스템 내러티브는 worldStore.appendSystemNarrative 사용
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      endDrag();

      // 드래그된 아이템 정보 추출
      const activeData = active.data.current;
      if (activeData?.type !== 'inventory-item') {
        return;
      }

      const itemId = activeData.item_id as string;
      const draggedItem = inventoryItems.find((item) => item.id === itemId);
      const itemName = draggedItem?.name ?? itemId;

      // 드롭 대상이 없거나 핫스팟이 아니면 실패 피드백 제공 (U-012)
      // RU-003-Q4: appendSystemNarrative로 단일화
      if (!over || over.data.current?.type !== 'hotspot') {
        appendSystemNarrative(
          `[${t('connection.online')}] ${t('scene.hotspot.drop_invalid', { item: itemName })}`,
        );
        return;
      }

      // 드롭 대상이 핫스팟인 경우
      const overData = over.data.current;
      const targetObjectId = overData.object_id as string;
      const targetBox2d = overData.box_2d as Box2D;
      const targetLabel = overData.label as string;

      // 드롭 액션 텍스트 생성
      const dropText = t('scene.hotspot.drop_action', {
        item: itemName,
        target: targetLabel,
      });

      // DropInput 생성 (Q1: Option B - target_box_2d 포함)
      const dropInput: DropInput = {
        item_id: itemId,
        target_object_id: targetObjectId,
        target_box_2d: targetBox2d,
      };

      // 턴 실행
      executeTurn(dropText, undefined, undefined, dropInput);
    },
    [endDrag, executeTurn, inventoryItems, appendSystemNarrative, t],
  );

  return (
    <>
      {/* CRT 스캔라인 오버레이 */}
      <div className="crt-overlay" aria-hidden="true" />

      {/* DndContext: App 최상단 (U-011 Q1: Option A) */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* 게임 레이아웃 */}
        <div className="game-container">
          {/* Header: 타이틀/상태/재화/UI컨트롤 */}
          <GameHeader
            signal={economy.signal}
            memoryShard={economy.memory_shard}
            isConnected={isConnected}
            uiScale={uiScale}
            onIncreaseScale={increaseUIScale}
            onDecreaseScale={decreaseUIScale}
          />

          {/* Sidebar Left: Inventory / Quest / Rule Board */}
          <aside className="sidebar-left">
            <Panel title={t('panel.inventory.title')} className="flex-1">
              <InventoryPanel disabled={isStreaming} />
            </Panel>
            <Panel title={t('panel.quest.title')} placeholderKey="panel.quest.placeholder" />
            <Panel
              title={t('panel.rule_board.title')}
              placeholderKey="panel.rule_board.placeholder"
            />
          </aside>

          {/* Center: Scene Canvas + Narrative Feed */}
          <main className="game-center">
            <SceneCanvas
              state={sceneState}
              objects={sceneObjects}
              onHotspotClick={handleHotspotClick}
              disabled={isStreaming}
            />
            <NarrativeFeed entries={narrativeEntries} streamingText={narrativeBuffer} />
          </main>

          {/* Sidebar Right: Agent Console / Memory Pin / Scanner */}
          <aside className="sidebar-right">
            <Panel title={t('panel.agent_console.title')} className="flex-1" hasChrome>
              <AgentConsole />
            </Panel>
            <Panel
              title={t('panel.memory_pin.title')}
              hasChrome
              placeholderKey="panel.memory_pin.placeholder"
            />
            <Panel title={t('panel.scanner.title')} hasChrome>
              <div className="scanner-slot has-chrome">
                <p className="panel-placeholder">{t('panel.scanner.placeholder')}</p>
              </div>
            </Panel>
          </aside>

          {/* Footer: Action Deck + Command Input (U-009) */}
          <footer className="game-footer">
            <ActionDeck
              cards={actionCards}
              onCardClick={handleCardClick}
              disabled={isStreaming}
              currentBalance={economy}
            />
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
