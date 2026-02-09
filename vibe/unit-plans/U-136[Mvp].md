# U-136[Mvp]: Economy 검증 보상 시나리오 수정 + ModelLabel enum 통합

## 메타데이터

| 항목      | 내용                                                         |
| --------- | ------------------------------------------------------------ |
| Unit ID   | U-136[Mvp]                                                   |
| Phase     | MVP                                                          |
| 예상 소요 | 45분                                                         |
| 의존성    | U-079[Mvp]                                                   |
| 우선순위  | **Critical** (Hard Gate: Economy OK 실패 → 폴백 전환 → 게임 중단) |

## 작업 목표

경제 검증 로직이 **보상(reward/gains) 시나리오를 올바르게 처리**하도록 수정하고, **두 개의 `ModelLabel` enum 불일치로 인한 Pydantic 직렬화 경고**를 해소한다.

**배경**: 현재 경제 검증(`_validate_economy()`)은 `expected_signal = max(0, snapshot.signal - cost.signal)`로 잔액을 산정한다. 이 공식은 **비용 차감만** 고려하고 **보상/획득(gains)을 반영하지 않아**, GM이 퀘스트 완료·탐색·이벤트 등으로 Signal 보상을 지급하면(예: 비용 0 + 보상 +5 → balance_after=21) "잔액 불일치" 에러가 발생한다. Repair Loop 2회 시도 후에도 해결 불가하여 폴백 내러티브로 대체되는 심각한 문제가 확인되었다.

추가로, `ModelLabel` enum이 두 곳에 정의되어 있다:
- `config/models.py`: `StrEnum` — `FAST`, `QUALITY`, `IMAGE`, `IMAGE_FAST`, `VISION` (내부 모델 선택용)
- `models/turn.py`: `str, Enum` — `FAST`, `QUALITY`, `CHEAP`, `REF` (UI 라벨 표시용)

오케스트레이터가 `config/models.py`의 `ModelLabel.FAST`(StrEnum)를 TurnOutput의 `agent_console.model_label` 필드(turn.py ModelLabel 기대)에 전달하면, Pydantic이 `PydanticSerializationUnexpectedValue` 경고를 발생시킨다.

**완료 기준**:

- `EconomyOutput`에 `gains` 필드(`CurrencyAmount`) 추가 — GM이 보상을 명시적으로 선언
- 경제 검증 공식을 `expected_signal = max(0, snapshot.signal - cost.signal + gains.signal)`로 수정
- 비용 0 + 보상 N인 시나리오에서 `economy_ok` 배지가 정상 발급됨
- 퀘스트 완료 보상(reward_signal) → balance_after 반영이 검증을 통과함
- `ModelLabel` enum을 단일 SSOT로 통합 — `PydanticSerializationUnexpectedValue` 경고 제거
- 프롬프트 지시문에 `gains` 필드 사용법 추가
- 프론트엔드 Zod 스키마에 `gains` 필드 동기화
- Repair loop 2회 실패 → 폴백 시나리오가 재현되지 않음 (보상 시나리오에서)

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/models/turn.py` — `EconomyOutput`에 `gains: CurrencyAmount` 필드 추가, `ModelLabel` enum에 `IMAGE`/`IMAGE_FAST`/`VISION` 값 추가 (또는 config/models.py의 enum으로 통합)
- `backend/src/unknown_world/config/models.py` — `ModelLabel` enum에 `CHEAP`/`REF` 값 추가 (또는 turn.py로 SSOT 이동)
- `backend/src/unknown_world/validation/business_rules.py` — `_validate_economy()` 공식 수정: `gains` 반영
- `backend/prompts/turn/turn_output_instructions.en.md` — `economy.gains` 필드 설명 및 사용 규칙 추가
- `backend/prompts/turn/turn_output_instructions.ko.md` — 동일 (한국어)
- `frontend/src/schemas/turn.ts` — `EconomyOutputSchema`에 `gains` 필드 추가 (Zod)
- `frontend/src/stores/worldStore.ts` — 보상 반영 시 `gains` 기반 잔액 업데이트 로직 추가 (해당 시)

**참조**:

- `backend/src/unknown_world/orchestrator/repair_loop.py` — 검증 호출 흐름 (변경 불필요, 자동 반영)
- `vibe/prd.md` 5절 — 게임 재화 시스템
- `vibe/prd.md` 8.4절 — 구조화 출력 / 검증/복구
- `backend/src/unknown_world/validation/business_rules.py` L50-81 — i18n 에러 메시지 (gains 관련 메시지 추가 필요 시)

## 구현 흐름

### 1단계: EconomyOutput에 gains 필드 추가

- `models/turn.py`의 `EconomyOutput`에 추가:

```python
gains: CurrencyAmount = Field(
    default_factory=lambda: CurrencyAmount(signal=0, memory_shard=0),
    description="이번 턴에 획득한 보상 (퀘스트 완료, 탐색, 이벤트 등)"
)
```

- `CurrencyAmount`가 이미 `signal`/`memory_shard` 필드를 가지고 있으므로 재사용
- 기본값 `{signal: 0, memory_shard: 0}`으로 기존 출력 하위호환 보장

### 2단계: 경제 검증 공식 수정

- `business_rules.py`의 `_validate_economy()` 수정:

```python
# 기존: expected_signal = max(0, snapshot.signal - economy.cost.signal)
# 수정: 보상(gains)을 반영
expected_signal = max(0, snapshot.signal - economy.cost.signal + economy.gains.signal)
expected_shard = max(0, snapshot.memory_shard - economy.cost.memory_shard + economy.gains.memory_shard)
```

- gains의 상한 검증 추가 (악용 방지):
  - 단일 턴에서 gains.signal ≤ MAX_SINGLE_TURN_REWARD (예: 20) 제한
  - 초과 시 `ECONOMY_COST_MISMATCH` 에러

### 3단계: ModelLabel enum 통합

- **전략**: `models/turn.py`의 `ModelLabel`을 SSOT로 확정하고, 모든 값을 통합:

```python
class ModelLabel(str, Enum):
    FAST = "FAST"
    QUALITY = "QUALITY"
    CHEAP = "CHEAP"
    REF = "REF"
    IMAGE = "IMAGE"
    IMAGE_FAST = "IMAGE_FAST"
    VISION = "VISION"
```

- `config/models.py`에서 `turn.py`의 `ModelLabel`을 import하도록 변경
- 또는 `config/models.py`의 `ModelLabel(StrEnum)`을 제거하고 `turn.py`에서 통합 관리

### 4단계: 프롬프트 지시문 업데이트

- `turn_output_instructions.{en,ko}.md`에 `economy.gains` 필드 설명 추가:

```
### economy
- cost: Currency spent this turn
- gains: Currency earned this turn (quest rewards, exploration, events)
  - signal: Signal earned (0 if none)
  - memory_shard: Memory Shard earned (0 if none)
- balance_after: Final balance = snapshot - cost + gains
  - MUST satisfy: balance_after.signal = max(0, snapshot.signal - cost.signal + gains.signal)
- credit: Credit used (debt)
```

- 퀘스트 보상 규칙에 `gains` 반영 지침 추가:
  - "When a quest with reward_signal is completed, set gains.signal = reward_signal"
  - "balance_after must reflect both cost deduction AND gains addition"

### 5단계: 프론트엔드 Zod 스키마 동기화

- `frontend/src/schemas/turn.ts`의 `EconomyOutputSchema`에 `gains` 필드 추가:

```typescript
gains: CurrencyAmountSchema.default({ signal: 0, memory_shard: 0 })
    .describe('이번 턴에 획득한 보상'),
```

- `worldStore.ts`에서 잔액 업데이트 시 `gains` 반영

### 6단계: 검증

- 시나리오 1: 비용 0 + 보상 5 → balance_after = snapshot + 5 → `economy_ok`
- 시나리오 2: 비용 3 + 보상 10 → balance_after = snapshot - 3 + 10 → `economy_ok`
- 시나리오 3: 비용 5 + 보상 0 → balance_after = snapshot - 5 → `economy_ok` (기존 동작 유지)
- 시나리오 4: 보상이 MAX_SINGLE_TURN_REWARD 초과 → `economy_fail`
- ModelLabel 직렬화: Pydantic 경고 없이 TurnOutput 생성 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: U-079[Mvp] — 재화 부족 시 크레딧(빚) 허용 로직, `MAX_CREDIT` 상수
- **모델**: `CurrencyAmount` — 재사용 (signal/memory_shard 필드)

**다음 작업에 전달할 것**:

- **U-137[Mvp]**: Signal 획득-소비 밸런스 조정 시 `gains` 필드를 활용한 보상 시스템 기반
- **CP-MVP-03**: 데모 루프에서 Economy OK 배지가 보상 시나리오에서도 정상 발급되는지 검증
- **U-119[Mmp]**: WIG 폴리시에서 경제 시스템 안정성 최종 점검

## 주의사항

**기술적 고려사항**:

- (RULE-003/005) `gains` 필드 추가는 JSON Schema 변경이므로, Gemini 구조화 출력의 `response_json_schema`도 업데이트해야 함. `generate_schema()` 또는 Pydantic `model_json_schema()`를 사용하면 자동 반영
- (PRD 8.4) 스키마 변경은 "짧고 평평한 스키마"를 유지해야 함 — `gains`는 기존 `CurrencyAmount` 재사용이므로 중첩 증가 없음
- (RULE-004) Repair loop은 `validate_business_rules()` 결과에 의존하므로, 검증 공식 수정이 자동으로 repair 판단에 반영됨
- `gains.signal` + `gains.memory_shard`의 **상한**을 설정하여 GM이 과도한 보상을 지급하는 것을 방지 (경제 인플레이션 방지)
- 기존 TurnOutput 중 `gains` 필드가 없는 응답은 기본값 `{signal: 0, memory_shard: 0}`으로 처리 (하위호환)

**잠재적 리스크**:

- GM이 `gains` 필드를 올바르게 채우지 않을 수 있음 → 프롬프트 지시문에 명확한 규칙 + 예시 추가로 완화
- `gains`와 `balance_after` 불일치가 새로운 검증 실패를 유발할 수 있음 → repair loop이 자동 재시도하므로 기존 안전망 활용
- `ModelLabel` 통합 시 import 경로 변경으로 다른 모듈에 영향 가능 → 전체 import 검색 후 일괄 수정

## 페어링 질문 (결정 필요)

- [x] **Q1**: `gains`의 단일 턴 상한(MAX_SINGLE_TURN_REWARD)을 얼마로 설정할 것인가?
  - Option A: **20 Signal** (일반 보상 5~10, 특별 보상 15~20)
  - ✅ Option B: **30 Signal** (큰 퀘스트 완료 시 넉넉한 보상 허용)
  - Option C: **상한 없음** (GM 재량, 프롬프트로만 제어)

- [x] **Q2**: `ModelLabel` enum 통합 SSOT 위치는?
  - Option A: **`models/turn.py`에 통합** (Pydantic 모델과 동일 파일, 직렬화 일관성)
  - ✅ Option B: **`config/models.py`에 통합** (설정/상수와 동일 파일, 모듈 분리)
  - Option C: **새 파일 `models/enums.py`** (enum 전용 모듈)

## 참고 자료

- `backend/src/unknown_world/validation/business_rules.py` L178-256 — 현재 경제 검증 로직
- `backend/src/unknown_world/models/turn.py` L579-601 — `EconomyOutput` 모델
- `backend/src/unknown_world/config/models.py` L21-40 — `ModelLabel(StrEnum)`
- `backend/src/unknown_world/models/turn.py` L84-93 — `ModelLabel(str, Enum)`
- `backend/prompts/turn/turn_output_instructions.en.md` L95-101 — 퀘스트 보상 규칙
- `vibe/prd.md` 5절 — 게임 재화 시스템
- `vibe/prd.md` 8.4절 — 구조화 출력 / 검증/복구
