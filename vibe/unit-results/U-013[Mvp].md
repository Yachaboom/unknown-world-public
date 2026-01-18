# U-013[Mvp]: Quest + Rule Board/Timeline 패널 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-013[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-18 19:15
- **담당**: AI Agent

---

## 1. 작업 요약

플레이어가 현재 목표와 세계의 변화(규칙 변형)를 상시 확인할 수 있도록 `QuestPanel`, `RuleBoard`, `MutationTimeline` 컴포넌트를 구현하고 사이드 패널에 통합하였습니다.

---

## 2. 작업 범위

- [x] **QuestPanel 구현**: 현재/완료된 목표를 체크리스트 형태로 렌더링
- [x] **RuleBoard 구현**: 활성화된 세계 규칙을 카드 리스트로 렌더링
- [x] **MutationTimeline 구현**: 규칙 변형(추가/수정/삭제) 이벤트를 시간순으로 기록 및 표시
- [x] **상태 연동**: `worldStore`의 퀘스트 및 규칙 데이터를 구독하도록 구현
- [x] **레이아웃 통합**: `App.tsx` 사이드바 슬롯에 패널 배치
- [x] **i18n 적용**: 모든 UI 문자열에 다국어 리소스 적용

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/components/QuestPanel.tsx` | 신규 | 퀘스트(목표) 목록 표시 패널 |
| `frontend/src/components/RuleBoard.tsx` | 신규 | 활성 규칙 카드 목록 표시 패널 |
| `frontend/src/components/MutationTimeline.tsx` | 신규 | 규칙 변형 이벤트 타임라인 표시 패널 |
| `frontend/src/components/QuestPanel.test.tsx` | 신규 | QuestPanel 단위 테스트 |
| `frontend/src/components/RuleBoard.test.tsx` | 신규 | RuleBoard 단위 테스트 |
| `frontend/src/components/MutationTimeline.test.tsx` | 신규 | MutationTimeline 단위 테스트 |
| `frontend/src/App.tsx` | 수정 | 사이드바 패널 슬롯에 신규 컴포넌트 통합 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**컴포넌트 구조**:
- **QuestPanel**: `worldStore`의 `quests` 배열을 구독. `is_completed` 상태에 따라 진행/완료 섹션 분리.
- **RuleBoard**: `worldStore`의 `activeRules` 배열을 구독. 개별 규칙을 `RuleCard`로 렌더링.
- **MutationTimeline**: `worldStore`의 `mutationTimeline` 배열을 구독. 최신 10개의 변형 이벤트를 타임라인 형식으로 표시. (Q1 결정: Option B 적용)

**설계 패턴 및 원칙**:
- **RULE-002 (Game UI)**: 채팅 UI를 사용하지 않고 고정 HUD 패널로 구현.
- **RULE-006 (i18n)**: 모든 텍스트(`quest.completed`, `rule_board.empty` 등)를 i18n 키로 관리.
- ** 가독성 보호**: `data-ui-importance="critical"` 속성을 통해 가독성 확보.

### 4.2 외부 영향 분석

- **상태 관리**: `worldStore`에 의존하며, `TurnOutput` 반영 시 해당 데이터가 업데이트되면 실시간으로 리렌더링됨.
- **레이아웃**: `sidebar-left`의 공간을 점유하며, 내용이 길어질 경우를 대비한 스크롤/요약 전략의 기초 마련.

### 4.3 가정 및 제약사항

- 규칙 변형 이벤트는 현재 최신 10개까지만 표시하며, MMP에서 전체 보기/스크롤 기능 고도화 예정.
- 퀘스트 보상은 현재 UI상에 표시되지 않으며, 향후 경제 시스템(U-014) 연동 시 확장 가능.

---

## 5. 런북(Runbook) 정보

- **검증 시나리오**: 
    1. 턴 실행 결과로 퀘스트 완료 시 QuestPanel 업데이트 확인
    2. 룰 변형 이벤트 수신 시 MutationTimeline 및 RuleBoard 동기화 확인
    3. 언어 전환 시 모든 패널 텍스트 즉시 변경 확인
- **참조**: 상세 테스트는 각 `.test.tsx` 파일 참조

---

## 6. 리스크 및 주의사항

- 패널이 많아짐에 따라 사이드바 높이가 부족할 수 있음. 향후 레이아웃 최적화 시 아코디언 또는 탭 구조 검토 필요.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-014[Mvp]**: Economy HUD 구현 및 재화/보상 연동
2. **U-015[Mvp]**: 세이브/로드 및 데모 프로필 연동을 통한 초기 상태(퀘스트/룰) 테스트

### 7.2 의존 단계 확인

- **선행 단계**: U-004(레이아웃), RU-003(상태 정리) 완료됨.

---

## 8. 자체 점검 결과

- [x] 퀘스트/룰/타임라인 3종 패널 구현 확인
- [x] worldStore 데이터 연동 확인
- [x] i18n 다국어 지원 적용 확인
- [x] 고정 레이아웃(채팅 금지) 원칙 준수 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
