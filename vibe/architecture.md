# Unknown World 아키텍처 가이드

## 1. 시스템 개요

Unknown World는 **Gemini 기반의 에이전트형 세계 엔진**과 멀티모달 파이프라인을 결합한 무한 생성 로그라이크 내러티브 웹게임입니다. 시스템은 상태 기반 오케스트레이터와 고수준 게임 UI로 구성됩니다.

## 2. 프로젝트 구조

### 디렉토리 구조 (Tree)

```text
D:\Dev\unknown-world\
├── .gitattributes         # Git 줄 끝 처리 및 속성 설정
├── .gitignore             # 비밀정보 및 빌드 결과물 제외
├── package.json           # 루트 개발 스크립트 및 프로세스 제어
├── code-base.xml          # 프로젝트 스냅샷 (Repomix)
├── frontend/              # 프론트엔드 (React 19 + Vite 7 + TS 5.9)
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── public/             # 정적 에셋
│   │   └── ui/             # UI 이미지 에셋 SSOT (U-030, U-033)
│   │       ├── README.md   # 제작/관리 규칙
│   │       ├── QA_CHECKLIST.md # 품질 검증 체크리스트 (U-033)
│   │       ├── manifest.json # 에셋 목록 및 메타데이터 (U-033)
│   │       ├── manifest.schema.json # 매니페스트 스키마
│   │       ├── chrome/     # UI 장식/프레임 에셋 (U-032)
│   │       ├── icons/      # UI 아이콘 세트 (24px/16px) (U-038)
│   │       └── placeholders/ # Scene 플레이스홀더 (U-029, U-031)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx         # 레이아웃 통합, 세션 관리 및 이벤트 라우팅
│   │   ├── style.css       # 단일 CSS SSOT
│   │   ├── i18n.ts         # 다국어 설정 SSOT
│   │   ├── setupTests.ts   # 테스트 환경 설정
│   │   ├── vite-env.d.ts
│   │   ├── api/            # HTTP Streaming 클라이언트
│   │   ├── demo/           # 데모용 Mock 데이터 및 피처
│   │   ├── dnd/            # DnD 데이터 계약 및 타입 SSOT
│   │   ├── turn/           # Turn Runner 모듈
│   │   ├── data/           # 데모 프로필 및 정적 데이터 (U-015)
│   │   │   └── demoProfiles.ts
│   │   ├── save/           # 세이브/로드 시스템 (U-015)
│   │   │   └── saveGame.ts
│   │   ├── components/     # 게임 UI 컴포넌트
│   │   │   ├── ActionDeck.tsx
│   │   │   ├── AgentConsole.tsx
│   │   │   ├── InventoryPanel.tsx
│   │   │   ├── SceneCanvas.tsx
│   │   │   ├── EconomyHud.tsx (U-014)
│   │   │   ├── QuestPanel.tsx (U-013)
│   │   │   ├── RuleBoard.tsx (U-013)
│   │   │   ├── MutationTimeline.tsx (U-013)
│   │   │   ├── DemoProfileSelect.tsx (U-015)
│   │   │   └── ResetButton.tsx (U-015)
│   │   ├── locales/        # 다국어 리소스 JSON
│   │   ├── schemas/        # 클라이언트 측 스키마 및 검증 (Zod)
│   │   ├── stores/         # 상태 관리 (Zustand)
│   │   │   ├── agentStore.ts
│   │   │   ├── inventoryStore.ts
│   │   │   ├── economyStore.ts (U-014)
│   │   │   └── worldStore.ts
│   │   ├── types/          # 공통 타입 정의
│   │   └── utils/          # 공통 유틸리티 (box2d.ts)
├── backend/               # 백엔드 (FastAPI + Pydantic)
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── src/
│   │   └── unknown_world/
│   │       ├── main.py
│   │       ├── api/        # API 엔드포인트 및 스트림 이벤트 계약
│   │       ├── models/     # Pydantic 데이터 모델
│   │       └── orchestrator/ # 오케스트레이션 엔진 (Mock 포함)
│   └── tests/
│       ├── integration/
│       └── unit/
├── shared/                # 공유 리소스 (SSOT)
│   └── schemas/
│       └── turn/           # JSON Schema SSOT (Input/Output)
├── vibe/                  # SSOT 문서 저장소
│   ├── architecture.md     # 시스템 아키텍처 및 구조 가이드
│   ├── progress.md         # 작업 진행 이력 및 로그
│   ├── roadmap.md          # 프로젝트 로드맵 및 백로그
│   ├── tech-stack.md       # 기술 스택 및 버전 관리
│   ├── ref/                # 가이드 및 참조 문서 (SSOT)
│   ├── unit-plans/         # 작업 단위(Unit) 개발 계획서
│   ├── unit-results/       # 작업 완료 보고서 (CP-MVP-02[Mvp] 포함)
│   └── unit-runbooks/      # 수동 검증 런북 (CP-MVP-02-click-drag-demo-runbook.md 포함)
└── code-base.xml          # 프로젝트 스냅샷 (Repomix)
```

### 주요 디렉토리 책임

- **`frontend/`**: 게임 HUD, 액션 덱, 인벤토리, 씬 캔버스 등 사용자 인터페이스 담당. Zustand로 월드 상태 관리.
- **`backend/`**: FastAPI 기반의 오케스트레이터 서버. 비즈니스 룰 및 Gemini 연동 담당.
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
3. **Resilient Pipeline**: 이중 검증과 Repair loop를 통한 LLM 출력 안정화.
4. **이중 검증**: 서버(Pydantic) 및 클라이언트(Zod)에서 스트림 이벤트를 검증함.

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

## 8. 품질 보증 및 회귀 방지 정책 (RU-003-S3)

시스템의 복잡도가 증가함에 따라, 자동 테스트 외에 **수동 검증 시나리오(Manual Verification Scenarios)**를 통한 상태 경계 및 UX 일관성 검증을 필수로 수행함.

1. **상태 경계 검증 (Boundary Check)**: 스트리밍 시작/종료 시점에 카드, 인벤토리, 핫스팟의 활성화/비활성화 상태가 정책(`STREAMING_DISABLED_POLICY`)과 일치하는지 확인.
2. **인터랙션 피드백 (Instant Feedback)**: 유효하지 않은 드롭이나 핫스팟 외 영역 클릭 시 무반응이 아닌 즉시 피드백(Narrative 피드 추가 등)이 발생하는지 확인.
3. **i18n 일관성 (Language Consistency)**: 모든 시나리오(성공/실패/에러)에서 ko/en 혼합 출력이 발생하지 않는지 전수 조사.
4. **연결성 및 복구 (Resilience)**: 오프라인 상태 전이 및 백엔드 복구 시 온라인 전환과 씬 렌더링이 안정적으로 복원되는지 확인.

---



## 11. 세션 및 세이브 관리 정책 (U-015[Mvp])



1. **무가입 즉시 시작 (Demo Profiles)**:

    - 심사 및 데모 편의성을 위해 3종의 프리셋 프로필(Narrator, Explorer, Tech) 제공.

    - 프로필 선택 시 해당 페르소나에 맞는 초기 상태(재화/아이템/퀘스트)로 즉시 게임 시작.

2. **로컬 영속화 (SaveGame)**:

    - **localStorage 기반**: 별도의 DB 없이 브라우저 로컬 저장소를 활용하여 세션 상태 영속화.

    - **자동 저장**: 턴 결과가 반영될 때마다 현재 월드 상태, 경제 원장, 인벤토리 등을 JSON으로 직렬화하여 저장.

    - **버전 관리**: `SAVEGAME_VERSION`을 통한 스키마 하위 호환성 관리 및 안전한 복구 보장.

3. **즉시 리셋 (Reset)**:

    - 현재 세션을 폐기하고 선택된 프로필의 초기 상태로 즉시 복구 가능.

    - 실수 방지를 위해 2단계 확인(Confirmation) UI 적용.



4. **복원 정합성 보장 (RU-004-S1)**:

    - **비동기 언어 동기화**: `changeLanguage`를 `await` 하여 비동기 언어 리소스 로딩 완료 후 UI가 렌더링되도록 보장(혼합 출력 방지).

    - **원장(Ledger) 스냅샷 주입**: 턴 이벤트(`addLedgerEntry`) 대신 전용 `hydrateLedger` 경로를 통해 저장된 원장의 순서, 타임스탬프, 마지막 비용(`lastCost`)을 원본 그대로 복원.

    - **상태 재계산**: 복원된 잔액을 기준으로 `isBalanceLow` 등 유도된 상태(derived state)를 즉시 갱신하여 HUD 일관성 확보.



5. **언어 일관성 (RULE-006)**:

    - 세이브 데이터에 `language` 필드를 포함하여, 복원 시 UI 언어와 내러티브 언어의 정합성 강제 유지.



---

_본 문서는 프로젝트의 진화에 따라 수시로 업데이트됩니다._
