# Unknown World 아키텍처 가이드

## 1. 시스템 개요

Unknown World는 **Gemini 기반의 에이전트형 세계 엔진**과 멀티모달 파이프라인을 결합한 무한 생성 로그라이크 내러티브 웹게임입니다. 시스템은 상태 기반 오케스트레이터와 고수준 게임 UI로 구성됩니다.

## 프로젝트 구조

### 디렉토리 구조

```text
.
├── backend/
│   ├── src/unknown_world/
│   │   ├── api/ (turn.py, scanner.py, image.py 등)
│   │   ├── config/ (models.py, settings.py 등)
│   │   ├── models/ (turn.py, scanner.py 등)
│   │   ├── orchestrator/ (pipeline.py, mock.py, prompt_loader.py, repair_loop.py 등)
│   │   │   └── stages/ (parse.py, validate.py, render.py, verify.py 등)
│   │   ├── services/ (genai_client.py, image_generation.py, image_postprocess.py, rembg_preflight.py 등)
│   │   ├── storage/ (local_storage.py, validation.py, paths.py)
│   │   └── validation/ (language_gate.py, business_rules.py)
│   ├── prompts/ (system/, turn/, image/ 하위 ko/en.md)
│   └── tests/ (unit/, integration/, qa/, manual_test_image.py, manual_test_rembg.py 등)
├── frontend/
│   ├── src/
│   │   ├── components/ (ActionDeck.tsx, SceneCanvas.tsx, InventoryPanel.tsx, NarrativeFeed.tsx 등)
│   │   ├── stores/ (worldStore.ts, economyStore.ts, agentStore.ts, actionDeckStore.ts, uiPrefsStore.ts 등)
│   │   ├── turn/ (turnRunner.ts)
│   │   ├── save/ (sessionLifecycle.ts, saveGame.ts, migrations.ts, constants.ts)
│   │   ├── api/ (turnStream.ts, scanner.ts, image.ts)
│   │   ├── locales/ (ko-KR/, en-US/ translation.json)
│   │   └── schemas/ (turn.ts)
│   └── public/ui/ (icons/, chrome/, placeholders/, manifest.json)
├── shared/
│   └── schemas/turn/ (turn_output.schema.json 등)
└── vibe/
    ├── unit-plans/ (U-001~U-080 등)
    ├── unit-results/ (U-001~U-080 등)
    └── unit-runbooks/ (U-001~U-080 등)
```

### 주요 디렉토리 설명

- `backend/src/unknown_world/orchestrator/`: 게임 마스터의 핵심 추론 및 상태 갱신 로직이 단계별 파이프라인으로 구현되어 있습니다.
- `frontend/src/components/`: RULE-002(채팅 UI 금지)를 준수하는 고정 게임 HUD 컴포넌트(ActionDeck, Inventory, SceneCanvas, Hotspot 등)들이 위치합니다.
- `frontend/src/styles/`: 컴포넌트의 시각적 품질과 테마를 담당하는 CSS 모듈들이 관리됩니다.
- `shared/schemas/`: 서버와 클라이언트 간의 데이터 계약을 정의하는 JSON Schema가 관리됩니다.
- `vibe/`: 프로젝트의 비전, 로드맵, 설계 가이드 및 작업 이력을 담은 문서 저장소입니다.

---

## 32. API 키 인증 통합 및 Vertex AI 제거 (U-080[Mvp])

1. **인증 단순화 (API Key First)**:
    - **GOOGLE_API_KEY**: 모든 Gemini 기능(텍스트/이미지)을 단일 API 키로 수행하도록 통합.
    - **Vertex AI Removal**: 서비스 계정 키 파일 및 GCP IAM 권한 관리의 복잡도를 제거하여 데모 온보딩 속도를 최적화함.
2. **서비스 통합 (google-genai)**:
    - **Unified Client**: `genai_client.py`에서 `google.genai.Client(api_key=...)`를 통해 텍스트와 이미지 생성 서비스를 모두 처리함.
    - **Mock Fallback**: 인증 정보 미설정 시에도 `MockGenAIClient`로 자동 전이되어 시스템 기동성을 사수함.
3. **환경 변수 보안 (RULE-007)**:
    - API 키는 `.env` 및 환경 변수로만 관리하며, 코드나 로그에는 절대 노출되지 않도록 마스킹 처리함.
---

## 25. 이미지 생성 지침 통합 및 i18n 정책 (U-061[Mvp])

1. **지침 통합 방식 (Option A)**:
    - **System Prompt Fusion**: `scene_prompt.md`의 가이드라인을 별도 턴 단계로 분리하지 않고, Game Master의 시스템 프롬프트 하단에 `## 이미지 생성 지침` 섹션으로 직접 주입함.
    - **LLM Context Alignment**: LLM이 내러티브 생성 시점부터 이미지 생성에 최적화된 키워드(Cinematic, Dark Fantasy, 16:9 등)를 문맥에 포함하도록 유도하여 `image_job.prompt` 품질을 상향 평준화함.
2. **언어 정합성 및 폴백 (RULE-006)**:
    - **Language Synchronization**: 세션 언어(`ko-KR`, `en-US`)에 따라 자동으로 해당 언어의 지침 파일(`scene_prompt.{lang}.md`)을 로드함.
    - **Safe Fallback**: 특정 언어의 지침 파일이 부재할 경우 기본값인 `ko`(한국어) 지침으로 폴백하여 파이프라인 중단을 방지함.
3. **서비스 레이어 경량화**:
    - **Role Consolidation**: 이미지 프롬프트 생성에 관한 스타일 지침을 오케스트레이터(프롬프트 계층)로 일원화하고, `image_generation.py` 등 서비스 레이어의 하드코딩된 스타일 가이드라인을 제거하여 역할 책임을 분리함.


1. **디자인 테마 (Option C - Magenta)**:
    - **Primary Accent**: 터미널 녹색과 대비되는 `#e040fb` (Magenta) 계열을 강조색으로 사용하여 상호작용 지점을 명확히 함.
    - **Visual Hierarchy**: 중요 정보(핫스팟, 재화)에 마젠타 글로우 효과를 적용하여 가시성 보호 계층 구조를 완성함.
2. **SF UI 디자인 요소 (Option A - Corners)**:
    - **L자 브라켓**: 4개 모서리에 L자형 코너 마커를 배치하여 "GM 타겟팅 시스템"의 미학적 감성을 전달.
    - **Dynamic Feedback**: 호버 시 펄스 애니메이션, 드롭 타겟 진입 시 앰버 색상 점멸 효과를 통해 조작 상태를 직관적으로 피드백함.
3. **렌더링 성능 및 가동성**:
    - **GPU 가속**: `will-change: transform, box-shadow`를 적용하여 다수의 핫스팟이 동시에 애니메이션되어도 프레임 드롭을 최소화함.
    - **Priority Sorting**: 핫스팟 면적 기반 정렬 로직을 통해 작은 오브젝트가 항상 상위에 렌더링되도록 보장하여 클릭 정합성 확보.
4. **모바일 및 접근성 (RULE-011)**:
    - **Touch Target**: 모바일 뷰포트에서 최소 44px의 터치 영역을 보장하고 툴팁 위치를 자동으로 최적화함.
    - **Reduced Motion**: 사용자의 OS 설정에 따라 과도한 점멸 및 이동 애니메이션을 자동으로 비활성화함.

## 26. 언어 혼합 방지 및 행동 로그 정책 (U-062[Mvp])

1. **행동 로그 프리픽스 정책 (MockOrchestrator)**:
    - **User Input Omission**: 행동 로그 프리픽스(`[시도]`, `[ACTION]` 등)에서 사용자 입력 텍스트(`text`, `action_id`)를 제외하여 언어 혼합(ko/en) 발생 가능성을 원천 차단함.
    - **System Identity Preservation**: 시스템이 생성한 `object_id`나 `item_id`는 프리픽스에 포함하여 맥락을 유지함.
2. **언어 일관성 검증 (LanguageGate)**:
    - 턴 응답의 전체 내러티브 언어가 세션 언어(`Language.KO`/`EN`)와 일치하는지 전수 검증함.
    - 사용자 입력이 다른 언어일지라도 시스템 응답이 일관되게 세션 언어를 유지하도록 보장함.

## 27. 재화 잔액 보존 및 폴백 정책 (U-063[Mvp])

1. **폴백 재화 보존 (Snapshot Persistence)**:
    - **RULE-005 준수**: 스키마 검증 실패(`schema_fail`) 등으로 인한 폴백 응답 생성 시, 사용자의 재화 잔액이 0으로 초기화되지 않도록 **입력 시점의 재화 스냅샷(`economy_snapshot`)**을 폴백 결과의 `balance_after`로 보존함.
    - **SSOT 기반 복구**: 프론트엔드 파서(`safeParseTurnOutput`)와 폴백 생성기(`createFallbackTurnOutput`)에 스냅샷 주입 구조를 일원화하여 정책 드리프트 방지.
2. **안전한 폴백 비용 정책**:
    - 폴백 상황에서는 실제 비용 계산이 불가능하거나 신뢰할 수 없으므로, 사용자 보호를 위해 **비용(`cost`)을 항상 0**으로 처리함.

---

## 3. 실행 및 도구 설정 (SSOT)

Unknown World는 환경에 따른 동작 차이를 최소화하기 위해 다음 SSOT 정책을 따릅니다.

1. **실행 커맨드 SSOT**: 루트 `package.json`의 `scripts`.
2. **도구 및 의존성 고정 (Pinning)**: 루트 `package.json` 및 `vibe/tech-stack.md` 기준.
3. **포트 정책 (RULE-011)**: 프론트 8001, 백엔드 8011 기본. `pnpm kill`을 통한 안전한 포트 기반 프로세스 종료.

---

## 4. 핵심 아키텍처 원칙

1. **Stateful Orchestrator**: 월드 상태(WorldState)를 유지하고 갱신하는 시스템.
2. **Structured Turn Contract**: 엄격한 JSON Schema 기반 통신.
3. **Resilient Pipeline (RU-005 / Repair Loop / U-051)**: 
    - **Pipeline SSOT**: 모든 턴 처리는 `orchestrator/pipeline.py`에 정의된 7대 단계를 따름.
    - **Stage Modularity**: 각 단계는 독립된 함수로 모듈화되어 있으며, `PipelineContext`를 통해 상태 전이.
    - **Service Injection (U-051)**: `PipelineContext` 생성 시 `image_generator` 등 핵심 서비스를 주입하거나 자동으로 획득하여 단계 간 서비스 공유.
    - **Conditional Image Generation (U-052)**: 모델의 `image_job` 요청을 경제 잔액, 프롬프트 유효성, `should_generate` 플래그를 기반으로 종합 판정하여 불필요한 비용 및 지연 방지.
    - **Async Data Synchronization (U-053)**: 비동기(`await`) 이미지 생성을 수행하고, 생성된 `image_url` 및 메타데이터를 `TurnOutput` 응답에 원자적으로 동기화하여 프론트엔드에 전달.
    - **Mock/Real Integrated Validation (U-055)**: 개발 모드(Mock)와 실모델 모드(Real) 간의 이미지 파이프라인 동작 일관성을 통합 검증함.
    - **Image Prompt Integration (U-061)**: 시스템 프롬프트에 이미지 가이드라인을 동적으로 삽입하여 LLM의 이미지 프롬프트 생성 품질을 상향 평준화하고 i18n 정합성을 확보함.
    - **Deterministic Diversity (U-048[Mvp])**: Mock 모드에서도 per-turn RNG를 통해 결정적 다양성 확보.
4. **Guaranteed Safe Fallback**: 모든 오류 상황에서 입력 시점의 재화를 보존하는 **안전 폴백 TurnOutput** 생성 보장.
5. **이중 검증**: 서버(Pydantic) 및 클라이언트(Zod)에서 모든 데이터를 전수 검증함.

---

## 9. Economy/재화 관리 정책 (U-014, U-042[Mvp])

1. **거래 장부(Ledger) 시스템 (U-042)**:
    - 모든 재화 변동은 **거래 장부(ko-KR: 거래 장부, en-US: Resource Log)**에 기록됨.
    - 내부 구현 용어는 `ledger`를 유지하되, UI 카피는 게임 친화적인 용어로 통일하여 몰입도 향상.
    - **Option A 정책**: 최근 20개 엔트리만 보관하며, 세션 내에서만 유지됨.
2. **비용 인바리언트 (RULE-005)**:
    - **사전 비용 노출**: 액션 실행 전 예상 비용(`min`, `max`)을 HUD에 표시.
    - **잔액 음수 금지**: 잔액 초과 액션 차단 및 저비용 대안(Alternative) 제안.
3. **가시성 및 식별성 (U-037)**:
    - 재화 데이터는 `critical` 중요도를 부여하여 가독성 보호.

---

## 10. 스트리밍 및 에러 핸들링 정책

- **종료 인바리언트**: 모든 스트림은 정확히 1개의 `final` 이벤트로 종료.
- **연결 상태 복구 (RU-003-S1)**: 스트림 결과에 따른 `connected` 상태 자동 관리.
- **Scene 상태 전이 (RU-003-T1)**: `image_url` 존재 여부에 따른 `sceneState` 자동 결정 (SSOT).
- **Abort(취소) 정책**: 사용자에 의한 중단 시 UI를 안전하게 스트리밍 종료 상태로 복구.

---

## 17. Preflight 및 모델 관리 정책 (U-045[Mvp])

1. **서버 시작 시 프리플라이트**: `rembg` 및 필수 모델 상태 자동 점검 및 부재 시 다운로드 시도.
2. **Degraded 모드**: 모델 다운로드 실패 시에도 서버 가용성을 유지하며 후처리 기능만 비활성화.
3. **런타임 가드**: 대용량 다운로드에 의한 런타임 지연 원천 차단.

---

## 18. Scanner 및 멀티모달 조작 정책 (U-022[Mvp])

1. **Scanner 슬롯 아키텍처**: 이미지 업로드 → 비전 분석 → 상태 머신(`uploading`~`result`) 관리.
2. **아이템화 정책 (Option B)**: 분석 결과를 사용자가 선택하여 인벤토리에 추가 (의도적 통제권).
3. **이미지 임시 저장 (RU-006-S1)**: 디버깅 목적으로 `.data/images/uploaded/`에 선택적 저장 지원.
4. **좌표 규약 준수**: 모든 분석 결과의 `box_2d`는 0~1000 정규화 좌표계 유지.

---

## 11. 세션 및 세이브 관리 정책 (U-015, U-041[Mvp])

1. **SaveGame 마이그레이션 (U-041)**:
    - **Version-First**: 버전 식별 후 순차적 마이그레이션 체인 실행.
    - **데이터 보정**: 필드 오타 수정 및 누락 필드 기본값 주입으로 무결성 보장.
2. **복원 정합성 (RU-004)**: 비동기 언어 로딩 대기 및 거래 장부 스냅샷 주입을 통한 완벽한 상태 복구.

---

## 15. 프롬프트 관리 및 i18n 정책 (U-036, U-046[Mvp])

1. **프롬프트 외부화**: 핵심 프롬프트를 `.md` 파일로 분리 관리 (SSOT).
2. **XML 태그 규격 (U-046)**: `<prompt_meta>` 및 `<prompt_body>` 태그 도입으로 구조화 및 오염 방지.
3. **개발 모드 핫리로드**: 파일 수정 시 서버 재시작 없이 즉시 반영.

---

## 16. 세션 언어 SSOT 및 i18n 정책 (U-044[Mvp])

1. **세션 언어 SSOT**: `SaveGame.language`를 유일한 권위자로 설정.
2. **언어 전환 정책 (토글 = 리셋)**: 혼합 출력 방지를 위해 플레이 중 언어 변경 시 세션 리셋 강제.
3. **클라이언트 에러 i18n**: 하드코딩된 영문 에러 메시지를 완전히 제거하고 i18n 엔진에 통합.

---

## 19. 레이아웃 및 스크롤 정책 (U-049[Mvp])

1. **컬럼 스크롤 차단 (Isolation)**: `.sidebar-left`, `.sidebar-right` 등 메인 컬럼은 `overflow: hidden`으로 고정하여 "전체 스크롤" 발생을 억제.
2. **패널 내부 스크롤 (Content-first)**: 스크롤은 반드시 `.panel-content` 또는 특정 리스트 영역(`.ledger-list`, `.narrative-list`) 내부에서만 발생하도록 제한.
3. **Flexbox 하위 스크롤 보장**: 컨테이너가 자식의 높이에 맞춰 늘어나지 않도록 `min-height: 0`을 명시적으로 적용하여 내부 스크롤 기반 확보.
4. **동적 뷰포트 최적화**: `100dvh`를 활용하여 모바일 주소창 등에 의한 불필요한 첫 화면 스크롤 제거.
5. **자동 스크롤 (Auto-focus)**: 거래 장부(Economy HUD) 등 실시간 데이터 누적 영역은 최신 항목이 보이도록 하단 자동 스크롤(`useRef`/`useEffect`) 적용.

---

## 20. 이미지 파이프라인 및 조건부 생성 정책 (U-052[Mvp])

1. **조건부 생성 판정 (Conditional Logic)**:
    - **플래그 검증**: `image_job.should_generate`가 `true`일 때만 생성 프로세스 진입.
    - **프롬프트 가드**: 모델이 플래그를 `true`로 주더라도 프롬프트가 비어있거나 공백만 있는 경우 생성을 차단하여 API 오류 방지.
2. **이미지 생성 비용 정책 (RULE-005)**:
    - **고정 비용**: MVP 기준 이미지 생성 1회당 **10 Signal** 고정 비용 부과 (Option A).
    - **잔액 검증**: 현재 잔액(`economy_snapshot.signal`)이 생성 비용보다 적을 경우 생성을 거부하고 텍스트-only 폴백으로 전환.
3. **프롬프트 보안 및 로깅 (RULE-007)**:
    - **해시 로깅**: 프롬프트 원문을 로그에 남기지 않으며, SHA-256 해시의 앞 8자리를 사용하여 추적성 확보.
4. **언어별 폴백 메시지 (RULE-006)**:
    - 잔액 부족으로 생성 실패 시 세션 언어(`ko-KR`/`en-US`)에 맞는 안내 메시지를 제공.

---

## 21. 비동기 이미지 생성 및 데이터 동기화 정책 (U-053[Mvp])

1. **비동기 생성 파이프라인**:
    - **Non-blocking Flow**: 내러티브 결정 후 `render_stage`에서 비동기(`await`)로 이미지 생성을 수행하여 텍스트 스트리밍 품질 유지.
    - **Service Integration**: 주입된 `ImageGenerator` 인터페이스를 통해 실제/모의 이미지 생성 요청을 처리.
2. **응답 데이터 동기화 (Option A)**:
    - **Atomic Schema Update**: Pydantic의 `model_copy(update=...)`를 활용하여 생성된 `image_url`, `image_id`, `generation_time_ms` 등의 메타데이터를 `TurnOutput` 객체에 직접 주입.
    - **Frontend Connection**: 프론트엔드의 `SceneCanvas`가 즉시 소비할 수 있도록 서빙 가능한 정적 URL(`STATIC_URL_PREFIX`) 형식으로 제공.
3. **로깅 및 가시성 (RULE-007, RULE-008)**:
    - **보안 로깅**: 프롬프트 원문 대신 해시를 로그에 남기고, 생성 소요 시간 및 성공 여부를 기록하여 운영 가시성 확보.
---

## 22. 이미지 생성 폴백 및 실패 복구 정책 (U-054[Mvp])

1. **실패 내성 구조 (Fault Tolerance)**:
    - **RULE-004 준수**: 이미지 생성 중 발생하는 모든 예외(`TimeoutError`, `ValueError`, `API Error` 등)를 포착하여 시스템 중단 없이 텍스트-only 모드로 즉시 전이.
    - **재시도 최소화 (Option A)**: 지연 시간 단축을 위해 이미지 실패 시 재시도 없이 즉시 폴백 수행 (Retry Count: 0).
2. **안전 차단(Safety Blocked) 대응**:
    - **키워드 기반 감지**: 응답 메시지 내 "safety", "blocked", "policy" 등 키워드 포함 여부로 차단 여부 판별.
    - **상태 동기화**: 차단 감지 시 `TurnOutput.safety.blocked`를 `true`로 설정하고, 언어별 안전 안내 메시지 제공.
3. **배지 및 가시성 연동**:
    - **Badges SSOT**: 안전 차단 시 기존 `SAFETY_OK` 배지를 제거하고 `SAFETY_BLOCKED` 배지를 즉시 반영하여 Agent Console에 시스템 증거 노출.
4. **다국어 폴백 메시지 (RULE-006)**:
    - 실패 유형(일반 실패, 안전 차단, 잔액 부족)에 따라 `ko-KR`/`en-US` 언어 정책에 정렬된 전용 메시지 템플릿 사용.

---

## 28. Gemini 이미지 생성 API 호출 최적화 (U-064[Mvp])

1. **API 호출 방식 전환 (generate_content)**:
    - **Model Compatibility**: `gemini-3-pro-image-preview` 모델의 특성에 맞춰 `generate_images()` 대신 `generate_content()` 메서드를 사용하도록 파이프라인을 수정함.
    - **Multimodal Configuration**: `GenerateContentConfig`를 통해 `TEXT`와 `IMAGE` 모달리티를 동시에 요청하여 모델의 추론(Thinking) 과정과 결과 이미지를 모두 수신할 수 있도록 구성함.
2. **멀티모달 응답 파싱 및 이미지 추출**:
    - **Part-based Extraction**: 모델의 응답 파트(`candidates[0].content.parts`)를 순회하며 `inline_data`가 포함된 파트를 식별하여 이미지 바이트를 추출하는 방어적 파싱 로직을 구현함.
    - **Base64 Decoding**: API로부터 수신된 base64 인코딩 데이터를 디코딩하여 로컬 파일 시스템에 PNG로 저장함.
3. **타임아웃 및 예외 정책 (RULE-004)**:
    - **Increased Timeout**: 이미지 생성의 높은 연산 비용을 고려하여 API 호출 타임아웃을 **60초**로 상향 조정함.
    - **Graceful Fallback**: 타임아웃 또는 API 에러 발생 시 시스템 중단 없이 안전 폴백(`create_fallback_response`)을 통해 텍스트 전용 모드로 전이되도록 보장함.

## 29. TurnOutput 스키마 단순화 및 Gemini 제한 대응 (U-065[Mvp])

1. **스키마 복잡도 최적화 (Option A - 필드 축소)**:
    - **Controlled Generation 제한 대응**: Gemini API의 "too many states" 400 에러를 해결하기 위해 `ActionCard` 및 `TurnOutput` 스키마에서 중복되거나 후순위인 필드(`description`, `hint`, `cost_estimate` 등)를 제거함.
    - **Narrative 중심 정보 통합**: 제거된 필드의 시맨틱 정보는 `narrative` 필드 내에서 자연어로 표현하도록 유도하여 정보 손실을 최소화함.
2. **배열 크기 및 제약 조건 강화 (Hard Limits)**:
    - **Array Size Reduction**: `ActionCard` 목록을 최대 5개로 제한하고, `objects`, `hotspots`, `inventory_added` 등 모든 리스트 필드에 엄격한 `max_length` (3~5) 제약을 적용함.
    - **String Length Optimization**: `narrative` 및 주요 텍스트 필드의 최대 길이를 조정하여 Gemini API의 상태 머신 복잡도를 Serving 가능한 수준으로 낮춤.
3. **서버-클라이언트 스키마 동기화 (Pydantic & Zod)**:
    - **Double Validation Alignment**: 백엔드의 Pydantic 모델 변경사항을 프론트엔드의 Zod 스키마에 즉시 반영하여 데이터 정합성 유지.
    - **UI Interaction Compatibility**: 제거된 필드(`cost_estimate` 등)를 참조하던 UI 컴포넌트(`ActionDeck.tsx`)와 스토어 로직을 새로운 단일 필드(`cost`) 체계로 전환함.

---

## 30. 이미지 생성 지연 흡수 및 Late-binding 정책 (U-066[Mvp])

1. **지연 시간 흡수 UX (Time-buying Strategy)**:
    - **Variable CPS Typewriter**: 내러티브 텍스트 노출 시 가변 CPS(Characters Per Second) 엔진을 적용함. 스트리밍 중이거나 이미지 로딩 중일 때 속도를 늦춰(최소 CPS 3) 시스템 지연을 내러티브 연출로 승화함.
    - **Fast-forward Mechanism**: 클릭/Enter/Space 입력 시 타이핑을 즉시 중단하고 전체 텍스트를 노출하여 UX 편의성을 보장함.
2. **비동기 Late-binding 파이프라인**:
    - **Non-blocking Response**: 텍스트 턴 응답(`onFinal`) 수신 직후 텍스트를 즉시 렌더링하고, 이미지 생성은 비동기 잡(`image_job`)으로 분리하여 실행함.
    - **Revision Guard**: `turn_id` 기반의 late-binding 가드를 구현하여, 이전 턴의 이미지가 뒤늦게 도착했을 때 현재 장면(Scene)을 덮어쓰지 않도록 원천 차단함.
3. **모델 티어링 (FAST/QUALITY)**:
    - **Tiered Generation**: `model_label` 파라미터를 통해 `gemini-2.5-flash-image`(FAST, 저지연)와 `gemini-3-pro-image-preview`(QUALITY, 고품질) 모델을 선택적으로 호출 가능한 구조 구축.
    - **Fallback Policy**: 로딩 중에는 이전 이미지를 유지(Option A)하고 로딩 인디케이터를 표시하며, 생성 실패 시 안전하게 이전 장면으로 수렴함.

