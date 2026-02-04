# U-080[Mvp] ⚡핫픽스(최우선) - Vertex AI 제거 → API 키 인증 전용 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-080[Mvp]
- **단계 번호**: 핫픽스
- **작성 일시**: 2026-02-05 16:35
- **담당**: AI Agent

---

## 1. 작업 요약

Vertex AI 서비스 계정 기반 인증을 완전히 제거하고, **Gemini API 키 인증(`GOOGLE_API_KEY`)**으로 백엔드 인증 체계를 단순화하였습니다. 이를 통해 GCP 프로젝트 설정 및 서비스 계정 키 관리의 복잡도를 제거하고 데모/개발 환경의 온보딩 속도를 극대화하였습니다.

---

## 2. 작업 범위

- **Vertex AI SDK 관련 코드 완전 제거**: `vertexai.init()` 및 서비스 계정 인증 분기 로직 삭제
- **API 키 인증 통합**: `google-genai` SDK의 `Client(api_key=...)` 방식을 텍스트 및 이미지 생성 서비스 전체에 적용
- **환경 설정 단순화**: `.env.example`에서 Vertex 관련 필드(`VERTEX_PROJECT`, `VERTEX_LOCATION` 등)를 제거하고 `GOOGLE_API_KEY`만 필수 항목으로 남김
- **Mock 폴백 강화**: API 키 미설정 또는 인증 실패 시 자동으로 `MockGenAIClient`로 전환되어 개발 연속성 보장

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --------------------- | --------- | ---------------- |
| `backend/src/unknown_world/services/genai_client.py` | 수정 | Vertex AI 제거 및 API 키 전용 클라이언트 단순화 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | API 키 기반 이미지 생성(generate_content)으로 통합 |
| `backend/.env.example` | 수정 | Vertex AI 관련 설정 제거, API 키 전용 가이드 업데이트 |
| `vibe/tech-stack.md` | 수정 | GenAI 인증 방식(API 키 전용) 및 모델 라인업 문서화 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:

- `GenAIClient(api_key: str)` - `google.genai.Client`를 API 키 모드로 초기화
- `get_genai_client()` - `UW_MODE` 및 인증 상태에 따라 `Mock` 또는 `Real` 클라이언트 싱글톤 반환
- `ImageGenerator(api_key: str)` - 이미지 전용 API 키 기반 생성기

**설계 패턴/원칙**:

- **Singleton Pattern**: 클라이언트 인스턴스를 캐싱하여 리소스 낭비 방지
- **Graceful Degradation**: 인증 실패 시 `Mock` 모드로 자동 전환하여 서버 기동 보장 (RULE-004)
- **Security First**: `GOOGLE_API_KEY`는 환경변수로만 관리하며 로그 노출 차단 (RULE-007)

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 서비스 계정 JSON 키 파일이 더 이상 필요하지 않음
- **권한/보안**: GCP IAM 설정 대신 [Google AI Studio](https://aistudio.google.com/apikey)의 API 키 권한 관리로 일원화
- **빌드/의존성**: `google-cloud-aiplatform` 등 Vertex 전용 라이브러리 의존성 제거 가능성 확보

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-080-runbook.md` (예정)
- **실행 결과**: API 키만으로 텍스트 및 이미지 생성 서비스 정상 작동 확인

---

## 6. 리스크 및 주의사항

- **Quota 제한**: API 키 방식(무료 티어)은 리전별/계정별 QPM/RPM 제한이 있으므로 대규모 데모 시 주의 필요
- **보안**: `.env` 파일이 레포에 커밋되지 않도록 철저히 관리 (이미 `.gitignore`에 반영됨)

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. `vibe/tech-stack.md`의 인증 섹션 최신화
2. `backend/pyproject.toml`에서 불필요해진 GCP 관련 패키지 정리 검토

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
