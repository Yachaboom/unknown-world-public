# U-034[Mvp]: nanobanana mcp 에셋 요청 스키마 + 프롬프트 템플릿(재현성)

## 메타데이터

| 항목      | 내용       |
| --------- | ---------- |
| Unit ID   | U-034[Mvp] |
| Phase     | MVP        |
| 예상 소요 | 45분       |
| 의존성    | U-030      |
| 우선순위  | Medium     |

## 작업 목표

`nanobanana mcp`로 에셋을 만들 때 “말로 요청해서 매번 다르게 나오는” 문제를 줄이기 위해, **에셋 요청 스키마(필드) + 재사용 가능한 프롬프트 템플릿**을 정의한다.

**배경**: 생성형 에셋은 일관성이 가장 어려운 부분이다. 요청 포맷이 표준화되면, (1) 스타일/팔레트/톤을 고정할 수 있고 (2) 어떤 에셋이 왜 필요한지 추적되며 (3) 수정/재생성이 쉬워진다. MVP에서는 런타임 프롬프트가 아니라 **개발용 에셋 제작 프롬프트**만 다룬다. (red-line: dev-only)

**완료 기준**:

- 에셋 요청 항목(예: category, size, palette, do/don’t, fallback_text)이 정의된다.
- 공통 스타일 문장(아트 디렉션)과, 카테고리별 템플릿(아이콘/placeholder/chrome)이 문서화된다.
- 템플릿 사용 규칙이 U-030(SSOT) 및 U-033(매니페스트)와 연결된다.
- (필수 조건부) **투명 배경이 필요한 에셋**(아이콘/크롬 등)은 생성 결과에 배경이 남으면 `rembg`로 배경 제거를 수행한다는 표준 절차가 템플릿/가이드에 포함된다. (참조: `vibe/ref/rembg-guide.md`)
- (필수 조건부) 배경 제거(rembg)를 전제하는 경우, 원본 생성 단계에서 배경을 **순백(#FFFFFF) 단색**으로 만들도록 템플릿에 강제 규칙이 포함된다(그라데이션/텍스처/그림자 금지).

## 영향받는 파일

**생성**:

- `vibe/ref/nanobanana-mcp.md` - nanobanana mcp 개발용 에셋 제작 가이드(SSOT)
- (권장) `vibe/ref/nanobanana-asset-request.schema.json` - 에셋 요청 JSON 스키마(개발용)

**수정**:

- `vibe/unit-plans/U-029[Mvp].md` - 템플릿/스키마 사용을 구현 흐름/완료 기준에 반영(필요 시)
- `vibe/unit-plans/U-031[Mvp].md` - placeholder 제작 시 템플릿 사용 명시(필요 시)
- `vibe/unit-plans/U-032[Mvp].md` - chrome 제작 시 템플릿 사용 명시(필요 시)

**참조**:

- `.gemini/rules/red-line.md` - RULE-006/007(용어/dev-only/프롬프트 노출 금지)
- `vibe/unit-plans/U-030[Mvp].md` - 에셋 SSOT(폴더/네이밍/예산)
- `vibe/ref/frontend-style-guide.md` - CRT 톤/팔레트 기준

## 구현 흐름

### 1단계: 에셋 요청 스키마(필드) 정의

- 최소 필드 예시:
  - `id`, `category(icon|placeholder|chrome)`, `purpose`, `size_px`, `palette`, `mood`
  - `must_have[]`, `must_not_have[]`, `fallback_text`
  - `output_path`(SSOT 경로), `notes`

### 2단계: 공통 아트 디렉션 문장(템플릿 헤더) 작성

- CRT 레트로/인광 그린 기반
- 제한 팔레트(그린/마젠타/오렌지/레드)
  - 최종 산출물(아이콘/크롬): 투명 PNG(알파)
  - (필수 조건부) 배경 제거(rembg) 예정: **원본 생성 시 배경은 순백(#FFFFFF) 단색**으로 강제(그라데이션/텍스처/그림자 금지)
- 작은 크기에서도 읽히는 단순 형태 우선
- 텍스트 렌더링은 최소화(언어/i18n/해상도 문제)
- (필수 조건부) 투명 배경이 필요한데 결과에 배경이 섞이면, 프롬프트로만 해결하려고 버티기보다 `rembg`로 배경 제거 후처리를 수행한다(재현성/속도 우선). (참조: `vibe/ref/rembg-guide.md`)

### 3단계: 카테고리별 템플릿 작성(아이콘/placeholder/chrome)

- 아이콘: 단일 실루엣 + 높은 대비 + 투명 배경
- placeholder: “장면 느낌” + 과도한 정보/텍스트 금지
- chrome: 얇은 라인/코너/프레임(장식 과잉 금지)

### 4단계: 사용 절차(매니페스트/QA 연결) 정의

- 요청 스키마로 에셋 요구를 기록 → nanobanana mcp로 생성 → (필요 시) `rembg`로 배경 제거 → 결과를 `frontend/public/ui/`에 저장 → `manifest.json` 업데이트 → QA 체크

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-030[Mvp]](U-030[Mvp].md) - 에셋 SSOT/예산/규칙

**다음 작업에 전달할 것**:

- U-029/U-031/U-032에서 재사용할 “요청 포맷 + 템플릿”(일관성/재현성)
- 이후 자동화(스크립트 기반 생성/검증)로 확장 가능한 기반

## 주의사항

**기술적 고려사항**:

- 템플릿/스키마는 “런타임 프롬프트”가 아니라 “개발용 에셋 제작”에만 사용한다.
- 프롬프트 원문을 사용자 UI/로그에 노출하지 않는다(관측은 라벨/배지로).
- (필수 조건부) 배경 제거가 필요하면 `rembg`로 재현 가능하게 처리한다(수작업 컷아웃 금지). (참조: `vibe/ref/rembg-guide.md`)

**잠재적 리스크**:

- 템플릿이 과도하게 길면 사용성이 떨어짐 → 공통 헤더 + 카테고리별 추가 문장으로 최소화한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 에셋 요청 스키마 파일을 어디에 둘까?
  - Option A: `vibe/ref/` (문서/가이드 중심, dev-only) ✅
  - Option B: `frontend/public/ui/` (에셋 옆에 두기 쉬움, 하지만 제품 산출물과 혼합됨)

## 참고 자료

- `.gemini/rules/red-line.md` - nanobanana mcp 용어/사용 범위/보안 규칙
- `vibe/unit-plans/U-030[Mvp].md` - 에셋 SSOT
- `vibe/ref/frontend-style-guide.md` - CRT 스타일 기준
- `vibe/ref/rembg-guide.md` - rembg 배경 제거(모델 선택/옵션/명령) 가이드

