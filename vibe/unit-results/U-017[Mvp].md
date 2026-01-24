# U-017[Mvp]: Structured Output TurnOutput 생성 + Pydantic 검증 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-017[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-24 17:15
- **담당**: AI Agent

---

## 1. 작업 요약

Gemini 텍스트 모델을 **Structured Outputs(JSON Schema)** 모드로 호출하여 게임의 턴 결과인 `TurnOutput`을 생성하고, 서버에서 **Pydantic**을 이용해 스키마 정합성을 검증하는 핵심 파이프라인을 구현했습니다. 언어별 프롬프트 로딩 및 검증 실패 시 폴백 메커니즘을 포함합니다.

---

## 2. 작업 범위

- [x] **언어별 프롬프트 파일 분리 및 로더 구현**: `ko`/`en` 시스템 프롬프트 및 출력 지침 로딩 로직 구축
- [x] **Structured Outputs 호출 구성**: `response_mime_type` 및 `response_json_schema` 적용
- [x] **Pydantic 서버 검증**: 모델 응답의 `model_validate_json` 수행 및 에러 구조화
- [x] **안전한 폴백(Safe Fallback)**: 검증 실패 시 사용자 경험을 해치지 않는 기본 응답 생성 로직 구현
- [x] **단위 테스트 작성**: 생성기 로직 및 프롬프트 로더에 대한 테스트 코드 확보

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/prompts/system/game_master.ko.md` | 신규 | 한국어 시스템 프롬프트 (페르소나/규칙) |
| `backend/prompts/system/game_master.en.md` | 신규 | 영어 시스템 프롬프트 (페르소나/규칙) |
| `backend/prompts/turn/turn_output_instructions.ko.md` | 신규 | 한국어 출력 계약 지시 (JSON 스키마 준수 강조) |
| `backend/prompts/turn/turn_output_instructions.en.md` | 신규 | 영어 출력 계약 지시 (JSON 스키마 준수 강조) |
| `backend/src/unknown_world/orchestrator/prompt_loader.py` | 신규 | 언어별 프롬프트 파일 로딩 유틸리티 |
| `backend/src/unknown_world/orchestrator/generate_turn_output.py` | 신규 | TurnOutput 생성 및 검증 핵심 로직 (Generator) |
| `backend/src/unknown_world/orchestrator/__init__.py` | 수정 | 오케스트레이터 모듈 노출 설정 |
| `backend/tests/unit/orchestrator/test_generate_turn_output.py` | 신규 | 생성기 및 검증 로직 단위 테스트 |
| `backend/src/unknown_world/services/genai_client.py` | 수정 | JSON Schema 지원을 위한 클라이언트 인터페이스 확장 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:

- `generate_turn_output(turn_input, force_mock)`: `TurnInput`을 받아 검증된 `GenerationResult` 반환
- `TurnOutputGenerator.generate(turn_input)`: 실제 모델 호출, 파싱, Pydantic 검증 수행
- `TurnOutputGenerator.create_safe_fallback(language, error_message)`: 검증 실패 시 안전한 기본값 생성

**설계 패턴/원칙**:

- **싱글톤(Singleton)**: `TurnOutputGenerator`를 싱글톤으로 관리하여 프롬프트 캐싱 및 자원 재사용
- **관측 가능성(Observability)**: 프롬프트 원문은 제외하고 모델 라벨, 성공 여부, 에러 타입만 로그 및 결과 메타데이터에 포함 (RULE-007)
- **언어 고정(i18n)**: `TurnInput.language`에 따라 시스템 프롬프트와 지침을 동적으로 선택 (RULE-006)

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `backend/prompts/` 내의 `.md` 파일 의존성 추가
- **권한/보안**: Vertex AI 서비스 계정을 통한 인증 필요 (U-016 계승)
- **빌드/의존성**: Pydantic v2 및 Google GenAI SDK 활용

### 4.3 가정 및 제약사항

- 모델이 유효한 JSON을 반환하더라도 비즈니스 룰(재화 음수 등)에 어긋날 수 있으며, 이는 다음 단계(U-018)에서 처리하도록 설계됨
- 초기 구현에서는 모델의 비스트리밍 호출을 기본으로 하되, 인터페이스는 향후 스트리밍 확장이 용이하도록 구성함

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-017-generate-turn-output-runbook.md`
- **실행 결과**: Mock 모드 및 Real 모드 시나리오를 통해 프롬프트 로드, 스키마 검증, 폴백 생성이 정상 동작함을 확인
- **참조**: 상세 테스트 절차는 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **스키마 복잡도**: `TurnOutput` 스키마가 너무 깊어지면 모델의 생성 실패율이 높아질 수 있으므로 평평한(Flat) 구조 유지 필요
- **비용**: QUALITY 모델(`gemini-3-pro-preview`) 사용 시 비용 및 지연 시간이 증가하므로 기본값은 FAST로 유지

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-018[Mvp]**: 비즈니스 룰 검증 및 Repair loop(재시도) 구현
2. **U-036[Mvp]**: 프롬프트 파일 핫리로드 기능 추가

### 7.2 의존 단계 확인

- **선행 단계**: U-016[Mvp] (인증 완료)
- **후속 단계**: U-018[Mvp] (비즈니스 검증)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항(JSON Schema 강제) 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지 (backend/src/unknown_world/orchestrator/)
- [x] 파괴적 변경/리스크 명시 (스키마 복잡도 주의)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
