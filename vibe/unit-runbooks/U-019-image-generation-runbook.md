# U-019[Mvp] 이미지 생성 엔드포인트/잡 실행 가이드

## 1. 개요

장면 이미지를 "선택적으로" 생성하는 백엔드 이미지 생성 엔드포인트/잡을 구현했습니다.
`gemini-3-pro-image-preview` 모델을 사용하며, 텍스트 턴의 TTFB를 블로킹하지 않도록 분리된 경로로 동작합니다.

**예상 소요 시간**: 10분

**의존성**:

- 의존 유닛: U-016[Mvp] (GenAI 클라이언트), U-017[Mvp] (TurnOutput 스키마)
- 선행 완료 필요: 백엔드 서버 실행 가능 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# backend 디렉토리로 이동
cd backend

# 의존성 설치
uv sync
```

### 2.2 환경 변수 설정 (선택)

```bash
# Mock 모드로 실행 (실제 API 호출 없음, 개발용)
export UW_MODE=mock

# 또는 실제 모드로 실행 (Vertex AI 인증 필요)
export UW_MODE=real
export VERTEX_PROJECT=your-project-id
export VERTEX_LOCATION=us-central1
```

### 2.3 서버 실행

```bash
cd backend
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.4 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8011/docs` 접속
- `/api/image/generate` 엔드포인트가 표시되는지 확인
- 성공 지표: Swagger UI에 "Image Generation" 태그와 관련 엔드포인트 노출

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 이미지 생성 요청 (Mock 모드)

**목적**: Mock 모드에서 이미지 생성 엔드포인트 동작 검증

**실행**:

```bash
curl -X POST http://localhost:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A mysterious forest with glowing mushrooms",
    "image_size": "1024x1024",
    "aspect_ratio": "1:1"
  }'
```

**기대 결과**:

```json
{
  "success": true,
  "status": "completed",
  "image_id": "img_xxxxxxxxxxxx",
  "image_url": "/static/images/img_xxxxxxxxxxxx.png",
  "message": "Mock 이미지가 생성되었습니다.",
  "generation_time_ms": 10
}
```

**확인 포인트**:

- ✅ `success: true` 반환
- ✅ `status: "completed"` 상태
- ✅ `image_id`와 `image_url`이 포함됨
- ✅ `generated_images` 디렉토리에 PNG 파일 생성

---

### 시나리오 B: 이미지 상태 조회

**목적**: 생성된 이미지의 상태를 조회

**실행**:

```bash
# 시나리오 A에서 받은 image_id 사용
curl http://localhost:8011/api/image/status/img_xxxxxxxxxxxx
```

**기대 결과**:

```json
{
  "image_id": "img_xxxxxxxxxxxx",
  "exists": true,
  "image_url": "/static/images/img_xxxxxxxxxxxx.png"
}
```

**확인 포인트**:

- ✅ `exists: true` (파일 존재 확인)
- ✅ 유효한 `image_url` 반환

---

### 시나리오 C: 이미지 파일 직접 조회

**목적**: 생성된 이미지 파일을 직접 다운로드

**실행**:

```bash
# 시나리오 A에서 받은 image_id 사용
curl -o test_image.png http://localhost:8011/api/image/file/img_xxxxxxxxxxxx
```

**기대 결과**:

- PNG 파일이 로컬에 저장됨
- 파일 크기 > 0 bytes

**확인 포인트**:

- ✅ HTTP 200 응답
- ✅ Content-Type: image/png
- ✅ 유효한 PNG 파일 다운로드

---

### 시나리오 D: 실패 시 폴백 동작

**목적**: 검증 실패 시 텍스트-only 진행 가능한 폴백 확인

**실행**:

```bash
# 지원하지 않는 이미지 크기로 요청
curl -X POST http://localhost:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test prompt",
    "image_size": "9999x9999",
    "skip_on_failure": true
  }'
```

**기대 결과**:

```json
{
  "success": false,
  "status": "skipped",
  "image_id": null,
  "image_url": null,
  "message": "지원하지 않는 이미지 크기: 9999x9999",
  "generation_time_ms": 0
}
```

**확인 포인트**:

- ✅ HTTP 200 (에러가 아닌 정상 응답)
- ✅ `success: false`, `status: "skipped"`
- ✅ 에러 메시지가 `message` 필드에 포함
- ✅ 텍스트-only 진행 가능한 상태

---

### 시나리오 E: 헬스체크

**목적**: 이미지 생성 서비스 상태 확인

**실행**:

```bash
curl http://localhost:8011/api/image/health
```

**기대 결과**:

```json
{
  "status": "ok",
  "available": true,
  "mode": "mock",
  "model": "gemini-3-pro-image-preview"
}
```

**확인 포인트**:

- ✅ `status: "ok"` (서비스 정상)
- ✅ `model: "gemini-3-pro-image-preview"` (RULE-010 준수)

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: 콘솔 출력 (uvicorn)
- 주요 로그 메시지:
  - `[ImageGen] Mock 모드로 초기화됨`: Mock 모드 정상 시작
  - `[ImageGen] Mock 이미지 생성 완료`: 이미지 생성 성공
  - `[ImageAPI] 요청 검증 실패`: 검증 오류 (폴백 동작)

### 4.2 생성 파일

- `generated_images/{image_id}.png`: 생성된 이미지 파일

### 4.3 성능 지표

- Mock 모드 생성 시간: ~10ms 이하
- 실제 모드 생성 시간: 2~10초 (네트워크/모델 의존)

### 4.4 성공/실패 판단 기준

**성공**:

- ✅ 모든 시나리오(A~E)가 기대 결과와 일치
- ✅ 린트/타입 체크 무결성 통과
- ✅ RULE-010 준수 (모델 ID 고정)
- ✅ RULE-004 준수 (실패 시 폴백)

**실패 시 확인**:

- ❌ 서버 시작 실패 → 의존성 설치 확인 (`uv sync`)
- ❌ 404 오류 → 라우터 등록 확인 (`main.py`)
- ❌ 500 오류 → 로그에서 상세 오류 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ModuleNotFoundError: No module named 'unknown_world'`

- **원인**: 패키지가 설치되지 않음
- **해결**: `cd backend && uv sync`

**오류**: `Port 8011 already in use`

- **원인**: 포트 충돌
- **해결**: 기존 프로세스 종료 후 재시작

**오류**: `GenAI 클라이언트가 초기화되지 않았습니다`

- **원인**: Vertex AI 인증 실패
- **해결**: `UW_MODE=mock`으로 설정하거나 ADC 인증 설정

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 주의 (`\` vs `/`)
- **macOS/Linux**: 권한 문제 시 `chmod` 적용

---

## 6. TurnOutput 연동 (프론트엔드 참조)

이미지 생성 엔드포인트는 `TurnOutput.render.image_job`과 연동됩니다.

```typescript
// 프론트엔드 연동 예시
if (turnOutput.render.image_job?.should_generate) {
  const response = await fetch('/api/image/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: turnOutput.render.image_job.prompt,
      aspect_ratio: turnOutput.render.image_job.aspect_ratio,
      image_size: turnOutput.render.image_job.image_size,
    }),
  });
  const result = await response.json();
  if (result.success) {
    // 이미지 URL로 SceneCanvas 업데이트
    setSceneImageUrl(result.image_url);
  }
}
```

**주요 포인트**:

- 텍스트 턴 완료 후 별도 호출 (TTFB 비블로킹)
- `skip_on_failure: true`로 안전한 폴백 보장
- U-020에서 SceneCanvas와 연동 예정
