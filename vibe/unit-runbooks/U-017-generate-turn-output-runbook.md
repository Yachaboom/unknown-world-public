# U-017[Mvp] Structured Output TurnOutput 생성 + Pydantic 검증 실행 가이드

## 1. 개요

Gemini 텍스트 모델을 Structured Outputs(JSON Schema) 모드로 호출하여 TurnOutput을 생성하고, Pydantic 검증을 통과한 결과만 반환하는 기능을 구현했습니다. 프롬프트 파일은 ko/en으로 분리되어 관리됩니다.

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-016[Mvp] (GenAI 클라이언트), U-005[Mvp] (TurnOutput 스키마)
- 선행 완료 필요: U-016 런북 실행 (환경변수 설정)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd backend

# 의존성 설치
uv sync

# 환경변수 설정 (.env 파일 또는 export)
# UW_MODE=mock (Mock 모드, 기본값)
# UW_MODE=real (실제 Vertex AI 호출)
```

### 2.2 의존 유닛 확인

```bash
# GenAI 클라이언트 모듈 확인
uv run python -c "from unknown_world.services.genai_client import get_genai_client; print('GenAI 클라이언트 OK')"

# TurnOutput 스키마 확인
uv run python -c "from unknown_world.models.turn import TurnOutput; print('TurnOutput 스키마 OK')"
```

### 2.3 즉시 실행 (Mock 모드)

```bash
# Mock 모드로 TurnOutput 생성 테스트
uv run python -c "
import asyncio
from unknown_world.models.turn import TurnInput, Language, ClientInfo, EconomySnapshot
from unknown_world.orchestrator.generate_turn_output import generate_turn_output, GenerationStatus

async def test():
    turn_input = TurnInput(
        language=Language.KO,
        text='문을 열어본다',
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )
    result = await generate_turn_output(turn_input, force_mock=True)
    print(f'Status: {result.status}')
    print(f'Model Label: {result.model_label}')
    if result.status == GenerationStatus.SUCCESS:
        print(f'Narrative: {result.output.narrative[:50]}...')
    else:
        print(f'Error: {result.error_message}')

asyncio.run(test())
"
```

### 2.4 첫 화면/결과 확인

- 성공 지표: `Status: schema_failure` 또는 `Status: success` 출력
- Mock 모드에서는 JSON 형식이 아닌 응답이 반환되므로 `schema_failure`가 정상입니다
- 실제 모델(`UW_MODE=real`) 사용 시 `success` 상태를 기대

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 프롬프트 로더 테스트

**목적**: ko/en 프롬프트 파일이 정상적으로 로드되는지 확인

**실행**:

```bash
uv run python -c "
from unknown_world.models.turn import Language
from unknown_world.orchestrator.prompt_loader import load_system_prompt, load_turn_instructions

# 한국어 프롬프트
ko_system = load_system_prompt(Language.KO)
ko_turn = load_turn_instructions(Language.KO)
print(f'[KO] System prompt: {len(ko_system)} chars')
print(f'[KO] Turn instructions: {len(ko_turn)} chars')

# 영어 프롬프트
en_system = load_system_prompt(Language.EN)
en_turn = load_turn_instructions(Language.EN)
print(f'[EN] System prompt: {len(en_system)} chars')
print(f'[EN] Turn instructions: {len(en_turn)} chars')
"
```

**기대 결과**:

```
[KO] System prompt: 약 1500+ chars
[KO] Turn instructions: 약 2000+ chars
[EN] System prompt: 약 1500+ chars
[EN] Turn instructions: 약 2000+ chars
```

**확인 포인트**:
- ✅ 한국어/영어 프롬프트 모두 로드 성공
- ✅ 파일 길이가 0이 아님

---

### 시나리오 B: TurnOutputGenerator 초기화

**목적**: 생성기 싱글톤 패턴 및 기본 설정 확인

**실행**:

```bash
uv run python -c "
from unknown_world.orchestrator.generate_turn_output import (
    get_turn_output_generator,
    TurnOutputGenerator,
)
from unknown_world.config.models import ModelLabel

# 기본 생성기
gen1 = get_turn_output_generator()
gen2 = get_turn_output_generator()
print(f'싱글톤 확인: {gen1 is gen2}')

# Mock 모드 강제
gen_mock = get_turn_output_generator(force_mock=True)
print(f'Mock 생성기: OK')

# 기본 모델 라벨 확인
print(f'기본 모델 라벨: {gen1._default_model_label}')
"
```

**기대 결과**:

```
싱글톤 확인: True
Mock 생성기: OK
기본 모델 라벨: ModelLabel.FAST
```

**확인 포인트**:
- ✅ 싱글톤 패턴 동작
- ✅ 기본 모델 라벨이 FAST (Q1 결정)

---

### 시나리오 C: 안전한 폴백 생성

**목적**: 검증 실패 시 폴백 TurnOutput 생성 확인

**실행**:

```bash
uv run python -c "
from unknown_world.models.turn import Language, CurrencyAmount
from unknown_world.orchestrator.generate_turn_output import TurnOutputGenerator

gen = TurnOutputGenerator()

# 한국어 폴백
fallback_ko = gen.create_safe_fallback(
    language=Language.KO,
    error_message='테스트 에러',
    economy_snapshot=CurrencyAmount(signal=80, memory_shard=3),
)
print(f'[KO] Narrative: {fallback_ko.narrative}')
print(f'[KO] Cost: {fallback_ko.economy.cost.signal}')
print(f'[KO] Balance: {fallback_ko.economy.balance_after.signal}')

# 영어 폴백
fallback_en = gen.create_safe_fallback(
    language=Language.EN,
    error_message='test error',
)
print(f'[EN] Narrative: {fallback_en.narrative}')
"
```

**기대 결과**:

```
[KO] Narrative: 잠시 혼란스러운 순간이 지나갑니다. 다시 집중해봅시다.
[KO] Cost: 0
[KO] Balance: 80
[EN] Narrative: A moment of confusion passes. Let's focus again.
```

**확인 포인트**:
- ✅ 언어별 폴백 메시지 제공
- ✅ 비용 0, 잔액 유지

---

### 시나리오 D: JSON Schema 생성 확인

**목적**: TurnOutput JSON Schema가 올바르게 생성되는지 확인

**실행**:

```bash
uv run python -c "
from unknown_world.orchestrator.generate_turn_output import TurnOutputGenerator

gen = TurnOutputGenerator()
schema = gen._get_json_schema()

print(f'Schema keys: {list(schema.keys())}')
print(f'Required fields: {schema.get(\"required\", [])}')
print(f'Properties count: {len(schema.get(\"properties\", {}))}')
"
```

**기대 결과**:

```
Schema keys: ['$defs', 'properties', 'required', 'title', 'type']
Required fields: ['language', 'narrative', 'economy', 'safety']
Properties count: 8
```

**확인 포인트**:
- ✅ JSON Schema 구조 올바름
- ✅ 필수 필드(language, narrative, economy, safety) 포함

---

### 시나리오 E: 실제 API 호출 (Real 모드, 선택)

**전제 조건**:
- `GOOGLE_APPLICATION_CREDENTIALS` 또는 `gcloud auth application-default login` 설정
- `VERTEX_PROJECT` 환경변수 설정
- `UW_MODE=real` 환경변수 설정

**실행**:

```bash
# Real 모드 환경변수 설정 후 실행
UW_MODE=real uv run python -c "
import asyncio
from unknown_world.models.turn import TurnInput, Language, ClientInfo, EconomySnapshot
from unknown_world.orchestrator.generate_turn_output import generate_turn_output, GenerationStatus

async def test_real():
    turn_input = TurnInput(
        language=Language.KO,
        text='주변을 둘러본다',
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    )
    result = await generate_turn_output(turn_input)
    print(f'Status: {result.status}')
    print(f'Model Label: {result.model_label}')
    if result.status == GenerationStatus.SUCCESS:
        print(f'Narrative: {result.output.narrative}')
        print(f'Cost: {result.output.economy.cost}')
    else:
        print(f'Error: {result.error_message}')
        print(f'Details: {result.error_details}')

asyncio.run(test_real())
"
```

**기대 결과**:
- `Status: success` (모델이 올바른 JSON 반환 시)
- 또는 `Status: schema_failure` (모델 응답 형식 불일치 시 → U-018에서 repair)

---

## 4. 실행 결과 확인

### 4.1 로그 확인

로그에는 다음 정보만 기록됩니다 (프롬프트 원문 금지):
- 모델 라벨
- 언어
- 성공/실패 상태
- 에러 타입 (있는 경우)

### 4.2 생성 파일

| 파일 경로 | 목적 |
| :--- | :--- |
| `backend/prompts/system/game_master.ko.md` | 한국어 시스템 프롬프트 |
| `backend/prompts/system/game_master.en.md` | 영어 시스템 프롬프트 |
| `backend/prompts/turn/turn_output_instructions.ko.md` | 한국어 출력 계약 지시 |
| `backend/prompts/turn/turn_output_instructions.en.md` | 영어 출력 계약 지시 |
| `backend/src/unknown_world/orchestrator/prompt_loader.py` | 프롬프트 로더 유틸리티 |
| `backend/src/unknown_world/orchestrator/generate_turn_output.py` | TurnOutput 생성 핵심 모듈 |

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 프롬프트 파일 ko/en 모두 로드 성공
- ✅ TurnOutputGenerator 초기화 및 싱글톤 동작
- ✅ 안전한 폴백 생성 동작
- ✅ JSON Schema 생성 성공
- ✅ 린트/타입 체크 통과

**실패 시 확인**:
- ❌ 프롬프트 파일 없음 → `backend/prompts/` 디렉토리 확인
- ❌ 의존 모듈 import 실패 → `uv sync` 재실행
- ❌ API 호출 실패 → 환경변수 및 인증 설정 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `FileNotFoundError: 프롬프트 파일을 찾을 수 없습니다`
- **원인**: 프롬프트 파일이 생성되지 않음
- **해결**: `backend/prompts/system/` 및 `backend/prompts/turn/` 디렉토리 확인

**오류**: `ModuleNotFoundError: No module named 'unknown_world'`
- **원인**: 패키지 설치 안됨
- **해결**: `cd backend && uv sync`

**오류**: `RuntimeError: GenAI 클라이언트가 초기화되지 않았습니다`
- **원인**: UW_MODE=real인데 인증 미설정
- **해결**: `UW_MODE=mock` 사용 또는 ADC 설정

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 `/` 사용 권장 (Python 내부)
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

- **U-018[Mvp]**: 비즈니스 룰 검증 + Repair loop 구현
- **U-036[Mvp]**: 프롬프트 파일 핫리로드 및 버전 관리
