# U-005[Mvp] TurnInput/TurnOutput 스키마(Pydantic) 실행 가이드

## 1. 개요

백엔드에서 TurnInput/TurnOutput을 **Pydantic 모델로 정의**하고, Gemini Structured Outputs에 투입 가능한 **JSON Schema(부분집합)** 를 생성할 수 있게 만들었습니다.

**핵심 기능**:

- TurnInput/TurnOutput Pydantic 모델 정의
- 최소 요구 필드(언어/내러티브/UI/경제/안전/좌표/배지) 포함
- `model_json_schema()` 메서드로 Gemini용 JSON Schema 생성
- `model_validate_json()` 메서드로 응답 검증

**예상 소요 시간**: 10분

**의존성**:

- 의존 유닛: U-003[Mvp] (FastAPI 프로젝트 골격)
- 선행 완료 필요: 백엔드 환경 설정 (`uv sync`)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd backend
uv sync
```

### 2.2 의존 유닛 확인

```bash
# 백엔드 패키지 import 테스트
uv run python -c "from unknown_world.models import TurnInput, TurnOutput; print('OK')"
```

### 2.3 즉시 실행 - JSON Schema 생성 테스트

```bash
uv run python -c "
from unknown_world.models import TurnOutput
import json
schema = TurnOutput.model_json_schema()
print(json.dumps(schema, indent=2, ensure_ascii=False)[:2000])
print('... (truncated)')
"
```

### 2.4 첫 화면/결과 확인

- 성공 지표: JSON Schema가 콘솔에 출력됨
- `$defs`에 하위 타입들이 정의됨
- `properties`에 `language`, `narrative`, `economy`, `safety` 등 필수 필드 포함

---

## 3. 핵심 기능 시나리오

### 시나리오 A: TurnInput 생성 및 직렬화

**목적**: 클라이언트에서 서버로 전송할 TurnInput 생성 검증

**실행**:

```bash
uv run python -c "
from unknown_world.models import (
    TurnInput, Language, ClientInfo, EconomySnapshot
)

# TurnInput 생성
turn_input = TurnInput(
    language=Language.KO,
    text='문을 열어본다',
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
)

# JSON 직렬화
print(turn_input.model_dump_json(indent=2))
"
```

**기대 결과**:

```json
{
  "language": "ko-KR",
  "text": "문을 열어본다",
  "click": null,
  "client": {
    "viewport_w": 1920,
    "viewport_h": 1080,
    "theme": "dark"
  },
  "economy_snapshot": {
    "signal": 100,
    "memory_shard": 5
  }
}
```

**확인 포인트**:

- ✅ `language`가 `"ko-KR"` enum 값으로 직렬화됨
- ✅ `theme`가 기본값 `"dark"`로 설정됨
- ✅ `click`이 `null`로 직렬화됨 (선택 필드)

---

### 시나리오 B: TurnOutput 생성 및 검증

**목적**: 서버에서 클라이언트로 반환할 TurnOutput 생성 검증

**실행**:

```bash
uv run python -c "
from unknown_world.models import (
    TurnOutput, Language, EconomyOutput, SafetyOutput, CurrencyAmount
)

# TurnOutput 생성
turn_output = TurnOutput(
    language=Language.KO,
    narrative='문이 삐걱거리며 열립니다. 어둠 속에서 희미한 빛이 새어나옵니다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=95, memory_shard=5),
    ),
    safety=SafetyOutput(blocked=False),
)

# JSON 직렬화
print(turn_output.model_dump_json(indent=2))
"
```

**기대 결과**:

```json
{
  "language": "ko-KR",
  "narrative": "문이 삐걱거리며 열립니다...",
  "economy": {
    "cost": { "signal": 5, "memory_shard": 0 },
    "balance_after": { "signal": 95, "memory_shard": 5 }
  },
  "safety": { "blocked": false, "message": null },
  "ui": { "action_deck": { "cards": [] }, "objects": [] },
  "world": { ... },
  "render": { "image_job": null },
  "agent_console": { ... }
}
```

**확인 포인트**:

- ✅ `economy.cost`와 `economy.balance_after` 필수 포함
- ✅ `safety.blocked`가 `false`로 설정됨
- ✅ 선택 필드들이 기본값으로 채워짐

---

### 시나리오 C: JSON Schema 생성 (Gemini Structured Outputs용)

**목적**: Gemini API의 `response_json_schema`에 전달할 스키마 생성

**실행**:

```bash
uv run python -c "
from unknown_world.models import TurnOutput
import json

# JSON Schema 생성
schema = TurnOutput.model_json_schema()

# 스키마 구조 확인
print('=== Top-level keys ===')
print(list(schema.keys()))

print('\n=== Required fields ===')
print(schema.get('required', []))

print('\n=== Properties ===')
for prop, details in schema.get('properties', {}).items():
    print(f'  {prop}: {details.get(\"type\", details.get(\"\$ref\", \"unknown\"))}')
"
```

**기대 결과**:

```
=== Top-level keys ===
['$defs', 'properties', 'required', 'title', 'type']

=== Required fields ===
['language', 'narrative', 'economy', 'safety']

=== Properties ===
  language: ...
  narrative: string
  economy: ...
  safety: ...
  ui: ...
  world: ...
  render: ...
  agent_console: ...
```

**확인 포인트**:

- ✅ `$defs`에 하위 타입 정의 포함
- ✅ `required`에 Hard Gate 필드(language, narrative, economy, safety) 포함
- ✅ 스키마가 Gemini Structured Outputs 부분집합 제약 준수

---

### 시나리오 D: 좌표 규약 검증 (RULE-009)

**목적**: 0~1000 정규화 좌표계 및 bbox 순서 [ymin, xmin, ymax, xmax] 검증

**실행**:

```bash
uv run python -c "
from unknown_world.models import SceneObject, Box2D
from pydantic import ValidationError

# 정상 케이스
obj = SceneObject(
    id='door_001',
    label='문',
    box_2d=Box2D(ymin=100, xmin=200, ymax=400, xmax=500),
)
print('정상 케이스:', obj.model_dump())

# 범위 초과 케이스 (1001 > 1000)
try:
    invalid = Box2D(ymin=0, xmin=0, ymax=1001, xmax=500)
except ValidationError as e:
    print('범위 초과 오류:', e.errors()[0]['msg'])

# 음수 케이스
try:
    invalid = Box2D(ymin=-1, xmin=0, ymax=500, xmax=500)
except ValidationError as e:
    print('음수 오류:', e.errors()[0]['msg'])
"
```

**기대 결과**:

```
정상 케이스: {'id': 'door_001', 'label': '문', 'box_2d': {'ymin': 100, 'xmin': 200, 'ymax': 400, 'xmax': 500}, 'interaction_hint': None}
범위 초과 오류: Input should be less than or equal to 1000
음수 오류: Input should be greater than or equal to 0
```

**확인 포인트**:

- ✅ 정상 좌표(0~1000)가 허용됨
- ✅ 1000 초과 좌표가 거부됨
- ✅ 음수 좌표가 거부됨
- ✅ bbox 순서가 [ymin, xmin, ymax, xmax]로 명확함

---

### 시나리오 E: 언어 정책 검증 (RULE-006)

**목적**: ko/en 언어 enum 강제 및 혼합 출력 방지 검증

**실행**:

```bash
uv run python -c "
from unknown_world.models import Language, TurnInput, ClientInfo, EconomySnapshot
from pydantic import ValidationError

# 정상 케이스 (ko-KR)
input_ko = TurnInput(
    language=Language.KO,
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
)
print('KO 언어:', input_ko.language.value)

# 정상 케이스 (en-US)
input_en = TurnInput(
    language=Language.EN,
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
)
print('EN 언어:', input_en.language.value)

# 잘못된 언어 케이스
try:
    invalid = TurnInput(
        language='ja-JP',  # 지원하지 않는 언어
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )
except ValidationError as e:
    print('지원하지 않는 언어 오류:', e.errors()[0]['msg'][:50])
"
```

**기대 결과**:

```
KO 언어: ko-KR
EN 언어: en-US
지원하지 않는 언어 오류: Input should be 'ko-KR' or 'en-US'
```

**확인 포인트**:

- ✅ `ko-KR` 언어가 허용됨
- ✅ `en-US` 언어가 허용됨
- ✅ 지원하지 않는 언어가 거부됨 (enum 강제)

---

### 시나리오 F: 재화 인바리언트 검증 (RULE-005)

**목적**: 잔액 음수 금지 및 비용/잔액 필수 검증

**실행**:

```bash
uv run python -c "
from unknown_world.models import CurrencyAmount, EconomyOutput
from pydantic import ValidationError

# 정상 케이스
economy = EconomyOutput(
    cost=CurrencyAmount(signal=5, memory_shard=0),
    balance_after=CurrencyAmount(signal=95, memory_shard=5),
)
print('정상 케이스:', economy.model_dump())

# 음수 signal 케이스
try:
    invalid = CurrencyAmount(signal=-1, memory_shard=0)
except ValidationError as e:
    print('음수 signal 오류:', e.errors()[0]['msg'])

# 음수 memory_shard 케이스
try:
    invalid = CurrencyAmount(signal=0, memory_shard=-5)
except ValidationError as e:
    print('음수 memory_shard 오류:', e.errors()[0]['msg'])
"
```

**기대 결과**:

```
정상 케이스: {'cost': {'signal': 5, 'memory_shard': 0}, 'balance_after': {'signal': 95, 'memory_shard': 5}}
음수 signal 오류: Input should be greater than or equal to 0
음수 memory_shard 오류: Input should be greater than or equal to 0
```

**확인 포인트**:

- ✅ 정상 재화 값(0 이상)이 허용됨
- ✅ 음수 signal이 거부됨
- ✅ 음수 memory_shard가 거부됨

---

### 시나리오 G: JSON 응답 검증 (model_validate_json)

**목적**: Gemini 응답을 TurnOutput으로 검증하는 시나리오

**실행**:

```bash
uv run python -c "
from unknown_world.models import TurnOutput
from pydantic import ValidationError
import json

# 정상 JSON 응답 (Gemini에서 반환된 것처럼)
valid_json = '''
{
    \"language\": \"ko-KR\",
    \"narrative\": \"문이 열립니다.\",
    \"economy\": {
        \"cost\": {\"signal\": 5, \"memory_shard\": 0},
        \"balance_after\": {\"signal\": 95, \"memory_shard\": 5}
    },
    \"safety\": {\"blocked\": false}
}
'''

output = TurnOutput.model_validate_json(valid_json)
print('검증 성공:', output.narrative)

# 필수 필드 누락 케이스
invalid_json = '''
{
    \"language\": \"ko-KR\",
    \"narrative\": \"문이 열립니다.\"
}
'''

try:
    TurnOutput.model_validate_json(invalid_json)
except ValidationError as e:
    print('필수 필드 누락 오류 개수:', len(e.errors()))
    print('누락된 필드:', [err['loc'][0] for err in e.errors()])
"
```

**기대 결과**:

```
검증 성공: 문이 열립니다.
필수 필드 누락 오류 개수: 2
누락된 필드: ['economy', 'safety']
```

**확인 포인트**:

- ✅ 정상 JSON이 TurnOutput으로 파싱됨
- ✅ 필수 필드(economy, safety) 누락 시 ValidationError 발생
- ✅ 오류 메시지에 누락된 필드 정보 포함

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: 콘솔 출력
- 주요 로그 메시지:
  - `OK`: import 성공
  - JSON Schema 출력: 스키마 생성 성공
  - `ValidationError`: 검증 실패 (예상된 동작)

### 4.2 생성 파일

| 파일 경로 | 목적 |
|-----------|------|
| `backend/src/unknown_world/models/__init__.py` | 모델 패키지 노출 |
| `backend/src/unknown_world/models/turn.py` | TurnInput/TurnOutput 모델 정의 |

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ 모든 시나리오(A~G)가 예상대로 동작
- ✅ `ruff check` 통과
- ✅ `pyright` 타입 체크 통과
- ✅ JSON Schema 생성 가능
- ✅ 좌표 규약(0~1000, bbox 순서) 검증 동작
- ✅ 언어 정책(ko/en enum) 강제 동작
- ✅ 재화 음수 거부 동작

**실패 시 확인**:

- ❌ `ModuleNotFoundError` → `uv sync` 실행
- ❌ `ValidationError` 예상과 다름 → 스키마 정의 확인
- ❌ 타입 체크 실패 → `uv run pyright src/unknown_world/models/` 실행

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ModuleNotFoundError: No module named 'unknown_world'`

- **원인**: 패키지가 설치되지 않음
- **해결**: `cd backend && uv sync`

**오류**: `ValidationError: extra fields not permitted`

- **원인**: 스키마에 정의되지 않은 필드 전달
- **해결**: `extra="forbid"` 설정으로 인해 추가 필드가 거부됨 (의도된 동작)

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자가 `\`일 수 있음. Python에서는 문제없음.
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

이 유닛의 스키마는 다음 유닛에서 사용됩니다:

- **U-007**: 모의 Orchestrator가 TurnOutput을 생성할 때 이 스키마를 계약으로 사용
- **U-017**: 실제 Gemini Structured Outputs 호출 시 `TurnOutput.model_json_schema()`를 `response_json_schema`에 전달


