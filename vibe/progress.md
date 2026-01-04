# 프로젝트 진행 상황

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
