# U-013[Mvp]: Quest + Rule Board/Timeline 패널

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-013[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-004,U-008 |
| 우선순위  | Medium      |

## 작업 목표

Quest/Objective 패널과 Rule Board/Mutation Timeline 패널을 구현해, 플레이어가 “무엇을 해야 하는지/세계 규칙이 어떻게 바뀌는지”를 UI로 항상 확인할 수 있게 한다.

**배경**: PRD는 목표(Quest)와 룰 변형(Rule Mutation)이 UI로 체감되어야 한다고 명시한다. (PRD 6.4/6.7)

**완료 기준**:

- Quest 패널이 체크리스트 형태로 렌더되며, 턴 진행에 따라 상태(진행/완료)와 보상이 반영된다.
- Rule Board가 “현재 적용 중 규칙”을 카드로 노출하고, Mutation Timeline이 변형 이벤트를 시간 순으로 기록한다.
- 패널은 채팅 UI를 대체하지 않고, 고정 HUD 구성요소로 상시 노출된다. (RULE-002)

## 영향받는 파일

**생성**:

- `frontend/src/components/QuestPanel.tsx` - 목표/서브목표 렌더
- `frontend/src/components/RuleBoard.tsx` - 룰 카드 렌더
- `frontend/src/components/MutationTimeline.tsx` - 변형 이벤트 타임라인(선택: RuleBoard 내부로 포함 가능)

**수정**:

- `frontend/src/App.tsx` - 사이드 패널 슬롯에 Quest/RuleBoard 배치
- `frontend/src/style.css` - 패널/카드/타임라인 스타일(단일 CSS)

**참조**:

- `vibe/prd.md` 6.4/6.7 - 룰 변형/룰 보드/퀘스트 패널 요구
- `.cursor/rules/10-frontend-game-ui.mdc` - 고정 패널/채팅 금지

## 구현 흐름

### 1단계: TurnOutput → Quest/Rules 데이터 연결

- Zod 스키마 기준으로 Quest(목표/상태/보상)와 Rules(현재 규칙/변형 이벤트) 데이터 모델을 정한다.
- WorldState store에 “도메인 데이터”로 저장하고, 패널은 selector로 렌더한다(RU-003 기준).

### 2단계: 패널 UI 구현(상시 노출)

- Quest: 체크리스트(현재 목표/서브목표), 완료 시 보상 표시
- Rule Board: 룰 카드 리스트(활성 규칙)
- Timeline: 변형 이벤트를 최신순/시간순으로 표시(가독성 우선)

### 3단계: 데모 표면 연결(설득력 강화)

- 클릭/드래그 결과가 Quest/Rules 변화로 반영되는 흐름을 유지해, “세계가 변한다”가 UI로 증명되게 한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - 고정 레이아웃(사이드 패널 슬롯)
- **계획서**: [RU-003[Mvp]](RU-003[Mvp].md) - 상태/경계 정리

**다음 작업에 전달할 것**:

- U-015에서 데모프로필별 “초기 퀘스트/초기 룰” 프리셋을 구성할 기반
- CP-MVP-03(최종 데모 루프)에서 “룰 변형/퀘스트 진행” 증거로 사용

## 주의사항

**기술적 고려사항**:

- (RULE-002) 패널은 채팅 UI로 대체할 수 없다(상시 HUD).
- 변형 이벤트는 길어질 수 있으므로, 타임라인은 스크롤/요약 전략을 고려한다(MMP에서 고도화).

**잠재적 리스크**:

- 모델이 룰/퀘스트를 과도하게 생성해 패널이 난잡해질 수 있음 → 스키마 설계에서 개수 제한/요약 필드를 고려한다(추후).

## 페어링 질문 (결정 필요)

- [x] **Q1**: Mutation Timeline을 별도 컴포넌트로 둘까, RuleBoard에 포함할까?
  - Option A: RuleBoard 내 포함(단순)
  - Option B: 별도 Timeline 컴포넌트(권장: 가독성/확장 용이)
  **A1**: Option B

## 참고 자료

- `vibe/prd.md` - Quest/Rule Mutation 요구
- `.cursor/rules/10-frontend-game-ui.mdc` - 고정 패널 규칙
