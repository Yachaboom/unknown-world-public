# U-062[Mvp] MockOrchestrator 영어 입력 시 LanguageGate 수정

## 개요

- **목표**: MockOrchestrator에서 영어 입력 시 발생하는 언어 혼합 문제 해결
- **의존성**: U-055[Mvp]
- **우선순위**: MVP 언어 정합성 (RULE-006)

## 배경

MockOrchestrator로 생성된 TurnOutput의 내러티브가 한국어인데, 입력 텍스트가 영어이면 `[시도] {영어 텍스트}:` 형태로 혼합되어 LanguageGate에서 검증 실패.

## 현상

```python
turn_input = TurnInput(language=Language.KO, text="test exploration", ...)
output = MockOrchestrator(seed=123).generate_turn_output(turn_input)
# output.narrative = "[시도] test exploration: 발걸음 소리가..." (ko/en 혼합)
# validate_business_rules -> CONSISTENCY_FAIL
```

- 영어 입력 시 repair loop 3회 후 폴백 반환
- 이미지 생성 불가

## 작업 내용

### Option A (권장): 입력 텍스트 생략

- `_format_action_log_prefix()`에서 원본 입력 텍스트 대신 행동 유형만 표시
- 예: `[시도] test exploration:` → `[행동]:`

### Option B: 언어 감지 후 번역/변환

- 입력 텍스트의 언어를 감지하여 세션 언어와 불일치 시 번역 또는 생략

### Option C: LanguageGate 예외 처리

- 행동 로그 프리픽스 영역은 검증에서 제외 (비권장: 원칙 위반)

## 완료 기준 (DoD)

- [ ] 영어 입력 + 한국어 세션에서 LanguageGate 통과
- [ ] 한국어 입력 + 영어 세션에서 LanguageGate 통과
- [ ] repair loop 없이 정상 응답 반환
- [ ] 이미지 생성 정상 동작
- [ ] debt-log.md에서 해당 이슈 ✅ 표시

## 영향 범위

- `backend/src/unknown_world/orchestrator/mock.py`
