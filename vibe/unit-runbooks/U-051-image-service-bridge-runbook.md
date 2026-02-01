# U-051[Mvp] 렌더링 단계-이미지 생성 서비스 브릿지 구축 실행 가이드

## 1. 개요

렌더링 단계(`render_stage`)에서 이미지 생성 서비스(`image_generation`)를 호출할 수 있도록 의존성을 주입하고 실행 구조를 연결하는 브릿지를 구현했습니다. 이를 통해 파이프라인 내에서 이미지 생성이 가능해지며, 테스트 시 Mock 생성기로 모킹할 수 있습니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-019[Mvp] (이미지 생성 서비스), RU-005[Mvp] (파이프라인 단계 구조)
- 선행 완료 필요: 의존 유닛 완료 확인됨

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
# 이미지 생성 서비스 모듈 존재 확인
uv run python -c "from unknown_world.services.image_generation import ImageGenerator, MockImageGenerator, get_image_generator; print('U-019 OK')"

# 파이프라인 단계 모듈 존재 확인
uv run python -c "from unknown_world.orchestrator.stages.types import PipelineContext; print('RU-005 OK')"
```

### 2.3 브릿지 연결 확인

```bash
# PipelineContext에 image_generator 필드가 추가되었는지 확인
uv run python -c "
from unknown_world.orchestrator.stages.types import PipelineContext
from dataclasses import fields
field_names = [f.name for f in fields(PipelineContext)]
assert 'image_generator' in field_names, 'image_generator 필드 누락'
print('image_generator 필드 확인 OK')
"
```

### 2.4 첫 화면/결과 확인

- 위 검증 스크립트가 모두 성공적으로 실행되면 브릿지 구축 완료
- 성공 지표: 모든 import가 정상적으로 수행되고 `OK` 메시지 출력

---

## 3. 핵심 기능 시나리오

### 시나리오 A: PipelineContext 이미지 생성기 주입 테스트

**목적**: `create_pipeline_context`를 통해 이미지 생성기를 주입할 수 있는지 검증

**실행**:

```bash
uv run python -c "
from unknown_world.orchestrator.pipeline import create_pipeline_context
from unknown_world.services.image_generation import MockImageGenerator
from unknown_world.models.turn import TurnInput, EconomySnapshot, ClientInfo, Language

# 테스트용 TurnInput 생성
turn_input = TurnInput(
    language=Language.KO,
    text='테스트 입력',
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=10),
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
)

# Mock 생성기 주입
mock_gen = MockImageGenerator()
ctx = create_pipeline_context(turn_input, image_generator=mock_gen)

assert ctx.image_generator is not None, 'image_generator가 None'
assert ctx.image_generator.is_available(), 'Mock 생성기가 사용 불가'
print('시나리오 A: 이미지 생성기 주입 성공')
"
```

**기대 결과**:

```
시나리오 A: 이미지 생성기 주입 성공
```

**확인 포인트**:

- ✅ `create_pipeline_context`에 `image_generator` 매개변수 전달 가능
- ✅ `ctx.image_generator`가 주입된 인스턴스를 정확히 참조
- ✅ `is_available()` 메서드 호출 가능

---

### 시나리오 B: 자동 이미지 생성기 획득 테스트 (이미지 생성기 미주입)

**목적**: 이미지 생성기를 명시적으로 주입하지 않아도 자동으로 획득되어 파이프라인이 정상 동작하는지 검증

**실행**:

```bash
uv run python -c "
from unknown_world.orchestrator.pipeline import create_pipeline_context
from unknown_world.models.turn import TurnInput, EconomySnapshot, ClientInfo, Language

# 테스트용 TurnInput 생성
turn_input = TurnInput(
    language=Language.KO,
    text='테스트 입력',
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=10),
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
)

# 이미지 생성기 미주입 → 자동 획득 (is_mock 기준)
ctx = create_pipeline_context(turn_input)

assert ctx.image_generator is not None, 'image_generator가 자동 획득되어야 함'
assert ctx.image_generator.is_available(), '자동 획득된 생성기가 사용 가능해야 함'
print('시나리오 B: 자동 이미지 생성기 획득 확인')
"
```

**기대 결과**:

```
시나리오 B: 자동 이미지 생성기 획득 확인
```

**확인 포인트**:

- ✅ `image_generator` 매개변수 없이도 컨텍스트 생성 가능
- ✅ `get_image_generator(force_mock=is_mock)` 호출로 자동 획득
- ✅ Mock 모드(`UW_MODE=mock`)에서는 `MockImageGenerator` 자동 주입

---

### 시나리오 C: render_stage 통합 테스트

**목적**: `render_stage`에서 주입된 이미지 생성기를 올바르게 인식하는지 검증

**실행**:

```bash
uv run python -c "
import asyncio
from unknown_world.orchestrator.pipeline import create_pipeline_context
from unknown_world.orchestrator.stages.render import render_stage
from unknown_world.orchestrator.stages.types import PipelineEvent
from unknown_world.services.image_generation import MockImageGenerator
from unknown_world.models.turn import TurnInput, EconomySnapshot, ClientInfo, Language

# 이벤트 수집용 리스트
events = []

async def collect_emit(event: PipelineEvent):
    events.append(event)

async def test_render_stage():
    # 테스트용 TurnInput 생성
    turn_input = TurnInput(
        language=Language.KO,
        text='테스트 입력',
        economy_snapshot=EconomySnapshot(signal=100, memory_shard=10),
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
    )
    
    # Mock 생성기 주입
    mock_gen = MockImageGenerator()
    ctx = create_pipeline_context(turn_input, image_generator=mock_gen)
    
    # render_stage 실행
    result_ctx = await render_stage(ctx, emit=collect_emit)
    
    # 검증
    assert len(events) == 2, f'이벤트 2개 예상, 실제: {len(events)}'
    assert events[0].event_type.value == 'stage_start', '첫 번째 이벤트는 stage_start'
    assert events[1].event_type.value == 'stage_complete', '두 번째 이벤트는 stage_complete'
    assert result_ctx.image_generator is not None, 'image_generator가 유지되어야 함'
    print('시나리오 C: render_stage 통합 테스트 성공')

asyncio.run(test_render_stage())
"
```

**기대 결과**:

```
시나리오 C: render_stage 통합 테스트 성공
```

**확인 포인트**:

- ✅ `render_stage`가 정상적으로 실행됨
- ✅ `stage_start` / `stage_complete` 이벤트 순서 유지 (RULE-008)
- ✅ 컨텍스트의 `image_generator` 참조가 유지됨

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: 콘솔 출력 (DEBUG 레벨)
- 주요 로그 메시지:
  - `[Render] 이미지 생성 서비스 연결됨`: 생성기 주입 성공
  - `[Render] 이미지 생성 서비스 미주입, pass-through 동작`: 기존 동작

### 4.2 생성 파일

- 생성/수정 파일 없음 (기존 파일 수정만)

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ 모든 시나리오(A, B, C) 통과
- ✅ 린트/타입 체크 무결성 확인 (`ruff check`, `pyright` 0 errors)
- ✅ 기존 파이프라인 동작 보존

**실패 시 확인**:

- ❌ `ImportError` → 의존 유닛(U-019, RU-005) 완료 여부 확인
- ❌ `AttributeError: image_generator` → `types.py` 수정 누락 확인
- ❌ 타입 오류 → `TYPE_CHECKING` 블록 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ImportError: cannot import name 'ImageGeneratorType'`

- **원인**: `image_generation.py`에서 타입 정의 누락
- **해결**: U-019 개발 보고서 참조, `ImageGeneratorType` 정의 확인

**오류**: `AttributeError: 'PipelineContext' object has no attribute 'image_generator'`

- **원인**: `types.py`의 `PipelineContext` 필드 추가 누락
- **해결**: `types.py`에 `image_generator` 필드 추가 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 차이 없음 (Python pathlib 사용)
- **macOS/Linux**: 동일하게 동작

---

## 6. 다음 단계

본 유닛(U-051)은 렌더링 단계와 이미지 생성 서비스 간의 브릿지를 구축했습니다. 후속 작업:

1. **U-052**: 이미지 생성 여부 판정(`should_generate`) 및 프롬프트/해상도 추출 로직
2. **U-053**: 비동기 이미지 생성 호출 및 결과 동기화
