# U-120[Mmp]: 제출용 배포 + 공개 데모 URL 확보 (U-100+U-101 흡수)

## 메타데이터

| 항목      | 내용                                                  |
| --------- | ----------------------------------------------------- |
| Unit ID   | U-120[Mmp]                                            |
| Phase     | MMP                                                   |
| 예상 소요 | 60분                                                  |
| 의존성    | U-138 (공개 레포 정리 완료 후 배포)                   |
| 우선순위  | ⚡ Critical (제출 필수: 공개 데모 링크)               |

## 작업 목표

해커톤 제출 요건인 **"공개 접근 가능한 데모 URL"**을 확보하기 위해, 프론트엔드+백엔드를 컨테이너화하고 **Cloud Run(또는 동등한 PaaS)**에 배포한다. 기존 U-100(Dockerfile), U-101(Cloud Run 배포)을 **하나의 유닛으로 흡수·간소화**한 제출 특화 배포이다.

**배경**: Devpost 제출 요건에 _"Public Project Link: A URL to your working product or interactive demo. It should be publicly accessible and not require a login or paywall."_ 가 명시되어 있다. 현재 프로젝트는 로컬에서만 실행 가능하며, 심사자가 접근할 수 있는 공개 URL이 없다. 데모 프로필 기반 즉시 시작이 이미 구현되어 있으므로(로그인/가입 불필요), 배포만 완료하면 요건을 충족한다. U-100(Dockerfile)과 U-101(Cloud Run 배포)을 개별 작업 대신 **하나의 흐름으로 통합**하여 제출 마감에 맞춘다. **U-138(공개 레포 준비)에서 정리된 공개 저장소 기반으로 배포**하므로 U-138 완료 후 진행한다.

**완료 기준**:

- `docker compose up` 한 번으로 프론트+백엔드가 로컬에서 실행됨
- Cloud Run(또는 동등 PaaS)에 배포되어 **공개 URL로 접근 가능**
- 공개 URL에서 데모 프로필 선택 → 텍스트 턴 → 이미지 생성 → 전체 플로우 동작
- **영문(en-US) 모드**에서 정상 동작 확인 (심사자 기본 언어)
- API 키/Secret이 이미지에 bake-in되지 않고 런타임 환경변수로 주입됨
- 프롬프트 원문/내부 추론이 공개 배포에서도 노출되지 않음

## 영향받는 파일

**생성**:

- `frontend/Dockerfile` - 프론트 빌드(Node 24) + 정적 서빙(nginx 멀티스테이지)
- `backend/Dockerfile` - 백엔드 실행(Python 3.14 + `uv sync` + Uvicorn)
- `docker-compose.yml` - 로컬 통합 실행 (프론트:8001, 백엔드:8011)
- (선택) `deploy.sh` 또는 `.github/workflows/deploy.yml` - 배포 자동화 스크립트

**수정**:

- `frontend/vite.config.ts` - (필요 시) 프로덕션 빌드 설정(API 프록시/base path) 조정
- `backend/src/unknown_world/main.py` - (필요 시) CORS origin에 배포 도메인 추가

**참조**:

- `vibe/tech-stack.md` - Node 24.12.0, Python 3.14.0 런타임 버전 (SSOT)
- `.cursor/rules/00-core-critical.mdc` - RULE-007(Secret 커밋 금지), RULE-010(버전 고정)
- `vibe/unit-plans/U-100[Mmp].md` - 흡수된 Dockerfile 계획
- `vibe/unit-plans/U-101[Mmp].md` - 흡수된 Cloud Run 배포 계획
- Devpost 제출 요건: "Public Project Link"

## 구현 흐름

### 1단계: Dockerfile 작성 (프론트+백엔드)

- **Frontend Dockerfile** (멀티스테이지):
  - Stage 1: `node:24-alpine` → `pnpm install` → `pnpm build`
  - Stage 2: `nginx:alpine` → `dist/` 복사 → 포트 8001 서빙
  - `nginx.conf`에서 `/api/*` 요청을 백엔드로 프록시
- **Backend Dockerfile**:
  - `python:3.14-slim` → `uv sync` → `uvicorn unknown_world.main:app --host 0.0.0.0 --port 8011`
  - 환경변수: `GOOGLE_API_KEY`, `UW_MODE` 등은 빌드 시 포함하지 않음 (런타임 주입)
- 버전은 tech-stack.md SSOT 준수

### 2단계: docker-compose 로컬 실행 검증

- `docker-compose.yml` 작성: frontend(8001) + backend(8011) 서비스 정의
- 환경변수는 `env_file: .env` 또는 `environment:` 블록으로 주입
- `docker compose up --build` → localhost:8001에서 데모 프로필 선택 → 턴 진행 확인
- 이미지 생성/Scanner/DnD 등 핵심 플로우 정상 동작 확인

### 3단계: Cloud Run(또는 PaaS) 배포

- **Option A (Cloud Run, 권장)**:
  - `gcloud builds submit --tag gcr.io/$PROJECT/$SERVICE` → 이미지 빌드
  - `gcloud run deploy --image ... --allow-unauthenticated --set-secrets=GOOGLE_API_KEY=...`
  - 프론트는 Cloud Run 또는 Firebase Hosting에 정적 배포
- **Option B (Railway/Render, 대안)**:
  - Dockerfile 기반 배포, 환경변수 대시보드로 Secret 관리
  - 무료/저비용 티어 활용
- 공개 URL 확보 + 접근 테스트 (로그인 없이 게임 시작 가능)

### 4단계: 배포 검증

- 공개 URL에서 영문(en-US) 데모 프로필 선택 → 텍스트 턴 → Action Deck → Economy → 전체 플로우
- 네트워크 오류/타임아웃 시 안전한 에러 메시지 확인
- 콘솔/네트워크 탭에서 API 키/프롬프트 노출 없음 확인
- Cold start 지연이 체감 가능한 수준인지 확인 (최소 인스턴스 1 설정 권장)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **MVP 전체**: 프론트+백엔드 코드 기반 (115개 유닛 완료)
- **U-100[Mmp]** (흡수): Dockerfile 계획 → 본 유닛의 1단계에 통합
- **U-101[Mmp]** (흡수): Cloud Run 배포 계획 → 본 유닛의 3단계에 통합

**다음 작업에 전달할 것**:

- **U-121[Mmp]**: README에 포함할 공개 데모 URL
- **U-122[Mmp]**: 데모 영상 녹화에 사용할 배포된 환경
- **CP-SUB-01**: 제출 체크포인트의 "공개 링크" 항목
- **U-102[Mmp]** (M6): GCS 스토리지 어댑터의 기반 인프라
- **CP-MMP-01** (M6): 배포/관측 게이트의 기반 (U-100+U-101 대체)

## 주의사항

**기술적 고려사항**:

- (RULE-007) Secret은 이미지에 bake-in 금지. Cloud Run Secret Manager 또는 환경변수로만 주입
- (RULE-010) 베이스 이미지 버전은 tech-stack.md 기준 고정 (Node 24.12.0, Python 3.14.0)
- CORS 설정: 프론트 배포 도메인에서 백엔드 API 호출이 가능하도록 설정
- Cloud Run cold start: 최소 1 인스턴스(`--min-instances=1`) 설정 권장 (심사자 대기 시간 최소화)
- 배포 리전: **us-central1** 권장 (심사자 위치 기준, 지연 최소화)

**잠재적 리스크**:

- Cloud Run 배포 시 GCP 프로젝트 권한/billing 문제 → 사전 확인, 필요 시 Railway/Render 대안
- 이미지 생성 지연이 배포 환경에서 더 클 수 있음 → 텍스트 우선 출력으로 흡수 (이미 구현)
- 네트워크 지연으로 Streaming TTFB 목표(2s) 초과 가능 → 배포 리전을 US로 고정
- nginx 설정 오류 시 API 프록시 실패 → 로컬 docker compose로 사전 검증 필수

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 배포 플랫폼 선택
  - Option A: Google Cloud Run (GCP 생태계, Secret Manager 활용) → **권장 (Gemini 해커톤이므로 GCP 선호)**
  - Option B: Railway/Render (간편, 무료 티어, GCP 설정 불필요)
  - Option C: Firebase Hosting(프론트) + Cloud Run(백엔드) 분리

- [ ] **Q2**: 프론트+백엔드를 하나의 컨테이너로 합칠까?
  - Option A: 분리 (프론트 nginx + 백엔드 uvicorn, compose 연결) → **권장 (관심사 분리)**
  - Option B: 단일 컨테이너 (nginx → uvicorn 프록시, 배포 단순화)

## 참고 자료

- `vibe/tech-stack.md` - 런타임/배포 기준 (SSOT)
- [Cloud Run 배포 가이드](https://cloud.google.com/run/docs/quickstarts)
- `.cursor/rules/00-core-critical.mdc` - RULE-007/010
- Devpost 제출 요건: "Public Project Link: publicly accessible, no login or paywall"
- `vibe/unit-plans/U-100[Mmp].md`, `vibe/unit-plans/U-101[Mmp].md` - 흡수된 원본 계획
