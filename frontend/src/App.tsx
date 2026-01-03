/**
 * Unknown World - 메인 게임 UI 레이아웃
 *
 * RULE-002 준수: 채팅 버블 UI 금지
 * - 내러티브는 "채팅"이 아니라 "게임 로그/내러티브 피드" 형태
 * - 고정 패널: Scene Canvas, Action Deck, Inventory, Quest,
 *   Rule Board, Economy HUD, Agent Console, Scanner Slot
 *
 * @see vibe/ref/frontend-style-guide.md
 * @see vibe/prd.md 6.7/6.8/9장
 */

/**
 * 패널 컴포넌트 - 공통 패널 레이아웃
 */
interface PanelProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <span className="panel-title">{title}</span>
      </div>
      <div className="panel-content">
        {children || <p className="panel-placeholder">[ 준비 중 ]</p>}
      </div>
    </div>
  );
}

/**
 * 내러티브 피드 - 게임 로그 형태 (채팅 버블 아님)
 * RULE-002: 좌/우 버블 대신 턴 타임라인으로 배치
 */
function NarrativeFeed() {
  const sampleEntries = [
    { turn: 1, text: '미지의 세계에 오신 것을 환영합니다...' },
    { turn: 2, text: '당신은 어둠 속에서 깨어났습니다.' },
    { turn: 3, text: '희미한 녹색 빛이 주변을 비추고 있습니다.' },
  ];

  return (
    <div className="narrative-feed">
      {sampleEntries.map((entry) => (
        <div key={entry.turn} className="narrative-entry">
          <span className="narrative-timestamp">[TURN {entry.turn}]</span>
          <span className="narrative-text">{entry.text}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * 액션 덱 - 선택 가능한 행동 카드들
 * PRD: 비용/위험/보상 표시
 */
function ActionDeck() {
  const sampleActions = [
    { id: 1, title: '탐색하기', cost: 1, risk: '낮음' },
    { id: 2, title: '조사하기', cost: 2, risk: '중간' },
    { id: 3, title: '대화하기', cost: 1, risk: '없음' },
    { id: 4, title: '이동하기', cost: 1, risk: '낮음' },
  ];

  return (
    <div className="action-deck">
      {sampleActions.map((action) => (
        <div key={action.id} className="action-card">
          <div className="action-card-title">{action.title}</div>
          <div className="action-card-cost">
            ⚡ {action.cost} Signal | ⚠ {action.risk}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 헤더 - 타이틀, 상태, 재화 HUD
 */
function GameHeader() {
  return (
    <header className="game-header">
      <h1 className="game-title glitch" data-text="UNKNOWN WORLD">
        UNKNOWN WORLD
      </h1>
      <div className="header-controls">
        <div className="economy-hud">
          <span className="signal-icon">⚡</span>
          <span>Signal: 100</span>
        </div>
        <div className="connection-status">
          <span className="status-indicator" />
          <span>ONLINE</span>
        </div>
      </div>
    </header>
  );
}

/**
 * 메인 App 컴포넌트
 * CSS Grid 기반 고정 레이아웃
 */
function App() {
  return (
    <>
      {/* CRT 스캔라인 오버레이 */}
      <div className="crt-overlay" aria-hidden="true" />

      {/* 게임 레이아웃 */}
      <div className="game-container">
        {/* Header: 타이틀/상태/재화 */}
        <GameHeader />

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
          <div className="scene-canvas">
            <div className="scene-placeholder">
              <p>[ Scene Canvas ]</p>
              <p className="text-dim">이미지 + 핫스팟 오버레이 영역</p>
            </div>
          </div>
          <NarrativeFeed />
        </main>

        {/* Sidebar Right: Agent Console / Memory Pin / Scanner */}
        <aside className="sidebar-right">
          <Panel title="Agent Console" className="flex-1">
            <p className="panel-placeholder">
              [ Plan / Queue / Badges ]
              <br />
              Parse → Validate → Plan → Resolve
            </p>
          </Panel>
          <Panel title="Memory Pin">
            <p className="panel-placeholder">[ 고정된 기억/단서 ]</p>
          </Panel>
          <Panel title="Scanner">
            <p className="panel-placeholder">[ 이미지 업로드 슬롯 ]</p>
          </Panel>
        </aside>

        {/* Footer: Action Deck + Command Input */}
        <footer className="game-footer">
          <ActionDeck />
          <div className="command-input-area">
            <span className="command-prompt">&gt;</span>
            <input
              type="text"
              className="command-input"
              placeholder="명령을 입력하세요..."
              aria-label="게임 명령 입력"
            />
            <button type="button">EXECUTE</button>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
