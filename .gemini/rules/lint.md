# 린트(Lint) 지침 — Unknown World

## 0. 근거(SSOT)와 목적

- **근거(우선순위)**: `vibe/prd.md` > `vibe/tech-stack.md` > `vibe/ref/*` > `.gemini/GEMINI.md`
- **프로젝트 요구(why lint)**:
  - PRD의 **Hard gate**(`Schema OK`, `Economy OK`, `Safety OK`, `Consistency OK`)를 “항상 깨지지 않게” 유지하려면, 런타임 이전에 오류/안티패턴을 줄이는 린트가 필요합니다. (`vibe/prd.md`)
  - 기술스택이 **React+Vite+TypeScript**(프론트) + **Python+FastAPI**(백) 이므로, 언어별 표준 린트 도구를 명확히 분리합니다. (`vibe/tech-stack.md`)
  - ko/en 혼합 출력 금지, 비밀정보 커밋 금지 등 전역 금칙과 충돌하지 않도록 린트/자동화는 “안전한 기본값”을 사용합니다. (`.gemini/GEMINI.md`)

## 1. 분석 결과(언어/프레임워크/컨벤션)

- **Frontend**: React 19 + Vite 7 + TypeScript 5.9 (`vibe/tech-stack.md`)
- **Backend**: Python 3.14 + FastAPI + Pydantic (`vibe/tech-stack.md`)
- **기존 코드 컨벤션**:
  - 현재 레포에는 코드/설정 파일이 아직 없습니다(`package.json`, `tsconfig.json`, `pyproject.toml` 미존재).
  - 대신 문서가 예상하는 구조가 존재합니다: `frontend/` 폴더, 단일 `frontend/src/style.css` 등. (`vibe/ref/frontend-style-guide.md`)
  - 따라서 아래 지침은 “초기 표준(bootstrap)”이며, 실제 코드가 생기면 lockfile/설정파일을 SSOT로 승격합니다.

## 2. 린트 도구(권장) 및 역할 분리

### 2.1 Frontend (TS/TSX): ESLint

- **도구**: ESLint(Flat Config) + TypeScript ESLint + React/Hook 플러그인
- **역할**: 잠재 버그(미사용/의존성 배열 누락/잘못된 훅 사용 등)와 유지보수성 저하 패턴을 차단

#### 설정 파일 템플릿: `frontend/eslint.config.mjs` (권장)

```javascript
// frontend/eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier, // formatting rule 충돌 방지(Prettier는 별도 실행)
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "unused-imports": unusedImports,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // React 17+ new JSX transform(React 19 포함): React import 강제 금지
      "react/react-in-jsx-scope": "off",

      // TS가 타입을 가지므로 prop-types는 비활성
      "react/prop-types": "off",

      // unused import는 에러(자동 수정 가능)
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    ignores: ["dist/**", "build/**", "coverage/**", "node_modules/**"],
  },
];
```

#### 패키지 의존성(예시)

- `eslint`
- `typescript-eslint`
- `eslint-plugin-react`
- `eslint-plugin-react-hooks`
- `eslint-plugin-unused-imports`
- `eslint-config-prettier`
- `globals`

> 버전은 실제 코드 도입 시점에 lockfile로 고정합니다. (`vibe/tech-stack.md`의 “lockfile 고정” 원칙)

### 2.2 Backend (Python): Ruff

- **도구**: Ruff
- **역할**: 문법/스타일/버그 패턴(불필요 import, 잘못된 비교, 위험한 패턴 등) 조기 탐지 + 자동 수정

#### 설정 파일 템플릿: `backend/pyproject.toml` 내 Ruff 블록(권장)

```toml
# backend/pyproject.toml (일부)
[tool.ruff]
line-length = 100

# tech-stack: Python 3.14.0
# ruff가 아직 py314를 지원하지 않으면, CI에서 가장 최신 지원 버전으로 하향(py312/py313 등) 후 추후 상향.
target-version = "py314"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "SIM", "RUF"]
ignore = ["E501"] # 라인 길이는 formatter/Prettier 정책과 함께 관리(중복 경고 방지)
fixable = ["ALL"]
```

## 3. 주요 규칙(핵심만) + 근거

- **미사용 코드(변수/임포트) 금지**
  - 근거: 유지보수/리팩토링 비용을 낮춰 “항상 플레이 가능한 빌드” 반복 속도를 높임. (`vibe/prd.md`)
- **React Hooks 규칙 엄수**
  - 근거: 훅 사용 오류는 런타임에서만 폭발하기 쉬움(디버깅 비용↑) → Hard gate(일관성)에도 악영향. (`vibe/prd.md`)
- **import 정리(정렬/중복/순환 최소화)**
  - 근거: 모듈 경계가 커지는 프로젝트 특성상(오케스트레이터/상태/아티팩트) import 위생이 곧 구조 안정성. (`vibe/prd.md`)
- **자동 수정 우선**
  - 근거: PRD가 요구하는 빠른 반복(Playtest-driven)과 정합. (`vibe/prd.md`)

## 4. 실행 명령어(표준)

> 아래 커맨드는 “예상 구조(frontend/, backend/)”를 전제로 합니다. (`vibe/ref/frontend-style-guide.md`, `vibe/prd.md`의 디렉토리 예시)

### Frontend

- **Lint(검사)**: `cd frontend && pnpm run lint`
- **Lint(자동 수정)**: `cd frontend && pnpm run lint:fix`

### Backend

- **Lint(검사)**: `cd backend && ruff check .`
- **Lint(자동 수정)**: `cd backend && ruff check . --fix`

## 5. 자동화 통합(scripts / hooks / CI)

### 5.1 scripts (예시)

- **frontend `package.json`**:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

- **backend**(예시): `ruff check .` 를 CI에서 직접 실행하거나, `Makefile`/`justfile`로 래핑합니다.

### 5.2 Git hooks (선택)

- **원칙**: “커밋 전에 빠르게” (staged 파일만) / “CI에서 전체”를 보장
- 예시(개념): `lint-staged` + `husky` 또는 `lefthook`로 `eslint --fix` / `ruff --fix`를 staged에만 적용

### 5.3 CI (예시: GitHub Actions)

```yaml
name: quality
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.12.0
      - name: Enable Corepack (pnpm)
        run: corepack enable
      # frontend
      - name: Lint frontend
        run: |
          cd frontend
          pnpm install --frozen-lockfile
          pnpm run lint
      # backend
      - name: Lint backend
        run: |
          cd backend
          python -m pip install -U pip ruff
          ruff check .
```


