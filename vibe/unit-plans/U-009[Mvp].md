# U-009[Mvp]: Action Deck(카드+비용/대안)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-009[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-004,U-008 |
| 우선순위  | ⚡ Critical |

## 작업 목표

턴 결과(TurnOutput)로부터 **Action Deck(3~6장 카드)** 을 렌더링하고, 카드 클릭으로 다음 턴 실행까지 연결한다(채팅 선택지가 아니라 “게임 카드”).

**배경**: PRD는 심사자 오해 방지를 위해 “Action Deck(비용/위험/보상 포함)”을 데모 표면에 상시 노출하라고 요구한다. (PRD 6.7, RULE-002)

**완료 기준**:

- Footer 영역에 Action Deck이 상시 노출되고, 카드가 3~6장으로 렌더링된다.
- 각 카드에 **예상 비용(최소/최대)** 과 위험/보상 힌트가 표기된다. (RULE-005)
- 카드 클릭 시 TurnInput으로 “선택된 행동”이 전송되고, HTTP Streaming(Queue/Badges)이 갱신된다. (RULE-008)

## 영향받는 파일

**생성**:

- `frontend/src/components/ActionDeck.tsx` - 카드 UI(비용/위험/보상/대안 표기)
- `frontend/src/stores/actionDeckStore.ts` - (선택) Action Deck 상태/선택 저장

**수정**:

- `frontend/src/App.tsx` - Action Deck 배치 및 클릭→turn 실행 연결
- `frontend/src/style.css` - 카드 레이아웃/호버/비활성 스타일(단일 CSS)

**참조**:

- `vibe/prd.md` 6.7 - Action Deck 요구사항(3~6장, 비용/위험/보상)
- `.cursor/rules/10-frontend-game-ui.mdc` - Action Deck 비용/대안 표기
- `.cursor/rules/00-core-critical.mdc` - RULE-002/005/008

## 구현 흐름

### 1단계: TurnOutput → Action Deck 렌더 모델 연결

- Zod 스키마(U-006)의 Action Deck 구조를 기준으로 카드 렌더링 모델을 정한다.
- 카드 필수 필드(라벨/비용추정/위험/보상/대안)를 정리한다.

### 2단계: 카드 UI(게임 카드) 구현

- 카드 수는 3~6장으로 고정하고, “메시지 버튼”처럼 보이지 않도록 카드 스타일을 적용한다.
- 잔액 부족 시 실행 불가를 명확히 표시하고, 대체 행동(저비용/텍스트-only)을 덱에 함께 노출한다. (RULE-005)

### 3단계: 카드 클릭 → TurnInput 실행 연결

- 카드 클릭 시 TurnInput에 `action_id`(또는 동등 식별자)를 포함해 `/api/turn`을 호출한다.
- 호출 중에는 Agent Console에 단계/배지 업데이트가 보이도록 U-008 흐름을 그대로 사용한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - 고정 HUD 레이아웃(footer 슬롯)
- **계획서**: [U-008[Mvp]](U-008[Mvp].md) - turn 실행/스트림 소비/Agent Console

**다음 작업에 전달할 것**:

- U-014(Economy HUD+Ledger)에서 “가용 잔액 vs 비용 추정” 표시를 강화할 기반
- CP-MVP-02에서 “클릭 조작” 핵심 데모 케이스로 사용

## 주의사항

**기술적 고려사항**:

- (RULE-002) Action Deck은 채팅 선택지 UI로 보이면 안 된다(버블/버튼 행 금지).
- (RULE-005) 비용은 “사전 표시 + 부족 시 대안 제공”이 기본 UX다.

**잠재적 리스크**:

- 카드가 “그냥 버튼 모음”처럼 보일 수 있음 → 카드 프레이밍(위험/보상/비용)을 강하게 넣고, HUD 레이아웃 내에 고정한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: “실행 가능 여부(affordable)” 판단을 어디서 할까?
  - Option A: 서버가 카드에 `enabled`/`disabled_reason`를 내려준다(권장: 일관성)
  - Option B: 클라이언트가 `balance_after`/현재 잔액으로 계산한다(초기 빠르지만 드리프트 위험)

## 참고 자료

- `vibe/prd.md` - 데모 표면(Action Deck) 요구
- `.cursor/rules/10-frontend-game-ui.mdc` - 카드 비용/대안 UX
- `.cursor/rules/00-core-critical.mdc` - RULE-002/005/008
