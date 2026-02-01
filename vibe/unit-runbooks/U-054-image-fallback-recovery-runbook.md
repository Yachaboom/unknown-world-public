# U-054[Mvp] 이미지 생성 폴백 및 실패 복구 체계 실행 가이드

## 1. 개요

이미지 생성 중 오류가 발생하거나 안전 정책에 의해 차단될 경우, **RULE-004에 따라 즉시 생성을 중단하고 "텍스트 전용 모드"로 안전하게 전환**하여 플레이 흐름을 유지하는 예외 처리 로직을 구현했습니다.

**핵심 기능**:
- 이미지 생성 실패 시 재시도 없이 즉시 폴백 (Q1: Option A)
- 안전 정책 차단 시 `TurnOutput.safety.blocked = True` 설정
- 폴백 시 배지(`SAFETY_BLOCKED`) 반영
- 다국어 폴백 메시지 지원 (ko-KR / en-US)

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-053[Mvp] (이미지 생성 호출), U-018[Mvp] (Repair loop 패턴)
- 선행 완료 필요: 백엔드 서버 실행 가능 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치 (이미 설치되어 있으면 생략)
uv sync
```

### 2.2 의존 유닛 확인

```bash
# 이미지 생성 서비스 모듈 임포트 테스트
uv run python -c "from unknown_world.services.image_generation import ImageGenerationStatus, create_fallback_response; print('OK')"

# 렌더 헬퍼 폴백 함수 임포트 테스트
uv run python -c "from unknown_world.orchestrator.stages.render_helpers import create_image_fallback_result, ImageFallbackResult; print('OK')"
```

### 2.3 즉시 실행

```bash
# Mock 모드로 백엔드 서버 시작
UW_MODE=mock uv run uvicorn unknown_world.main:app --port 8011 --reload
```

### 2.4 첫 화면/결과 확인

- 서버가 `http://localhost:8011`에서 실행 중인지 확인
- 성공 지표: 콘솔에 `Uvicorn running on http://0.0.0.0:8011` 메시지 출력

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 정상 이미지 생성 (기존 동작 확인)

**목적**: 이미지 생성이 성공할 때 기존 로직이 정상 동작하는지 확인

**실행**:

```bash
# Python을 사용한 테스트 (권장 - 크로스 플랫폼 호환)
uv run python -c "
import httpx
import json

data = {
    'language': 'ko-KR',
    'text': '숲 속을 탐험한다',
    'economy_snapshot': {'signal': 100, 'memory_shard': 5},
    'client': {'viewport_w': 1920, 'viewport_h': 1080, 'theme': 'dark'}
}

with httpx.Client() as client:
    response = client.post('http://localhost:8011/api/turn', json=data, timeout=30)
    print('Status:', response.status_code)
    for line in response.text.strip().split('\n'):
        parsed = json.loads(line)
        if parsed.get('type') == 'final':
            final_data = parsed['data']
            print(f'type: final')
            print(f'safety.blocked: {final_data[\"safety\"][\"blocked\"]}')
            print(f'badges: {final_data[\"agent_console\"][\"badges\"]}')
            print(f'image_url: {final_data[\"render\"][\"image_url\"]}')
"
```

**기대 결과**:
```
Status: 200
type: final
safety.blocked: False
badges: ['schema_ok', 'economy_ok', 'safety_ok', 'consistency_ok']
image_url: /static/images/generated/img_xxxx.png (또는 None)
```

- NDJSON 스트림에서 `type: "final"` 이벤트 수신
- `TurnOutput.render.image_url`은 Mock 모드에서 이미지 경로 또는 `None`
- `TurnOutput.safety.blocked = false`

**확인 포인트**:
- ✅ `type: "final"` 이벤트에 유효한 TurnOutput 포함
- ✅ `safety.blocked = false`
- ✅ 배지에 `SAFETY_BLOCKED` 없음
- ✅ 배지에 `schema_ok` 포함

---

### 시나리오 B: 이미지 생성 실패 시 폴백 (단위 테스트)

**목적**: 이미지 생성 실패 시 즉시 폴백되고 TurnOutput이 유효한지 확인

**실행**:

```bash
# 단위 테스트: 폴백 헬퍼 함수 동작 확인
uv run python -c "
from unknown_world.orchestrator.stages.render_helpers import (
    create_image_fallback_result,
    is_safety_blocked,
    get_image_failure_message,
)

# 일반 실패
result = create_image_fallback_result('Generation failed', 'ko-KR')
print(f'일반 실패 - is_safety_blocked: {result.is_safety_blocked}')
print(f'일반 실패 - message: {result.fallback_message}')
print(f'일반 실패 - reason: {result.reason}')
assert not result.is_safety_blocked
assert result.reason == 'generation_failed'

# 안전 차단
result_safety = create_image_fallback_result('Safety policy violation', 'ko-KR')
print(f'\\n안전 차단 - is_safety_blocked: {result_safety.is_safety_blocked}')
print(f'안전 차단 - message: {result_safety.fallback_message}')
print(f'안전 차단 - reason: {result_safety.reason}')
assert result_safety.is_safety_blocked
assert result_safety.reason == 'safety_blocked'

print('\\n✅ 모든 폴백 헬퍼 테스트 통과!')
"
```

**기대 결과**:
```
일반 실패 - is_safety_blocked: False
일반 실패 - message: 이미지 생성에 실패했습니다. 텍스트로 진행합니다.
일반 실패 - reason: generation_failed

안전 차단 - is_safety_blocked: True
안전 차단 - message: 안전 정책에 따라 이미지를 생성할 수 없습니다.
안전 차단 - reason: safety_blocked

✅ 모든 폴백 헬퍼 테스트 통과!
```

**확인 포인트**:
- ✅ 일반 실패 시 `is_safety_blocked = False`
- ✅ 안전 차단 시 `is_safety_blocked = True`
- ✅ 언어별 메시지 정상 반환

---

### 시나리오 C: 안전 차단 메시지 감지 테스트

**목적**: 다양한 안전 차단 키워드가 올바르게 감지되는지 확인

**실행**:

```bash
uv run python -c "
from unknown_world.orchestrator.stages.render_helpers import is_safety_blocked

# 안전 차단 키워드 테스트
test_cases = [
    ('Content blocked by safety filter', True),
    ('Safety policy violation detected', True),
    ('Image generation prohibited', True),
    ('Request blocked due to policy', True),
    ('Network timeout occurred', False),
    ('Invalid prompt format', False),
    ('Generation failed - unknown error', False),
    (None, False),
    ('', False),
]

print('안전 차단 감지 테스트:')
all_passed = True
for message, expected in test_cases:
    result = is_safety_blocked(message)
    status = '✅' if result == expected else '❌'
    if result != expected:
        all_passed = False
    print(f'  {status} \"{message}\" -> {result} (expected: {expected})')

if all_passed:
    print('\\n✅ 모든 안전 차단 감지 테스트 통과!')
else:
    print('\\n❌ 일부 테스트 실패')
"
```

**기대 결과**:
- 모든 테스트 케이스가 예상대로 동작
- "safety", "blocked", "policy", "violation", "prohibited" 키워드 감지

**확인 포인트**:
- ✅ 안전 관련 키워드 포함 시 `True` 반환
- ✅ 일반 오류 메시지는 `False` 반환
- ✅ `None` 또는 빈 문자열은 `False` 반환

---

### 시나리오 D: 영어 폴백 메시지 테스트

**목적**: 영어(en-US) 언어 설정 시 영어 폴백 메시지가 반환되는지 확인

**실행**:

```bash
uv run python -c "
from unknown_world.orchestrator.stages.render_helpers import (
    get_image_failure_message,
    get_safety_blocked_message,
    get_fallback_message,
)

print('영어 폴백 메시지 테스트:')
print(f'  실패 메시지: {get_image_failure_message(\"en-US\")}')
print(f'  안전 차단: {get_safety_blocked_message(\"en-US\")}')
print(f'  잔액 부족: {get_fallback_message(\"en-US\")}')

print('\\n한국어 폴백 메시지 테스트:')
print(f'  실패 메시지: {get_image_failure_message(\"ko-KR\")}')
print(f'  안전 차단: {get_safety_blocked_message(\"ko-KR\")}')
print(f'  잔액 부족: {get_fallback_message(\"ko-KR\")}')

print('\\n✅ i18n 메시지 테스트 완료!')
"
```

**기대 결과**:
```
영어 폴백 메시지 테스트:
  실패 메시지: Image generation failed. Proceeding with text only.
  안전 차단: Image generation blocked due to safety policies.
  잔액 부족: Insufficient balance for image generation. Proceeding with text only.

한국어 폴백 메시지 테스트:
  실패 메시지: 이미지 생성에 실패했습니다. 텍스트로 진행합니다.
  안전 차단: 안전 정책에 따라 이미지를 생성할 수 없습니다.
  잔액 부족: 잔액이 부족하여 이미지를 생성할 수 없습니다. 텍스트로 진행합니다.
```

**확인 포인트**:
- ✅ 영어 메시지가 영어로 반환
- ✅ 한국어 메시지가 한국어로 반환
- ✅ RULE-006 언어 정책 준수

---

### 시나리오 E: ImageFallbackResult 데이터 클래스 검증

**목적**: 폴백 결과 데이터 클래스가 올바르게 생성되는지 확인

**실행**:

```bash
uv run python -c "
from unknown_world.orchestrator.stages.render_helpers import (
    ImageFallbackResult,
    create_image_fallback_result,
)

# 다양한 시나리오 테스트
scenarios = [
    ('Timeout exceeded', 'ko-KR'),
    ('Safety violation blocked', 'ko-KR'),
    ('API error', 'en-US'),
    ('Content blocked by policy', 'en-US'),
    (None, 'ko-KR'),
]

print('ImageFallbackResult 생성 테스트:')
for message, lang in scenarios:
    result = create_image_fallback_result(message, lang)
    print(f'\\n  입력: message=\"{message}\", lang=\"{lang}\"')
    print(f'    is_safety_blocked: {result.is_safety_blocked}')
    print(f'    should_update_safety: {result.should_update_safety}')
    print(f'    reason: {result.reason}')
    print(f'    fallback_message: {result.fallback_message[:30]}...')

print('\\n✅ ImageFallbackResult 테스트 완료!')
"
```

**확인 포인트**:
- ✅ `is_safety_blocked`와 `should_update_safety`가 동기화됨
- ✅ `reason`이 적절한 값으로 설정됨
- ✅ `fallback_message`가 언어에 맞게 생성됨

---

## 4. 실행 결과 확인

### 4.1 로그 확인

렌더 단계에서 폴백 관련 로그 메시지:
- `[Render] 이미지 생성 실패, 텍스트-only 폴백` - 생성 실패 시
- `[Render] 이미지 생성 타임아웃, 텍스트-only 폴백` - 타임아웃 시
- `[Render] 이미지 폴백 적용` - 폴백 처리 시
- `[Render] 배지 추가됨` - 배지 업데이트 시

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ 이미지 생성 실패 시 TurnOutput이 유효하게 유지됨
- ✅ 안전 차단 시 `safety.blocked = True`, `safety.message` 설정됨
- ✅ 폴백 시 재시도 없이 즉시 텍스트-only 진행
- ✅ 배지에 실패 상태 반영 (안전 차단 시 `SAFETY_BLOCKED`)

**실패 시 확인**:
- ❌ 폴백 메시지가 None → `get_image_failure_message` 함수 확인
- ❌ 안전 차단 미감지 → `is_safety_blocked` 키워드 확인
- ❌ 배지 미반영 → `_add_badge` 함수 로직 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ImportError: cannot import name 'ImageFallbackResult'`
- **원인**: render_helpers.py가 업데이트되지 않음
- **해결**: `uv sync` 후 서버 재시작

**오류**: 안전 차단 메시지가 감지되지 않음
- **원인**: 메시지에 안전 관련 키워드가 없음
- **해결**: `is_safety_blocked` 함수의 키워드 목록 확인/확장

### 5.2 환경별 주의사항

- **Windows**: 환경변수 설정 시 `set UW_MODE=mock` 사용
- **macOS/Linux**: 환경변수 설정 시 `UW_MODE=mock` 사용

---

## 6. 다음 단계

- **U-055**: Mock/Real 모드에서 폴백 시나리오 통합 검증
- **프론트엔드**: `image_url`이 None일 때 placeholder 표시 (U-020에서 이미 구현됨)
