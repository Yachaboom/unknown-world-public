# U-047[Mvp] Backend .env 자동 로딩 실행 가이드

## 1. 개요

로컬 개발 환경에서 `backend/.env` 파일을 자동 로딩하여 `UW_MODE`/`ENVIRONMENT` 등의 환경변수가 쉘 export 없이도 일관되게 적용되도록 구현했습니다.

**핵심 기능**:
- `python-dotenv`를 사용한 `.env` 자동 로딩
- `override=False` 정책으로 기존 환경변수 우선 (운영 환경 SSOT 보장)
- `.env` 파일 미존재 시에도 정상 동작 (운영/CI 호환)
- 민감 정보 노출 없이 모드/환경만 로깅

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-003[Mvp] (FastAPI 엔트리포인트), U-016[Mvp] (Vertex 인증/모드)
- 선행 완료 필요: 백엔드 의존성 설치 (`uv sync`)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# backend 디렉토리로 이동
cd backend

# 의존성 설치
uv sync
```

### 2.2 .env 파일 생성 (선택)

```bash
# .env.example을 .env로 복사
cp .env.example .env

# (선택) .env 파일 수정하여 UW_MODE/ENVIRONMENT 설정
# 예: UW_MODE=mock 또는 UW_MODE=real
```

### 2.3 즉시 실행

```bash
# 백엔드 서버 실행
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.4 첫 화면/결과 확인

- 서버 시작 로그에서 `.env` 로드 상태 확인
- 성공 지표: `[Config] .env 파일 로드 완료` 로그 메시지 또는 `[Config] .env 파일 미존재` 메시지

---

## 3. 핵심 기능 시나리오

### 시나리오 A: .env 파일 없이 시작 (기본값 사용)

**목적**: `.env` 파일이 없을 때 서버가 정상적으로 시작되는지 확인

**전제 조건**:
- `.env` 파일이 존재하지 않음

**실행**:

```bash
cd backend

# .env 파일이 있다면 임시로 이름 변경
mv .env .env.backup 2>/dev/null || true

# 환경변수 초기화 후 서버 실행
unset UW_MODE ENVIRONMENT
uv run uvicorn unknown_world.main:app --reload --port 8011
```

**기대 결과**:

```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
[Config] .env 파일 미존재 또는 로드 실패 (기본값 사용)
INFO:     Application startup complete.
```

**확인 포인트**:
- ✅ 서버가 정상적으로 시작됨
- ✅ 기본값 `UW_MODE=mock`, `ENVIRONMENT=development`가 적용됨 (또는 시스템 환경변수 기본값)
- ✅ 에러 없이 헬스체크 정상 응답

**정리**:

```bash
# 백업 파일 복원
mv .env.backup .env 2>/dev/null || true
```

---

### 시나리오 B: .env 파일로 UW_MODE 설정

**목적**: `.env` 파일의 `UW_MODE` 설정이 정상적으로 로딩되는지 확인

**전제 조건**:
- `.env` 파일이 존재하고 `UW_MODE=real` 설정됨

**실행**:

```bash
cd backend

# .env 파일 생성 (또는 수정)
cat > .env << 'EOF'
UW_MODE=real
ENVIRONMENT=development
EOF

# 환경변수 초기화 후 서버 실행
unset UW_MODE ENVIRONMENT
uv run uvicorn unknown_world.main:app --reload --port 8011
```

**기대 결과**:

```
INFO:     Started server process [xxxxx]
[Config] .env 파일 로드 완료
INFO:     Application startup complete.
```

**확인 포인트**:
- ✅ `.env 파일 로드 완료` 로그 출력
- ✅ `UW_MODE=real`이 적용됨 (GenAI 클라이언트가 실제 모드로 초기화 시도)
- ✅ 헬스체크 정상 응답

---

### 시나리오 C: 환경변수 override 정책 테스트

**목적**: 기존 환경변수가 `.env` 파일보다 우선되는지 확인 (`override=False` 정책)

**전제 조건**:
- `.env` 파일에 `UW_MODE=real` 설정
- 쉘 환경변수로 `UW_MODE=mock` 설정

**실행**:

```bash
cd backend

# .env 파일 생성
cat > .env << 'EOF'
UW_MODE=real
ENVIRONMENT=development
EOF

# 환경변수로 mock 모드 지정 (override 테스트)
export UW_MODE=mock

# 서버 실행
uv run uvicorn unknown_world.main:app --reload --port 8011
```

**기대 결과**:

```
[Config] .env 파일 로드 완료 ... UW_MODE=mock
```

**확인 포인트**:
- ✅ 쉘 환경변수 `UW_MODE=mock`이 우선 적용됨
- ✅ `.env` 파일의 `UW_MODE=real`이 무시됨
- ✅ 운영 환경 SSOT 정책 준수 확인

**정리**:

```bash
unset UW_MODE
```

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: 콘솔 출력 (stdout)
- 주요 로그 메시지:
  - `[Config] .env 파일 로드 완료`: `.env` 파일이 정상적으로 로드됨
  - `[Config] .env 파일 미존재 또는 로드 실패`: `.env` 파일이 없거나 로드 실패 (정상 동작)

### 4.2 헬스체크 확인

```bash
# 서버 실행 후 별도 터미널에서
curl http://localhost:8011/health
```

**기대 응답**:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "service": "unknown-world-backend",
  "rembg": {...}
}
```

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ `.env` 파일 미존재 시에도 서버 정상 시작
- ✅ `.env` 파일 존재 시 `UW_MODE`/`ENVIRONMENT` 정상 로딩
- ✅ 기존 환경변수가 `.env` 파일보다 우선됨 (override=False)
- ✅ 민감 정보(키/토큰/경로 전체)가 로그에 노출되지 않음

**실패 시 확인**:
- ❌ 서버 시작 실패 → `python-dotenv` 의존성 설치 확인 (`uv sync`)
- ❌ `.env` 로드 안됨 → 파일 경로 확인 (`backend/.env`)
- ❌ 환경변수 미적용 → 쉘 환경변수가 이미 설정되어 있는지 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ModuleNotFoundError: No module named 'dotenv'`

- **원인**: `python-dotenv` 의존성 미설치
- **해결**: `uv sync` 실행

**오류**: `.env` 파일이 로드되었는데 `UW_MODE`가 여전히 `mock`

- **원인**: 쉘 환경변수가 이미 설정되어 있음 (override=False 정책)
- **해결**: `unset UW_MODE` 후 재실행

### 5.2 환경별 주의사항

- **Windows (PowerShell)**: 환경변수 초기화 명령어
  ```powershell
  Remove-Item Env:UW_MODE -ErrorAction SilentlyContinue
  Remove-Item Env:ENVIRONMENT -ErrorAction SilentlyContinue
  ```

- **Windows (CMD)**: 환경변수 초기화 명령어
  ```cmd
  set UW_MODE=
  set ENVIRONMENT=
  ```

- **Linux/macOS**: 환경변수 초기화 명령어
  ```bash
  unset UW_MODE ENVIRONMENT
  ```

---

## 6. 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] 서비스 계정 키 파일(`.key`)이 레포에 커밋되지 않았는지 확인
- [ ] 로그에 API 키/토큰/비밀정보가 출력되지 않는지 확인
