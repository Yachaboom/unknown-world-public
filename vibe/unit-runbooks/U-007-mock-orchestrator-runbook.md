# U-007[Mvp] 모의 Orchestrator + /api/turn HTTP Streaming 실행 가이드

## 1. 개요

실모델(Gemini) 없이도 프론트엔드 개발/데모를 지속할 수 있도록, **모의 Orchestrator**로 TurnOutput을 생성하고 이를 **HTTP Streaming(POST 응답 스트림)** 으로 전달하는 `/api/turn` 엔드포인트를 구현했습니다.

**주요 기능**:
- NDJSON(라인 단위 JSON) 스트리밍으로 stage/badges/narrative_delta/final 이벤트 순차 전송
- 결정적(seed 기반) 모의 TurnOutput 생성으로 재현 가능한 테스트
- TTFB 최적화를 위한 즉시 stage 이벤트 전송
- 스키마 검증 실패 시 안전한 폴백 TurnOutput 반환 (RULE-004)

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-005[Mvp] (TurnInput/TurnOutput Pydantic 스키마), U-003[Mvp] (FastAPI 앱)
- 선행 완료 필요: 백엔드 의존성 설치 (`uv sync`)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치 (uv 사용)
uv sync
```

### 2.2 의존 유닛 확인

```bash
# Pydantic 모델 import 테스트
cd backend && uv run python -c "from unknown_world.models.turn import TurnInput, TurnOutput; print('Models OK')"
```

예상 출력:
```
Models OK
```

### 2.3 즉시 실행

```bash
# 백엔드 서버 시작 (포트 8011 - RULE-011)
cd backend && uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.4 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8011/docs` 접속
- Swagger UI에서 `/api/turn` POST 엔드포인트 확인
- 성공 지표: "Turn" 태그 아래 `/api/turn` 엔드포인트 표시

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 기본 턴 요청 (curl)

**목적**: NDJSON 스트리밍이 정상 동작하는지 확인

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "문을 열어본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }' \
  --no-buffer
```

**기대 결과**:

NDJSON 형식으로 이벤트가 순차적으로 출력됩니다:

```
{"type":"stage","name":"parse","status":"start"}
{"type":"stage","name":"parse","status":"complete"}
{"type":"stage","name":"validate","status":"start"}
{"type":"stage","name":"validate","status":"complete"}
{"type":"badges","badges":["schema_ok","economy_ok"]}
{"type":"stage","name":"plan","status":"start"}
... (중략) ...
{"type":"narrative_delta","text":"당신은 \"문을 열어본다\"라"}
{"type":"narrative_delta","text":"고 말했습니다. 어둠 속에서"}
... (중략) ...
{"type":"final","data":{...TurnOutput JSON...}}
```

**확인 포인트**:
- ✅ `type: "stage"` 이벤트가 Parse→Commit 순서로 전송됨
- ✅ `type: "badges"` 이벤트에 검증 배지 포함
- ✅ `type: "narrative_delta"` 이벤트로 텍스트 조각 전송 (타자 효과)
- ✅ `type: "final"` 이벤트에 완전한 TurnOutput 포함

---

### 시나리오 B: 재현 가능한 결과 (seed 파라미터)

**목적**: 동일 seed로 동일한 TurnOutput이 생성되는지 확인

**실행**:

```bash
# 첫 번째 요청 (seed=42)
curl -X POST "http://localhost:8011/api/turn?seed=42" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "주변을 살펴본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }' 2>/dev/null | tail -1 | jq '.data.narrative'

# 두 번째 요청 (동일 seed=42)
curl -X POST "http://localhost:8011/api/turn?seed=42" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "주변을 살펴본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }' 2>/dev/null | tail -1 | jq '.data.narrative'
```

**기대 결과**:
- 두 요청의 narrative가 동일해야 함

**확인 포인트**:
- ✅ 동일 seed → 동일 결과 (결정적 출력)
- ✅ 다른 seed → 다른 결과

---

### 시나리오 C: 영어 언어 설정

**목적**: 언어 설정에 따른 다국어 출력 확인 (RULE-006)

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en-US",
    "text": "Open the door",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }' \
  --no-buffer 2>/dev/null | tail -1 | jq '.data.language, .data.narrative'
```

**기대 결과**:
```
"en-US"
"You said \"Open the door\". ..."
```

**확인 포인트**:
- ✅ `language: "en-US"` 응답
- ✅ 영어 내러티브 생성
- ✅ ko/en 혼합 없음

---

### 시나리오 D: 입력 검증 실패

**목적**: 잘못된 입력에 대한 에러 스트림 반환 확인

**실행**:

```bash
# 필수 필드 누락
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}' \
  --no-buffer
```

**기대 결과**:
```
{"type":"error","message":"Invalid input","code":"VALIDATION_ERROR"}
```

**확인 포인트**:
- ✅ `type: "error"` 이벤트 반환
- ✅ 프롬프트/내부 추론 노출 없음 (RULE-007)

---

### 시나리오 E: 경제 시스템 확인 (RULE-005)

**목적**: 비용 계산 및 잔액 업데이트 확인

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "앞으로 전진한다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 50, "memory_shard": 2}
  }' \
  --no-buffer 2>/dev/null | tail -1 | jq '.data.economy'
```

**기대 결과**:
```json
{
  "cost": {
    "signal": 1-5,
    "memory_shard": 0
  },
  "balance_after": {
    "signal": 45-49,
    "memory_shard": 2
  }
}
```

**확인 포인트**:
- ✅ `cost.signal` ≥ 0
- ✅ `balance_after.signal` ≥ 0 (음수 불가)
- ✅ 잔액 = 스냅샷 - 비용

---

### 시나리오 F: 핫스팟 좌표 규약 (RULE-009)

**목적**: box_2d 좌표가 0~1000 규약을 준수하는지 확인

**실행**:

```bash
curl -X POST "http://localhost:8011/api/turn?seed=123" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "주변을 살펴본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }' \
  --no-buffer 2>/dev/null | tail -1 | jq '.data.ui.objects[0].box_2d'
```

**기대 결과**:
```json
{
  "ymin": 0-1000,
  "xmin": 0-1000,
  "ymax": 0-1000,
  "xmax": 0-1000
}
```

**확인 포인트**:
- ✅ 모든 좌표 값이 0~1000 범위
- ✅ ymin < ymax, xmin < xmax

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 서버 로그: 터미널에서 uvicorn 출력 확인
- 주요 로그 메시지:
  - `INFO: ... "POST /api/turn HTTP/1.1" 200 OK`: 정상 처리
  - `422 Unprocessable Entity`: 입력 검증 실패

### 4.2 API 문서

- Swagger UI: `http://localhost:8011/docs`
- ReDoc: `http://localhost:8011/redoc`

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 모든 시나리오(A~F)의 확인 포인트 통과
- ✅ NDJSON 스트림이 순차적으로 전송됨
- ✅ 최종 TurnOutput이 스키마를 준수함

**실패 시 확인**:
- ❌ `Connection refused` → 서버가 실행 중인지 확인
- ❌ `422 Unprocessable Entity` → 입력 JSON 형식 확인
- ❌ 스트리밍 없이 한 번에 응답 → `--no-buffer` 옵션 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ModuleNotFoundError: No module named 'unknown_world'`
- **원인**: 의존성 미설치 또는 경로 문제
- **해결**: `cd backend && uv sync`

**오류**: `Address already in use`
- **원인**: 8011 포트가 이미 사용 중
- **해결**: 다른 포트 사용 (`--port 8012`) 또는 기존 프로세스 종료

**오류**: 스트리밍이 한 번에 출력됨
- **원인**: curl의 버퍼링
- **해결**: `--no-buffer` 옵션 추가

### 5.2 환경별 주의사항

- **Windows**: PowerShell에서 curl은 `Invoke-WebRequest`의 별칭일 수 있음. Git Bash 또는 실제 curl 사용 권장
- **macOS/Linux**: 기본 curl 사용 가능

---

## 6. 다음 단계

1. **U-008[Mvp]**: 프론트엔드에서 스트림 이벤트를 소비해 Agent Console/내러티브/패널 업데이트
2. **CP-MVP-01**: "스트리밍/스키마/폴백" 체크포인트 수행



