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
│   ├── index.html         # 엔트리 HTML
│   ├── package.json       # 의존성 및 스크립트 고정
│   ├── tsconfig.json      # TS 설정 (엄격 모드)
│   ├── vite.config.ts     # Vite 설정
│   └── src/
│       ├── main.tsx       # 엔트리 포인트
│       ├── App.tsx        # 메인 컴포넌트 (고정 레이아웃 및 8개 패널)
│       ├── style.css      # CRT 테마 및 Grid 레이아웃 (SSOT)
│       └── vite-env.d.ts  # Vite 타입 정의
├── backend/               # 백엔드 (FastAPI + Pydantic)
│   ├── pyproject.toml     # Python 의존성 및 설정 (uv)
│   ├── uv.lock            # 의존성 락 파일
│   ├── src/
│   │   └── unknown_world/
│   │       ├── __init__.py # 패키지 루트 및 버전
│   │       └── main.py     # FastAPI 앱 엔트리포인트 (Health/CORS)
│   └── tests/
│       └── integration/
│           └── test_api.py # API 통합 테스트
└── vibe/                  # SSOT 문서 저장소
```

### 주요 디렉토리 책임

- **`frontend/`**: 게임 HUD, 액션 덱, 인벤토리, 씬 캔버스 등 사용자 인터페이스 담당. Zustand로 월드 상태 관리.
- **`backend/`**: Gemini API 연동, TurnOutput 생성 및 검증(Repair loop), SSE 스트리밍 담당.
- **`vibe/`**: 프로젝트의 모든 명세와 진행 상황을 기록하는 단일 진실 공급원(SSOT).

---

## 3. 핵심 아키텍처 원칙

1. **Stateful Orchestrator**: 단순 챗봇이 아닌 월드 상태(WorldState)를 유지하고 갱신하는 시스템.
2. **Structured Turn Contract**: 서버와 클라이언트는 엄격한 JSON Schema(`TurnOutput`)를 통해서만 통신.
3. **Decoupled UI**: 게임의 시각적 요소는 월드 상태로부터 독립적으로 렌더링(Data-driven UI).
4. **Resilient Pipeline**: LLM의 불안정한 출력을 Pydantic/Zod 이중 검증과 Repair loop로 방어.

---
_본 문서는 프로젝트의 진화에 따라 수시로 업데이트됩니다._
