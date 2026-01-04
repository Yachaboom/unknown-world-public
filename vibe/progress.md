# 프로젝트 진행 상황

## [2026-01-04 18:30] RU-001-Q5: 버전 고정(SSOT) 강화: 루트 packageManager/engines 명시 및 backend dev 의존성 pin

### 작업 내용

- **제안서**: [RU-001-Q5] 버전 고정(SSOT) 강화: 루트 `packageManager`/엔진 명시 + backend dev 의존성 pin(uv.lock 기준)
- **개선 사항**:
    - 루트 `package.json`에 `packageManager: "pnpm@10.27.0"` 및 `engines.node: "24.12.0"` 명시하여 개발 도구 버전 SSOT 강화
    - `backend/pyproject.toml`의 개발 의존성(`pytest`, `httpx`)을 `uv.lock`에 해결된 버전으로 고정(pin)하여 버전 드리프트 방지
- **영향 범위**: `package.json`, `backend/pyproject.toml`

### 기술적 세부사항

- **SSOT 신호 강화**: 루트 디렉토리 진입 시점부터 일관된 도구 버전 사용을 유도하여 환경 차이에 의한 문제 선제 차단
- **백엔드 재현성**: 개발 의존성까지 명확히 pin 함으로써 `uv sync` 실행 시 항상 동일한 환경이 보장되도록 함

### 검증

- **수동 검증**: 루트 `package.json` 내용 확인 및 `backend/pyproject.toml`의 `==` 연산자 적용 확인 완료 (commit: f18f1ca)

---

## [2026-01-04 18:00] RU-001-S2: Vite strictPort 도입 및 포트 정리 스크립트 정합화

### 작업 내용

- **제안서**: [RU-001-S2] RULE-011 포트 대역 “엣지 케이스” 방지: Vite `strictPort`와 루트 kill 스크립트 범위 정합화
- **개선 사항**:
    - `frontend/vite.config.ts`에 `strictPort: true`를 적용하여 포트 충돌 시 예기치 않은 포트 이동(CORS 불일치 원인)을 원천 차단
    - 루트 `package.json`의 `kill:port` 스크립트가 RULE-011의 전체 대역(8001~8020)을 커버하도록 확장
    - `vibe/roadmap.md`의 실행 가이드를 실제 포트 정책과 일치시키고 충돌 시 대처 방법 명시
- **영향 범위**: `frontend/vite.config.ts`, `package.json`, `vibe/roadmap.md`

### 기술적 세부사항

- **Fail-fast 전략**: 포트 충돌 시 자동으로 다음 포트를 찾는 대신 에러를 발생시켜, 개발자가 명시적으로 대역 내 포트를 선택하도록 유도
- **스크립트 강화**: 프론트(8001-8010)와 백엔드(8011-8020)의 모든 가능 포트를 단일 커맨드로 정리 가능하게 함

### 검증

- **수동 검증**: `strictPort` 동작 확인 및 `kill:port` 범위 확장 확인 완료 (commit: a5b484f)

---

## [2026-01-04 17:00] RU-001-Q1: 실행 방법/문서/설정의 중복과 불일치 제거 (SSOT 통일)

### 작업 내용

- **제안서**: [RU-001-Q1] 실행 방법/문서/설정의 중복과 불일치 제거 (roadmap vs 코드 주석 vs 루트 스크립트 vs Pyright 설정)
- **개선 사항**:
    - 실행 커맨드 SSOT를 루트 `package.json`으로 확정하고, `vibe/roadmap.md` 및 `main.py` docstring을 이에 맞춰 통일
    - 포트 정책(RULE-011: 프론트 8001, 백엔드 8011)을 모든 문서와 실행 스크립트에 강제 적용
    - `pnpm -C` 옵션을 사용하여 경로 의존성 및 쉘 환경 차이에 따른 실행 오류 방지
    - Pyright 설정을 `backend/pyproject.toml`로 단일화하여 도구 설정 중복 제거 (Option B 적용)
- **영향 범위**: `vibe/roadmap.md`, `backend/src/unknown_world/main.py`, `package.json`, `backend/pyproject.toml`

### 기술적 세부사항

- **실행 표준화**: `uv run` 및 포트 명시적 지정을 통해 환경별 실행 결과 차이 제거
- **설정 단일화**: Pyright 검사 범위를 `src`로 고정하여 진단 일관성 확보

### 검증

- **수동 검증**: `pnpm dev:front` / `pnpm dev:back` 실행 시 각각 8001, 8011 포트에서 정상 동작 확인 완료

---

## [2026-01-04 16:30] RU-001-Q4: shared/ 기반 JSON Schema SSOT 도입 및 소비 경로 확정

### 작업 내용

- **제안서**: [RU-001-Q4] `shared/` 기반 JSON Schema SSOT(Option B) 디렉토리 도입 및 소비 경로 고정
- **개선 사항**:
    - `shared/schemas/turn/` 디렉토리에 `turn_input.schema.json` 및 `turn_output.schema.json` 도입
    - 백엔드(Pydantic)와 프론트엔드(Zod)의 계약 불일치(drift)를 방지하기 위한 단일 진실 공급원(SSOT) 구축
    - `shared/README.md`를 통해 공유 스키마 운영 전략(Option B) 명시
- **영향 범위**: `shared/` (신규), `vibe/unit-plans/RU-001[Mvp].md` (결정 사항 실현)

### 기술적 세부사항

- **스키마 설계**: PRD의 Turn 계약 규약을 반영하여 `turn_input`, `turn_output` 스키마 초기 버전 작성
- **구조적 강제**: `.gitignore` 수정(RU-001-S1 연동)을 통해 `shared/` 내 JSON 스키마가 안정적으로 추적되도록 보장

### 검증

- **수동 검증**: `shared/` 경로의 스키마 파일 존재 및 Git 추적 여부 확인 완료 (commit: 1c93e5b)

---

## [2026-01-04 02:45] RU-001-S1: .gitignore JSON 정책 리팩토링 및 shared/ 구조 도입

### 작업 내용

- **제안서**: [RU-001-S1] .gitignore의 광범위 *.json 차단 문제 해결
- **개선 사항**: 
    - `*.json` 전역 차단을 제거하고, `shared/**/*.json` (스키마 SSOT) 명시적 허용
    - 보안 강화를 위해 서비스 계정 및 크리덴셜 패턴(`*service_account*.json` 등) 상세 차단
    - `shared/` 디렉토리 구조 도입 및 보안 주의사항을 담은 `shared/README.md` 작성
    - 프론트엔드 빌드 아티팩트(`*.d.ts.map`, `*.js.map` 등) ignore 규칙 보강
- **영향 범위**: `.gitignore`, `shared/` (신규), `frontend/` (ignore 규칙)

### 기술적 세부사항

- **스키마 SSOT 기반 마련**: `shared/schemas/` 경로를 확보하여 향후 유닛(U-005 등)에서 활용 가능하도록 함
- **보안 가드**: `secrets/` 디렉토리를 팀 표준 보안 저장소로 격상하고, 해당 경로 내 JSON 강제 차단 유지

### 검증

- **수동 검증**: `git status`를 통해 `shared/` 내부 파일 추적 확인 및 임시 보안 파일 차단 여부 검토 완료
- **런북 참조**: `vibe/refactors/RU-001-S1.md` 내 검증 시나리오 준수

---

## [2026-01-04 02:05] U-004[Mvp]: CRT 테마/고정 레이아웃 스켈레톤 완료

### 구현 완료 항목

- **핵심 기능**: CSS Grid 기반 고정 8개 패널 레이아웃 및 CRT 터미널 테마 구현
- **추가 컴포넌트**: `Panel`, `NarrativeFeed` (로그 형태), `ActionDeck`, `GameHeader`
- **달성 요구사항**: [RULE-002] 채팅 버블 UI 금지 및 게임 HUD 구조 확보, [Frontend Style] CRT 테마 토큰 적용

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **CSS Grid**: 3열(Sidebar L/R, Center) 3행(Header, Main, Footer) 고정 레이아웃
- **CRT Effect**: Scanline overlay, Flicker animation, Glow text, Glitch effect
- **React 19**: 함수형 컴포넌트 기반 레이아웃 구성

**설계 패턴 및 아키텍처 선택**:

- **패널 슬롯 시스템**: 향후 각 기능 유닛이 독립적으로 채워질 수 있는 8개 고정 슬롯 구조
- **로그형 내러티브**: 타임라인 기반 피드로 구성하여 "채팅" 인상을 원천 차단

**코드 구조**:
frontend/
├── src/
│   ├── App.tsx (레이아웃 및 패널 구성)
│   └── style.css (CRT 테마 및 Grid 정의)

### 성능 및 품질 지표

- **반응형 최적화**: 1200px, 768px 브레이크포인트 기반 가변 레이아웃 검증 완료
- **상호작용**: CRT 오버레이가 클릭을 방해하지 않도록 `pointer-events: none` 처리

### 의존성 변경

- 추가된 외부 의존성 없음 (Native CSS/React 활용)

### 다음 단계

- [RU-001[Mvp]] 리팩토링: 디렉토리/설정 정리
- [U-005[Mvp]] TurnInput/TurnOutput 스키마(Pydantic) 설계

---

## [2026-01-04 01:25] U-003[Mvp]: 백엔드 FastAPI 초기화 완료

### 구현 완료 항목

- **핵심 기능**: FastAPI 0.128 + Python 3.14 기반 오케스트레이터 골격 구축
- **추가 컴포넌트**: `backend/src/unknown_world/main.py` (엔트리포인트), `backend/tests/integration/test_api.py` (API 테스트)
- **달성 요구사항**: [RULE-011] 백엔드 포트(8011) 및 CORS 정책 수립, [RULE-010] 기술 스택 버전 고정

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **FastAPI 0.128.0**: 비동기 오케스트레이터 API 프레임워크
- **uv**: 고속 패키지 관리 및 의존성 고정 (`uv.lock`)
- **Pydantic 2.12.5**: 헬스체크 응답 스키마 정의

**설계 패턴 및 아키텍처 선택**:

- **스키마 기반 헬스체크**: Pydantic 모델을 사용하여 구조화된 시스템 상태 반환
- **포트 범위 CORS**: 프론트엔드 개발 서버(8001~8010)와의 연동을 위한 화이트리스트 기반 CORS 설정

**코드 구조**:
backend/
├── pyproject.toml
├── uv.lock
├── src/
│   └── unknown_world/
│       ├── __init__.py
│       └── main.py
└── tests/
    └── integration/
        └── test_api.py

### 성능 및 품질 지표

- **API 안정성**: 통합 테스트 3종(Health, Root, CORS) 100% 통과
- **문서화**: Swagger UI(`/docs`)를 통한 자동 API 명세서 생성 확인

### 의존성 변경

- `fastapi`, `uvicorn`, `pydantic` 고정 버전 추가
- `ruff`, `pyright`, `pytest` 개발 의존성 추가

### 다음 단계

- [U-005[Mvp]] TurnInput/TurnOutput(Pydantic) 모델 추가
- [U-007[Mvp]] `/api/turn` SSE 스트리밍 라우트 추가

---

## [2026-01-03 14:45] U-002[Mvp]: 프론트 Vite+React+TS 초기화 완료

### 구현 완료 항목

- **핵심 기능**: `vibe/tech-stack.md` 기반 Vite 7 + React 19 + TypeScript 5.9 환경 구축
- **추가 컴포넌트**: `frontend/src/App.tsx`, `frontend/src/style.css` (단일 CSS SSOT 구조)
- **달성 요구사항**: [RULE-002] 채팅 UI 배제 최소 구조 확보, [RULE-010] 기술 스택 버전 고정

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **React 19.2.3 / Vite 7.3.0**: 프론트엔드 프레임워크 및 빌드 도구
- **TypeScript 5.9.3**: 엄격 모드 적용
- **pnpm 10.27.0**: 패키지 매니저 고정

**설계 패턴 및 아키텍처 선택**:

- **단일 CSS SSOT**: 모든 스타일을 `src/style.css`에서 CSS 변수 기반으로 관리
- **최소 컨테이너 아키텍처**: 채팅 UI 유도를 방지하기 위한 헤더-메인 분리 구조

**코드 구조**:
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── style.css

### 성능 및 품질 지표

- **빌드 성공**: `pnpm build` 시 에셋 최적화 및 sourcemap 생성 확인
- **타입 안정성**: `pnpm run typecheck` 통과 (엄격 모드)

### 의존성 변경

- `react`, `react-dom` (v19.2.3) 추가
- `vite`, `typescript`, `eslint`, `prettier` 등 개발 의존성 추가

### 다음 단계

- [U-003[Mvp]] 백엔드 FastAPI 초기화
- [U-004[Mvp]] CRT 테마 및 고정 게임 UI 레이아웃 구현

---

## [2026-01-03 14:35] U-001[Mvp]: 프로젝트 스캐폴딩 생성 완료

### 구현 완료 항목

- **핵심 기능**: 프로젝트의 기본 디렉토리 구조(`frontend/`, `backend/`) 및 Git 설정(`.gitignore`, `.gitattributes`) 구축
- **추가 컴포넌트**: `backend/src/unknown_world/__init__.py` 패키지 초기화 파일
- **달성 요구사항**: [RULE-007] 비밀정보 보호 설정 완료

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **Git**: 버전 관리 및 줄 끝 처리 설정
- **Python 3.14**: 백엔드 패키지 구조 초기화

**설계 패턴 및 아키텍처 선택**:

- **모노레포 구조**: `frontend/`와 `backend/`를 분리하여 독립적인 개발 환경 제공
- **보안 중심 설정**: 비밀정보 유출 방지를 위한 선제적 `.gitignore` 패턴 적용

**코드 구조**:
repo-root/
├── frontend/
│   ├── .gitkeep
│   └── src/
│       └── .gitkeep
├── backend/
│   ├── .gitkeep
│   ├── prompts/
│   │   └── .gitkeep
│   └── src/
│       └── unknown_world/
│           └── __init__.py
├── .gitignore
└── .gitattributes

### 성능 및 품질 지표

- **코드 품질**: Python 패키지 임포트 테스트 통과
- **보안**: 비밀정보 파일(service-account.json, .env) Git 추적 제외 검증 완료

### 의존성 변경

- 추가된 외부 의존성 없음 (기본 구조 작업)

### 다음 단계

- [U-002[Mvp]] 프론트엔드 환경 초기화 (Vite + React)
- [U-003[Mvp]] 백엔드 환경 초기화 (FastAPI)

---
