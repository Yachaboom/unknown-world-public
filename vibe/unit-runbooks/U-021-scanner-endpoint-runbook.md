# U-021[Mvp] 이미지 이해(Scanner) 백엔드 엔드포인트 실행 가이드

## 1. 개요

사용자가 업로드한 이미지를 분석하여 캡션, 오브젝트(bbox), 아이템 후보를 추출하는 Scanner 백엔드 엔드포인트(`/api/scan`)를 구현했습니다.

**핵심 기능**:
- 이미지 업로드(multipart/form-data) 지원
- 캡션, 오브젝트(bbox 포함), 아이템 후보 추출
- bbox는 0~1000 정규화 + `[ymin, xmin, ymax, xmax]` 규약 준수 (RULE-009)
- 실패 시 안전한 폴백 응답 (RULE-004)
- Mock/Real 모드 자동 전환

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-016[Mvp] (GenAI 클라이언트/인증/모델 라벨)
- 선행 완료 필요: 백엔드 서버 실행 환경

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd backend
uv sync
```

### 2.2 환경 변수 설정

`.env` 파일이 `backend/` 디렉토리에 있어야 합니다.

```bash
# backend/.env (Mock 모드)
UW_MODE=mock
ENVIRONMENT=development

# backend/.env (Real 모드 - Vertex AI 필요)
UW_MODE=real
VERTEX_PROJECT=your-project-id
VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### 2.3 즉시 실행

```bash
cd backend
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.4 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8011/docs` 열기
- Swagger UI에서 `/api/scan` 엔드포인트 확인
- 성공 지표: 서버 시작 로그에 `[Startup] Unknown World 백엔드 시작 완료` 메시지

---

## 3. 핵심 기능 시나리오

### 시나리오 A: Scanner 헬스체크

**목적**: Scanner 서비스 상태 확인

**실행**:

```bash
curl -s http://localhost:8011/api/scan/health | python -m json.tool
```

**기대 결과**:

```json
{
    "status": "ok",
    "mode": "mock",
    "model": "VISION (gemini-3-flash-preview)",
    "supported_formats": [
        "image/gif",
        "image/jpg",
        "image/webp",
        "image/jpeg",
        "image/png"
    ],
    "max_file_size_mb": 20
}
```

**확인 포인트**:
- ✅ `status`가 `"ok"`
- ✅ `mode`가 환경변수(`UW_MODE`)와 일치
- ✅ 지원 형식 목록이 표시됨

---

### 시나리오 B: Mock 모드 이미지 스캔 (한국어)

**목적**: Mock 모드에서 한국어 이미지 분석 결과 확인

**전제 조건**:
- `UW_MODE=mock` 환경변수 설정
- 테스트용 이미지 파일 준비 (실제 이미지 내용은 Mock 모드에서 무시됨)

**실행**:

```bash
curl -s -X POST "http://localhost:8011/api/scan" \
  -F "file=@/path/to/test-image.png;type=image/png" \
  -F "language=ko-KR" | python -m json.tool
```

**기대 결과**:

```json
{
    "success": true,
    "status": "completed",
    "caption": "[Mock] 테스트 이미지입니다. 여러 오브젝트가 감지되었습니다.",
    "objects": [
        {
            "label": "열쇠",
            "box_2d": {
                "ymin": 100,
                "xmin": 200,
                "ymax": 300,
                "xmax": 400
            },
            "confidence": 0.95,
            "suggested_item_type": "key"
        },
        {
            "label": "상자",
            "box_2d": {
                "ymin": 400,
                "xmin": 100,
                "ymax": 700,
                "xmax": 500
            },
            "confidence": 0.88,
            "suggested_item_type": "container"
        }
    ],
    "item_candidates": [
        {
            "id": "item_001",
            "label": "녹슨 열쇠",
            "description": "오래된 자물쇠를 열 수 있을 것 같은 열쇠입니다.",
            "item_type": "key",
            "source_object_index": 0
        },
        {
            "id": "item_002",
            "label": "나무 상자",
            "description": "무언가 들어있을 것 같은 작은 상자입니다.",
            "item_type": "container",
            "source_object_index": 1
        }
    ],
    "message": null,
    "analysis_time_ms": 0,
    "language": "ko-KR"
}
```

**확인 포인트**:
- ✅ `success`가 `true`
- ✅ `status`가 `"completed"`
- ✅ `caption`이 한국어
- ✅ `objects`에 bbox 정보 포함 (0~1000 정규화)
- ✅ `item_candidates`에 아이템 후보 포함
- ✅ `language`가 요청한 언어와 일치

---

### 시나리오 C: Mock 모드 이미지 스캔 (영어)

**목적**: Mock 모드에서 영어 이미지 분석 결과 확인

**실행**:

```bash
curl -s -X POST "http://localhost:8011/api/scan" \
  -F "file=@/path/to/test-image.png;type=image/png" \
  -F "language=en-US" | python -m json.tool
```

**기대 결과**:

```json
{
    "success": true,
    "status": "completed",
    "caption": "[Mock] Test image. Multiple objects detected.",
    "objects": [
        {
            "label": "Key",
            "box_2d": { ... }
        },
        ...
    ],
    "item_candidates": [
        {
            "id": "item_001",
            "label": "Rusty Key",
            ...
        },
        ...
    ],
    "language": "en-US"
}
```

**확인 포인트**:
- ✅ `caption`이 영어
- ✅ `objects[].label`이 영어
- ✅ `item_candidates[].label`이 영어

---

### 시나리오 D: 지원하지 않는 파일 형식

**목적**: 잘못된 파일 형식에 대한 안전한 폴백 확인 (RULE-004)

**실행**:

```bash
curl -s -X POST "http://localhost:8011/api/scan" \
  -F "file=@/path/to/test.txt;type=text/plain" \
  -F "language=ko-KR" | python -m json.tool
```

**기대 결과**:

```json
{
    "success": false,
    "status": "failed",
    "caption": "",
    "objects": [],
    "item_candidates": [],
    "message": "지원하지 않는 이미지 형식입니다: text/plain",
    "analysis_time_ms": 0,
    "language": "ko-KR"
}
```

**확인 포인트**:
- ✅ `success`가 `false`
- ✅ `status`가 `"failed"`
- ✅ `message`에 에러 원인 포함
- ✅ 스키마 준수 (빈 목록으로 폴백)

---

## 4. 실행 결과 확인

### 4.1 로그 확인

서버 콘솔에서 다음 로그 메시지 확인:

- `[ImageUnderstanding] 서비스 초기화` - 서비스 시작
- `[ScannerAPI] 스캔 요청` - 요청 수신
- `[ImageUnderstanding] Mock 분석 수행` - Mock 모드 분석 (또는 `비전 모델 호출`)

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ `/api/scan/health` 응답 정상
- ✅ Mock 모드에서 한국어/영어 스캔 결과 반환
- ✅ bbox가 0~1000 범위 내
- ✅ 잘못된 파일 형식에 대해 스키마 준수 폴백

**실패 시 확인**:
- ❌ 서버 시작 실패 → `python-multipart` 설치 확인 (`uv add python-multipart`)
- ❌ 인증 오류 (Real 모드) → `GOOGLE_APPLICATION_CREDENTIALS` 설정 확인
- ❌ 타임아웃 → 네트워크/모델 가용성 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `Form data requires "python-multipart" to be installed`

- **원인**: multipart/form-data 처리에 필요한 패키지 미설치
- **해결**: `cd backend && uv add python-multipart`

**오류**: `비전 클라이언트가 초기화되지 않았습니다`

- **원인**: Real 모드에서 Vertex AI 인증 실패
- **해결**:
  1. `UW_MODE=mock`으로 변경하여 Mock 모드 사용
  2. 또는 Vertex AI 인증 설정 확인 (`GOOGLE_APPLICATION_CREDENTIALS`)

**오류**: `지원하지 않는 이미지 형식입니다`

- **원인**: 허용되지 않는 Content-Type
- **해결**: `image/jpeg`, `image/png`, `image/gif`, `image/webp` 중 하나 사용

### 5.2 환경별 주의사항

- **Windows**: 경로에 공백이 있으면 따옴표로 감싸기
- **macOS/Linux**: curl 명령어는 동일

---

## 6. API 스펙 요약

### POST /api/scan

**Request**:
- Content-Type: `multipart/form-data`
- Body:
  - `file`: 이미지 파일 (필수)
  - `language`: 응답 언어 (`ko-KR` 또는 `en-US`, 기본값: `ko-KR`)

**Response**:
```json
{
  "success": boolean,
  "status": "completed" | "partial" | "failed" | "blocked",
  "caption": string,
  "objects": [
    {
      "label": string,
      "box_2d": { "ymin": int, "xmin": int, "ymax": int, "xmax": int },
      "confidence": float | null,
      "suggested_item_type": string | null
    }
  ],
  "item_candidates": [
    {
      "id": string,
      "label": string,
      "description": string,
      "item_type": string,
      "source_object_index": int | null
    }
  ],
  "message": string | null,
  "analysis_time_ms": int,
  "language": "ko-KR" | "en-US"
}
```

### GET /api/scan/health

**Response**:
```json
{
  "status": string,
  "mode": "mock" | "real",
  "model": string,
  "supported_formats": string[],
  "max_file_size_mb": int
}
```

---

## 7. 다음 단계

1. **U-022**: Scanner 슬롯 UI 구현 (프론트엔드)
2. **RU-006**: media 저장/제한/보안 기준 정리
