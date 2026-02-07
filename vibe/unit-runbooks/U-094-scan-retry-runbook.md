# U-094[Mvp] ImageUnderstanding 응답 파싱 예외 시 자동 재시도 실행 가이드

## 1. 개요

Scanner(`POST /api/scan`)의 이미지 이해(ImageUnderstanding) 응답 파싱 중 예외가 발생하면 자동으로 재시도하여, 사용자에게 "분석 실패"가 노출되는 빈도를 줄이는 기능을 구현했습니다.

- 최대 2회 자동 재시도 (총 3회 시도)
- 재시도 시 JSON 형식 강조 지시 추가 (Q1: Option B)
- 재시도 간 백오프: 1초, 2초
- 안전 차단/인증 실패/할당량 초과는 재시도 제외
- 모든 재시도 실패 시 안전한 폴백 응답 반환 (빈 아이템 목록 + 에러 메시지)

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-021[Mvp] (이미지 이해 엔드포인트)
- 참조: U-018[Mvp] (Repair loop 패턴)
- 선행 완료 필요: 백엔드 서버 실행 가능한 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd backend
cp .env.example .env  # (최초 1회) API 키 설정
uv sync
```

### 2.2 백엔드 서버 시작

```bash
cd backend
uv run uvicorn unknown_world.main:app --host 0.0.0.0 --port 8011 --reload
```

### 2.3 헬스체크

```bash
curl -s http://localhost:8011/api/scan/health
```

- 성공 지표: `{"status":"ok","mode":"real",...}` (또는 `"mode":"mock"`)

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 정상 스캔 (재시도 없이 1회 성공)

**목적**: 정상 이미지 스캔 시 기존 동작이 유지되는지 검증

**실행**:

```bash
curl -s -X POST http://localhost:8011/api/scan \
  -F "file=@frontend/public/ui/items/key-64.png" \
  -F "language=ko-KR"
```

**기대 결과**:

```json
{
  "success": true,
  "status": "completed",
  "caption": "...(이미지 설명)...",
  "objects": [...],
  "item_candidates": [...],
  "message": null,
  "analysis_time_ms": 8000-20000
}
```

**확인 포인트**:

- ✅ `success: true`, `status: "completed"`
- ✅ `item_candidates`에 1개 이상 아이템 존재
- ✅ `objects`에 bbox 좌표 0~1000 범위
- ✅ 재시도 없이 빠르게 응답 (8~20초)

---

### 시나리오 B: 영어 언어 스캔

**목적**: 영어 언어로도 정상 동작 검증

**실행**:

```bash
curl -s -X POST http://localhost:8011/api/scan \
  -F "file=@frontend/public/ui/items/sword-64.png" \
  -F "language=en-US"
```

**기대 결과**:

```json
{
  "success": true,
  "status": "completed",
  "caption": "A pixel art illustration of...",
  "item_candidates": [{"label": "...(영어)...", ...}],
  "language": "en-US"
}
```

**확인 포인트**:

- ✅ `success: true`, `status: "completed"`
- ✅ 캡션/아이템 라벨이 영어
- ✅ `language: "en-US"` 일관성

---

### 시나리오 C: 브라우저 Scanner UI 통합 테스트

**목적**: 프론트엔드 Scanner 슬롯에서 이미지 업로드→아이템화 전체 흐름 검증

**전제 조건**:

- 백엔드 서버 실행 중 (포트 8011)
- 프론트엔드 서버 실행 중 (`pnpm -C frontend dev`, 포트 8001)

**실행 순서**:

1. 브라우저에서 `http://localhost:8001` 접속
2. SCANNER 영역의 "이미지를 드롭하거나 클릭하여 업로드" 클릭
3. 테스트 이미지 선택 (예: `frontend/public/ui/items/key-64.png`)
4. 분석 결과 확인

**기대 결과**:

- Scanner 영역에 이미지 미리보기 표시
- 캡션 텍스트 표시
- 감지된 오브젝트/아이템 후보 수 표시
- 아이템 후보 선택 후 "추가" 버튼으로 인벤토리 추가 가능

**확인 포인트**:

- ✅ 분석 완료 후 아이템 후보 목록 표시
- ✅ 아이템 선택/해제 토글 가능
- ✅ "추가" 버튼 클릭 시 인벤토리에 반영

---

### 시나리오 D: 재시도 동작 검증 (로그 기반)

**목적**: 파싱 실패 시 재시도가 올바르게 동작하는지 로그로 검증

**설명**: Gemini 비전 모델의 응답이 간헐적으로 JSON Schema를 벗어나는 경우에만 재시도가 트리거됩니다. 정상 동작 시에는 재시도가 발생하지 않습니다.

**확인 포인트** (서버 로그):

- 재시도 발생 시: `[Scan] 파싱 실패, 재시도 1/2 (백오프 1.0초)`
- 재시도 성공 시: `[Scan] 재시도 성공 (2/3 시도)`
- 모든 재시도 실패 시: `[Scan] 모든 재시도 실패 (3/3 시도), 폴백 응답 반환`
- 재시도 불가 에러 시: `[Scan] 재시도 불가 API 오류: ...`
- 안전 차단 시: `[Scan] 안전 차단, 재시도 건너뜀`

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 주요 로그 메시지:
  - `[ImageUnderstanding] 비전 모델 호출` - 정상 API 호출
  - `[Scan] 파싱 실패, 재시도 N/2` - 재시도 시도
  - `[Scan] 재시도 성공` - 재시도 후 성공
  - `[Scan] 모든 재시도 실패` - 최종 폴백
  - `[Scan] 재시도 불가 API 오류` - 인증/할당량 에러

### 4.2 재시도 설정 상수

| 상수 | 값 | 설명 |
| --- | --- | --- |
| `SCAN_MAX_RETRIES` | 2 | 최대 재시도 횟수 (총 3회) |
| `SCAN_RETRY_BACKOFF_SECONDS` | [1.0, 2.0] | 백오프 시간 |
| `SCAN_RETRY_REINFORCEMENT` | (ko/en) | JSON 형식 강조 지시 |

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ 정상 이미지 스캔 시 `status: "completed"` 반환
- ✅ 기존 기능(아이템 추출, bbox 좌표)에 회귀 없음
- ✅ 브라우저 Scanner UI 정상 동작
- ✅ 린트/타입 체크 통과

**실패 시 확인**:

- ❌ 스캔이 항상 실패 → API 키 설정 확인 (`GOOGLE_API_KEY`)
- ❌ 재시도가 무한 반복 → `SCAN_MAX_RETRIES` 상수 확인 (기본 2)
- ❌ 모든 재시도 실패 후 에러 응답 → 폴백 메시지 확인 (비어있지 않아야 함)

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `"mode":"mock"` (헬스체크)

- **원인**: `GOOGLE_API_KEY` 환경변수 미설정
- **해결**: `backend/.env` 파일에 `GOOGLE_API_KEY=your-key` 설정

**오류**: `"status":"failed"` 지속

- **원인**: Gemini API 연결 문제 또는 할당량 초과
- **해결**:
  1. API 키 유효성 확인
  2. Google Cloud Console에서 할당량 확인
  3. 로그에서 에러 타입 확인 (`[Scan] 재시도 불가 API 오류: ...`)

### 5.2 환경별 주의사항

- **Windows**: `.env` 파일 인코딩이 UTF-8인지 확인
- **macOS/Linux**: `.env` 파일 권한 확인 (읽기 가능)
