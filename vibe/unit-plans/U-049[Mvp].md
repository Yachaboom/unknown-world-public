# U-049[Mvp]: UI/UX - 레이아웃/스크롤 설계 개선(첫 화면 과도 스크롤 제거, 카드 내부 스크롤)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-049[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-004[Mvp],U-013[Mvp],U-014[Mvp] |
| 우선순위  | High        |

## 작업 목표

초기 레이아웃에서 불필요한 스크롤/중첩 스크롤이 발생해 “한눈에 보이지 않는” 문제를 줄이고, 특히 **재화(Economy) 패널은 카드 내부(거래 장부 리스트)만 스크롤**되도록 스크롤 전략을 정리한다.

**배경**: 현재 `frontend/src/style.css`에서 사이드바 컬럼(`.sidebar-right`)과 패널 콘텐츠(`.panel-content`) 모두 `overflow-y: auto`로 설정되어 중첩 스크롤이 생기기 쉽고, flex/grid 조합에서 `min-height: 0` 누락 시 “패널 내부가 아니라 컬럼 전체가 스크롤”되는 UX가 발생할 수 있다. (PRD 9.3, 사용자 피드백)

**완료 기준**:

- 기본 해상도(예: 1366x768)에서 우측 사이드바가 “컬럼 전체 스크롤”로 동작하지 않고, 필요한 경우 **패널 콘텐츠 단위**로 스크롤이 발생한다.
- Economy HUD는 잔액/비용 영역은 항상 보이고, 긴 거래 장부(ledger) 목록만 내부 스크롤로 처리된다(스크롤 포커스가 우측 컬럼 전체로 튀지 않음).
- 좌측 사이드바/중앙 영역도 동일 원칙(컬럼 자체 스크롤 최소화, 패널 콘텐츠 스크롤)으로 정리되어 중첩 스크롤이 감소한다.
- 키보드 포커스(탭) 및 스크롤 휠 동작이 예측 가능하고, 스크롤 컨테이너가 과도하게 중첩되지 않는다.

## 영향받는 파일

**생성**:

- 없음

**수정**:

- `frontend/src/style.css`
  - `.sidebar-left`, `.sidebar-right`, `.panel`, `.panel-content`의 flex/grid 스크롤 전략 정리(`min-height: 0` 포함)
  - Economy HUD의 ledger 영역(`.economy-ledger`, `.ledger-list` 등) 내부 스크롤 스타일 추가
  - (선택) `height: 100vh` → `100dvh` 보강(모바일 주소창/뷰포트 이슈 완화)
- `frontend/src/App.tsx`
  - (권장) Economy/Scanner/AgentConsole 패널에 식별용 `className`을 부여하여, 특정 패널 높이/스크롤을 안전하게 제어(예: `panel-economy`)
- `frontend/src/components/EconomyHud.tsx`
  - (필요 시) ledger 영역을 “고정 헤더 + 스크롤 리스트” 구조로 만들기 위한 래퍼/클래스 보강

**참조**:

- `vibe/prd.md` - 9.3(레이아웃/스크롤 원칙), 9.4(접근성)
- `frontend/src/components/Panel.tsx` - 패널 구조(`.panel-content` 스크롤)
- `frontend/src/components/EconomyHud.tsx` - 거래 장부(ledger) 렌더 구조

## 구현 흐름

### 1단계: 문제 재현/컨테이너 맵 작성

- 우측 사이드바에서 “컬럼 전체가 스크롤되는” 재현 조건을 확인한다(특히 Economy HUD의 원장 항목이 길어질 때).
- 스크롤 컨테이너를 정리한다:
  - 컬럼(사이드바) / 패널 / 패널 콘텐츠 / 리스트(ledger) 중 어디가 scroll을 가져야 하는지 결정.

### 2단계: flex/grid 스크롤 기본기 정리(min-height: 0)

- `.sidebar-right` 같은 flex 컨테이너에서 자식이 정상적으로 줄어들어 내부 스크롤이 동작하도록:
  - flex item(`.panel`, `.panel-content`)에 `min-height: 0`를 적용(권장 패턴).
- 컬럼 자체 `overflow-y: auto`는 제거/완화하고, 스크롤은 패널 콘텐츠/리스트로 수렴시킨다.

### 3단계: Economy HUD “카드 내부 스크롤” 구현

- Economy HUD에서 스크롤이 필요한 영역은 ledger 리스트로 한정한다:
  - 잔액/비용/대안 안내는 고정
  - ledger 리스트만 `max-height` + `overflow-y: auto`로 처리(또는 flex로 `1`을 부여)
- App 레이아웃에서 Economy 패널이 과도하게 커지지 않도록, 패널 단위 max-height/비율을 조정한다(필요 시 `panel-economy` 전용 CSS).

### 4단계: 수동 검증(UX)

- 마우스 휠 스크롤이 의도한 영역(ledger 리스트)에서만 발생한다.
- 우측 사이드바가 “전체 스크롤”을 만들지 않아, Agent Console/Scanner 패널이 항상 예측 가능한 위치에 유지된다.
- 1200px/768px 반응형 브레이크포인트에서도 스크롤 컨테이너가 폭증하지 않는다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - 고정 레이아웃 스켈레톤(그리드 기본)
- **계획서**: [U-014[Mvp]](U-014[Mvp].md) - Economy HUD 구조/요구사항
- **계획서**: [U-013[Mvp]](U-013[Mvp].md) - 사이드 패널(Quest/Rule Board) 기본 구조

**다음 작업에 전달할 것**:

- UI 폴리시/디자인 튜닝(U-050)에서 “레이아웃/스크롤”이 발목을 잡지 않는 안정적인 베이스
- CP-MVP-03(10분 데모 루프)에서 “UI가 답답해서 못 본다” 류의 회귀 감소

## 주의사항

**기술적 고려사항**:

- `overflow`와 `flex`가 섞일 때는 `min-height: 0`이 핵심이다(누락 시 “부모가 스크롤 컨테이너”가 되는 현상 발생).
- 스크롤바를 숨기기보다는 “스크롤을 어디에서 할지”를 명확히 하는 것이 우선이다(접근성/예측 가능성).

**잠재적 리스크**:

- 과도한 `max-height`/고정 높이는 작은 화면에서 정보 손실을 만들 수 있음 → 브레이크포인트별로 다른 규칙을 적용하거나, 리스트만 스크롤로 수렴한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: 우측 사이드바의 “유연 높이(flex-1)”는 어느 패널이 가져갈까?
  - Option A: Agent Console만 `flex: 1` (권장: 핵심 관측 패널 상시 확보)
  - Option B: Economy도 `flex: 1`로 확장(거래 장부 많이 볼 때 유리, 대신 콘솔이 줄어듦)
  **A1**: Option A

## 참고 자료

- `vibe/prd.md` - 9.3(레이아웃/스크롤 원칙), 9.4(접근성)
- `frontend/src/style.css` - `.sidebar-right`, `.panel-content` 스크롤 설정(현행)
