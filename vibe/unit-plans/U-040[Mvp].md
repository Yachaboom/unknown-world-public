# U-040[Mvp]: 에셋 요청 스키마 정합(rembg_model 이슈) + 테스트/런북 복구

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-040[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 45분        |
| 의존성    | U-034       |
| 우선순위  | Medium      |

## 작업 목표

`nanobanana-asset-request.schema.json`(SSOT)과 이를 검증/설명하는 테스트·런북 간 **필드명 불일치(rembg_model)** 를 해소하여, 에셋 파이프라인 문서/검증이 다시 신뢰 가능한 상태가 되도록 한다.

**배경**: `vibe/debt-log.md`에 기록된 것처럼 `backend/tests/unit/test_u034_verification.py`가 `rembg_model` 필드를 요구하지만, 현재 스키마의 SSOT는 `rembg_options.model` 형태여서 검증 실패가 발생한다. (U-034 산출물 정합 필요)

**완료 기준**:

- `backend/tests/unit/test_u034_verification.py`가 스키마의 **실제 SSOT 필드**(예: `rembg_options.model`)를 기준으로 검증하여 실패하지 않는다.
- `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md`의 “스키마 주요 필드” 및 시나리오가 최신 스키마와 정합하다(필드명/예시/설명).
- `vibe/debt-log.md`의 해당 항목이 “해결됨(또는 해결 유닛 완료)”으로 갱신되어, 재발 시점/원인/대응이 추적 가능하다.

## 영향받는 파일

**수정**:

- `backend/tests/unit/test_u034_verification.py` - required field 검증을 스키마 SSOT와 일치시키고, 런북/계획서 기준의 “필수 필드” 정의를 최신화
- `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md` - `rembg_model` 표기를 제거하거나, `rembg_options.model`로 교체하여 런북 절차/표/검증 포인트 정합화
- (필요 시) `vibe/ref/nanobanana-asset-request.schema.json` - “rembg 모델 선택”의 SSOT가 `rembg_options.model`임을 설명/예시에서 명시(문서 혼선을 줄이기 위한 최소 수정)
- `vibe/debt-log.md` - 이슈 해결 상태/근거 업데이트

**참조**:

- `vibe/unit-results/U-034[Mvp].md` - U-034 산출물(스키마/가이드/런북) SSOT
- `vibe/ref/nanobanana-mcp.md` - dev-only 에셋 제작 가이드(템플릿/후처리 규칙)
- `vibe/ref/rembg-guide.md` - rembg 모델/옵션 기준

## 구현 흐름

### 1단계: 스키마 “SSOT 필드” 확정 및 문서 기준 정리

- `nanobanana-asset-request.schema.json`에서 rembg 모델 선택의 단일 기준을 확정한다(권장: `rembg_options.model`).
- “필수 필드”의 의미를 구분한다:
  - JSON Schema의 `required`(최소 필수)
  - 런북/테스트가 검증하는 “워크플로우 필수(조건부 포함)”

### 2단계: 테스트/런북 정합화(스키마 기준으로)

- 테스트(`test_u034_verification.py`)의 `required_fields`를 최신 스키마 구조로 맞춘다.
- 런북에서 `rembg_model` 표기/표/검증 포인트를 `rembg_options.model` 중심으로 갱신한다.

### 3단계: 재발 방지(SSOT 연결 강화)

- debt-log 항목에 “최종 SSOT 필드”와 “수정된 파일 목록”을 남겨 재발 시 빠르게 원인 추적 가능하게 한다.
- (선택) 런북에 “스키마 변경 시 테스트/런북도 같이 갱신” 체크를 추가한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-034[Mvp]](U-034[Mvp].md) - 에셋 요청 스키마/템플릿/런북의 기준선
- **결과물**: `vibe/ref/nanobanana-asset-request.schema.json`, `vibe/ref/nanobanana-mcp.md`, `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md`

**다음 작업에 전달할 것**:

- 에셋 제작 파이프라인 문서/검증이 깨지지 않는 기준선(스키마/테스트/런북 정합)
- 이후 에셋 관련 유닛(placeholder/chrome/manifest)에서 “필드명 드리프트”로 인한 혼선 감소

## 주의사항

**기술적 고려사항**:

- (RULE-007) `nanobanana mcp`/스키마/런북은 dev-only이며, 런타임 의존으로 확장하지 않는다.
- 스키마는 `additionalProperties: false`로 엄격하므로, “편의 필드”를 무분별하게 늘리기보다 문서/테스트를 SSOT에 맞추는 쪽을 우선한다.

**잠재적 리스크**:

- 문서/테스트가 서로 다른 “필수” 기준을 강제하면 다시 드리프트가 발생한다 → “Schema required”와 “Runbook required(조건부)”를 명확히 구분해 기술한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: rembg 모델 선택 필드의 SSOT는 무엇으로 둘까?
  - Option A: `rembg_model`(top-level) 유지(단순) + `rembg_options`는 확장 옵션
  - Option B: `rembg_options.model`를 SSOT로 확정(확장성/일관성) ✅
  **A1**: Option B

## 참고 자료

- `vibe/debt-log.md` - “에셋 요청 스키마 검증 실패(rembg_model)” 이슈 기록
- `vibe/ref/nanobanana-asset-request.schema.json` - 스키마 SSOT
- `backend/tests/unit/test_u034_verification.py` - 스키마/가이드 정합성 테스트
