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
 * @see vibe/ref/frontend-style-guide.md
 * @see vibe/prd.md 6.7/6.8/9장
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentConsole } from './components/AgentConsole';
import { SceneCanvas } from './components/SceneCanvas';
import type { SceneCanvasState } from './types/scene';
import { useAgentStore } from './stores/agentStore';
import { useUIPrefsStore, applyUIPrefsToDOM, UI_SCALES, type UIScale } from './stores/uiPrefsStore';
import { startTurnStream, type StreamCallbacks } from './api/turnStream';
import type { TurnInput, TurnOutput, ActionCard } from './schemas/turn';

// =============================================================================
// 타입 정의
// =============================================================================

interface NarrativeEntry {
  turn: number;
  text: string;
}

// =============================================================================
// 패널 컴포넌트
// =============================================================================

interface PanelProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
  /** U-032: Chrome 장식 적용 여부 */
  hasChrome?: boolean;
}

function Panel({ title, children, className = '', hasChrome = false }: PanelProps) {
  const panelClass = `panel ${className} ${hasChrome ? 'has-chrome' : ''}`.trim();
  const headerClass = `panel-header ${hasChrome ? 'has-chrome' : ''}`.trim();

  return (
    <div className={panelClass}>
      <div className={headerClass}>
        <span className="panel-title">{title}</span>
      </div>
      <div className="panel-content">
        {children || <p className="panel-placeholder">[ 준비 중 ]</p>}
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
  const feedRef = useRef<HTMLDivElement>(null);

  // 새 엔트리 추가 시 스크롤
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [entries, streamingText]);

  return (
    <div className="narrative-feed" ref={feedRef}>
      {entries.map((entry) => (
        <div key={entry.turn} className="narrative-entry">
          <span className="narrative-timestamp">[TURN {entry.turn}]</span>
          <span className="narrative-text">{entry.text}</span>
        </div>
      ))}
      {streamingText && (
        <div className="narrative-entry streaming">
          <span className="narrative-timestamp">[STREAMING]</span>
          <span className="narrative-text">{streamingText}</span>
          <span className="cursor-blink">▌</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 액션 덱 컴포넌트
// =============================================================================

interface ActionDeckProps {
  cards: ActionCard[];
  onCardClick?: (card: ActionCard) => void;
  disabled?: boolean;
}

function ActionDeck({ cards, onCardClick, disabled }: ActionDeckProps) {
  // 카드가 없으면 기본 카드 표시
  const displayCards: ActionCard[] =
    cards.length > 0
      ? cards
      : [
          {
            id: 'default-1',
            label: '탐색하기',
            description: '주변을 살펴본다',
            cost: { signal: 1, memory_shard: 0 },
            risk: 'low',
            hint: null,
          },
          {
            id: 'default-2',
            label: '조사하기',
            description: '자세히 살펴본다',
            cost: { signal: 2, memory_shard: 0 },
            risk: 'medium',
            hint: null,
          },
          {
            id: 'default-3',
            label: '대화하기',
            description: '말을 걸어본다',
            cost: { signal: 1, memory_shard: 0 },
            risk: 'low',
            hint: null,
          },
        ];

  return (
    <div className="action-deck">
      {displayCards.map((card) => (
        <button
          key={card.id}
          type="button"
          className="action-card has-chrome"
          onClick={() => onCardClick?.(card)}
          disabled={disabled}
        >
          <div className="action-card-title">{card.label}</div>
          <div className="action-card-cost">
            <span className="icon-wrapper" aria-label="Signal cost">
              <img
                src="/ui/icons/signal-16.png"
                alt=""
                aria-hidden="true"
                className="icon-img"
                style={{ width: 14, height: 14 }}
                onError={(e) => e.currentTarget.classList.add('hidden')}
              />
              <span className="icon-fallback">⚡</span>
            </span>{' '}
            {card.cost.signal}
            {card.cost.memory_shard > 0 && (
              <>
                {' | '}
                <span className="icon-wrapper" aria-label="Shard cost">
                  <img
                    src="/ui/icons/shard-16.png"
                    alt=""
                    aria-hidden="true"
                    className="icon-img"
                    style={{ width: 14, height: 14 }}
                    onError={(e) => e.currentTarget.classList.add('hidden')}
                  />
                  <span className="icon-fallback">💎</span>
                </span>{' '}
                {card.cost.memory_shard}
              </>
            )}
            {' | '}
            <span className="icon-wrapper" aria-label="Risk level">
              <img
                src={`/ui/icons/risk-${card.risk}-16.png`}
                alt=""
                aria-hidden="true"
                className={`icon-img risk-${card.risk}`}
                style={{ width: 14, height: 14 }}
                onError={(e) => e.currentTarget.classList.add('hidden')}
              />
              <span className="icon-fallback">⚠</span>
            </span>{' '}
            {card.risk}
          </div>
        </button>
      ))}
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
  const isMinScale = uiScale === UI_SCALES[0];
  const isMaxScale = uiScale === UI_SCALES[UI_SCALES.length - 1];

  return (
    <div className="ui-controls" role="group" aria-label="UI 스케일 설정">
      {/* UI 스케일 조절 */}
      <button
        type="button"
        className="ui-scale-btn"
        onClick={onDecreaseScale}
        disabled={isMinScale}
        aria-label="글자 크기 줄이기"
        title="글자 크기 줄이기 (A-)"
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
        aria-label="글자 크기 늘리기"
        title="글자 크기 늘리기 (A+)"
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
  return (
    <header className="game-header has-chrome">
      <h1 className="game-title glitch" data-text="UNKNOWN WORLD">
        UNKNOWN WORLD
      </h1>
      <div className="header-controls">
        {/* UI 스케일 컨트롤 (U-028→U-037: Readable 제거) */}
        <UIControls
          uiScale={uiScale}
          onIncreaseScale={onIncreaseScale}
          onDecreaseScale={onDecreaseScale}
        />
        <div className="economy-hud">
          <span className="icon-wrapper signal-icon" aria-label="Signal">
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
          <span className="currency-value">Signal: {signal}</span>
          <span className="icon-wrapper shard-icon" aria-label="Memory Shard">
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
          <span className="currency-value">Shard: {memoryShard}</span>
        </div>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? '' : 'offline'}`} />
          <span>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// 메인 App 컴포넌트
// =============================================================================

function App() {
  // 상태
  const [inputText, setInputText] = useState('');
  const turnCountRef = useRef(0);
  const [narrativeEntries, setNarrativeEntries] = useState<NarrativeEntry[]>([
    { turn: 0, text: '미지의 세계에 오신 것을 환영합니다...' },
  ]);
  const [actionCards, setActionCards] = useState<ActionCard[]>([]);
  const [economy, setEconomy] = useState({ signal: 100, memory_shard: 5 });
  const [isConnected, setIsConnected] = useState(true);

  // Scene Canvas 상태 (U-031: Placeholder Pack)
  const [sceneState, setSceneState] = useState<SceneCanvasState>({
    status: 'default',
    message: '전역 데이터 동기화 대기 중...',
  });

  // Agent Store 액션
  const {
    startStream,
    handleStage,
    handleBadges,
    handleNarrativeDelta,
    handleFinal,
    handleError,
    completeStream,
    isStreaming,
    narrativeBuffer,
  } = useAgentStore();

  // UI Prefs Store (U-028→U-037: Readable 모드 제거)
  const { uiScale, increaseUIScale, decreaseUIScale } = useUIPrefsStore();

  // DOM에 UI 설정 적용 (U-028→U-037)
  useEffect(() => {
    applyUIPrefsToDOM({ uiScale });
  }, [uiScale]);

  // 취소 함수 ref
  const cancelStreamRef = useRef<(() => void) | null>(null);

  /**
   * TurnOutput을 받아 UI 상태를 업데이트합니다.
   */
  const applyTurnOutput = useCallback((output: TurnOutput) => {
    // 내러티브 추가
    turnCountRef.current += 1;
    const newTurn = turnCountRef.current;
    setNarrativeEntries((entries) => [...entries, { turn: newTurn, text: output.narrative }]);

    // 액션 카드 업데이트
    if (output.ui.action_deck.cards.length > 0) {
      setActionCards(output.ui.action_deck.cards);
    }

    // 경제 상태 업데이트 (RULE-005: 잔액 반영)
    setEconomy({
      signal: output.economy.balance_after.signal,
      memory_shard: output.economy.balance_after.memory_shard,
    });
  }, []);

  /**
   * 턴을 실행합니다.
   */
  const executeTurn = useCallback(
    (text: string, cardId?: string) => {
      if (isStreaming) return;

      // 입력 데이터 생성
      const turnInput: TurnInput = {
        language: 'ko-KR',
        text: text || (cardId ? `카드 선택: ${cardId}` : ''),
        click: null,
        client: {
          viewport_w: window.innerWidth,
          viewport_h: window.innerHeight,
          theme: 'dark',
        },
        economy_snapshot: economy,
      };

      // Agent Store 시작
      startStream();

      // Scene Canvas를 로딩 상태로 전환 (U-031)
      setSceneState({ status: 'loading', message: '데이터 동기화 중...' });

      // 스트림 콜백 설정
      const callbacks: StreamCallbacks = {
        onStage: handleStage,
        onBadges: handleBadges,
        onNarrativeDelta: handleNarrativeDelta,
        onFinal: (event) => {
          handleFinal(event);
          applyTurnOutput(event.data);
        },
        onError: (event) => {
          handleError(event);
          setIsConnected(false);
          // Scene Canvas를 오프라인/에러 상태로 전환 (U-031)
          const errorCode = event.code;
          if (errorCode === 'SAFETY_BLOCKED') {
            setSceneState({ status: 'blocked', message: event.message });
          } else if (errorCode === 'INSUFFICIENT_BALANCE') {
            setSceneState({ status: 'low_signal', message: event.message });
          } else {
            setSceneState({ status: 'offline', message: event.message });
          }
        },
        onComplete: () => {
          completeStream();
          // Scene Canvas를 기본 상태로 복원 (U-031)
          // TODO: TurnOutput에 scene.imageUrl이 있으면 scene 상태로 전환
          setSceneState({ status: 'default', message: '' });
        },
      };

      // 스트림 시작
      cancelStreamRef.current = startTurnStream(turnInput, callbacks);
      setInputText('');
    },
    [
      isStreaming,
      economy,
      startStream,
      handleStage,
      handleBadges,
      handleNarrativeDelta,
      handleFinal,
      handleError,
      completeStream,
      applyTurnOutput,
    ],
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

  // 컴포넌트 언마운트 시 스트림 취소
  useEffect(() => {
    return () => {
      cancelStreamRef.current?.();
    };
  }, []);

  return (
    <>
      {/* CRT 스캔라인 오버레이 */}
      <div className="crt-overlay" aria-hidden="true" />

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
          <Panel title="Inventory" className="flex-1">
            <p className="panel-placeholder">[ 드래그 앤 드롭 영역 ]</p>
          </Panel>
          <Panel title="Quest">
            <p className="panel-placeholder">[ 목표/퀘스트 목록 ]</p>
          </Panel>
          <Panel title="Rule Board">
            <p className="panel-placeholder">[ 월드 규칙/변형 타임라인 ]</p>
          </Panel>
        </aside>

        {/* Center: Scene Canvas + Narrative Feed */}
        <main className="game-center">
          <SceneCanvas state={sceneState} />
          <NarrativeFeed entries={narrativeEntries} streamingText={narrativeBuffer} />
        </main>

        {/* Sidebar Right: Agent Console / Memory Pin / Scanner */}
        <aside className="sidebar-right">
          <Panel title="Agent Console" className="flex-1" hasChrome>
            <AgentConsole />
          </Panel>
          <Panel title="Memory Pin" hasChrome>
            <p className="panel-placeholder">[ 고정된 기억/단서 ]</p>
          </Panel>
          <Panel title="Scanner" hasChrome>
            <div className="scanner-slot has-chrome">
              <p className="panel-placeholder">[ 이미지 업로드 슬롯 ]</p>
            </div>
          </Panel>
        </aside>

        {/* Footer: Action Deck + Command Input */}
        <footer className="game-footer">
          <ActionDeck cards={actionCards} onCardClick={handleCardClick} disabled={isStreaming} />
          <div className="command-input-area">
            <span className="command-prompt">&gt;</span>
            <input
              type="text"
              className="command-input"
              placeholder={isStreaming ? '처리 중...' : '명령을 입력하세요...'}
              aria-label="게임 명령 입력"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
            />
            <button type="button" onClick={handleSubmit} disabled={isStreaming}>
              {isStreaming ? 'WAIT' : 'EXECUTE'}
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
