# U-069[Mvp]: 텍스트 생성 FAST 모델 기본 + "정밀조사" 트리거 Pro 모델 전환

## 메타데이터

| 항목      | 내용                                        |
| --------- | ------------------------------------------- |
| Unit ID   | U-069[Mvp]                                  |
| Phase     | MVP                                         |
| 예상 소요 | 60분                                        |
| 의존성    | U-080[Mvp]                                  |
| 우선순위  | High (비용 최적화 + 품질 선택권)            |
| **상태**  | **구현 완료** (2026-02-05)                  |

## 작업 목표

일반 텍스트 생성은 **FAST 모델(gemini-3-flash-preview)**로 처리하여 지연/비용을 최소화하고, **"정밀조사"** 등 특정 트리거(액션 카드/키워드)가 발생했을 때만 **Pro 모델(gemini-3-pro-preview)**을 사용하여 고품질 결과를 제공하는 모델 티어링 시스템을 구현한다.

**배경**: 현재는 모든 텍스트 생성에 동일한 모델을 사용하고 있어, 비용/지연 최적화와 품질 극대화를 동시에 달성하기 어렵다. 사용자가 "더 깊이 알고 싶을 때"만 Pro 모델을 사용하도록 하면 비용 효율과 체감 품질을 모두 개선할 수 있다.

**완료 기준**:

- 기본 텍스트 생성은 `gemini-3-flash-preview`(FAST)로 수행
- "정밀조사"(또는 지정된 트리거 액션)가 실행되면 `gemini-3-pro-preview`(QUALITY) 사용
- 현재 사용 중인 모델이 Agent Console/배지에 라벨(FAST/QUALITY)로 표시됨
- Economy HUD에 모델별 예상 비용 차이가 반영됨 (Signal 비용 차등)

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/config/models.py` - 텍스트 모델 티어링 설정 추가
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 트리거 기반 모델 선택 로직
- `backend/src/unknown_world/models/turn.py` - TurnInput/TurnOutput에 `model_hint` 또는 `action_type` 활용
- `frontend/src/components/ActionDeck.tsx` - "정밀조사" 카드에 QUALITY 라벨/비용 표시
- `frontend/src/components/AgentConsole.tsx` - 현재 사용 모델 라벨 표시

**참조**:

- `vibe/tech-stack.md` - 모델 라인업(텍스트: FAST/QUALITY)
- `vibe/prd.md` 8.3절 - Thinking 제어, 모델 선택 정책

## 구현 흐름

### 1단계: 트리거 정의 및 모델 선택 정책

- "정밀조사" 트리거 정의: 액션 ID, 키워드, 또는 별도 플래그
- 모델 선택 로직 설계

```python
# backend/src/unknown_world/config/models.py
class TextModelConfig:
    FAST = "gemini-3-flash-preview"
    QUALITY = "gemini-3-pro-preview"
    
    # 트리거 액션 ID 목록
    QUALITY_TRIGGERS = ["deep_investigate", "정밀조사", "analyze", "examine_closely"]
```

### 2단계: 오케스트레이터 모델 선택 로직 구현

- `TurnInput`의 액션 정보를 분석하여 모델 선택
- 선택된 모델 라벨을 응답에 포함

```python
# backend/src/unknown_world/orchestrator/generate_turn_output.py
def _select_text_model(self, turn_input: TurnInput) -> tuple[str, str]:
    """액션 기반 모델 선택. Returns (model_id, model_label)"""
    action_id = turn_input.action.id if turn_input.action else None
    action_text = turn_input.text.lower() if turn_input.text else ""
    
    # 트리거 검사
    is_quality_trigger = (
        action_id in TextModelConfig.QUALITY_TRIGGERS or
        any(kw in action_text for kw in ["정밀조사", "자세히", "깊이"])
    )
    
    if is_quality_trigger:
        return TextModelConfig.QUALITY, "QUALITY"
    return TextModelConfig.FAST, "FAST"
```

### 3단계: 응답에 모델 라벨 포함

- TurnOutput 또는 스트림 이벤트에 사용된 모델 라벨 포함
- Agent Console에서 현재 모델 표시

```python
# 스트림 이벤트
yield {"type": "meta", "model_label": "FAST"}  # 또는 "QUALITY"
```

### 4단계: 프론트엔드 UI 반영

- ActionDeck에서 "정밀조사" 카드에 QUALITY 라벨 및 추가 비용 표시
- Agent Console에 현재 모델 배지 표시(FAST: 빠른 모델, QUALITY: 고품질 모델)

```tsx
// frontend/src/components/ActionDeck.tsx
const isQualityAction = QUALITY_TRIGGERS.includes(action.id);
return (
  <ActionCard>
    {isQualityAction && <Badge>QUALITY</Badge>}
    <Cost>{isQualityAction ? action.cost * 2 : action.cost}</Cost>
  </ActionCard>
);
```

### 5단계: Economy 비용 차등 적용

- FAST vs QUALITY 모델의 Signal 비용 차등 정의
- 예상 비용에 모델 티어 반영

```python
class CostPolicy:
    FAST_MULTIPLIER = 1.0   # 기본 비용
    QUALITY_MULTIPLIER = 2.5  # Pro 모델 비용 배수
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-080[Mvp]](U-080[Mvp].md) - API 키 인증 전용(안정적 모델 접근 기반)
- **참조**: `vibe/tech-stack.md` - 텍스트 모델 라인업

**다음 작업에 전달할 것**:

- CP-MVP-03: 모델 티어링이 동작하는 데모 시나리오(비용 최적화 + 품질 선택)
- MMP: Autopilot에서 자동 모델 선택 정책 고도화

## 주의사항

**기술적 고려사항**:

- (RULE-010) tech-stack.md의 모델 ID 고정 원칙 준수
- (RULE-005) Economy 규칙: 비용 차등은 예상 비용으로 사전 노출, 잔액 음수 금지
- (RULE-008) 프롬프트 원문은 UI에 노출하지 않고, 모델 라벨(FAST/QUALITY)만 표시

**잠재적 리스크**:

- QUALITY 모델 응답 지연이 길 수 있음 → "정밀조사 중..." 로딩 연출로 체감 개선
- 트리거 오탐(의도치 않게 Pro 모델 사용)으로 비용 증가 가능 → 트리거 조건을 명확한 액션 ID로 제한

## 페어링 질문 (결정 필요)

- [x] **Q1**: Pro 모델 트리거 방식?
  - Option A: 특정 액션 ID만 (예: "deep_investigate", "정밀조사")
  - Option B: 액션 ID + 키워드 매칭 (예: "자세히", "깊이 분석")
  - Option C: 사용자가 명시적으로 "고품질 모드" 토글
  **A1**: Option B

- [x] **Q2**: QUALITY 모델 비용 배수?
  - Option A: 2x (기존 비용의 2배)
  - Option B: 2.5x (25% 추가)
  - Option C: 3x (충분한 차등으로 선택적 사용 유도)
  **A2**: Option A

- [x] **Q3**: "정밀조사" 액션 카드 제공 방식?
  - Option A: 매 턴 ActionDeck에 항상 포함 (비용이 높지만 선택 가능)
  - Option B: 특정 상황(단서 발견, 미스터리 등)에만 등장
  - Option C: 인벤토리 아이템("돋보기" 등)으로 활성화
  **A3**: Option B (단, 기준은 낮게 해서 자주 나오게) + Option C (해당 아이템도 추가)

## 참고 자료

- `vibe/tech-stack.md` - GenAI 모델 라인업
- `vibe/prd.md` 8.3절 - Thinking 제어, 모델 선택
- `vibe/prd.md` 5절 - 게임 재화(코스트) 시스템
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 현재 텍스트 생성 로직
