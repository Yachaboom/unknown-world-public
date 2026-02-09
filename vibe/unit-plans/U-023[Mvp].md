# U-023[Mvp]: Quest UI 개선 + Rule UI 제거 (좌측 사이드바 심플화)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-023[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 45분        |
| 의존성    | U-013       |
| 우선순위  | ⚡ Critical |

## 작업 목표

좌측 사이드바에서 **Rule UI(RuleBoard + MutationTimeline)를 완전 제거**하고, **Quest UI를 개선**하여 "겉도는 느낌"을 해소한다. 사이드바가 Inventory + Quest 2패널로 심플해지고, Quest가 게임 플레이와 밀접하게 연결되어 보이도록 한다.

**배경**: Rule UI(RuleBoard/MutationTimeline)는 데모에서 실질적 가치를 전달하지 못하며, 사이드바 공간만 차지한다. Quest UI는 존재하지만 게임과 분리된 느낌("겉도는")이 있어 심사자/사용자에게 임팩트가 부족하다.

**완료 기준**:

- Rule UI(RuleBoard + MutationTimeline) 패널이 사이드바에서 완전 제거된다.
- Quest UI가 더 눈에 띄고, 게임 진행과 연결된 느낌을 준다.
- 좌측 사이드바가 Inventory + Quest 2패널로 깔끔해진다.

## 영향받는 파일

**삭제**:

- `frontend/src/components/RuleBoard.tsx` — Rule 카드 표시 UI
- `frontend/src/components/MutationTimeline.tsx` — Rule 변형 타임라인 UI
- `frontend/src/components/RuleBoard.test.tsx` — 테스트
- `frontend/src/components/MutationTimeline.test.tsx` — 테스트

**수정**:

- `frontend/src/App.tsx` — `panel-rule-board` 패널 제거, `panel-inventory`에서 `flex-1` 유틸 클래스 제거, Quest 패널 레이아웃 조정
- `frontend/src/components/QuestPanel.tsx` — Quest UI 개선 (디자인/레이아웃 리뉴얼)
- `frontend/src/components/ObjectiveTracker.tsx` — 미니 트래커 개선 (선택)
- `frontend/src/style.css` — Rule 관련 스타일 제거, Quest 스타일 개선, 사이드바 레이아웃 조정
- `frontend/src/stores/worldStore.ts` — `activeRules`/`mutationTimeline` 상태 유지 (백엔드 데이터는 수신, UI만 제거)

**참조**:

- `vibe/prd.md` 6.7 — Quest/Objective Panel 요구
- `.cursor/rules/10-frontend-game-ui.mdc` — 좌측 사이드바 레이아웃

## 구현 흐름

### 1단계: Rule UI 제거

- `App.tsx`에서 `panel-rule-board` 패널 전체 제거 (RuleBoard + MutationTimeline import 포함)
- `style.css`에서 `.panel-rule-board`, `.rule-board-*`, `.rule-card-*`, `.mutation-timeline-*`, `.timeline-*` 관련 스타일 제거
- `RuleBoard.tsx`, `MutationTimeline.tsx` 파일 삭제 (테스트 파일 포함)
- **worldStore의 `activeRules`/`mutationTimeline` 상태는 유지** — 백엔드가 여전히 `rules_changed`를 보내므로, 데이터는 수신하되 UI만 없앰. MMP에서 다른 형태로 활용 가능.

### 2단계: Inventory + Quest 5:5 고정 비율 레이아웃

Rule 패널 제거 후 좌측 사이드바를 **Inventory : Quest = 5 : 5** 균등 분배로 재구성:

- **현재 문제**: Inventory는 `flex-1`(가변 확장), Quest는 `max-height: 200px`(고정 제한) → 불균형
- **변경 방향**:
  - `.panel-inventory`: `flex-1` 유틸 클래스 제거, `flex: 1; min-height: 0;` 적용
  - `.panel-quest`: `max-height: 200px` / `flex-shrink: 0` 제거, `flex: 1; min-height: 0;` 적용
  - 양쪽 `.panel-content`: `overflow-y: auto; scrollbar-width: thin;` 통일
  - `min-height: 0`은 flex 컨테이너 내부 스크롤이 정상 동작하기 위한 필수 설정
- **반응형(max-height: 768px)**: Quest `max-height: 150px` 제거, 동일하게 5:5 유지
- **CSS 변경 위치**: `style.css` 섹션 11.2 "좌측 사이드바 패널별 높이 전략" 전면 교체

```
/* 변경 전 */
.panel-inventory { min-height: 120px; }           /* flex-1 클래스로 가변 */
.panel-quest    { max-height: 200px; flex-shrink: 0; }  /* 고정 제한 */
.panel-rule-board { max-height: 200px; flex-shrink: 0; } /* 제거 대상 */

/* 변경 후 */
.panel-inventory { flex: 1; min-height: 0; }  /* 5:5 균등 */
.panel-quest     { flex: 1; min-height: 0; }  /* 5:5 균등 */
/* panel-rule-board 삭제 */
```

### 3단계: Quest UI 디자인 개선

"겉도는 느낌" 해소를 위한 구체적 개선:

1. **주 목표(Main Objective) 강화**:
   - 진행률 바를 더 시각적으로 눈에 띄게 (CRT 테마 glow 효과 활용)
   - 보상 미리보기를 Signal 아이콘과 함께 더 명확하게 표시
   - 완료 시 축하 애니메이션 강화

2. **서브 목표 체크리스트 개선**:
   - 완료 시 Signal 획득 애니메이션 (Economy HUD와 연동되는 느낌)
   - 체크박스를 더 게임스러운 아이콘으로 교체 (○/✓ → 커스텀)
   - 활성 서브 목표에 미묘한 pulse/glow로 "다음 할 일" 강조

3. **빈 상태("자유 탐색 중") 개선**:
   - 더 분위기 있는 아이콘/메시지로 교체
   - "이 세계를 탐험하세요" 같은 게임적 톤

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-013[Mvp]](U-013[Mvp].md) — Quest/Rule 데이터 모델 및 초기 UI

**다음 작업에 전달할 것**:

- CP-MVP-03에서 Quest UI가 데모 루프에서 자연스럽게 보이는지 검증
- 엔딩 리포트(U-025)에서 퀘스트 달성도를 참조할 때 Quest 데이터 활용

## 주의사항

**기술적 고려사항**:

- Rule 데이터(`activeRules`/`mutationTimeline`)는 store에 유지. 프롬프트에서 규칙 변형이 게임플레이에 영향을 주므로 **백엔드 로직은 그대로** — UI 표시만 제거.
- Quest UI 개선 시 CRT 테마 가이드(`vibe/ref/frontend-style-guide.md`)를 준수한다.
- ObjectiveTracker(상단 미니 트래커)는 유지하되, Quest 패널 개선과 시각적 일관성을 맞춘다.

**잠재적 리스크**:

- Rule UI 제거로 "규칙이 바뀐다"는 게임 메커닉이 덜 보일 수 있음 → 내러티브 피드에서 규칙 변형을 텍스트로 전달하는 것으로 충분. MMP에서 더 나은 형태로 재도입 가능.

## 페어링 질문 (결정 필요)

- [x] **Q1**: ObjectiveTracker(상단 미니 트래커)도 함께 개선할까, 그대로 둘까?
  - ✅ Option A: 함께 개선 — Quest 패널과 시각적 일관성 확보 (권장)
  - Option B: 그대로 — 범위 축소, 이후 별도 작업

## 참고 자료

- `vibe/prd.md` — Quest/Objective Panel 요구
- `vibe/ref/frontend-style-guide.md` — CRT 테마 가이드
- `.cursor/rules/10-frontend-game-ui.mdc` — 좌측 사이드바 레이아웃
