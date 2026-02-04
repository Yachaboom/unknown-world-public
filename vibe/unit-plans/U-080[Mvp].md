# U-080[Mvp]: ⚡핫픽스(최우선) - Vertex AI 제거 → API 키 인증 전용

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-080[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 60분                              |
| 의존성    | None (최우선, 독립 실행)          |
| 우선순위  | ⚡ **Critical (최우선 핫픽스)**   |

## 작업 목표

Vertex AI 서비스 계정 인증을 **완전히 제거**하고, **Gemini API 키 인증만 사용**하도록 백엔드를 단순화한다. 서비스 계정 관련 코드/설정을 삭제하여 유지보수 복잡도를 줄인다.

**배경**: Vertex AI 서비스 계정 인증 방식은 (1) GCP 프로젝트 설정, (2) 서비스 계정 키 파일 관리, (3) IAM 권한 설정 등 복잡한 절차가 필요하다. MVP/데모 환경에서는 **API 키 하나로 모든 Gemini 기능(텍스트/이미지)**을 사용할 수 있으므로, 서비스 계정 방식을 완전히 제거하고 단순화한다.

**완료 기준**:

- 백엔드가 **`GOOGLE_API_KEY` 환경 변수만으로** Gemini API를 호출함
- **Vertex AI 관련 코드/설정이 완전히 제거**됨:
  - `GOOGLE_APPLICATION_CREDENTIALS` 환경 변수 불필요
  - `VERTEX_PROJECT`, `VERTEX_LOCATION` 설정 불필요
  - 서비스 계정 키 파일 불필요
- `.env.example`에 **API 키만** 설정 가이드로 명시됨
- 텍스트 생성 / 이미지 생성 모두 API 키로 정상 동작
- (RULE-007) API 키는 레포에 커밋되지 않음

## 영향받는 파일

**수정**:

- `backend/.env.example` - Vertex AI 관련 설정 제거, `GOOGLE_API_KEY`만 남김
- `backend/.env` - Vertex AI 설정 제거 (로컬)
- `backend/src/unknown_world/config/settings.py` - Vertex 관련 필드 제거, `google_api_key`만 유지
- `backend/src/unknown_world/config/models.py` - Vertex 리전/프로젝트 상수 제거
- `backend/src/unknown_world/services/gemini_client.py` - **Vertex AI 클라이언트 코드 완전 제거**, API 키 전용으로 단순화
- `backend/src/unknown_world/services/image_generation.py` - API 키 인증만 사용

**삭제 대상 (Vertex AI 관련)**:

- `GOOGLE_APPLICATION_CREDENTIALS` 환경 변수 참조
- `VERTEX_PROJECT`, `VERTEX_LOCATION` 설정
- `vertexai.init()` 호출 코드
- 서비스 계정 인증 분기 로직

**참조**:

- `vibe/tech-stack.md` - GenAI 섹션 (API 키 인증으로 업데이트 예정)
- [Gemini API Key Setup](https://ai.google.dev/gemini-api/docs/api-key)
- [google-generativeai Python SDK](https://ai.google.dev/gemini-api/docs/get-started/python)

## 구현 흐름

### 1단계: Vertex AI 관련 코드 제거

- `settings.py`에서 Vertex 관련 필드 완전 제거:
  - `google_application_credentials` 제거
  - `vertex_project` 제거
  - `vertex_location` 제거
  - `auth_mode` 분기 로직 제거 (API 키만 사용)

```python
# backend/src/unknown_world/config/settings.py
class Settings(BaseSettings):
    google_api_key: str = Field(description="Gemini API Key (필수)")
    # Vertex AI 관련 필드 완전 제거
    
    @property
    def has_api_key(self) -> bool:
        return bool(self.google_api_key)
```

### 2단계: Gemini 클라이언트 단순화

- `gemini_client.py`에서 Vertex AI 코드 완전 제거
- API 키 전용으로 단순화

```python
# backend/src/unknown_world/services/gemini_client.py
import google.generativeai as genai

def configure_genai(api_key: str):
    """API 키로 Gemini 클라이언트 설정 (Vertex AI 제거됨)"""
    genai.configure(api_key=api_key)

def get_gemini_model(model_name: str) -> genai.GenerativeModel:
    """Gemini 모델 인스턴스 반환"""
    return genai.GenerativeModel(model_name)
```

### 3단계: 이미지 생성 서비스 업데이트

- `image_generation.py`에서 Vertex AI 분기 제거
- API 키 기반 이미지 생성만 사용

### 4단계: 환경 설정 단순화

- `.env.example` 업데이트 (Vertex 관련 완전 제거):

```bash
# Gemini API 키 (필수)
# https://aistudio.google.com/apikey 에서 발급
GOOGLE_API_KEY=your-api-key-here

# 운영 모드
UW_MODE=real  # mock / real
```

### 5단계: 기존 Vertex 참조 정리

- 코드 내 `vertexai` import 제거
- `VERTEX_*` 환경 변수 참조 제거
- `GOOGLE_APPLICATION_CREDENTIALS` 참조 제거

### 6단계: 동작 검증

- API 키만으로 로컬 실행 테스트
- 텍스트 생성 정상 동작 확인
- 이미지 생성 정상 동작 확인
- 에러 핸들링(잘못된 API 키, quota 초과 등) 동작 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- 없음 (최우선 독립 실행)
- **참조**: `backend/src/unknown_world/services/gemini_client.py` 현재 구조 (Vertex AI 코드 제거 대상)

**다음 작업에 전달할 것**:

- **U-068, U-069**: 안정적인 API 키 기반 Gemini 호출 기반 제공
- **U-081~U-084**: API 키 인증으로 통합된 환경에서 UI/이미지 작업 진행
- **CP-MVP-03**: API 키 기반 데모 루프 검증

## 주의사항

**기술적 고려사항**:

- (RULE-007) API 키/토큰 등 비밀정보를 레포에 커밋하지 않음 - `.env`는 `.gitignore`에 포함
- (RULE-010) tech-stack.md의 모델 ID/버전 고정 원칙 준수
- **Vertex AI 코드 완전 제거**: 분기 로직 없이 API 키만 사용하여 코드 복잡도 감소
- API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급

**잠재적 리스크**:

- API 키 노출 시 보안 위험 → `.env` 파일 관리 철저, 주기적 키 로테이션 권장
- API 키 방식의 quota/rate limit 확인 필요 (무료 티어 제한 있음)
- MMP에서 엔터프라이즈 기능이 필요해지면 그때 Vertex AI 재도입 검토

## 페어링 질문 (결정 완료)

- [x] **Q1**: Vertex AI 방식 코드 유지?
  - ~~Option A: 완전 제거 (단순화)~~
  - ~~Option B: fallback으로 유지 (유연성)~~
  - **결정: Option A - 완전 제거** (MVP 단순화, MMP에서 필요 시 재도입)

- [x] **Q2**: 이미지 생성 API 키 미지원 시 대응?
  - Gemini API는 텍스트/이미지 모두 API 키 지원 → 문제 없음

- [x] **Q3**: 기본 인증 모드?
  - **결정: API 키 전용** (Vertex AI 분기 제거)

## 참고 자료

- [Gemini API Key Setup](https://ai.google.dev/gemini-api/docs/api-key)
- [google-generativeai Python SDK](https://ai.google.dev/gemini-api/docs/get-started/python)
- [Gemini API Models](https://ai.google.dev/gemini-api/docs/models/gemini)
- `backend/.env.example` - 환경 설정 템플릿
