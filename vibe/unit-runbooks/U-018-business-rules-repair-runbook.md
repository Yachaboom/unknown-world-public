# U-018[Mvp] 비즈니스 룰 검증 + Repair loop + 안전 폴백 실행 가이드

## 1. 개요

비즈니스 룰 검증, Repair loop(제한된 재시도), 안전 폴백 기능을 구현했습니다.
스키마 검증 이후에도 남는 "의미적 실패"(Economy/Language/Box2D/Safety)를 서버에서 Hard gate로 검증하고, 실패 시 자동 복구 루프와 안전 폴백으로 항상 턴을 종료할 수 있게 합니다.

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-017[Mvp] (Structured Outputs 호출 + Pydantic 스키마 검증)
- 선행 완료 필요: 백엔드 환경 설정 완료

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프로젝트 루트에서 실행
cd backend

# 의존성 설치 (uv 사용)
uv sync
```

### 2.2 백엔드 서버 실행

```bash
# Mock 모드로 실행 (기본값)
cd backend && uv run uvicorn unknown_world.main:app --host 0.0.0.0 --port 8011 --reload
```

### 2.3 첫 요청 확인

```bash
# 다른 터미널에서 실행
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "문을 열어본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }'
```

**성공 지표**:
- NDJSON 스트림이 반환됨
- `{"type":"stage","name":"parse","status":"start"}` 등 단계 이벤트 확인
- `{"type":"badges","badges":["schema_ok","economy_ok","safety_ok","consistency_ok"]}` 배지 이벤트 확인
- `{"type":"final","data":{...}}` 최종 TurnOutput 확인

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 정상 턴 처리 (모든 검증 통과)

**목적**: 비즈니스 룰 검증이 정상적으로 수행되는지 확인

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn?seed=42 \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "문을 열어본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }'
```

**기대 결과**:
- 스트림에 `repair` 이벤트가 없음 (첫 시도에서 성공)
- 모든 배지가 `ok` 상태: `schema_ok`, `economy_ok`, `safety_ok`, `consistency_ok`
- `final` 이벤트의 `data.economy.balance_after.signal`이 입력보다 작거나 같음

**확인 포인트**:
- ✅ 비즈니스 룰 검증이 수행됨
- ✅ Economy 일관성 유지 (잔액 음수 없음)
- ✅ Language 일치 (ko-KR)

---

### 시나리오 B: 입력 검증 실패 → 폴백 반환

**목적**: 잘못된 입력 시에도 안전한 폴백이 반환되는지 확인

**실행**:

```bash
# 잘못된 language 값
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "invalid",
    "text": "테스트",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }'
```

**기대 결과**:
- `error` 이벤트 발생: `{"type":"error","message":"Invalid input","code":"VALIDATION_ERROR"}`
- 바로 `final` 이벤트로 폴백 TurnOutput 반환
- 폴백의 `economy.cost.signal`이 0 (비용 없음)
- 폴백의 `economy.balance_after`가 입력 스냅샷 유지

**확인 포인트**:
- ✅ 에러 이벤트가 먼저 송출됨
- ✅ 폴백 TurnOutput으로 스트림 종료
- ✅ 재화 잔액 보존

---

### 시나리오 C: 잔액 부족 시 대안 제시

**목적**: Signal이 낮을 때 저비용 대안 카드가 제공되는지 확인

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn?seed=123 \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "모험을 시작한다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 5, "memory_shard": 0}
  }'
```

**기대 결과**:
- `final` 이벤트 정상 반환
- `economy.balance_after.signal >= 0` (음수 없음)
- 액션 덱에 저비용 카드 포함 (있다면)

**확인 포인트**:
- ✅ 잔액이 음수가 되지 않음 (RULE-005)
- ✅ Economy OK 배지 유지

---

### 시나리오 D: Real 모드 테스트 (Gemini API 연동)

**목적**: Real 모드에서 Repair loop이 정상 동작하는지 확인

**전제 조건**:
- `GOOGLE_APPLICATION_CREDENTIALS` 환경변수에 서비스 계정 키 경로 설정
- Vertex AI API 활성화

**실행**:

```bash
# Real 모드로 서버 실행
UW_MODE=real uv run uvicorn unknown_world.main:app --host 0.0.0.0 --port 8011 --reload
```

```bash
# 다른 터미널에서 요청
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "탑을 향해 걸어간다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }'
```

**기대 결과**:
- Gemini API 호출 후 TurnOutput 생성
- 비즈니스 룰 검증 수행
- 검증 실패 시 `repair` 이벤트 송출 후 재시도
- 최대 2회 재시도 후 폴백 반환 (실패 시)

**확인 포인트**:
- ✅ `repair` 이벤트에 시도 횟수 포함 (`attempt: 1`, `attempt: 2`)
- ✅ 최종적으로 `final` 이벤트로 종료 (성공 또는 폴백)
- ✅ 폴백 시에도 스키마를 만족하는 TurnOutput 반환

---

## 4. 실행 결과 확인

### 4.1 로그 확인

서버 로그에서 다음 메시지 확인:
- `[RepairLoop] 시도` - 시도 시작
- `[RepairLoop] 성공` - 검증 통과
- `[RepairLoop] 최대 시도 도달, 폴백 반환` - 폴백 전환
- `[BusinessRules] 검증 실패` - 비즈니스 룰 위반

### 4.2 스트림 이벤트 순서

정상 흐름:
```
stage(parse,start) → stage(parse,complete) → stage(validate,start) → 
badges → stage(validate,complete) → stage(plan~commit) → 
narrative_delta... → final
```

Repair 발생 시:
```
stage(parse,start) → stage(parse,complete) → stage(validate,start) →
repair(attempt:1) → repair(attempt:2) → badges → 
stage(validate,complete) → ... → final
```

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 모든 시나리오에서 `final` 이벤트로 종료
- ✅ Economy 배지가 `economy_ok` (또는 폴백 시 `economy_fail` + 폴백 처리)
- ✅ 잔액 음수 없음
- ✅ Language 일치

**실패 시 확인**:
- ❌ 스트림이 `final` 없이 종료됨 → 에러 핸들링 로직 확인
- ❌ 잔액이 음수 → Economy 검증 로직 확인
- ❌ 무한 루프 → `max_repair_attempts` 설정 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ruff: command not found`
- **원인**: ruff가 PATH에 없음
- **해결**: `uv run ruff ...` 사용

**오류**: `GOOGLE_APPLICATION_CREDENTIALS not set`
- **원인**: Real 모드에서 인증 설정 누락
- **해결**: 서비스 계정 키 경로를 환경변수로 설정

**오류**: `ConnectionRefusedError`
- **원인**: 백엔드 서버가 실행 중이 아님
- **해결**: 8011 포트에서 서버 실행 확인

### 5.2 환경별 주의사항

- **Windows**: `set UW_MODE=real` 사용 (bash: `UW_MODE=real`)
- **macOS/Linux**: `export UW_MODE=real` 또는 인라인 설정

---

## 6. API 테스트 코드 (Python)

```python
import asyncio
import httpx

async def test_turn():
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "http://localhost:8011/api/turn",
            json={
                "language": "ko-KR",
                "text": "문을 열어본다",
                "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
                "economy_snapshot": {"signal": 100, "memory_shard": 5}
            },
            timeout=30.0
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    print(line)

asyncio.run(test_turn())
```

---

## 7. 비즈니스 룰 검증 항목

### 7.1 Economy (RULE-005)
- 잔액 음수 금지
- cost + balance_after 일관성

### 7.2 Language (RULE-006)
- TurnInput.language와 TurnOutput.language 일치

### 7.3 Box2D (RULE-009)
- 좌표 0~1000 범위
- ymin < ymax, xmin < xmax 순서

### 7.4 Safety
- blocked 시 안전한 대체 narrative 제공
