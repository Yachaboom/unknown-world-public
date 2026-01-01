# 타입 체크(Type Check) 지침 — Unknown World

## 0. 근거(SSOT)와 목적

- **근거(우선순위)**: `vibe/prd.md` > `vibe/tech-stack.md` > `vibe/ref/*` > `.gemini/GEMINI.md`
- **목적(why type check)**:
  - PRD의 Hard gate(특히 `Schema OK`/`Consistency OK`)는 런타임 검증(Pydantic/Zod)만으로 충분하지 않습니다. 타입 체크는 “코드 변경 시점”에 더 빠르게 실패를 드러내 회귀를 줄입니다. (`vibe/prd.md`)
  - 기술스택이 **TypeScript + Python** 이므로, 언어별 타입체커를 분리해 운영합니다. (`vibe/tech-stack.md`)

## 1. 사용 도구(권장) 및 역할

### 1.1 Frontend(TypeScript): `tsc --noEmit`

- **도구**: TypeScript Compiler(`tsc`)
- **역할**: 컴파일 타임 타입 안정성 확보(런타임 이전에 오류 차단)

#### 설정 파일 템플릿: `frontend/tsconfig.json` (권장)

근거:
- 프론트 스택이 React/Vite/TS로 고정되어 있음. (`vibe/tech-stack.md`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",

    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,

    "useDefineForClassFields": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

### 1.2 Backend(Python): Pyright(권장) / MyPy(대안)

- **권장 도구**: Pyright
  - 이유: 속도/개발 경험이 좋아 “빠른 반복”에 유리. (`vibe/prd.md`)
- **대안**: MyPy
  - 이유: 팀/생태계 선호에 따라 선택 가능(단, 설정/플러그인 복잡도는 증가할 수 있음)

#### 설정 파일 템플릿: `backend/pyrightconfig.json` (권장)

근거:
- 백엔드가 Python 3.14 + FastAPI/Pydantic 기반. (`vibe/tech-stack.md`)

```json
{
  "include": ["."],
  "exclude": ["**/__pycache__", ".venv", "dist", "build"],
  "pythonVersion": "3.14",
  "typeCheckingMode": "basic",
  "reportMissingTypeStubs": "none"
}
```

> 참고: Pyright가 `3.14`를 아직 인식하지 못하면, CI에서 가장 최신 지원 버전(예: `3.13`/`3.12`)으로 낮추고 추후 상향합니다. (`vibe/tech-stack.md`의 Python 버전 고정 원칙)

## 2. 주요 규칙(핵심만) + 근거

- **Frontend는 `strict: true` 기본**
  - 근거: UI/상태/경제/스키마를 다루는 프로젝트 특성상 타입 경계가 깨지면 회복 비용이 큼. (`vibe/prd.md`)
- **Backend는 최소 `basic`에서 시작, 핵심 오케스트레이터 코어는 점진적으로 강화**
  - 근거: 초기 개발 속도(Playtest-driven)와 안정성의 균형. (`vibe/prd.md`)
- **런타임 검증(Pydantic/Zod)과 타입 체크를 중복으로 유지**
  - 근거: 모델 출력/외부 입력은 런타임 검증이 필수(스키마/복구 루프). (`vibe/prd.md`, `.gemini/GEMINI.md`)

## 3. 실행 명령어(표준)

> 아래 커맨드는 “예상 구조(frontend/, backend/)”를 전제로 합니다. (`vibe/ref/frontend-style-guide.md`, `vibe/prd.md`의 디렉토리 예시)

### Frontend

- **Type check**: `cd frontend && pnpm run typecheck`

예시 scripts:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

### Backend

- **Type check**: `cd backend && pyright`

## 4. 자동화 통합(scripts / hooks / CI)

### 4.1 Git hooks(선택)

- 커밋 훅에서 전체 타입체크는 느릴 수 있으므로:
  - 로컬: “짧은 체크(선택)” 또는 “pre-push”로 이동
  - CI: 항상 전체 타입체크 실행

### 4.2 CI(예시: GitHub Actions)

```yaml
name: typecheck
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.12.0
      - name: Enable Corepack (pnpm)
        run: corepack enable
      - name: Typecheck frontend
        run: |
          cd frontend
          pnpm install --frozen-lockfile
          pnpm run typecheck
      - name: Typecheck backend
        run: |
          cd backend
          python -m pip install -U pip pyright
          pyright
```


