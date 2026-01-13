# U-037[Mvp] CRT/가독성 레이어링 실행 가이드

## 1. 개요

Readable 모드를 제거하고, "식별성이 중요한 영역(critical)"과 "분위기/장식 영역(ambient)"으로 구분하여 CRT 분위기를 유지하면서 중요한 정보의 식별성/가독성을 개선한 구현입니다.

**주요 변경사항**:
- Readable 모드 토글/상태/DOM 속성(`data-readable`) 제거
- `critical`/`ambient` 중요도 기반 스타일 도입
- Scene Canvas 중심 CRT 분위기 (전역 오버레이 강도 약화)
- `prefers-reduced-motion` 접근성 가드 추가
- legacy localStorage 값 마이그레이션

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-028[Mvp], U-004[Mvp]
- 선행 완료 필요: 없음 (독립 실행 가능)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 즉시 실행

```bash
pnpm dev --port 8001
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- 성공 지표:
  - 헤더에 `A-`, `%`, `A+` 버튼만 있고 `READ` 버튼이 **없음**
  - CRT 스캔라인 효과가 Scene Canvas에 집중되어 보임
  - Agent Console, Economy HUD 텍스트가 읽힘

---

## 3. 핵심 기능 시나리오

### 시나리오 A: Readable 토글 제거 확인

**목적**: Readable 모드 UI가 제거되었는지 확인

**실행**:
1. `http://localhost:8001` 접속
2. 헤더 영역 확인

**기대 결과**:
- UI 컨트롤에 `A-`, 스케일 퍼센트, `A+` 버튼만 존재
- `READ` 또는 `○ READ`/`◉ READ` 버튼 없음

**확인 포인트**:
- ✅ Readable 토글 버튼이 헤더에 없음
- ✅ HTML에 `data-readable` 속성이 없음

---

### 시나리오 B: Critical 영역 가독성 확인

**목적**: 중요 정보 영역의 가독성 검증

**Critical 영역 기준** (U-037 재정의):
1. **박스/패널 내부** - 어두운 배경 위 텍스트
2. **마이크로 텍스트** - 0.75rem 이하 (배지, 비용, 타임스탬프 등)
3. **배경색 다양 영역** - 에러 박스, 경고 등

**Non-Critical (기본 CRT 스타일)**:
- 로고 "UNKNOWN WORLD" - 충분히 크고 밝음
- 패널 헤더/라벨 (INVENTORY, QUEST 등)
- 액션 카드 제목 (탐색하기, 조사하기 등)

**실행**:
1. Agent Console 패널 내부 텍스트 확인 (IDLE, Queue, Badges)
2. Action Deck 확인 (비용/위험 등급 - 작은 텍스트)
3. 패널 헤더 확인 (INVENTORY, QUEST 등 - 기본 스타일)

**기대 결과**:
- **Critical 영역**: 텍스트가 **즉시 읽힘** (희미하거나 흐릿하지 않음)
- **Non-Critical 영역**: CRT 분위기 유지 (글로우/글리치 효과 허용)

**확인 포인트**:
- ✅ Agent Console 내부 텍스트 (Parse, Validate 등) - Critical
- ✅ Action Card 비용/위험 (1 | low 등) - Critical
- ✅ 패널 헤더 (INVENTORY 등) - Non-Critical, CRT 스타일 유지

---

### 시나리오 C: CRT 분위기 유지 확인 (Scene Canvas 중심)

**목적**: Scene Canvas에 CRT 분위기가 집중되는지 확인

**실행**:
1. Scene Canvas 영역(중앙) 관찰
2. 스캔라인 효과 확인

**기대 결과**:
- Scene Canvas에 스캔라인 효과 visible
- 전역 CRT 오버레이는 약하게 적용됨 (opacity 0.3)
- 사이드바/헤더/푸터는 상대적으로 덜 "지글거림"

**확인 포인트**:
- ✅ Scene Canvas에 스캔라인 표시됨
- ✅ UI 텍스트 영역은 CRT 효과가 방해하지 않음

---

### 시나리오 D: Legacy localStorage 마이그레이션

**목적**: 기존 `readableMode` 저장값이 있어도 앱이 깨지지 않는지 확인

**실행**:

1. 브라우저 개발자 도구(F12) → Console 탭
2. 다음 코드 실행:

```javascript
localStorage.setItem('unknown-world-ui-prefs', JSON.stringify({
  state: { uiScale: 0.9, readableMode: true },
  version: 0
}));
location.reload();
```

**기대 결과**:
- 페이지가 정상 로드됨
- UI 스케일이 90%로 복원됨
- `readableMode`는 무시됨 (READ 버튼 없음)

**확인 포인트**:
- ✅ 에러 없이 페이지 로드
- ✅ 스케일 표시가 90%
- ✅ READ 버튼 없음

---

### 시나리오 E: prefers-reduced-motion 접근성 가드

**목적**: OS 설정에서 "동작 줄이기" 옵션이 켜져 있을 때 플리커/애니메이션이 비활성화되는지 확인

**실행**:

방법 1 - Chrome DevTools:
1. 개발자 도구(F12) → Rendering 탭
2. "Emulate CSS media feature prefers-reduced-motion" → "reduce" 선택

방법 2 - 수동 CSS 주입 (Console에서):
```javascript
const style = document.createElement('style');
style.textContent = `
  @media (prefers-reduced-motion: reduce) {
    .crt-overlay, .scene-canvas::after { animation: none !important; }
    .glitch::before, .glitch::after { animation: none !important; opacity: 0 !important; }
  }
`;
document.head.appendChild(style);
```

**기대 결과**:
- CRT 플리커 애니메이션 정지
- 글리치 효과 비활성화
- UI 기능(버튼 클릭, 스크롤 등)은 정상 동작

**확인 포인트**:
- ✅ 플리커 애니메이션 없음
- ✅ 타이틀 글리치 효과 없음 (깔끔한 텍스트)
- ✅ UI 클릭/인터랙션 정상

---

## 4. 실행 결과 확인

### 4.1 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/stores/uiPrefsStore.ts` | `readableMode` 제거, legacy 마이그레이션 |
| `frontend/src/App.tsx` | Readable 토글 UI 제거 |
| `frontend/src/style.css` | Readable CSS 제거, critical/ambient 토큰, 접근성 가드 |
| `frontend/src/components/AgentConsole.tsx` | `data-ui-importance="critical"` 마킹 |

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ Readable 토글 UI가 헤더에서 제거됨
- ✅ `html[data-readable]` DOM 속성이 더 이상 설정되지 않음
- ✅ Critical 영역(Agent Console/Economy HUD/Action Deck)의 텍스트가 읽힘
- ✅ Scene Canvas에 CRT 스캔라인 효과가 유지됨
- ✅ Legacy localStorage 값으로 앱이 깨지지 않음
- ✅ `prefers-reduced-motion: reduce` 환경에서 애니메이션 비활성화

**실패 시 확인**:
- ❌ READ 버튼이 보임 → `App.tsx`의 `UIControls` 컴포넌트 확인
- ❌ 텍스트 가독성 저하 → `style.css`의 `[data-ui-importance="critical"]` 확인
- ❌ CRT 효과 없음 → `.crt-overlay`, `.scene-canvas::after` CSS 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `Property 'readableMode' does not exist on type 'UIPrefsStore'`
- **원인**: 테스트 파일이 업데이트되지 않음
- **해결**: `frontend/src/stores/uiPrefsStore.test.ts` 파일에서 `readableMode` 관련 테스트 제거

**오류**: Legacy localStorage로 앱 크래시
- **원인**: 마이그레이션 로직 누락
- **해결**: `uiPrefsStore.ts`의 `migrate` 함수 확인

### 5.2 환경별 주의사항

- **Windows**: 특이사항 없음
- **macOS/Linux**: 특이사항 없음
- **prefers-reduced-motion 테스트**: Chrome DevTools의 Rendering 탭에서 에뮬레이션 가능

---

## 6. 다음 단계

- U-038[Mvp]: 아이콘 v2 에셋 패스 (critical 영역 아이콘 적용)
- U-032[Mvp]: Chrome Pack 장식 (ambient 영역 적용)
