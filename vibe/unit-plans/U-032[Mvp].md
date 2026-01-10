# U-032[Mvp]: nanobanana mcp UI Chrome Pack(패널/카드 프레임/코너)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-032[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-030,U-004,U-034 |
| 우선순위  | Medium      |

## 작업 목표

UI의 “게임스러움”을 강화하기 위해, 패널/카드/캔버스에 적용할 **프레임(코너/라인/리벳 등)과 간단한 크롬(UI 장식)** 에셋을 `nanobanana mcp`로 제작하고 최소 범위에 반영한다. (가이드 준수: `vibe/ref/nanobanana-mcp.md`)

**배경**: Unknown World의 평가 포인트 중 하나는 “채팅 UI가 아닌 게임 UI”의 첫 인상이다. CSS만으로도 가능하지만, 적절한 크롬(프레임/코너)을 넣으면 **즉시 게임 HUD 느낌**이 살아난다. 다만 남용하면 가독성/성능이 악화되므로 “필요한 패널 1~2개에만” 적용한다.

**완료 기준**:

- 최소 3종 이상의 크롬 에셋(예: panel-corner, card-frame, scanner-frame)을 제작한다.
- Header/Panel/Action Card 중 **1~2곳**에만 선택 적용하고, Readable 모드에서는 과도한 장식을 완화한다.
- 에셋 규칙(U-030)을 준수하고, 적용 실패 시 기존 CSS 스타일로 폴백된다.
- (필수 조건부) 크롬 에셋은 **투명 배경(알파) 필수**이며, 생성 결과에 배경이 남아 있으면 `rembg`로 배경 제거를 수행해 투명 PNG로 정리한다. (가이드 준수: `vibe/ref/rembg-guide.md`)
- (필수) 위 rembg 배경 제거를 전제하므로, 원본 생성 단계에서 배경을 **순백(#FFFFFF) 단색**으로 강제한다(그라데이션/텍스처/그림자 금지) → 제거 품질/재현성 향상.

## 영향받는 파일

**생성**:

- `frontend/public/ui/chrome/panel-corner-*.png` - 패널 코너(4방향 또는 1장+CSS transform)
- `frontend/public/ui/chrome/card-frame-*.png` - 액션 카드 프레임(얇은 테두리/하이라이트)
- `frontend/public/ui/chrome/scanner-frame-*.png` - 스캐너 슬롯 프레임/장식

**수정**:

- `frontend/src/style.css` - 크롬 적용 CSS(`background-image`, `mask-image`, `image-set`) 추가
- `frontend/src/App.tsx` - 적용 대상 패널/카드에 클래스 부여(최소 범위)

**참조**:

- `vibe/ref/nanobanana-mcp.md` - nanobanana mcp 에셋 제작 가이드(SSOT)
- `vibe/unit-plans/U-030[Mvp].md` - 에셋 SSOT(예산/네이밍/폴백)
- `vibe/ref/frontend-style-guide.md` - CRT 톤/색상 변수 원칙
- `frontend/public/logo-retro.png` - 기존 톤 레퍼런스

## 구현 흐름

### 1단계: 적용 대상 1~2곳 선정(과잉 적용 금지)

- 후보: Action Deck 카드 / Panel 헤더 / Scanner 슬롯
- MVP에서는 “가장 눈에 띄는 곳 1곳 + 보조 1곳”까지만 적용한다.

### 2단계: nanobanana mcp로 크롬 에셋 제작

- 공통 스타일: CRT 레트로 + 제한 팔레트(그린/마젠타/오렌지), 얇은 라인(가독성 방해 금지)
  - 최종 산출물: 투명 PNG(알파 필수)
  - (필수) 배경 제거(rembg) 대비: **원본 생성 시 배경은 순백(#FFFFFF) 단색**으로 강제(그라데이션/텍스처/그림자 금지)
- 작은 크기에서도 형태가 깨지지 않도록 단순한 기하 형태를 우선한다.

### 3단계: (필수 조건부) rembg로 배경 제거(투명 PNG가 필요한 경우)

- 결과에 배경이 섞였거나, 가장자리가 지저분해 “테두리/글로우”와 충돌하면 `rembg`로 배경을 제거해 알파 채널을 확보한다.
- (권장) 원본을 순백 단색 배경으로 생성해 두면 rembg 결과가 안정적이다.
- 모델 선택/옵션은 `vibe/ref/rembg-guide.md`의 “모델 자동 선택 규칙/Alpha Matting 기준”을 따른다.

### 4단계: CSS로 적용 + Readable 모드 연동

- 기본 모드: 크롬 적용
- Readable 모드: 크롬의 대비/글로우를 줄이거나, 크롬을 제거하는 클래스로 완화

### 5단계: 폴백/성능 확인

- 에셋 로딩 실패 시 기존 CSS 테두리/박스섀도우로 보이게 유지한다.
- 반복/타일링 사용 시 렌더링 비용이 커지지 않도록 최소 적용을 유지한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-030[Mvp]](U-030[Mvp].md) - 에셋 규칙 SSOT
- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - UI 레이아웃/패널 구조

**다음 작업에 전달할 것**:

- U-009(Action Deck), U-022(Scanner) 등 UI 유닛에서 재사용 가능한 크롬 에셋 세트
- “가독성 유지 + 게임성 강화”의 균형 기준(Readable 모드 연동)

## 주의사항

**기술적 고려사항**:

- 크롬은 정보를 전달하는 UI가 아니라 “장식”이므로, 과도한 강조(강한 플리커/두꺼운 글로우)는 금지한다.
- 접근성: 장식은 `aria-hidden` 처리하고, 라벨/상태는 텍스트로 유지한다.
- (필수 조건부) 배경 제거가 필요하면 `rembg`로 재현 가능하게 처리한다(수작업 컷아웃 금지). (참조: `vibe/ref/rembg-guide.md`)
- (필수) 배경 제거(rembg) 품질/편의를 위해, **생성 단계에서 배경은 순백(#FFFFFF) 단색**으로 강제한다(그라데이션/텍스처/그림자 금지).

**잠재적 리스크**:

- 크롬이 과하면 “읽기 어려운 UI”로 회귀 → U-028 Readable 모드와 함께 튜닝한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 크롬 적용을 어디까지 허용할까?
  - Option A: 패널/카드의 코너/프레임 정도만(권장) ✅
  - Option B: 배경 텍스처/스캔라인 패턴까지 포함(몰입 ↑, 가독성/성능 리스크 ↑)

## 참고 자료

- `vibe/ref/frontend-style-guide.md` - CRT 테마/변수 SSOT
- `vibe/unit-plans/U-030[Mvp].md` - 에셋 SSOT 규칙
- `frontend/src/style.css` - 현재 패널/카드 스타일(폴백 기반)
- `vibe/ref/rembg-guide.md` - rembg 배경 제거(모델 선택/옵션/명령) 가이드

