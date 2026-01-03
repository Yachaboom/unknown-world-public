# U-002[Mvp] 프론트 Vite+React+TS 초기화 실행 가이드

## 1. 개요

이 유닛은 Unknown World 프로젝트의 **프론트엔드 개발 환경**을 Vite 7 + React 19 + TypeScript 5.9로 초기화합니다.
`frontend/` 디렉토리에서 `pnpm install` 및 `pnpm dev`가 성공적으로 실행되고, 로컬 개발 서버에서 기본 UI를 확인할 수 있습니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-001[Mvp] - 프로젝트 스캐폴딩
- 선행 완료 필요: U-001 완료 (frontend/ 디렉토리 존재)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# Node.js 24.x 및 pnpm 10.27.0 필요
node --version  # v24.x
pnpm --version  # 10.27.0

# pnpm이 없다면 corepack으로 활성화
corepack enable
```

### 2.2 의존성 설치

```bash
cd frontend
pnpm install
```

### 2.3 즉시 실행

```bash
pnpm dev
```

### 2.4 첫 화면/결과 확인

- 브라우저에서 `http://localhost:5173/` 접속
- 성공 지표:
  - 콘솔에 `VITE v7.3.0 ready` 메시지 출력
  - 검정 배경에 녹색 "Unknown World" 타이틀 표시
  - "⚡ 개발 환경 초기화 완료" 메시지 표시

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 개발 서버 정상 동작

**목적**: Vite 개발 서버가 정상적으로 시작되고 React 앱이 렌더링되는지 검증

**실행**:

```bash
cd frontend
pnpm dev
```

**기대 결과**:

```
VITE v7.3.0  ready in 248 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**확인 포인트**:

- ✅ 포트 5173에서 서버 시작
- ✅ 브라우저에서 페이지 로드 성공
- ✅ 콘솔에 에러 없음 (Vite HMR 연결 성공)

---

### 시나리오 B: 린트/타입체크 통과

**목적**: 코드 품질 도구가 정상 동작하는지 검증

**실행**:

```bash
cd frontend
pnpm run lint
pnpm run typecheck
```

**기대 결과**:

```
# 린트: 에러 없이 완료
# 타입체크: 에러 없이 완료
```

**확인 포인트**:

- ✅ ESLint 검사 통과 (exit code 0)
- ✅ TypeScript 타입 체크 통과 (exit code 0)

---

### 시나리오 C: 빌드 성공

**목적**: 프로덕션 빌드가 정상적으로 완료되는지 검증

**실행**:

```bash
cd frontend
pnpm run build
```

**기대 결과**:

```
✓ built in XXXms
dist/
├── assets/
│   ├── index-XXXXXX.js
│   └── index-XXXXXX.css
└── index.html
```

**확인 포인트**:

- ✅ `dist/` 디렉토리 생성
- ✅ index.html, JS/CSS 에셋 파일 생성
- ✅ 빌드 에러 없음

---

## 4. 실행 결과 확인

### 4.1 버전 확인

프로젝트에서 사용하는 핵심 의존성 버전:

| 패키지    | 버전   | tech-stack.md 기준 |
| --------- | ------ | ------------------ |
| react     | 19.2.3 | ✅ 일치            |
| react-dom | 19.2.3 | ✅ 일치            |
| vite      | 7.3.0  | ✅ 일치            |
| typescript | 5.9.3 | ✅ 일치            |
| pnpm      | 10.27.0| ✅ 일치            |

### 4.2 파일 구조

```
frontend/
├── index.html          # 엔트리 HTML
├── package.json        # 의존성 및 스크립트
├── pnpm-lock.yaml      # lockfile
├── tsconfig.json       # TypeScript 설정 (엄격 모드)
├── tsconfig.node.json  # Vite 설정용 TS 설정
├── vite.config.ts      # Vite 빌드/개발 설정
├── eslint.config.mjs   # ESLint Flat Config
├── public/
│   └── vite.svg        # 파비콘
└── src/
    ├── main.tsx        # 엔트리 포인트
    ├── App.tsx         # 메인 컴포넌트
    ├── style.css       # 단일 CSS SSOT
    └── vite-env.d.ts   # Vite 타입 선언
```

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ `pnpm install` 에러 없이 완료
- ✅ `pnpm dev` 실행 시 http://localhost:5173 접근 가능
- ✅ `pnpm run lint` 통과
- ✅ `pnpm run typecheck` 통과
- ✅ 브라우저 콘솔에 에러 없음

**실패 시 확인**:

- ❌ pnpm 버전 불일치 → `corepack enable` 후 재시도
- ❌ 포트 5173 충돌 → 다른 프로세스 종료 또는 vite.config.ts에서 포트 변경
- ❌ 타입 에러 → tsconfig.json 설정 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `EADDRINUSE: address already in use :::5173`

- **원인**: 포트 5173이 이미 사용 중
- **해결**:

```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# 또는 vite.config.ts에서 다른 포트 지정
```

**오류**: `pnpm: command not found`

- **원인**: pnpm이 설치되지 않음
- **해결**:

```bash
corepack enable
# 또는
npm install -g pnpm@10.27.0
```

**오류**: `TS6306: Referenced project must have setting "composite": true`

- **원인**: tsconfig.node.json에 composite 설정 누락
- **해결**: tsconfig.node.json에 `"composite": true` 추가

### 5.2 환경별 주의사항

- **Windows**: 줄 끝이 CRLF로 변경될 수 있음 → `.gitattributes`로 LF 강제
- **macOS/Linux**: Node.js 버전 관리 시 nvm 사용 권장

---

## 6. 다음 단계

- **U-004**: CRT 테마 및 고정 게임 UI 레이아웃 구현
- **U-006**: Zod 스키마 추가 (TurnOutput 검증)

