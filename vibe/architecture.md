# Unknown World 아키텍처 가이드

## 1. 시스템 개요

Unknown World는 **Gemini 기반의 에이전트형 세계 엔진**과 멀티모달 파이프라인을 결합한 무한 생성 로그라이크 내러티브 웹게임입니다. 시스템은 상태 기반 오케스트레이터와 고수준 게임 UI로 구성됩니다.

## 2. 프로젝트 구조

### 디렉토리 구조 (Tree)

```text
D:\Dev\unknown-world\
├── backend/               # 백엔드 (FastAPI + Pydantic)
│   ├── prompts/           # 프롬프트 저장소 (U-036, U-046: XML 규격 적용)
│   │   ├── system/        # 시스템/페르소나 프롬프트
│   │   ├── turn/          # 출력 지시사항 프롬프트
│   │   └── image/         # 이미지 스타일 가이드라인
│   ├── src/
│   │   └── unknown_world/
│   │       ├── api/        # API 엔드포인트 및 스트림 이벤트 계약
│   │       │   ├── image.py (이미지 생성 API, U-019)
│   │       │   ├── scanner.py (이미지 이해 API, U-021)
│   │       │   ├── turn.py
│   │       │   ├── turn_stream_events.py (U-044: 에러 메시지 i18n 상수 포함)
│   │       │   └── turn_streaming_helpers.py
│   │       ├── config/     # 모델 및 시스템 설정 (U-016)
│   │       │   └── models.py
│       ├── orchestrator/ # 오케스트레이션 엔진
│       │   ├── pipeline.py (파이프라인 실행기)
│       │   ├── stages/    # 단계별 모듈 (RU-005)
│       │   │   ├── types.py
│       │   │   ├── parse.py
│       │   │   ├── validate.py
│       │   │   └── ... (7대 단계 모듈)
│       │   ├── fallback.py
│       │   ├── mock.py (U-007, U-048: 결정적 다양성 구현)
│       │   ├── prompt_loader.py (U-017, U-036)
│       │   ├── repair_loop.py
│       │   └── validator.py (U-018)
│       ├── services/   # 외부 서비스 연동 (U-016)
│       │   ├── genai_client.py
│       │   ├── image_generation.py (Gemini 3 Pro Image 연동, U-019)
│       │   ├── image_postprocess.py (rembg 배경 제거, U-035)
│       │   ├── image_understanding.py (이미지 이해 서비스, U-021)
│       │   └── rembg_preflight.py (신규: rembg 프리플라이트, U-045)
│       ├── storage/    # 스토리지 추상화 및 검증 (RU-006-Q1/Q4/Q5, S1)
│       │   ├── __init__.py (팩토리 및 내보내기)
│       │   ├── storage.py (인터페이스 정의: StorageInterface)
│       │   ├── local_storage.py (MVP 구현체: LocalStorage)
│       │   ├── paths.py (RU-006-Q5: 경로/URL 상수 SSOT)
│       │   └── validation.py (RU-006-Q1: 파일 검증 및 제한 정책 SSOT)
│       ├── validation/ # 비즈니스 룰 및 언어 검증 (U-043)
│   │       │   ├── business_rules.py
│   │       │   └── language_gate.py (신규: 언어 혼합 검증)
│   │       └── models/     # 데이터 모델 (TurnInput/Output)
│   │           ├── scanner.py (U-021)
│   │           └── turn.py
│       └── main.py     # 엔트리포인트 (.env 자동 로딩, U-047)
│   ├── tests/              # 백엔드 테스트 코드
│   │   ├── integration/
│   │   │   └── test_real_mode_gate.py (신규: real 모드 통합 테스트, CP-MVP-07)
│   │   └── unit/
│   │       ├── orchestrator/
│   │       │   └── test_mock_orchestrator.py (신규: U-048)
│   │       ├── test_dotenv_autoload.py (신규: U-047)
│   │       ├── test_u043_language_gate.py
│   │       └── services/
│   │           └── test_rembg_preflight.py (신규: U-045)
│   └── pyproject.toml
├── frontend/              # 프론트엔드 (React 19 + Vite 7 + TS 5.9)
│   ├── src/
│   │   ├── api/            # HTTP Streaming 및 Scanner API 클라이언트
│   │   │   ├── scanner.ts (이미지 업로드 및 분석, U-022)
│   │   │   └── turnStream.ts (U-044: i18n 적용)
│   │   ├── components/     # 게임 UI 컴포넌트
│   │   │   ├── ScannerSlot.tsx (이미지 드랍존 UI, U-022)
│   │   │   └── ...
│   │   ├── locales/        # i18n 리소스 (U-044: 에러 및 언어 키 추가)
│   │   ├── save/           # 세션 및 저장 (U-044: 세션 언어 SSOT 추가)
│   │   │   ├── migrations.ts (신규: 버전별 마이그레이션, U-041)
│   │   │   ├── saveGame.ts
│   │   │   └── ...
│   │   ├── stores/         # 상태 관리 (Zustand)
│   │   ├── turn/           # Turn Runner 모듈 (U-044: 세션 언어 주입 구조)
│   │   └── ...
├── shared/                # 공유 리소스 (SSOT)
│   └── schemas/turn/      # JSON Schema SSOT (Input/Output)
└── vibe/                  # SSOT 문서 저장소
    ├── unit-plans/        # 개발 계획서
    ├── unit-results/      # 개발 완료 보고서 (U-041, U-022, U-021, CP-MVP-07, CP-MVP-05 포함)
    └── unit-runbooks/     # 검증 런북 (U-041, U-022, U-021, CP-MVP-07 포함)
```

### 주요 디렉토리 책임

- **`frontend/`**: 게임 HUD, 액션 덱, 인벤토리, 씬 캔버스 등 사용자 인터페이스 담당. Zustand로 월드 상태 관리. U-044를 통해 세션 언어 SSOT와 클라이언트 에러 i18n을 내재화함. U-022를 통해 Scanner 슬롯(드랍존) 및 업로드 아이템화 인터랙션 구현. **U-041을 통해 구버전 저장 데이터의 자동 마이그레이션 엔진을 포함함.**
- **`backend/`**: FastAPI 기반의 오케스트레이터 서버. 비즈니스 룰 및 Gemini(Vertex AI) 연동 담당. 서비스 계정 인증을 통한 보안 모델 호출 관리. `main.py`에서 `.env` 자동 로딩(U-047)을 통해 로컬 개발 편의성 및 운영 환경 SSOT 보호를 수행함.
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
    - **Deterministic Diversity (U-048[Mvp])**: Mock 모드에서 동일한 입력에 대해 재현 가능한 결과를 보장하면서도, 입력 특징(text, action_id 등)과 base seed를 조합한 per-turn RNG를 사용하여 내러티브와 카드 생성의 다양성을 확보함.
    - **Narrative Log Identity**: "말했습니다"와 같은 대화형 템플릿을 제거하고 `[조사]`, `[실행]` 등 행동 기반 로그 프리픽스를 도입하여 게임 시스템의 정체성을 강화함.
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

## 17. Preflight 및 모델 관리 정책 (U-045[Mvp])

1. **서버 시작 시 프리플라이트 (Preflight on Startup)**:
    - 백엔드 서버 부팅 시 `rembg` 설치 상태와 필수 모델(`birefnet-general`) 캐시 존재 여부를 자동 점검함.
    - 모델 부재 시 `rembg d <model>`을 통해 자동 다운로드를 시도하여 런타임 지연을 사전 제거함.
2. **비차단 부팅 및 Degraded 모드 (Option A)**:
    - 부팅 시 모델 다운로드에 타임아웃(120s)을 적용하여 무한 대기를 방지함.
    - 다운로드 실패 시 서버를 중단하지 않고 `degraded` 상태로 기동하며, 후처리 기능만 비활성화하여 서비스 가용성을 유지함 (RULE-004).
3. **런타임 다운로드 가드 (Runtime Guard)**:
    - 이미지 후처리(`image_postprocess.py`) 호출 시 프리플라이트 준비 상태를 선제적으로 확인하여, 요청 처리 중 대용량 다운로드가 발생하는 현상을 원천 차단함.
    - 미준비 상태인 경우 즉시 원본 이미지를 반환하는 안전 폴백을 수행함.
4. **상태 관측성 (Observability)**:
    - `/health` 엔드포인트에 `rembg` 상세 상태(ready/degraded/unavailable)를 노출하여 운영 및 디버깅 시 환경 준비 상태를 즉시 진단 가능하게 함.

## 18. Scanner 및 멀티모달 조작 정책 (U-022[Mvp])

1. **Scanner 슬롯 아키텍처**:
    - **이미지 업로드 및 분석**: 사용자가 이미지를 드롭하거나 업로드하면 프론트엔드가 `/api/scan`을 호출하여 비전 기반 분석을 수행함.
    - **상태 관리**: `idle`, `uploading`, `analyzing`, `result`, `error`의 명확한 상태 머신을 통해 사용자에게 현재 진행 상황을 시각적으로 전달함.
2. **아이템화 및 조작 정책 (Option B: User Confirmation)**:
    - **확인 후 추가**: 분석 결과로 나온 아이템 후보들을 자동으로 인벤토리에 넣지 않고, 사용자가 선택하여 추가하게 함으로써 게임 내러티브의 개연성과 플레이어의 의도를 보호함.
    - **스토어 연동**: 추가된 아이템은 즉시 `inventoryStore`에 반영되어 드래그 앤 드롭(U-011) 조작이 가능해짐.
3. **이미지 임시 저장 정책 (RU-006-S1)**:
    - **선택적 저장**: 기본적으로 업로드 이미지는 메모리 처리 후 폐기되나, `preserve_original` 플래그가 true인 경우 디버깅/재분석을 위해 `.data/images/uploaded/`에 저장함.
    - **참조 제공**: 저장 시 응답 스키마의 `original_image_key` 및 `url` 필드를 통해 저장된 데이터에 대한 접근 수단을 제공함.
4. **안정성 및 보안**:
    - **클라이언트 측 검증**: 업로드 전 파일 형식(JPEG/PNG/GIF/WebP)과 크기(20MB)를 선행 검증하여 불필요한 서버 호출을 방지함.
    - **좌표 규약 준수 (RULE-009)**: 감지된 오브젝트의 `box_2d`는 항상 0~1000 정규화 좌표계를 유지하며, 분석 결과 UI에서만 변환하여 표시함.
    - **비활성화 가드**: 스트리밍 중에는 스캐너 조작을 차단하여 비동기적인 상태 오염을 방지함.

## 9. Economy/재화 관리 정책 (U-014[Mvp])

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
...
8. **복원 정합성 보장 (RU-004-S1)**:
    - **비동기 언어 동기화**: `changeLanguage`를 `await` 하여 비동기 언어 리소스 로딩 완료 후 UI가 렌더링되도록 보장(혼합 출력 방지).
    - **원장(Ledger) 스냅샷 주입**: 턴 이벤트(`addLedgerEntry`) 대신 전용 `hydrateLedger` 경로를 통해 저장된 원장의 순서, 타임스탬프, 마지막 비용(`lastCost`)을 원본 그대로 복원.
    - **상태 재계산**: 복원된 잔액을 기준으로 `isBalanceLow` 등 유도된 상태(derived state)를 즉시 갱신하여 HUD 일관성 확보.

9. **SaveGame 마이그레이션 정책 (U-041[Mvp])**:
    - **Version-First Loading**: JSON 파싱 후 `extractVersion`을 통해 버전을 먼저 식별함. 최신 스키마와 일치하지 않더라도 마이그레이션 경로가 있다면 폐기하지 않고 변환을 시도함.
    - **순차적 업그레이드 체인**: `migrations.ts`에 정의된 버전별 변환 함수(`0.9.0 → 1.0.0` 등)를 순차적으로 적용하여 최신 버전으로 상향 평준화함.
    - **데이터 보정**: 마이그레이션 중 필드명 오타 수정, 누락된 필드 기본값 주입, 재화 잔액 보정(음수 금지) 등을 수행하여 스키마 정합성을 확보함.
    - **안전 폴백**: 지원하지 않는 버전이거나 변환 중 오류 발생 시, 부분 복구 대신 안전하게 세이브를 폐기하고 프로필 선택 화면으로 유도하여 시스템 일관성을 보호함.


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
4. **환경변수 로딩 및 보호 정책 (U-047, CP-MVP-07)**:
    - **Automatic Loading**: FastAPI 시작 시점에 `.env` 파일을 자동 로드하여 로컬 개발 편의성 확보.
    - **SSOT Protection**: `override=False` 설정을 통해 시스템(운영/CI) 환경변수가 `.env` 파일보다 우선하도록 보장하여 설정 오염 방지.
5. **보안 및 개인정보 보호 (RULE-007/008)**:
    - **프롬프트 은닉**: 로그 및 UI에는 프롬프트 원문이나 내부 추론(CoT)을 노출하지 않고 메타데이터(라벨, 버전, 사용량)만 기록함.
    - **비밀정보 보호**: 인증 키 파일 및 민감한 환경변수가 코드 저장소에 커밋되지 않도록 `.gitignore` 및 보안 가이드라인을 철저히 준수함.
    - **응답 마스킹**: `/health` 및 에러 응답에서 GCP 키 경로 등 시스템 내부 정보를 원천 차단함 (CP-MVP-07).

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
4. **아티팩트 저장 및 서빙 (RU-006-Q5)**:
    - 생성된 이미지를 백엔드의 `.data/images/generated/` 디렉토리에 로컬 PNG 파일로 저장함.
    - FastAPI의 `StaticFiles`를 통해 `.data/` 전체를 `/static`으로 마운트하여 카테고리별 경로 지원 (예: `/static/images/generated/xxx.png`).
    - **경로/URL SSOT**: `storage/paths.py`에서 `BASE_DATA_DIR`, `STATIC_URL_PREFIX`, 카테고리 서브경로, `build_image_url()` 함수 등을 중앙 관리하여 하드코딩 제거.
5. **스토리지 추상화 (RU-006-Q4)**:
    - **인터페이스 분리**: `StorageInterface` 추상 클래스를 통해 `put/get/exists/delete` 인터페이스를 정의함.
    - **MVP 구현체**: `LocalStorage` 구현체가 `backend/.data/` 디렉토리에 카테고리별로 파일을 저장함.
    - **카테고리 분류**: `StorageCategory`를 통해 생성 이미지(`images/generated`), 업로드 이미지(`images/uploaded`), 아티팩트(`artifacts`)를 구분함.
    - **MMP 확장성**: 환경변수로 `GCSStorage` 구현체 전환 예정, 서비스 코드 변경 없이 확장 가능.
4. **안전 폴백 (RULE-004)**:
    - 이미지 생성 실패(모델 오류, 정책 차단, 잔액 부족 등) 시에도 텍스트-only로 게임을 계속 진행할 수 있도록 `ImageGenerationStatus.FAILED` 또는 `SKIPPED` 상태와 함께 적절한 메시지를 반환함.

## 15. 프롬프트 관리 및 i18n 정책 (U-036[Mvp])

1. **프롬프트 외부화 (SSOT)**:
    - 모든 핵심 프롬프트(시스템, 턴 지시, 이미지 스타일)는 `backend/prompts/` 하위의 마크다운(`.md`) 파일로 관리함.
    - 코드 내 하드코딩을 배제하여 프롬프트 튜닝과 버전 관리를 독립적으로 수행함.
2. **언어별 분리 (RULE-006)**:
    - 프롬프트 파일은 `*.ko.md` 및 `*.en.md` 형식으로 엄격히 분리하여 혼합 출력을 방지함.
    - `PromptLoader`는 요청된 언어에 맞는 파일을 로드하며, 부재 시 자동 폴백(KO <-> EN)을 제공함.
3. **XML 태그 기반 메타데이터 (U-046[Mvp])**:
    - **XML Meta Structure**: 프롬프트 파일 상단에 `<prompt_meta>...</prompt_meta>` 태그를 도입하여 메타데이터(ID, 버전, 정책 등)를 명확히 구조화함.
    - **Explicit Body Boundary**: `<prompt_body>...</prompt_body>` 태그로 실제 모델 입력 본문을 감싸 메타 정보의 오염을 방지함.
    - **Legacy Fallback**: 마이그레이션 과도기를 위해 기존 `- key: value` 포맷 파싱도 지원하여 하위 호환성을 유지함.
4. **개발 모드 핫리로드 (PRD 10.4)**:
    - `ENVIRONMENT=development` 환경에서는 매 호출 시 파일을 다시 읽어 수정 사항을 즉시 반영(Hot-Reload)함.
    - 운영 환경에서는 `lru_cache`를 통한 메모리 캐싱으로 성능을 보장함.

## 16. 세션 언어 SSOT 및 i18n 정책 (U-044[Mvp])

1. **세션 언어 SSOT (Single Source of Truth)**:
    - **권위자 설정**: `SaveGame.language`를 세션 언어의 유일한 권위자로 설정하여 언어 드리프트를 방지함.
    - **주입 구조**: `App.tsx`에서 세션 언어 상태를 관리하고, `turnRunner` 생성 시 의존성으로 주입하여 턴 요청(`TurnInput`)의 언어 일관성을 보장함.
    - **복원 정합성**: 저장된 게임 복원 시 i18n 엔진(`resolvedLanguage`)보다 `SaveGame`의 언어를 우선하여 `turnRunner`에 전달함.

2. **언어 전환 정책 (토글 = 리셋)**:
    - **세션 경계 고정**: MVP 정책에 따라 언어 전환은 `profile_select` 화면에서만 허용됨.
    - **리셋 강제**: 게임 플레이 중 언어 변경을 원할 경우, 기존 상태를 번역하는 대신 세션을 종료(Reset)하고 새 언어로 다시 시작해야 함. 이는 월드 상태(기존 narrative 등)와 시스템 언어의 혼합 출력을 원천 차단하기 위함임.

3. **클라이언트 에러 i18n (Zero English Hardcoding)**:
    - **하드코딩 제거**: `turnStream.ts` 내부에 존재하던 영문 에러 메시지(Unknown error, Connection failed 등)를 모두 제거함.
    - **다국어 매핑**: `ERROR_MESSAGES` 상수를 통해 세션 언어(`Language`)에 맞는 번역된 메시지를 노출하며, `translation.json`의 키와 동기화하여 일관된 톤앤매너를 유지함.
    - **안전 폴백**: 에러 이벤트 파싱 실패나 네트워크 단절 시에도 세션 언어에 맞는 시스템 내러티브를 생성하여 UI 안정성을 확보함.