# U-008[Mvp]: 프론트 HTTP Streaming 클라이언트 + Agent Console/배지

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-008[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-006,U-007 |
| 우선순위  | ⚡ Critical |

## 작업 목표

프론트에서 `/api/turn` **HTTP Streaming 응답 스트림**을 소비해 **단계(Queue)/배지(Badges)/Auto-repair 트레이스**를 실시간으로 보여주고, 최종 TurnOutput을 Zod 검증 후 UI에 반영한다.

**배경**: “에이전트형 시스템”을 증명하려면 결과만이 아니라 과정(단계/검증/복구)이 UI로 보여야 한다. 단, 프롬프트 원문/내부 추론은 노출 금지다. (RULE-008)

**완료 기준**:

- 사용자가 입력(텍스트, 이후 클릭/드래그로 확장)을 보내면, Agent Console에 Parse→…→Commit 진행이 스트리밍으로 표시된다.
- 최종 TurnOutput이 Zod strict parse를 통과한 경우에만 상태/UI가 업데이트된다. 실패 시 안전 폴백 UI로 복구한다. (RULE-003/004)
- UI 어디에도 프롬프트 원문/내부 추론이 노출되지 않는다(메타 라벨만). (RULE-008)

## 영향받는 파일

**생성**:

- `frontend/src/api/turnStream.ts` - fetch 기반 HTTP Streaming(POST) 클라이언트 + NDJSON 이벤트 파서
- `frontend/src/stores/agentStore.ts` - queue/badges/repair 상태 저장(Zustand 권장)
- `frontend/src/components/AgentConsole.tsx` - Plan/Queue/Badges/Auto-repair 렌더

**수정**:

- `frontend/src/App.tsx` - 입력 → turn 실행 → 스트림 구독 → 상태 반영

**참조**:

- `vibe/prd.md` 6.8/10장 - 단계/배지/복구/TTFB
- `.cursor/rules/10-frontend-game-ui.mdc` - Agent Console 상시 노출
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/008

## 구현 흐름

### 1단계: 스트림 소비 방식 확정(fetch+ReadableStream)

- `/api/turn`이 POST 기반이므로 `EventSource(GET)` 대신 fetch 스트리밍으로 NDJSON 이벤트를 파싱한다.
- 최소 이벤트(`stage`, `badges`, `narrative_delta`, `final`, `error`)를 처리하는 파서를 만든다.

### 2단계: Agent Console 상태/렌더 연결

- stage 이벤트를 수신할 때마다 queue 항목의 상태를 갱신한다(예: start/ok/fail).
- 배지(Schema/Economy/Safety/Consistency) 상태를 시각적으로 표시한다.
- Auto-repair가 발생하면 횟수/결과만 표시한다(프롬프트 원문/CoT는 제외). (RULE-008)

### 3단계: final TurnOutput 검증 후 UI 반영

- `final` 이벤트 payload를 Zod로 strict parse한다. (U-006)
- 실패 시: “안전 폴백 TurnOutput”을 적용하고, 사용자에게 복구 상태를 표시한다. (RULE-004)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-006[Mvp]](U-006[Mvp].md) - Zod 스키마/폴백 전략
- **계획서**: [U-007[Mvp]](U-007[Mvp].md) - 스트림 이벤트 계약/모의 Orchestrator
- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - 고정 HUD 레이아웃(Agent Console 자리)

**다음 작업에 전달할 것**:

- CP-MVP-01에서 검증할 “스트리밍 + 스키마 + 폴백” 루프
- U-009~U-012에서 액션덱/핫스팟/DnD 실행을 TurnInput으로 연결할 기반

## 주의사항

**기술적 고려사항**:

- (RULE-008) Agent Console은 “단계/배지/복구”만 보여준다(프롬프트/내부추론 노출 금지).
- 스트림 파서는 오류에 강해야 하며, 중간 청크 파싱 실패가 전체 UI를 멈추지 않게 한다.

**잠재적 리스크**:

- fetch 스트리밍 NDJSON 파싱이 브라우저별로 까다로울 수 있음 → 최소 파서로 시작하고, RU-002에서 타입/에러 처리를 정리한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 스트림(NDJSON) 파서는 직접 구현할까, 경량 라이브러리를 쓸까?
  - Option A: 직접 구현(권장: 의존성 최소, 동작 투명)
  - Option B: 라이브러리 사용(초기 빠르지만 유지보수/버전 리스크)

## 참고 자료

- `vibe/prd.md` - Queue/Badges/Auto-repair UX
- `.cursor/rules/10-frontend-game-ui.mdc` - Agent Console 상시 노출
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/008
