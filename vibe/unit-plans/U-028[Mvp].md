# U-028[Mvp]: UI 가독성 패스(폰트 스케일/효과 토글/대비)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-028[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 45분        |
| 의존성    | U-004,U-008 |
| 우선순위  | High        |

## 작업 목표

현재 UI의 “작은 글씨/과한 CRT 효과”로 인한 가독성 문제를 해결하기 위해, **전역 UI 스케일(폰트)** 과 **Readable 모드(효과 완화)** 를 도입한다.

**배경**: 데모/플레이에서 텍스트가 읽히지 않으면 “시스템이 작동한다”는 증거(Agent Console/배지/퀘스트/경제)가 전달되지 않는다. CRT 미학은 유지하되, **가독성은 Hard Gate에 준하는 데모 품질**로 취급한다.

**완료 기준**:

- 전역 UI 스케일(예: 0.9/1.0/1.1/1.2)을 조절할 수 있고, 새로고침 후에도 설정이 유지된다(로컬 저장).
- Readable 모드 토글로 스캔라인/플리커/글로우 등 “읽기 방해 요소”가 완화되며, 기본 테마(다크)에서 시인성이 개선된다.
- 최소 글자 크기 가이드가 적용된다(예: Agent Console/배지/타임스탬프 같은 마이크로 텍스트가 너무 작지 않음).

## 영향받는 파일

**생성**:

- (권장) `frontend/src/stores/uiPrefsStore.ts` - UI 스케일/Readable 모드 상태 + persist(localStorage)

**수정**:

- `frontend/src/style.css` - 폰트/라인하이트/CRT 효과 토큰 및 Readable 모드 스타일 추가
- `frontend/src/App.tsx` - Header에 UI 스케일/Readable 토글(간단 버튼/토글) 추가, DOM에 설정 적용

**참조**:

- `vibe/prd.md` - 9.4 접근성/입력, 9.5 CRT 효과(상호작용 방해 금지), 6.7/6.8 데모 표면 요구
- `vibe/ref/frontend-style-guide.md` - CRT 테마 SSOT 규칙/톤
- `frontend/src/style.css` - 현재 `0.625rem~0.75rem` 기반 마이크로 텍스트 구간(Agent Console/배지 등)

## 구현 흐름

### 1단계: UI 설정(스케일/Readable) 상태 정의

- `uiScale`(number or enum)과 `readableMode`(boolean)를 정의한다.
- MVP에서는 로컬 저장(예: localStorage)으로 유지하고, SaveGame과의 통합은 후속 유닛에서 고려한다.

### 2단계: DOM 적용(SSOT: CSS 변수/데이터 속성)

- `html` 또는 `body`에 `data-ui-scale`, `data-readable` 같은 속성을 부여하거나,
- `--font-size-base`, `--glow-intensity`, `--crt-flicker` 같은 CSS 변수를 런타임에서 조절한다.

### 3단계: UI 컨트롤(헤더) 배치

- Header(`frontend/src/App.tsx`의 `GameHeader`)에 “A-/A+” 또는 드롭다운 형태로 스케일을 조절할 수 있게 한다.
- Readable 모드 토글을 추가한다(시각적으로는 버튼/스위치, 접근성은 `aria-pressed` 등으로 보완).

### 4단계: 마이크로 텍스트 기준 상향(선별 적용)

- `.agent-console-content`, `.badge-item`, `.narrative-timestamp` 등 작은 텍스트 영역을 중심으로,
  “너무 작은 rem 값”을 변수 기반(예: `--font-size-sm`)으로 올리고, Readable 모드에서 추가 상향한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - CRT 테마/고정 레이아웃 스켈레톤(CSS SSOT)
- **계획서**: [U-008[Mvp]](U-008[Mvp].md) - Agent Console(단계/배지/복구) 표시(가독성 영향 범위)

**다음 작업에 전달할 것**:

- U-009~U-015(핵심 UI)에서 사용할 “기본 타이포/가독성 토큰(SSOT)”
- U-029(nanobanana mcp 에셋)에서 아이콘/배지의 ‘읽힘’ 기준선(스케일/Readable 연동)

## 주의사항

**기술적 고려사항**:

- CRT 효과는 “미학”이지만, `pointer-events: none` 및 과도한 깜빡임/글로우로 가독성을 해치지 않게 한다. (PRD 9.5)
- RULE-002(채팅 UI 금지) 준수: 가독성 개선이 “채팅 버블/메신저 UI”로 변형되는 변경은 금지한다.

**잠재적 리스크**:

- 스케일을 과도하게 올리면 레이아웃이 깨질 수 있음 → 스케일 범위를 제한하고(예: 0.9~1.2), 브레이크포인트(768px)에서만 별도 보정한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: UI 설정(스케일/Readable) 저장 위치는 어디가 SSOT가 좋을까?
  - Option A: localStorage(persist) - MVP에서 빠르고 단순(권장)
  - Option B: SaveGame에 포함 - 세션/디바이스 간 일관(하지만 SaveGame/Reset 설계 영향)
  **A1**: Option B

## 참고 자료

- `vibe/prd.md` - 9.4 접근성/입력, 9.5 CRT 효과
- `vibe/ref/frontend-style-guide.md` - CRT 테마 스타일 가이드
- `frontend/src/style.css` - 타이포/효과 토큰(SSOT)

