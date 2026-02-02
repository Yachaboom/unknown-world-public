# U-064[Mvp] Gemini 이미지 생성 API 호출 방식 수정 실행 가이드

## 1. 개요

이 런북은 Gemini 이미지 생성 API 호출 방식을 `generate_images()` → `generate_content()`로 수정한 U-064 유닛의 검증 가이드입니다.

**배경**: `gemini-3-pro-image-preview` 모델은 `generate_images()` 메서드가 아닌 `generate_content()` 메서드를 사용해야 합니다. U-055 Real 모드 테스트에서 11초 후 `ClientError` 발생 문제를 해결합니다.

**예상 소요 시간**: 15분

**의존성**:
- U-055[Mvp]: 이미지 파이프라인 통합 검증
- U-019[Mvp]: 이미지 생성 서비스 최초 구현

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd backend
uv sync
```

### 2.2 환경변수 확인

`.env` 파일에 다음 환경변수가 설정되어 있는지 확인:

```bash
VERTEX_PROJECT=your-project-id
VERTEX_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=./your-key-file.json
```

### 2.3 Mock 모드 테스트

```bash
cd backend
UW_MODE=mock uv run uvicorn unknown_world.main:app --port 8011
```

다른 터미널에서:

```bash
curl -X POST http://localhost:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A simple blue square"}'
```

**기대 결과**:
```json
{
  "success": true,
  "status": "completed",
  "image_id": "img_xxx",
  "image_url": "/static/images/generated/img_xxx.png",
  "message": "Mock 이미지가 생성되었습니다.",
  "generation_time_ms": 0
}
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: Mock 모드 이미지 생성

**목적**: API 엔드포인트 및 응답 형식 검증

**실행**:
```bash
curl -X POST http://localhost:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A cozy tavern interior"}'
```

**확인 포인트**:
- ✅ `status: "completed"` 반환
- ✅ `image_id` 및 `image_url` 생성됨
- ✅ 이미지 파일 존재: `backend/.data/images/generated/img_xxx.png`

---

### 시나리오 B: Real 모드 직접 API 테스트

**목적**: generate_content() API 호출 방식 검증

**전제 조건**:
- Vertex AI 인증 설정 완료
- `.env` 파일의 환경변수 설정 완료

**실행**:
```bash
cd backend
uv run python test_gemini_image.py
```

**기대 결과**:
```
=== Gemini Image Generation Test ===
Project: your-project-id
Location: global
...
Response received!
Candidates: 1
  Part 0: TEXT - ...
  Part 1: IMAGE - 1642167 bytes
  Image saved to: test_output.png
```

**확인 포인트**:
- ✅ `Project` 및 `Location` 환경변수 로드됨
- ✅ 텍스트 응답 (Thinking 과정) 로깅됨
- ✅ 이미지 바이트 추출 성공
- ✅ `test_output.png` 파일 생성됨

---

### 시나리오 C: Real 모드 서버 API 테스트

**목적**: 서버를 통한 이미지 생성 검증

**실행**:
```bash
# 터미널 1: 서버 시작
cd backend
UW_MODE=real uv run uvicorn unknown_world.main:app --port 8012

# 터미널 2: API 호출
curl -X POST http://localhost:8012/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A simple blue square"}'
```

**기대 결과 (성공 시)**:
```json
{
  "success": true,
  "status": "completed",
  "image_id": "img_xxx",
  "image_url": "/static/images/generated/img_xxx.png",
  "message": "이미지가 성공적으로 생성되었습니다.",
  "generation_time_ms": 55000
}
```

**기대 결과 (타임아웃 시)**:
```json
{
  "success": false,
  "status": "failed",
  "image_id": null,
  "image_url": null,
  "message": "이미지 생성 타임아웃 (60초 초과)",
  "generation_time_ms": 60003
}
```

**확인 포인트**:
- ✅ 서버가 `UW_MODE: real`로 시작됨 (로그 확인)
- ✅ 타임아웃 시 적절한 에러 메시지 반환
- ✅ 폴백 응답 형식 정확함

---

## 4. 실행 결과 확인

### 4.1 로그 확인

서버 로그에서 다음 메시지 확인:

**성공 시**:
```
[ImageGen] 이미지 생성 요청 (prompt_hash: xxx, model: gemini-3-pro-image-preview)
[ImageGen] 텍스트 응답 (디버깅용) (text_preview: ...)
[ImageGen] 이미지 데이터 추출 성공 (size_bytes: 1642167)
[ImageGen] 이미지 생성 완료 (image_id: img_xxx, elapsed_ms: 55000)
```

**타임아웃 시**:
```
[ImageGen] 이미지 생성 요청 (prompt_hash: xxx, model: gemini-3-pro-image-preview)
[ImageGen] 이미지 생성 타임아웃 (timeout_seconds: 60, elapsed_ms: 60003)
```

### 4.2 생성 파일

- `backend/.data/images/generated/img_xxx.png`: 생성된 이미지
- `backend/test_output.png`: 직접 테스트로 생성된 이미지

### 4.3 성능 지표

| 항목 | Mock 모드 | Real 모드 |
|------|-----------|-----------|
| 응답 시간 | < 100ms | 30-60초 |
| 이미지 크기 | ~100 bytes | ~1-2MB |
| 타임아웃 | N/A | 60초 |

### 4.4 성공/실패 판단 기준

**성공**:
- ✅ Mock 모드에서 이미지 생성 성공
- ✅ Real 모드 직접 테스트에서 이미지 생성 성공 (테스트 스크립트)
- ✅ 타임아웃 시 적절한 폴백 응답 반환
- ✅ 린트/타입 체크 통과

**실패 시 확인**:
- ❌ `ClientError: 404 NOT_FOUND` → 환경변수 (VERTEX_PROJECT, VERTEX_LOCATION) 확인
- ❌ 인증 실패 → GOOGLE_APPLICATION_CREDENTIALS 확인
- ❌ 타임아웃 → 네트워크 상태 또는 API 부하 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ClientError: 404 NOT_FOUND`
- **원인**: 환경변수가 로드되지 않음 또는 잘못된 프로젝트 ID
- **해결**: `.env` 파일 확인 및 `VERTEX_PROJECT` 설정

**오류**: `이미지 생성 타임아웃 (60초 초과)`
- **원인**: Gemini API 응답 지연 (이미지 생성은 30-60초 소요 가능)
- **해결**: 재시도 또는 더 간단한 프롬프트 사용

**오류**: `이미지 생성 클라이언트가 초기화되지 않았습니다`
- **원인**: Vertex AI 클라이언트 초기화 실패
- **해결**: 인증 설정 확인 (gcloud auth application-default login)

### 5.2 환경별 주의사항

- **Windows**: 환경변수 설정 시 `set UW_MODE=real` 또는 PowerShell에서 `$env:UW_MODE="real"` 사용
- **macOS/Linux**: `UW_MODE=real uv run ...` 형태로 실행

---

## 6. 다음 단계

- **U-065**: 스키마 단순화 시 이미지 생성 API 동작 영향 확인
- **CP-MVP-03**: Real 모드 데모에서 이미지 생성 확인
