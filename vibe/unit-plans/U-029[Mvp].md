# U-029[Mvp]: nanobanana mcp 에셋 패스(UI 아이콘/프레임/placeholder)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-029[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-030,U-028,U-008 |
| 우선순위  | Medium      |

## 작업 목표

UI에서 “텍스트/이모지”만으로 표현되던 요소 중 **에셋이 효과적인 지점**(아이콘/프레임/placeholder)을 선별해, **nanobanana mcp로 제작한 이미지 에셋을 1차 반영**한다.

**배경**: Unknown World는 “채팅 앱이 아닌 게임 UI” 인상이 중요하다. (PRD 6.7) 작은 아이콘/패널 프레임/placeholder 같은 시각 요소가 있으면, 데모에서 **게임성(UX)과 몰입감**이 즉시 상승한다. 다만, 에셋이 가독성/성능/번들 크기를 해치면 역효과이므로 “필요한 곳만, 작게, 폴백 포함”이 원칙이다.

**완료 기준**:

- 최소 6개 이상의 UI 에셋(예: Signal/Shard/Risk/Badge/Panel/Placeholder)을 **일관된 스타일**로 제작하고, repo에 추가된다.
- (필수 조건부) 아이콘/프레임처럼 **투명 배경(알파)이 필요한 에셋**은, 생성 결과에 배경이 남아 있으면 `rembg`로 배경 제거를 수행해 투명 PNG로 저장된다. (가이드 준수: `vibe/ref/rembg-guide.md`)
- (필수 조건부) 배경 제거(rembg)를 전제하는 에셋은 **원본 생성 단계에서 배경을 순백(#FFFFFF) 단색**으로 만들도록 강하게 지시한다(그라데이션/텍스처/그림자 금지) → rembg 품질/재현성/속도 향상.
- UI에서 해당 에셋이 실제로 사용되며, 로딩 실패/미지원 시 **텍스트/이모지 폴백**이 동작한다.
- 에셋 파일명/사이즈/저장 경로 규칙(SSOT, U-030)이 문서화되고, “추가 에셋 요청 → 제작/반영” 흐름이 명확해진다.
- (권장) 추가/수정한 에셋은 `frontend/public/ui/manifest.json`(U-033)로 추적 가능하게 기록된다.

## 영향받는 파일

**생성**:

- `frontend/public/ui/` - UI 아이콘/프레임/placeholder PNG(WebP는 선택)
- (권장) `frontend/public/ui/README.md` - 에셋 규칙(네이밍/사이즈/스타일/폴백) 요약

**수정**:

- `frontend/src/style.css` - 아이콘/프레임 적용을 위한 CSS(`background-image`, `image-set`, 크기 토큰) 추가
- `frontend/src/App.tsx` - Header/Economy HUD/Action Deck 등에서 아이콘 사용(필요한 최소 지점만)
- (선택) `frontend/src/components/AgentConsole.tsx` - 배지/상태 아이콘에 에셋을 쓰는 경우

**참조**:

- `vibe/ref/frontend-style-guide.md` - CRT 테마 톤(레트로/인광/스캔라인과 조화)
- `frontend/public/logo-retro.png` - 기존 레포 에셋(톤 참조)
- `vibe/prd.md` 6.7/9장 - “채팅 UI 금지 + 게임스러운 고정 HUD”

## 구현 흐름

### 1단계: “에셋이 필요한 지점” 목록 확정

- 텍스트만으로 부족하거나 “게임성”을 높이는 지점을 우선한다:
  - Economy HUD: Signal/Shard 아이콘(기존 ⚡/💎)
  - Action Deck: Risk 아이콘/카드 프레임(기존 ⚠)
  - Badges: OK/FAIL 상태 아이콘(텍스트 폴백 유지)
  - Scene Placeholder: 분위기 있는 placeholder 이미지(텍스트 유지)

### 2단계: 아트 디렉션/사이즈/네이밍 규칙 정의(SSOT)

- 스타일: CRT 레트로/픽셀 느낌, 제한된 팔레트(그린/마젠타/오렌지/레드)
  - 최종 산출물: 투명 PNG(아이콘/프레임/크롬 등 알파 필요)
  - (필수 조건부) 배경 제거(rembg) 예정: **원본 생성 시 배경은 순백(#FFFFFF) 단색**으로 강제(그라데이션/텍스처/그림자 금지)
- 권장 사이즈: 16/24/32/64(최소 2종), 필요 시 `image-set()`으로 1x/2x 제공
- 네이밍 예시: `signal-24.png`, `shard-24.png`, `risk-low-24.png`, `badge-ok-16.png`
  - (SSOT) 상세 규칙은 [U-030[Mvp]](U-030[Mvp].md) 기준을 따른다.

### 3단계: nanobanana mcp로 에셋 제작

- 동일한 스타일을 유지하기 위해 “공통 스타일 문장 + 개별 대상” 프롬프트를 재사용한다.
- (필수 조건부) 배경 제거(rembg)가 필요하면, 프롬프트에 **“solid white background (#FFFFFF), no gradient/texture/shadow”**를 명시해 원본 배경을 단순화한다.
- 작은 크기에서도 읽히는지(엣지/대비/형태)를 우선 확인하고, 필요 시 1회 정도 수정(edit)한다.
  - (권장) 템플릿/요청 스키마는 [U-034[Mvp]](U-034[Mvp].md) 기준을 따른다.

### 4단계: (필수 조건부) rembg로 배경 제거(투명 PNG가 필요한 경우)

- 아이콘/프레임/크롬 등 **투명 배경이 필요한 에셋**에서 배경이 남아 있으면, `rembg`로 배경을 제거해 알파 채널을 확보한다.
- (권장) rembg 품질/속도를 위해, 원본 생성 단계에서 배경을 **순백(#FFFFFF) 단색**으로 만들어 두는 것을 기본으로 한다(그라데이션/텍스처 금지).
- 모델 선택/옵션은 `vibe/ref/rembg-guide.md`의 “모델 자동 선택 규칙/Alpha Matting 기준”을 따른다.
  - (권장) 본 유닛의 아이콘/일러스트 계열은 기본적으로 `isnet-anime` 계열이 잘 맞는 편이다.
- 출력 파일명은 가이드의 권장 규칙을 따른다(예: `*_transparent.png` 또는 `*_nobg.png`). 필요 시 최종 네이밍(SSOT) 규칙에 맞춰 정리한다.

### 5단계: UI 반영(폴백 우선)

- CSS/컴포넌트에서 에셋을 적용하되, 항상 텍스트/이모지 폴백을 유지한다.
- Readable 모드(U-028)에서는 아이콘 대비/크기를 함께 조정할 수 있게 연결한다(선택).

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-030[Mvp]](U-030[Mvp].md) - 에셋 SSOT(경로/네이밍/예산/폴백)
- **계획서**: [U-028[Mvp]](U-028[Mvp].md) - UI 스케일/Readable 모드(아이콘 ‘읽힘’ 기준선)
- **계획서**: [U-008[Mvp]](U-008[Mvp].md) - Agent Console 배지/상태 표시(아이콘 적용 후보)

**다음 작업에 전달할 것**:

- U-009~U-015에서 재사용할 UI 에셋 세트(경로/네이밍/사이즈 규칙 포함)
- “에셋이 없을 때도 동작”하는 폴백 패턴(데모 안전성)

## 주의사항

**기술적 고려사항**:

- 에셋은 **필요한 곳만** 적용한다(과도한 이미지 의존은 지연/번들 크기 리스크).
- 접근성: `<img alt>` 또는 `aria-hidden` 등 의도를 명확히 하고, 텍스트 라벨을 제거하지 않는다.
- (필수) “투명 배경이 필요한데 배경이 섞인 결과”는 수작업 편집으로 땜질하지 말고, `rembg`로 재현 가능하게 처리한다. (참조: `vibe/ref/rembg-guide.md`)
- (필수 조건부) 배경 제거(rembg)를 전제하면, **생성 단계에서 배경은 순백(#FFFFFF) 단색**으로 강제한다(그라데이션/텍스처/그림자 금지) — 자동 제거 품질/속도/재현성에 직접 영향.

**잠재적 리스크**:

- 스타일 불일치(아이콘마다 톤이 다름) → 공통 스타일 프롬프트/팔레트 규칙을 SSOT로 두고 재사용한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 에셋 저장 위치를 어디로 둘까?
  - Option A: `frontend/public/ui/` (정적 경로, 단순, 캐싱 유리) ✅
  - Option B: `frontend/src/assets/` (번들링/해시 관리가 쉽지만 빌드 영향)

## 참고 자료

- `vibe/ref/frontend-style-guide.md` - CRT 테마 규칙
- `vibe/prd.md` - “채팅 UI 금지”, 고정 HUD 요구
- `frontend/public/logo-retro.png` - 레포 내 톤 레퍼런스
- `vibe/ref/rembg-guide.md` - rembg 배경 제거(모델 선택/옵션/명령) 가이드

