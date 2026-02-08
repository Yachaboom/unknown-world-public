# U-127[Mvp]: 멀티턴 대화 히스토리 맥락 유지 + 기본 텍스트 모델 gemini-3-pro-preview 전환

## 메타데이터

| 항목      | 내용                                                                      |
| --------- | ------------------------------------------------------------------------- |
| Unit ID   | U-127[Mvp]                                                                |
| Phase     | MVP                                                                       |
| 상태      | ✅ **완료** (2026-02-08)                                                  |
| 예상 소요 | 75분 (멀티턴 45분 + 모델 전환 15분 + Thought Signature 15분)              |
| 의존성    | U-069[Mvp], U-017[Mvp]                                                    |
| 우선순위  | ⚡ Critical (이야기 맥락 상실은 게임 체험의 핵심 결함)                     |
| 결과      | [완료 보고서](../unit-results/U-127[Mvp].md) · [런북](../unit-runbooks/U-127-multiturn-history-runbook.md) |

## 작업 목표

턴이 진행될 때마다 **이전 대화 히스토리(최근 N턴)를 Gemini API에 전달**하여 내러티브 맥락이 유지되게 하고, 기본 텍스트 모델을 `gemini-3-pro-preview`로 변경하여 추론 품질을 높인다. 실패 시 `gemini-3-flash-preview`로 자동 폴백한다.

**배경**: 현재 각 턴은 독립적으로 처리되어 `world_context` 문자열만 선택적으로 전달된다. 이로 인해 3~4턴 이후부터 GM이 이전 대화 내용을 잊어버려 "맥락 상실" 문제가 빈번하게 발생한다. Gemini 3의 멀티턴 API + Thought Signatures를 활용하면 대화 히스토리를 자연스럽게 유지할 수 있다. 또한 기본 모델을 Pro로 격상하면 추론 품질이 향상되어 맥락 유지력이 더욱 강화된다.

**완료 기준**:

- 최근 **N턴**(기본 5턴, 설정 가능)의 대화 히스토리(사용자 입력 + GM 응답 요약)가 Gemini API 호출 시 `contents` 배열에 멀티턴 형태로 포함된다.
- Gemini 3의 **Thought Signatures**가 턴 간에 올바르게 순환(circulation)되어 추론 맥락이 유지된다.
- 기본 텍스트 모델이 `gemini-3-pro-preview`로 변경되고, API 에러(429/5xx) 또는 타임아웃 시 `gemini-3-flash-preview`로 자동 폴백된다.
- 히스토리 토큰이 과도할 경우 오래된 턴부터 자동으로 잘려나가는 **슬라이딩 윈도우** 전략이 적용된다.
- 기존 `world_context` 주입은 유지하되, 멀티턴 히스토리와 중복되지 않게 정리한다.

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/config/models.py` - `MODEL_FAST`/`MODEL_QUALITY` 역할 교환: 기본 모델을 `gemini-3-pro-preview`로, 폴백을 `gemini-3-flash-preview`로 변경. `TextModelTiering` 로직 조정.
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - `_build_prompt()` → `_build_contents()` 변환: 단일 프롬프트 문자열 대신 멀티턴 `contents` 배열을 구성하는 로직 추가. Thought Signature 순환 구현.
- `backend/src/unknown_world/orchestrator/repair_loop.py` - 모델 폴백 로직 추가: Pro 모델 실패 시 Flash 모델로 재시도하는 분기.
- `backend/src/unknown_world/orchestrator/pipeline.py` - (있다면) PipelineContext에 히스토리 전달 경로 추가.

**생성**:

- `backend/src/unknown_world/orchestrator/conversation_history.py` - 대화 히스토리 관리 모듈: 턴별 히스토리 저장/조회/슬라이딩 윈도우/Thought Signature 캐싱.

**참조**:

- `vibe/ref/gemini-api-guide.md` - Gemini 3 Thought Signatures 순환 규칙, 멀티턴 API 사용법
- `vibe/tech-stack.md` - 모델 라인업 (gemini-3-pro-preview / gemini-3-flash-preview)
- `backend/src/unknown_world/config/models.py` - 기존 모델 티어링 로직

## 구현 흐름

### 1단계: 대화 히스토리 모듈 생성

- `conversation_history.py`에 `ConversationHistory` 클래스를 생성한다:
  - `add_turn(user_content: str, model_content: str, thought_signature: str | None)` - 턴 추가
  - `get_contents(max_turns: int = 5) -> list[dict]` - Gemini API `contents` 형태로 반환
  - `trim_to_token_budget(max_tokens: int)` - 슬라이딩 윈도우 (오래된 턴부터 제거)
- 세션(메모리) 기반으로 관리 (MVP: 서버 메모리, 세션 ID별 딕셔너리)

### 2단계: 프롬프트 빌더를 멀티턴 contents 빌더로 전환

- `generate_turn_output.py`의 `_build_prompt()`를 `_build_contents()`로 리팩터링:
  - 시스템 인스트럭션은 `system_instruction` 파라미터로 분리
  - 이전 턴들은 `contents` 배열에 `user`/`model` role로 교차 배치
  - 현재 턴 입력은 마지막 `user` 메시지로 추가
  - Thought Signature는 이전 `model` 응답의 마지막 파트에 포함
- `world_context`는 시스템 인스트럭션의 일부로 통합 (중복 방지)

### 3단계: 기본 모델을 gemini-3-pro-preview로 변경 + 폴백

- `config/models.py`에서:
  - `MODEL_DEFAULT = "gemini-3-pro-preview"` (기본)
  - `MODEL_FALLBACK = "gemini-3-flash-preview"` (폴백)
- `repair_loop.py`에서:
  - 첫 시도: Pro 모델
  - API 에러(429/5xx) 발생 시: Flash 모델로 전환하여 재시도
  - Flash도 실패 시: 기존 안전 폴백 (텍스트-only)
- 모델 전환 시 스트림 이벤트에 모델 라벨(`QUALITY`→`FAST`) 변경을 반영

### 4단계: Thought Signature 순환 구현

- Gemini 3의 응답에서 `thoughtSignature`를 추출하여 히스토리에 저장
- 다음 턴 요청 시 이전 model 응답의 `thoughtSignature`를 그대로 포함
- SDK 사용 시 자동 처리되는 부분을 확인하고, 수동 관리가 필요한 경우 명시적으로 순환

### 5단계: 검증 및 설정

- 히스토리 윈도우 크기를 환경변수로 설정 가능하게 함 (기본: `UW_HISTORY_MAX_TURNS=5`)
- 히스토리 토큰 예산 상한 설정 (기본: `UW_HISTORY_MAX_TOKENS=50000`)
- 데모 프로필 리셋 시 히스토리 초기화 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-069[Mvp]](../unit-results/U-069[Mvp].md) - 텍스트 모델 티어링 (FAST/QUALITY) 구현, `TextModelTiering` 클래스
- **결과물**: [U-017[Mvp]](../unit-results/U-017[Mvp].md) - 시스템 프롬프트 구성, 턴 지시사항 로더

**다음 작업에 전달할 것**:

- Autopilot (U-023/U-024): 멀티턴 히스토리를 Autopilot 모드에서도 활용
- U-130: 모델 폴백 실패 시 429 에러 안내 메커니즘과 연계
- CP-MVP-03: 데모 루프에서 "5턴 이상 진행해도 맥락이 유지되는지" 검증 항목 추가

## 주의사항

**기술적 고려사항**:

- (Gemini API Guide) Thought Signatures는 Text/Chat에서 strict validation이 아니지만, 포함하지 않으면 **추론 품질이 저하**된다. 반드시 순환시켜야 한다.
- (Gemini API Guide) Gemini 3 Pro는 `thinking_level` 기본값이 `high`이므로, TTFB가 길어질 수 있다. 필요 시 `low`로 조정하되 맥락 유지 품질과 트레이드오프를 확인한다.
- (RULE-005) 히스토리 토큰이 늘어나면 비용도 증가한다. Economy 시스템에 히스토리 비용을 반영할지 검토 (MVP에서는 미반영 권장).
- (RULE-007) 히스토리에 프롬프트 원문이 포함되면 안 된다 — `model` 역할의 응답은 내러티브/구조화 출력만 포함한다.

**잠재적 리스크**:

- 히스토리 길이가 길어지면 토큰 사용량이 급증하여 429 에러 빈도가 높아질 수 있음 → 슬라이딩 윈도우 + 토큰 예산 상한으로 완화
- Pro 모델의 TTFB가 Flash보다 느려 데모 체감이 악화될 수 있음 → `thinking_level: "low"` 옵션으로 조절, 필요 시 MMP에서 동적 선택

## 페어링 질문 (결정 필요)

- [x] **Q1**: 히스토리에 포함할 내용의 범위는?
  - Option A: 전체 TurnInput/TurnOutput (정확하지만 토큰 소비 큼)
  - Option B: 사용자 텍스트 + GM 내러티브 요약만 (토큰 절약, 일부 맥락 손실 가능)
  - ✅ Option C: 사용자 텍스트 + GM 내러티브 + 핵심 상태 변화(delta) (균형)

- [x] **Q2**: gemini-3-pro-preview의 `thinking_level` 기본값은?
  - ✅ Option A: `high` (기본값 유지, 최고 추론 품질, TTFB 증가)
  - Option B: `low` (저지연, 데모 체감 우선, 추론 깊이 감소)

## 참고 자료

- `vibe/ref/gemini-api-guide.md` - Gemini 3 Thought Signatures, 멀티턴 API
- `vibe/tech-stack.md` - 모델 라인업 (Pro/Flash)
- `backend/src/unknown_world/config/models.py` - 기존 모델 설정
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 프롬프트 빌더
- [Gemini API Text Generation](https://ai.google.dev/gemini-api/docs/text-generation) - 멀티턴 대화
