# U-021[Mvp]: 이미지 이해(Scanner) 백엔드 엔드포인트 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-021[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-31 16:45
- **담당**: AI Agent

---

## 1. 작업 요약

사용자가 업로드한 이미지를 분석하여 캡션, 오브젝트(bbox), 아이템 후보를 추출하는 Scanner 백엔드 엔드포인트(`/api/scan`)를 구현했습니다. Gemini 3 Flash Vision 모델을 활용하며, 0~1000 정규화 좌표계 및 안전 폴백 원칙을 엄격히 준수합니다.

---

## 2. 작업 범위

- **이미지 업로드 엔드포인트 구현**: `multipart/form-data` 기반의 `/api/scan` POST 엔드포인트 구축
- **이미지 분석 서비스 구현**: `ImageUnderstandingService`를 통해 Gemini 비전 모델 호출 및 결과 파싱
- **데이터 모델 정의**: `ScanResult`, `DetectedObject`, `ItemCandidate` 등 구조화 출력을 위한 Pydantic 모델 정의
- **안전 정책 및 규약 준수**: 0~1000 정규화 bbox(`[ymin, xmin, ymax, xmax]`), 실패 시 안전 폴백, 민감 정보 로깅 금지 적용
- **Mock/Real 모드 지원**: 환경변수(`UW_MODE`)에 따른 실모델 호출 및 Mock 데이터 반환 스위칭 구현

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/api/scanner.py` | 신규 | Scanner API 엔드포인트 및 라우터 정의 |
| `backend/src/unknown_world/models/scanner.py` | 신규 | 스캔 결과 및 오브젝트/아이템 스키마 정의 |
| `backend/src/unknown_world/services/image_understanding.py` | 신규 | Gemini 비전 모델 호출 및 파싱 로직 구현 |
| `backend/src/unknown_world/main.py` | 수정 | `scanner_router` 등록 및 헬스체크 확장 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:
- `POST /api/scan`: 이미지 파일과 언어(`ko-KR`/`en-US`)를 받아 `ScannerResponse` 반환
- `GET /api/scan/health`: 서비스 상태 및 지원 포맷 확인
- `analyze(image_content, content_type, language)`: 비전 모델 호출 인터페이스

**설계 패턴/원칙**:
- **Structured Output**: 모델 응답을 JSON으로 강제하고 Pydantic으로 엄격히 검증
- **Normalization (RULE-009)**: 모든 bbox 좌표를 0~1000 범위로 정규화하여 프론트엔드와 좌표 정합성 유지
- **Safe Fallback (RULE-004)**: 분석 실패 시 빈 목록과 함께 성공 여부(`success: false`)를 명확히 반환하여 UI 중단 방지

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 업로드된 이미지는 메모리에서 즉시 처리되며, 별도의 파일 저장은 MMP 단계로 미룸
- **권한/보안**: Vertex AI 서비스 계정 인증을 통해 보안성 확보, 로그에 파일 내용 노출 금지
- **빌드/의존성**: `python-multipart` 의존성 추가 필요 (런북 명시)

### 4.3 가정 및 제약사항

- **파일 크기 제한**: Gemini API 제약에 따라 최대 20MB로 제한
- **지원 형식**: JPEG, PNG, GIF, WebP 등 주요 웹 이미지 형식 지원

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-021-scanner-endpoint-runbook.md`
- **실행 결과**: Mock/Real 모드별 헬스체크 및 스캔 시나리오 수동 검증 완료
- **참조**: 상세 테스트 절차 및 기대 결과는 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **모델 지연**: 비전 모델 특성상 텍스트보다 긴 지연시간 발생 가능 (프론트엔드 UI 처리가 중요)
- **좌표 정확도**: 모델이 반환하는 좌표의 정확도는 이미지 품질에 의존함

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-022[Mvp]**: Scanner 슬롯 UI 구현 및 백엔드 연동
2. **CP-MVP-06**: Scanner 업로드 게이트(안전/좌표/비용) 검증

### 7.2 의존 단계 확인

- **선행 단계**: U-016[Mvp] (GenAI 클라이언트/인증) 완료
- **후속 단계**: U-022[Mvp] 진행 예정

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
