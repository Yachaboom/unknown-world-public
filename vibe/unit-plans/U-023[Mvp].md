# U-023[Mvp]: Autopilot 모드 토글 + Goal 입력 + Plan/Queue UI

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-023[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 75분                              |
| 의존성    | U-008,U-013                       |
| 우선순위  | ⚡ Critical                        |

## 작업 목표

프론트에 Autopilot 모드(Manual/Assist/Autopilot) 토글과 Goal 입력을 제공하고, 에이전트가 수행하는 단계(Queue)/배지(Badges)를 “계획/작업 큐”로 시각화한다.

**배경**: PRD는 “Action Era”의 증거로 Goal→Plan→Subquests + Action Queue + Badges를 UI에서 상시 노출하라고 요구한다(단, 프롬프트/내부 추론은 비노출). (PRD 6.8, RULE-008)

**완료 기준**:

- UI에 Autopilot 토글(Manual/Assist/Autopilot)이 보이며 즉시 전환된다.
- Autopilot에서 Goal 입력 후, Plan/Queue UI가 업데이트되고 작업 단계가 진행 중임을 보여준다.
- 프롬프트 원문/내부 추론은 어디에도 노출되지 않고, 사용자 친화 라벨(단계/배지/모델 라벨)만 표시된다. (RULE-008)

## 영향받는 파일

**생성**:

- `frontend/src/components/AutopilotToggle.tsx` - 모드 토글 UI
- `frontend/src/components/GoalInput.tsx` - Goal 입력 UI
- `frontend/src/components/PlanPanel.tsx` - Goal/Plan/서브퀘스트 표시(최소)
- `frontend/src/stores/autopilotStore.ts` - autopilot 모드/goal/plan 상태(Zustand)

**수정**:

- `frontend/src/App.tsx` - 토글/Goal 입력/Plan 패널 배치 및 turn 실행 경로 연결
- `frontend/src/style.css` - 토글/플랜 카드 스타일
- `frontend/src/components/AgentConsole.tsx` - (필요 시) Plan/Queue 표시 확장

**참조**:

- `vibe/prd.md` 6.8 - Autopilot/Plan/Queue/Badges 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-008(관측/프롬프트 비노출)
- `.cursor/rules/10-frontend-game-ui.mdc` - Agent Console 상시 노출

## 구현 흐름

### 1단계: Autopilot 모드 모델/상태 정의

- `mode`: `manual | assist | autopilot`
- `goal`: 사용자 목표 텍스트
- `plan`: 플랜 카드/서브퀘스트(초기엔 최소 구조)

### 2단계: UI 추가(고정 패널/헤더 영역)

- 토글은 항상 보이게 두고, 모드 변경 시 UI 라벨/설명이 즉시 바뀌게 한다.
- Goal 입력은 autopilot 모드에서 활성화(또는 모든 모드에서 입력 가능 + autopilot에서만 실행).

### 3단계: turn 실행/스트리밍과 연결

- Goal 제출은 `/api/turn`에 TurnInput으로 전달하거나(간단), 별도 엔드포인트를 두는 방식(U-024에서 확정) 중 하나로 연결한다.
- Agent Console의 Queue/Badges가 “Autopilot 실행 중”에도 동일 계약으로 업데이트되게 한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-008[Mvp]](U-008[Mvp].md) - SSE 소비/Agent Console/배지
- **계획서**: [U-013[Mvp]](U-013[Mvp].md) - Quest/Rule 데이터 모델(Plan/서브퀘스트 표시와 연결)

**다음 작업에 전달할 것**:

- U-024에서 백엔드 autopilot 실행/큐 스트리밍을 구현할 프론트 UI/상태 기반
- CP-MVP-03에서 “Autopilot 데모” 시나리오의 사용자 조작 표면

## 주의사항

**기술적 고려사항**:

- (RULE-008) Plan/Queue는 “과정”만 노출: 프롬프트 원문/내부 추론/툴 호출 상세를 UI에 그대로 내보내지 않는다.
- Autopilot은 MVP에서는 “제한된 스텝/안전한 종료”를 전제로 한다(무한 실행 금지).

**잠재적 리스크**:

- Autopilot이 복잡해지면 데모 안정성이 떨어짐 → MVP는 “제한된 스텝 + 언제든 중단 가능”을 기본으로 둔다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: Plan 표시의 최소 단위는?
  - Option A: Goal 1개 + 서브퀘스트 체크리스트(권장: 단순/명확)
  - Option B: 더 세분화된 단계 카드(정보량↑, UI 복잡↑)

## 참고 자료

- `vibe/prd.md` - Autopilot/Plan/Queue/Badges
- `.cursor/rules/00-core-critical.mdc` - RULE-008


