# U-023[Mvp]: Quest UI 개선 + Rule UI 제거 (좌측 사이드바 심플화) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-023[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-10 06:15
- **담당**: AI Agent

---

## 1. 작업 요약

좌측 사이드바의 Rule UI(Rule Board/Timeline)를 제거하고 Quest UI를 개선하여 사이드바 레이아웃을 Inventory + Quest 2패널로 단순화했습니다. Quest UI는 CRT glow 효과와 게임 친화적인 인터랙션을 강화하여 게임 플레이와의 연결성을 높였습니다.

---

## 2. 작업 범위

- **Rule UI 완전 제거**: `RuleBoard`, `MutationTimeline` 컴포넌트 및 관련 테스트, 스타일을 삭제하고 `App.tsx` 레이아웃에서 제거했습니다. (데이터 상태는 `worldStore`에 유지)
- **사이드바 5:5 레이아웃 구현**: Inventory와 Quest 패널이 사이드바를 5:5로 균등 점유하도록 `flex: 1; min-height: 0;` CSS 전략을 적용했습니다.
- **Quest UI 디자인 리뉴얼**:
  - 주 목표(Main Objective)에 CRT glow 애니메이션, 마젠타 강조색, 보상(Signal) 아이콘 가시성 강화.
  - 서브 목표(Sub-objective)에 다이아몬드형 체크 아이콘(`◆`/`◇`) 및 다음 할 일을 강조하는 Pulse 효과 적용.
  - 빈 상태(Free Exploration) 시 분위기 있는 배경 그라디언트와 애니메이션 메시지 추가.
- **ObjectiveTracker(미니 트래커) 동기화**: 상단 트래커 아이콘을 다이아몬드형으로 통일하고 스타일을 개선하여 시각적 일관성을 확보했습니다.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/App.tsx` | 수정 | Rule 패널 제거 및 사이드바 레이아웃 조정 |
| `frontend/src/components/QuestPanel.tsx` | 수정 | Quest UI 디자인 리뉴얼 및 애니메이션 추가 |
| `frontend/src/components/ObjectiveTracker.tsx` | 수정 | 미니 트래커 디자인 동기화 |
| `frontend/src/style.css` | 수정 | Rule 스타일 제거, 사이드바 5:5 레이아웃 및 Quest 스타일 강화 |
| `vibe/unit-runbooks/U-023-quest-ui-simplify-runbook.md` | 신규 | 유닛 검증 런북 |
| `frontend/src/components/RuleBoard.tsx` (및 .test.tsx) | 삭제 | Rule UI 컴포넌트 삭제 |
| `frontend/src/components/MutationTimeline.tsx` (및 .test.tsx) | 삭제 | Timeline UI 컴포넌트 삭제 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**레이아웃 전략 (Side-by-Side 5:5)**:
- `.panel-inventory`, `.panel-quest`에 `flex: 1; min-height: 0;`을 적용하여 화면 높이에 관계없이 균등하게 공간을 확보하고, 콘텐츠 초과 시 패널 내부 스크롤(`overflow-y: auto`)이 작동하도록 설계했습니다.

**시각적 일관성 (Visual Consistency)**:
- 퀘스트 상태 마커를 `◆`(진행/완료), `◇`(미완료) 다이아몬드 유니코드로 통일하여 레트로 게임 감성을 강화하고 ObjectiveTracker와 디자인을 맞췄습니다.

### 4.2 외부 영향 분석

- **데이터 유지**: UI는 제거되었으나 `worldStore`의 `activeRules`와 `mutationTimeline` 상태는 보존됩니다. 이는 백엔드에서 전송되는 규칙 변형 데이터가 내러티브에 여전히 영향을 주기 때문입니다.
- **UI 접근성**: CRT glow 및 Pulse 효과는 `prefers-reduced-motion` 환경에서 정적 요소로 대체되도록 가이드라인을 준수했습니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-023-quest-ui-simplify-runbook.md`
- **실행 결과**: Rule UI 제거 확인, 5:5 레이아웃 작동 확인, Quest UI 시각 효과(Glow/Pulse) 및 ObjectiveTracker 동기화 검증 완료.

---

## 6. 리스크 및 주의사항

- **Rule 시인성 감소**: Rule UI 제거로 규칙 변형을 시각적으로 즉시 확인하기 어려워졌으나, 이는 내러티브 피드(Narrative Feed)의 텍스트 메시지로 대체하여 충분히 전달 가능하다고 판단했습니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-025[Mvp]**: 엔딩 리포트 및 리플레이 하네스 구현 (Quest 달성도 데이터 활용)
2. **CP-MVP-03**: 10분 데모 루프에서 개선된 Quest UI 임팩트 확인

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인 (Rule 컴포넌트 삭제 확인)
- [x] 사이드바 5:5 레이아웃 및 스크롤 작동 확인
- [x] ObjectiveTracker 시각적 일관성 동기화 완료

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
