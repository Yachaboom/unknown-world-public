# RU-002[Mvp]: 리팩토링 - validation/폴백/이벤트 타입 통일

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | RU-002[Mvp] |
| Phase     | MVP         |
| 예상 소요 | 45분        |
| 의존성    | U-008       |
| 우선순위  | High        |

## 작업 목표

스트림 이벤트(NDJSON)/검증/폴백이 분산되어 생기는 불일치를 정리하고, “스키마/경제/안전” 실패가 발생해도 일관된 방식으로 **표시/복구/폴백** 되도록 타입과 흐름을 통일한다.

**배경**: 스트리밍/검증/복구는 MVP 하드 게이트이며, 작은 불일치가 데모에서 “멈춤/깨짐”으로 보인다. (RULE-004/008)

**완료 기준**:

- 서버가 내보내는 스트림 이벤트 타입/페이로드 형태가 단일 계약으로 정리된다.
- 클라이언트 파서/상태/표시 로직이 그 계약을 1:1로 따르고, 실패 시 폴백 TurnOutput으로 종료된다. (RULE-004)
- stage 이름/순서(Parse→…→Commit)와 Badges(Schema/Economy/Safety/Consistency)가 UI/백엔드에서 동일 용어로 유지된다. (RULE-008)

## 영향받는 파일

**생성**:

- (권장) `backend/src/unknown_world/api/turn_stream_events.py` - Turn 스트림 이벤트 스키마/생성 유틸(서버)
- (권장) `frontend/src/types/turn_stream.ts` - Turn 스트림 이벤트 타입/디코더(클라)

**수정**:

- `backend/src/unknown_world/api/turn.py` - 이벤트 생성/에러 처리 통일(필요 시)
- `frontend/src/api/turnStream.ts` - 파서/에러 처리 통일(필요 시)

**참조**:

- `.cursor/rules/00-core-critical.mdc` - RULE-004/005/008
- `vibe/prd.md` 6.8/10장 - 단계/배지/Auto-repair UX

## 구현 흐름

### 1단계: 이벤트 계약을 “단일 정의”로 정리

- 이벤트 타입 목록과 각 이벤트의 필수/옵션 필드를 문서화한다.
- `final` 이벤트에는 “검증된 TurnOutput”만 포함한다(검증 실패 시에는 폴백 TurnOutput을 final로 보냄).

### 2단계: 서버/클라 에러 처리 규칙 통일

- 스키마 실패/비즈니스 룰 실패 시: `Auto-repair #n` 이벤트 → 재시도 → (최대 N회) → 폴백 final
- 네트워크/타임아웃/서버 에러 시: 사용자에게 “안전 진행(텍스트-only)”로 안내하고 UI는 유지

### 3단계: 용어/라벨 정합성 검증

- Badges 라벨(FAST/QUALITY 등), 하드 게이트 배지 키, stage 이름이 문서/코드/로드맵에서 일치하는지 확인한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-007[Mvp]](U-007[Mvp].md) - 서버 HTTP Streaming/모의 Orchestrator
- **계획서**: [U-008[Mvp]](U-008[Mvp].md) - 클라 스트림 파서/Agent Console 렌더

**다음 작업에 전달할 것**:

- CP-MVP-01에서 “스트리밍/스키마/폴백”을 안정적으로 검증할 일관된 이벤트 계약
- 이후 실모델 연동(U-016~U-018) 시에도 그대로 재사용 가능한 복구/폴백 흐름

## 주의사항

**기술적 고려사항**:

- (RULE-008) 관측은 “프롬프트 노출 없이” 수행: 이벤트에는 프롬프트 원문/내부 추론을 포함하지 않는다.
- (RULE-005) Economy는 서버에서 Hard gate: 클라이언트가 임의로 잔액을 음수로 표시/진행하지 않게 한다.

**잠재적 리스크**:

- 계약을 너무 자주 바꾸면 프론트/백이 계속 깨짐 → MVP에서는 최소 이벤트 타입으로 고정하고, 확장은 MMP에서 한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: stage 목록/표시 라벨은 어디를 SSOT로 둘까?
  - Option A: 서버 SSOT(서버가 stage 목록을 포함해 스트림으로 제공)
  - Option B: 클라 SSOT(클라에 stage 고정 리스트를 두고 서버 이벤트를 매핑)
  **A1**: 뭐가 나은지 모르겠다. 권장되는 옵션으로 알아서

## 참고 자료

- `vibe/prd.md` - Agent Console/Auto-repair/Badges 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-004/005/008
