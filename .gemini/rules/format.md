# 포맷(Format) 지침 — Unknown World

## 0. 근거(SSOT)와 목적

- **근거(우선순위)**: `vibe/prd.md` > `vibe/tech-stack.md` > `vibe/ref/*` > `.gemini/GEMINI.md`
- **목적(why format)**:
  - PRD의 “항상 플레이 가능한 빌드 + 빠른 반복”을 위해, 리뷰/리팩토링에서 의미 없는 diff(공백/정렬)를 제거합니다. (`vibe/prd.md`)
  - Windows 환경을 포함하므로(라인엔딩/인코딩 이슈), 포맷 정책을 고정해 크로스플랫폼 충돌을 줄입니다. (`.gemini/GEMINI.md`)

## 1. 사용 도구(권장) 및 역할

- **Frontend/Docs 포맷터**: Prettier
  - 대상: `frontend/**/*.{ts,tsx,js,jsx,json,css,md,yml,yaml}`
- **Backend(Python) 포맷터**: Ruff formatter (`ruff format`)
  - 대상: `backend/**/*.py`

> 린트와 포맷은 분리합니다: ESLint에는 `eslint-config-prettier`를 적용해 “포맷 규칙 충돌”을 막고, 포맷은 Prettier/Ruff가 담당합니다. (`.gemini/rules/lint.md`)

## 2. 설정 파일 템플릿(권장)

### 2.1 `.editorconfig` (레포 루트)

근거:

- Windows 포함 환경에서 editor/IDE 차이에 의한 공백/개행 흔들림을 최소화. (`.gemini/GEMINI.md`)

```editorconfig
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,jsx,ts,tsx,json,css,md,yml,yaml}]
indent_style = space
indent_size = 2

[*.py]
indent_style = space
indent_size = 4
```

### 2.2 `prettier.config.cjs` (레포 루트)

근거:

- 프론트는 React/Vite/TS 기반이며, 문서(ko/en 포함)는 reflow가 불필요한 경우가 많아 `proseWrap: preserve`를 기본으로 둡니다. (`vibe/tech-stack.md`, `vibe/prd.md`)

```javascript
// prettier.config.cjs
/** @type {import("prettier").Config} */
module.exports = {
  printWidth: 100,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  overrides: [
    // 문서는 의미적 줄바꿈을 유지(특히 한국어 문서)
    { files: ['*.md'], options: { proseWrap: 'preserve' } },
  ],
};
```

### 2.3 (선택) `.gitattributes` (레포 루트)

근거:

- CRLF/LF 섞임은 PR diff를 오염시키고 리뷰 비용을 높입니다. Windows 포함 환경에서 특히 효과가 큽니다. (`.gemini/GEMINI.md`)

```gitattributes
# .gitattributes
* text=auto eol=lf
```

### 2.4 Ruff formatter 설정(`backend/pyproject.toml` 일부)

근거:

- 백엔드는 Python/FastAPI이며, 포맷을 고정해 코드리뷰/리플레이 회귀 디버깅 비용을 낮춥니다. (`vibe/tech-stack.md`, `vibe/prd.md`)

```toml
# backend/pyproject.toml (일부)
[tool.ruff]
line-length = 100

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

## 3. 주요 규칙(핵심만) + 근거

- **라인 엔딩은 LF로 통일**
  - 근거: Windows 포함 크로스플랫폼 충돌 최소화. (`.gemini/GEMINI.md`)
- **문서(Markdown)는 의미적 줄바꿈을 보존**
  - 근거: ko/en 문서의 줄바꿈은 의미/가독성(특히 PRD/가이드)과 연결됨. (`vibe/prd.md`)
- **프론트는 2칸 들여쓰기(space)**
  - 근거: React/Vite 프로젝트의 기본 관행 + Prettier 기본 정책과 정합. (`vibe/tech-stack.md`)

## 4. 실행 명령어(표준)

> 아래 커맨드는 “예상 구조(frontend/, backend/)”를 전제로 합니다. (`vibe/ref/frontend-style-guide.md`, `vibe/prd.md`의 디렉토리 예시)

### Frontend/Docs (Prettier)

- **포맷 적용**: `cd frontend && pnpm run format`
- **포맷 체크(CI용)**: `cd frontend && pnpm run format:check`

예시 scripts:

```json
{
  "scripts": {
    "format": "prettier . --write",
    "format:check": "prettier . --check"
  }
}
```

### Backend (Ruff)

- **포맷 적용**: `cd backend && ruff format .`
- **포맷 체크(CI용)**: `cd backend && ruff format --check .`

## 5. 자동화 통합(scripts / hooks / CI)

### 5.1 Git hooks(선택)

- **원칙**: 커밋 전에 “staged 파일만” 포맷 → CI에서 “전체” 체크
- 예시(개념):
  - staged에 대해 `prettier --write` (frontend) + `ruff format` (backend) 실행
  - 실패 시 커밋 차단(포맷/린트/타입체크는 최소한 포맷부터)

### 5.2 CI(예시: GitHub Actions)

```yaml
name: format
on: [push, pull_request]
jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.12.0
      - name: Enable Corepack (pnpm)
        run: corepack enable
      - name: Check frontend formatting
        run: |
          cd frontend
          pnpm install --frozen-lockfile
          pnpm run format:check
      - name: Check backend formatting
        run: |
          cd backend
          python -m pip install -U pip ruff
          ruff format --check .
```
