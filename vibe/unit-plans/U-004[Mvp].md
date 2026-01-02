# U-004[Mvp]: CRT 테마/고정 레이아웃 스켈레톤 (/frontend/src)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-004[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-002       |
| 우선순위  | ⚡ Critical |

## 작업 목표

채팅 UI가 아닌 “게임 화면”으로 보이도록, **고정 HUD 레이아웃 + CRT 테마 토큰**을 먼저 구현해 데모 표면을 고정한다.

**배경**: 심사/데모 실패의 가장 큰 위험은 “메신저처럼 보임”이며, PRD는 채팅 버블 UI를 명시적으로 금지한다. (RULE-002)

**완료 기준**:

- 화면에 최소 UI 구성요소(씬 캔버스, 액션덱, 인벤토리, 퀘스트, 룰보드, 경제 HUD, 에이전트 콘솔, 스캐너 슬롯)가 “자리”로 항상 존재한다.
- CRT 테마가 CSS 변수 기반(`style.css` 단일 파일)으로 적용된다. (Frontend Style Guide)
- 내러티브는 “채팅 버블”이 아니라 **게임 로그/내러티브 피드** 형태로 배치된다. (RULE-002)

## 영향받는 파일

**생성**:

- `frontend/src/components/layout/` - (선택) 패널/레이아웃 컴포넌트 분리 시 사용

**수정**:

- `frontend/src/App.tsx` - 고정 레이아웃(HEADER/CENTER/SIDE/FOOTER) 스켈레톤 구성
- `frontend/src/style.css` - CRT CSS 변수/오버레이/레이아웃 스타일 정의(단일 SSOT)
- `frontend/index.html` - 폰트 로드/`data-theme` 적용(필요 시)

**참조**:

- `vibe/prd.md` 6.7/6.8/9장 - 데모 표면 필수 UI, 채팅 UI 금지
- `vibe/ref/frontend-style-guide.md` - CRT 토큰, 단일 CSS, 기본 레이아웃
- `.cursor/rules/10-frontend-game-ui.mdc` - 고정 게임 UI/CRT/DnD/에이전트콘솔 규칙

## 구현 흐름

### 1단계: CRT 테마 토큰(변수) 확정

- `:root` CSS 변수로 `--bg-color`, `--text-color`, `--accent-color` 등을 정의한다.
- 오버레이(스캔라인/플리커)는 `pointer-events: none`으로 상호작용을 방해하지 않게 한다.

### 2단계: 고정 레이아웃 스켈레톤 구성

- Header: 타이틀/언어 토글/테마 토글/연결 상태/재화 HUD 자리
- Center: Scene Canvas 자리(이미지/핫스팟 오버레이는 U-010에서)
- Side: Inventory / Quest / Rule Board / Agent Console / Memory Pin / Scanner 자리
- Footer: Action Deck 자리 + (선택) 커맨드 입력 자리

### 3단계: “채팅처럼 보이지 않는” 내러티브 피드 배치

- 내러티브는 좌/우 버블 대신, 로그 리스트(턴 타임라인) 형태로 배치한다.
- 이후 U-008에서 SSE 스트리밍을 연결해도 UI가 채팅 UI로 퇴행하지 않게 구조를 고정한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-002[Mvp]](U-002[Mvp].md) - Vite+React+TS 실행 환경

**다음 작업에 전달할 것**:

- U-009~U-012에서 패널별 실제 기능(Action Deck/Hotspot/DnD)을 구현할 고정 UI 슬롯
- RU-001에서 “초기 레이아웃/스타일 규칙”을 SSOT(가이드/규칙)와 정합화할 기준선

## 주의사항

**기술적 고려사항**:

- (RULE-002) 채팅 버블/메신저 레이아웃 금지: “로그 피드 + 게임 HUD”로 고정한다.
- (Frontend Style) 스타일은 `frontend/src/style.css` 단일 파일 + CSS 변수로만 확장한다.

**잠재적 리스크**:

- 초기 레이아웃이 추후 기능 추가로 무너지거나, 임시 UI가 채팅처럼 보일 수 있음 → “패널 자리 고정 + 로그 피드”를 먼저 완성하고 이후 기능을 채운다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 레이아웃 구현을 어떤 방식으로 고정할까?
  - Option A: CSS Grid 기반(권장: 패널 고정/반응형 조절 용이)
  - Option B: Flex 기반(단순하지만 복잡한 고정 패널에서 유지보수 비용 증가)

## 참고 자료

- `vibe/prd.md` - 데모 표면(UI/동작) 요구
- `vibe/ref/frontend-style-guide.md` - CRT 스타일/레이아웃
- `.cursor/rules/10-frontend-game-ui.mdc` - 프론트 UI 규칙
