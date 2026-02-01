# U-062[Mvp]: MockOrchestrator 영어 입력 시 LanguageGate 수정

## 메타데이터

| 항목      | 내용                        |
| --------- | --------------------------- |
| Unit ID   | U-062[Mvp]                  |
| Phase     | MVP                         |
| 예상 소요 | 30분                        |
| 의존성    | U-055[Mvp]                  |
| 우선순위  | High (언어 정합성 RULE-006) |

## 작업 목표

MockOrchestrator에서 **영어 입력 시 발생하는 언어 혼합 문제를 해결**하여, LanguageGate 검증을 통과하고 정상적인 턴 응답이 반환되도록 한다.

**배경**: MockOrchestrator로 생성된 TurnOutput의 내러티브가 한국어인데, 사용자 입력 텍스트가 영어이면 `[시도] test exploration:` 형태로 혼합되어 LanguageGate에서 `CONSISTENCY_FAIL`이 발생한다. 이로 인해 repair loop 3회 후 폴백 반환되며, 이미지 생성도 불가해진다.

**완료 기준**:

- 영어 입력 + 한국어 세션에서 LanguageGate 통과
- 한국어 입력 + 영어 세션에서 LanguageGate 통과
- repair loop 없이 정상 응답 반환
- 이미지 생성 정상 동작
- `debt-log.md`에서 해당 이슈 ✅ 표시

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/orchestrator/mock.py` - 내러티브 생성 로직 수정

**참조**:

- `backend/src/unknown_world/validators/language_gate.py` - LanguageGate 검증 로직
- `backend/src/unknown_world/models/turn.py` - TurnInput/TurnOutput 스키마
- `vibe/debt-log.md` - 이슈 기록

## 구현 흐름

### 1단계: 문제 재현 및 분석

```python
# 현재 동작 재현
turn_input = TurnInput(language=Language.KO, text="test exploration", ...)
output = MockOrchestrator(seed=123).generate_turn_output(turn_input)
# output.narrative = "[시도] test exploration: 발걸음 소리가..." (ko/en 혼합)
# validate_business_rules -> CONSISTENCY_FAIL
```

- MockOrchestrator의 내러티브 생성 로직에서 사용자 입력 텍스트가 그대로 포함됨
- LanguageGate는 전체 텍스트의 언어 일관성을 검사

### 2단계: 수정 방안 선택 및 구현

**Option A (권장): 입력 텍스트 생략**

```python
def _generate_narrative(self, turn_input: TurnInput) -> str:
    # 기존: f"[시도] {turn_input.text}: {narrative_body}"
    # 수정: 사용자 입력 텍스트를 포함하지 않음
    action_prefix = "[행동]" if turn_input.language == Language.KO else "[Action]"
    return f"{action_prefix} {narrative_body}"
```

**Option B: 언어 감지 후 처리**

```python
def _generate_narrative(self, turn_input: TurnInput) -> str:
    # 입력 텍스트의 언어가 세션 언어와 다르면 생략
    if detect_language(turn_input.text) != turn_input.language:
        return narrative_body  # 입력 텍스트 없이 반환
    else:
        return f"[시도] {turn_input.text}: {narrative_body}"
```

**Option C: LanguageGate 예외 처리 (비권장)**

- 행동 로그 프리픽스 영역은 검증에서 제외
- 원칙 위반이므로 비권장

### 3단계: 테스트 및 검증

```python
# 테스트 케이스 추가
def test_mock_orchestrator_english_input_korean_session():
    turn_input = TurnInput(language=Language.KO, text="explore the cave", ...)
    output = MockOrchestrator(seed=123).generate_turn_output(turn_input)
    result = validate_language_gate(output, turn_input.language)
    assert result.status == "OK"

def test_mock_orchestrator_korean_input_english_session():
    turn_input = TurnInput(language=Language.EN, text="동굴을 탐험한다", ...)
    output = MockOrchestrator(seed=123).generate_turn_output(turn_input)
    result = validate_language_gate(output, turn_input.language)
    assert result.status == "OK"
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-055[Mvp]](U-055[Mvp].md) - 이미지 파이프라인 통합 후 발견된 이슈
- **참조**: `backend/src/unknown_world/validators/language_gate.py` - 검증 로직 이해

**다음 작업에 전달할 것**:

- U-063: 재화 버그 수정 시 Mock 모드 정상 동작 전제
- CP-MVP-03: 데모에서 영어 입력 시나리오 테스트 가능

## 주의사항

**기술적 고려사항**:

- (RULE-006) 언어 정합성: 내러티브 전체가 세션 언어로 일관되어야 함
- Mock 모드는 개발/테스트용이지만, Real 모드와 동일한 검증을 통과해야 함
- 사용자 입력 텍스트 생략 시 "무엇을 시도했는지" 정보 손실 → 내러티브 본문에서 맥락 제공

**잠재적 리스크**:

- 입력 텍스트 완전 생략 시 플레이어가 자신의 행동을 확인하기 어려울 수 있음 → 향후 별도 UI 요소(Action Log)로 보완 가능
- Real 모드에서도 동일 문제 발생 가능 → Game Master 프롬프트에서 "입력 텍스트를 내러티브에 포함하지 말 것" 지침 검토

## 페어링 질문 (결정 필요)

- [x] **Q1**: 입력 텍스트 처리 방식?
  - Option A: 입력 텍스트를 내러티브에서 완전히 생략 (권장: 단순, 언어 충돌 원천 차단)
  - Option B: 입력 텍스트를 세션 언어로 번역 후 포함 (복잡, 번역 품질 문제)
  - Option C: 입력 텍스트 언어 감지 후 불일치 시에만 생략 (중간 복잡도)
  **A1**: Option A

- [x] **Q2**: Real 모드에서도 동일 정책 적용?
  - Option A: Game Master 프롬프트에 "사용자 입력을 그대로 인용하지 말 것" 지침 추가
  - Option B: Real 모드는 LLM 재량에 맡김 (불일치 가능)
  **A2**: Option A

## 참고 자료

- `backend/src/unknown_world/orchestrator/mock.py` - MockOrchestrator 구현
- `backend/src/unknown_world/validators/language_gate.py` - LanguageGate 검증
- `.cursor/rules/30-prompts-i18n.mdc` - 프롬프트/i18n 규칙
- `vibe/debt-log.md` - 관련 이슈 기록
