# U-024[Mvp]: Backend Autopilot(제한 스텝) + Action Queue Streaming

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-024[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-018,U-023 |
| 우선순위  | ⚡ Critical |

## 작업 목표

백엔드에서 Autopilot 실행을 “제한된 스텝”으로 지원하고, 각 스텝의 단계/배지/복구 트레이스를 **Action Queue Streaming(NDJSON)** 으로 스트리밍한다.

**배경**: PRD는 Autopilot에서 Goal 기반 다단계 실행과, 그 과정(Queue/Badges/Auto-repair)을 UI로 증명하라고 요구한다. (PRD 6.8, RULE-008)

**완료 기준**:

- Autopilot 모드에서 “Goal 입력 → 제한된 단계 실행”이 백엔드에서 동작한다.
- 실행 과정이 HTTP Streaming(POST 응답 스트림) + NDJSON 이벤트로 단계/메타가 스트리밍되며, 프론트 Agent Console에 그대로 반영된다.
- 무한 실행/무한 repair가 발생하지 않도록 스텝/복구 횟수 제한이 강제된다. (RULE-004)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/orchestrator/autopilot.py` - 제한 스텝 실행기(goal→step loop)
- `backend/src/unknown_world/api/autopilot.py` - (선택) autopilot 전용 HTTP Streaming 엔드포인트

**수정**:

- `backend/src/unknown_world/api/turn.py` - (대안) turn 엔드포인트에 autopilot 모드 분기 추가
- `backend/src/unknown_world/orchestrator/pipeline.py` - (RU-005 이후) 단계 실행 재사용(필요 시)

**참조**:

- `.cursor/rules/00-core-critical.mdc` - RULE-004/008
- `.cursor/rules/20-backend-orchestrator.mdc` - HTTP Streaming으로 단계 스트리밍
- `vibe/prd.md` 6.8 - Autopilot/Action Queue 요구

## 구현 흐름

### 1단계: Autopilot 실행 정책(제한) 확정

- `max_steps`(예: 3~5)로 제한하고, 각 스텝은 TurnInput/TurnOutput 계약을 재사용한다.
- 각 스텝마다 economy/안전/일관성 검증을 수행하고, 실패 시 즉시 복구/폴백으로 종료한다.

### 2단계: 스트림 이벤트 확장(스텝/단계 트레이스)

- 기존 stage 이벤트에 `step_index`(선택) 같은 메타를 추가해, UI에서 “몇 번째 자동 실행인지” 표시할 수 있게 한다.
- Auto-repair는 스텝 내 재시도이며, 횟수 제한을 반드시 둔다. (RULE-004)

### 3단계: 프론트(U-023)와 계약 정합

- 프론트가 기대하는 Plan/Queue 표시를 위해, 서버가 “현재 목표/현재 서브퀘스트” 같은 최소 메타를 TurnOutput 또는 이벤트로 제공하는 방식(Option)을 정한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-018[Mvp]](U-018[Mvp].md) - 검증/복구/폴백(무한 루프 방지)
- **계획서**: [U-023[Mvp]](U-023[Mvp].md) - 프론트 Autopilot UI/상태

**다음 작업에 전달할 것**:

- U-026(리플레이)에서 “자동 실행 시나리오”를 재현할 수 있는 액션 시퀀스 기반
- CP-MVP-03에서 “Autopilot 데모”가 안정적으로 수행되는 기반

## 주의사항

**기술적 고려사항**:

- (RULE-008) 관측은 친화 라벨만: 프롬프트 원문/내부 추론/툴 호출 상세를 그대로 보내지 않는다.
- (RULE-004) 자동 실행은 반드시 “제한된 횟수”로 끝나야 한다(무한/장시간 실행 금지).

**잠재적 리스크**:

- autopilot이 잘못 설계되면 비용/지연이 폭증 → 경제 정책(예상 비용/대안)과 함께 단계별 제한을 둔다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: autopilot 엔드포인트를 분리할까, `/api/turn`에 통합할까?
  - Option A: `/api/autopilot` 분리(명확, 정책 분리 용이)
  - Option B: `/api/turn` 통합(권장: 계약 재사용/프론트 단순)

## 참고 자료

- `vibe/prd.md` - Autopilot/Action Queue/관측 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008
