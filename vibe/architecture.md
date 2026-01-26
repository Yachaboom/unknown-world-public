# Unknown World 아키텍처 가이드

## 1. 시스템 개요

Unknown World는 **Gemini 기반의 에이전트형 세계 엔진**과 멀티모달 파이프라인을 결합한 무한 생성 로그라이크 내러티브 웹게임입니다. 시스템은 상태 기반 오케스트레이터와 고수준 게임 UI로 구성됩니다.

## 2. 프로젝트 구조

### 디렉토리 구조 (Tree)

```text
D:\Dev\unknown-world\
├── backend/               # 백엔드 (FastAPI + Pydantic)
│   ├── prompts/           # 프롬프트 저장소 (U-036)
│   │   ├── system/        # 시스템/페르소나 프롬프트
│   │   ├── turn/          # 출력 지시사항 프롬프트
│   │   └── image/         # 이미지 스타일 가이드라인
│   ├── generated_images/  # 생성된 이미지 로컬 저장소 (U-019)
│   ├── src/
│   │   └── unknown_world/
│   │       ├── api/        # API 엔드포인트 및 스트림 이벤트 계약
│   │       │   ├── image.py (이미지 생성 API, U-019)
│   │       │   ├── turn.py
│   │       │   ├── turn_stream_events.py
│   │       │   └── turn_streaming_helpers.py
│   │       ├── config/     # 모델 및 시스템 설정 (U-016)
│   │       │   └── models.py
│   │       ├── orchestrator/ # 오케스트레이션 엔진
│   │       │   ├── pipeline.py (파이프라인 실행기)
│   │       │   ├── stages/    # 단계별 모듈 (RU-005)
│   │       │   │   ├── types.py
│   │       │   │   ├── parse.py
│   │       │   │   └── ... (7대 단계 모듈)
│   │       │   ├── fallback.py
│   │       │   ├── prompt_loader.py (U-017, U-036)
│   │       │   ├── repair_loop.py
│   │       │   └── validator.py (U-018)
│       ├── services/   # 외부 서비스 연동 (U-016)
│       │   ├── genai_client.py
│       │   ├── image_generation.py (Gemini 3 Pro Image 연동, U-019)
│       │   └── image_postprocess.py (rembg 배경 제거, U-035)
│       └── validation/ # 비즈니스 룰 검증 로직
├── frontend/              # 프론트엔드 (React 19 + Vite 7 + TS 5.9)
│   ├── src/
│   │   ├── api/            # HTTP Streaming 클라이언트
│   │   ├── components/     # 게임 UI 컴포넌트
│   │   │   ├── SceneCanvas.tsx (핫스팟 레이어)
│   │   │   ├── SceneImage.tsx (Lazy 로딩 및 상태 표시, U-020)
│   │   │   └── ...
│   │   ├── stores/         # 상태 관리 (Zustand)
│   │   ├── turn/           # Turn Runner 모듈
│   │   └── ...
├── shared/                # 공유 리소스 (SSOT)
│   └── schemas/turn/      # JSON Schema SSOT (Input/Output)
└── vibe/                  # SSOT 문서 저장소
    ├── unit-plans/        # 개발 계획서 (CP-MVP-04 포함)
    ├── unit-results/      # 개발 완료 보고서 (CP-MVP-04 포함)
    └── unit-runbooks/     # 검증 런북 (CP-MVP-04 포함)
```

### 주요 디렉토리 책임

- **`frontend/`**: 게임 HUD, 액션 덱, 인벤토리, 씬 캔버스 등 사용자 인터페이스 담당. Zustand로 월드 상태 관리.
- **`backend/`**: FastAPI 기반의 오케스트레이터 서버. 비즈니스 룰 및 Gemini(Vertex AI) 연동 담당. 서비스 계정 인증을 통한 보안 모델 호출 관리.
- **`shared/`**: 백엔드와 프론트엔드 간의 **데이터 계약(Data Contract)**을 정의하는 SSOT 디렉토리.
- **`vibe/`**: 프로젝트의 모든 명세, 진행 상황, 개발 계획 및 결과 보고서를 기록하는 단일 진실 공급원(SSOT).
    - `unit-plans/`: 각 개발 유닛의 목표, 범위, 완료 기준을 사전에 정의.
    - `unit-results/`: 개발 완료 후 실제 구현 결과 및 검증 데이터를 기록하는 공식 보고서.
    - `unit-runbooks/`: 기능 검증을 위한 재현 가능한 수동/자동 절차 명세.


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
3. **Resilient Pipeline (RU-005 / Repair Loop)**: 
    - **Pipeline SSOT (RU-005-Q1/Q4)**: 모든 턴 처리는 `orchestrator/pipeline.py`에 정의된 `DEFAULT_STAGES`를 통해 실행되며, Mock/Real 경로 간의 동작 드리프트를 방지함. 단계 실행 순서는 이 리스트가 단일 진실 공급원(SSOT)임.
    - **Stage Modularity**: 각 단계(Parse→Validate→Plan→Resolve→Render→Verify→Commit)는 독립된 함수로 모듈화되어 있으며, `PipelineContext`를 통해 상태를 전이함.
    - Pydantic 스키마 검증 및 비즈니스 룰 검증(`validator.py`)을 통한 이중 하드 게이트.
    - **Badge Consistency (RU-005-S1)**: 모든 비즈니스 룰 위반(경제, 안전, 언어/좌표)은 누락 없이 각각 `ECONOMY_FAIL`, `SAFETY_BLOCKED`, `CONSISTENCY_FAIL` 배지로 매핑되어야 함.
    - 검증 실패 시 모델에게 실패 사유를 피드백으로 전달하여 스스로 수정하게 하는 **Repair Loop**(최대 2회) 실행.
4. **Guaranteed Safe Fallback (RU-005-Q1)**: 
    - **Fallback SSOT**: `orchestrator/fallback.py:create_safe_fallback`이 모든 생성 실패 상황의 단일 폴백 생성 창구임. 실모델 생성기(`TurnOutputGenerator`)와 모의 생성기(`MockOrchestrator`) 모두 이 함수로 로직을 위임함.
    - 모든 복구 시도 실패 또는 예외 상황 시, 입력 시점의 재화 스냅샷을 보존하고 스키마를 100% 준수하는 **안전 폴백 TurnOutput** 강제 생성 및 반환.
    - **Synchronized Fallback Badges (RU-005-S1)**: 폴백 시 생성되는 `TurnOutput`의 배지와 스트림 송출 `badges` 이벤트의 의미는 항상 동일해야 함.
5. **이중 검증**: 서버(Pydantic) 및 클라이언트(Zod)에서 스트림 이벤트를 전수 검증함.
6. **Decoupled Observation & Streaming Helpers (RU-005-Q3)**: 
    - **Event Translation**: 오케스트레이터는 도메인 이벤트(`PipelineEvent`)를 송출하고, API 계층(`api/turn.py`)은 이를 스트림 프로토콜(NDJSON)로 변환하는 변환기(`_convert_pipeline_event`)를 두어 transport 계층과 도메인 로직을 격리함.
    - **Streaming SSOT**: 내러티브 스트리밍, 에러 송출, 폴백 생성 등 중복되는 스트리밍 로직은 `api/turn_streaming_helpers.py`로 단일화하여 전송 경로의 일관성을 보장함.
    - **Async Queueing**: `asyncio.Queue`를 사용하여 파이프라인 처리와 네트워크 전송을 비동기적으로 분리함.

## 9. Economy/재화 관리 정책 (U-014[Mvp])

1. **원장(Ledger) 시스템**:
    - 모든 재화 변동은 `turn_id`, `reason`, `cost`, `balance_after`를 포함한 원장에 기록됨.
    - **Option A 정책**: 메모리 최적화를 위해 최근 20개 엔트리만 보관하며, 세션 내에서만 유지됨.
2. **비용 인바리언트 (RULE-005)**:
    - **사전 비용 노출**: 액션 실행 전 예상 비용(`min`, `max`)을 HUD에 표시하여 플레이어의 전략적 선택을 지원함.
    - **잔액 음수 금지**: 현재 잔액을 초과하는 비용의 액션은 실행을 차단하고 저비용 대안(Alternative)을 제안함.
3. **가시성 및 식별성**:
    - 재화 데이터는 `critical` 중요도를 부여하여 CRT 효과에 의한 가독성 저해를 차단함.
    - 영문 마이크로 텍스트 폰트를 적용하여 숫자의 시인성을 확보함.

## 10. 스트리밍 및 에러 핸들링 정책

- **종료 인바리언트**: 모든 스트림은 정확히 1개의 `final` 이벤트로 종료되어야 함. (단, 사용자에 의한 Abort 제외)
- **상태 보존형 폴백**: 실패 시에도 재화 잔액의 일관성을 유지함 (RULE-005).
- **이중 검증**: 서버(Pydantic) 및 클라이언트(Zod)에서 스트림 이벤트를 검증함.
- **연결 상태 복구 (RU-003-S1)**:
    - 스트림 시작 시 또는 성공(`onFinal`) 수신 시 `connected=true`로 낙관적 복구.
    - 에러 발생 시 `connected=false`로 즉시 전환.
- **Scene 상태 전이 (RU-003-S1/T1)**:
    - **SSOT 확정**: `worldStore.applyTurnOutput`이 `ui.scene.image_url` 존재 여부를 기준으로 `sceneState`를 결정함.
    - **성공 종료**: 스트림 중 에러가 없었다면 `image_url` 유무에 따라 `scene` 또는 `default` 상태로 자동 전이.
    - **에러/차단 종료**: `onError` 또는 `safety.blocked` 발생 시 `offline`, `blocked`, `low_signal` 등 에러 화면을 유지.
    - **로직 단일화**: `turnRunner` 등 외부 모듈에서의 수동 리셋을 금지하고 `TurnOutput` 계약에 의존함.
- **Abort(취소) 정책 (RU-003-S1)**:
    - 취소(Abort) 시에는 `onComplete`를 호출하지 않음 (Option B).
    - 호출자(Turn Runner/App)가 취소 의도를 파악하고 직접 UI를 스트리밍 종료 상태로 복구해야 함.

## 14. 이미지 Lazy Render 정책 (U-020[Mvp])

1. **Lazy Loading + Option A (Persistent Image)**:
    - 새로운 장면 정보 수신 시, 이미지가 완전히 로드될 때까지 이전 장면 이미지를 유지(Option A)하여 화면 깜빡임을 방지함.
    - 백그라운드에서 `Image` 객체를 통해 프리로드를 수행하며, 완료 시 0.3s 페이드인 효과와 함께 교체함.
2. **로딩 및 에러 가시성 (RULE-008/004)**:
    - 이미지 로딩 중에는 `scene-loading-indicator`와 프로그레스 바 애니메이션을 노출하여 진행 상황을 알림.
    - 로드 실패 시 에러 배지를 노출하되, 텍스트 정보와 핫스팟 상호작용은 유지하여 게임 진행이 중단되지 않도록 함.
3. **스키마 유연성**:
    - 백엔드의 `scene` 정보가 null로 올 수 있는 케이스를 프론트엔드 Zod 스키마에서 안전하게 처리(`nullish().transform()`)하여 런타임 크래시를 방지함.

## 6. 인터랙션 및 레이아웃 안정화 정책 (RU-003-S2)

1. **핫스팟 우선순위 (Area-based Priority)**:
    - 핫스팟이 겹칠 경우, **bbox 면적이 작은 것**이 더 구체적인 대상을 가리키는 것으로 간주하여 더 높은 우선순위(zIndex)를 부여함.
    - `dnd/types.ts`의 `compareHotspotPriority`를 기준으로 정렬하여 렌더링함.
2. **리사이즈 안정화 (Resize Debouncing)**:
    - 윈도우 리사이즈 시 핫스팟 레이아웃 재계산에 **100ms 디바운스**와 **5px 임계값**을 적용하여 드래그 중 UI가 흔들리는 현상을 방지함.
3. **인터랙션 허용 상태 SSOT**:
    - `isHotspotInteractionAllowed` 유틸리티를 통해 `scene` 및 `default(데모)` 상태에서만 핫스팟 상호작용을 허용하도록 관리함.
4. **스트리밍 비활성화 SSOT**:
    - `STREAMING_DISABLED_POLICY`에 따라 모든 상호작용 패널은 `agentStore.isStreaming` 플래그를 동일하게 공유하여 일관된 `disabled` 상태를 유지함.

## 7. UI 가독성 및 설정 정책 (U-037[Mvp])

1. **전역 UI 스케일 (Global UI Scale)**: CSS 변수 `--ui-scale-factor`를 통해 0.9x ~ 1.2x 조절 지원.
2. **중요도 기반 가독성 레이어링 (Importance-driven Layering)**:
    - **Critical 영역**: `data-ui-importance="critical"` 마킹. CRT 오버레이(z-index 9999)보다 높은 **z-index 10000**과 강화된 **text-shadow**를 적용하여 어떤 배경에서도 가독성을 보장함. (재화, 비용, 상태 배지 등)
    - **Ambient 영역**: CRT 오버레이 아래(z-index 1)에 위치하여 레트로 분위기(스캔라인, 플리커)를 집중적으로 연출함. (씬 캔버스, 로고, 장식적 프레임 등)
3. **접근성 가드 (Accessibility Guards)**:
    - **Reduced Motion**: OS의 동작 줄이기 설정 탐지 시 플리커, 글리치 등 피로 유발 애니메이션을 자동 비활성화함.
    - **High Contrast**: 고대비 설정 탐지 시 텍스트 섀도우를 추가 강화하고 배경 대비를 높임.
4. **마이크로 텍스트 가독성**: 마이크로 텍스트 전용 폰트(`Share Tech Mono`)를 도입하고 가독성 하한선(12px~14px)을 준수함.

## 7. UI 이미지 에셋 SSOT 정책

- **Dev-only 제작**: `nanobanana mcp` 결과물인 `public/ui/` 내 파일에만 의존.
- **성능 예산**: 전체 에셋 1.5MB 상한 및 개별 에셋 최적화 준수.
- **폴백 강제**: `manifest.json`에 정의된 텍스트/이모지 폴백 활용.
- **멀티 사이즈 전략 (U-038[Mvp])**: 핵심 아이콘은 16px(밀집 영역용)과 24px(주요 상태용) 듀얼 사이즈를 제공하여 다양한 UI 컨텍스트에서 식별성 극대화.

## 8. 품질 보증 및 회귀 방지 정책 (RU-003-S3, RU-004-S3, RU-005-S3)

시스템의 복잡도가 증가함에 따라, 자동 테스트 외에 **수동 검증 시나리오(Manual Verification Scenarios)**를 통한 상태 경계 및 UX 일관성 검증을 필수로 수행함.

1. **상태 경계 및 세션 검증 (RU-004-S3)**:
    - **데모 루프 안정성**: Reset, Continue, Profile Change 등 세션 전환 시 이전 데이터가 남지 않고 프로필 초기 상태나 저장된 상태로 정확히 복구되는지 확인.
    - **영속성 정합성**: 자동 저장(Autosave) 시점과 로드 시점의 HUD 잔액, Ledger 순서, 인벤토리 상태가 완벽히 일치하는지 전수 조사.
    - **안전 폴백**: 손상된 세이브 데이터 유입 시에도 `profile_select` 화면으로 안전하게 복구되는지 확인.
2. **인터랙션 피드백 (Instant Feedback)**: 유효하지 않은 드롭이나 핫스팟 외 영역 클릭 시 무반응이 아닌 즉시 피드백(Narrative 피드 추가 등)이 발생하는지 확인.
3. **오케스트레이터 파이프라인 검증 (RU-005-S3)**:
    - **스트리밍 계약 준수**: `Parse → ... → Commit` 단계가 누락 없이 순서대로 전달되는지, `badges` 및 `repair` 이벤트가 의도한 시점에 배출되는지 확인.
    - **종료 인바리언트**: 정상, 예외, 취소(Abort) 모든 상황에서 최종적으로 `final`(폴백 포함) 이벤트로 안전하게 수렴하여 UI 멈춤을 방지하는지 확인.
    - **i18n 일관성**: 영어(en-US) 요청 시 시스템 메시지 및 복구 피드백에 한국어가 섞이지 않는지 확인 (RULE-006).
4. **i18n 일관성 (Language Consistency)**: 모든 시나리오(성공/실패/에러)에서 ko/en 혼합 출력이 발생하지 않는지 전수 조사.
4. **연결성 및 복구 (Resilience)**: 오프라인 상태 전이 및 백엔드 복구 시 온라인 전환과 씬 렌더링이 안정적으로 복원되는지 확인.

## 11. 세션 및 세이브 관리 정책 (U-015[Mvp], RU-004)



1. **정책 상수 및 초기값 SSOT (RU-004-Q5)**:

    - **상수 중앙화**: `frontend/src/save/constants.ts`를 단일 진실 공급원(SSOT)으로 삼아 세이브 버전, 스토리지 키, 시드 정책, 재화 임계치 등을 집중 관리함.

    - **초기값 주입 정책 (Injection-first)**: 스토어의 `createInitialState` 값은 "플레이 전 placeholder"로 정의하며, 실제 게임 데이터는 세션 진입 시 프로필 초기값 또는 세이브 데이터로부터 주입받아야 함.

    - **시드 정책 (Seed Policy)**: `generateDemoSeed`를 통해 시드 생성 로직을 통일하고, 세션 유지 기간 동안 동일한 시드가 보존되도록 보장함.



2. **무가입 즉시 시작 (Demo Profiles)**:

    - 심사 및 데모 편의성을 위해 3종의 프리셋 프로필(Narrator, Explorer, Tech) 제공.

    - 프로필 선택 시 해당 페르소나에 맞는 초기 상태(재화/아이템/퀘스트)로 즉시 게임 시작.



3. **SaveGame 생성 SSOT 단일화 (RU-004-Q1)**:

    - **단일 생성 창구**: 모든 `SaveGame` 객체는 `frontend/src/save/saveGame.ts`의 `createSaveGame` 함수를 통해서만 생성되어야 함.

    - **Input Adapter 패턴**: 프로필 시작 등 다른 소스에서 `SaveGame`을 만들 경우, 직접 조립하지 않고 `SaveGameInput` 형태로 데이터를 변환(Adapt)하여 `createSaveGame`에 전달함.

    - **드리프트 방지**: 스키마 변경, 기본값 설정, 버전 관리 로직을 `saveGame.ts` 한 곳으로 집중하여 생성 경로에 따른 데이터 불일치를 원천 차단함.



4. **세션 라이프사이클 SSOT (RU-004-Q4)**:

    - **중앙 집중화**: 부팅, 선택, 복원, 리셋, 변경 등 모든 세션 전환 이벤트를 `sessionLifecycle.ts` 모듈로 단일화.

    - **App.tsx 의존성 제거**: App은 비즈니스 로직(스토어 주입 등)을 직접 수행하지 않고 세션 모듈의 API를 호출하는 얇은 인터페이스 역할만 수행.

    - **원자적 초기화**: `resetAllSessionStores`를 통해 세션 전환 시 모든 관련 스토어를 일괄 초기화하여 이전 세션의 잔재를 완전히 제거.



5. **유효성 기반 로컬 영속화 (SaveGame)**:

    - **localStorage 기반**: 별도의 DB 없이 브라우저 로컬 저장소를 활용하여 세션 상태 영속화.

    - **유효성 우선 로드**: `hasSaveGame()` 대신 `getValidSaveGameOrNull()`을 사용하여 스키마 검증 및 버전 마이그레이션이 완료된 데이터만 "세이브 있음"으로 취급.

    - **자동 저장**: 턴 결과가 반영될 때마다 현재 월드 상태, 경제 원장, 인벤토리 등을 JSON으로 직렬화하여 저장.

    - **버전 관리**: `SAVEGAME_VERSION`을 통한 스키마 하위 호환성 관리 및 `migrateSaveGame`을 통한 자동 마이그레이션 적용.



6. **즉시 리셋 및 세션 초기화 (Reset)**:

    - **스토어 초기화 표준화**: 세션 전환(Select/Continue/Reset) 시 `world`, `inventory`, `economy`, `actionDeck`, `agent` 스토어를 모두 리셋하여 이전 세션의 잔재를 완전히 제거.

    - **안전 리셋**: 현재 세션을 폐기하고 선택된 프로필의 초기 상태로 복구. 실수 방지를 위해 2단계 확인 UI 적용.



7. **ID 및 상태 SSOT (Single Source of Truth)**:

    - **profileId SSOT**: `SaveGame.profileId`를 최우선 권위자로 설정. Continue/Load 시점에 브라우저 캐시 키(`CURRENT_PROFILE_KEY`)를 이 값으로 강제 동기화하여 드리프트 방지.

    - **복원 실패 폴백**: 세이브 데이터 손상 시 자동 클린업 후 프로필 선택 화면(`profile_select`)으로 안전하게 이동.



8. **복원 정합성 보장 (RU-004-S1)**:

    - **비동기 언어 동기화**: `changeLanguage`를 `await` 하여 비동기 언어 리소스 로딩 완료 후 UI가 렌더링되도록 보장(혼합 출력 방지).

    - **원장(Ledger) 스냅샷 주입**: 턴 이벤트(`addLedgerEntry`) 대신 전용 `hydrateLedger` 경로를 통해 저장된 원장의 순서, 타임스탬프, 마지막 비용(`lastCost`)을 원본 그대로 복원.

    - **상태 재계산**: 복원된 잔액을 기준으로 `isBalanceLow` 등 유도된 상태(derived state)를 즉시 갱신하여 HUD 일관성 확보.

## 12. GenAI 연동 및 모델 정책 (U-016[Mvp])

1. **모델 라벨링 SSOT**:
    - 모델 ID 원문 대신 **라벨**(`FAST`, `QUALITY`, `IMAGE`, `VISION`)을 사용하여 코드와 정책을 분리함.
    - `config/models.py`를 단일 진실 공급원(SSOT)으로 삼아 `tech-stack.md`의 모델 ID와 1:1 매핑함.
2. **Vertex AI 인증 체계**:
    - **서비스 계정 인증**: `GOOGLE_APPLICATION_CREDENTIALS`를 통한 백엔드 전용 인증을 사용하여 보안을 강화함.
    - **BYOK 금지 (RULE-007)**: 사용자에게 API 키 입력을 요구하지 않으며, 모든 호출은 백엔드 서비스 계정을 경유함.
3. **Hybrid Client (Mock/Real)**:
    - 환경변수 `UW_MODE`에 따라 실제 API 호출(`real`)과 모의 응답(`mock`)을 선택적으로 운용함.
    - 실제 클라이언트 초기화 실패 시 시스템 가용성 유지를 위해 자동으로 Mock 모드로 폴백함.
4. **보안 및 개인정보 보호 (RULE-007/008)**:
    - **프롬프트 은닉**: 로그 및 UI에는 프롬프트 원문이나 내부 추론(CoT)을 노출하지 않고 메타데이터(라벨, 버전, 사용량)만 기록함.
    - **비밀정보 보호**: 인증 키 파일 및 민감한 환경변수가 코드 저장소에 커밋되지 않도록 `.gitignore` 및 보안 가이드라인을 철저히 준수함.

## 13. 멀티모달 및 이미지 정책 (U-019[Mvp], U-035[Mvp])

1. **텍스트 우선 + Lazy 이미지 (RULE-008)**:
    - 텍스트 턴 응답(`TurnOutput`)에 포함된 `ImageJob` 정보를 바탕으로, 클라이언트가 별도의 엔드포인트(`/api/image/generate`)를 호출하여 이미지를 비동기적으로 생성함.
    - 이를 통해 이미지 생성 지연이 전체 게임의 첫 응답 시간(TTFB)을 저해하지 않도록 함.
2. **이미지 모델 고정 (RULE-010)**:
    - 모든 이미지 생성 및 편집 작업은 `gemini-3-pro-image-preview` 모델로 고정하여 비주얼 일관성을 유지함.
3. **오브젝트 이미지 배경 제거 (rembg 후처리, U-035[Mvp])**:
    - **자동 모델 선택 (Option B)**: 이미지 유형 힌트(`icon`, `character`, `portrait` 등)에 따라 `birefnet-general`, `isnet-anime` 등 최적의 `rembg` 모델을 자동으로 선택하여 후처리 품질을 극대화함.
    - **안전 폴백 (RULE-004)**: `rembg` 처리 중 오류나 타임아웃 발생 시 원본 이미지를 그대로 사용하여 사용자 경험 중단을 방지함.
    - **조건부 실행**: `ImageJob.remove_background` 플래그가 true인 경우에만 후처리 파이프라인이 동작함.
4. **아티팩트 저장 및 서빙 (Option A)**:
    - MVP에서는 생성된 이미지를 백엔드의 `generated_images/` 디렉토리에 로컬 PNG 파일로 저장함.
    - FastAPI의 `StaticFiles`를 통해 `/static/images/` 경로로 브라우저에 직접 서빙함.
4. **안전 폴백 (RULE-004)**:
    - 이미지 생성 실패(모델 오류, 정책 차단, 잔액 부족 등) 시에도 텍스트-only로 게임을 계속 진행할 수 있도록 `ImageGenerationStatus.FAILED` 또는 `SKIPPED` 상태와 함께 적절한 메시지를 반환함.

## 15. 프롬프트 관리 및 i18n 정책 (U-036[Mvp])

1. **프롬프트 외부화 (SSOT)**:
    - 모든 핵심 프롬프트(시스템, 턴 지시, 이미지 스타일)는 `backend/prompts/` 하위의 마크다운(`.md`) 파일로 관리함.
    - 코드 내 하드코딩을 배제하여 프롬프트 튜닝과 버전 관리를 독립적으로 수행함.
2. **언어별 분리 (RULE-006)**:
    - 프롬프트 파일은 `*.ko.md` 및 `*.en.md` 형식으로 엄격히 분리하여 혼합 출력을 방지함.
    - `PromptLoader`는 요청된 언어에 맞는 파일을 로드하며, 부재 시 자동 폴백(KO <-> EN)을 제공함.
3. **프론트매터 및 메타데이터**:
    - 프롬프트 파일 상단에 `- key: value` 형식의 메타데이터를 포함하여 버전, 정책 프리셋, 고유 ID 등을 관리함.
4. **개발 모드 핫리로드 (PRD 10.4)**:
    - `ENVIRONMENT=development` 환경에서는 매 호출 시 파일을 다시 읽어 수정 사항을 즉시 반영(Hot-Reload)함.
    - 운영 환경에서는 `lru_cache`를 통한 메모리 캐싱으로 성능을 보장함.

---
