# nanobanana mcp 개발용 에셋 제작 가이드 (SSOT)

> **[RULE-007]**: 이 가이드와 `nanobanana mcp`는 개발 과정에서 UI/문서용 **정적 에셋을 제작**하는 데만 사용합니다. 게임 런타임에서 MCP에 의존하는 설계는 금지합니다.

## 1. 공통 아트 디렉션 (Art Direction)

모든 에셋은 Unknown World의 **CRT 레트로 테마**와 조화를 이루어야 합니다.

- **스타일**: 80년대 CRT 모니터, 인광 그린(Phosphor Green), 낮은 해상도, 픽셀 느낌.
- **팔레트**: 
  - 기본: `#33ff00` (인광 그린)
  - 보조: `#ff00ff` (마젠타), `#ffaa00` (오렌지), `#ff3333` (레드)
  - 배경: 0순위 투명(알파), 생성 시에는 `#FFFFFF` (순백) 단색 강제.
- **금지 사항**:
  - 사진 스타일(Photorealistic) 금지.
  - 복잡한 그라데이션 및 부드러운 그림자 금지.
  - 이미지 내 텍스트 렌더링 최소화 (i18n 및 가독성 문제).
- **재현성 규칙**: 에셋 요청 시 반드시 `nanobanana-asset-request.schema.json` 스키마를 준수하여 기록합니다.

---

## 2. 카테고리별 프롬프트 템플릿 (Templates)

### 2.1 UI 아이콘 (Icons)
- **목표**: 작은 크기(16~32px)에서도 명확히 식별되는 단순한 실루엣.
- **템플릿 문구**:
  > "A minimal [SUBJECT] icon, retro CRT phosphor style, solid [COLOR] silhouette, high contrast, pixel art aesthetic, sharp edges. No text, no background, solid white background (#FFFFFF) for rembg post-processing."

### 2.2 상태 Placeholder (Placeholders)
- **목표**: 장면의 분위기를 전달하되 정보 과잉을 피함.
- **템플릿 문구**:
  > "A cinematic low-res scene of [SCENE_DESCRIPTION], CRT monitor glow effect, scanlines, phosphor green palette, dark atmosphere. Retro computer terminal aesthetic. No complex UI elements, focus on mood."

### 2.3 UI 크롬/프레임 (Chrome)
- **목표**: 패널과 카드를 장식하는 얇은 라인과 코너.
- **템플릿 문구**:
  > "A retro UI panel corner element, thin glowing lines, [COLOR] phosphor aesthetic, technical schematic style. Minimalist rivet or joint detail. Solid white background (#FFFFFF), no shadows."

---

## 3. 후처리 도구

### 3.1 배경 제거 (rembg)

투명 배경이 필요한 에셋(아이콘, 크롬 등)은 생성 결과에 배경이 섞인 경우 `rembg` 도구를 사용하여 알파 채널을 확보합니다.

- **필수 규칙**: 배경 제거 품질을 위해 원본 생성 시 배경은 반드시 **순백(#FFFFFF) 단색**이어야 합니다.
- **세부 가이드**: 모델 선택, 명령어 옵션, Alpha Matting 기준 등 상세 내용은 아래 가이드를 참조하십시오.
  - **참조**: `vibe/ref/rembg-guide.md` (배경 제거 도구 사용 가이드)

### 3.2 크기 조정 및 Crop (ImageMagick)

생성된 에셋의 사이즈 조정, 배율 변경, 여백 제거(trim), Crop 등은 `ImageMagick` 도구를 사용합니다.

- **일반적인 작업 흐름**: trim → resize → extent (캔버스 확장)
- **세부 가이드**: 크기 프리셋, 복합 작업 패턴, 주의사항 등 상세 내용은 아래 가이드를 참조하십시오.
  - **참조**: `vibe/ref/imagemagick-guide.md` (이미지 처리 도구 사용 가이드)

---

## 4. 에셋 반영 프로세스

1. **요청 기록**: `vibe/ref/nanobanana-asset-request.schema.json`에 맞게 에셋 사양 정의.
2. **에셋 생성**: `nanobanana mcp`와 위 템플릿을 사용하여 이미지 생성.
3. **배경 제거**: 필요한 경우 `rembg` 실행 (가이드: `vibe/ref/rembg-guide.md`).
4. **크기 조정**: 필요한 경우 `ImageMagick`으로 trim/resize/extent (가이드: `vibe/ref/imagemagick-guide.md`).
5. **경로 저장**: `frontend/public/ui/` 아래 카테고리별 폴더에 저장.
6. **매니페스트 갱신**: `manifest.json`에 에셋 정보 추가 (U-033).
7. **QA 체크**: 스타일 일관성 및 폴백(텍스트/이모지) 동작 확인.
