# U-034[Mvp]: nanobanana mcp 에셋 요청 스키마 + 프롬프트 템플릿(재현성) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-034[Mvp]
- **단계 번호**: MVP
- **작성 일시**: 2026-01-11 15:30
- **담당**: AI Agent

---

## 1. 작업 요약

`nanobanana mcp`를 활용한 에셋 제작 시의 스타일 일관성과 재현성을 확보하기 위해 표준화된 요청 스키마와 카테고리별 프롬프트 템플릿을 정의하고 가이드라인을 구축함.

---

## 2. 작업 범위

- **에셋 요청 스키마 정의**: `id`, `category`, `purpose`, `size_px` 등을 포함하는 JSON 스키마 구축.
- **프롬프트 템플릿 구축**: CRT 레트로 스타일을 반영한 공통 헤더 및 아이콘/Placeholder/Chrome 카테고리별 템플릿 작성.
- **배경 제거(rembg) 프로세스 통합**: 투명 배경이 필요한 에셋을 위해 `rembg` 후처리 절차를 표준화 및 문서화.
- **가이드라인 문서화**: `RULE-007`(dev-only)을 준수하는 개발용 에셋 제작 가이드 구축.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `vibe/ref/nanobanana-mcp.md` | 신규 | 개발용 에셋 제작 가이드 (SSOT) |
| `vibe/ref/nanobanana-asset-request.schema.json` | 신규 | 에셋 요청 JSON 스키마 |
| `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md` | 신규 | 스키마 및 템플릿 검증용 런북 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**에셋 요청 스키마 (`nanobanana-asset-request.schema.json`)**:
- `category`: `icon`, `placeholder`, `chrome`으로 제한하여 목적별 스타일 분기.
- `requires_rembg`: 배경 제거 필요 여부를 명시하고 `rembg_model`을 선택 가능하게 설계.
- `size_px`: 정사각형(아이콘) 및 자유 크기(Placeholder/Chrome) 지원.

**프롬프트 템플릿 (`nanobanana-mcp.md`)**:
- **STYLE HEADER v1**: 1980년대 인광 녹색(#33ff00) CRT 모니터 미학을 공통으로 적용.
- **BACKGROUND RULE**: `rembg` 후처리를 위해 원본 생성 시 순백(#FFFFFF) 단색 배경을 강제함.

### 4.2 외부 영향 분석

- **이미지 생성 도구**: `nanobanana mcp` (Gemini 2.5 Flash Image 기반) 호출 시 이 템플릿을 준수하여 입력.
- **후처리 도구**: `rembg`를 사용하여 알파 채널을 확보하는 단계가 표준 프로세스에 포함됨.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md`
- **실행 결과**:
  - 시나리오 A: JSON 스키마 유효성 검증 통과.
  - 시나리오 B: 카테고리별 템플릿 정의 확인 완료.
  - 시나리오 C/D: 아이콘 및 Placeholder 생성/후처리 절차 검증 완료.

---

## 6. 리스크 및 주의사항

- **RULE-007 준수**: 본 스키마와 템플릿은 오직 **개발용 정적 에셋 제작**에만 사용하며, 런타임 게임 로직에서 MCP에 의존하지 않도록 주의가 필요함.
- **텍스트 렌더링**: 생성형 이미지의 텍스트 렌더링 품질 문제로 인해 가이드에서 이미지 내 텍스트를 최소화할 것을 권고함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-029**: 이 템플릿을 사용하여 실제 UI 에셋(아이콘/프레임/Placeholder) 제작.
2. **U-033**: 생성된 에셋을 `manifest.json`에 등록.

### 7.2 의존 단계 확인

- **선행 단계**: U-030[Mvp] (에셋 SSOT) 완료됨.
- **후속 단계**: U-031, U-032, U-033 등 에셋 제작 및 관리 유닛.

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
