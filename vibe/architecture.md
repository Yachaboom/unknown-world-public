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
    ├── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── style.css
│       ├── vite-env.d.ts
│       ├── api/            # HTTP Streaming 클라이언트 (U-008)
│       │   └── turnStream.ts
│       ├── components/     # 게임 UI 컴포넌트 (U-008)
│       │   └── AgentConsole.tsx
│       ├── schemas/        # 클라이언트 측 스키마 및 검증 (U-006)
│       │   └── turn.ts
│       ├── stores/         # 상태 관리 (Zustand) (U-008)
│       │   └── agentStore.ts
│       └── types/          # 스트림 이벤트 계약 타입 (RU-002-Q4)
│           └── turn_stream.ts
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
│   ├── unit-plans/
│   ├── unit-results/       # 유닛 개발 보고서 (U-027[Mvp] 포함)
│   └── unit-runbooks/      # 유닛 실행 가이드 (U-027[Mvp] 포함)
└── shared/                # 공유 리소스 (SSOT)
```

### 주요 디렉토리 책임

- **`frontend/`**: 게임 HUD, 액션 덱, 인벤토리, 씬 캔버스 등 사용자 인터페이스 담당. Zustand로 월드 상태 관리.
    - `api/`: fetch 기반 HTTP Streaming 응답(NDJSON)을 소비하는 클라이언트 로직 관리.
    - `stores/`: Agent Console 상태(단계/배지) 및 월드 상태를 관리하는 Zustand 스토어.
    - `components/`: Agent Console, Narrative Feed 등 게임 전용 UI 컴포넌트 모음.
    - `schemas/`: Zod를 활용한 턴 계약(Turn Contract) 검증 및 폴백 로직 정의.
    - `types/`: 서버-클라이언트 간 스트림 이벤트(NDJSON) 계약 타입을 정의 (SSOT).
- **`backend/`**: FastAPI 기반의 오케스트레이터 서버. 비즈니스 룰 및 Gemini 연동 담당.
    - `api/`: `/api/turn` 등 클라이언트 통신을 위한 엔드포인트 관리 및 스트림 이벤트 모델(`turn_stream_events.py`) 정의.
    - `orchestrator/`: 실모델(Gemini) 또는 모의(Mock)를 통한 게임 엔진 오케스트레이션 핵심 로직 담당.
    - `models/`: Pydantic을 활용한 시스템 내부 데이터 구조 및 유효성 검증 정의.
- **`shared/`**: 백엔드와 프론트엔드 간의 **데이터 계약(Data Contract)**을 정의하는 SSOT 디렉토리.
    - `schemas/`: 언어 중립적인 JSON Schema 포맷으로 TurnInput/TurnOutput 규약 관리.
- **`vibe/`**: 프로젝트의 모든 명세와 진행 상황을 기록하는 단일 진실 공급원(SSOT).

---

## 3. 실행 및 도구 설정 (SSOT)

Unknown World는 환경에 따른 동작 차이를 최소화하기 위해 다음 SSOT 정책을 따릅니다.

1. **실행 커맨드 SSOT**: 루트 `package.json`의 `scripts`. 모든 실행 안내(로드맵, 코드 주석 등)는 이를 기준으로 합니다.
2. **도구 및 의존성 고정 (Pinning)**:
    - **도구 버전**: 루트 `package.json`에 `packageManager`와 `engines`를 명시하여 pnpm 및 Node.js 버전을 고정합니다.
    - **의존성 버전**: `vibe/tech-stack.md`를 기준으로 모든 런타임 및 개발 의존성을 특정 버전으로 고정(pin)하여 버전 드리프트를 방지합니다.
3. **포트 정책 (RULE-011)**:
    - **Frontend**: `8001 ~ 8010` (기본: `8001`). `strictPort: true`를 강제하여 대역 외 자동 이동을 방지합니다.
    - **Backend**: `8011 ~ 8020` (기본: `8011`).
    - **정리**: `pnpm kill`은 RULE-011 포트 대역(8001~8020)만을 대상으로 하는 **안전한 포트 기반 종료**를 수행합니다. 이를 통해 `node.exe` 전체를 종료하는 광역 종료 위험을 방지하고 다른 프로젝트에 영향을 주지 않도록 설계되었습니다. (`kill:port`는 이의 별칭입니다.)
4. **도구 설정 SSOT**:
    - **Python (Backend)**: `backend/pyproject.toml` (Ruff, Pyright, uv 의존성)
    - **TypeScript (Frontend)**: `frontend/package.json` (pnpm), `frontend/tsconfig.json` (TS)

---

## 4. 핵심 아키텍처 원칙

1. **Stateful Orchestrator**: 단순 챗봇이 아닌 월드 상태(WorldState)를 유지하고 갱신하는 시스템.
2. **Structured Turn Contract**: 서버와 클라이언트는 엄격한 JSON Schema(`TurnOutput`)를 통해서만 통신.
3. **Decoupled UI**: 게임의 시각적 요소는 월드 상태로부터 독립적으로 렌더링(Data-driven UI).
4. **Resilient Pipeline**: LLM의 불안정한 출력을 Pydantic/Zod 이중 검증과 Repair loop로 방어.

## 5. 스트리밍 및 에러 핸들링 정책 (RU-002[Mvp])

1. **프로토콜 버전 및 하위 호환성 (Protocol Versioning)**:
    - **Version 1 (현행)**: MVP 안정화 계약. `final.data`, `stage.status: "complete"`, `badges: string[]` 형식을 사용한다.
    - **Version 2 (목표)**: 향후 개선 계약. `final.turn_output`, `stage.status: "ok"|"fail"`, `badges: Map` 형식을 지향한다.
    - **별칭(Alias) 정책**: 클라이언트는 서버가 v1 또는 v2 형식을 보내더라도 정상 동작하도록 `final.data ?? final.turn_output` 식의 별칭 지원 로직을 유지한다.
2. **스트림 이벤트 검증 (Event Validation)**: 모든 스트림 이벤트(`stage`, `badges`, `error` 등)는 소비되기 전 Zod 스키마를 통해 경량 검증을 거친다.
    - 검증 실패 시 해당 이벤트만 무시(drop)하거나 기본 폴백을 적용하며, 전체 스트림 파이프라인이나 UI가 중단되지 않도록 한다.
    - **Unknown Event**: 정의되지 않은 타입의 이벤트가 수신되면 콘솔 경고를 남기되 UI 상태에는 영향을 주지 않고 안전하게 폐기한다. 이는 향후 프로토콜 확장(telemetry, repair 등)에 대한 전방 호환성을 제공한다.
3. **종료 인바리언트 (Terminal Invariant)**: 모든 `/api/turn` 스트림은 성공, 내부 실패, 네트워크 장애 여부와 상관없이 **정확히 1개의 `final` 이벤트**로 종료되어야 한다.
    - 서버는 예외 발생 시 `error` 이벤트를 송출한 뒤 반드시 폴백 `TurnOutput`을 포함한 `final` 이벤트를 송출한다.
    - 클라이언트는 서버 연결 실패 시 직접 폴백 `TurnOutput`을 생성하여 스트림 종료 상태를 UI에 전달한다.
3. **상태 보존형 폴백 (State-preserving Fallback)**: 폴백 시 발생하는 `TurnOutput`은 입력 시점의 재화 스냅샷(`economy_snapshot`)을 그대로 유지하며, 비용(`cost`)은 0으로 설정하여 재화 HUD의 일관성을 보장한다. (RULE-005 준수)
4. **가시성 보장 (Observability)**: 에러 발생 시 `error` 이벤트를 통해 사용자에게 상황을 알리되, 시스템의 최종 상태는 항상 구조화된 `final` 데이터를 통해 확정한다.

---
_본 문서는 프로젝트의 진화에 따라 수시로 업데이트됩니다._
