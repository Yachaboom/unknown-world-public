# U-037[Mvp]: CRT 지글거림 보강(Readable 완화 프로파일)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-037[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-004,U-028 |
| 우선순위  | High        |

## 작업 목표

가독성 개선(Readable 모드) 때문에 CRT 오버레이(지글거림)가 “완전 OFF”로 느껴지지 않도록, **CRT 효과를 완화 프로파일로 재정의**하고 기본/Readable 모드 모두에서 “초기 CRT 감성”을 유지한다.

**배경**: Unknown World의 첫 인상은 CRT 테마(스캔라인/플리커/글로우)에 크게 의존한다. 하지만 Readable 모드가 오버레이를 통째로 숨기면, 가독성은 좋아져도 “게임의 느낌”이 사라져 데모 체감이 약해질 수 있다. (PRD 9.4/9.5, 리스크 R-004)

**완료 기준**:

- Readable 모드에서도 CRT 오버레이가 **완전 비활성화가 아니라 “완화”** 프로파일로 동작한다(예: scanline 대비/플리커 진폭을 낮춤).
- 기본 모드에서는 스캔라인/미세 플리커가 “체감”되며, 과도한 깜빡임/눈부심 없이 텍스트 가독성이 유지된다.
- 접근성: OS `prefers-reduced-motion: reduce` 환경에서는 플리커 애니메이션이 자동으로 완화/비활성화된다(회귀 방지).
- 변경 후에도 상호작용을 방해하지 않는다(`pointer-events: none`), 그리고 Readable 토글/스케일 저장(persist)은 기존과 동일하게 동작한다.

## 영향받는 파일

**생성**:

- (선택) `frontend/src/stores/crtPrefsStore.ts` - CRT 강도 프로파일을 별도 상태로 분리할 경우(필요 시)

**수정**:

- `frontend/src/style.css` - CRT 오버레이/Readable 모드 규칙을 “완화” 중심으로 재정의(강도 토큰/프로파일 도입)
- `frontend/src/stores/uiPrefsStore.ts` - (선택) CRT 강도 토큰을 UI prefs에 포함하고 DOM에 적용(필요 시)
- `frontend/src/App.tsx` - (선택) 헤더 UI에 CRT 강도(프로파일) 컨트롤을 추가(필요 시)

**참조**:

- `vibe/prd.md` - 9.4 접근성/Readable, 9.5 CRT 효과
- `vibe/unit-plans/U-028[Mvp].md` - Readable 모드/스케일(가독성 SSOT)
- `vibe/unit-plans/U-004[Mvp].md` - CRT 테마/오버레이 기본 규칙
- `.cursor/rules/10-frontend-game-ui.mdc` - CRT 테마/게임 UI 규칙

## 구현 흐름

### 1단계: Readable 모드 정책 재정의(“완전 OFF” → “완화”)

- Readable 모드에서 `.crt-overlay`를 `display: none`으로 숨기지 않고, **투명도/대비/플리커 진폭/속도**를 낮춘다.
- 기본 모드(Readable=false)는 기존 CRT 톤을 유지하되, “너무 강해서 읽기 어려움”으로 회귀하지 않게 진폭을 토큰으로 제어한다.

### 2단계: CSS 강도 토큰(프로파일) 도입

- CRT 오버레이에 아래와 같은 토큰을 도입한다(예시):
  - `--crt-overlay-opacity`
  - `--crt-scanline-strength`
  - `--crt-flicker-opacity-min` / `--crt-flicker-opacity-max`
  - (선택) `--crt-flicker-speed`
- `html[data-readable='true']`에서 위 토큰을 “Readable 프로파일 값”으로 덮어쓴다.

### 3단계: 접근성(자동 완화) 가드 추가

- `@media (prefers-reduced-motion: reduce)`에서 플리커 애니메이션을 비활성화하거나(또는 정적/저빈도) 강도를 최소화한다.
- (선택) `prefers-contrast` 등 대비 설정이 켜진 경우에도 오버레이 대비를 더 낮춘다.

### 4단계: 수동 검증(런북)

- 기본 모드: CRT 지글거림이 **체감**되고, 내러티브/Agent Console 마이크로 텍스트가 읽힌다.
- Readable 모드: CRT가 “완전 OFF”로 느껴지지 않지만, 장시간 읽기 편하다.
- `prefers-reduced-motion` 환경: 플리커가 자동으로 완화/비활성화된다.
- 오버레이가 클릭/드래그/스크롤을 방해하지 않는다(`pointer-events: none`).

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-028[Mvp]](U-028[Mvp].md) - Readable 모드/스케일 정책(가독성 Hard Gate)
- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - CRT 테마/오버레이 기본 규칙

**다음 작업에 전달할 것**:

- U-009~U-015(핵심 UI)에서 “Readable을 켜도 CRT 정체성이 남는” 기본 룰
- U-032(Chrome), U-038(아이콘 v2)에서 Readable 모드 대비/강도 튜닝 기준

## 주의사항

**기술적 고려사항**:

- 플리커는 사용자를 불편하게 하거나(특히 광과민) 피로를 유발할 수 있으므로, 강도 토큰/`prefers-reduced-motion` 가드를 반드시 둔다.
- CRT 오버레이는 장식이며, 정보 전달/접근성은 텍스트/라벨이 SSOT다.

**잠재적 리스크**:

- “강도 낮춤”이 너무 약하면 여전히 체감이 없음 → 기본/Readable 프로파일 값을 2~3회 빠르게 튜닝하고, 최소 체감 기준을 런북에 명시한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: Readable 모드의 목적을 어떻게 정의할까?
  - Option A: **완화**(CRT 감성 유지, 권장) ✅
  - Option B: 완전 OFF(가독성 최우선) — 대신 별도 “CRT ON” 프로파일/토글이 필요
- [ ] **Q2**: CRT 강도 컨트롤을 MVP에 포함할까?
  - Option A: 우선 CSS 프로파일만(기본/Readable/OS reduced motion)으로 해결 ✅
  - Option B: UI에서 프로파일(예: CRT/BAL/READ/OFF) 선택까지 제공

## 참고 자료

- `vibe/prd.md` - 9.4/9.5 (Readable/CRT)
- `frontend/src/style.css` - CRT overlay/Readable 모드 구현(SSOT)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - 접근성 가드
