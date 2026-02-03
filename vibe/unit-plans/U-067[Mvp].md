# U-067[Mvp]: 핫픽스 - Vertex AI Production 설정 수정

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-067[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 30분                              |
| 의존성    | U-066[Mvp]                        |
| 우선순위  | ⚡ Critical (Production 환경 필수) |

## 작업 목표

Vertex AI 설정을 **Production 환경에 맞게 수정**하여, 데모/배포 환경에서 안정적으로 Gemini 모델을 사용할 수 있도록 한다.

**배경**: 현재 Vertex AI 설정이 개발/테스트용으로 구성되어 있어, Production 환경에서 quota 제한, 리전 설정, 프로젝트 ID 등이 최적화되지 않았을 수 있다. 데모 안정성을 위해 Production-ready 설정으로 전환이 필요하다.

**완료 기준**:

- Vertex AI Production 프로젝트/리전 설정이 올바르게 적용됨
- `.env.example`에 Production 환경 설정 가이드가 명시됨
- 실모델(real) 모드에서 텍스트/이미지 생성이 정상 동작
- 환경별(dev/staging/prod) 설정 분리가 가능하도록 구조화됨

## 영향받는 파일

**수정**:

- `backend/.env.example` - Production 설정 템플릿 업데이트
- `backend/src/unknown_world/config/settings.py` - 환경별 설정 로직 보강
- `backend/src/unknown_world/config/models.py` - 모델 엔드포인트/리전 설정 확인
- `backend/src/unknown_world/services/gemini_client.py` - Vertex AI 클라이언트 초기화 로직 검토

**참조**:

- `vibe/tech-stack.md` - Vertex AI/모델 라인업 설정
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 모델 사용처

## 구현 흐름

### 1단계: 현재 Vertex AI 설정 검토

- 현재 `.env` 설정 항목 확인 (VERTEX_PROJECT, VERTEX_LOCATION, GOOGLE_APPLICATION_CREDENTIALS 등)
- 사용 중인 모델 ID와 Vertex AI 리전 호환성 확인
- quota/rate limit 설정 확인

### 2단계: Production 설정 구성

- Production용 프로젝트 ID / 리전(us-central1 등) 확정
- 환경별(dev/staging/prod) 설정 분리 구조 적용
- `.env.example`에 Production 권장 설정 및 주석 추가

```python
# backend/src/unknown_world/config/settings.py
class Settings(BaseSettings):
    # Vertex AI 설정
    vertex_project: str = Field(description="GCP Project ID for Vertex AI")
    vertex_location: str = Field(default="us-central1", description="Vertex AI region")
    
    # 환경 구분
    environment: Literal["development", "staging", "production"] = "development"
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"
```

### 3단계: 모델 엔드포인트 검증

- `gemini-3-flash-preview`, `gemini-3-pro-preview`, `gemini-3-pro-image-preview` 등 사용 모델이 해당 리전에서 사용 가능한지 확인
- Production 환경에서 모델 가용성 테스트

### 4단계: 연결 및 인증 테스트

- Production 환경 설정으로 로컬 테스트 실행
- 텍스트 생성 / 이미지 생성 모두 정상 동작 확인
- 에러 핸들링(quota 초과, 인증 실패 등) 동작 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-066[Mvp]](U-066[Mvp].md) - 이미지 생성 지연 흡수 플로우(모델 티어링 포함)
- **참조**: `backend/.env.example` - 현재 환경 설정 템플릿

**다음 작업에 전달할 것**:

- U-068~U-075: Production 환경에서 안정적인 Gemini API 호출 기반 제공
- CP-MVP-03: Production 설정 기반 데모 루프 검증

## 주의사항

**기술적 고려사항**:

- (RULE-007) 서비스 계정 키/토큰 등 비밀정보를 레포에 커밋하지 않음
- (RULE-010) tech-stack.md의 모델 ID/버전 고정 원칙 준수
- Vertex AI 리전별 모델 가용성이 다를 수 있음 - 문서 확인 필수

**잠재적 리스크**:

- Production 프로젝트 quota 제한으로 데모 중 요청 실패 가능 → quota 사전 확인 및 요청 시 백오프 로직 적용
- 리전 변경 시 지연(latency) 변화 가능 → 가장 가까운 리전 또는 모델 지원 리전 선택

## 페어링 질문 (결정 필요)

- [x] **Q1**: Production 리전 선택?
  - Option A: `us-central1` (가장 안정적, 모델 지원 폭 넓음)
  - Option B: `asia-northeast3` (한국 근접, 지연 최소화)
  - Option C: 환경별로 다르게 설정 가능하도록 구성
  **A1**: global

- [x] **Q2**: 환경 분리 수준?
  - Option A: 단일 `.env` 파일에 환경별 주석으로 가이드
  - Option B: `.env.development`, `.env.production` 등 파일 분리
  - Option C: 환경 변수 `ENVIRONMENT`로 동적 로드
  **A2**: Option A

## 참고 자료

- `vibe/tech-stack.md` - GenAI (Gemini + Vertex AI) 섹션
- [Vertex AI Locations](https://cloud.google.com/vertex-ai/docs/general/locations)
- [Gemini Model Availability](https://ai.google.dev/gemini-api/docs/models/gemini)
- `backend/.env.example` - 현재 환경 설정 템플릿
