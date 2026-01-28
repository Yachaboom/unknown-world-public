# U-040[Mvp] 에셋 요청 스키마 정합(rembg_model 이슈) 실행 가이드

## 1. 개요

`nanobanana-asset-request.schema.json`(SSOT)과 테스트/런북 간의 **필드명 불일치(`rembg_model`)** 를 해소했습니다.
SSOT를 `rembg_options.model`로 확정하고, 테스트와 런북이 이 필드를 올바르게 검증하도록 수정했습니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-034[Mvp] (에셋 요청 스키마/템플릿/런북의 기준선)
- 선행 완료 필요: 없음 (이 유닛에서 정합성 복구)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 의존성 설치 (uv 사용)
cd backend && uv sync --group dev
```

### 2.2 즉시 검증

```bash
# 테스트 실행
cd backend && uv run pytest tests/unit/test_u034_verification.py -v
```

### 2.3 예상 결과

```
tests/unit/test_u034_verification.py::test_schema_file_exists PASSED
tests/unit/test_u034_verification.py::test_schema_is_valid_json PASSED
tests/unit/test_u034_verification.py::test_schema_required_properties PASSED
tests/unit/test_u034_verification.py::test_schema_rembg_options_model PASSED
tests/unit/test_u034_verification.py::test_guide_file_exists PASSED
tests/unit/test_u034_verification.py::test_guide_content_completeness PASSED
tests/unit/test_u034_verification.py::test_schema_rembg_rules PASSED

============================== 7 passed ==============================
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: SSOT 필드 확인 (`rembg_options.model`)

**목적**: rembg 모델 선택 필드의 SSOT가 `rembg_options.model`인지 확인

**실행**:

```bash
# 스키마에서 rembg_options.model 필드 확인
cat vibe/ref/nanobanana-asset-request.schema.json | jq '.properties.rembg_options.properties.model'
```

**기대 결과**:

```json
{
  "type": "string",
  "enum": [
    "birefnet-general",
    "birefnet-portrait",
    "birefnet-dis",
    ...
  ],
  "default": "birefnet-general",
  "description": "rembg 모델 선택. UI 아이콘/픽셀 아트/에셋: birefnet-general(기본)..."
}
```

**확인 포인트**:

- ✅ `rembg_options.model` 필드가 존재
- ✅ enum에 `birefnet-general`(기본값) 포함
- ✅ top-level `rembg_model` 필드는 **없음**

---

### 시나리오 B: 테스트 정합성 확인

**목적**: 테스트가 스키마 SSOT를 올바르게 검증하는지 확인

**실행**:

```bash
# 개별 테스트 실행
cd backend && uv run pytest tests/unit/test_u034_verification.py::test_schema_required_properties -v
cd backend && uv run pytest tests/unit/test_u034_verification.py::test_schema_rembg_options_model -v
```

**기대 결과**:

- `test_schema_required_properties`: JSON Schema의 required 필드 4개(`id`, `category`, `purpose`, `size_px`) 및 워크플로우 필드(`requires_rembg`, `rembg_options`) 존재 확인
- `test_schema_rembg_options_model`: `rembg_options.model` SSOT 필드 존재 및 enum 검증

**확인 포인트**:

- ✅ 이전에 실패하던 `rembg_model` 검증이 제거됨
- ✅ 새로운 `rembg_options.model` 검증 테스트 추가됨
- ✅ 모든 테스트 통과

---

### 시나리오 C: 런북 정합성 확인

**목적**: U-034 런북이 최신 스키마와 정합하는지 확인

**실행**:

```bash
# 런북에서 rembg_options.model 언급 확인
grep -n "rembg_options" vibe/unit-runbooks/U-034-nanobanana-template-runbook.md

# 런북에서 rembg_model(잘못된) 언급이 없는지 확인
grep -c "rembg_model" vibe/unit-runbooks/U-034-nanobanana-template-runbook.md || echo "OK: rembg_model not found"
```

**기대 결과**:

- `rembg_options` 관련 언급이 있어야 함
- top-level `rembg_model`은 없어야 함 (0개)

**확인 포인트**:

- ✅ "스키마 주요 필드" 표에 `rembg_options.model` 포함
- ✅ `rembg_model`(top-level) 언급 없음

---

### 시나리오 D: debt-log 해결 상태 확인

**목적**: 부채 로그에 이슈 해결이 기록되었는지 확인

**실행**:

```bash
# debt-log에서 U-034 이슈 해결 상태 확인
grep -A 15 "2026-01-24 이슈: 에셋 요청 스키마" vibe/debt-log.md | head -20
```

**기대 결과**:

- "✅ 해결됨" 표시가 있어야 함
- 수정된 파일 목록이 명시되어야 함
- "재발 방지" 조치가 기록되어야 함

**확인 포인트**:

- ✅ 이슈 상태가 "해결됨"으로 갱신됨
- ✅ SSOT 확정 내용 기록됨
- ✅ 수정 파일 목록 명시됨

---

## 4. 실행 결과 확인

### 4.1 수정된 파일

| 파일 경로 | 변경 내용 |
|-----------|----------|
| `backend/tests/unit/test_u034_verification.py` | `required_fields`에서 `rembg_model` 제거, `rembg_options` 구조 검증 추가 |
| `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md` | 스키마 주요 필드 표 갱신, `rembg_options.model` SSOT 명시 |
| `vibe/debt-log.md` | U-034 이슈 "해결됨" 상태 갱신 |

### 4.2 SSOT 정리

| 항목 | SSOT 필드 | 설명 |
|------|----------|------|
| rembg 모델 선택 | `rembg_options.model` | 중첩 객체 내 필드 (확장성 고려) |
| JSON Schema required | `["id", "category", "purpose", "size_px"]` | 스키마 최소 필수 |
| 워크플로우 필수 | `requires_rembg`, `rembg_options` | 조건부/선택적 (properties에 정의됨) |

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ `test_u034_verification.py` 7개 테스트 모두 통과
- ✅ 린트/포맷 체크 통과
- ✅ 런북의 스키마 필드 표가 최신 SSOT와 일치
- ✅ debt-log에 해결 상태 기록됨

**실패 시 확인**:

- ❌ 테스트 실패 → 스키마 파일이 수정되었는지 확인
- ❌ `rembg_model` 검증 실패 → top-level 필드 대신 `rembg_options.model` 사용하도록 수정 필요

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `AssertionError: Required field 'rembg_model' missing in schema properties`

- **원인**: 이전 버전 테스트 코드가 실행됨
- **해결**: `git pull` 또는 테스트 파일이 최신인지 확인

**오류**: `ModuleNotFoundError: No module named 'pytest'`

- **원인**: dev 의존성 미설치
- **해결**: `cd backend && uv sync --group dev`

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 이슈 없음 (pathlib 사용)
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

이 유닛은 에셋 파이프라인 문서/검증의 기준선을 복구했습니다. 이후 에셋 관련 유닛에서 "필드명 드리프트"로 인한 혼선이 감소할 것입니다.

1. **스키마 변경 시**: 테스트(`test_u034_verification.py`)와 런북(`U-034-nanobanana-template-runbook.md`)도 함께 갱신해야 함
2. **U-031/U-032**: 에셋 제작 시 `rembg_options.model` 필드 사용

---

_런북 버전: 1.0.0_
_작성일: 2026-01-28_
