# U-134[Mvp]: Panel Corner 이미지 방향 수정 — CSS 회전 정합 + 필요 시 코너별 이미지 신규 생성

## 메타데이터

| 항목      | 내용                                                         |
| --------- | ------------------------------------------------------------ |
| Unit ID   | U-134[Mvp]                                                   |
| Phase     | MVP                                                          |
| 예상 소요 | 30분                                                         |
| 의존성    | U-032[Mvp]                                                   |
| 우선순위  | Medium (데모 UI 폴리시 / 패널 코너 어색함 해소)              |

## 작업 목표

`panel-corner-br.png`(BR 방향 코너 이미지)를 CSS `transform: rotate()`로 4방향(TL/TR/BL/BR)에 적용할 때, **회전값이 잘못되거나 회전 없이 원본 그대로 사용되는 곳을 수정**하여 모든 패널/헤더 코너가 시각적으로 올바른 방향을 향하도록 한다. CSS 회전만으로 해결이 어려운 경우(비대칭 디테일 등) **nanobanana-mcp로 방향별 코너 이미지를 신규 생성**한다.

**배경**: 현재 `panel-corner-br.png`(BR 방향) 단일 이미지를 CSS `rotate()`로 4개 코너에 재사용하고 있으나, 회전값이 틀린 곳이 다수 존재한다. 예를 들어 좌하단(BL)에 `rotate(0deg)` — 즉 BR 이미지를 회전 없이 그대로 — 적용하고 있어 코너 방향이 어색하다. 우하단(BR)도 "원본 방향"이라는 주석과 달리 `rotate(270deg)`를 적용하고 있어 모순이다. 이는 M6 skip으로 제거된 U-112[Mmp]의 MVP 승격 대체 유닛이다.

**완료 기준**:

- 모든 패널/헤더 코너(TL/TR/BL/BR)에서 `panel-corner-br.png`의 CSS 회전값이 올바른 방향으로 적용된다
- Game Header(상단 2개), Panel Header(상단 2개), Panel Content(하단 2개) — 총 6곳의 코너가 시각적으로 정확한 방향을 향한다
- CSS 회전만으로 비대칭 디테일이 깨지는 경우, nanobanana-mcp로 해당 방향 이미지를 신규 생성하여 교체한다
- 수정 전후 스크린샷 비교로 개선 확인
- 에셋 매니페스트(`manifest.json`) 갱신 (신규 이미지 추가 시)

## 영향받는 파일

**생성 (조건부)**:

- `frontend/public/ui/chrome/panel-corner-tl.png` - TL 방향 코너 이미지 (CSS 회전으로 불충분 시 nanobanana-mcp 생성)
- `frontend/public/ui/chrome/panel-corner-tr.png` - TR 방향 코너 이미지 (동일 조건)
- `frontend/public/ui/chrome/panel-corner-bl.png` - BL 방향 코너 이미지 (동일 조건)

**수정**:

- `frontend/src/style.css` - 코너 CSS `transform: rotate()` 값 정정 (6곳). 신규 이미지 추가 시 CSS 변수 분리(방향별 `--chrome-panel-corner-{tl,tr,bl,br}`)
- `frontend/public/ui/manifest.json` - 신규 코너 이미지 추가 시 에셋 항목 갱신

**참조**:

- `frontend/public/ui/chrome/panel-corner-br.png` - 현재 원본 BR 코너 이미지 (정합 기준)
- `vibe/unit-plans/U-032[Mvp].md` - UI Chrome Pack 계획서
- `vibe/unit-results/U-032[Mvp].md` - UI Chrome Pack 결과
- `vibe/ref/frontend-style-guide.md` - CRT 테마 / 에셋 규칙

## 구현 흐름

### 1단계: 현재 회전값 감사(Audit) 및 올바른 값 산정

- `panel-corner-br.png`의 실제 시각 방향 확인 (BR: 우하단 코너 브래킷)
- BR 이미지를 기준으로 각 코너 위치에 필요한 정확한 회전값 산정:
  - **BR(우하단)**: `rotate(0deg)` — 원본 그대로
  - **BL(좌하단)**: `rotate(90deg)` — 시계 방향 90도 (또는 `scaleX(-1)` 수평 반전)
  - **TL(좌상단)**: `rotate(180deg)` — 180도 회전
  - **TR(우상단)**: `rotate(270deg)` — 시계 방향 270도 (또는 `scaleY(-1)` 수직 반전)
- 현재 CSS의 6곳 회전값과 비교하여 틀린 곳 목록 작성

### 2단계: CSS 회전값 수정

- `style.css`의 Chrome 코너 섹션에서 6곳의 `transform: rotate()` 값을 올바른 값으로 수정:
  - `.game-header.has-chrome::before` (TL) — 현재 `90deg`
  - `.game-header.has-chrome::after` (TR) — 현재 `180deg`
  - `.panel-header.has-chrome::before` (TL) — 현재 `90deg`
  - `.panel-header.has-chrome::after` (TR) — 현재 `180deg`
  - `.panel.has-chrome .panel-content::before` (BL) — 현재 `0deg` ← **명백한 오류**
  - `.panel.has-chrome .panel-content::after` (BR) — 현재 `270deg` ← **원본인데 회전됨**
- 주석을 정확한 방향 + 의도와 일치하도록 갱신

### 3단계: 시각 검증 및 비대칭 판단

- 로컬 개발 서버에서 수정된 코너 4방향 렌더링 확인
- 만약 이미지에 비대칭 디테일(그림자 방향, 두께 차이 등)이 있어 회전만으로 자연스럽지 않으면:
  - nanobanana-mcp로 해당 방향 코너 이미지를 **원본과 동일 스타일로 신규 생성**
  - CSS 변수를 방향별로 분리: `--chrome-panel-corner-tl`, `--chrome-panel-corner-tr` 등
  - 각 `::before`/`::after`에 방향별 이미지 적용, `transform: rotate()` 제거

### 4단계: 매니페스트 & 문서 업데이트

- 신규 이미지 추가 시 `manifest.json`에 항목 추가
- `frontend/public/ui/README.md`에 변경 기록 (선택)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-032[Mvp]](../unit-results/U-032[Mvp].md) - UI Chrome Pack (패널 코너 이미지 원본, CSS 적용 구조)

**다음 작업에 전달할 것**:

- U-119[Mmp]: WIG 폴리시에서 패널 코너 일관성 최종 점검 항목으로 포함
- CP-MVP-03: 데모 루프에서 패널 코너 방향 시각 검증

## 주의사항

**기술적 고려사항**:

- (PRD 9.7) nanobanana-mcp는 Dev-only 에셋 도구이며, 생성 시 CRT 테마(녹색 글로우, 투명 배경)와 일치해야 한다
- (RULE-002) 코너 장식은 "게임 HUD" 인상을 강화하는 요소이므로, 방향 오류로 인한 어색함은 "채팅 앱처럼 보임" 리스크(R-003)를 간접적으로 악화시킨다
- CSS `rotate()` vs `scale(-1)` 반전: `rotate()`는 그림자 방향도 함께 회전하므로 시각적으로 더 자연스러울 수 있다. 단, 비대칭 디테일이 있다면 `scale()` 반전이 원본에 더 가까울 수 있다
- `transform-origin`은 기본(`center`)으로 충분하나, 코너 위치(`position: absolute` 오프셋)와의 정합 확인 필요

**잠재적 리스크**:

- CSS 회전값 수정만으로 6곳 모두 해결 가능하면 15분 내 완료. 비대칭으로 인해 방향별 이미지를 생성해야 하면 30분으로 확대 → nanobanana-mcp 생성 시간 포함
- 기존에 "어색하지만 익숙해진" 코너 방향을 수정하면 사용자에게 미묘한 레이아웃 변화로 느껴질 수 있음 → 수정 전후 비교로 개선 확인

## 페어링 질문 (결정 필요)

- [ ] **Q1**: CSS 회전만으로 해결할 것인가, 방향별 이미지를 별도 생성할 것인가?
  - Option A: **CSS 회전 수정만** (최소 변경, 이미지 1개 유지)
  - Option B: **4방향 이미지 각각 생성** (nanobanana-mcp, 회전 불필요, 가장 정확)
  - Option C: **CSS 회전 우선 시도 → 비대칭 발견 시 해당 방향만 신규 생성** (권장, 점진적)

## 참고 자료

- `frontend/src/style.css` (L3738~L3848) - Chrome 코너 CSS 전체
- `frontend/public/ui/chrome/panel-corner-br.png` - 현재 원본 이미지
- `frontend/public/ui/manifest.json` - 에셋 매니페스트
- `vibe/unit-plans/U-112[Mmp].md` - 원래 MMP 계획 (M6 skip으로 제거됨, 본 유닛이 대체)
- `vibe/ref/frontend-style-guide.md` - CRT 테마 규칙
