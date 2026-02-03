# U-067 Vertex AI Production 설정 실행 가이드

## 1. 개요

Vertex AI Production 설정을 수정하여, 데모/배포 환경에서 안정적으로 Gemini 모델을 사용할 수 있도록 합니다.

**주요 변경 사항:**
- `VERTEX_LOCATION` 기본값을 `us-central1`에서 `global`로 변경
- `.env.example`에 환경별(dev/staging/prod) 설정 가이드 추가

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-066[Mvp]
- 선행 완료 필요: 없음 (백엔드 서비스 계정 설정만 완료되어 있으면 됨)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치 (uv 사용)
uv sync
```

### 2.2 환경 설정 파일 생성

```bash
# .env.example을 .env로 복사
cp .env.example .env

# 환경 설정 편집 (필수 항목 수정)
# - GOOGLE_APPLICATION_CREDENTIALS: 서비스 계정 키 파일 경로
# - VERTEX_PROJECT: GCP 프로젝트 ID
# - VERTEX_LOCATION: 리전 (기본값: global)
```

### 2.3 즉시 실행

```bash
# 백엔드 서버 시작
uv run uvicorn unknown_world.main:app --port 8011
```

### 2.4 첫 화면/결과 확인

서버 시작 시 콘솔 출력:
```
[Startup] .env path: D:\Dev\unknown-world\backend\.env
[Startup] .env exists: True
[Startup] dotenv loaded: True
[Startup] UW_MODE: real
INFO:     Uvicorn running on http://127.0.0.1:8011
```

성공 지표: 
- `UW_MODE: real` 출력
- `Uvicorn running` 메시지 출력

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 헬스 체크

**목적**: 백엔드 서버 정상 동작 및 설정 확인

**실행**:

```bash
curl -s http://localhost:8011/health
```

**기대 결과**:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "service": "unknown-world-backend",
  "rembg": {
    "status": "ready",
    "installed": true,
    "preloaded_models": ["birefnet-general"],
    "missing_models": [],
    "last_error": null
  }
}
```

**확인 포인트**:
- ✅ `status: "ok"` 반환
- ✅ `rembg.status: "ready"` 또는 `"degraded"` (이미지 후처리 상태)

---

### 시나리오 B: 텍스트 생성 API 테스트 (Vertex AI global 리전)

**목적**: Vertex AI global 리전에서 Gemini 텍스트 모델 정상 동작 확인

**실행**:

```bash
curl -s -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "새로운 세계를 탐험한다",
    "client": {
      "viewport_w": 1920,
      "viewport_h": 1080,
      "theme": "dark"
    },
    "economy_snapshot": {
      "signal": 100,
      "memory_shard": 5
    }
  }' \
  --max-time 120
```

**기대 결과**:
- 스트리밍 응답 (NDJSON)
- `stage` 이벤트들 (parse → validate → plan → resolve → render → verify → commit)
- `narrative_delta` 이벤트들 (내러티브 텍스트 조각)
- `final` 이벤트 (최종 TurnOutput)

```json
{"type": "stage", "name": "parse", "status": "start"}
{"type": "stage", "name": "parse", "status": "complete"}
...
{"type": "badges", "badges": ["schema_ok", "economy_ok", "safety_ok", "consistency_ok"]}
...
{"type": "narrative_delta", "text": "..."}
{"type": "final", "data": {...}}
```

**확인 포인트**:
- ✅ `badges`에 `schema_ok`, `economy_ok`, `safety_ok`, `consistency_ok` 포함
- ✅ `final.data.narrative`에 한국어 텍스트 포함
- ✅ `final.data.economy.balance_after.signal >= 0` (잔액 음수 금지)

---

### 시나리오 C: 이미지 생성 API 테스트 (모델 티어링)

**목적**: Vertex AI global 리전에서 이미지 생성 모델 정상 동작 확인

**실행 (FAST 모델)**:

```bash
curl -s -X POST http://localhost:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful fantasy landscape with mountains",
    "aspect_ratio": "16:9",
    "model_label": "FAST"
  }' \
  --max-time 120
```

**기대 결과 (FAST)**:

```json
{
  "success": true,
  "status": "completed",
  "image_id": "img_...",
  "image_url": "/static/images/generated/img_....png",
  "message": "이미지가 성공적으로 생성되었습니다.",
  "generation_time_ms": 10000-15000,
  "model_label": "FAST",
  "turn_id": null
}
```

**실행 (QUALITY 모델)**:

```bash
curl -s -X POST http://localhost:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A detailed cyberpunk city at night",
    "aspect_ratio": "16:9",
    "model_label": "QUALITY"
  }' \
  --max-time 180
```

**기대 결과 (QUALITY)**:

```json
{
  "success": true,
  "status": "completed",
  "image_id": "img_...",
  "image_url": "/static/images/generated/img_....png",
  "generation_time_ms": 20000-30000,
  "model_label": "QUALITY"
}
```

**확인 포인트**:
- ✅ `success: true` 반환
- ✅ `status: "completed"` 반환
- ✅ `image_url` 경로에 이미지 파일 생성됨
- ✅ FAST 모델: ~10-15초, QUALITY 모델: ~20-30초 (네트워크 상태에 따라 다름)

---

## 4. 실행 결과 확인

### 4.1 로그 확인

서버 실행 중 콘솔에서 다음 로그 확인:

```
INFO:     [GenAI] Vertex AI 클라이언트 초기화 완료
INFO:     [ImageGen] Vertex AI 이미지 생성기 초기화 완료
```

주요 로그 메시지:
- `[INFO] Vertex AI 클라이언트 초기화 완료`: 텍스트 생성 클라이언트 정상
- `[INFO] Vertex AI 이미지 생성기 초기화 완료`: 이미지 생성 클라이언트 정상
- `[WARNING] Mock 모드로 초기화됨`: 환경 설정 문제로 Mock 모드 전환

### 4.2 생성 파일

- 이미지 파일: `backend/.data/images/generated/img_*.png`

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 헬스 체크 `status: "ok"` 반환
- ✅ 텍스트 생성 API에서 `badges`에 모든 `_ok` 배지 포함
- ✅ 이미지 생성 API에서 `success: true` 반환
- ✅ Vertex AI global 리전에서 모델 호출 성공

**실패 시 확인**:
- ❌ `Mock 모드로 초기화됨` 로그 → 서비스 계정 키 파일 경로/권한 확인
- ❌ `quota 초과` 오류 → GCP 프로젝트 quota 확인
- ❌ `인증 실패` 오류 → `GOOGLE_APPLICATION_CREDENTIALS` 환경변수 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `Mock 모드로 초기화됨 (실제 API 호출 없음)`

- **원인**: 서비스 계정 키 파일을 찾을 수 없거나 인증 실패
- **해결**: 
  1. `.env` 파일의 `GOOGLE_APPLICATION_CREDENTIALS` 경로 확인
  2. 키 파일 존재 여부 확인
  3. 키 파일의 GCP 프로젝트에 Vertex AI API 활성화 확인

**오류**: `quota 초과` 또는 `429 Too Many Requests`

- **원인**: Vertex AI quota 제한 도달
- **해결**:
  1. GCP 콘솔에서 Vertex AI quota 확인
  2. 필요 시 quota 증가 요청
  3. 요청 간격 늘리기

**오류**: `모델을 찾을 수 없음` 또는 `404 Not Found`

- **원인**: 지정한 모델 ID가 해당 리전에서 사용 불가
- **해결**:
  1. `VERTEX_LOCATION=global` 확인 (기본값)
  2. 모델 가용성 확인: [Gemini Model Availability](https://ai.google.dev/gemini-api/docs/models/gemini)

### 5.2 환경별 주의사항

- **Windows**: 경로에 백슬래시(`\`) 대신 슬래시(`/`) 사용 권장
- **Cloud Run**: 서비스 계정 키 파일 대신 IAM 역할로 인증 (키 파일 불필요)
- **로컬 개발**: `gcloud auth application-default login` 실행 후 ADC 사용 가능

---

## 6. 환경별 설정 가이드

### 6.1 Development (로컬 개발)

```bash
# .env
UW_MODE=real                              # 또는 mock (API 비용 절감)
ENVIRONMENT=development
GOOGLE_APPLICATION_CREDENTIALS=./your-service-account-key.json
VERTEX_PROJECT=your-project-dev
VERTEX_LOCATION=global
```

### 6.2 Staging (테스트 환경)

```bash
# .env
UW_MODE=real
ENVIRONMENT=staging
GOOGLE_APPLICATION_CREDENTIALS=./your-service-account-key.json
VERTEX_PROJECT=your-project-staging
VERTEX_LOCATION=global
```

### 6.3 Production (프로덕션/데모)

```bash
# .env
UW_MODE=real
ENVIRONMENT=production
VERTEX_PROJECT=your-project-prod          # 필수
VERTEX_LOCATION=global                     # 기본값 권장
# GOOGLE_APPLICATION_CREDENTIALS는 Cloud Run에서 불필요 (IAM 역할 사용)
```

---

## 7. 다음 단계

이 유닛을 기반으로 다음에 진행할 작업:
- **U-068~U-075**: Production 환경에서 안정적인 Gemini API 호출 기반 제공
- **CP-MVP-03**: Production 설정 기반 데모 루프 검증
