# U-052[Mvp]: 조건부 이미지 생성 제어 로직 실행 가이드

## 1. 개요

TurnOutput의 `render.image_job`을 분석하여 이미지 생성 여부(`should_generate`)와 프롬프트, 해상도 설정을 추출하는 **판정 로직**을 구현했습니다. 또한 Economy 기반 잔액 검증을 통해 잔액 부족 시 텍스트-only 폴백을 제안하는 구조를 마련했습니다.

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-051[Mvp] (PipelineContext.image_generator), U-017[Mvp] (TurnOutput/ImageJob 스키마)
- 선행 완료 필요: U-051[Mvp] 런북 실행 완료

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# backend 디렉토리에서 의존성 확인
cd backend
uv sync
```

### 2.2 의존 유닛 확인

```bash
# U-051 브릿지가 정상 동작하는지 확인
uv run python -c "from unknown_world.orchestrator.stages.types import PipelineContext; print('PipelineContext.image_generator:', hasattr(PipelineContext, '__dataclass_fields__') and 'image_generator' in PipelineContext.__dataclass_fields__)"
```

**기대 결과**: `PipelineContext.image_generator: True`

### 2.3 헬퍼 모듈 임포트 테스트

```bash
uv run python -c "
from unknown_world.orchestrator.stages.render_helpers import (
    IMAGE_GENERATION_COST_SIGNAL,
    extract_image_job,
    should_generate_image,
    can_afford_image_generation,
    decide_image_generation,
    ImageGenerationDecision,
)
print('✅ render_helpers 모듈 임포트 성공')
print(f'이미지 생성 비용: {IMAGE_GENERATION_COST_SIGNAL} Signal')
"
```

**기대 결과**:
```
✅ render_helpers 모듈 임포트 성공
이미지 생성 비용: 10 Signal
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 이미지 생성 판정 - should_generate=true

**목적**: 모델이 이미지 생성을 요청한 경우 판정 로직이 정상 동작하는지 검증

**실행**:

```bash
uv run python -c "
from unknown_world.models.turn import (
    TurnOutput, Language, EconomyOutput, SafetyOutput,
    CurrencyAmount, RenderOutput, ImageJob, EconomySnapshot,
)
from unknown_world.orchestrator.stages.render_helpers import decide_image_generation

# 이미지 생성 요청이 있는 TurnOutput
turn_output = TurnOutput(
    language=Language.KO,
    narrative='어두운 숲길에 들어섰다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=95, memory_shard=5),
    ),
    safety=SafetyOutput(blocked=False),
    render=RenderOutput(
        image_job=ImageJob(
            should_generate=True,
            prompt='A dark forest path with moonlight filtering through the trees',
            aspect_ratio='16:9',
            image_size='1024x1024',
        )
    ),
)

# 잔액 충분한 상태
economy = EconomySnapshot(signal=100, memory_shard=5)

decision = decide_image_generation(turn_output, economy, 'ko-KR')
print(f'should_generate: {decision.should_generate}')
print(f'reason: {decision.reason}')
print(f'prompt_hash: {decision.prompt_hash}')
print(f'aspect_ratio: {decision.aspect_ratio}')
print(f'estimated_cost: {decision.estimated_cost_signal}')
"
```

**기대 결과**:
```
should_generate: True
reason: all_conditions_met
prompt_hash: <8자리 해시>
aspect_ratio: 16:9
estimated_cost: 10
```

**확인 포인트**:
- ✅ `should_generate=True`
- ✅ `reason=all_conditions_met`
- ✅ `prompt_hash`가 8자리 해시로 반환됨 (원문 노출 없음)

---

### 시나리오 B: 이미지 생성 판정 - should_generate=false

**목적**: 모델이 이미지 생성을 요청하지 않은 경우 판정 로직이 정상 동작하는지 검증

**실행**:

```bash
uv run python -c "
from unknown_world.models.turn import (
    TurnOutput, Language, EconomyOutput, SafetyOutput,
    CurrencyAmount, RenderOutput, ImageJob, EconomySnapshot,
)
from unknown_world.orchestrator.stages.render_helpers import decide_image_generation

# should_generate=false인 TurnOutput
turn_output = TurnOutput(
    language=Language.KO,
    narrative='방 안을 둘러보았다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=3, memory_shard=0),
        balance_after=CurrencyAmount(signal=97, memory_shard=5),
    ),
    safety=SafetyOutput(blocked=False),
    render=RenderOutput(
        image_job=ImageJob(
            should_generate=False,
            prompt='',
        )
    ),
)

economy = EconomySnapshot(signal=100, memory_shard=5)
decision = decide_image_generation(turn_output, economy, 'ko-KR')

print(f'should_generate: {decision.should_generate}')
print(f'reason: {decision.reason}')
"
```

**기대 결과**:
```
should_generate: False
reason: should_generate_false
```

**확인 포인트**:
- ✅ `should_generate=False`
- ✅ `reason=should_generate_false`

---

### 시나리오 C: 잔액 부족 시 폴백

**목적**: 잔액이 부족한 경우 이미지 생성이 거부되고 폴백 메시지가 제공되는지 검증 (RULE-005)

**실행**:

```bash
uv run python -c "
from unknown_world.models.turn import (
    TurnOutput, Language, EconomyOutput, SafetyOutput,
    CurrencyAmount, RenderOutput, ImageJob, EconomySnapshot,
)
from unknown_world.orchestrator.stages.render_helpers import (
    decide_image_generation,
    IMAGE_GENERATION_COST_SIGNAL,
)

# 이미지 생성 요청
turn_output = TurnOutput(
    language=Language.KO,
    narrative='보물 상자를 발견했다!',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=3, memory_shard=0),
        balance_after=CurrencyAmount(signal=5, memory_shard=0),  # 잔액 부족
    ),
    safety=SafetyOutput(blocked=False),
    render=RenderOutput(
        image_job=ImageJob(
            should_generate=True,
            prompt='A golden treasure chest in a cave',
        )
    ),
)

# 잔액 부족 (필요: 10 Signal, 보유: 5 Signal)
economy = EconomySnapshot(signal=5, memory_shard=0)

print(f'필요 비용: {IMAGE_GENERATION_COST_SIGNAL} Signal')
print(f'현재 잔액: {economy.signal} Signal')
print()

decision = decide_image_generation(turn_output, economy, 'ko-KR')

print(f'should_generate: {decision.should_generate}')
print(f'reason: {decision.reason}')
print(f'fallback_message: {decision.fallback_message}')
"
```

**기대 결과**:
```
필요 비용: 10 Signal
현재 잔액: 5 Signal

should_generate: False
reason: insufficient_balance
fallback_message: 잔액이 부족하여 이미지를 생성할 수 없습니다. 텍스트로 진행합니다.
```

**확인 포인트**:
- ✅ `should_generate=False`
- ✅ `reason=insufficient_balance`
- ✅ `fallback_message`가 한국어로 제공됨

---

### 시나리오 D: 빈 프롬프트 방어

**목적**: 모델이 `should_generate=true`지만 프롬프트가 비어있는 경우 방어 로직 검증

**실행**:

```bash
uv run python -c "
from unknown_world.models.turn import (
    TurnOutput, Language, EconomyOutput, SafetyOutput,
    CurrencyAmount, RenderOutput, ImageJob, EconomySnapshot,
)
from unknown_world.orchestrator.stages.render_helpers import decide_image_generation

# should_generate=true지만 프롬프트가 비어있음
turn_output = TurnOutput(
    language=Language.EN,
    narrative='You entered the dungeon.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=95, memory_shard=5),
    ),
    safety=SafetyOutput(blocked=False),
    render=RenderOutput(
        image_job=ImageJob(
            should_generate=True,
            prompt='   ',  # 공백만 있음
        )
    ),
)

economy = EconomySnapshot(signal=100, memory_shard=5)
decision = decide_image_generation(turn_output, economy, 'en-US')

print(f'should_generate: {decision.should_generate}')
print(f'reason: {decision.reason}')
"
```

**기대 결과**:
```
should_generate: False
reason: empty_prompt
```

**확인 포인트**:
- ✅ `should_generate=False`
- ✅ `reason=empty_prompt` (빈 프롬프트 방어 동작)

---

### 시나리오 E: render_stage 통합 테스트

**목적**: render_stage에서 판정 로직이 정상 호출되는지 검증

**실행**:

```bash
uv run python -c "
import asyncio
from unknown_world.models.turn import (
    TurnInput, TurnOutput, Language, EconomyOutput, SafetyOutput,
    CurrencyAmount, RenderOutput, ImageJob, EconomySnapshot, ClientInfo,
)
from unknown_world.orchestrator.stages.types import PipelineContext, PipelineEvent
from unknown_world.orchestrator.stages.render import render_stage
from unknown_world.services.image_generation import MockImageGenerator

async def test_render_stage():
    # Mock 이미지 생성기
    generator = MockImageGenerator()
    
    # TurnInput 생성
    turn_input = TurnInput(
        language=Language.KO,
        text='숲으로 들어간다',
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )
    
    # TurnOutput with image_job
    turn_output = TurnOutput(
        language=Language.KO,
        narrative='어두운 숲으로 들어섰다.',
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=5, memory_shard=0),
            balance_after=CurrencyAmount(signal=95, memory_shard=5),
        ),
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(
            image_job=ImageJob(
                should_generate=True,
                prompt='A dark mysterious forest',
                aspect_ratio='16:9',
            )
        ),
    )
    
    # PipelineContext 생성
    ctx = PipelineContext(
        turn_input=turn_input,
        economy_snapshot=CurrencyAmount(signal=100, memory_shard=5),
        output=turn_output,
        image_generator=generator,
    )
    
    # emit 콜백
    events = []
    async def emit(event: PipelineEvent):
        events.append(event)
    
    # render_stage 실행
    result_ctx = await render_stage(ctx, emit=emit)
    
    print('✅ render_stage 실행 완료')
    print(f'이벤트 수: {len(events)}')
    print(f'이벤트 타입: {[e.event_type.value for e in events]}')

asyncio.run(test_render_stage())
"
```

**기대 결과**:
```
✅ render_stage 실행 완료
이벤트 수: 2
이벤트 타입: ['stage_start', 'stage_complete']
```

**확인 포인트**:
- ✅ render_stage가 예외 없이 완료됨
- ✅ stage_start, stage_complete 이벤트 발생

---

## 4. 실행 결과 확인

### 4.1 로그 확인

로그 레벨을 DEBUG로 설정하면 판정 과정을 상세히 확인할 수 있습니다:

```bash
uv run python -c "
import logging
logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(message)s')

from unknown_world.models.turn import *
from unknown_world.orchestrator.stages.render_helpers import decide_image_generation

turn_output = TurnOutput(
    language=Language.KO,
    narrative='테스트',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=95, memory_shard=5),
    ),
    safety=SafetyOutput(blocked=False),
    render=RenderOutput(
        image_job=ImageJob(should_generate=True, prompt='Test prompt')
    ),
)
economy = EconomySnapshot(signal=100, memory_shard=5)
decision = decide_image_generation(turn_output, economy, 'ko-KR')
print(f'\\n결과: should_generate={decision.should_generate}')
"
```

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ 모든 시나리오(A~E)가 기대 결과와 일치
- ✅ 린트/타입 체크 통과 (`uv run ruff check`, `uv run pyright`)
- ✅ 프롬프트 원문이 로그에 노출되지 않음 (해시만 출력)

**실패 시 확인**:
- ❌ ImportError → 의존성 설치 확인 (`uv sync`)
- ❌ TypeError → U-051, U-017 스키마 호환성 확인
- ❌ 프롬프트 원문 노출 → RULE-007 위반, 로깅 로직 검토

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ImportError: cannot import name 'ImageGenerationDecision' from 'unknown_world.orchestrator.stages.render_helpers'`

- **원인**: render_helpers.py 파일이 생성되지 않았거나 경로 오류
- **해결**: `backend/src/unknown_world/orchestrator/stages/render_helpers.py` 파일 존재 여부 확인

**오류**: `TypeError: 'NoneType' object is not subscriptable` (economy 관련)

- **원인**: economy_snapshot이 올바른 형식이 아님
- **해결**: EconomySnapshot 또는 CurrencyAmount 타입으로 전달

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 `\` 주의
- **Python 버전**: Python 3.14+ 필요 (dataclass, TYPE_CHECKING 활용)

---

## 6. 다음 단계

이 유닛을 기반으로 다음 작업을 진행합니다:

1. **U-053**: `image_decision.should_generate=true`면 실제 이미지 생성 호출
2. **U-054**: 잔액 부족 시 폴백 메시지를 TurnOutput에 반영하는 로직
