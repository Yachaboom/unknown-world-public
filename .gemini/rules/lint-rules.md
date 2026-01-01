# Codrag 코드 품질 지침 (Lint / Format / Type Check)

> **[적용 컨텍스트]**: lint, format, type-check, ruff, pyright, uv, ci, gitlab, quality  
>
> **[설명]**: Codrag는 **Ruff(린트+포맷)** + **Pyright(타입체크)** 를 표준 도구로 사용합니다.  
> 이 문서는 “무엇을/왜/어떻게”를 한 번에 확인할 수 있도록 **설정(SSOT) 발췌 + 실행 명령어 + 자동화(CI/Hook) 통합 방법**을 제공합니다.

---

## 1. 분석 요약 (프로젝트에 맞는 선택)

- **주 사용 언어/프레임워크**
  - **Backend**: Python + FastAPI (`codrag/main.py`)
  - **Frontend**: 빌드 없는 정적 HTML/CSS/JS (`static/`)
- **품질 도구(현행)**
  - **Ruff**: 린트 + 포맷 (근거: `docs/tech-stack.md`, `vibe/tech-stack.md`, `pyproject.toml`)
  - **Pyright**: 타입체크(basic) (근거: `docs/tech-stack.md`, `vibe/tech-stack.md`, `pyproject.toml`)
  - **uv**: 개발/CI 패키지 매니저 (근거: `README.md`, `.gitlab-ci.yml`)
- **기존 코드 컨벤션(설정 기반)**
  - **라인 길이 88**, **double quotes**, import 정렬 포함 (근거: `pyproject.toml`의 Ruff 설정)
  - 타입체크는 **basic 모드** (근거: `pyproject.toml`의 Pyright 설정)
- **전역 지침 정합성**
  - 단일 FastAPI + 정적 프론트 + 파일 영속화 구조 유지 (근거: `.gemini/rules/red-line.md`, `.gemini/GEMINI.md`)
  - “재현 가능성”을 위해 CI는 **`uv sync --frozen`** 로 lock 기반 설치 (근거: `.gitlab-ci.yml`)

---

## 2. 사용 도구 및 설정(SSOT) — 설정 파일 내용 발췌

### 2.1 Ruff (Lint + Format)

- **설정 위치**: `pyproject.toml`
- **근거**: `docs/tech-stack.md` / `vibe/tech-stack.md` 에서 Code Quality 도구로 Ruff를 채택

```toml
# pyproject.toml (발췌)
[tool.ruff]
line-length = 88
target-version = "py312"
exclude = [
    ".venv",
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".gemini",
    "codrag/prompts",
    "data",
    "memory-bank",
    "ready-prompts",
    "tmp"
]

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP"]
ignore = ["E501"]

[tool.ruff.format]
quote-style = "double"
```

### 2.2 Pyright (Type Check)

- **설정 위치**: `pyproject.toml`
- **근거**: `docs/tech-stack.md` / `vibe/tech-stack.md` 에서 Type Checker 도구로 Pyright를 채택

```toml
# pyproject.toml (발췌)
[tool.pyright]
venvPath = "."
venv = ".venv"
typeCheckingMode = "basic"
exclude = [".venv", "**/__pycache__", "data", ".uv_cache"]
```

### 2.3 CI에서의 “표준 커맨드”(사실상 SSOT)

- **설정 위치**: `.gitlab-ci.yml`
- **근거**: CI가 실제로 실행하는 커맨드가 “정답”이며, 로컬도 동일 커맨드로 맞추는 것이 가장 안전

```yaml
# .gitlab-ci.yml (발췌)
before_script:
  - uv sync --frozen --all-extras --dev

lint:
  script:
    - uv run ruff check .
    - uv run ruff format --check .

type-check:
  script:
    - uv run pyright
```

---

## 3. 실행 명령어 (로컬)

> 아래 커맨드는 **레포 루트**에서 실행합니다.

### 3.1 개발 도구 설치/동기화

- **권장(개발/품질 도구 포함)**:

```bash
pip install uv
uv sync --all-extras --dev
```

- **재현성 강제(선택)**: `uv.lock`만으로 설치하고 싶다면(예: CI와 동일 재현)

```bash
uv sync --frozen --all-extras --dev
```

### 3.2 포맷(자동 수정)

```bash
uv run ruff format .
```

### 3.3 린트

- **검사(수정 없음)**:

```bash
uv run ruff check .
```

- **자동 수정(가능한 항목만)**:

```bash
uv run ruff check --fix .
```

### 3.4 타입체크

```bash
uv run pyright
```

### 3.5 권장 실행 순서(로컬 표준 플로우)

```bash
uv run ruff format .
uv run ruff check --fix .
uv run ruff check .
uv run ruff format --check .
uv run pyright
```

---

## 4. 주요 규칙(무엇을 강제하는가) + 근거

- **Ruff로 “린트+포맷”을 통합**
  - **이유**: 도구 수를 줄여 로컬/CI 불일치 가능성을 줄임
  - **근거**: `docs/tech-stack.md`, `vibe/tech-stack.md`(Code Quality: Ruff)
- **라인 길이 88 + `E501`(line too long) 무시**
  - **이유**: 포매터가 기본 스타일을 책임지고, 린트는 버그/품질 규칙에 집중
  - **근거**: `pyproject.toml` → `[tool.ruff] line-length=88`, `[tool.ruff.lint] ignore=["E501"]`
- **선택된 린트 규칙 셋**
  - **E/F**: 기본 문법/오류
  - **I**: import 정렬(= isort 역할)
  - **B**: 버그성 패턴(Bugbear)
  - **UP**: 최신 Python 권장 패턴(업그레이드)
  - **근거**: `pyproject.toml` → `[tool.ruff.lint] select=[...]`
- **Pyright는 `basic` 모드**
  - **이유**: 운영 속도/노이즈를 과도하게 올리지 않으면서 타입 안정성 확보(점진 강화 가능)
  - **근거**: `pyproject.toml` → `[tool.pyright] typeCheckingMode="basic"`
- **Frontend(JS/HTML/CSS)는 “빌드 없는 정적” 원칙 유지**
  - **이유**: 번들러/TS 도입은 아키텍처/운영 복잡도를 증가시키므로 기본값으로 두지 않음
  - **근거**: `.gemini/rules/red-line.md`(정적 프론트 유지), `.gemini/rules/static-frontend-style.md`

---

## 5. 자동화 통합 방법 (scripts, hooks, CI)

### 5.1 Scripts(로컬/팀 표준화)

- **추천**: “CI와 동일한 커맨드”를 팀 표준으로 사용합니다.
  - Lint: `uv run ruff check .`
  - Format check: `uv run ruff format --check .`
  - Type check: `uv run pyright`
- **참고**: `vibe/commands/lint-check.md`는 이 파일(`.gemini/rules/lint-rules.md`)을 SSOT로 사용하도록 작성되어 있습니다.

### 5.2 Git Hooks(선택)

> 별도 도구를 추가하지 않고도 `.git/hooks/pre-commit`에 스크립트를 두어 실행할 수 있습니다.  
> (자동 수정이 발생하면 `git add`가 다시 필요할 수 있습니다.)

```bash
#!/usr/bin/env bash
set -euo pipefail

uv run ruff format .
uv run ruff check --fix .
uv run ruff check .
uv run ruff format --check .
uv run pyright
```

### 5.3 CI(현행: GitLab CI)

- **현행 파이프라인**: `.gitlab-ci.yml`
  - 설치: `uv sync --frozen --all-extras --dev`
  - 린트: `uv run ruff check .`
  - 포맷 검사: `uv run ruff format --check .`
  - 타입체크: `uv run pyright`
- **원칙**: CI가 “통과” 기준이며, 로컬은 CI 커맨드로 재현 가능해야 합니다.


