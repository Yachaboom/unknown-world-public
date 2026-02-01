# U-055 이미지 파이프라인 Mock/Real 모드 통합 검증 가이드

## 1. 개요

U-051~U-054에서 구축한 이미지 생성 파이프라인이 **Mock 모드**와 **Real 모드** 모두에서 정상적으로 동작하는지 전체 루프를 검증합니다.

**예상 소요 시간**: 15분

**의존성**:

- 의존 유닛: U-054[Mvp] (이미지 생성 폴백 체계)
- 선행 완료 필요: CP-MVP-05 (멀티모달 이미지 게이트 검증)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
cd frontend
pnpm install

# 백엔드 의존성 설치
cd ../backend
uv sync
```

### 2.2 Mock 모드 검증 (권장: 먼저 실행)

```bash
# 터미널 1: 프론트엔드 시작 (포트 8001)
cd frontend
pnpm dev

# 터미널 2: 백엔드 Mock 모드 시작 (포트 8011)
cd backend
set UW_MODE=mock  # Windows
# export UW_MODE=mock  # Linux/Mac
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.3 Real 모드 검증 (Vertex AI 인증 필요)

```bash
# 터미널 2: 백엔드 Real 모드 시작
cd backend
# .env 파일 설정 확인 (GOOGLE_APPLICATION_CREDENTIALS)
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.4 첫 화면/결과 확인

- **브라우저**: http://localhost:8001
- 성공 지표: 
  - 백엔드 로그에 `[Startup] UW_MODE: mock` 또는 `real` 표시
  - 프론트엔드에서 게임 UI 렌더링

---

## 3. 핵심 기능 시나리오

### 시나리오 A: Mock 모드 이미지 생성 확인

**목적**: Mock 모드에서 플레이스홀더 이미지가 정상 생성되는지 검증

**실행 (curl)**:

```bash
# Mock 모드 백엔드로 턴 요청 (이미지 생성 포함)
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "주변을 탐색한다",
    "action_id": "explore_1",
    "client": {"viewport_w": 1920, "viewport_h": 1080},
    "economy_snapshot": {"signal": 192, "memory_shard": 10}
  }'
```

**기대 결과**:

- TurnOutput 스트림이 NDJSON 형식으로 반환됨
- `final` 이벤트의 `data.render` 필드 확인:
  - `image_job.should_generate`: true (약 30% 확률) 또는 null
  - `image_url`: 이미지 생성 시 `/images/generated/img_*.png` 형식 URL
  - `image_id`: `img_` 접두어가 붙은 고유 ID

**확인 포인트**:

- ✅ 응답에 `type: "final"` 이벤트 포함
- ✅ `render.image_url`이 존재하면 파일도 실제 생성됨
- ✅ 백엔드 로그에 `[ImageGen] Mock 이미지 생성 완료` 메시지

**이미지 파일 확인**:

```bash
# 생성된 이미지 목록 확인
ls backend/.data/images/generated/
```

---

### 시나리오 B: Real 모드 이미지 생성 확인

**목적**: Vertex AI 인증 환경에서 실제 Gemini 이미지 생성 동작 검증

**전제 조건**:

- `.env` 파일에 `GOOGLE_APPLICATION_CREDENTIALS` 설정 완료
- Vertex AI 프로젝트 접근 권한 확인
- `UW_MODE=real` 또는 미설정 (기본값이 real)

**실행**:

1. 백엔드 시작 시 로그 확인:
   ```
   [Startup] UW_MODE: real
   [ImageGen] Vertex AI 이미지 생성기 초기화 완료
   ```

2. 턴 요청 전송 (시나리오 A와 동일)

**기대 결과**:

- TurnOutput에 Gemini 생성 이미지 URL 포함
- 이미지 생성 시간: 약 5~15초 (API 호출 포함)
- 백엔드 로그에 `[ImageGen] 이미지 생성 완료` 메시지

**확인 포인트**:

- ✅ `render.image_url`에 실제 생성된 이미지 URL
- ✅ 이미지 파일 크기 > 1KB (플레이스홀더가 아님)
- ✅ `generation_time_ms` 값이 기록됨

**결과 비교**:

| 항목 | Mock 모드 | Real 모드 |
|------|-----------|-----------|
| 이미지 크기 | ~100 bytes (16x16) | 수십~수백 KB |
| 생성 시간 | < 100ms | 5~15초 |
| 이미지 품질 | 플레이스홀더 | 실제 생성 |

---

### 시나리오 C: 이미지 생성 폴백 검증 (U-054)

**목적**: 이미지 생성 실패 시 텍스트-only로 안전하게 진행되는지 검증

**테스트 케이스 C1: 잔액 부족**

```bash
# Signal 잔액이 10 미만인 경우
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "탐색",
    "client": {"viewport_w": 1920, "viewport_h": 1080},
    "economy_snapshot": {"signal": 5, "memory_shard": 0}
  }'
```

**기대 결과**:

- `render.image_url`: null (생성 건너뜀)
- 내러티브에 잔액 부족 안내 메시지 포함 (선택적)
- 턴 자체는 정상 완료

**테스트 케이스 C2: 이미지 생성 비활성화**

```bash
# should_generate가 false인 경우 (자동 - 70% 확률)
# 여러 번 요청하면 이미지 생성 없이 텍스트만 반환되는 케이스 확인
```

**확인 포인트**:

- ✅ 이미지 생성 없어도 `final` 이벤트 정상 수신
- ✅ `agent_console.badges`에 `schema_ok`, `economy_ok` 포함
- ✅ UI가 멈추지 않음 (텍스트 우선 원칙)

---

### 시나리오 D: 프론트엔드 이미지 표시 검증

**목적**: 생성된 이미지가 SceneCanvas에 정상 표시되는지 검증

**실행 순서**:

1. **Step 1**: 브라우저에서 http://localhost:8001 접속

2. **Step 2**: 액션 카드 클릭 (예: "탐색하기")
   - Agent Console에서 단계 진행 확인 (Parse → Commit)
   - 배지 표시 확인 (SCHEMA_OK, ECONOMY_OK 등)

3. **Step 3**: Scene Canvas 확인
   - 이미지 생성 시: 이미지 로딩 → 페이드인 표시
   - 이미지 미생성 시: 기존 플레이스홀더 유지

**확인 포인트**:

- ✅ 이미지 URL이 TurnOutput에 포함되면 SceneCanvas에 표시
- ✅ 이미지 로딩 중 로딩 인디케이터 표시
- ✅ 이미지 로딩 실패 시 플레이스홀더로 폴백 (U-020)

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- **백엔드 로그 위치**: 터미널 출력

**주요 로그 메시지**:

```
# Mock 모드 초기화
[ImageGen] Mock 모드로 초기화됨

# 이미지 생성 성공
[Render] 이미지 생성 판정 완료
[Render] 이미지 생성 시작
[ImageGen] Mock 이미지 생성 완료

# 폴백 (잔액 부족)
[Render] 잔액 부족, 텍스트-only 폴백 적용

# 폴백 (생성 실패)
[Render] 이미지 생성 실패, 텍스트-only 폴백
```

### 4.2 생성 파일

- `backend/.data/images/generated/img_*.png`: 생성된 이미지 파일

### 4.3 성능 지표

| 지표 | Mock 모드 | Real 모드 | 목표 |
|------|-----------|-----------|------|
| 턴 응답 TTFB | < 500ms | < 2s | < 2s |
| 이미지 생성 | < 100ms | 5-15s | - |
| 전체 턴 완료 | < 1s | < 18s | - |

### 4.4 성공/실패 판단 기준

**성공**:

- ✅ Mock 모드: 플레이스홀더 이미지 생성 및 URL 반환
- ✅ Real 모드: Gemini 이미지 생성 및 URL 반환 (인증 환경 한정)
- ✅ 폴백: 이미지 생성 실패 시에도 텍스트-only 턴 완료
- ✅ 프론트엔드: 이미지 URL이 있으면 SceneCanvas에 표시

**실패 시 확인**:

- ❌ "이미지 생성기 미주입" → `render.py`에서 서비스 주입 확인
- ❌ "Vertex AI 클라이언트 초기화 실패" → `.env` 파일 및 인증 확인
- ❌ "잔액 부족" 메시지 → Signal 잔액 확인 (최소 10 필요)

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `[ImageGen] Vertex AI 클라이언트 초기화 실패 - Mock 모드 권장`

- **원인**: Vertex AI 서비스 계정 인증 실패
- **해결**:
  1. `.env` 파일에 `GOOGLE_APPLICATION_CREDENTIALS` 경로 확인
  2. 서비스 계정 키 파일 존재 확인
  3. 프로젝트 ID 및 권한 확인

**오류**: `CORS policy: No 'Access-Control-Allow-Origin'`

- **원인**: 프론트엔드에서 백엔드로 요청 시 CORS 차단
- **해결**:
  1. 백엔드가 8011 포트에서 실행 중인지 확인
  2. `unknown_world/main.py`의 CORS 설정 확인

**오류**: `render.image_url이 항상 null`

- **원인**: MockOrchestrator가 should_generate=false 반환 (70% 확률)
- **해결**:
  1. 여러 번 요청하여 30% 확률의 이미지 생성 케이스 확인
  2. 백엔드 로그에서 `[Render] 이미지 생성 판정 완료` 메시지 확인

### 5.2 환경별 주의사항

- **Windows**: 
  - 환경변수 설정: `set UW_MODE=mock`
  - 경로 구분자: 백슬래시(`\`) 사용

- **macOS/Linux**: 
  - 환경변수 설정: `export UW_MODE=mock`
  - 서비스 계정 키 경로에 한글/공백 포함 금지

---

## 6. 검증 체크리스트

### Mock 모드 검증

- [ ] 백엔드 시작 시 `[Startup] UW_MODE: mock` 로그 확인
- [ ] `/api/turn` 요청 시 `final` 이벤트 수신
- [ ] 이미지 생성 시 `.data/images/generated/` 디렉토리에 파일 생성
- [ ] 이미지 생성 시 `render.image_url`에 URL 포함
- [ ] 폴백 동작: 이미지 미생성 시에도 턴 정상 완료

### Real 모드 검증 (선택)

- [ ] Vertex AI 인증 설정 완료 (`.env` 파일)
- [ ] 백엔드 시작 시 `[ImageGen] Vertex AI 이미지 생성기 초기화 완료` 로그
- [ ] 이미지 생성 시 파일 크기 > 1KB
- [ ] 생성 시간 측정 (`generation_time_ms` 필드)

### 프론트엔드 통합 검증

- [ ] 브라우저에서 게임 UI 렌더링
- [ ] 액션 카드 클릭 시 턴 실행
- [ ] Agent Console에서 단계/배지 업데이트
- [ ] SceneCanvas에 이미지 표시 (이미지 URL 존재 시)

---

## 7. 다음 단계

이 유닛을 완료하면 **CP-MVP-03: 10분 데모 루프** 검증으로 진행합니다.
이미지 파이프라인이 전체 데모 시나리오에서 정상 동작하는지 확인하세요.

---

_본 런북은 U-055[Mvp] 이미지 파이프라인 Mock/Real 모드 통합 검증을 위해 작성되었습니다._
