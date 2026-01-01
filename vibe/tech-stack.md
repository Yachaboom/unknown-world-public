# [Unknown World] 기술 스택 가이드 (MVP)

- **기준 문서**: `vibe/prd.md`, `vibe/ref/*`
- **원칙**: Prompt-only wrapper 회피(상태/오케스트레이터/아티팩트), 구조화 출력(JSON Schema) 우선, 비용·지연 제어 내장
- **버전 기준일**: 2026-01-01 (아래 버전으로 lockfile 고정)

## 1. 기술 스택 요약 (한눈에 보기)

- **Frontend (Web UI)**
  - React `19.2.3` / React DOM `19.2.3`
  - Vite `7.3.0` (빌드/번들)
  - TypeScript `5.9.3`
  - 패키지 매니저: **pnpm** (lockfile: `pnpm-lock.yaml`)
  - 상태: Zustand `5.0.9` (WorldState/Inventory/UI/Economy)
  - 스키마: Zod `4.3.4` (TurnOutput JSON 검증)
  - DnD: `@dnd-kit/core 6.3.1` + `@dnd-kit/sortable 10.0.0`
  - i18n: i18next `25.7.3` + react-i18next `16.5.1`

- **Backend (Orchestrator API)**
  - Python `3.14.0`
  - FastAPI `0.128.0` (async)
  - Uvicorn `0.40.0` (ASGI)
  - Pydantic `2.12.5` (스키마/검증/직렬화)

- **Streaming / Realtime**
  - SSE (Server-Sent Events): 텍스트 타자효과 + 단계(Queue/Badges) 진행 상황 스트리밍
  - (확장) WebSocket: 양방향 실시간 상호작용이 필요할 때만

- **Access (Demo Profiles for Reviewers)**
  - 데모 프로필(심사자용 프리셋 유저) 3종(페르소나 기반)
  - MVP는 “로그인/가입 없이 즉시 시작 + 즉시 리셋” 우선(외부 OAuth는 후순위)

- **GenAI (Gemini + Vertex AI)**
  - 인증: **Vertex AI 서비스 계정**(백엔드에서만)
  - Google GenAI SDK (Python): `google-genai 1.56.0`
  - (선택) Vertex 플랫폼 연동: `google-cloud-aiplatform 1.132.0`
  - (선택) 이미지/아티팩트 저장: `google-cloud-storage 3.7.0`
  - **모델 라인업(모델 ID 고정)**
    - 텍스트: `gemini-3-flash-preview`(FAST), `gemini-3-pro-preview`(QUALITY)
    - 이미지(생성/편집): `gemini-3-pro-image-preview`(EDIT/QUALITY, 고정)
    - 비전/공간: `gemini-3-flash-preview`(bbox/segmentation)

- **Infra (배포)**
  - 컨테이너: Docker
  - 런타임: Node.js `24.12.0` (프론트 빌드), Python `3.14.0` (백엔드)
  - 실행: Cloud Run (권장) / 로컬 개발

### 1.1 코드 품질(린트/포맷/타입체크) 도구 버전 (SSOT)

> 아래 버전은 **2026-01-01 기준 “최신 안정(latest)”**을 레지스트리에서 직접 조회한 값이며,
> 실제 프로젝트에서는 lockfile/설정으로 고정합니다.
>
> - npm: `npm view <package> version`
> - PyPI: `python -m pip index versions <package>`

- **Frontend**
  - pnpm `10.27.0` (권장: `package.json`에 `packageManager: "pnpm@10.27.0"` 명시)
  - ESLint `9.39.2` + `@eslint/js 9.39.2`
  - typescript-eslint `8.51.0`
  - eslint-plugin-react `7.37.5`
  - eslint-plugin-react-hooks `7.0.1`
  - eslint-plugin-unused-imports `4.3.0`
  - eslint-config-prettier `10.1.8`
  - globals `16.5.0`
  - Prettier `3.7.4`

- **Backend**
  - Ruff `0.14.10`
  - Pyright `1.1.407`

## 2. 기술 선택 매트릭스 (압축)

| PRD 요구사항                   | 선택 기술                       | 핵심 이유 (3~4단어) |
| ------------------------------ | ------------------------------- | ------------------- |
| 텍스트 “타자 효과” 스트리밍    | FastAPI + SSE                   | 저지연/단순성       |
| “채팅 앱”이 아닌 게임 UI       | React + 상태 분리               | 고충실도 UI         |
| UI/상태/비용을 기계적으로 처리 | Structured Outputs(JSON Schema) | 파싱/검증 강제      |
| 스키마 깨짐 자동 복구          | Pydantic + Zod + Repair loop    | 실패 내성           |
| 클릭 가능한 핫스팟 좌표        | 0~1000 정규화                   | 비전 bbox 호환      |
| 인벤토리 Drag & Drop           | dnd-kit                         | 접근성/제어         |
| ko/en 동시 지원                | i18next                         | 즉시 토글           |
| 심사/데모 즉시 접근            | 데모 프로필(프리셋 유저)        | 온보딩 10초         |
| 이미지 “선택적” 생성/편집      | `gemini-3-pro-image-preview`    | 편집/일관성 우선    |
| 이미지 업로드→단서/아이템화    | Gemini 비전 + Files API         | 멀티모달 핵심       |
| API 키 노출 없이 Gemini 사용   | Vertex AI 서비스계정            | 보안/운영 단순      |

## 3. 대안 기술 비교 (빠른 판단)

- **Next.js(App Router) vs Vite**: MVP는 SSR/라우팅 복잡도보다 “빠른 반복 + 고정 레이아웃”이 핵심 → Vite 선택
- **NestJS(Node) vs FastAPI(Python)**: 오케스트레이션/검증/스키마 중심 구현을 Python+FastAPI로 빠르게 → FastAPI 선택
- **WebSocket vs SSE**: 현재 요구는 “서버→클라이언트 스트리밍”이 대부분 → SSE 우선, WS는 확장
- **Redux Toolkit vs Zustand**: 상태가 많지만 팀 속도가 우선 → 러닝커브 낮은 Zustand
- **Tailwind vs CSS 변수 기반(단일 CSS)**: 스타일 가이드가 CRT 변수/글로우를 강하게 요구 → Tailwind 대신 CSS 변수

## 4. 리스크 요약 (현실적)

- **LLM 출력 불안정(스키마/일관성)**: JSON Schema 강제 + 서버/클라 이중 검증 + 자동 repair + 안전한 폴백(텍스트-only)
- **비용/지연(특히 이미지/Thinking)**: 재화 시스템으로 호출량 제어 + 텍스트(Flash/Pro) 티어링 + 이미지 호출 빈도/해상도 정책 + Lazy image loading
- **Gemini 3 제약 + 데모 기능 노출 위험**: 공식 SDK 사용(시그니처 자동 처리) + tool 설계 분리 + 데모 프로필은 데모/스테이징에서만 활성화

## 5. 레퍼런스 링크 모음 (핵심)

- **PRD/가이드**: `vibe/prd.md`, `vibe/ref/standard-guide.md`, `vibe/ref/frontend-style-guide.md`
- **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/), [Zod](https://zod.dev/), [Zustand](https://zustand-demo.pmnd.rs/), [dnd-kit](https://docs.dndkit.com/), [i18next](https://www.i18next.com/), [react-i18next](https://react.i18next.com/)
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), [Pydantic](https://docs.pydantic.dev/)
- **Streaming**: [MDN: Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- **Gemini / Structured Outputs**: [Gemini API](https://ai.google.dev/docs), [Text generation](https://ai.google.dev/gemini-api/docs/text-generation), [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Image generation](https://ai.google.dev/gemini-api/docs/image-generation), [Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- **GCP**: [Vertex AI](https://cloud.google.com/vertex-ai), [Service accounts](https://cloud.google.com/iam/docs/service-accounts), [Cloud Run](https://cloud.google.com/run), [Cloud Storage](https://cloud.google.com/storage/docs)

## 6. 팀 온보딩 체크리스트 (간단)

- **1) 제품/UX 이해**: PRD 6~9장(게임 UI·경제·Autopilot) 훑고 “채팅 UI 금지” 원칙 공유
- **2) 구조화 출력 이해**: TurnOutput을 “JSON Schema 우선”으로 생각(텍스트는 UI용 필드)
- **3) 모델 운영 감각**: Flash/Pro 티어, 이미지 편집은 Pro+시그니처가 핵심임을 숙지
- **4) 스트리밍 UX 합의**: SSE 기준으로 TTFB/단계 배지(Queue/Badges) 표준화
- **5) GCP 권한 세팅**: 서비스 계정/Vertex AI 권한/배포 런타임(Cloud Run) 확인
- **6) 데모 시나리오 리플레이**: “드래그→클릭→룰 변형→엔딩 리포트” 10분 루프를 팀 공통 기준으로 고정
- **(필수) 데모 프로필 점검**: 3종 프리셋이 “즉시 시작/즉시 리셋” 동작하는지 데모 전 확인
