# RU-005[Mvp]: 리팩토링 - orchestrator pipeline stages 정리

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | RU-005[Mvp] |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-018       |
| 우선순위  | High        |

## 작업 목표

모의/실모델 경로, 검증/복구 로직이 섞이며 복잡해진 오케스트레이터를 **단계(Stages) 기반으로 모듈화**해 유지보수성과 관측 가능성을 높인다(동작 보존).

**배경**: PRD는 Parse→Validate→Plan→Resolve→Render→Verify→Commit 과정을 UI로 보여 “오케스트레이션”을 증명해야 한다. 단계가 코드 구조로도 명확해야 한다. (RULE-008)

**완료 기준**:

- 오케스트레이터 코드가 stage 단위로 분리되어, 각 단계의 입력/출력이 명확해진다.
- stage 이벤트/배지/Auto-repair 트레이스 송출 위치가 일관되게 정리된다.
- 실모델/모의모드 전환이 파이프라인을 깨지 않고 동작한다(Behavior Preservation).

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/orchestrator/stages/` - 단계 모듈(예: parse/validate/plan/resolve/render/verify/commit)
- `backend/src/unknown_world/orchestrator/pipeline.py` - stage 조합/실행기(선택)

**수정**:

- `backend/src/unknown_world/api/turn.py` - stage 이벤트 송출 위치 정리(필요 시)
- `backend/src/unknown_world/orchestrator/*` - 기존 로직을 stage로 이동(동작 보존)

**참조**:

- `vibe/prd.md` 6.8 - Action Queue/단계 가시화 요구
- `.cursor/rules/20-backend-orchestrator.mdc` - HTTP Streaming으로 단계 스트리밍
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008

## 구현 흐름

### 1단계: stage 인터페이스 정의

- 각 stage의 입력/출력 타입(또는 컨텍스트 객체)을 정한다.
- “검증(스키마/비즈니스 룰)”과 “복구(repair)”가 어디에 붙는지 경계를 명확히 한다.

### 2단계: 로직 이동(Behavior Preservation)

- 기존 turn 처리 로직을 stage 모듈로 이동하되, 출력/이벤트/상태 변경이 동일하게 유지되게 한다.
- Auto-repair는 “실패 처리 경로”로서 pipeline 내부에서 통제한다.

### 3단계: 관측 가능성(단계/배지) 정합

- stage 이벤트 이름/순서가 PRD/프론트(Agent Console)와 일치하는지 점검한다.
- 배지 키(Schema/Economy/Safety/Consistency)가 일관되게 설정되는지 정리한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-018[Mvp]](U-018[Mvp].md) - business rule 검증 + repair/fallback

**다음 작업에 전달할 것**:

- U-019~U-022(이미지/스캐너), U-024(Autopilot) 등 확장 기능이 stage 기반으로 자연스럽게 추가될 수 있는 구조
- CP-MVP-03 최종 데모에서 “과정이 보이는 시스템”을 안정적으로 제공

## 주의사항

**기술적 고려사항**:

- 리팩토링 유닛에서 새 기능을 추가하지 않는다(동작 보존).
- 프롬프트 원문/내부 추론/비밀정보는 어떤 stage에서도 로그/스트림으로 내보내지 않는다. (RULE-007/008)

**잠재적 리스크**:

- 모듈화 과정에서 이벤트 송출 타이밍이 바뀌어 UI가 달라질 수 있음 → CP-MVP-01/02 시나리오로 회귀 확인을 권장한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: pipeline 실행 형태는 무엇이 좋을까?
  - Option A: `pipeline(ctx): ctx` 함수 체인(권장: 단순/테스트 용이)
  - Option B: 클래스 기반 파이프라인(확장에는 유리, 초기 복잡)

## 참고 자료

- `vibe/prd.md` - 단계/배지/관측 UX
- `.cursor/rules/20-backend-orchestrator.mdc` - HTTP Streaming 단계 스트리밍
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008
