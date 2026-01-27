# [U-045] rembg preflight 실행 가이드

## 1. 개요

백엔드 서버 시작 시점에 rembg 설치 여부와 모델 캐시를 사전 점검하고, 필요한 경우 모델을 미리 다운로드하여 **첫 rembg 호출에서 발생하는 100~200MB 다운로드/지연**을 "턴 처리 경로"에서 제거합니다.

**예상 소요 시간**: 5~10분 (모델 다운로드 포함 시 최대 3분 추가)

**의존성**:
- 의존 유닛: U-035[Mvp] (rembg 후처리 통합)
- 선행 완료 필요: U-035 런북 실행 완료 권장 (rembg 설치 확인)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# backend 디렉토리로 이동
cd backend

# 의존성 설치 (uv 패키지 매니저 사용)
uv sync
```

### 2.2 rembg 설치 확인

```bash
# rembg 버전 확인 (uv 환경에서)
uv run rembg --version
# 예상 출력: rembg 2.0.67

# 또는 직접 설치 확인
uv run python -c "import rembg; print('rembg 설치됨')"
```

### 2.3 즉시 실행

```bash
# 백엔드 서버 시작 (preflight 자동 실행됨)
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.4 첫 화면/결과 확인

서버 시작 시 콘솔에서 preflight 로그 확인:

```
INFO:     [Startup] Unknown World 백엔드 시작
INFO:     [Startup] rembg preflight 시작
INFO:     [Preflight] rembg 설치 확인
INFO:     [Preflight] 모델 다운로드 시작 (또는 "모델 캐시 발견")
INFO:     [Startup] rembg READY
INFO:     [Startup] Unknown World 백엔드 시작 완료
```

**성공 지표**: 
- "rembg READY" 또는 "rembg DEGRADED" 메시지 출력
- 서버가 정상 시작되어 포트 8011에서 요청 수신

---

## 3. 핵심 기능 시나리오

### 시나리오 A: Health 엔드포인트에서 rembg 상태 확인

**목적**: `/health` 엔드포인트에서 rembg preflight 결과 확인

**실행**:

```bash
# 서버가 실행 중일 때
curl http://localhost:8011/health
```

**기대 결과** (rembg 설치 + 모델 준비 완료 시):

```json
{
  "status": "ok",
  "version": "0.1.0",
  "service": "unknown-world-backend",
  "rembg": {
    "status": "ready",
    "installed": true,
    "preloaded_models": ["birefnet-general"],
    "missing_models": [],
    "last_error": null
  }
}
```

**확인 포인트**:
- ✅ `rembg.status`가 "ready" 또는 "degraded"
- ✅ `rembg.installed`가 `true`
- ✅ `rembg.preloaded_models`에 "birefnet-general" 포함

---

### 시나리오 B: rembg 미설치 시 폴백 동작

**목적**: rembg가 설치되지 않은 환경에서도 서버가 정상 시작되는지 확인

**전제 조건**:
- rembg가 설치되지 않은 환경 (테스트용 가상환경 등)

**기대 결과**:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "service": "unknown-world-backend",
  "rembg": {
    "status": "unavailable",
    "installed": false,
    "preloaded_models": [],
    "missing_models": [],
    "last_error": "rembg가 설치되어 있지 않습니다"
  }
}
```

**확인 포인트**:
- ✅ 서버가 정상 시작됨 (exit 없음)
- ✅ `rembg.status`가 "unavailable"
- ✅ `rembg.last_error`에 원인 메시지 포함

---

### 시나리오 C: 이미지 생성 후 배경 제거 테스트

**목적**: preflight 완료 후 이미지 후처리가 정상 동작하는지 확인

**전제 조건**:
- 서버 시작 완료 (rembg READY 상태)
- Gemini API 키 설정 완료

**실행**:

```bash
# 이미지 생성 요청 (배경 제거 옵션 포함)
curl -X POST http://localhost:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A simple red apple on white background",
    "remove_background": true,
    "image_type_hint": "object"
  }'
```

**기대 결과**:
- 배경이 제거된 이미지 URL 반환
- 후처리 결과에 `_nobg.png` 파일 생성

**확인 포인트**:
- ✅ 응답에 이미지 URL 포함
- ✅ 배경 제거된 PNG 파일 생성됨
- ✅ 요청 처리 중 모델 다운로드 발생하지 않음 (preflight에서 완료)

---

### 시나리오 D: 환경변수로 prefetch 모델 확장

**목적**: 환경변수로 추가 모델을 prefetch할 수 있는지 확인

**실행**:

```bash
# 추가 모델 설정 후 서버 시작
UW_REMBG_PREFETCH_MODELS=birefnet-general,birefnet-portrait \
  uv run uvicorn unknown_world.main:app --reload --port 8011
```

**기대 결과**:
- 두 모델 모두 preflight 시 다운로드/검증됨
- `/health` 응답의 `preloaded_models`에 두 모델 포함

**확인 포인트**:
- ✅ 로그에 두 모델 처리 내역 표시
- ✅ `preloaded_models: ["birefnet-general", "birefnet-portrait"]`

---

## 4. 실행 결과 확인

### 4.1 로그 확인

서버 시작 시 콘솔에서 확인:

```
[Startup] Unknown World 백엔드 시작
[Startup] rembg preflight 시작
[Preflight] rembg 설치 확인 {"version": "rembg 2.0.67"}
[Preflight] 모델 캐시 발견 {"model": "birefnet-general", "path": "..."}
[Startup] rembg READY {"preloaded_models": ["birefnet-general"], "elapsed_ms": 1234}
[Startup] Unknown World 백엔드 시작 완료
```

### 4.2 모델 캐시 위치

rembg 모델은 사용자 홈 디렉토리에 캐시됩니다:

- **Windows**: `%USERPROFILE%\.u2net\`
- **Linux/macOS**: `~/.u2net/`

```bash
# 모델 파일 확인
ls ~/.u2net/
# 예상: birefnet-general.onnx (약 100MB)
```

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 서버가 정상 시작됨
- ✅ `/health`에서 rembg 상태 확인 가능
- ✅ preflight READY 또는 DEGRADED 상태
- ✅ 이미지 후처리 요청 시 모델 다운로드 없이 즉시 처리

**실패 시 확인**:
- ❌ 서버 시작 실패 → preflight는 실패해도 서버 중단 안 함 (설계 확인)
- ❌ `/health`에서 rembg 정보 없음 → import 경로 또는 lifespan 연결 확인
- ❌ 모델 다운로드 실패 → 네트워크/권한 확인, 수동 다운로드 시도

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `rembg: command not found` 또는 `ModuleNotFoundError: No module named 'rembg'`

- **원인**: rembg가 설치되어 있지 않음
- **해결**: 
  ```bash
  cd backend
  uv add rembg
  # 또는
  uv sync
  ```

**오류**: 모델 다운로드 타임아웃

- **원인**: 네트워크 느림 또는 차단
- **해결**: 
  ```bash
  # 타임아웃 늘리기
  UW_REMBG_MODEL_DOWNLOAD_TIMEOUT=180 uv run uvicorn unknown_world.main:app --port 8011
  
  # 또는 수동 다운로드
  uv run rembg d birefnet-general
  ```

**오류**: `Permission denied` (Windows)

- **원인**: 모델 캐시 디렉토리 쓰기 권한 없음
- **해결**: 
  ```bash
  # 캐시 디렉토리 확인 및 권한 부여
  mkdir %USERPROFILE%\.u2net
  ```

### 5.2 환경별 주의사항

- **Windows**: 한글 경로가 포함된 사용자 폴더에서 문제가 발생할 수 있음
- **Docker**: 모델 캐시를 볼륨 마운트하여 컨테이너 재시작 시에도 유지 권장
- **CI/CD**: 모델을 빌드 시점에 prefetch하거나 캐시 레이어로 관리

---

## 6. 환경변수 참조

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `UW_REMBG_PREFETCH_MODELS` | prefetch할 모델 목록 (쉼표 구분) | `birefnet-general` |
| `UW_REMBG_PREFLIGHT_TIMEOUT` | 전체 preflight 타임아웃 (초) | `120` |
| `UW_REMBG_MODEL_DOWNLOAD_TIMEOUT` | 개별 모델 다운로드 타임아웃 (초) | `90` |

---

## 7. 다음 단계

1. CP-MVP-05에서 이미지 후처리 지연/실패가 턴 경험에 영향 없음 검증
2. 배포(MMP) 시 health 시그널을 기반으로 rembg 상태 모니터링
3. 필요 시 추가 모델 prefetch (birefnet-portrait, isnet-anime 등)
