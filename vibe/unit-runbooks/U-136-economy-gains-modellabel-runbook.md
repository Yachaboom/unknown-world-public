# U-136 Economy 검증 보상 시나리오 수정 + ModelLabel enum 통합 실행 가이드

## 1. 개요

경제 검증(`_validate_economy()`)이 **보상(gains) 시나리오를 올바르게 처리**하도록 수정하고, **두 개의 `ModelLabel` enum 불일치로 인한 Pydantic 직렬화 경고**를 해소했습니다.

- `EconomyOutput`에 `gains: CurrencyAmount` 필드 추가 (기본값: `{signal: 0, memory_shard: 0}`)
- 검증 공식을 `expected = max(0, snapshot - cost + gains)`로 수정
- `ModelLabel`을 `config/models.py`에 SSOT로 통합 (StrEnum 단일 클래스)
- 프롬프트 지시문에 gains 사용법 추가
- 프론트엔드 Zod 스키마 + worldStore 동기화

**예상 소요 시간**: 10분

**의존성**:
- U-079[Mvp]: 재화 부족 시 크레딧(빚) 허용 로직, `MAX_CREDIT` 상수

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

```bash
cd backend
pip install -e .
```

### 2.2 즉시 실행

```bash
# 루트에서 (각각 별도 터미널)
pnpm dev:front
pnpm dev:back
```

### 2.3 첫 화면 확인

- 브라우저에서 http://localhost:8001 접속
- 프로필 선택 → 게임 화면 진입
- Economy HUD에 Signal/Shard 잔액 표시 확인

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 백엔드 검증 — 보상만 있는 시나리오 (비용 0 + 보상 N)

**목적**: 비용 없이 보상만 있는 경우 `economy_ok` 배지 정상 발급 확인

**실행**:

```bash
cd backend
python -c "
from unknown_world.models.turn import *
from unknown_world.validation.business_rules import validate_business_rules

ti = TurnInput(
    language=Language.KO, text='문을 열어본다',
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
)
to = TurnOutput(
    language=Language.KO, narrative='퀘스트를 완료하여 보상을 받았습니다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=0, memory_shard=0),
        gains=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=105, memory_shard=5),
    ),
    safety=SafetyOutput(),
    ui=UIOutput(action_deck=ActionDeck(cards=[]), objects=[]),
    world=WorldDelta(), agent_console=AgentConsole(),
)
r = validate_business_rules(ti, to)
print('Valid:', r.is_valid, '| Errors:', r.errors)
"
```

**기대 결과**: `Valid: True | Errors: []`

**확인 포인트**:
- ✅ `economy_ok` — 보상 시나리오에서 잔액 불일치 에러 없음
- ✅ balance_after = 100 + 5 = 105

### 시나리오 B: 백엔드 검증 — 비용 + 보상 혼합

**목적**: 비용과 보상이 동시에 있는 경우 올바른 잔액 계산

**실행**:

```bash
cd backend
python -c "
from unknown_world.models.turn import *
from unknown_world.validation.business_rules import validate_business_rules

ti = TurnInput(
    language=Language.KO, text='보물 상자를 연다',
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
)
to = TurnOutput(
    language=Language.KO, narrative='상자를 열어 보물을 발견했습니다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=3, memory_shard=0),
        gains=CurrencyAmount(signal=10, memory_shard=0),
        balance_after=CurrencyAmount(signal=107, memory_shard=5),
    ),
    safety=SafetyOutput(),
    ui=UIOutput(action_deck=ActionDeck(cards=[]), objects=[]),
    world=WorldDelta(), agent_console=AgentConsole(),
)
r = validate_business_rules(ti, to)
print('Valid:', r.is_valid, '| balance=107:', to.economy.balance_after.signal == 107)
"
```

**기대 결과**: `Valid: True | balance=107: True`

### 시나리오 C: 백엔드 검증 — gains 상한 초과 (인플레이션 방지)

**목적**: gains.signal > 30인 경우 `economy_cost_mismatch` 에러 확인

**실행**:

```bash
cd backend
python -c "
from unknown_world.models.turn import *
from unknown_world.validation.business_rules import validate_business_rules

ti = TurnInput(
    language=Language.KO, text='보물을 찾았다',
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
)
to = TurnOutput(
    language=Language.KO, narrative='엄청난 보물을 발견했습니다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=0, memory_shard=0),
        gains=CurrencyAmount(signal=35, memory_shard=0),
        balance_after=CurrencyAmount(signal=135, memory_shard=5),
    ),
    safety=SafetyOutput(),
    ui=UIOutput(action_deck=ActionDeck(cards=[]), objects=[]),
    world=WorldDelta(), agent_console=AgentConsole(),
)
r = validate_business_rules(ti, to)
print('Valid:', r.is_valid, '(should be False)')
print('Errors:', r.errors)
"
```

**기대 결과**: `Valid: False` + `economy_cost_mismatch` 에러 (Signal 보상 35 > 30 상한)

### 시나리오 D: ModelLabel 직렬화 — 경고 없음

**목적**: `config.models.ModelLabel`을 TurnOutput에 할당해도 Pydantic 경고 없음

**실행**:

```bash
cd backend
python -c "
import warnings
from unknown_world.models.turn import *
from unknown_world.config.models import ModelLabel

to = TurnOutput(
    language=Language.KO, narrative='테스트 내러티브입니다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=95, memory_shard=5),
    ),
    safety=SafetyOutput(),
    ui=UIOutput(action_deck=ActionDeck(cards=[]), objects=[]),
    world=WorldDelta(), agent_console=AgentConsole(),
)
to.agent_console.model_label = ModelLabel.FAST

with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter('always')
    j = to.model_dump()
    pydantic_warns = [x for x in w if 'Pydantic' in str(x.category)]
    print('Pydantic warnings:', len(pydantic_warns), '(should be 0)')
    print('model_label value:', j['agent_console']['model_label'])
"
```

**기대 결과**: `Pydantic warnings: 0` + `model_label value: FAST`

### 시나리오 E: 기존 동작 유지 (보상 없음)

**목적**: gains가 기본값(0,0)일 때 기존 검증 로직이 동일하게 동작

**실행**:

```bash
cd backend
python -c "
from unknown_world.models.turn import *
from unknown_world.validation.business_rules import validate_business_rules

ti = TurnInput(
    language=Language.KO, text='주변을 살핀다',
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
)
to = TurnOutput(
    language=Language.KO, narrative='주변을 살펴봅니다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=95, memory_shard=5),
    ),
    safety=SafetyOutput(),
    ui=UIOutput(action_deck=ActionDeck(cards=[]), objects=[]),
    world=WorldDelta(), agent_console=AgentConsole(),
)
r = validate_business_rules(ti, to)
print('Valid:', r.is_valid, '| gains default:', to.economy.gains.signal, to.economy.gains.memory_shard)
"
```

**기대 결과**: `Valid: True | gains default: 0 0`

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:
- ✅ 시나리오 A: 보상만 있는 경우 `economy_ok`
- ✅ 시나리오 B: 비용+보상 혼합 시 올바른 잔액
- ✅ 시나리오 C: gains > 30 시 검증 실패
- ✅ 시나리오 D: ModelLabel 직렬화 경고 0
- ✅ 시나리오 E: 기존 동작(gains=0) 유지

**실패 시 확인**:
- ❌ economy_cost_mismatch 에러 → `business_rules.py`의 공식 확인
- ❌ PydanticSerializationUnexpectedValue → ModelLabel import 경로 확인
- ❌ Zod parse 에러 → `schemas/turn.ts` EconomyOutputSchema 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `gains` 필드 관련 ImportError

- **원인**: `CurrencyAmount` 모델이 없거나 이름이 변경됨
- **해결**: `from unknown_world.models.turn import CurrencyAmount` 확인

**오류**: `ModelLabel` import 충돌

- **원인**: 기존 코드가 `from unknown_world.models.turn import ModelLabel` 사용 중
- **해결**: 동일 클래스로 re-export되므로 기존 import 경로도 정상 동작. 새 코드는 `from unknown_world.config.models import ModelLabel` 권장.

### 5.2 환경별 주의사항

- **Windows**: Shell 연산자(`&&`, `|`) 사용 금지 (RULE-000). 명령을 개별 실행.
- **macOS/Linux**: 동일하게 적용.

---

## 6. 변경 파일 요약

| 영역 | 파일 | 변경 내용 |
|------|------|-----------|
| Backend | `models/turn.py` | `EconomyOutput.gains` 필드 추가, `ModelLabel` 클래스를 config import로 교체 |
| Backend | `config/models.py` | `ModelLabel`에 CHEAP/REF 추가 (SSOT 통합) |
| Backend | `config/economy.py` | `MAX_SINGLE_TURN_REWARD_SIGNAL/MEMORY_SHARD` 상수 추가 |
| Backend | `validation/business_rules.py` | 검증 공식 수정 (gains 반영), gains 상한 검증 추가 |
| Backend | `orchestrator/stages/validate.py` | ModelLabel 변환 로직 단순화 |
| Backend | `prompts/turn/turn_output_instructions.{ko,en}.md` | gains 필드 설명, 보상 반영 규칙 추가 |
| Frontend | `schemas/turn.ts` | `EconomyOutputSchema.gains` 추가, `ModelLabelSchema` 확장 |
| Frontend | `stores/worldStore.ts` | gains > 0 시 보상 토스트 알림 |
| Frontend | `components/AgentConsole.tsx` | IMAGE/IMAGE_FAST/VISION 라벨 맵 추가 |
| Frontend | `locales/{ko-KR,en-US}/translation.json` | gains_toast, model label i18n 키 추가 |
