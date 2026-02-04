# U-080 Vertex AI 제거 → API 키 인증 전용 실행 가이드

## 1. 개요

Vertex AI 서비스 계정 인증을 **완전히 제거**하고, **Gemini API 키 인증만 사용**하도록 백엔드를 단순화했습니다.

**주요 변경사항**:
- Vertex AI 관련 코드/설정 완전 제거
- `GOOGLE_API_KEY` 환경변수만으로 모든 Gemini 기능 사용
- 서비스 계정 키 파일/IAM 권한 설정 불필요

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: 없음 (최우선 독립 실행)
- 선행 완료 필요: 없음

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# backend 디렉토리로 이동
cd backend

# 의존성 설치 (uv 사용)
uv sync
```

### 2.2 API 키 설정 (필수)

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 API 키 발급
2. `.env` 파일에 API 키 설정:

```bash
# .env.example을 .env로 복사 (최초 1회)
cp .env.example .env

# .env 파일 편집
GOOGLE_API_KEY=your-actual-api-key-here
```

**⚠️ 중요**: `.env` 파일은 절대 Git에 커밋하지 마세요 (RULE-007)

### 2.3 서버 실행

```bash
cd backend
uv run uvicorn unknown_world.main:app --host 0.0.0.0 --port 8011
```

### 2.4 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8011/docs` 접속
- Swagger UI가 정상 로드되면 성공
- 성공 지표: `[Startup] UW_MODE: real` 로그 메시지 출력

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 헬스체크

**목적**: 서버 및 이미지 서비스 정상 동작 확인

**실행**:

```bash
# 기본 헬스체크
curl http://localhost:8011/health

# 이미지 서비스 헬스체크
curl http://localhost:8011/api/image/health
```

**기대 결과**:

```json
// /health
{"status":"ok","version":"0.1.0","service":"unknown-world-backend",...}

// /api/image/health
{"status":"ok","available":true,"mode":"real","model":"gemini-3-pro-image-preview"}
```

**확인 포인트**:
- ✅ `status: "ok"` 반환
- ✅ `mode: "real"` (API 키 설정 시)
- ✅ `available: true` (클라이언트 초기화 성공)

---

### 시나리오 B: 텍스트 생성 (턴 처리)

**목적**: API 키로 Gemini 텍스트 생성 정상 동작 확인

**전제 조건**:
- 유효한 `GOOGLE_API_KEY` 설정

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "type": "narrative_choice",
      "choice_id": "test",
      "content": "숲 속으로 들어간다"
    },
    "language": "ko-KR"
  }'
```

**기대 결과**:
- SSE 스트림으로 응답 수신
- `final` 이벤트에 내러티브 텍스트 포함

**확인 포인트**:
- ✅ 응답 스트림 수신
- ✅ 한글 내러티브 생성
- ✅ `agent_console.badges`에 `schema_ok` 포함

---

### 시나리오 C: 이미지 생성

**목적**: API 키로 Gemini 이미지 생성 정상 동작 확인

**전제 조건**:
- 유효한 `GOOGLE_API_KEY` 설정

**실행**:

```bash
curl -X POST http://localhost:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A mystical forest at dawn with glowing mushrooms"
  }'
```

**기대 결과**:

```json
{
  "status": "completed",
  "image_id": "img_...",
  "image_url": "/images/generated/img_....png",
  "generation_time_ms": 15000
}
```

**확인 포인트**:
- ✅ `status: "completed"`
- ✅ `image_url` 경로 반환
- ✅ 생성된 이미지 파일 확인: `backend/.data/images/generated/`

---

## 4. 실행 결과 확인

### 4.1 로그 확인

서버 시작 시 다음 로그를 확인:

```
[Startup] .env path: D:\Dev\unknown-world\backend\.env
[Startup] .env exists: True
[Startup] dotenv loaded: True
[Startup] UW_MODE: real
```

API 키 클라이언트 초기화 로그:

```
[GenAI] API 키 클라이언트 초기화 완료 (mode=REAL, auth=api_key)
[ImageGen] API 키 이미지 생성기 초기화 완료 (model=gemini-3-pro-image-preview, auth=api_key)
```

### 4.2 생성 파일

- 이미지 파일: `backend/.data/images/generated/img_*.png`

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 서버 시작 시 `UW_MODE: real` 출력
- ✅ `/health` 엔드포인트 정상 응답
- ✅ API 키로 텍스트/이미지 생성 성공

**실패 시 확인**:
- ❌ `GOOGLE_API_KEY not set` 경고 → `.env` 파일에 API 키 설정
- ❌ `Invalid API key` 에러 → API 키 올바른지 확인, [AI Studio](https://aistudio.google.com/apikey)에서 재발급
- ❌ `Quota exceeded` 에러 → API quota 확인, 무료 티어 제한 주의

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `GOOGLE_API_KEY 환경변수가 설정되지 않음 - Mock 모드로 전환 권장`

- **원인**: `.env` 파일에 API 키가 없거나 빈 값
- **해결**: 
  1. `.env` 파일 확인
  2. `GOOGLE_API_KEY=your-api-key` 설정
  3. 서버 재시작

**오류**: `Invalid API Key provided`

- **원인**: API 키가 잘못되었거나 만료됨
- **해결**:
  1. [Google AI Studio](https://aistudio.google.com/apikey)에서 새 키 발급
  2. `.env` 파일 업데이트
  3. 서버 재시작

**오류**: `Resource has been exhausted (quota)`

- **원인**: API 사용량 한도 초과
- **해결**:
  1. 무료 티어 한도 확인 (분당/일당 요청 수)
  2. 잠시 후 재시도
  3. 필요 시 유료 플랜으로 업그레이드

### 5.2 환경별 주의사항

- **Windows**: 경로에 한글/공백 없어야 함
- **macOS/Linux**: `.env` 파일 권한 확인 (600 권장)

---

## 6. 이전 Vertex AI 설정에서 마이그레이션

기존에 Vertex AI를 사용 중이었다면:

1. **더 이상 필요 없는 설정 제거**:
   - `GOOGLE_APPLICATION_CREDENTIALS` 환경변수
   - `VERTEX_PROJECT` 환경변수
   - `VERTEX_LOCATION` 환경변수
   - 서비스 계정 키 파일 (`.json`)

2. **새 설정 추가**:
   - `GOOGLE_API_KEY` 환경변수만 설정

3. **서버 재시작** 후 헬스체크 확인

---

## 7. 참고 자료

- [Gemini API Key Setup](https://ai.google.dev/gemini-api/docs/api-key)
- [Google AI Studio](https://aistudio.google.com/apikey) - API 키 발급
- [Gemini API Pricing](https://ai.google.dev/pricing) - 가격/한도 정보
- `vibe/unit-plans/U-080[Mvp].md` - 유닛 계획서
