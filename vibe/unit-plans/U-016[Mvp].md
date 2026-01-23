# U-016[Mvp]: Vertex 인증 + google-genai 클라이언트 + 모델 라벨 고정

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-016[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-003       |
| 우선순위  | ⚡ Critical |

## 작업 목표

백엔드에서 Vertex AI 서비스 계정 인증으로 Gemini를 호출할 수 있도록 **google-genai 클라이언트 래퍼**를 만들고, 모델 라벨/ID를 `vibe/tech-stack.md` 기준으로 고정한다.

**배경**: MVP는 BYOK(사용자 API 키 입력)를 금지하고, 모델 ID/버전은 SSOT로 고정해야 한다. (RULE-007/010)

**완료 기준**:

- 백엔드에 “GenAI 클라이언트 생성/호출”을 담당하는 모듈이 생기고, 서비스 계정 기반 인증(로컬/배포)을 전제로 한다.
- 텍스트/이미지 모델 ID가 SSOT에 맞게 상수로 고정된다:
  - FAST: `gemini-3-flash-preview`
  - QUALITY: `gemini-3-pro-preview`
  - IMAGE: `gemini-3-pro-image-preview` (고정) (RULE-010)
- 키/토큰/쿠키 등 비밀정보가 레포/로그/UI에 노출되지 않는 설계가 포함된다. (RULE-007)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/services/genai_client.py` - google-genai 클라이언트 팩토리/래퍼
- `backend/src/unknown_world/config/models.py` - 모델 라벨/ID 상수(tech-stack SSOT)

**수정**:

- `backend/requirements.txt` - `google-genai==1.56.0` 등 의존성 추가(tech-stack 기준)

**참조**:

- `vibe/tech-stack.md` - google-genai 버전, 모델 ID 고정
- `.cursor/rules/20-backend-orchestrator.mdc` - Vertex 인증/비밀정보 금지
- `.cursor/rules/00-core-critical.mdc` - RULE-007/010

## 구현 흐름

### 1단계: 인증/실행 환경 가정 확정

- 로컬: ADC 또는 `GOOGLE_APPLICATION_CREDENTIALS`(로컬 파일, 레포에 포함 금지)로 Vertex 인증
- 배포: Cloud Run 서비스 계정 권한으로 인증(키 파일 커밋 없음)

### 2단계: 모델 라벨/ID 상수화

- “FAST/QUALITY/IMAGE” 라벨을 코드 상수로 고정하고, 모델 ID를 tech-stack과 1:1로 맞춘다.
- 로그/UI에는 모델 ID 원문 대신 라벨(FAST/QUALITY/REF 등) 우선 노출을 기본으로 한다. (RULE-008)

### 3단계: 호출 래퍼 설계(보안/관측 고려)

- 호출 래퍼는 요청 메타(라벨/버전/정책)만 로깅하고, 프롬프트 원문/비밀정보는 로깅하지 않는다. (RULE-007/008)
- 자격 증명 미설정 시에도 개발이 멈추지 않도록 “mock fallback 모드”를 설계한다(실제 구현은 선택).

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-003[Mvp]](U-003[Mvp].md) - FastAPI 백엔드 골격/의존성 관리

**다음 작업에 전달할 것**:

- U-017에서 Structured Outputs 호출을 수행할 클라이언트/모델 상수
- U-019(이미지 생성), U-021(이미지 이해)에서 재사용할 멀티모달 호출 기반

## 주의사항

**기술적 고려사항**:

- (RULE-007) BYOK 흐름(사용자 키 입력/저장) 금지: 인증은 백엔드 런타임에서만 처리한다.
- (RULE-010) 모델/버전 임의 변경 금지: tech-stack 고정.

**잠재적 리스크**:

- 로컬에서 Vertex 인증 설정이 어려워 개발이 막힐 수 있음 → mock 모드(모의 Orchestrator)와 병행해 UI 개발이 멈추지 않게 한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: “실모델 vs 모의모드” 전환을 어떤 방식으로 둘까?
  - Option A: 환경변수 `UW_MODE=mock|real` (권장: 단순)
  - Option B: 요청 파라미터/헤더로 제어(데모에는 유리하지만 보안/운영 고려 필요)
  **A1**: Option A

## 참고 자료

- `vibe/tech-stack.md` - google-genai/모델 ID 고정
- `.cursor/rules/20-backend-orchestrator.mdc` - Vertex 인증/보안
- `.cursor/rules/00-core-critical.mdc` - RULE-007/010
