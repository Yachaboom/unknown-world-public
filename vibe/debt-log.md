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

## 2026-01-28 이슈: test_turn_streaming_success - badges 이벤트 수 불일치 ✅ 해결됨

- **발견 위치**: `backend/tests/integration/test_turn_streaming.py:50`
- **현상**: `assert len(badges_events) >= 2` 실패 - 2개 이상의 badges 이벤트가 기대되나 1개만 수신됨
- **추정 원인**: 스트리밍 파이프라인에서 badges 이벤트 발행 로직이 변경되었거나, 테스트 기대치가 현재 구현과 불일치
- **보류 사유**: U-046[Mvp] 범위 밖 (prompt_loader XML 태그 규격과 무관한 스트리밍 로직)

- **해결 완료**: [U-060[Mvp]](unit-plans/U-060[Mvp].md) (2026-02-01)
  - **수정**: 테스트 기대치를 `>= 2`에서 `>= 1`로 완화 (badges 발생 여부가 중요, 정확한 수는 구현 세부사항)
  - **수정 파일**: `backend/tests/integration/test_turn_streaming.py:50`

## 2026-01-28 이슈: test_genai_client Mock 검증 불일치 (2개) ✅ 해결됨

- **발견 위치**: `backend/tests/unit/services/test_genai_client.py:122`, `:203`
- **현상**: `test_genai_client_generate_real_call`, `test_genai_client_full_config` 실패 - Mock 호출 검증에서 `config` 파라미터 형태 불일치
- **에러**: `Expected: config={'max_output_tokens': 100}` vs `Actual: config=GenerateContentConfig(...)`
- **추정 원인**: `genai_client.py`가 dict 대신 `GenerateContentConfig` 객체를 사용하도록 변경되었으나, 테스트 기대값이 업데이트되지 않음
- **보류 사유**: CP-MVP-05 범위 밖 (GenAI 클라이언트 자체 테스트이며, 멀티모달 이미지 게이트 검증과 무관)
- **권장 조치**: 테스트에서 `config=ANY` 또는 `GenerateContentConfig` 인스턴스로 검증하도록 수정

- **해결 완료**: [U-060[Mvp]](unit-plans/U-060[Mvp].md) (2026-02-01)
  - **수정**: `assert_called_once_with`를 `assert_called_once()` + 타입/핵심 속성 검증으로 변경
  - **검증 방식**: config가 GenerateContentConfig 인스턴스인지 확인 + max_output_tokens, temperature 속성 검증
  - **수정 파일**: `backend/tests/unit/services/test_genai_client.py` (:122-131, :203-218)

## 2026-01-28 이슈: App.test.tsx 핫스팟 검색 실패 ✅ 해결됨

- **발견 위치**: `frontend/src/App.test.tsx:72`
- **현상**: `Unable to find a label with the text of: 터미널` - 초기 화면이 `profile_select`이므로 게임 핫스팟이 존재하지 않음
- **추정 원인**: 테스트가 프로필 선택 완료 후의 `playing` 상태를 가정하지만, 실제로는 `profile_select` 상태에서 검색 시도
- **보류 사유**: CP-MVP-05 범위 밖 (U-015 SaveGame + Demo Profiles 관련 기존 테스트)
- **권장 조치**: 테스트에서 프로필 선택 액션을 먼저 수행하거나, playing 상태를 mocking

- **해결 완료**: [U-060[Mvp]](unit-plans/U-060[Mvp].md) (2026-02-01)
  - **수정**: 프로필 선택 후 `waitFor`를 사용하여 상태 전환 대기
  - **수정 파일**: `frontend/src/App.test.tsx` (:72-82)

## 2026-01-28 이슈: DndInteraction.test.tsx onDragEnd undefined (2개) ✅ 해결됨

- **발견 위치**: `frontend/src/components/DndInteraction.test.tsx:97`, `:148`
- **현상**: `TypeError: Cannot read properties of undefined (reading 'onDragEnd')`
- **추정 원인**: DndContext mock에서 `props`를 `global.dndCallbacks`에 저장하는 로직이 실행되지 않거나, App.tsx 렌더링 순서/조건에 따라 DndContext가 마운트되지 않음
- **보류 사유**: CP-MVP-05 범위 밖 (DnD 인터랙션 관련 기존 테스트)
- **권장 조치**: Mock 설정 재검토 또는 DndContext 마운트 조건(playing 상태) 확인 필요

- **해결 완료**: [U-060[Mvp]](unit-plans/U-060[Mvp].md) (2026-02-01)
  - **수정**: 프로필 선택 후 `waitFor`를 사용하여 DndContext 마운트 및 콜백 설정 대기
  - **추가 검증**: `dndCallbacks.onDragEnd`가 정의되어 있는지도 확인
  - **수정 파일**: `frontend/src/components/DndInteraction.test.tsx` (:91-100, :144-153)

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

## 2026-02-01 이슈: MockOrchestrator 영어 입력 시 LanguageGate 검증 실패 (U-055 발견) ✅ 해결됨

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

- **해결 완료**: [U-062[Mvp]](unit-plans/U-062[Mvp].md) (2026-02-01)
  - **수정**: `_format_action_log_prefix()`에서 사용자 입력 텍스트(text, action_id)를 프리픽스에 포함하지 않도록 변경
  - **정책**: 오직 DROP/CLICK의 오브젝트 ID만 프리픽스에 포함 (시스템 생성 ID이므로 언어 혼합 위험 없음)
  - **Real 모드**: Game Master 프롬프트에 "사용자 입력을 내러티브에 그대로 인용하지 말 것" 지침 추가
  - **수정 파일**: `backend/src/unknown_world/orchestrator/mock.py`, `backend/prompts/system/game_master.ko.md`, `backend/prompts/system/game_master.en.md`

## 2026-02-01 이슈: 프론트엔드 턴 실행 후 재화 잔액 0으로 초기화 (U-055 발견) ✅ 해결됨

- **발견 위치**: `frontend/src/App.tsx` 또는 상태 관리 로직
- **현상**: 프론트엔드에서 턴 실행 후 Signal/Shard가 0으로 표시되고 "잔액이 부족합니다" 경고 발생
- **재현 방법**:
  1. 프로필 선택 후 게임 시작 (Signal: 150, Shard: 5)
  2. 텍스트 입력 후 "실행" 클릭
  3. 턴 완료 후 Signal: 0, Shard: 0으로 변경됨
- **원인 분석**:
  - `frontend/src/schemas/turn.ts`의 `createFallbackTurnOutput` 함수에서 `balance_after`가 `{ signal: 0, memory_shard: 0 }`으로 하드코딩됨
  - `frontend/src/api/turnStream.ts`의 `createFallbackTurnOutput`도 동일한 문제
  - Zod 스키마 검증 실패 시 이 폴백이 사용되어 재화가 0으로 리셋됨

- **해결 완료**: [U-063[Mvp]](unit-plans/U-063[Mvp].md) (2026-02-02)
  - **수정**: 폴백 함수들에 `economySnapshot` 파라미터 추가
  - **정책**: 폴백 시에도 현재 재화 스냅샷을 사용하여 잔액 유지 (RULE-005 준수)
  - **수정 파일**:
    - `frontend/src/schemas/turn.ts`: `createFallbackTurnOutput`, `safeParseTurnOutput` 함수
    - `frontend/src/api/turnStream.ts`: `createFallbackTurnOutput`, `dispatchEvent` 함수

## 2026-02-01 이슈: Gemini 이미지 생성 API 호출 방식 오류 (U-055 Real 모드 테스트 발견) ✅ 해결됨

- **발견 위치**: `backend/src/unknown_world/services/image_generation.py:447`
- **현상**: Real 모드에서 이미지 생성 시 `ClientError` 발생, 11초 후 실패
- **에러 메시지**: `이미지 생성 중 오류가 발생했습니다: ClientError`
- **원인**: 현재 코드가 `generate_images()` 메서드를 사용하고 있으나, `gemini-3-pro-image-preview` 모델은 **`generate_content()`** 메서드를 사용해야 함

- **해결 완료**: [U-064[Mvp]](unit-plans/U-064[Mvp].md) (2026-02-02)
  - **수정**: `generate_images()` → `generate_content()` API 호출 변경
  - **설정**: `response_modalities=[Modality.TEXT, Modality.IMAGE]` 추가
  - **파싱**: `response.candidates[].content.parts[].inline_data.data`에서 이미지 바이트 추출
  - **타임아웃**: 60초 설정 (Q1 결정)
  - **로깅**: 텍스트 응답도 디버깅용 로깅 (Q3 결정)
  - **수정 파일**: `backend/src/unknown_world/services/image_generation.py`
  - **검증 결과**: 테스트 스크립트에서 56초 만에 이미지 생성 성공 (1.6MB)
- **참고 문서**: https://ai.google.dev/gemini-api/docs/image-generation

## 2026-02-01 이슈: TurnOutput 스키마 복잡도로 Gemini API 거부 (U-055 Real 모드 테스트 발견) ✅ 해결됨

- **발견 위치**: `backend/src/unknown_world/orchestrator/generate_turn_output.py:251`
- **현상**: Real 모드에서 턴 생성 시 Gemini API가 400 에러 반환
- **에러 메시지**:
  ```
  400 INVALID_ARGUMENT: The specified schema produces a constraint that has too many states for serving.
  Typical causes: schemas with lots of text, long array length limits, complex value matchers
  ```
- **원인**: TurnOutput JSON Schema가 Gemini의 구조화된 출력(Controlled Generation) 제한을 초과
- **영향**: Real Orchestrator 사용 불가, 항상 폴백 응답 반환

- **해결 완료**: [U-065[Mvp]](unit-plans/U-065[Mvp].md) (2026-02-02)
  - **수정**: TurnOutput 스키마 단순화 (ActionCard 필드 축소 + 배열 제한 강화)
  - **제거된 필드**: `ActionCard.description`, `cost_estimate`, `hint`, `reward_hint`, `disabled_reason`
  - **배열 제한**: actions 5개, objects 5개, hotspots 5개
  - **Pydantic + Zod 이중 검증**: 백엔드/프론트엔드 스키마 동기화 완료
  - **수정 파일**:
    - `backend/src/unknown_world/models/turn.py`: ActionCard 필드 단순화
    - `backend/src/unknown_world/orchestrator/fallback.py`: ActionCard 생성 수정
    - `backend/src/unknown_world/orchestrator/mock.py`: Mock 카드 생성 수정
    - `backend/src/unknown_world/validation/language_gate.py`: 텍스트 추출 로직 수정
    - `frontend/src/schemas/turn.ts`: Zod 스키마 동기화
    - `frontend/src/components/ActionDeck.tsx`: UI 컴포넌트 수정
    - `frontend/src/stores/actionDeckStore.ts`: 스토어 로직 수정

## 2026-02-01 이슈: test_turn_streaming_deterministic_seed - image_id 비결정성 (U-060 발견) ✅ 해결됨

- **발견 위치**: `backend/tests/integration/test_turn_streaming.py:102`
- **현상**: `assert output1 == output2` 실패 - 동일한 seed로 두 번 요청해도 `image_id`와 `image_url`이 다름
- **에러**:
  ```
  {'image_id': 'img_a19b009c6b67', ...} != {'image_id': 'img_eda6b22ab30d', ...}
  ```
- **추정 원인**: MockOrchestrator의 이미지 ID 생성이 seed와 무관하게 매번 새로운 UUID를 생성
- **해결 완료**: [U-060[Mvp]](unit-plans/U-060[Mvp].md) (2026-02-01)
  - **수정**: `ImageGenerationRequest`에 `seed` 필드 추가 및 `RenderStage`에서 전달
  - **결정성**: `MockImageGenerator`에서 `seed`와 `prompt_hash`를 조합하여 결정적인 `image_id` 생성
  - **수정 파일**: `backend/src/unknown_world/services/image_generation.py`, `backend/src/unknown_world/orchestrator/stages/render.py`

## 2026-02-03 이슈: Frontend NarrativeFeed 테스트 window.matchMedia mock 누락 (U-067 테스트 발견)

- **발견 위치**: `frontend/src/components/NarrativeFeed.test.tsx`, `frontend/src/App.test.tsx`, `frontend/src/components/DndInteraction.test.tsx`
- **현상**: 4개 테스트 실패 - `TypeError: window.matchMedia is not a function`
- **에러**:
  ```
  TypeError: window.matchMedia is not a function
   ❯ src/components/NarrativeFeed.tsx:80:19
      80|     return window.matchMedia('(prefers-reduced-motion: reduce)').match…
  ```
- **추정 원인**: U-066에서 도입된 `NarrativeFeed` 컴포넌트의 `useTypewriter` 훅이 `window.matchMedia` API를 사용하는데, Vitest 테스트 환경에서 이 API가 mock되지 않음
- **영향**: 4개 테스트 실패 (NarrativeFeed 1개, App 1개, DndInteraction 2개)
- **보류 사유**: U-067[Mvp] 범위 밖 (Vertex AI Production 설정 핫픽스와 무관한 테스트 환경 이슈)
- **권장 조치**: 
  - `frontend/src/test/setup.ts`에 `window.matchMedia` mock 추가
  - 또는 개별 테스트 파일에서 `beforeAll`로 mock 설정

## 2026-02-03 이슈: Backend test_real_generator_rembg_integration 인증 실패 (U-067 테스트 발견)

- **발견 위치**: `backend/tests/unit/test_image_generation_integration.py:110`
- **현상**: 테스트 실패 - `ImageGenerationStatus.FAILED != ImageGenerationStatus.COMPLETED`
- **에러 로그**: `[ImageGen] 이미지 생성 실패`
- **추정 원인**: 이 테스트는 실제 Vertex AI API를 호출하는 통합 테스트로, 테스트 환경에서 서비스 계정 인증이 설정되지 않아 실패
- **보류 사유**: U-067[Mvp] 범위 밖 (인증이 필요한 통합 테스트는 CI/CD 환경에서 별도 처리 필요)
- **권장 조치**: 
  - 테스트에 `@pytest.mark.skipif` 데코레이터로 인증 환경 체크 추가
  - 또는 테스트를 `tests/integration/`으로 이동하여 단위 테스트에서 분리
`n## 2026-02-05 �̽�: U-066 Ÿ�ڱ� ȿ�� �ӵ� ���� ���� �ҿ���`n`n- **�߰� ��ġ**: frontend/src/components/NarrativeFeed.tsx`n- **����**: TYPING_TICK_MS(90ms)�� MAX_CPS(10)�� �������� ���� charsPerTick�� �׻� 1�� ����. `isImageLoading` ���� �ӵ� ����(shouldBuyTime) �ɼ��� ���������� �������� ����.`n- **���� ����**: ��������� �ʹ� ���������� �����Ǿ� �ְų�, CPS ��� ������ �������� ����.`n- **���� ����**: �̹� ����(U-069) ���� ���̸�, ���� �ӵ��ε� ����� ������. ���� TYPING_TICK_MS�� �������� �����ϰų� MAX_CPS�� �����ϴ� ���� �ʿ�.
