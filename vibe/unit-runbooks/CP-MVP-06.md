# CP-MVP-06: Scanner 업로드 게이트 실행 가이드

## 1. 개요

Scanner(이미지 업로드) 기능이 "게임 조작"으로 자연스럽게 작동하고, 업로드 실패/비용 부족/안전 차단 등 현실적인 실패 조건에서도 **안전한 대체 결과**로 플레이가 이어지도록 수동 검증합니다.

**예상 소요 시간**: 15분

**의존성**:

- **U-021[Mvp]**: 이미지 이해(Scanner) 백엔드 엔드포인트
- **U-022[Mvp]**: Scanner 슬롯 UI + 업로드→아이템화 반영

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 루트 디렉토리에서
pnpm install

# 의존성 확인 (Python)
cd backend && uv sync
```

### 2.2 서버 실행

```bash
# 백엔드 실행 (포트 8011)
pnpm run dev:back

# 프론트엔드 실행 (포트 8001)
pnpm run dev:front
```

### 2.3 테스트 이미지 준비

```bash
# ImageMagick으로 테스트 이미지 생성
magick -size 100x100 xc:blue test-image.png

# 또는 아무 PNG/JPG 이미지 사용 가능
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 정상 업로드 (성공 경로)

**목적**: Scanner 업로드 → 분석 → 아이템화 → 인벤토리 추가 검증

**실행**:

1. 브라우저에서 `http://localhost:8001/` 접속
2. 프로필 선택 (예: 서사꾼)
3. 우측 사이드바 하단의 **SCANNER** 패널 확인
4. 테스트 이미지를 Scanner 슬롯에 드래그 또는 클릭하여 업로드

**기대 결과**:

1. "분석 중..." 로딩 상태 표시
2. 분석 완료 후:
   - 캡션 표시 (예: "[Mock] 테스트 이미지입니다...")
   - 감지된 오브젝트 수 표시
   - 아이템 후보 목록 표시 (체크박스 포함)
3. 아이템 선택 후 "추가" 버튼 클릭
4. 인벤토리에 선택한 아이템 추가 확인

**확인 포인트**:

- ✅ 업로드 시 프리뷰 이미지 표시
- ✅ 분석 완료 후 아이템 후보 목록 표시
- ✅ 사용자 확인 후 인벤토리 추가 (Option B 정책)
- ✅ Scanner 슬롯이 idle 상태로 복귀

---

### 시나리오 B: 지원하지 않는 파일 형식 테스트

**목적**: 비이미지 파일 업로드 시 안전한 폴백 확인

**실행 (CLI)**:

```bash
# 텍스트 파일 생성
echo "test" > test-invalid.txt

# API 호출
curl -s -X POST http://localhost:8011/api/scan \
  -F "file=@test-invalid.txt" \
  -F "language=ko-KR"
```

**기대 결과**:

```json
{
  "success": false,
  "status": "failed",
  "message": "지원하지 않는 이미지 형식입니다: text/plain",
  "language": "ko-KR"
}
```

**확인 포인트**:

- ✅ success: false
- ✅ 명확한 에러 메시지
- ✅ UI가 멈추지 않음 (에러 상태 표시 후 재시도 가능)

---

### 시나리오 C: 좌표 규약 확인 (RULE-009)

**목적**: bbox가 0~1000 정규화 및 [ymin,xmin,ymax,xmax] 순서 준수 확인

**실행**:

```bash
curl -s -X POST http://localhost:8011/api/scan \
  -F "file=@test-image.png" \
  -F "language=ko-KR"
```

**기대 결과**:

```json
{
  "objects": [
    {
      "label": "열쇠",
      "box_2d": {
        "ymin": 100,
        "xmin": 200,
        "ymax": 300,
        "xmax": 400
      }
    }
  ]
}
```

**확인 포인트**:

- ✅ box_2d 필드가 `{ymin, xmin, ymax, xmax}` 형태
- ✅ 모든 좌표 값이 0~1000 범위 내
- ✅ ymin < ymax, xmin < xmax

---

### 시나리오 D: 언어 정책 확인 (RULE-006)

**목적**: ko/en 혼합 출력 없음 확인

**실행 (한국어)**:

```bash
curl -s -X POST http://localhost:8011/api/scan \
  -F "file=@test-image.png" \
  -F "language=ko-KR"
```

**실행 (영어)**:

```bash
curl -s -X POST http://localhost:8011/api/scan \
  -F "file=@test-image.png" \
  -F "language=en-US"
```

**확인 포인트**:

- ✅ ko-KR 요청 시 caption/label이 모두 한국어
- ✅ en-US 요청 시 caption/label이 모두 영어
- ✅ 언어 혼합 없음

---

### 시나리오 E: Scanner 헬스체크

**목적**: Scanner 서비스 상태 확인

**실행**:

```bash
curl -s http://localhost:8011/api/scan/health
```

**기대 결과**:

```json
{
  "status": "ok",
  "mode": "mock",
  "model": "VISION (gemini-3-flash-preview)",
  "supported_formats": ["image/png", "image/jpeg", "image/gif", "image/jpg", "image/webp"],
  "max_file_size_mb": 20
}
```

**확인 포인트**:

- ✅ status: "ok"
- ✅ 지원 포맷 목록 정확
- ✅ 최대 파일 크기 20MB

---

## 4. 성공/실패 판단 기준

### 성공 조건 (Hard Gate)

- ✅ **Schema OK**: API 응답이 ScannerResponse 스키마 준수
- ✅ **Coordinate OK**: bbox가 0~1000 정규화 + [ymin,xmin,ymax,xmax] 준수
- ✅ **Language OK**: ko/en 혼합 출력 없음
- ✅ **Fallback OK**: 실패 시 안전한 에러 응답 반환
- ✅ **UI OK**: 업로드 → 분석 → 아이템화 플로우 정상 동작

### 실패 시 확인

- ❌ API 500 에러 → 백엔드 로그 확인
- ❌ 좌표 범위 초과 → image_understanding.py 정규화 로직 확인
- ❌ 언어 혼합 → 프롬프트 및 Mock 응답 언어 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `ERR_CONNECTION_REFUSED`

- **원인**: 백엔드 서버 미실행
- **해결**: `pnpm run dev:back` 실행

**오류**: `지원하지 않는 이미지 형식입니다`

- **원인**: 파일 Content-Type이 허용 목록에 없음
- **해결**: PNG/JPG/GIF/WebP 파일만 사용

**오류**: `파일이 너무 큽니다`

- **원인**: 20MB 초과
- **해결**: 더 작은 파일 사용

### 5.2 환경별 주의사항

- **Windows**: 파일 경로에 공백 포함 시 따옴표로 감싸기
- **Mock 모드**: `UW_MODE=mock` 환경에서는 고정된 Mock 응답 반환

---

## 6. 검증 체크리스트

| 항목 | 규칙 | 상태 |
|------|------|------|
| Scanner 업로드 → 분석 → 아이템화 성공 | PRD 6.7 | ☐ |
| bbox 0~1000 정규화 준수 | RULE-009 | ☐ |
| bbox [ymin,xmin,ymax,xmax] 순서 준수 | RULE-009 | ☐ |
| 실패 시 안전한 폴백 응답 | RULE-004 | ☐ |
| ko/en 혼합 출력 없음 | RULE-006 | ☐ |
| 프롬프트/내부 추론 노출 없음 | RULE-008 | ☐ |
| UI가 멈추지 않음 (에러 시에도) | RULE-004 | ☐ |

---

## 7. 다음 단계

- **CP-MVP-03**: 멀티모달(업로드) 조작을 포함한 통합 데모 시나리오 검증
- 발견된 결함은 `vibe/debt-log.md`에 기록
