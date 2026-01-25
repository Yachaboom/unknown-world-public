# U-019[Mvp]: 이미지 생성 엔드포인트/잡(조건부) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-019[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-25 15:45
- **담당**: AI Agent

---

## 1. 작업 요약

장면 이미지를 조건부로 생성하기 위한 백엔드 엔드포인트 및 서비스를 구현했습니다. `gemini-3-pro-image-preview` 모델을 고정 사용하며, 텍스트 턴의 지연을 방지하기 위해 별도의 API 경로로 이미지 생성을 처리합니다.

---

## 2. 작업 범위

- [x] 이미지 생성 서비스 (`ImageGenerator`, `MockImageGenerator`) 구현
- [x] 이미지 생성 API 엔드포인트 (`/api/image/generate`, `/api/image/status`, `/api/image/file`) 구현
- [x] 로컬 파일 기반 이미지 저장 및 정적 파일 서빙 설정
- [x] 실패 시 폴백 및 검증 로직 구현 (RULE-004)
- [x] 모델 라벨 및 ID 고정 적용 (RULE-010)

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `backend/src/unknown_world/services/image_generation.py` | 신규 | Gemini 이미지 생성 호출 및 저장 로직 |
| `backend/src/unknown_world/api/image.py` | 신규 | 이미지 생성 및 상태 조회 API 라우터 |
| `backend/src/unknown_world/api/__init__.py` | 수정 | `image_router` 내보내기 |
| `backend/src/unknown_world/main.py` | 수정 | 정적 파일 서빙 설정 및 라우터 등록 |
| `backend/tests/manual_test_image.py` | 신규 | 이미지 API 수동 검증 스크립트 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:
- `POST /api/image/generate`: 이미지 생성 요청 (Prompt, Size, Aspect Ratio)
- `GET /api/image/status/{image_id}`: 생성된 이미지 존재 여부 확인
- `GET /static/images/{filename}`: 생성된 이미지 파일 서빙 (로컬)

**설계 패턴/원칙**:
- **Lazy Generation**: 텍스트 턴(TTFB)을 블로킹하지 않도록 클라이언트에서 별도 호출 유도 (RULE-008)
- **Model Pinning**: `gemini-3-pro-image-preview` 모델로 고정 (RULE-010)
- **Mock Fallback**: API 키가 없거나 개발 환경인 경우 `MockImageGenerator`로 자동 전환되어 개발 연속성 확보

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `backend/generated_images/` 디렉토리에 PNG 파일이 생성됩니다.
- **보안**: 로그 기록 시 프롬프트 원문 대신 해시를 사용하여 보안 가이드 준수 (RULE-007).
- **의존성**: `google-genai` SDK를 사용하여 Vertex AI와 연동합니다.

### 4.3 가정 및 제약사항

- MVP 단계에서는 로컬 파일 시스템을 저장소로 사용하며, 다중 인스턴스 환경을 위한 GCS 확장은 MMP(U-102)에서 진행 예정입니다.
- 이미지 생성 시 현재는 1개씩 생성하는 것으로 고정되어 있습니다.

---

## 5. 런북(Runbook) 정보

- **검증 방법**: `backend/tests/manual_test_image.py` 실행을 통해 Mock 모드 동작 확인.
- **실제 호출**: `UW_MODE=real` 환경변수와 함께 Vertex AI 권한이 설정된 환경에서 실제 Gemini 호출 가능.

---

## 6. 리스크 및 주의사항

- 로컬 저장소 사용으로 인해 서버 재시작 시 정적 파일 유지 정책에 주의가 필요합니다 (MVP 수준에서는 허용).
- 이미지 생성 지연(Latency)은 텍스트에 비해 길기 때문에 프론트엔드에서 로딩 UI 처리가 필수적입니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-020[Mvp]**: 프론트엔드 SceneCanvas 레이지 로딩 연동
2. **U-035[Mvp]**: rembg 배경 제거 파이프라인 통합

### 7.2 의존 단계 확인

- **선행 단계**: U-016, U-017 완료됨
- **후속 단계**: U-020 (프론트엔드 연동)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
