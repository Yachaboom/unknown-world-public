# RU-003[Mvp]: 리팩토링 - UI 상태 슬라이스/경계 정리

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | RU-003[Mvp] |
| Phase     | MVP         |
| 예상 소요 | 45분        |
| 의존성    | U-012       |
| 우선순위  | High        |

## 작업 목표

액션덱/핫스팟/인벤토리 DnD가 추가되며 커지는 UI/상태 코드를 **슬라이스(도메인별 store)로 분리**하고, 컴포넌트 경계를 정리해 이후 기능 추가가 “채팅 UI로 퇴행”하지 않게 만든다.

**배경**: 데모 표면은 고정되어야 하며, 상태/렌더 경계가 흐리면 기능 추가 시 UI가 쉽게 망가진다. (RULE-002)

**완료 기준**:

- Zustand store가 최소한 `agent`, `world`, `ui`(선택) 등으로 분리/정리되어 책임이 명확하다.
- SceneCanvas/Inventory/ActionDeck이 TurnOutput→상태 반영 흐름을 공유하되, 중복 파싱/중복 상태가 줄어든다.
- UI/스타일이 단일 `style.css` 원칙을 유지하며, 패널/레이아웃이 고정된 상태로 유지된다. (Frontend Style)

## 영향받는 파일

**생성**:

- `frontend/src/stores/` 내 슬라이스 파일들(예: `worldStore.ts`, `uiStore.ts` 등) - 구조 정리 목적

**수정**:

- `frontend/src/App.tsx` - store 연결/컴포넌트 조립 방식 정리
- `frontend/src/components/ActionDeck.tsx` - props/state 경계 정리
- `frontend/src/components/SceneCanvas.tsx` - props/state 경계 정리
- `frontend/src/components/InventoryPanel.tsx` - props/state 경계 정리

**참조**:

- `vibe/tech-stack.md` - Zustand 버전/역할
- `vibe/ref/frontend-style-guide.md` - 단일 CSS/레이아웃 원칙
- `.cursor/rules/10-frontend-game-ui.mdc` - 게임 UI 고정 규칙

## 구현 흐름

### 1단계: 상태 도메인(책임) 재정의

- `agent`: queue/badges/repair/연결 상태
- `world`: TurnOutput 기반의 world delta/인벤토리/퀘스트/룰 등
- `ui`: 패널 토글/선택 상태/드래그 상태(필요 시)

### 2단계: TurnOutput 반영 경로 단일화

- TurnOutput 수신 후 “상태 반영 함수(reducer)”를 한 곳으로 모은다(중복 파싱 제거).
- 컴포넌트는 store selector를 통해 필요한 최소 데이터만 구독한다.

### 3단계: UI 고정/금지사항 회귀 방지

- 컴포넌트 명/레이아웃이 Chat/Message 중심으로 변하지 않도록 네이밍/구조를 정리한다.
- CSS는 `style.css`에만 추가하고, 컴포넌트별 임의 색상/스타일을 줄인다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-009[Mvp]](U-009[Mvp].md) - Action Deck
- **계획서**: [U-010[Mvp]](U-010[Mvp].md) - Hotspot overlay
- **계획서**: [U-011[Mvp]](U-011[Mvp].md) - Inventory DnD
- **계획서**: [U-012[Mvp]](U-012[Mvp].md) - 드롭→턴 실행 연결

**다음 작업에 전달할 것**:

- CP-MVP-02에서 확인할 “안정된 클릭/드래그 UI” 기반
- U-013~U-015(퀘스트/룰/세이브/데모프로필) 확장 시 상태/렌더 경계 재사용

## 주의사항

**기술적 고려사항**:

- 리팩토링 유닛은 기능 추가가 아니라 **경계/중복/복잡도 감소**가 목적이다(Behavior Preservation).
- i18n 키/리소스 구조는 U-039(프론트 i18n JSON 구조)을 따른다. RU-003에서는 하드코딩 문자열이 늘어나지 않도록 경계를 세운다. (RULE-006)

**잠재적 리스크**:

- 구조를 너무 일찍 과도하게 추상화하면 속도가 느려짐 → “중복 제거/책임 분리” 수준까지만 수행한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: Zustand 구성 방식을 어떻게 고정할까?
  - Option A: 도메인별 store 파일 분리(권장: 책임/테스트 용이)
  - Option B: 단일 store + slice 패턴(초기 단순하지만 커지면 복잡)
  **A1**: Option A

## 참고 자료

- `vibe/tech-stack.md` - Zustand
- `vibe/ref/frontend-style-guide.md` - 단일 CSS/CRT 토큰
- `.cursor/rules/10-frontend-game-ui.mdc` - UI 고정/채팅 금지
