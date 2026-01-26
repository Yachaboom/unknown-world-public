# U-043[Mvp] ko/en 혼합 출력 게이트 실행 가이드

## 1. 개요

TurnOutput의 사용자 노출 텍스트에서 ko/en 언어 혼합을 감지하고, 위반 시 Repair loop로 자동 복구하는 Hard Gate입니다. 이를 통해 RULE-006(언어 정책)과 CP-MVP-05(언어 혼합 금지)를 준수합니다.

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-018[Mvp] (Repair loop), U-036[Mvp] (프롬프트 ko/en 분리)
- 선행 완료 필요: 백엔드 서버 실행 가능 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치 (uv 사용)
uv sync
```

### 2.2 환경 변수 설정

```bash
# .env 파일 확인 또는 생성
cp .env.example .env

# 개발 모드로 설정 (Mock 모드 활성화)
# .env 내용:
# ENVIRONMENT=development
# USE_MOCK=true
```

### 2.3 서버 실행

```bash
# 백엔드 서버 시작
cd backend && uv run uvicorn unknown_world.main:app --host 0.0.0.0 --port 8011 --reload
```

### 2.4 첫 화면/결과 확인

- 서버가 정상 시작되면: `Uvicorn running on http://0.0.0.0:8011`
- 헬스 체크: `http://localhost:8011/api/health`

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 언어 감지 휴리스틱 테스트 (Python REPL)

**목적**: 한글/라틴 비율 측정 및 혼합 감지 로직 검증

**실행**:

```bash
cd backend && uv run python -c "
from unknown_world.validation.language_gate import (
    measure_language_ratio,
    is_language_mixed,
)
from unknown_world.models.turn import Language

# 테스트 1: 순수 한글
text_ko = '문이 삐걱거리며 열립니다. 어둠 속에서 빛이 새어나옵니다.'
ratio = measure_language_ratio(text_ko)
print(f'[순수 한글] hangul={ratio.hangul_ratio:.2f}, latin={ratio.latin_ratio:.2f}')
print(f'  혼합 여부 (ko 기대): {is_language_mixed(text_ko, Language.KO)}')

# 테스트 2: 순수 영어
text_en = 'The door creaks open. Light seeps through the darkness.'
ratio = measure_language_ratio(text_en)
print(f'[순수 영어] hangul={ratio.hangul_ratio:.2f}, latin={ratio.latin_ratio:.2f}')
print(f'  혼합 여부 (en 기대): {is_language_mixed(text_en, Language.EN)}')

# 테스트 3: ko/en 혼합 (문제 상황)
text_mixed = 'Explore Unknown Territory. 자원 효율 최적화하기.'
ratio = measure_language_ratio(text_mixed)
print(f'[혼합] hangul={ratio.hangul_ratio:.2f}, latin={ratio.latin_ratio:.2f}')
print(f'  혼합 여부 (ko 기대): {is_language_mixed(text_mixed, Language.KO)}')

# 테스트 4: 화이트리스트 단어 (Signal, Shard)
text_whitelist = 'Signal 100개를 획득했습니다. Memory Shard가 부족합니다.'
ratio = measure_language_ratio(text_whitelist)
print(f'[화이트리스트] hangul={ratio.hangul_ratio:.2f}, latin={ratio.latin_ratio:.2f}')
print(f'  혼합 여부 (ko 기대): {is_language_mixed(text_whitelist, Language.KO)}')
"
```

**기대 결과**:

```
[순수 한글] hangul=1.00, latin=0.00
  혼합 여부 (ko 기대): False
[순수 영어] hangul=0.00, latin=1.00
  혼합 여부 (en 기대): False
[혼합] hangul=0.XX, latin=0.XX
  혼합 여부 (ko 기대): True
[화이트리스트] hangul=0.XX, latin=0.XX
  혼합 여부 (ko 기대): False
```

**확인 포인트**:
- ✅ 순수 한글/영어는 혼합으로 판정되지 않음
- ✅ ko/en 혼합 텍스트는 혼합으로 감지됨
- ✅ 화이트리스트 단어(Signal, Shard)는 혼합에서 제외됨

---

### 시나리오 B: TurnOutput 텍스트 추출 테스트

**목적**: TurnOutput에서 사용자 노출 텍스트를 올바르게 추출하는지 검증

**실행**:

```bash
cd backend && uv run python -c "
from unknown_world.validation.language_gate import extract_user_facing_texts
from unknown_world.models.turn import (
    TurnOutput, Language, EconomyOutput, SafetyOutput, CurrencyAmount,
    UIOutput, ActionDeck, ActionCard, RiskLevel, SceneObject, Box2D,
    WorldDelta, Quest, WorldRule, MemoryPin,
)

# 혼합 출력 TurnOutput 생성 (vibe/ref/en-ko-issue.png 재현)
output = TurnOutput(
    language=Language.KO,
    narrative='문이 삐걱거리며 열립니다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=95, memory_shard=5),
    ),
    safety=SafetyOutput(blocked=False),
    ui=UIOutput(
        action_deck=ActionDeck(cards=[
            ActionCard(id='act1', label='HIDE AND OBSERVE', cost=CurrencyAmount(signal=3, memory_shard=0)),
            ActionCard(id='act2', label='숨어서 관찰하기', cost=CurrencyAmount(signal=3, memory_shard=0)),
        ]),
        objects=[
            SceneObject(id='obj1', label='Mysterious Door', box_2d=Box2D(ymin=100, xmin=200, ymax=400, xmax=600)),
        ],
    ),
    world=WorldDelta(
        quests_updated=[Quest(id='q1', label='Explore Unknown Territory')],
        rules_changed=[WorldRule(id='r1', label='GRAVITY INVERSION', description='Gravity works in reverse')],
    ),
)

# 텍스트 추출
texts = extract_user_facing_texts(output)
print(f'추출된 텍스트 필드 수: {len(texts)}')
for t in texts:
    print(f'  - {t.field_path}: \"{t.text[:30]}...\"' if len(t.text) > 30 else f'  - {t.field_path}: \"{t.text}\"')
"
```

**기대 결과**:

```
추출된 텍스트 필드 수: 8
  - narrative: "문이 삐걱거리며 열립니다."
  - ui.action_deck.cards[0].label: "HIDE AND OBSERVE"
  - ui.action_deck.cards[1].label: "숨어서 관찰하기"
  - ui.objects[0].label: "Mysterious Door"
  - world.quests_updated[0].label: "Explore Unknown Territory"
  - world.rules_changed[0].label: "GRAVITY INVERSION"
  - world.rules_changed[0].description: "Gravity works in reverse"
```

**확인 포인트**:
- ✅ narrative, action_deck.cards, objects, quests, rules 모두 추출됨
- ✅ 필드 경로가 정확히 표시됨

---

### 시나리오 C: 비즈니스 룰 검증 통합 테스트

**목적**: language_content_mixed 에러가 비즈니스 룰 검증에서 올바르게 감지되는지 검증

**실행**:

```bash
cd backend && uv run python -c "
from unknown_world.validation.business_rules import validate_business_rules
from unknown_world.models.turn import (
    TurnInput, TurnOutput, Language, EconomyOutput, SafetyOutput,
    CurrencyAmount, EconomySnapshot, ClientInfo, Theme,
    UIOutput, ActionDeck, ActionCard, RiskLevel, SceneObject, Box2D,
    WorldDelta, Quest, WorldRule,
)

# 입력 (한국어 요청)
turn_input = TurnInput(
    language=Language.KO,
    text='문을 열어본다',
    client=ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK),
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
)

# 혼합 출력 (영어가 섞인 한국어)
turn_output_mixed = TurnOutput(
    language=Language.KO,
    narrative='The door creaks open.',  # 영어 내러티브 (위반!)
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=95, memory_shard=5),
    ),
    safety=SafetyOutput(blocked=False),
    ui=UIOutput(
        action_deck=ActionDeck(cards=[
            ActionCard(id='act1', label='HIDE AND OBSERVE', cost=CurrencyAmount(signal=3, memory_shard=0)),
        ]),
    ),
    world=WorldDelta(
        quests_updated=[Quest(id='q1', label='Explore Unknown Territory')],
    ),
)

# 검증 실행
result = validate_business_rules(turn_input, turn_output_mixed)

print(f'검증 결과: {\"실패\" if not result.is_valid else \"성공\"}')
print(f'에러 수: {len(result.errors)}')
for err in result.errors:
    print(f'  - [{err[\"type\"]}] {err[\"message\"]}')

if result.language_gate_result:
    print(f'\\n언어 혼합 위반 수: {len(result.language_gate_result.violations)}')
    for v in result.language_gate_result.violations:
        print(f'  - {v[\"field\"]}: {v[\"sample\"]}')

print(f'\\n에러 요약:\\n{result.error_summary}')
"
```

**기대 결과**:

```
검증 결과: 실패
에러 수: 1
  - [language_content_mixed] 언어 혼합 감지: 3개 필드에서 ko/en 혼합 발견

언어 혼합 위반 수: 3
  - narrative: The door creaks open.
  - ui.action_deck.cards[0].label: HIDE AND OBSERVE
  - world.quests_updated[0].label: Explore Unknown Territory

에러 요약:
다음 비즈니스 룰을 위반했습니다:
- 언어 혼합 감지: 3개 필드에서 ko/en 혼합 발견

언어 혼합이 감지되었습니다 (RULE-006 위반):
- 필드 'narrative': 한국어로 작성해야 합니다
- 필드 'ui.action_deck.cards[0].label': 한국어로 작성해야 합니다
- 필드 'world.quests_updated[0].label': 한국어로 작성해야 합니다

모든 사용자 노출 텍스트를 한국어(ko-KR)로 다시 작성하세요.
```

**확인 포인트**:
- ✅ language_content_mixed 에러 타입으로 감지됨
- ✅ 위반 필드 경로와 샘플 텍스트가 표시됨
- ✅ Repair 프롬프트용 에러 요약이 올바르게 생성됨

---

### 시나리오 D: 정상 출력 통과 테스트

**목적**: 언어가 일관된 TurnOutput은 검증을 통과하는지 확인

**실행**:

```bash
cd backend && uv run python -c "
from unknown_world.validation.business_rules import validate_business_rules
from unknown_world.models.turn import (
    TurnInput, TurnOutput, Language, EconomyOutput, SafetyOutput,
    CurrencyAmount, EconomySnapshot, ClientInfo, Theme,
    UIOutput, ActionDeck, ActionCard, RiskLevel,
)

# 입력 (한국어 요청)
turn_input = TurnInput(
    language=Language.KO,
    text='문을 열어본다',
    client=ClientInfo(viewport_w=1920, viewport_h=1080, theme=Theme.DARK),
    economy_snapshot=EconomySnapshot(signal=100, memory_shard=5),
)

# 정상 출력 (순수 한국어 + 화이트리스트 단어만)
turn_output_ok = TurnOutput(
    language=Language.KO,
    narrative='문이 삐걱거리며 열립니다. Signal 5개를 소비했습니다.',
    economy=EconomyOutput(
        cost=CurrencyAmount(signal=5, memory_shard=0),
        balance_after=CurrencyAmount(signal=95, memory_shard=5),
    ),
    safety=SafetyOutput(blocked=False),
    ui=UIOutput(
        action_deck=ActionDeck(cards=[
            ActionCard(id='act1', label='숨어서 관찰하기', cost=CurrencyAmount(signal=3, memory_shard=0)),
            ActionCard(id='act2', label='대화 시도하기', cost=CurrencyAmount(signal=5, memory_shard=0)),
        ]),
    ),
)

# 검증 실행
result = validate_business_rules(turn_input, turn_output_ok)

print(f'검증 결과: {\"성공\" if result.is_valid else \"실패\"}')
print(f'에러 수: {len(result.errors)}')
"
```

**기대 결과**:

```
검증 결과: 성공
에러 수: 0
```

**확인 포인트**:
- ✅ 순수 한국어 텍스트는 통과
- ✅ 화이트리스트 단어(Signal)는 혼합으로 판정되지 않음

---

## 4. API 통합 테스트 (curl)

### 4.1 Mock 모드에서 혼합 출력 검증

```bash
# 백엔드 서버가 실행 중이어야 합니다 (USE_MOCK=true)

curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "Explore the door",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }' \
  --no-buffer 2>/dev/null | while IFS= read -r line; do
    if [[ "$line" == data:* ]]; then
      echo "$line" | sed 's/data: //' | python -m json.tool 2>/dev/null || echo "$line"
    fi
  done
```

### 4.2 검증 배지 확인

응답 스트림에서 `badges` 이벤트를 확인합니다:
- `consistency_ok`: 언어 검증 통과
- `consistency_fail`: 언어 혼합 감지됨 (Repair 시도)

---

## 5. 실행 결과 확인

### 5.1 로그 확인

백엔드 서버 로그에서 다음을 확인합니다:

```
[LanguageGate] 언어 혼합 감지 - expected_language=ko-KR, violation_count=N
[BusinessRules] 검증 실패 - error_count=N
[RepairLoop] 시도 - attempt=1, is_repair=True, language=ko-KR
```

### 5.2 성공/실패 판단 기준

**성공**:
- ✅ 순수 한국어/영어 텍스트는 검증 통과
- ✅ 화이트리스트 단어(Signal, Shard, FAST 등)는 혼합으로 판정되지 않음
- ✅ ko/en 혼합 텍스트는 `language_content_mixed` 에러로 감지됨
- ✅ Repair 메시지에 언어 교정 지시가 포함됨
- ✅ 배지가 `CONSISTENCY_FAIL`로 표시됨

**실패 시 확인**:
- ❌ 정상 텍스트가 혼합으로 오탐 → `MIXED_THRESHOLD_RATIO` 조정 필요
- ❌ 혼합 텍스트가 통과됨 → 화이트리스트 확인 및 임계값 조정

---

## 6. 문제 해결 (Troubleshooting)

### 6.1 일반적인 오류

**오류**: `ModuleNotFoundError: No module named 'unknown_world'`
- **원인**: PYTHONPATH 미설정
- **해결**: `cd backend && uv run python ...` 형식으로 실행

**오류**: 정상 한국어 텍스트가 혼합으로 오탐됨
- **원인**: 화이트리스트에 없는 영어 고유명 포함
- **해결**: `language_gate.py`의 `ALLOWED_ENGLISH_TERMS`에 추가

**오류**: 혼합 텍스트가 감지되지 않음
- **원인**: 임계값이 너무 높음
- **해결**: `MIXED_THRESHOLD_RATIO` 값 조정 (기본 0.15)

### 6.2 환경별 주의사항

- **Windows**: 경로 구분자 `\` 사용에 주의
- **macOS/Linux**: 특이사항 없음

---

## 7. 다음 단계

1. **CP-MVP-05**: 언어 혼합 없음 체크포인트 검증
2. **U-044**: 프론트엔드 TurnInput.language SSOT 적용
3. **튜닝**: 실제 모델 출력 기반으로 `MIXED_THRESHOLD_RATIO` 및 화이트리스트 조정
