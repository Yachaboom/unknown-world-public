# U-004 CRT 테마/고정 레이아웃 스켈레톤 실행 가이드

## 1. 개요

CRT 터미널 레트로 미학을 기반으로 한 게임 UI 레이아웃 스켈레톤을 구현했습니다. RULE-002(채팅 버블 UI 금지)를 준수하여, 내러티브는 "채팅"이 아닌 "게임 로그/턴 타임라인" 형태로 배치되었습니다.

**핵심 기능**:
- CSS Grid 기반 고정 레이아웃 (Header / Sidebar Left / Center / Sidebar Right / Footer)
- CRT 테마 토큰 (인광 녹색, 스캔라인 오버레이, 플리커 효과, 글리치 타이틀)
- 8개 고정 패널 슬롯 (Inventory, Quest, Rule Board, Scene Canvas, Agent Console, Memory Pin, Scanner, Action Deck)
- 반응형 디자인 (데스크톱 → 태블릿 → 모바일)

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-002[Mvp] (Vite+React+TS 실행 환경)
- 선행 완료 필요: U-002 런북 실행 완료

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 의존 유닛 확인

```bash
# Node.js 및 pnpm 버전 확인
node --version  # v24.x 이상
pnpm --version  # v10.x 이상
```

### 2.3 즉시 실행

```bash
pnpm dev --port 8001
```

### 2.4 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- 성공 지표:
  - 녹색 인광 CRT 테마 화면 표시
  - "UNKNOWN WORLD" 글리치 타이틀 표시
  - 3열 레이아웃 (좌 사이드바 / 중앙 / 우 사이드바)

---

## 3. 핵심 기능 시나리오

### 시나리오 A: CRT 테마 확인

**목적**: CRT 인광 녹색 테마와 스캔라인 효과 검증

**실행**:
1. 브라우저에서 `http://localhost:8001` 접속

**기대 결과**:
- 배경색: 거의 순수한 검정 (#0d0d0d)
- 텍스트: 인광 녹색 (#33ff00) + 글로우 효과
- 스캔라인 오버레이: 수평선이 화면 전체에 미세하게 보임
- 플리커 효과: 미세한 깜빡임 애니메이션

**확인 포인트**:
- ✅ 녹색 텍스트에 text-shadow 글로우 적용
- ✅ 스캔라인이 클릭을 방해하지 않음 (pointer-events: none)
- ✅ "UNKNOWN WORLD" 타이틀에 글리치 효과 적용

---

### 시나리오 B: 고정 레이아웃 패널 확인

**목적**: 8개 고정 UI 패널 슬롯 존재 검증 (RULE-002 준수)

**실행**:
1. 브라우저에서 화면 전체 레이아웃 확인

**기대 결과**:

| 영역 | 패널 | 상태 |
|------|------|------|
| Header | Economy HUD (Signal: 100), Connection Status (ONLINE) | 표시됨 |
| Sidebar Left | Inventory, Quest, Rule Board | 표시됨 |
| Center | Scene Canvas, Narrative Feed | 표시됨 |
| Sidebar Right | Agent Console, Memory Pin, Scanner | 표시됨 |
| Footer | Action Deck (4장 카드), Command Input | 표시됨 |

**확인 포인트**:
- ✅ 모든 패널이 "자리"로 항상 존재
- ✅ 채팅 버블 UI 없음 (RULE-002)
- ✅ 내러티브는 턴 타임라인 형태 ([TURN 1], [TURN 2], ...)

---

### 시나리오 C: Action Deck 호버 효과

**목적**: 액션 카드 인터랙션 검증

**실행**:
1. Footer의 "탐색하기" 카드에 마우스를 올림

**기대 결과**:
- 테두리 색상이 마젠타(#ff00ff)로 변경
- 카드 주변에 마젠타 글로우 효과

**확인 포인트**:
- ✅ 호버 시 시각적 피드백 제공
- ✅ 비용/위험 정보 표시 (예: "⚡ 1 Signal | ⚠ 낮음")

---

### 시나리오 D: 반응형 레이아웃 (태블릿)

**목적**: 1200px 이하에서 레이아웃 변화 검증

**실행**:
1. 브라우저 창 너비를 1200px 이하로 조절
2. 또는 개발자 도구에서 반응형 모드 활성화

**기대 결과**:
- Sidebar Left가 숨겨짐
- 2열 레이아웃 (Center + Sidebar Right)으로 변경

**확인 포인트**:
- ✅ 핵심 패널(Scene Canvas, Narrative Feed, Action Deck) 유지
- ✅ Agent Console/Scanner 접근 가능

---

### 시나리오 E: 반응형 레이아웃 (모바일)

**목적**: 768px 이하에서 레이아웃 변화 검증

**실행**:
1. 브라우저 창 너비를 768px 이하로 조절
2. 또는 개발자 도구에서 모바일 디바이스 선택 (예: iPhone SE)

**기대 결과**:
- 양쪽 사이드바 모두 숨겨짐
- 1열 레이아웃 (Header → Center → Footer)
- 폰트 크기 축소 (14px)

**확인 포인트**:
- ✅ Action Deck 카드가 가로 스크롤 가능
- ✅ Command Input 여전히 사용 가능
- ✅ Narrative Feed 가독성 유지

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: Vite 개발 서버 터미널 출력
- 정상 메시지:
  ```
  VITE v7.3.0  ready in XXX ms
  ➜  Local:   http://localhost:8001/
  ```

### 4.2 생성/수정 파일

| 파일 | 설명 |
|------|------|
| `frontend/src/style.css` | CRT 테마 토큰, 스캔라인 오버레이, Grid 레이아웃 |
| `frontend/src/App.tsx` | 고정 게임 UI 레이아웃 컴포넌트 |
| `frontend/index.html` | VT323 폰트 로드, data-theme 속성 |

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ CRT 녹색 테마가 전체 화면에 적용됨
- ✅ 스캔라인 오버레이가 표시되고 클릭을 방해하지 않음
- ✅ 8개 패널 슬롯이 모두 표시됨
- ✅ 채팅 버블 UI 없음 (RULE-002 준수)
- ✅ 반응형 레이아웃이 정상 동작함
- ✅ 린트/타입체크 오류 없음

**실패 시 확인**:
- ❌ 녹색 테마가 보이지 않음 → CSS 파일 import 확인 (`main.tsx`에서 `style.css` import)
- ❌ 폰트가 깨져 보임 → Google Fonts CDN 연결 확인 (VT323)
- ❌ 레이아웃이 무너짐 → 브라우저 개발자 도구에서 CSS Grid 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 폰트가 시스템 폰트로 표시됨

- **원인**: CDN 폰트 로드 실패 또는 @font-face 적용 안됨
- **해결**:
  1. 네트워크 연결 확인
  2. `index.html`에 Google Fonts 링크 존재 확인
  3. `style.css`에 `@font-face` 정의 확인

**오류**: 스캔라인 효과가 클릭을 방해함

- **원인**: `pointer-events: none` 미적용
- **해결**: `.crt-overlay` 스타일에 `pointer-events: none` 추가

**오류**: 반응형이 동작하지 않음

- **원인**: `viewport` 메타 태그 누락
- **해결**: `index.html`에 `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` 확인

### 5.2 환경별 주의사항

- **Windows**: NeoDunggeunmo 폰트가 CDN에서 로드되므로 로컬 설치 불필요
- **macOS/Linux**: 동일하게 동작

---

## 6. 다음 단계

이 유닛을 기반으로 다음 작업에서 패널별 실제 기능이 구현됩니다:
- U-009~U-012: Action Deck, Hotspot, Drag & Drop 등 인터랙션
- U-008: SSE 스트리밍 연결 시에도 UI가 채팅 형태로 퇴행하지 않도록 구조 유지

---

_마지막 업데이트: 2026-01-04_

