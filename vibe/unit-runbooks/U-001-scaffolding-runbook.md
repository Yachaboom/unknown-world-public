# U-001 프로젝트 스캐폴딩 실행 가이드

## 1. 개요

프론트엔드(`frontend/`)와 백엔드(`backend/`) 디렉토리 구조를 생성하고, 비밀정보가 레포에 들어가지 않도록 `.gitignore`를 설정합니다.

이 유닛은 다음 유닛(U-002, U-003)이 즉시 초기화 작업을 시작할 수 있는 기반을 제공합니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: 없음
- 선행 완료 필요: 없음

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

이 유닛은 별도 의존성 설치가 필요하지 않습니다.

### 2.2 즉시 확인

```bash
# 프로젝트 루트에서 실행
ls -la
```

### 2.3 첫 화면/결과 확인

- `frontend/` 디렉토리 존재
- `backend/` 디렉토리 존재
- `.gitignore` 파일 존재

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 디렉토리 구조 확인

**목적**: 프론트엔드/백엔드 디렉토리가 올바르게 생성되었는지 검증

**실행**:

```bash
# Frontend 구조 확인
ls -la frontend/
ls -la frontend/src/

# Backend 구조 확인
ls -la backend/
ls -la backend/src/unknown_world/
ls -la backend/prompts/
```

**기대 결과**:

```
frontend/
├── .gitkeep
└── src/
    └── .gitkeep

backend/
├── .gitkeep
├── prompts/
│   └── .gitkeep
└── src/
    └── unknown_world/
        └── __init__.py
```

**확인 포인트**:

- ✅ `frontend/` 디렉토리 존재
- ✅ `frontend/src/` 디렉토리 존재
- ✅ `backend/` 디렉토리 존재
- ✅ `backend/src/unknown_world/__init__.py` 파일 존재 (패키지)
- ✅ `backend/prompts/` 디렉토리 존재

---

### 시나리오 B: Python 패키지 임포트 테스트

**목적**: 백엔드 패키지 구조가 올바른지 검증

**실행**:

```bash
# Python에서 패키지 임포트 테스트
cd backend
python -c "from src.unknown_world import __version__; print(f'Version: {__version__}')"
```

**기대 결과**:

```
Version: 0.0.0
```

**확인 포인트**:

- ✅ Python 패키지 임포트 성공
- ✅ 버전 정보 출력

---

### 시나리오 C: .gitignore 비밀정보 보호 테스트

**목적**: 비밀정보 파일이 Git에서 무시되는지 검증 (RULE-007)

**실행**:

```bash
# 테스트용 비밀정보 파일 생성
echo "fake-secret" > service-account-test.json
echo "API_KEY=secret" > .env

# Git 상태 확인 (이 파일들이 무시되어야 함)
git status --ignored

# 정리
rm -f service-account-test.json .env
```

**기대 결과**:

```
Ignored files:
  service-account-test.json
  .env
```

**확인 포인트**:

- ✅ `service-account*.json` 패턴 파일 무시됨
- ✅ `.env` 파일 무시됨
- ✅ 비밀정보가 Git에 추가되지 않음

---

### 시나리오 D: 필수 파일은 추적 확인

**목적**: package.json, tsconfig.json 등 필요한 JSON 파일은 추적되는지 검증

**실행**:

```bash
# 테스트용 설정 파일 생성
echo '{}' > frontend/package.json
echo '{}' > frontend/tsconfig.json

# Git 상태 확인 (이 파일들은 추적되어야 함)
git status

# 정리
rm -f frontend/package.json frontend/tsconfig.json
```

**기대 결과**:

- `frontend/package.json`이 Untracked files로 표시됨 (무시되지 않음)
- `frontend/tsconfig.json`이 Untracked files로 표시됨 (무시되지 않음)

**확인 포인트**:

- ✅ `package.json` 파일은 추적됨
- ✅ `tsconfig.json` 파일은 추적됨

---

## 4. 실행 결과 확인

### 4.1 생성 파일

| 경로                                    | 목적                                  |
| --------------------------------------- | ------------------------------------- |
| `frontend/.gitkeep`                     | 프론트엔드 루트 디렉토리 플레이스홀더 |
| `frontend/src/.gitkeep`                 | 소스 디렉토리 플레이스홀더            |
| `backend/.gitkeep`                      | 백엔드 루트 디렉토리 플레이스홀더     |
| `backend/src/unknown_world/__init__.py` | Python 패키지 초기화                  |
| `backend/prompts/.gitkeep`              | 프롬프트 디렉토리 플레이스홀더        |
| `.gitignore`                            | Git 무시 설정 (비밀정보 보호)         |

### 4.2 성공/실패 판단 기준

**성공**:

- ✅ 모든 디렉토리/파일이 생성됨
- ✅ Python 패키지 임포트 성공
- ✅ 비밀정보 파일이 Git에서 무시됨
- ✅ 설정 파일(package.json 등)은 추적됨

**실패 시 확인**:

- ❌ 디렉토리 없음 → 파일 생성 스크립트 재실행
- ❌ 패키지 임포트 실패 → `__init__.py` 파일 확인
- ❌ 비밀정보가 추적됨 → `.gitignore` 패턴 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ModuleNotFoundError: No module named 'src'`

- **원인**: Python 경로에 `backend/` 디렉토리가 포함되지 않음
- **해결**: `cd backend` 후 실행하거나, `PYTHONPATH=backend python ...` 사용

**오류**: 비밀정보 파일이 Git에 추가됨

- **원인**: `.gitignore` 파일이 없거나 패턴이 잘못됨
- **해결**: `.gitignore` 파일 내용 확인 및 수정

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 `\` vs `/` 차이 주의. Git Bash 또는 PowerShell 사용 권장
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

- **U-002**: `frontend/`를 Vite + React + TypeScript로 초기화
- **U-003**: `backend/`를 FastAPI 프로젝트로 초기화
