# U-130[Mvp]: 429 Rate Limit 에러 시 프론트엔드 재시도 안내 UI

## 메타데이터

| 항목      | 내용                                                           |
| --------- | -------------------------------------------------------------- |
| Unit ID   | U-130[Mvp]                                                     |
| Phase     | MVP                                                            |
| 예상 소요 | 35분                                                           |
| 의존성    | U-087[Mvp]                                                     |
| 우선순위  | High (데모 중 429 발생 시 사용자 이탈 방지)                    |

## 작업 목표

백엔드에서 429 Rate Limit 에러로 **기본 모델과 폴백 모델 모두 실패**했을 때, 프론트엔드에 **"1~2분 후 재시도하세요"** 안내와 함께 재시도 버튼을 제공하여 사용자가 상황을 이해하고 대응할 수 있게 한다.

**배경**: 현재 `repair_loop.py`에서 429 에러 발생 시 지수 백오프(2s→4s→8s)로 최대 3회 재시도한 뒤, 최종 실패 시 안전 폴백(텍스트-only)을 반환한다. 그러나 폴백까지 실패하면 프론트엔드에는 일반적인 에러 메시지만 표시되어, 사용자는 "왜 안 되는지" 알 수 없고 데모 중 이탈할 수 있다. 429는 일시적 할당량 초과이므로, **잠시 기다린 후 재시도**하면 해결되는 경우가 대부분이다.

**완료 기준**:

- 백엔드에서 429 에러로 최종 실패 시, 에러 응답에 `code: "RATE_LIMITED"` (또는 유사 식별자)가 포함된다.
- 프론트엔드에서 `RATE_LIMITED` 에러를 감지하면:
  - CRT 테마의 **안내 패널**을 표시한다: "API 요청 한도에 도달했습니다. 1~2분 후 재시도해 주세요."
  - **카운트다운 타이머**(선택)와 **재시도 버튼**을 함께 제공한다.
  - 입력 잠금 상태를 유지하되, 재시도 버튼은 활성화한다.
- 재시도 버튼 클릭 시 마지막 턴 입력을 재전송한다.
- i18n 정책(RULE-006) 준수.

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/orchestrator/repair_loop.py` - 429 최종 실패 시 `error` 이벤트에 `code: "RATE_LIMITED"` 명시. 기존 `API_ERROR`와 구분.
- `frontend/src/api/turnStream.ts` - `RATE_LIMITED` 에러 코드 파싱 지원
- `frontend/src/stores/agentStore.ts` - `handleError`에서 `RATE_LIMITED` 에러를 별도 상태로 관리 (예: `isRateLimited: boolean`)
- `frontend/src/components/AgentConsole.tsx` - `ErrorDisplay` 컴포넌트에서 `RATE_LIMITED` 에러 시 전용 안내 UI 렌더링 (타이머 + 재시도 버튼)
- `frontend/src/App.tsx` - 재시도 핸들러: 마지막 TurnInput을 저장하고, 재시도 버튼 클릭 시 동일 입력으로 턴 재실행
- `frontend/src/style.css` - 재시도 안내 패널 스타일 (CRT 톤, 경고 색상, 타이머 애니메이션)
- `frontend/src/locales/ko-KR/translation.json` - `error.rate_limited`, `error.rate_limited_detail`, `error.retry_button`, `error.retry_countdown` 키 추가
- `frontend/src/locales/en-US/translation.json` - 동일 키 영문 추가

**참조**:

- `backend/src/unknown_world/orchestrator/repair_loop.py` - 기존 429 재시도 로직
- `frontend/src/turn/turnRunner.ts` - `onError` 콜백, 턴 실행 흐름
- `vibe/unit-results/U-087[Mvp].md` - 입력 잠금 SSOT

## 구현 흐름

### 1단계: 백엔드 — 429 에러 코드 명시

- `repair_loop.py`에서 429 에러로 모든 재시도가 소진되었을 때:
  - 기존의 안전 폴백 생성 대신, 에러 이벤트를 스트림에 전송:
    ```python
    {"type": "error", "message": "API 요청 한도 초과", "code": "RATE_LIMITED"}
    ```
  - `error_details`에 `retry_after_seconds` 힌트를 포함 (가능한 경우 API 응답의 Retry-After 헤더 활용)
- 폴백 모델까지 429로 실패한 경우에만 이 코드를 사용한다.

### 2단계: 프론트엔드 — 에러 코드 감지 및 상태 전환

- `turnStream.ts`에서 `error` 이벤트의 `code === "RATE_LIMITED"`를 감지한다.
- `agentStore.handleError()`에서 `isRateLimited: true` 상태를 설정한다.
- `turnRunner.ts`의 `onError` 콜백에서 마지막 `TurnInput`을 `lastFailedTurnInput`으로 저장한다.

### 3단계: 재시도 안내 UI (AgentConsole)

- `AgentConsole.tsx`의 `ErrorDisplay`에서 `isRateLimited`가 `true`일 때 전용 UI를 렌더링:
  - 경고 아이콘 + "API 요청 한도에 도달했습니다" 메시지
  - "1~2분 후 재시도해 주세요" 상세 안내
  - (선택) 60초 카운트다운 타이머 (시각적 대기 가이드)
  - **[재시도]** 버튼 — 클릭 시 `lastFailedTurnInput`으로 턴을 재실행
- 재시도 성공 시 `isRateLimited`를 `false`로 복구하고, 정상 흐름으로 돌아간다.
- 재시도도 실패하면 에러 상태를 유지하고, 다시 대기를 안내한다.

### 4단계: 입력 잠금과의 연계

- `RATE_LIMITED` 상태에서도 입력 잠금(`isInputLocked`)은 유지한다 — 재시도 버튼만 예외적으로 활성화.
- 재시도 버튼 클릭 시 입력 잠금이 정상적으로 재적용된다 (턴 처리 시작).

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-087[Mvp]](../unit-results/U-087[Mvp].md) - 입력 잠금 SSOT, 잠금 상태 시각화

**다음 작업에 전달할 것**:

- U-127: 모델 폴백 로직과 연계 (Pro→Flash 폴백 후에도 429라면 RATE_LIMITED 코드 사용)
- CP-MVP-03: 데모 루프에서 "429 에러 → 재시도 안내 → 재시도 성공" 시나리오 검증

## 주의사항

**기술적 고려사항**:

- (RULE-004) 429는 일시적 에러이므로, "안전 폴백(텍스트-only)"과는 구분해야 한다. 429에서는 폴백 대신 **재시도 안내**가 더 적절하다.
- (RULE-007) 에러 메시지에 모델 ID, API 키, 내부 에러 상세를 노출하지 않는다. 사용자 친화적 메시지만 표시한다.
- (RULE-006) 에러 메시지는 i18n 키 기반이며, 현재 세션 언어(ko/en)에 맞게 표시된다.

**잠재적 리스크**:

- 카운트다운 타이머가 실제 API 복구 시간과 일치하지 않을 수 있음 → 타이머는 "최소 대기 가이드"로 표현하고, 재시도 버튼은 타이머 완료 전에도 클릭 가능하게 한다.
- 재시도 반복으로 사용자가 지치면 이탈할 수 있음 → 2회 이상 연속 실패 시 "잠시 후 다시 시도해 주세요" 메시지로 강도를 높이고, 리셋 옵션을 안내한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 카운트다운 타이머를 표시할 것인가?
  - Option A: **60초 카운트다운 표시** (사용자에게 명확한 대기 지표 제공, 권장)
  - Option B: **타이머 없이 재시도 버튼만** (구현 간단, 사용자 판단에 맡김)

- [ ] **Q2**: 429로 폴백까지 실패 시 안전 폴백(텍스트-only)도 제공할 것인가?
  - Option A: **안전 폴백 없이 재시도 안내만** (깔끔, 429는 어차피 일시적)
  - Option B: **안전 폴백 + 재시도 안내 병행** (최소한의 응답은 제공)

## 참고 자료

- `backend/src/unknown_world/orchestrator/repair_loop.py` - 429 재시도 로직, 지수 백오프
- `frontend/src/components/AgentConsole.tsx` - ErrorDisplay 컴포넌트
- `frontend/src/stores/agentStore.ts` - 에러 상태 관리
- `frontend/src/turn/turnRunner.ts` - 턴 실행 흐름, onError 콜백
- `vibe/prd.md` 8.4 - 검증/복구, 에러 이벤트 프로토콜
