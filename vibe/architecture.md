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
│   │       │   ├── card-frame.png
│   │       │   ├── panel-corner-br.png
│   │       │   └── scanner-frame.png
│   │       ├── icons/      # UI 아이콘 세트 (24px/16px) (U-038)
│   │       │   ├── badge-fail-24.png
│   │       │   ├── badge-ok-16.png
│   │       │   ├── badge-ok-24.png
│   │       │   ├── risk-high-16.png
│   │       │   ├── risk-high-24.png
│   │       │   ├── risk-low-16.png
│   │       │   ├── risk-low-24.png
│   │       │   ├── risk-medium-16.png
│   │       │   ├── risk-medium-24.png
│   │       │   ├── shard-16.png
│   │       │   ├── shard-24.png
│   │       │   ├── signal-16.png
│   │       │   ├── signal-24.png
│   │       │   └── status-online-16.png
│       └── placeholders/ # Scene 플레이스홀더 (U-029, U-031)
│           ├── scene-placeholder-default.png
│           ├── scene-loading.webp
│           ├── scene-offline.webp
│           ├── scene-blocked.webp
│           └── scene-low-signal.webp
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx         # 레이아웃 통합, DndContext 최상단 배치 및 DnD 핸들러 (U-011)
│   │   ├── style.css       # 단일 CSS SSOT (인벤토리/드래그 스타일 포함)
│   │   ├── i18n.ts         # 다국어 설정 SSOT (인벤토리 키 포함)
│   │   ├── setupTests.ts   # 테스트 환경 설정
│   │   ├── vite-env.d.ts
│   │   ├── api/            # HTTP Streaming 클라이언트
│   │   │   └── turnStream.ts
│   ├── components/     # 게임 UI 컴포넌트
│   │   ├── ActionDeck.tsx  # 액션 카드 덱 UI
│   │   ├── ActionDeck.test.tsx
│   │   ├── AgentConsole.tsx
│   │   ├── AgentConsole.test.tsx
│   │   ├── DndInteraction.test.tsx # DnD 및 턴 실행 통합 테스트 (U-012)
│   │   ├── InventoryPanel.tsx # 드래그 가능한 인벤토리 UI (U-011)
│   │   ├── InventoryPanel.test.tsx
│   │   ├── SceneCanvas.tsx # 씬 캔버스 및 드롭 타겟 인터랙션 (U-010, U-012)
│   │   ├── SceneCanvas.test.tsx
│   │   └── SceneCanvas.hotspot.test.tsx
│   │   ├── locales/        # 다국어 리소스 JSON
│   │   │   ├── README.md
│   │   │   ├── en-US/
│   │   │   │   └── translation.json
│   │   │   └── ko-KR/
│   │   │       └── translation.json
│   │   ├── schemas/        # 클라이언트 측 스키마 및 검증
│   │   │   └── turn.ts
    ├── stores/         # 상태 관리 (Zustand)
    │   ├── actionDeckStore.ts
    │   ├── actionDeckStore.test.ts
    │   ├── agentStore.ts
    │   ├── inventoryStore.ts # 인벤토리 아이템 및 DnD 상태 관리 (U-011)
    │   ├── inventoryStore.test.ts
    │   ├── uiPrefsStore.ts
    │   ├── uiPrefsStore.test.ts
    │   ├── worldStore.ts    # 월드/세션 상태 SSOT (경제, 씬, 오브젝트, 내러티브) (RU-003-Q4)
    │   └── worldStore.test.ts
    ├── types/          # 스트림 이벤트 계약 타입
│   │   │   ├── turn_stream.ts
│   │   │   └── scene.ts
│   │   └── utils/          # 공통 유틸리티
│   │       └── box2d.ts
├── backend/               # 백엔드 (FastAPI + Pydantic)
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── src/
│   │   └── unknown_world/
│   │       ├── __init__.py
│   │       ├── main.py
│   │       ├── api/        # API 엔드포인트 및 라우팅 (U-007)
│   │       │   ├── __init__.py
│   │       │   ├── turn.py
│   │       │   └── turn_stream_events.py # 스트림 이벤트 계약 모델 (RU-002-Q4)
│   │       ├── models/     # 데이터 모델 및 스키마 (U-005)
│   │       │   ├── __init__.py
│   │       │   └── turn.py
│   │       └── orchestrator/ # 오케스트레이션 엔진
│   │           └── mock.py  # 모의 Orchestrator (U-007)
│   └── tests/
│       ├── integration/
│       │   └── test_api.py
│       └── unit/           # 단위 테스트
│           └── models/
│               └── test_turn.py
├── shared/                # 공유 리소스 (SSOT)
│   ├── README.md
│   └── schemas/
│       └── turn/
│           ├── turn_input.schema.json
│           └── turn_output.schema.json
├── vibe/                  # SSOT 문서 저장소
│   ├── architecture.md
│   ├── progress.md
│   ├── roadmap.md
│   ├── tech-stack.md
│   ├── ref/                # 가이드 및 참조 문서 (SSOT)
│   │   ├── frontend-style-guide.md
│   │   ├── standard-guide.md
│   │   ├── rembg-guide.md
│   │   ├── nanobanana-mcp.md # 에셋 제작 가이드 및 템플릿 (U-034)
│   │   └── nanobanana-asset-request.schema.json # 에셋 요청 스키마 (U-034)
    ├── unit-plans/
    ├── unit-results/       # 유닛 개발 보고서 (U-039[Mvp] 포함)
    └── unit-runbooks/      # 유닛 실행 가이드 (U-039-i18n-json-structure-runbook.md 포함)
└── code-base.xml          # 프로젝트 스냅샷 (Repomix)
```

### 주요 디렉토리 책임

- **`frontend/`**: 게임 HUD, 액션 덱, 인벤토리, 씬 캔버스 등 사용자 인터페이스 담당. Zustand로 월드 상태 관리.
    - `api/`: fetch 기반 HTTP Streaming 응답(NDJSON)을 소비하는 클라이언트 로직 관리.
    - `stores/`: Agent Console 상태, UI 설정 및 월드 세션 상태를 관리하는 Zustand 스토어. **RU-003-Q4에 따라 worldStore가 세션 상태의 SSOT 역할을 수행하며 하위 스토어 업데이트를 조정함.**
    - `components/`: 게임 전용 UI 컴포넌트 모음. U-011/U-012에 따라 인벤토리 패널과 씬 캔버스 간의 DnD 인터랙션 및 턴 실행 연동이 구현됨.
    - `schemas/`: Zod를 활용한 턴 계약 검증 및 폴백 로직 정의.
- **`backend/`**: FastAPI 기반의 오케스트레이터 서버. 비즈니스 룰 및 Gemini 연동 담당.
- **`shared/`**: 백엔드와 프론트엔드 간의 **데이터 계약(Data Contract)**을 정의하는 SSOT 디렉토리.
- **`vibe/`**: 프로젝트의 모든 명세와 진행 상황을 기록하는 단일 진실 공급원(SSOT).

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
4. **Data-driven Layering**: 데이터 속성(`data-ui-*`)을 통한 선언적 스타일 및 가독성 제어.

## 5. 스트리밍 및 에러 핸들링 정책

- **종료 인바리언트**: 모든 스트림은 정확히 1개의 `final` 이벤트로 종료되어야 함.
- **상태 보존형 폴백**: 실패 시에도 재화 잔액의 일관성을 유지함 (RULE-005).
- **이중 검증**: 서버(Pydantic) 및 클라이언트(Zod)에서 스트림 이벤트를 검증함.

## 6. UI 가독성 및 설정 정책 (U-037[Mvp])

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

---
_본 문서는 프로젝트의 진화에 따라 수시로 업데이트됩니다._