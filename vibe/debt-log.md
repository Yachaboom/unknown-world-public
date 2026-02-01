# Unknown World 부채 로그 (Debt Log)

이 문서는 발견되었으나 당장 해결하지 못한 기술 부채, 버그, 개선 사항을 기록합니다.
유닛 작업 중 발견된 이슈가 범위 밖일 경우 여기에 기록하고 다음 단계로 넘깁니다.

---

## 2026-01-26 이슈: ko/en 혼합 출력(내러티브/룰/퀘스트/UI) 발생

- **발견 위치**: `vibe/ref/en-ko-issue.png` (Quest/Rule Board/로그/시스템 메시지 등 한 화면 혼합)
- **현상**: 한 화면에 한국어/영어가 동시에 노출되어 RULE-006/007(혼합 출력 금지) 및 Hard Gate `Consistency OK` 기대를 위반할 수 있음.
- **추정 원인**:
  - TurnInput.language(클라)와 SaveGame.language(세션) 또는 i18n 상태가 드리프트하여, 서버 출력 언어와 기존 월드 상태 텍스트가 섞임
  - 언어 전환 시 기존 월드/로그/퀘스트/룰 텍스트를 즉시 번역하지 않아 "과거 언어 잔재"가 남음
  - 클라이언트 폴백/에러 문자열(예: malformed error event)이 일부 영문 하드코딩으로 남음
  - 모델이 내러티브/라벨을 혼합 언어로 생성(콘텐츠 레벨 검증 부재)
- **보류 사유**: 현재 진행 유닛 범위 밖(문서/로드맵 반영 후 별도 유닛으로 처리).

- **해결 계획**:
  - [U-043[Mvp]](unit-plans/U-043[Mvp].md): 서버 Hard Gate에 "언어(콘텐츠) 혼합" 검증 + Repair loop 추가
  - [U-044[Mvp]](unit-plans/U-044[Mvp].md): 세션 언어 SSOT(언어 전환=리셋) + 클라이언트 폴백/시스템 메시지 혼합 제거

## 2026-01-28 이슈: test_turn_streaming_success - badges 이벤트 수 불일치

- **발견 위치**: `backend/tests/integration/test_turn_streaming.py:50`
- **현상**: `assert len(badges_events) >= 2` 실패 - 2개 이상의 badges 이벤트가 기대되나 1개만 수신됨
- **추정 원인**: 스트리밍 파이프라인에서 badges 이벤트 발행 로직이 변경되었거나, 테스트 기대치가 현재 구현과 불일치
- **보류 사유**: U-046[Mvp] 범위 밖 (prompt_loader XML 태그 규격과 무관한 스트리밍 로직)

## 2026-01-28 이슈: test_genai_client Mock 검증 불일치 (2개)

- **발견 위치**: `backend/tests/unit/services/test_genai_client.py:122`, `:203`
- **현상**: `test_genai_client_generate_real_call`, `test_genai_client_full_config` 실패 - Mock 호출 검증에서 `config` 파라미터 형태 불일치
- **에러**: `Expected: config={'max_output_tokens': 100}` vs `Actual: config=GenerateContentConfig(...)`
- **추정 원인**: `genai_client.py`가 dict 대신 `GenerateContentConfig` 객체를 사용하도록 변경되었으나, 테스트 기대값이 업데이트되지 않음
- **보류 사유**: CP-MVP-05 범위 밖 (GenAI 클라이언트 자체 테스트이며, 멀티모달 이미지 게이트 검증과 무관)
- **권장 조치**: 테스트에서 `config=ANY` 또는 `GenerateContentConfig` 인스턴스로 검증하도록 수정

## 2026-01-28 이슈: App.test.tsx 핫스팟 검색 실패

- **발견 위치**: `frontend/src/App.test.tsx:72`
- **현상**: `Unable to find a label with the text of: 터미널` - 초기 화면이 `profile_select`이므로 게임 핫스팟이 존재하지 않음
- **추정 원인**: 테스트가 프로필 선택 완료 후의 `playing` 상태를 가정하지만, 실제로는 `profile_select` 상태에서 검색 시도
- **보류 사유**: CP-MVP-05 범위 밖 (U-015 SaveGame + Demo Profiles 관련 기존 테스트)
- **권장 조치**: 테스트에서 프로필 선택 액션을 먼저 수행하거나, playing 상태를 mocking

## 2026-01-28 이슈: DndInteraction.test.tsx onDragEnd undefined (2개)

- **발견 위치**: `frontend/src/components/DndInteraction.test.tsx:97`, `:148`
- **현상**: `TypeError: Cannot read properties of undefined (reading 'onDragEnd')`
- **추정 원인**: DndContext mock에서 `props`를 `global.dndCallbacks`에 저장하는 로직이 실행되지 않거나, App.tsx 렌더링 순서/조건에 따라 DndContext가 마운트되지 않음
- **보류 사유**: CP-MVP-05 범위 밖 (DnD 인터랙션 관련 기존 테스트)
- **권장 조치**: Mock 설정 재검토 또는 DndContext 마운트 조건(playing 상태) 확인 필요

## 2026-01-28 이슈: backend/tests Pyright 엄격 모드 타입 에러 (326개)

- **발견 위치**: `backend/tests` 전체
- **현상**: `pyright` 실행 시 테스트 코드에서 326개의 타입 에러 발생. (주로 `reportUnknownVariableType`, `reportMissingParameterType` 등)
- **추정 원인**: `pyproject.toml`에서 `typeCheckingMode = "strict"`가 설정되어 있으나, 테스트 코드는 동적 특성(pytest fixtures, mocking 등)으로 인해 명시적 타입 어노테이션이 누락됨.
- **보류 사유**: `src` 디렉토리(프로덕션 코드)는 0 에러로 타입 안정성이 확보되어 있으며, 테스트 코드의 타입 정리는 작업량이 많아 별도 품질 개선 작업으로 분리 필요.
- **권장 조치**: 테스트 코드의 주요 함수 및 fixture에 타입 어노테이션을 순차적으로 추가하거나, 테스트 디렉토리에 대해서만 `typeCheckingMode`를 완화하는 설정 검토.

## 2026-01-24 이슈: 에셋 요청 스키마 검증 실패 (U-034 관련) ✅ 해결됨

- **발견 위치**: backend/tests/unit/test_u034_verification.py
- **현상**: test_schema_required_properties 테스트에서 'rembg_model' 필드가 스키마에 없다는 AssertionError 발생.
- **추정 원인**: vibe/ref/nanobanana-asset-request.schema.json 파일에 'rembg_model' 필드가 정의되지 않았거나 이름이 다름.
- **보류 사유**: 이번 유닛(U-016[Mvp]) 범위 밖이며, GenAI 클라이언트 구현과는 무관한 에셋 제작용 스키마 이슈임.

- **해결 완료**: [U-040[Mvp]](unit-plans/U-040[Mvp].md) (2026-01-28)
  - **SSOT 확정**: `rembg_options.model`을 rembg 모델 선택의 단일 기준 필드로 확정
  - **수정 파일**:
    - `backend/tests/unit/test_u034_verification.py`: `required_fields`에서 `rembg_model` 제거, `rembg_options` 구조 검증 추가
    - `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md`: 스키마 주요 필드 표 및 확인 포인트 갱신
  - **재발 방지**: JSON Schema required와 "워크플로우 필수" 개념을 테스트 코드에 명확히 구분/문서화함

## 2026-02-01 이슈: MockOrchestrator 영어 입력 시 LanguageGate 검증 실패 (U-055 발견)

- **발견 위치**: `backend/src/unknown_world/validation/language_gate.py`, `backend/src/unknown_world/orchestrator/mock.py`
- **현상**: MockOrchestrator로 생성된 TurnOutput의 내러티브가 한국어인데, 입력 텍스트가 영어이면 내러티브에 `[시도] {영어 텍스트}:` 형태로 혼합되어 LanguageGate에서 언어 혼합으로 검증 실패
- **재현 방법**:
  ```python
  turn_input = TurnInput(language=Language.KO, text="test exploration", ...)
  output = MockOrchestrator(seed=123).generate_turn_output(turn_input)
  # output.narrative = "[시도] test exploration: 발걸음 소리가..." (ko/en 혼합)
  # validate_business_rules -> CONSISTENCY_FAIL
  ```
- **영향**: 영어 입력 시 repair loop 3회 후 폴백 반환, 이미지 생성 불가
- **추정 원인**: `_format_action_log_prefix()`가 입력 텍스트를 그대로 내러티브에 포함시키는데, 입력 언어와 출력 언어 불일치 시 혼합 발생
- **보류 사유**: U-055[Mvp] 범위 밖 (이미지 파이프라인 통합 검증). 한국어 입력으로 우회 가능
- **권장 조치**:
  - Option A: `_format_action_log_prefix()`에서 입력 텍스트를 번역하거나 생략
  - Option B: LanguageGate에서 행동 로그 프리픽스 영역은 검증 제외

## 2026-02-01 이슈: 프론트엔드 턴 실행 후 재화 잔액 0으로 초기화 (U-055 발견)

- **발견 위치**: `frontend/src/App.tsx` 또는 상태 관리 로직
- **현상**: 프론트엔드에서 턴 실행 후 Signal/Shard가 0으로 표시되고 "잔액이 부족합니다" 경고 발생
- **재현 방법**:
  1. 프로필 선택 후 게임 시작 (Signal: 150, Shard: 5)
  2. 텍스트 입력 후 "실행" 클릭
  3. 턴 완료 후 Signal: 0, Shard: 0으로 변경됨
- **추정 원인**:
  - 백엔드 응답의 `economy.balance_after`가 프론트엔드 상태에 제대로 반영되지 않음
  - 또는 폴백 응답에서 `balance_after`가 기본값(100, 5)이 아닌 초기값으로 설정됨
  - 프론트엔드에서 응답 파싱 시 재화 상태 업데이트 로직 오류
- **보류 사유**: U-055[Mvp] 범위 밖 (이미지 파이프라인 백엔드 검증이 주목적)
- **권장 조치**:
  - 프론트엔드에서 `/api/turn` 응답의 `economy.balance_after` 처리 로직 디버깅
  - 백엔드 폴백 응답의 `economy_snapshot` 처리 확인

## 2026-02-01 이슈: Gemini 이미지 생성 API 호출 방식 오류 (U-055 Real 모드 테스트 발견)

- **발견 위치**: `backend/src/unknown_world/services/image_generation.py:447`
- **현상**: Real 모드에서 이미지 생성 시 `ClientError` 발생, 11초 후 실패
- **에러 메시지**: `이미지 생성 중 오류가 발생했습니다: ClientError`
- **원인**: 현재 코드가 `generate_images()` 메서드를 사용하고 있으나, `gemini-3-pro-image-preview` 모델은 **`generate_content()`** 메서드를 사용해야 함
- **올바른 API 호출**:
  ```python
  from google.genai.types import GenerateContentConfig, Modality

  response = await client.aio.models.generate_content(
      model="gemini-3-pro-image-preview",
      contents="이미지 프롬프트",
      config=GenerateContentConfig(
          response_modalities=[Modality.TEXT, Modality.IMAGE],
      ),
  )
  # 응답에서 이미지 추출: response.candidates[0].content.parts[].inline_data.data
  ```
- **보류 사유**: U-055[Mvp] 런북 검증 범위 밖 (Mock 모드 검증이 주목적)
- **권장 조치**:
  - `ImageGenerator.generate()` 메서드를 `generate_content()` 호출로 수정
  - `response_modalities=[Modality.TEXT, Modality.IMAGE]` 설정 추가
  - 응답 파싱 로직 수정 (`part.inline_data.data`에서 이미지 바이트 추출)
- **참고 문서**: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation

## 2026-02-01 이슈: TurnOutput 스키마 복잡도로 Gemini API 거부 (U-055 Real 모드 테스트 발견)

- **발견 위치**: `backend/src/unknown_world/orchestrator/generate_turn_output.py:251`
- **현상**: Real 모드에서 턴 생성 시 Gemini API가 400 에러 반환
- **에러 메시지**:
  ```
  400 INVALID_ARGUMENT: The specified schema produces a constraint that has too many states for serving.
  Typical causes: schemas with lots of text, long array length limits, complex value matchers
  ```
- **원인**: TurnOutput JSON Schema가 Gemini의 구조화된 출력(Controlled Generation) 제한을 초과
- **영향**: Real Orchestrator 사용 불가, 항상 폴백 응답 반환
- **추정 원인**:
  - 스키마의 속성 수가 너무 많음
  - 중첩된 배열/객체 구조
  - enum 값이 너무 길거나 많음
- **보류 사유**: U-055[Mvp] 런북 검증 범위 밖
- **권장 조치**:
  - TurnOutput 스키마 단순화 검토
  - 불필요한 필드 제거 또는 선택적 필드로 변경
  - 스키마를 분리하여 단계별로 생성하는 방식 검토
  - Gemini API의 스키마 제한 문서 확인
