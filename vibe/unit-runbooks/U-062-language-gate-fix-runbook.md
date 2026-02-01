# U-062 MockOrchestrator 영어 입력 시 LanguageGate 수정 실행 가이드

## 1. 개요

MockOrchestrator에서 영어 입력 시 발생하던 언어 혼합 문제(LanguageGate CONSISTENCY_FAIL)를 수정했습니다. 사용자 입력 텍스트(text, action_id)를 내러티브 프리픽스에서 완전히 생략하여 언어 충돌을 원천 차단합니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-055[Mvp] (이미지 파이프라인 통합 검증)
- 선행 완료 필요: 없음

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd backend
```

### 2.2 즉시 테스트

```bash
uv run python -c "
from unknown_world.orchestrator.mock import MockOrchestrator
from unknown_world.models.turn import TurnInput, Language, ClientInfo, EconomySnapshot
from unknown_world.validation.business_rules import validate_business_rules

# 영어 입력 + 한국어 세션
turn_input = TurnInput(
    language=Language.KO,
    text='explore the cave',
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
)

output = MockOrchestrator(seed=123).generate_turn_output(turn_input)
print(f'내러티브: {output.narrative}')

result = validate_business_rules(turn_input, output)
print(f'검증 통과: {result.is_valid}')
"
```

### 2.3 기대 결과

```
내러티브: [탐색] 안개가 걷히자, 거대한 탑이 모습을 드러냅니다...
검증 통과: True
```

**주요 확인 포인트**:
- 내러티브에 `explore the cave` 영어 텍스트가 없음
- 프리픽스가 `[탐색]`, `[행동]`, `[시도]` 등 언어에 맞는 형태만 포함
- 검증이 True로 통과

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 영어 입력 + 한국어 세션

**목적**: 영어로 입력해도 한국어 세션에서 LanguageGate가 통과하는지 검증

**실행**:

```python
turn_input = TurnInput(
    language=Language.KO,  # 한국어 세션
    text='explore the cave',  # 영어 입력
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
)
output = MockOrchestrator(seed=123).generate_turn_output(turn_input)
result = validate_business_rules(turn_input, output)
```

**기대 결과**:
- `output.narrative`에 영어 텍스트 없음
- `result.is_valid == True`
- `result.errors` 빈 리스트

**확인 포인트**:
- ✅ 프리픽스가 한국어 (`[행동]`, `[탐색]`, `[시도]`)
- ✅ 내러티브 본문이 한국어
- ✅ 사용자 입력 텍스트가 프리픽스에 포함되지 않음

---

### 시나리오 B: 한국어 입력 + 영어 세션

**목적**: 한국어로 입력해도 영어 세션에서 LanguageGate가 통과하는지 검증

**실행**:

```python
turn_input = TurnInput(
    language=Language.EN,  # 영어 세션
    text='동굴을 탐험한다',  # 한국어 입력
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
)
output = MockOrchestrator(seed=456).generate_turn_output(turn_input)
result = validate_business_rules(turn_input, output)
```

**기대 결과**:
- `output.narrative`에 한국어 텍스트 없음
- `result.is_valid == True`

**확인 포인트**:
- ✅ 프리픽스가 영어 (`[ACTION]`, `[ATTEMPT]`, `[EXPLORE]`)
- ✅ 내러티브 본문이 영어
- ✅ 사용자 입력 텍스트가 프리픽스에 포함되지 않음

---

### 시나리오 C: DROP/CLICK 입력 (오브젝트 ID 포함)

**목적**: DROP/CLICK 입력에서는 오브젝트 ID가 프리픽스에 포함되는지 검증

**실행**:

```python
from unknown_world.models.turn import ClickInput

turn_input = TurnInput(
    language=Language.KO,
    text='',
    click=ClickInput(object_id='old_door'),  # 시스템 생성 ID
    client=ClientInfo(viewport_w=1920, viewport_h=1080),
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
)
output = MockOrchestrator(seed=789).generate_turn_output(turn_input)
```

**기대 결과**:
- 프리픽스: `[조사] old_door:` 형태
- 오브젝트 ID는 시스템이 생성한 것이므로 언어 혼합 위험 없음

**확인 포인트**:
- ✅ 오브젝트 ID가 프리픽스에 포함됨
- ✅ 검증 통과

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:
- ✅ 영어 입력 + 한국어 세션 → LanguageGate 통과
- ✅ 한국어 입력 + 영어 세션 → LanguageGate 통과
- ✅ repair loop 없이 정상 응답 반환
- ✅ 내러티브에 입력 텍스트가 포함되지 않음

**실패 시 확인**:
- ❌ 검증 실패 → `result.errors` 확인, `language_gate_result.violations` 상세 확인
- ❌ 프리픽스에 입력 텍스트 포함 → `mock.py`의 `_format_action_log_prefix()` 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `CONSISTENCY_FAIL` 여전히 발생

- **원인**: 서버가 핫 리로드되지 않았을 수 있음
- **해결**: 백엔드 서버 재시작 (`pnpm dev:back`)

**오류**: 프리픽스에 입력 텍스트가 여전히 포함됨

- **원인**: 코드 변경이 저장되지 않았거나 다른 경로의 파일을 수정
- **해결**: `backend/src/unknown_world/orchestrator/mock.py` 파일 확인

---

## 6. 변경 사항 요약

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/src/unknown_world/orchestrator/mock.py` | `_format_action_log_prefix()`에서 입력 텍스트 생략 |
| `backend/prompts/system/game_master.ko.md` | "사용자 입력 인용 금지" 지침 추가 |
| `backend/prompts/system/game_master.en.md` | "Do not quote user input" 지침 추가 |
| `vibe/debt-log.md` | 해당 이슈 ✅ 표시 |

### 설계 결정

- **Q1 (Option A)**: 입력 텍스트를 내러티브에서 완전히 생략
- **Q2 (Option A)**: Real 모드에서도 동일 정책 적용 (Game Master 프롬프트에 지침 추가)
