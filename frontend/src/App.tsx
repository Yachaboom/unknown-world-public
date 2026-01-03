/**
 * 메인 App 컴포넌트
 *
 * RULE-002 준수: 채팅 버블 UI 금지
 * - 이 컴포넌트는 최소 컨테이너 형태로 유지
 * - U-004에서 CRT 테마 및 고정 게임 UI로 확장 예정
 */
function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Unknown World</h1>
      </header>
      <main className="app-main">
        <p>게임 UI가 여기에 렌더링됩니다.</p>
        <p className="status">⚡ 개발 환경 초기화 완료</p>
      </main>
    </div>
  );
}

export default App;
