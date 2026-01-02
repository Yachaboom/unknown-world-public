# U-002[Mvp]: 프론트 Vite+React+TS 초기화 (/frontend)

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-002[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 60분                              |
| 의존성    | U-001                             |
| 우선순위  | ⚡ Critical                        |

## 작업 목표

`vibe/tech-stack.md`에 고정된 버전으로 **Vite 7 + React 19 + TypeScript** 프론트엔드 개발 환경을 만들고, 로컬에서 즉시 실행 가능한 상태로 만든다.

**배경**: 데모/플레이 테스트를 지속하려면 “언제든 켤 수 있는 프론트”가 먼저 필요하다. (참조: `vibe/prd.md` 10장)

**완료 기준**:

- `frontend/`에서 `pnpm install` 및 `pnpm dev`가 성공한다.
- React/TS/Vite 버전이 `vibe/tech-stack.md`와 일치하도록 고정된다. (RULE-010)
- 채팅 버블 UI를 전제로 한 기본 템플릿(메신저 UI)로 발전하지 않도록, 이후 U-004에서 “고정 게임 UI”로 바로 확장할 수 있는 최소 구조가 준비된다. (RULE-002)

## 영향받는 파일

**생성**:

- `frontend/package.json` - React/Vite/TS 버전 고정 및 스크립트 정의
- `frontend/pnpm-lock.yaml` - pnpm lockfile
- `frontend/vite.config.ts` - 개발 서버/빌드 설정
- `frontend/tsconfig.json` - TS 설정(엄격 모드 권장)
- `frontend/index.html` - 엔트리 HTML(폰트 로드 등은 U-004에서)
- `frontend/src/main.tsx` - 엔트리 포인트
- `frontend/src/App.tsx` - 메인 컴포넌트(고정 레이아웃은 U-004)
- `frontend/src/style.css` - 단일 CSS 파일(CRT 토큰은 U-004)

**수정**:

- `prettier.config.cjs` (필요 시) - 프론트에서도 동일 규칙 적용(가능하면 재사용)

**참조**:

- `vibe/tech-stack.md` - 버전 고정(React 19.2.3, Vite 7.3.0, TS 5.9.3, pnpm 10.27.0)
- `vibe/ref/frontend-style-guide.md` - 단일 `style.css` 원칙, CRT 테마
- `.cursor/rules/10-frontend-game-ui.mdc` - 채팅 UI 금지, CRT, 고정 패널

## 구현 흐름

### 1단계: Vite + React + TS 스캐폴딩 생성

- `frontend/`에서 Vite React+TS 템플릿으로 초기화한다(패키지 매니저는 pnpm).
- 기본 엔트리(`src/main.tsx`, `src/App.tsx`)가 동작하는지 확인한다.

### 2단계: 버전/도구 고정

- `packageManager: "pnpm@10.27.0"`를 고정한다.
- 핵심 의존성(React/Vite/TS)을 `vibe/tech-stack.md` 기준으로 맞춘다. (RULE-010)

### 3단계: “게임 UI로 확장” 가능한 최소 구조 확보

- `src/style.css`를 “단일 CSS SSOT”로 두고, 컴포넌트별 스타일 분산을 피한다.
- U-004에서 고정 레이아웃/CRT 토큰을 바로 추가할 수 있도록 `App.tsx`는 최소한의 컨테이너 형태로 유지한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-001[Mvp]](U-001[Mvp].md) - `frontend/` 디렉토리 스캐폴딩

**다음 작업에 전달할 것**:

- U-004에서 `frontend/src/App.tsx`와 `frontend/src/style.css`를 기반으로 CRT 테마/고정 레이아웃을 구현할 수 있는 실행 환경
- U-006에서 Zod 스키마를 추가할 수 있는 TypeScript 기반 프로젝트

## 주의사항

**기술적 고려사항**:

- (RULE-002) 채팅 UI를 전제로 하는 컴포넌트/레이아웃을 도입하지 않는다(메신저 버블 금지).
- (Frontend Style) 스타일은 `frontend/src/style.css` 단일 파일 + CSS 변수로만 확장한다(Tailwind 도입 금지).

**잠재적 리스크**:

- 템플릿 기본 UI가 “채팅처럼 보이는” 방향으로 유도될 수 있음 → U-004에서 즉시 고정 게임 UI로 전환하는 것을 크리티컬 패스로 둔다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 루트에 pnpm workspace를 둘까?
  - Option A: `frontend/` 단독 패키지로 시작(권장: 초기 단순)
  - Option B: 루트 `pnpm-workspace.yaml` 구성(추후 shared 패키지 분리 시 유리)

## 참고 자료

- `vibe/tech-stack.md` - 프론트 버전/도구 SSOT
- `vibe/ref/frontend-style-guide.md` - CRT/단일 CSS 원칙
- `.cursor/rules/10-frontend-game-ui.mdc` - 게임 UI 고정 규칙


