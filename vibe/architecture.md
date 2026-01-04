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
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── style.css
│       └── vite-env.d.ts
├── backend/               # 백엔드 (FastAPI + Pydantic)
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── src/
│   │   └── unknown_world/
│   │       ├── __init__.py
│   │       └── main.py
│   └── tests/
│       └── integration/
│           └── test_api.py
├── shared/                # 공유 리소스 (SSOT)
│   ├── README.md
│   └── schemas/
│       └── turn/
│           ├── turn_input.schema.json
│           └── turn_output.schema.json
└── vibe/                  # SSOT 문서 저장소
```

### 주요 디렉토리 책임

- **`frontend/`**: 게임 HUD, 액션 덱, 인벤토리, 씬 캔버스 등 사용자 인터페이스 담당. Zustand로 월드 상태 관리.
- **`backend/`**: Gemini API 연동, TurnOutput 생성 및 검증(Repair loop), SSE 스트리밍 담당.
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
    - **정리**: `pnpm kill:port`는 8001~8020 전 대역을 대상으로 동작합니다.
4. **도구 설정 SSOT**:
    - **Python (Backend)**: `backend/pyproject.toml` (Ruff, Pyright, uv 의존성)
    - **TypeScript (Frontend)**: `frontend/package.json` (pnpm), `frontend/tsconfig.json` (TS)

---

## 4. 핵심 아키텍처 원칙

1. **Stateful Orchestrator**: 단순 챗봇이 아닌 월드 상태(WorldState)를 유지하고 갱신하는 시스템.
2. **Structured Turn Contract**: 서버와 클라이언트는 엄격한 JSON Schema(`TurnOutput`)를 통해서만 통신.
3. **Decoupled UI**: 게임의 시각적 요소는 월드 상태로부터 독립적으로 렌더링(Data-driven UI).
4. **Resilient Pipeline**: LLM의 불안정한 출력을 Pydantic/Zod 이중 검증과 Repair loop로 방어.

---
_본 문서는 프로젝트의 진화에 따라 수시로 업데이트됩니다._
