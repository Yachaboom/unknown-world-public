# U-005[Mvp]: TurnInput/TurnOutput 스키마(Pydantic)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-005[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-003       |
| 우선순위  | ⚡ Critical |

## 작업 목표

백엔드에서 TurnInput/TurnOutput을 **Pydantic 모델로 정의**하고, Gemini Structured Outputs에 투입 가능한 **JSON Schema(부분집합)** 를 생성할 수 있게 만든다.

**배경**: Unknown World의 핵심은 “말만 하는 텍스트”가 아니라, UI/상태/비용을 포함한 **구조화 결과**이며 서버/클라 이중 검증이 Hard Gate다. (RULE-003)

**완료 기준**:

- TurnInput/TurnOutput Pydantic 모델이 정의되어 있고, 최소 요구 필드(언어/내러티브/UI/경제/안전/좌표/배지)가 포함된다.
- TurnOutput JSON Schema를 생성할 수 있고(Structured Outputs용), 스키마는 과도한 중첩/복잡 제약을 피한다. (Structured Outputs 가이드)
- bbox/핫스팟 좌표 규약(0~1000, `[ymin,xmin,ymax,xmax]`)과 ko/en 언어 정책이 스키마 수준에서 명확히 드러난다. (RULE-006/009)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/models/turn.py` - TurnInput/TurnOutput(Pydantic) 및 하위 타입 정의
- `backend/src/unknown_world/models/__init__.py` - 모델 패키지 노출(선택)

**수정**:

- 없음

**참조**:

- `vibe/prd.md` 8.7 - TurnInput/TurnOutput 필드 방향
- `vibe/ref/structured-outputs-guide.md` - JSON Schema 제약(부분집합/flat)
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/005/006/009

## 구현 흐름

### 1단계: 스키마 범위 확정(“UI 고정 패널” 중심)

- TurnOutput이 반드시 포함해야 하는 패널 데이터를 정리한다:
  - Action Deck(카드 3~6장, 비용/위험/대안)
  - Scene Objects/Hotspots(box_2d)
  - Inventory/Quest/Rule Board/Economy HUD/Agent Console
- Hard Gate 필드(경제/안전/언어/좌표/배지)를 required로 고정한다.

### 2단계: Pydantic 모델 설계(부분집합/단순성 유지)

- enum(언어/라벨/단계/배지)을 적극 사용해 출력 공간을 줄인다.
- `extra="forbid"` 성격으로 불명확한 필드 유입을 차단한다(가능한 범위).
- 깊은 중첩/복잡한 anyOf/oneOf를 피하고, 구조는 “평평하게” 유지한다.

### 3단계: 스키마/검증 훅 제공

- TurnOutput JSON Schema를 Gemini 호출(`response_json_schema`)에 바로 넣을 수 있도록 생성 경로를 마련한다.
- 최종 응답 텍스트를 `model_validate_json`으로 검증할 수 있도록 “검증 entrypoint”를 정한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-003[Mvp]](U-003[Mvp].md) - FastAPI 프로젝트 골격/패키지 구조

**다음 작업에 전달할 것**:

- U-007에서 모의 Orchestrator가 생성할 TurnOutput의 계약(서버 검증 기준)
- U-017에서 실제 Gemini Structured Outputs 호출 시 사용할 스키마 SSOT(서버 측)

## 주의사항

**기술적 고려사항**:

- (RULE-004) 스키마 통과만으로 충분하지 않다 → 경제/언어/좌표 같은 비즈니스 룰 검증을 별도로 두고 Repair loop 대상으로 포함한다.
- (RULE-005) `economy.cost`와 `economy.balance_after`는 항상 포함되며 잔액 음수는 절대 불가(서버 Hard gate).

**잠재적 리스크**:

- 스키마가 너무 복잡하면 모델/SDK가 거부하거나 실패율이 급증 → “필수 필드 고정 + 중첩 최소화”로 시작하고, 필요 시 분할(메타/부가 정보는 축소)한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: Action Deck 필드 구조를 어떻게 둘까? (PRD 용어 정합성 우선)
  - Option A: `ui.action_deck.cards[]` (권장: 용어/구조 명확)
  - Option B: `ui.choices[]`로 단일화(단, “채팅 선택지” 오해 위험)
- [ ] **Q2**: TurnOutput은 `world.delta` 중심으로 갈까, `world.snapshot`을 항상 포함할까?
  - Option A: `world.delta` + SaveGame에만 snapshot 저장(권장: 페이로드 절감)
  - Option B: 매 턴 snapshot 포함(디버그는 쉽지만 비용/지연 증가)

## 참고 자료

- `vibe/prd.md` - Turn 계약/하드 게이트/좌표 규약
- `vibe/ref/structured-outputs-guide.md` - JSON Schema 부분집합/스트리밍
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/005/006/009
