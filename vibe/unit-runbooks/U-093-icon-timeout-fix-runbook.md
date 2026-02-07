# U-093 아이콘 생성 타임아웃 수정 실행 가이드

## 1. 개요

`ItemIconGenerator`에서 아이콘 이미지 생성 요청 시 발생하는 **타임아웃 에러를 수정**하여 성공률을 높이는 기능입니다. 타임아웃 30초→60초 상향, 최대 1회 재시도(총 2회), 지수 백오프(2초), 재시도 불가 에러 필터링을 구현했습니다.

**페어링 질문 결정**:
- Q1: **Option B** - 최대 1회 재시도 (총 2회 시도)

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-075[Mvp] (ItemIconGenerator 구현)
- 선행 완료 필요: 백엔드 서버 실행 중

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd backend
uv sync
```

### 2.2 서버 실행

```bash
cd backend
UW_MODE=mock uv run uvicorn unknown_world.main:app --host 0.0.0.0 --port 8011 --reload
```

### 2.3 첫 화면 확인

- `http://localhost:8011/docs` 접속하여 Swagger UI 확인
- 성공 지표: `/api/item/icon` 엔드포인트가 표시됨

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 상수 검증

**목적**: 타임아웃 및 재시도 설정이 올바르게 적용되었는지 확인

**실행**:

```bash
cd backend
uv run python -c "
from unknown_world.services.item_icon_generator import (
    ICON_GENERATION_TIMEOUT_SECONDS,
    ICON_MAX_RETRIES,
    ICON_RETRY_BASE_DELAY_SECONDS,
)
print(f'Timeout: {ICON_GENERATION_TIMEOUT_SECONDS}s (expected: 60)')
print(f'Max retries: {ICON_MAX_RETRIES} (expected: 1)')
print(f'Base delay: {ICON_RETRY_BASE_DELAY_SECONDS}s (expected: 2.0)')
assert ICON_GENERATION_TIMEOUT_SECONDS == 60
assert ICON_MAX_RETRIES == 1
assert ICON_RETRY_BASE_DELAY_SECONDS == 2.0
print('ALL PASSED')
"
```

**확인 포인트**:
- ✅ 타임아웃이 60초
- ✅ 최대 재시도 1회
- ✅ 기본 백오프 대기 2.0초

---

### 시나리오 B: 정상 생성 (Mock 모드)

**목적**: 수정 후에도 정상 생성이 동작하는지 확인

**실행**:

```bash
# wait=false (비동기, placeholder 반환)
curl -s -X POST "http://localhost:8011/api/item/icon" \
  -H "Content-Type: application/json" \
  -d '{"item_id":"test_normal_001","description":"glowing magic sword","language":"en-US","wait":false}'

# wait=true (동기, 생성 완료 대기)
curl -s -X POST "http://localhost:8011/api/item/icon" \
  -H "Content-Type: application/json" \
  -d '{"item_id":"test_normal_002","description":"golden key","language":"en-US","wait":true}'
```

**기대 결과**:

- 비동기: `status: "pending"`, `is_placeholder: true`
- 동기: `status: "completed"`, `is_placeholder: false`, 유효한 `icon_url`

**확인 포인트**:
- ✅ 비동기 모드에서 placeholder 즉시 반환
- ✅ 동기 모드에서 아이콘 생성 완료
- ✅ 캐시 동작 정상 (동일 description 재요청 시 `status: "cached"`)

---

### 시나리오 C: 재시도 로직 검증 (Python 스크립트)

**목적**: 타임아웃/에러 시 재시도가 정상 동작하는지 확인

**실행**:

```bash
cd backend
uv run python -c "
import asyncio, time, tempfile, pathlib, base64
from unittest.mock import AsyncMock
from unknown_world.services.item_icon_generator import (
    ItemIconGenerator, IconGenerationRequest, IconGenerationStatus, IconCache, ICON_MAX_RETRIES,
)
from unknown_world.services.image_generation import ImageGenerationResponse, ImageGenerationStatus as ImgGenStatus
from unknown_world.storage.paths import get_generated_images_dir

async def test():
    # --- 타임아웃 후 재시도 성공 ---
    print('=== Test 1: Timeout -> Retry -> Success ===')
    mock_gen = AsyncMock()
    call_count = 0
    async def gen_timeout_then_ok(req):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise TimeoutError('timeout')
        return ImageGenerationResponse(status=ImgGenStatus.COMPLETED, image_id='img_test', image_url='/test.png', message='ok')
    mock_gen.generate = gen_timeout_then_ok

    with tempfile.TemporaryDirectory() as tmpdir:
        cache = IconCache(cache_dir=pathlib.Path(tmpdir))
        gen = ItemIconGenerator(image_generator=mock_gen, cache=cache)
        img_dir = get_generated_images_dir()
        img_dir.mkdir(parents=True, exist_ok=True)
        (img_dir / 'img_test.png').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAADklEQVQ4y2NgGAWjAAcACHABAMXKQ5oAAAAASUVORK5CYII='))
        t0 = time.monotonic()
        r = await gen.generate_icon(IconGenerationRequest(item_id='t1', item_description='sword', language='en-US'), wait_for_completion=True)
        dt = time.monotonic() - t0
        assert call_count == 2 and r.status == IconGenerationStatus.COMPLETED and dt >= 1.5
        print(f'  PASS (calls={call_count}, elapsed={dt:.1f}s)')

    # --- Quota 에러: 재시도 안 함 ---
    print('=== Test 2: Quota error -> No retry ===')
    mock_gen2 = AsyncMock()
    count2 = 0
    async def gen_quota(req):
        nonlocal count2
        count2 += 1
        return ImageGenerationResponse(status=ImgGenStatus.FAILED, message='Quota exceeded')
    mock_gen2.generate = gen_quota
    with tempfile.TemporaryDirectory() as tmpdir:
        r2 = await ItemIconGenerator(image_generator=mock_gen2, cache=IconCache(cache_dir=pathlib.Path(tmpdir))).generate_icon(
            IconGenerationRequest(item_id='t2', item_description='shield', language='en-US'), wait_for_completion=True)
        assert count2 == 1 and r2.status == IconGenerationStatus.FAILED
        print(f'  PASS (calls={count2})')

    # --- 모든 재시도 소진 ---
    print('=== Test 3: All retries exhausted ===')
    mock_gen3 = AsyncMock()
    count3 = 0
    async def gen_always_fail(req):
        nonlocal count3
        count3 += 1
        raise TimeoutError('timeout')
    mock_gen3.generate = gen_always_fail
    with tempfile.TemporaryDirectory() as tmpdir:
        r3 = await ItemIconGenerator(image_generator=mock_gen3, cache=IconCache(cache_dir=pathlib.Path(tmpdir))).generate_icon(
            IconGenerationRequest(item_id='t3', item_description='potion', language='en-US'), wait_for_completion=True)
        max_a = ICON_MAX_RETRIES + 1
        assert count3 == max_a and r3.status == IconGenerationStatus.FAILED and r3.is_placeholder
        assert f'{max_a}/{max_a}' in r3.message
        print(f'  PASS (calls={count3}, msg includes \"{max_a}/{max_a}\")')

    print()
    print('=== ALL RETRY TESTS PASSED ===')

asyncio.run(test())
"
```

**확인 포인트**:
- ✅ Test 1: 타임아웃 발생 시 백오프 후 재시도, 2번째에서 성공 (elapsed >= 2초)
- ✅ Test 2: Quota 에러 시 재시도 없이 즉시 실패 (1회만 호출)
- ✅ Test 3: 모든 시도 실패 시 "2/2 시도" 메시지 포함, placeholder 반환

---

### 시나리오 D: 재시도 판별 함수 검증

**목적**: `_is_retryable_message`와 `_is_retryable_exception`이 올바르게 동작하는지 확인

**실행**:

```bash
cd backend
uv run python -c "
from unknown_world.services.item_icon_generator import _is_retryable_message, _is_retryable_exception

# 재시도 가능 메시지
assert _is_retryable_message('Internal server error') == True
assert _is_retryable_message('Connection timeout') == True

# 재시도 불가 메시지 (4xx, quota, safety)
assert _is_retryable_message('Quota exceeded') == False
assert _is_retryable_message('Rate limit exceeded') == False
assert _is_retryable_message('Safety filter blocked') == False
assert _is_retryable_message('Invalid request') == False
assert _is_retryable_message('Permission denied') == False

# 재시도 가능 예외
assert _is_retryable_exception(ConnectionError()) == True
assert _is_retryable_exception(OSError()) == True
assert _is_retryable_exception(RuntimeError()) == True

# 재시도 불가 예외
assert _is_retryable_exception(ValueError()) == False
assert _is_retryable_exception(TypeError()) == False

print('ALL PASSED')
"
```

**확인 포인트**:
- ✅ 서버 에러/네트워크 에러 → 재시도 가능
- ✅ Quota/Safety/Invalid/Permission → 재시도 불가
- ✅ ValueError/TypeError → 재시도 불가

---

## 4. 실행 결과 확인

### 4.1 로그 확인

백엔드 로그에서 다음 메시지 확인:

```
[ItemIconGenerator] 아이콘 생성 타임아웃, 재시도 예정 ... attempt=1/2 retry_delay_s=2.0
[ItemIconGenerator] 아이콘 생성 완료 ... attempt=2
```

또는 모든 재시도 실패 시:

```
[ItemIconGenerator] 아이콘 생성 타임아웃, 재시도 예정 ... attempt=1/2
[ItemIconGenerator] 아이콘 생성 최종 실패 ... total_attempts=2
```

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ 타임아웃이 60초로 상향됨
- ✅ 타임아웃/네트워크 에러 시 최대 1회 재시도 (총 2회 시도)
- ✅ 재시도 간 2초 지수 백오프 적용
- ✅ Quota/Safety 에러 시 재시도 없이 즉시 실패
- ✅ 모든 재시도 실패 시 placeholder 반환 + 에러 로그
- ✅ 기존 유닛 테스트 5개 모두 통과

**실패 시 확인**:
- ❌ 타임아웃 값이 60이 아님 → `ICON_GENERATION_TIMEOUT_SECONDS` 상수 확인
- ❌ 재시도 안 됨 → `ICON_MAX_RETRIES` 상수 확인, `_is_retryable_message` 함수 확인
- ❌ 기존 테스트 실패 → `_generate_icon_internal` 변경 내용 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 재시도가 발생하지 않음

- **원인**: 에러 메시지에 재시도 제외 키워드 포함
- **해결**: `_NON_RETRYABLE_KEYWORDS` 목록 확인, 에러 메시지 로그 확인

**오류**: 재시도 후에도 계속 실패

- **원인**: API 서버 자체 다운 또는 인증 문제
- **해결**:
  1. GOOGLE_API_KEY 유효성 확인
  2. 네트워크 연결 확인
  3. `UW_MODE=mock`으로 변경하여 mock 모드 테스트

### 5.2 환경별 주의사항

- **Windows**: `UW_MODE=mock` 환경변수 설정 시 PowerShell은 `$env:UW_MODE="mock"` 사용
- **macOS/Linux**: `export UW_MODE=mock` 또는 인라인 `UW_MODE=mock uv run ...`

---

## 6. 변경 사항 요약

| 항목 | Before (U-075) | After (U-093) |
|------|----------------|---------------|
| 타임아웃 | 30초 | **60초** |
| 재시도 | 없음 | **최대 1회 (총 2회)** |
| 백오프 | 없음 | **2초 지수 백오프** |
| 재시도 필터 | 없음 | **Quota/Safety/Invalid 제외** |
| 실패 메시지 | 단순 에러 | **"N/N 시도" 포함** |
