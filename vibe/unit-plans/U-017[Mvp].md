# U-017[Mvp]: Structured Output TurnOutput 생성 + Pydantic 검증

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-017[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-016,U-005 |
| 우선순위  | ⚡ Critical |

## 작업 목표

Gemini 텍스트 모델을 **Structured Outputs(JSON Schema)** 모드로 호출해 TurnOutput을 생성하고, 서버에서 **Pydantic 검증**을 통과한 결과만 다음 단계로 전달한다.

**배경**: TurnOutput은 “파싱 가능한 계약”이며, 스키마 강제 + 서버 검증이 기본값이다. (RULE-003)

**완료 기준**:

- Gemini 호출 시 `response_mime_type=application/json` + `response_json_schema`(TurnOutput schema)를 사용한다.
- 모델 응답 텍스트를 Pydantic으로 `model_validate_json` 검증하고, 실패는 즉시 “복구 대상”으로 분류한다(U-018).
- `language` 정책(입력 언어 고정)이 프롬프트/검증 흐름에 반영된다. (RULE-006)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 모델 호출/응답 파싱/검증 단계
- `backend/prompts/system/game_master.ko.md` - (초기) 시스템 프롬프트(ko)
- `backend/prompts/system/game_master.en.md` - (초기) 시스템 프롬프트(en)
- `backend/prompts/turn/turn_output_instructions.ko.md` - (초기) 출력 계약 지시(ko)
- `backend/prompts/turn/turn_output_instructions.en.md` - (초기) 출력 계약 지시(en)

**수정**:

- `backend/src/unknown_world/api/turn.py` - (선택) 모의 Orchestrator 대신 실모델 경로 연결(기능 플래그 권장)

**참조**:

- `vibe/prd.md` 3.2/8.4 - 프롬프트 파일 관리/Structured Outputs
- `.cursor/rules/30-prompts-i18n.mdc` - 프롬프트 파일 메타/언어 분리 규칙
- `.cursor/rules/00-core-critical.mdc` - RULE-003/006/007/010

## 구현 흐름

### 1단계: 프롬프트 파일 로딩(ko/en 분리) 최소 구현

- 언어별 프롬프트를 파일에서 읽어온다(코드 하드코딩 금지).
- 프롬프트에는 최소한 “출력은 TurnOutput 스키마를 반드시 만족”과 “language 고정”을 명시한다.

### 2단계: Structured Outputs 호출 구성

- 모델 라벨(FAST/QUALITY) 선택 정책을 정하고(기본값 포함), 호출 config에 스키마를 연결한다.
- 스트리밍 여부(모델)는 U-007/U-008의 **HTTP Streaming(NDJSON 이벤트) 계약**과 정합되게 설계한다(초기엔 모델 비스트리밍이어도, 서버는 stage/badges/final을 스트림으로 보낼 수 있다).

### 3단계: 서버 검증(Pydantic)과 실패 분기

- 응답을 Pydantic으로 검증한다.
- 실패 시: “스키마 실패”로 분류해 U-018의 repair/fallback 흐름으로 넘길 수 있도록 실패 정보를 구조화한다(프롬프트 원문은 포함 금지). (RULE-008)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-016[Mvp]](U-016[Mvp].md) - Vertex 인증/모델 라벨 고정
- **계획서**: [U-005[Mvp]](U-005[Mvp].md) - TurnOutput 스키마(Pydantic/JSON Schema)

**다음 작업에 전달할 것**:

- U-018에서 비즈니스 룰 검증 + repair loop를 수행할 "스키마 검증된(또는 실패한) 결과/에러 정보"
- U-036에서 프롬프트 파일 분리/핫리로드를 위한 최소 로딩 구조 기반
- RU-005에서 정리할 orchestrator stage 중 "Resolve/Render"의 핵심 생성 단계

## 주의사항

**기술적 고려사항**:

- (RULE-007) 프롬프트 원문/내부 추론을 UI/스트림 응답에 노출하지 않는다(메타만).
- (RULE-010) 모델 ID는 tech-stack SSOT로 고정하고, 이미지 모델은 혼용 금지.

**잠재적 리스크**:

- 프롬프트/스키마 불일치로 실패율이 높을 수 있음 → `.cursor/rules/30-prompts-i18n.mdc`의 “정합” 규칙을 따라 프롬프트를 짧고 명확하게 유지한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: 기본 텍스트 생성 모델 라벨은 무엇으로 둘까?
  - Option A: FAST 기본(권장: 데모 TTFB 우선) + 중요 장면만 QUALITY
  - Option B: QUALITY 기본(품질 우선, 비용/지연 증가)
  **A1**: Option A

## 참고 자료

- `vibe/prd.md` - 프롬프트 파일 관리/Structured Outputs
- `.cursor/rules/30-prompts-i18n.mdc` - 프롬프트 언어 분리/메타 규칙
- `.cursor/rules/00-core-critical.mdc` - RULE-003/006/007/010
