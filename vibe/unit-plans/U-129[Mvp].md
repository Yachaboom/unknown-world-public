# U-129[Mvp]: 아이템 판매 직관적 UX 개선

## 메타데이터

| 항목      | 내용                                                 |
| --------- | ---------------------------------------------------- |
| Unit ID   | U-129[Mvp]                                           |
| Phase     | MVP                                                  |
| 예상 소요 | 40분                                                 |
| 의존성    | U-096[Mvp], U-088[Mvp]                               |
| 우선순위  | Medium (경제 루프 완성 + 게임 체감 향상)             |

## 작업 목표

인벤토리 아이템 판매를 **항상 접근 가능하고 직관적으로** 만들어, 재화 부족 시뿐만 아니라 언제든지 불필요한 아이템을 정리하고 Signal을 획득할 수 있게 한다.

**배경**: 현재 판매(Sell) 버튼은 `isBalanceLow === true`일 때만 표시되어, 잔액이 충분할 때는 아이템을 팔 수 없다. 이는 "인벤토리가 가득 찬 상황"이나 "전략적으로 아이템을 정리하고 싶은 상황"에서 판매 경로가 막히게 된다. 또한 판매 버튼이 Row 내부에 있어 발견하기 어려울 수 있다. 판매를 항상 가능하게 하고, 확인 절차를 추가하여 실수 판매를 방지해야 한다.

**완료 기준**:

- 아이템 Row에 **항상 노출되는 판매 버튼**(또는 스와이프/길게 누르기 제스처)이 제공된다.
- 잔액 상태와 무관하게 아이템을 판매할 수 있다.
- 판매 시 **확인 절차**(인라인 확인 또는 짧은 딜레이)가 포함되어 실수 판매를 방지한다.
- 판매 가격(Signal)이 아이템 Row에 미리 표시되어 사용자가 보상을 예측할 수 있다.
- 판매 애니메이션(페이드아웃 + Signal 획득 피드백)이 자연스럽게 작동한다.
- i18n 정책(RULE-006) 준수.

## 영향받는 파일

**수정**:

- `frontend/src/components/InventoryPanel.tsx` - `showSellButton` 조건을 `isBalanceLow`에서 **항상 `true`**로 변경. 판매 확인 UI(인라인 컨펌) 추가.
- `frontend/src/components/InventoryItem.tsx` - (존재 시) 판매 버튼 위치/크기 조정, 판매 가격 라벨 표시
- `frontend/src/style.css` - 판매 버튼 항상 노출 스타일, 확인 상태 스타일, 판매 가격 라벨
- `frontend/src/locales/ko-KR/translation.json` - `inventory.sell_confirm`, `inventory.sell_price` 키 추가/수정
- `frontend/src/locales/en-US/translation.json` - 동일 키 영문 추가/수정

**참조**:

- `frontend/src/stores/worldStore.ts` - `sellItem()` 함수 (기존 판매 로직)
- `frontend/src/save/constants.ts` - `ITEM_SELL_PRICE_SIGNAL = 5` (판매 가격 상수)
- `vibe/unit-results/U-096[Mvp].md` - 아이템 소비 로직
- `vibe/unit-results/U-088[Mvp].md` - 인벤토리 Row 레이아웃

## 구현 흐름

### 1단계: 판매 버튼 항상 노출

- `InventoryPanel.tsx`에서 `showSellButton={isBalanceLow}` 조건을 `showSellButton={true}`로 변경한다.
- 판매 버튼은 Row 우측에 컴팩트하게 배치한다 (아이콘 + 가격 라벨).
- 드래그 중(`isDragging`)이거나 소비 중(`isConsuming`)일 때는 기존처럼 숨긴다.

### 2단계: 판매 가격 미리보기

- 판매 버튼 옆에 `+${ITEM_SELL_PRICE_SIGNAL} Signal` 라벨을 표시한다.
- 아이콘(Signal 아이콘) + 숫자로 간결하게 표현한다.
- 가격은 `constants.ts`의 `ITEM_SELL_PRICE_SIGNAL`을 참조한다.

### 3단계: 판매 확인 절차 (인라인 컨펌)

- 판매 버튼 클릭 시 즉시 판매하지 않고, **인라인 확인 상태**로 전환한다:
  - 버튼 텍스트가 "판매" → "확인?" 으로 변경 (또는 색상 변화)
  - 2초 내에 다시 클릭하면 판매 실행
  - 2초 경과 또는 다른 곳 클릭 시 원래 상태로 복귀
- 이 방식은 모달/팝업 없이도 실수 판매를 효과적으로 방지한다.

### 4단계: 판매 피드백 강화

- 기존 `sellItem()` 호출 후:
  - 아이템 Row에 페이드아웃 애니메이션 (수량 감소 시)
  - Signal 획득 토스트 알림 (기존 로직 활용)
  - 거래 장부(ledger)에 판매 기록 추가 (기존 로직 활용)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-096[Mvp]](../unit-results/U-096[Mvp].md) - 아이템 소비(삭제) 로직, 페이드아웃 애니메이션
- **결과물**: [U-088[Mvp]](../unit-results/U-088[Mvp].md) - 인벤토리 Row 레이아웃, 아이템 표시 구조

**다음 작업에 전달할 것**:

- CP-MVP-03: 데모 루프에서 "아이템 판매 → Signal 획득 → 재화 사용" 경제 루프 검증
- U-079: 재화 부족 시 대안 제공 경로에서 "아이템 판매로 Signal 확보" 안내와 연계

## 주의사항

**기술적 고려사항**:

- (RULE-005) 판매 로직은 기존 `worldStore.sellItem()`을 그대로 활용한다. 거래 장부(ledger) 기록과 잔액 갱신은 이미 구현되어 있다.
- (PRD 6.7) 인벤토리 DnD와 판매 버튼이 같은 Row에 있으므로, 드래그 시작과 판매 클릭이 충돌하지 않도록 주의한다 (`activationConstraint: { distance: 5 }` 이미 적용됨).
- (RULE-006) 판매 확인 메시지, 가격 라벨 등 모든 문구는 i18n 키로 관리한다.

**잠재적 리스크**:

- 판매 버튼이 항상 보이면 실수 클릭이 증가할 수 있음 → 인라인 컨펌 (2단계 클릭)으로 방지
- 아이템이 1개뿐인데 판매하면 인벤토리가 비게 됨 → 수량이 0이 되면 Row 자체를 제거하는 기존 로직 활용

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 판매 확인 방식은?
  - Option A: **인라인 컨펌** (버튼 텍스트 변경 + 2초 타이머, 권장)
  - Option B: **스와이프 제스처** (좌로 스와이프하면 판매 버튼 노출, 모바일 친화적이나 구현 복잡)
  - Option C: **길게 누르기** (0.5초 홀드 시 판매 실행, 터치 환경 적합)

## 참고 자료

- `frontend/src/stores/worldStore.ts` - `sellItem()` 함수
- `frontend/src/save/constants.ts` - `ITEM_SELL_PRICE_SIGNAL`
- `frontend/src/components/InventoryPanel.tsx` - 현재 판매 버튼 조건부 표시 로직
- `vibe/prd.md` 5.3~5.5 - 재화 획득/소비 정책
