# U-040[Mvp]: 에셋 요청 스키마 정합(rembg_model 이슈) + 테스트/런북 복구 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-040[Mvp]
- **단계 번호**: Mvp
- **작성 일시**: 2026-01-28 17:50
- **담당**: AI Agent

---

## 1. 작업 요약

`nanobanana-asset-request.schema.json`(SSOT)과 테스트/런북 간의 **필드명 불일치(rembg_model vs rembg_options.model)** 를 해소하고, `rembg_options.model`을 SSOT로 확정하여 관련 테스트 및 문서를 정합시켰습니다. 또한 `genai_client.py` 및 `image_generation.py`의 관련 로직을 개선하여 안정성을 확보했습니다.

---

## 2. 작업 범위

- **테스트 코드 수정**: `backend/tests/unit/test_u034_verification.py`에서 `rembg_model` 검증 로직 제거 및 `rembg_options.model` 구조 검증 로직 추가
- **문서 정합화**: `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md` 내 스키마 필드 설명을 최신 SSOT(`rembg_options.model`)로 갱신
- **부채 해결 기록**: `vibe/debt-log.md`에 해당 이슈 해결 상태 업데이트
- **로직 개선**: `backend/src/unknown_world/services/genai_client.py` 및 `backend/src/unknown_world/services/image_generation.py` 수정
- **런북 작성**: `vibe/unit-runbooks/U-040-schema-alignment-runbook.md` 신규 작성

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/tests/unit/test_u034_verification.py` | 수정 | 스키마 정합성 테스트 로직 최신화 |
| `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md` | 수정 | 런북 내 스키마 필드 설명 SSOT 반영 |
| `vibe/debt-log.md` | 수정 | 기술 부채 해결 로그 업데이트 |
| `vibe/unit-runbooks/U-040-schema-alignment-runbook.md` | 신규 | U-040 작업 실행 및 검증 가이드 |
| `backend/src/unknown_world/services/genai_client.py` | 수정 | GenAI 클라이언트 로직 개선 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | 이미지 생성 서비스 로직 개선 |
| `backend/pyproject.toml` | 수정 | 백엔드 의존성 설정 업데이트 |
| `backend/uv.lock` | 수정 | 의존성 잠금 파일 업데이트 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**SSOT 확정**:
- **rembg 모델 선택 필드**: `rembg_model` (Top-level) → `rembg_options.model` (Nested)
- **이유**: 확장성 및 구조적 일관성 확보

**검증 로직 변경**:
- `test_u034_verification.py`는 이제 `nanobanana-asset-request.schema.json` 파일의 `rembg_options.properties.model` 존재 여부와 `enum` 값들을 검증합니다.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 기존 스키마 파일(`nanobanana-asset-request.schema.json`)은 변경되지 않았으나, 이를 참조하는 문서와 테스트가 변경됨.
- **권한/보안**: 변경 없음.
- **빌드/의존성**: `backend` 의존성 일부 조정 (`pyproject.toml`, `uv.lock`).

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-040-schema-alignment-runbook.md`
- **실행 결과**:
  - `pytest tests/unit/test_u034_verification.py` 실행 시 모든 테스트 통과 (7 passed)
  - 런북 내 `rembg_model` 검색 시 결과 없음 (제거 완료)
  - `rembg_options` 검색 시 올바르게 참조됨 확인

---

## 6. 리스크 및 주의사항

- **스키마 변경 시 동기화**: 향후 스키마 파일이 변경될 경우, `test_u034_verification.py`와 `U-034` 런북도 반드시 함께 업데이트되어야 함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-031/U-032**: 에셋 제작 및 크롬팩 작업 시 `rembg_options.model` 필드를 사용하여 요청 생성.

### 7.2 의존 단계 확인

- **선행 단계**: U-034[Mvp] (완료)
- **후속 단계**: U-031, U-032 (에셋 관련 후속 작업)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
