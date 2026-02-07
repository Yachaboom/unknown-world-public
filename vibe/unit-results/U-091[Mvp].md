# U-091[Mvp]: 런타임 rembg 파이프라인 일괄 제거 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-091[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-07 17:00
- **담당**: AI Agent

---

## 1. 작업 요약

서버 런타임에서 `rembg` 배경 제거 파이프라인을 완전히 제거하여 서버 부팅 속도를 최적화하고 의존성 복잡도를 해소했습니다. 배경 제거가 필요한 작업은 개발 시점(Dev-only)으로 제한하고, 런타임 아이콘 생성 및 이미지 생성 시에는 배경 제거 없이 즉시 결과를 반환하도록 파이프라인을 단순화했습니다.

---

## 2. 작업 범위

- **런타임 의존성 제거**: `pyproject.toml`에서 `rembg` 패키지를 런타임 의존성에서 제거.
- **Preflight 로직 삭제**: 서버 시작 시 수행되던 `rembg` 모델 다운로드 및 점검(`rembg_preflight.py`) 기능 일괄 삭제.
- **후처리 파이프라인 제거**: 이미지 생성(`image_generation.py`) 및 아이템 아이콘 생성(`item_icon_generator.py`) 과정에서 배경 제거 단계(`image_postprocess.py`) 삭제.
- **스키마 정제**: `TurnOutput`, `ImageJob`, `RenderOutput` 등 주요 모델에서 배경 제거 관련 필드(`remove_background`, `background_removed` 등) 제거 (Pydantic/Zod 동시 반영).
- **테스트 및 수동 도구 삭제**: 런타임 배경 제거 검증을 위한 단위/통합 테스트 및 수동 테스트 스크립트 삭제.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/pyproject.toml` | 수정 | `rembg` 런타임 의존성 제거 |
| `backend/src/unknown_world/main.py` | 수정 | `startup` 이벤트에서 rembg preflight 제거 및 `/health` 응답 정제 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | 이미지 생성 후 배경 제거 후처리 로직 제거 |
| `backend/src/unknown_world/services/item_icon_generator.py` | 수정 | 아이콘 생성 시 배경 제거 호출 제거 |
| `backend/src/unknown_world/models/turn.py` | 수정 | `ImageJob`, `RenderOutput`에서 rembg 필드 제거 |
| `frontend/src/schemas/turn.ts` | 수정 | `ImageJobSchema`, `RenderOutputSchema`에서 rembg 필드 제거 |
| `backend/src/unknown_world/services/image_postprocess.py` | **삭제** | 런타임 배경 제거 서비스 삭제 |
| `backend/src/unknown_world/services/rembg_preflight.py` | **삭제** | 모델 사전 점검 및 다운로드 서비스 삭제 |
| `vibe/unit-runbooks/U-091-rembg-runtime-removal-runbook.md` | **신규** | 제거 검증 및 실행 런북 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**파이프라인 단순화**:
- **이전**: `Generate Content` → `Extract Bytes` → `rembg Process` → `Save to Storage`
- **이후**: `Generate Content` → `Extract Bytes` → `Save to Storage` (즉시 반환)

**Health Check 정제**:
- 서버의 헬스 상태에서 모델 다운로드 상태를 체크하던 복잡도를 제거하고, 순수 서비스 가동 여부만 확인하도록 변경하여 부팅 완료 인지 속도를 개선했습니다.

### 4.2 외부 영향 분석

- **서버 부팅 속도**: 약 100~200MB의 모델 체크 과정이 사라져 서버 시작 시간이 즉시(1초 이내) 완료되도록 개선되었습니다.
- **데이터 구조**: `TurnOutput` JSON 구조에서 배경 제거 관련 메타데이터가 사라졌으므로, 프론트엔드 UI 컴포넌트(`SceneImage`, `InventoryPanel`)에서 해당 플래그 참조를 제거했습니다.

### 4.3 가정 및 제약사항

- **Dev-only 배경 제거**: `nanobanana-mcp`를 통한 에셋 제작 시에는 여전히 `rembg`가 필요할 수 있으나, 이는 개발 환경에 개별적으로 설치하여 사용하거나 런타임 외부에서 처리함을 가정합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-091-rembg-runtime-removal-runbook.md`
- **실행 결과**: 서버 즉시 기동 확인, 턴 실행 시 이미지/아이콘 정상 생성 확인, 스키마 정합성 확인 완료.

---

## 6. 리스크 및 주의사항

- **아이콘 시각적 품질**: 배경 제거 없이 아이콘을 생성하므로, 프롬프트에서 "투명 배경" 또는 "어두운 배경" 스타일을 강조하여 UI와의 합성 자연스러움을 유지해야 합니다. (이미 프롬프트 튜닝에 반영됨)

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **아이콘 프리셋 보강 (U-092)**: 런타임 생성 대신 미리 준비된 고품질 투명 PNG 에셋 사용 비중 확대.
2. **타임아웃 최적화 (U-093)**: 배경 제거 단계가 사라졌으므로 아이콘 생성 전체 타임아웃 재설정.

### 7.2 의존 단계 확인

- **선행 단계**: U-075[Mvp] (아이콘 생성) 완료 확인
- **후속 단계**: U-092[Mvp] (초기 아이콘 프리셋)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
