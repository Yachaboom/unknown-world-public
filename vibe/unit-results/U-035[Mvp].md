# [U-035[Mvp]] 실시간 이미지 생성 시 rembg 배경 제거 통합 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-035[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-25 15:40
- **담당**: AI Agent

---

## 1. 작업 요약

실시간 이미지 생성 파이프라인에 `rembg`를 활용한 배경 제거(Background Removal) 후처리 과정을 통합하였습니다. 생성된 이미지의 유형(아이콘, 캐릭터, 인물 등)에 따라 최적의 배경 제거 모델을 자동으로 선택하며, 처리 실패 시에도 원본 이미지를 안전하게 반환하는 폴백 구조를 갖추었습니다.

---

## 2. 작업 범위

- **rembg 후처리 서비스 구축**: 모델 자동 선택 로직 및 CLI 호출 래퍼 구현
- **이미지 생성 서비스 통합**: `ImageGenerator` 및 `MockImageGenerator`에 배경 제거 옵션 연동
- **데이터 모델 확장**: `ImageJob` 및 `ImageGenerationRequest` 스키마에 배경 제거 관련 필드 추가
- **안전 폴백 구현**: rembg 미설치, 타임아웃, 실행 오류 시 원본 이미지를 유지하도록 설계

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `backend/src/unknown_world/services/image_postprocess.py` | 신규 | rembg 배경 제거 서비스 (모델 자동 선택 및 CLI 래퍼) |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | 생성 완료 후 배경 제거 후처리 로직 호출 통합 |
| `backend/src/unknown_world/models/turn.py` | 수정 | `ImageJob` 스키마에 `remove_background`, `image_type_hint` 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:

- `ImagePostprocessor.remove_background(input_path, image_type_hint, ...)` - rembg를 통한 배경 제거 수행
- `select_model_from_hint(image_type_hint)` - 힌트 기반 최적 모델(`birefnet-general`, `isnet-anime`, `birefnet-portrait` 등) 매핑

**설계 패턴/원칙**:

- **RULE-004 (Safe Fallback)**: rembg 처리 중 발생하는 모든 예외 상황에서 원본 이미지를 `output_path`로 복사하여 반환함으로써 시스템 중단을 방지합니다.
- **Option B (Auto-Model Selection)**: `image_type_hint`에 따라 `rembg-guide.md` 기준의 최적 모델을 선택합니다.
- **Option A (Synchronous Processing)**: 이미지 생성 자체가 분리된 엔드포인트에서 동작하므로, 후처리는 생성 직후 동기적으로 수행하여 구현 단순성을 유지합니다.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `generated_images/` 디렉토리에 배경이 제거된 `{filename}_nobg.png` 파일이 추가로 생성될 수 있습니다.
- **런타임 의존성**: 시스템에 `rembg` CLI가 설치되어 있어야 작동하며, 미설치 시 자동으로 원본 유지 폴백이 동작합니다.

### 4.3 가정 및 제약사항

- rembg의 첫 실행 시 모델 다운로드 지연이 발생할 수 있습니다 (배포 시 사전 다운로드 권장).
- 복잡한 배경의 경우 완벽한 제거가 어려울 수 있으며, 이는 모델 선택(`birefnet-dis` 등)을 통해 완화합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-035-rembg-integration-runbook.md`
- **실행 결과**: `rembg` 명령어를 통한 배경 제거 및 실패 시 폴백 시나리오 검증 완료
- **참조**: 상세 테스트 시나리오는 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **지연 시간**: 고품질 모델(`birefnet-massive` 등) 사용 시 처리 시간이 증가할 수 있으며, 이는 `timeout_seconds`(기본 60초)로 관리됩니다.
- **리소스 사용**: CPU/GPU 집약적인 작업이므로 대량 요청 시 서버 부하를 고려해야 합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **린트 및 타입 체크**: `ruff check`, `pyright` 실행
2. **U-022(Scanner 슬롯)**: 사용자 업로드 이미지 배경 제거 시 동일 파이프라인 재사용

### 7.2 의존 단계 확인

- **선행 단계**: U-019, U-020 (완료)
- **후속 단계**: CP-MVP-05 (멀티모달 이미지 게이트 검증)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] rembg 모델 자동 선택 및 폴백 로직 검증
- [x] 스키마 확장에 따른 프론트/백엔드 정합성 확보

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
