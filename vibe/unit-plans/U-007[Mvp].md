# U-007[Mvp]: 모의 Orchestrator + /api/turn SSE

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-007[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 75분                              |
| 의존성    | U-005                             |
| 우선순위  | ⚡ Critical                        |

## 작업 목표

실모델(Gemini) 없이도 프론트가 개발/데모를 지속할 수 있도록, **모의 Orchestrator**로 TurnOutput을 생성하고 이를 **SSE로 스트리밍**하는 `/api/turn` 엔드포인트를 구현한다.

**배경**: “항상 플레이 가능한 데모”를 유지하려면, 모델 연결이 없어도 UI/상태/경제/검증 흐름을 끝까지 흘릴 수 있어야 한다. (PRD 10장, RULE-008)

**완료 기준**:

- `/api/turn`이 `text/event-stream`으로 stage/배지/Auto-repair(필요 시)/final TurnOutput을 순차 스트리밍한다.
- 최종 TurnOutput이 Pydantic 검증을 통과하고, 실패 시에도 스키마 준수 폴백을 반환한다. (RULE-003/004)
- box_2d 좌표 규약(0~1000, `[ymin,xmin,ymax,xmax]`)을 포함한 “클릭 가능한 장면” 데이터가 모의로라도 생성된다. (RULE-009)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/api/turn.py` - `/api/turn` SSE 라우트(POST) 및 스트리밍 로직
- `backend/src/unknown_world/orchestrator/mock.py` - 모의 TurnOutput 생성기(결정적 seed 기반)

**수정**:

- `backend/src/unknown_world/main.py` - 라우터 등록 및 CORS/미들웨어 정리(필요 시)

**참조**:

- `.cursor/rules/20-backend-orchestrator.mdc` - SSE 스트리밍/검증/복구 기준
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/008/009
- `vibe/prd.md` 6.8/10장 - Queue/Badges/Auto-repair 가시화, TTFB

## 구현 흐름

### 1단계: SSE 이벤트 계약 확정

- 최소 이벤트 타입을 정의한다: `stage`, `badges`(또는 stage 내 포함), `final`, `error`(필요 시).
- stage 이름은 PRD 예시( Parse→Validate→Plan→Resolve→Render→Verify→Commit )로 통일한다.

### 2단계: 모의 Orchestrator 구현(결정적/저비용)

- TurnInput(텍스트/클릭/드래그/업로드)에 따라 TurnOutput을 생성하되, seed 기반으로 재현 가능하게 만든다.
- Action Deck(3~6), Hotspots(box_2d), Inventory/Quest/Rules/Economy를 최소 한 번씩 포함하도록 “데모 친화”로 구성한다.

### 3단계: `/api/turn` SSE 스트리밍 구현

- 요청 수신 즉시 `stage: Parse(start)` 같은 이벤트를 먼저 전송해 TTFB를 확보한다.
- 단계별로 이벤트를 스트리밍한 뒤, 최종 `final` 이벤트에 TurnOutput JSON을 포함한다.
- 서버에서 TurnOutput을 Pydantic으로 검증하고, 실패 시 safe fallback TurnOutput을 생성해 반환한다. (RULE-004)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-005[Mvp]](U-005[Mvp].md) - TurnOutput 스키마/검증 기준
- **계획서**: [U-003[Mvp]](U-003[Mvp].md) - FastAPI 앱 엔트리/라우팅 기반

**다음 작업에 전달할 것**:

- U-008에서 SSE를 소비해 Agent Console/내러티브/패널을 업데이트할 수 있는 스트림
- CP-MVP-01에서 “스트리밍/스키마/폴백” 체크포인트를 수행할 수 있는 최소 백엔드 루프

## 주의사항

**기술적 고려사항**:

- (RULE-008) 스트리밍은 “과정”을 보여주는 기능이다: stage/badges/repair 트레이스는 반드시 이벤트로 제공한다.
- (RULE-007) 디버그 편의로 프롬프트 원문/내부 추론/비밀정보를 스트림에 섞지 않는다.

**잠재적 리스크**:

- 이벤트 포맷이 불명확하면 프론트 파서 구현이 어려움 → U-008과 함께 최소 계약을 먼저 확정하고, RU-002에서 타입/폴백을 통일한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 스트림 포맷을 무엇으로 고정할까?
  - Option A: 표준 SSE(`event:`/`data:`) (권장: 브라우저 친화)
  - Option B: NDJSON(라인 단위 JSON) (구현 단순하지만 SSE 관측/UI 표준과 어긋날 수 있음)

## 참고 자료

- `vibe/prd.md` - Queue/Badges/TTFB/Auto-repair 요구
- `.cursor/rules/20-backend-orchestrator.mdc` - SSE 구현 규칙
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/007/008/009

