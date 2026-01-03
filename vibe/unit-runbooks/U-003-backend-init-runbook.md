# U-003[Mvp] 백엔드 FastAPI 초기화 실행 가이드

## 1. 개요

이 유닛은 FastAPI 기반 오케스트레이터 백엔드의 **실행 가능한 최소 뼈대**를 구축합니다.
`/health` 엔드포인트로 헬스체크가 가능하고, 프론트엔드와 통신할 수 있는 CORS 설정이 준비됩니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-001[Mvp] (디렉토리 스캐폴딩)
- 선행 완료 필요: 없음 (U-001은 디렉토리만 생성)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

**필수 조건**:
- Python 3.14 이상
- uv (Python 패키지 매니저)

```bash
# 프로젝트 루트에서 시작
cd backend

# 의존성 동기화 (uv 사용)
uv sync --all-groups
```

### 2.2 즉시 실행

```bash
# 개발 서버 실행 (hot reload 포함)
# RULE-011: 백엔드는 8011~8020 포트 사용 (기본: 8011)
cd backend
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.3 첫 화면/결과 확인

- 브라우저 또는 curl로 접속:
  - 루트: `http://localhost:8011/`
  - 헬스: `http://localhost:8011/health`
  - API 문서: `http://localhost:8011/docs`

- 성공 지표:
  - 콘솔에 `Uvicorn running on http://127.0.0.1:8011` 메시지 출력
  - `/health` 응답에 `"status": "ok"` 포함

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 헬스체크 확인

**목적**: 서버가 정상 기동되고 헬스체크 API가 동작하는지 검증

**실행**:

```bash
curl http://localhost:8011/health
```

**기대 결과**:

```json
{
  "status": "ok",
  "version": "0.0.0",
  "service": "unknown-world-backend"
}
```

**확인 포인트**:

- ✅ HTTP 200 응답
- ✅ `status`가 `"ok"`
- ✅ `version`이 `__init__.py`의 `__version__`과 일치

---

### 시나리오 B: API 문서 확인 (Swagger UI)

**목적**: FastAPI 자동 생성 API 문서가 정상 렌더링되는지 검증

**실행**:

1. 브라우저에서 `http://localhost:8011/docs` 접속

**기대 결과**:

- Swagger UI 페이지가 렌더링됨
- "Unknown World API" 타이틀 표시
- `/health` 엔드포인트가 목록에 표시됨

**확인 포인트**:

- ✅ 페이지 로딩 성공
- ✅ 엔드포인트 "Try it out" 기능 동작

---

### 시나리오 C: CORS 헤더 확인

**목적**: 프론트엔드(localhost:8001)에서 API 호출 시 CORS 오류가 발생하지 않는지 검증

**실행**:

```bash
curl -i -X OPTIONS http://localhost:8011/health \
  -H "Origin: http://localhost:8001" \
  -H "Access-Control-Request-Method: GET"
```

**기대 결과**:

- `Access-Control-Allow-Origin: http://localhost:8001` 헤더 포함
- `Access-Control-Allow-Methods` 헤더 포함

**확인 포인트**:

- ✅ HTTP 200 응답
- ✅ CORS 헤더가 올바르게 설정됨

---

### 시나리오 D: 루트 엔드포인트 확인

**목적**: 루트 경로가 API 안내를 제공하는지 검증

**실행**:

```bash
curl http://localhost:8011/
```

**기대 결과**:

```json
{
  "message": "Unknown World API",
  "docs": "/docs",
  "health": "/health"
}
```

**확인 포인트**:

- ✅ HTTP 200 응답
- ✅ 안내 메시지 포함

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: 콘솔 출력 (터미널)
- 주요 로그 메시지:
  - `INFO:     Uvicorn running on http://127.0.0.1:8011 (Press CTRL+C to quit)` - 정상 시작
  - `INFO:     Started reloader process` - Hot reload 활성화
  - `INFO:     127.0.0.1:xxxx - "GET /health HTTP/1.1" 200 OK` - 요청 처리 성공

### 4.2 성공/실패 판단 기준

**성공**:

- ✅ 서버가 8011 포트에서 기동됨
- ✅ `/health` 엔드포인트가 JSON 응답 반환
- ✅ CORS 헤더가 localhost 오리진에 대해 설정됨
- ✅ API 문서(Swagger UI)가 렌더링됨

**실패 시 확인**:

- ❌ `ModuleNotFoundError: No module named 'unknown_world'` → `cd backend` 후 실행 확인
- ❌ 포트 충돌 → `--port 8012` 등 다른 포트 사용 (RULE-011: 8011~8020 범위)
- ❌ 의존성 오류 → `uv sync --all-groups` 재실행

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ModuleNotFoundError: No module named 'fastapi'`

- **원인**: 의존성 미설치
- **해결**: `cd backend && uv sync --all-groups`

**오류**: `ModuleNotFoundError: No module named 'unknown_world'`

- **원인**: 잘못된 디렉토리에서 실행
- **해결**: 반드시 `backend/` 디렉토리에서 실행

**오류**: `Address already in use` 또는 `[WinError 10013]`

- **원인**: 8011 포트가 이미 사용 중
- **해결**: 
  1. `pnpm kill:back` 실행으로 기존 서버 종료
  2. 또는 `--port 8012` 등 다른 포트 사용 (RULE-011: 8011~8020 범위)

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자가 `\`이지만 Python 실행에는 영향 없음
- **macOS/Linux**: 특이사항 없음

---

## 6. 검증 완료 체크리스트

- [ ] `uv sync --all-groups` 성공
- [ ] `uvicorn unknown_world.main:app --reload --port 8011` 성공
- [ ] `curl http://localhost:8011/health` → `{"status": "ok", ...}` 응답
- [ ] `curl http://localhost:8011/docs` → Swagger UI 페이지 로드
- [ ] CORS preflight 요청 성공 (Origin: http://localhost:8001)

---

## 7. 다음 단계

- **U-005**: TurnInput/TurnOutput(Pydantic) 모델 추가
- **U-007**: `/api/turn` SSE 스트리밍 라우트 추가

