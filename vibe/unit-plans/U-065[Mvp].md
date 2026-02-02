# U-065[Mvp]: TurnOutput 스키마 단순화 (Gemini API 제한 대응)

## 메타데이터

| 항목      | 내용                        |
| --------- | --------------------------- |
| Unit ID   | U-065[Mvp]                  |
| Phase     | MVP                         |
| 예상 소요 | 90분                        |
| 의존성    | U-064[Mvp]                  |
| 우선순위  | ⚡ Critical (Real 모드 핵심) |

## 작업 목표

Gemini API의 구조화된 출력(Controlled Generation) 제한을 우회하기 위해 **TurnOutput 스키마를 단순화**하여, Real 모드에서 턴 생성이 정상 동작하도록 한다.

**배경**: Real 모드에서 턴 생성 시 Gemini API가 400 에러를 반환한다:

```
400 INVALID_ARGUMENT: The specified schema produces a constraint that has too many states for serving.
Typical causes: schemas with lots of text, long array length limits, complex value matchers
```

TurnOutput JSON Schema가 Gemini의 구조화된 출력 제한(속성 수, 중첩 깊이, enum 복잡도)을 초과하고 있다.

**완료 기준**:

- Real 모드에서 TurnOutput 생성 성공 (400 에러 해소)
- 스키마 변경 후에도 기존 기능 유지
- Pydantic + Zod 이중 검증 통과
- `debt-log.md`에서 해당 이슈 ✅ 표시

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/models/turn.py` - TurnOutput 스키마 단순화
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 스키마 적용 방식 수정
- `frontend/src/schemas/turn.ts` - Zod 스키마 동기화

**생성** (필요 시):

- `backend/src/unknown_world/models/turn_simple.py` - 단순화된 스키마 (Option 2 선택 시)

**참조**:

- `vibe/ref/structured-outputs-guide.md` - 구조화 출력 가이드
- Gemini API 구조화 출력 문서
- `vibe/debt-log.md` - 이슈 기록

## 구현 흐름

### 1단계: 현재 스키마 복잡도 분석

```python
# 분석 대상
# - TurnOutput 총 속성 수
# - 중첩 깊이 (nested objects/arrays)
# - enum 값 개수 및 길이
# - 배열 maxItems 제한
# - 문자열 maxLength 제한

def analyze_schema_complexity(schema: dict) -> dict:
    """스키마 복잡도 측정"""
    return {
        "total_properties": count_properties(schema),
        "max_depth": calculate_max_depth(schema),
        "enum_count": count_enums(schema),
        "array_limits": extract_array_limits(schema),
    }
```

### 2단계: 단순화 옵션 평가

#### Option 1: 필드 축소 (권장)

```python
# 선택적 필드를 스키마에서 제외하고 후처리로 이동
class TurnOutputSimple(BaseModel):
    """Gemini 구조화 출력용 단순 스키마"""
    narrative: str  # 필수
    actions: list[ActionOption]  # 필수, maxItems 축소 (10 → 5)
    
    # 아래 필드들은 스키마에서 제외, LLM이 narrative에 포함
    # - rule_mutations (후처리로 추출)
    # - world_changes (후처리로 추출)
    # - objects (후처리로 추출)
    
    economy: EconomyResultSimple  # 단순화
    image_job: ImageJobSimple | None  # 단순화
```

#### Option 2: 단계별 생성

```python
# 복잡한 출력을 여러 단계로 나누어 생성
async def generate_turn_multi_step(turn_input: TurnInput) -> TurnOutput:
    # Step 1: 핵심 출력 (narrative, actions)
    core_output = await generate_core(turn_input)
    
    # Step 2: 부가 출력 (objects, hotspots)
    detail_output = await generate_details(turn_input, core_output)
    
    # Step 3: 병합
    return merge_outputs(core_output, detail_output)
```

#### Option 3: 부분 구조화

```python
# 핵심 필드만 구조화, 나머지는 텍스트 블록으로 받아 파싱
class TurnOutputHybrid(BaseModel):
    narrative: str
    actions_json: str  # JSON 문자열로 받아 후처리
    economy: EconomyResult
    
# 후처리
actions = json.loads(output.actions_json)
```

### 3단계: Option 1 구현 (권장)

```python
# backend/src/unknown_world/models/turn.py

class ActionOption(BaseModel):
    """단순화된 액션 옵션"""
    id: str = Field(max_length=20)
    label: str = Field(max_length=50)
    cost: int = Field(ge=0, le=100)
    # risk, reward 필드 제거 또는 단순화

class TurnOutput(BaseModel):
    """단순화된 턴 출력"""
    narrative: str = Field(max_length=2000)  # 축소
    actions: list[ActionOption] = Field(max_length=5)  # 10 → 5
    
    # 선택적 필드는 Optional로 명시하되 스키마에서 단순화
    objects: list[ObjectInfo] | None = Field(default=None, max_length=5)
    hotspots: list[Hotspot] | None = Field(default=None, max_length=5)
    
    # economy는 필수지만 구조 단순화
    economy: EconomyResult
    
    # 이미지 관련 필드 단순화
    image_job: ImageJob | None = None
```

### 4단계: Zod 스키마 동기화

```typescript
// frontend/src/schemas/turn.ts

const ActionOptionSchema = z.object({
  id: z.string().max(20),
  label: z.string().max(50),
  cost: z.number().int().min(0).max(100),
});

const TurnOutputSchema = z.object({
  narrative: z.string().max(2000),
  actions: z.array(ActionOptionSchema).max(5),
  objects: z.array(ObjectInfoSchema).max(5).optional(),
  hotspots: z.array(HotspotSchema).max(5).optional(),
  economy: EconomyResultSchema,
  image_job: ImageJobSchema.optional(),
});
```

### 5단계: 마이그레이션 확인

```python
# 기존 SaveGame 호환성 확인
def test_savegame_compatibility():
    old_save = load_savegame("test_save_v1.json")
    # 새 스키마로 파싱 시도
    new_state = WorldState.model_validate(old_save.world_state)
    assert new_state  # 호환 확인
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-064[Mvp]](U-064[Mvp].md) - 이미지 생성 API 수정 (스키마 변경의 영향 범위)
- **참조**: `vibe/ref/structured-outputs-guide.md` - 구조화 출력 제약 가이드

**다음 작업에 전달할 것**:

- CP-MVP-03: Real 모드 데모에서 턴 생성 정상 동작 확인
- MMP 단계: 스키마 확장 시 Gemini 제한 고려 필요

## 주의사항

**기술적 고려사항**:

- (RULE-003) 구조화 출력 필수: 스키마 단순화해도 JSON Schema 검증은 유지
- (스키마 동기화) Pydantic + Zod 이중 검증: 백엔드 스키마 변경 시 프론트엔드도 동기화 필수
- (배열 제한) `max_length` / `maxItems` 축소 시 기존 기능에 영향 없는지 확인
- (문자열 제한) `max_length` 축소 시 narrative 잘림 방지

**잠재적 리스크**:

- 스키마 변경은 백엔드/프론트엔드 동시 수정 필요 → 한 번의 PR로 처리
- 기존 SaveGame 호환성 깨질 수 있음 → 마이그레이션 로직 또는 버전 관리
- 필드 축소로 기능 손실 가능 → 핵심 기능만 스키마에 유지, 나머지는 후처리

## 페어링 질문 (결정 필요)

- [x] **Q1**: 단순화 방식 선택?
  - Option A: 필드 축소 (권장: 단순, 한 번에 해결)
  - Option B: 단계별 생성 (복잡, 지연 증가)
  - Option C: 부분 구조화 (중간 복잡도)
  **A1**: Option A

- [x] **Q2**: 배열 크기 제한?
  - Option A: actions 5개, objects 5개, hotspots 5개 (보수적)
  - Option B: actions 3개, objects 3개, hotspots 3개 (더 단순)
  **A2**: Option A

- [x] **Q3**: 제거할 필드?
  - Option A: rule_mutations, world_changes → narrative에서 자연어로 표현
  - Option B: objects.description → label만 유지
  - Option C: action.reward/risk → 제거 또는 단순 정수로
  **A3**: Option A

## 리스크 및 완화

| 리스크 | 영향 | 완화 |
| ------ | ---- | ---- |
| SaveGame 호환성 | 기존 세이브 로드 실패 | 버전 필드 추가, 마이그레이션 로직 |
| 기능 손실 | 일부 정보 표시 불가 | 핵심 기능 우선, 나머지는 MMP에서 복원 |
| 프론트엔드 불일치 | 파싱 오류 | 동시 배포, Zod 스키마 동기화 |

## 참고 자료

- `vibe/ref/structured-outputs-guide.md` - 구조화 출력 가이드
- `backend/src/unknown_world/models/turn.py` - 현재 TurnOutput 스키마
- `frontend/src/schemas/turn.ts` - 프론트엔드 Zod 스키마
- https://ai.google.dev/gemini-api/docs/structured-output - Gemini 구조화 출력 제한
- `vibe/debt-log.md` - 관련 이슈 기록
