# 코드 품질 규칙(엔트리) — Unknown World

이 파일은 `.gemini/commands/lint-check.toml` 및 `vibe/commands/lint-check.md`가 참조하는 **단일 엔트리 규칙**입니다.

세부 지침은 아래 3개 파일로 분리되어 있습니다(필수):
- `format.md` — 포맷(Prettier/Ruff format)
- `lint.md` — 린트(ESLint/Ruff check)
- `type-check.md` — 타입 체크(tsc/Pyright)

## 0. 근거(SSOT)

- `vibe/prd.md` > `vibe/tech-stack.md` > `vibe/ref/*` > `.gemini/GEMINI.md`

## 1. 분석 요약(언어/프레임워크/컨벤션)

- **Frontend**: React 19 + Vite 7 + TypeScript 5.9 (`vibe/tech-stack.md`)
- **Backend**: Python 3.14 + FastAPI + Pydantic (`vibe/tech-stack.md`)
- **현재 상태**: 코드/설정 파일이 아직 없으므로(`package.json`, `tsconfig.json`, `pyproject.toml` 미존재),
  아래 커맨드/템플릿은 문서가 예상하는 구조(`frontend/`, `backend/`)를 전제로 한 “초기 표준(bootstrap)”입니다.
  - 구조 근거: `vibe/ref/frontend-style-guide.md`, `vibe/prd.md`의 디렉토리 예시

## 1.1 패키지 매니저(pnpm) 사양

- **Frontend 패키지 매니저**: **pnpm 고정** (`vibe/tech-stack.md`)
- **lockfile**: `pnpm-lock.yaml` (CI에서는 `pnpm install --frozen-lockfile` 사용)
- **권장(재현성/Windows 포함)**: Node(Corepack) 기반으로 pnpm 활성화 → `corepack enable`

## 2. 사용 도구 및 설정 파일(템플릿 위치)

### 2.1 Frontend

- **Formatter**: Prettier
  - 설정 템플릿: `.editorconfig`, `prettier.config.cjs` (→ `format.md`)
- **Linter**: ESLint(Flat config)
  - 설정 템플릿: `frontend/eslint.config.mjs` (→ `lint.md`)
- **Type check**: TypeScript(`tsc --noEmit`)
  - 설정 템플릿: `frontend/tsconfig.json` (→ `type-check.md`)

### 2.2 Backend

- **Formatter/Linter**: Ruff (`ruff format`, `ruff check`)
  - 설정 템플릿: `backend/pyproject.toml` 내 `[tool.ruff]` (→ `format.md`, `lint.md`)
- **Type check**: Pyright(권장)
  - 설정 템플릿: `backend/pyrightconfig.json` (→ `type-check.md`)

## 3. 표준 실행 순서(권장)

`vibe/commands/lint-check.md`의 표준 절차와 정합되게, 아래 순서를 기본으로 합니다:

1. **Formatting** (자동)
2. **Linting & Fix** (자동 수정 우선)
3. **Static Analysis / Type Check** (잔여 오류를 “원인별”로 분리)

## 4. 실행 명령어(표준 커맨드)

> 표준 커맨드의 목적은 “자동화/CI/에이전트 실행”에서 일관된 인터페이스를 만드는 것입니다.
> 본 프로젝트는 **pnpm 고정 사양**입니다. (`vibe/tech-stack.md`)

### 4.1 Formatter Command

- **Frontend**: `cd frontend && pnpm run format`
- **Backend**: `cd backend && ruff format .`

### 4.2 Lint Command

- **Frontend(검사)**: `cd frontend && pnpm run lint`
- **Frontend(자동 수정)**: `cd frontend && pnpm run lint:fix`
- **Backend(검사)**: `cd backend && ruff check .`
- **Backend(자동 수정)**: `cd backend && ruff check . --fix`

### 4.3 Type Check Command

- **Frontend**: `cd frontend && pnpm run typecheck`
- **Backend**: `cd backend && pyright`

## 5. 자동화 통합 방법(scripts / hooks / CI)

- **scripts**
  - `format`, `format:check`, `lint`, `lint:fix`, `typecheck`를 표준 스크립트명으로 고정(도구 교체 시에도 인터페이스 유지)
- **hooks**
  - 커밋 전: staged 파일에만 포맷/자동수정 린트 적용(빠르게)
  - 타입체크/전체 린트는 CI에서 강제(느릴 수 있음)
- **CI**
  - PR마다 `format:check` + `lint` + `typecheck`를 실행해 회귀를 조기 차단
  - 예시 YAML/스크립트는 `format.md`, `lint.md`, `type-check.md`에 포함

