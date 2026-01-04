# U-005[Mvp]: TurnInput/TurnOutput 스키마(Pydantic) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-005[Mvp]
- **단계 번호**: 1.2
- **작성 일시**: 2026-01-04 20:00
- **담당**: AI Agent

---

## 1. 작업 요약

백엔드에서 TurnInput/TurnOutput을 **Pydantic 모델로 정의**하고, Gemini Structured Outputs에 최적화된 JSON Schema(부분집합)를 생성 및 검증하는 체계를 구축했습니다.

---

## 2. 작업 범위

- **Pydantic V2 모델 정의**: `TurnInput`, `TurnOutput` 및 하위 컴포넌트(UI, World, Economy, Safety, AgentConsole) 설계
- **Hard Gate 규칙 강제**:
    - **경제(RULE-005)**: `cost`, `balance_after` 필수 및 재화(signal, memory_shard) 음수 방지 (`ge=0`)
    - **언어(RULE-006)**: `Language` enum (`ko-KR`, `en-US`)을 통한 혼합 출력 원천 차단
    - **좌표(RULE-009)**: 0~1000 정규화 좌표계 (`Coordinate`) 및 bbox `[ymin, xmin, ymax, xmax]` 순서 고정
- **스키마 오케스트레이션**: Gemini Structured Outputs 호환을 위한 `model_json_schema()` 지원 및 `extra="forbid"`를 통한 엄격한 검증
- **유닛 테스트**: 좌표 범위, 재화 인바리언트, 필수 필드 누락 등 10종 이상의 검증 시나리오 구현

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/models/turn.py` | 신규 | TurnInput/TurnOutput(Pydantic) 및 하위 타입 정의 |
| `backend/src/unknown_world/models/__init__.py` | 신규 | 모델 패키지 노출 |
| `backend/tests/unit/models/test_turn.py` | 신규 | 모델 제약 조건 및 스키마 생성 단위 테스트 |
| `shared/schemas/turn/turn_output.schema.json` | 수정 | 백엔드 Pydantic 모델 구조(Action Deck 등)와 동기화 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 모델 및 속성**:

- **`TurnOutput`**: 서버 응답의 SSOT. `language`, `narrative`, `economy`, `safety`를 필수(required)로 지정.
- **`UIOutput`**: `action_deck.cards` 구조를 채택하여 "채팅 선택지"가 아닌 "게임 액션"임을 명시.
- **`Box2D`**: `Coordinate` (Annotated int, 0~1000)를 사용하여 이미지 비전 bbox와 1:1 호환.
- **`CurrencyAmount`**: `ge=0` 제약을 통해 비즈니스 로직 실행 전 스키마 수준에서 잔액 음수 유입 차단.

**설계 패턴/원칙**:
- **Flat Schema**: Gemini Structured Outputs 제약을 고려하여 과도한 중첩을 피하고 하위 타입을 분리 정의.
- **Fail-fast Validation**: `model_validate_json`을 통해 LLM 응답이 계약을 위반할 경우 즉시 감지하여 Repair loop 트리거 기반 마련.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 없음 (인메모리 모델 정의)
- **권한/보안**: 서비스 계정 등 민감 정보와 분리된 순수 데이터 모델링
- **빌드/의존성**: Pydantic V2 활용 (v2.12.5)

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-005-pydantic-schemas-runbook.md`
- **실행 결과**:
    - 시나리오 A~G (직렬화, 검증, 스키마 생성, 좌표/언어/재화 규칙) 모두 통과
    - `pytest backend/tests/unit/models/test_turn.py` 실행 결과 100% Pass 확인

---

## 6. 리스크 및 주의사항

- **스키마 복잡도**: 현재는 평평한 구조를 유지하고 있으나, World State가 복잡해질 경우 Gemini의 JSON Schema 부분집합 제약에 걸릴 수 있음.
- **동기화**: 프론트엔드 Zod 모델(`U-006`) 구현 시 본 Pydantic 모델의 구조와 1:1 일치 여부 재검증 필요.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-006[Mvp]**: 프론트엔드 Zod 모델 구현 및 백엔드 스키마와 동기화
2. **U-007[Mvp]**: 모의 Orchestrator를 통한 SSE 스트리밍 연동 테스트

### 7.2 의존 단계 확인

- **선행 단계**: U-003[Mvp] (FastAPI 프로젝트 골격)
- **후속 단계**: U-017[Mvp] (실제 Gemini Structured Outputs 연동)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] Hard Gate (경제/안전/언어/좌표) 스키마 수준 강제 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
