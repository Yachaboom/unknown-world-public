# [U-016[Mvp]] Vertex 인증 + google-genai 클라이언트 + 모델 라벨 고정 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-016[Mvp]
- **단계 번호**: 2.3 (M3 마일스톤 초기 유닛)
- **작성 일시**: 2026-01-24 17:00
- **담당**: AI Agent

---

## 1. 작업 요약

Vertex AI 서비스 계정 인증 기반의 `google-genai` 클라이언트 래퍼를 구현하고, 프로젝트 전역에서 사용할 모델 ID와 라벨을 `tech-stack.md` 기준으로 고정했습니다. 이를 통해 실제 Gemini 3 모델 호출과 로컬 개발을 위한 Mock 호출을 유연하게 전환할 수 있는 기반을 마련했습니다.

---

## 2. 작업 범위

- **모델 ID 및 라벨 고정**: `gemini-3-flash-preview` (FAST/VISION), `gemini-3-pro-preview` (QUALITY), `gemini-3-pro-image-preview` (IMAGE) 모델 ID를 상수로 고정 및 라벨 매핑.
- **GenAI 클라이언트 래퍼 구현**: `google-genai` SDK를 사용한 `GenAIClient` 구현 및 `generate`/`generate_stream` 인터페이스 제공.
- **동작 모드 전환 (Mock/Real)**: `UW_MODE` 환경변수에 따른 실모델/모의 모델 전환 로직 및 `MockGenAIClient` 구현.
- **인증 및 보안**: Vertex AI 서비스 계정 인증(ADC) 연동 및 BYOK 금지, 프롬프트 로깅 금지 규칙 준수.
- **싱글톤 팩토리**: 클라이언트 인스턴스 재사용을 위한 `get_genai_client` 팩토리 함수 구현.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `backend/src/unknown_world/config/models.py` | 신규 | 모델 ID 상수 및 라벨 매핑 SSOT |
| `backend/src/unknown_world/services/genai_client.py` | 신규 | GenAI 클라이언트 래퍼 및 팩토리 로직 |
| `backend/src/unknown_world/config/__init__.py` | 수정 | 설정 패키지 익스포트 정리 |
| `backend/src/unknown_world/services/__init__.py` | 수정 | 서비스 패키지 익스포트 정리 |
| `backend/.env.example` | 수정 | GenAI 관련 환경 변수 템플릿 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:

- `get_genai_client(force_mock: bool = False) -> GenAIClientType`: 환경변수 및 정책에 따른 싱글톤 클라이언트 반환.
- `GenAIClient.generate(request: GenerateRequest) -> GenerateResponse`: 단발성 텍스트 생성 (비동기).
- `GenAIClient.generate_stream(request: GenerateRequest) -> AsyncGenerator[str]`: 스트리밍 텍스트 생성 (비동기 제너레이터).

**설계 패턴/원칙**:

- **SSOT (Single Source of Truth)**: 모델 ID를 `config/models.py` 한 곳에서만 관리하여 `tech-stack.md`와의 정합성 유지.
- **Factory/Singleton**: 클라이언트 생성 로직을 캡슐화하고 인스턴스를 재사용하여 리소스 효율화.
- **Fail-safe Fallback**: 실제 클라이언트 초기화 실패 시 자동으로 Mock 모드로 전환하여 개발 연속성 보장.

### 4.2 외부 영향 분석

- **인증**: GCP 서비스 계정 키 파일(`.key`) 또는 ADC 권한 필요.
- **보안**: `UW_MODE=real` 환경에서 API 호출 로그에 프롬프트 원문이 남지 않도록 로깅 정책 적용.
- **의존성**: `google-genai` 패키지 추가 (Python SDK).

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-016-genai-client-runbook.md`
- **실행 결과**: 환경 변수 설정 및 실모델/스트리밍 호출 테스트 시나리오 포함.
- **참조**: 실제 API 연동 테스트 시 위 런북의 시나리오 A/B를 순차적으로 실행 권장.

---

## 6. 리스크 및 주의사항

- **모델 가용성**: `gemini-3-*` 프리뷰 모델은 리전에 따라 접근이 제한될 수 있으므로 `VERTEX_LOCATION=global` 설정 확인 필요.
- **비용**: `real` 모드 호출 시 실제 Vertex AI 비용이 발생하므로 개발 단계에서는 `mock` 모드 활용 권장.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-017[Mvp]**: Structured Output TurnOutput 생성 로직 연동.
2. **U-018[Mvp]**: 비즈니스 룰 검증 및 Repair loop 구현.

### 7.2 의존 단계 확인

- **선행 단계**: U-003[Mvp] (FastAPI 백엔드 골격) - 완료
- **후속 단계**: U-017[Mvp] (TurnOutput 생성)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
