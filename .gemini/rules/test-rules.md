# 테스트 실행 및 작성 규칙 — Unknown World

이 파일은 `.gemini/commands/test-exec.toml` 및 `vibe/commands/test-exec.md`가 **항상 참조하는** 테스트 실행·작성 지침입니다.  
test-exec 커맨드 실행 시 작업 시작 전 본 문서를 반드시 읽고 준수합니다.

---

## 0. 근거(SSOT)

- **기술 스택·도구 버전**: `vibe/tech-stack.md` (기준 문서)
- **테스트 절차·원인 판별**: test-exec 지시서 내 5.3 프로토콜, 7.3 실행 규칙
- **충돌 시 우선순위**: RED-LINE > 린트 지침 > 기술스택 > 사양서 > 아키텍처 > 기타 지침

---

## 1. 기술 스택 요약(테스트 관점)

`vibe/tech-stack.md` 기준:

| 영역 | 런타임/도구 | 테스트 도구 | 패키지 매니저 |
|------|-------------|-------------|----------------|
| **Backend** | Python 3.14, FastAPI, Pydantic | pytest, pytest-asyncio, pytest-cov, httpx | uv (의존성/실행) |
| **Frontend** | React 19, Vite 7, TypeScript 5.9 | Vitest, @vitest/coverage-v8, @testing-library/react | pnpm |

- **Backend 린트/타입**: Ruff `0.14.10`, Pyright `1.1.407` (테스트 작성 후 `.gemini/rules/lint-rules.md` 절차 적용)
- **Frontend 린트/타입**: ESLint, Prettier, `tsc --noEmit` (동일하게 lint-rules.md 적용)

---

## 2. 테스트 디렉터리 구조

- **Backend** (`backend/tests/`):
  - `unit/` — 단위 테스트 (서비스·모델·오케스트레이터 등)
  - `integration/` — API·스트리밍·외부 연동 검증
  - `qa/` — 수동 검증·에셋·매니페스트 등
  - `fixtures/` — 테스트 데이터(필요 시)
- **Frontend**: 소스와 동일 트리 또는 `src/**/*.test.ts(x)` / `*.test.ts(x)` (Vitest 기본 규칙)

테스트 피라미드 비율: 단위 70% / 통합 20% / E2E·기타 10%.

---

## 3. 표준 테스트 실행 명령어

> 셸에서 **`&&` 체이닝은 사용하지 않는다**. Unit / Integration / Frontend 등 **단계별로 개별 도구 호출**로 실행한다.  
> (test-exec 지시서 7.3 Shell 실행 규칙)

### 3.1 Backend (pytest)

- **작업 디렉터리**: `backend/` (프로젝트 루트가 아닌 backend에서 실행).
- **실행자**: `uv run`으로 가상환경·의존성 보장.

| 목적 | 명령어 |
|------|--------|
| 전체 테스트 | `cd backend` 후 `uv run pytest tests/ -v` |
| 단위만 | `cd backend` 후 `uv run pytest tests/unit/ -v` |
| 통합만 | `cd backend` 후 `uv run pytest tests/integration/ -v` |
| 특정 파일 | `cd backend` 후 `uv run pytest tests/unit/services/test_genai_client.py -v` |
| 특정 테스트 | `cd backend` 후 `uv run pytest tests/integration/test_turn_streaming.py::test_turn_streaming_success -v` |
| 커버리지 | `cd backend` 후 `uv run pytest tests/ --cov=src/unknown_world --cov-report=term-missing` (필요 시) |

### 3.2 Frontend (Vitest)

- **작업 디렉터리**: `frontend/`.
- **실행**: pnpm 스크립트 사용 (`package.json`의 `test`, `test:coverage`).

| 목적 | 명령어 |
|------|--------|
| 전체 테스트 | `cd frontend` 후 `pnpm test` |
| 특정 파일 | `cd frontend` 후 `pnpm test src/App.test.tsx` (또는 해당 경로) |
| 상세 출력 | `cd frontend` 후 `pnpm test -- --reporter=verbose` |
| 커버리지 | `cd frontend` 후 `pnpm test:coverage` |

---

## 4. 실행 순서 및 실패 시 절차

1. **Unit Tests** → 실패 시 test-exec 지시서 **5.3 원인 판별 프로토콜** 실행.
2. **Integration Tests** → 동일하게 5.3 프로토콜.
3. (선택) Performance / Security / E2E → 동일.

각 단계 실패 시: 중단 → 5.3 실행 → 원인 분석 → 수정 → 해당 단계부터 재실행.  
**테스트 수정**은 5.3 및 9) 테스트 수정 체크리스트 완료 후에만 허용.

---

## 5. 품질 임계치(목표)

| 지표 | 최소 | 권장 |
|------|------|------|
| 테스트 통과율 | 100% | 100% |
| 라인 커버리지 | 80% | 90% |
| 브랜치 커버리지 | 75% | 85% |
| 함수 커버리지 | 90% | 95% |
| 조건 커버리지 | 70% | 80% |

미달 시: 미커버 영역 식별 → 필요 테스트 추가 → 예외 사유 문서화(해당 시).

---

## 6. 이번 유닛과 무관한 이슈 기록

테스트 중 **이번 유닛 범위 밖**의 실패·플래키·보류 이슈는 **`vibe/debt-log.md`**에 반드시 기록.  
형식은 test-exec 지시서 8.2 참조.

---

## 7. 참조 문서

- **필수 선행 읽기**: `.gemini/rules/red-line.md`, `vibe/tech-stack.md`, `.gemini/rules/lint-rules.md`
- **실행·프로토콜 상세**: `.gemini/commands/test-exec.toml`(또는 `vibe/commands/test-exec.md`) 내 5.3, 7.3, 9), 11.6
- **검증 시나리오 예시**: `vibe/unit-runbooks/*.md` (예: U-060-test-fix-runbook.md, U-040-schema-alignment-runbook.md)
