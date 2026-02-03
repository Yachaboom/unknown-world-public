# U-067[Mvp]: 핫픽스 - Vertex AI Production 설정 수정 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-067[Mvp]
- **단계 번호**: 2.3 (MVP 핫픽스)
- **작성 일시**: 2026-02-04 15:30
- **담당**: AI Agent

---

## 1. 작업 요약

Vertex AI 설정을 Production 환경에 맞게 최적화하고, 리전 설정을 `global`로 표준화하여 데모 및 배포 환경에서의 안정성을 확보했습니다. 환경별(Dev/Staging/Prod) 설정 가이드를 명시하여 운영 편의성을 높였습니다.

---

## 2. 작업 범위

- **Vertex AI 리전 표준화**: `VERTEX_LOCATION` 기본값을 `us-central1`에서 `global`로 변경하여 모델 가용성 극대화
- **환경별 설정 가이드**: `.env.example`에 개발, 스테이징, 프로덕션 환경별 권장 설정 및 인증 방식 명시
- **서비스 초기화 로직 강화**: `GenAIClient` 및 `ImageGenerationService`에서 Vertex AI 설정 로드 및 인증 로직 검증
- **테스트 픽스처 업데이트**: 실제 Vertex AI 호출을 위한 테스트 요청 데이터 구조 동기화

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/.env.example` | 수정 | 환경별 설정 템플릿 및 가이드 업데이트 |
| `backend/src/unknown_world/services/genai_client.py` | 수정 | Vertex AI 클라이언트 초기화 및 리전 설정 적용 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | 이미지 생성 서비스의 Vertex AI 설정 연동 |
| `backend/tests/fixtures/*.json` | 수정 | 테스트 픽스처(Turn/Image Request) 구조 업데이트 |
| `vibe/unit-runbooks/U-067-vertex-ai-production-runbook.md` | 신규 | 실행 가이드 및 검증 시나리오 작성 |
| `vibe/debt-log.md` | 수정 | 설정 관련 부채 항목 업데이트 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**Vertex AI 설정 인터페이스**:
- `VERTEX_LOCATION`: 기본값 `global`. 모델별 리전 제약을 최소화하고 최신 모델 지원을 우선함.
- `ENVIRONMENT`: `development`, `staging`, `production` 구분을 통해 인증 방식 및 로깅 수준 제어.

**서비스 초기화**:
- `genai.Client(vertexai=True, project=..., location=...)`: SDK 수준에서 Vertex AI 통합 인증 및 엔드포인트 관리.

### 4.2 외부 영향 분석

- **인증(IAM)**: 로컬 개발 시에는 서비스 계정 키 파일(JSON)을 사용하고, Cloud Run(Production) 환경에서는 서비스 계정 IAM 역할을 사용하는 권장 방식을 확립함.
- **비용/할당량(Quota)**: `global` 리전 사용으로 특정 리전의 Quota 부족 시 유연한 대응이 가능하도록 함.

### 4.3 가정 및 제약사항

- 사용 모델(`gemini-3-*`)이 Vertex AI `global` 엔드포인트에서 가용함을 전제로 함.
- Production 환경에서는 보안을 위해 키 파일 커밋을 금지하고 환경 변수를 통한 주입을 권장함.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-067-vertex-ai-production-runbook.md`
- **실행 결과**: 헬스 체크, 텍스트 생성, 이미지 생성(티어링 포함) 시나리오에 대해 `global` 리전 설정으로 검증 완료.
- **참조**: 실제 배포 및 테스트 방법은 위 런북 파일 참조.

---

## 6. 리스크 및 주의사항

- **리전별 지연 시간**: `global` 리전 사용 시 요청이 물리적으로 먼 리전으로 라우팅될 가능성이 있으나, MVP 단계에서는 모델 가용성을 우선함.
- **Quota 모니터링**: 데모 중 다수 요청 발생 시 Quota 초과 리스크가 있으므로 GCP 콘솔 모니터링 필요.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **환경 변수 반영**: 실제 배포 환경(Staging/Prod)에 업데이트된 `VERTEX_LOCATION=global` 반영.
2. **모니터링 강화**: Vertex AI API 호출 성공률 및 지연 시간 트래킹.

### 7.2 의존 단계 확인

- **선행 단계**: U-066[Mvp] (이미지 생성 지연 흡수 플로우) 완료
- **후속 단계**: U-068~U-075 (안정적인 API 호출 기반 기능 개발)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---
_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
