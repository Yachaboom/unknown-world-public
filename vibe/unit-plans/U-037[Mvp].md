# U-037[Mvp]: CRT/가독성 레이어링(Readable 모드 제거, 중요 영역 보호)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-037[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-004,U-028 |
| 우선순위  | High        |

## 작업 목표

별도의 Readable 모드를 제거하고, UI를 “식별성이 중요한 영역(critical)”과 “분위기/장식 영역(ambient)”으로 구분하여 **CRT 분위기는 유지하면서 중요한 정보의 식별성/가독성을 개선**한다.

**배경**: Readable 모드는 분위기가 약해지고, 기본 CRT는 가시성이 떨어져 데모 체감(Agent Console/재화/비용/선택지)이 약해질 수 있다. 따라서 “모드 토글”이 아니라 **정보 계층 기반 스타일**로 균형을 잡아야 한다. (PRD 9.4/9.5, 리스크 R-004)

**완료 기준**:

- Readable 모드 토글/상태/DOM 속성(`data-readable`)을 제거하고, 기존 저장값(localStorage)이 있어도 안전하게 무시/마이그레이션한다.
- `critical`/`ambient` 중요도 기준이 도입되어, 중요한 영역(예: Header/Economy HUD/Agent Console/Action Deck 비용/배지)은 **항상 읽히는 대비/폰트/라인하이트/효과 강도**를 가진다.
- CRT 오버레이/지글거림은 완전히 사라지지 않고, 비중요 영역 또는 장면(Scene Canvas)에서 충분히 체감되어 “게임 분위기”가 유지된다.
- 접근성: OS `prefers-reduced-motion: reduce`에서는 플리커/글리치 등 반복 애니메이션이 자동 완화/비활성화된다.
- 오버레이가 클릭/드래그/스크롤을 방해하지 않는다(`pointer-events: none`), UI 스케일 저장(persist)은 기존과 동일하게 동작한다.

## 영향받는 파일

**생성**:

- 없음 (원칙: `frontend/src/style.css` 단일 SSOT 유지)

**수정**:

- `frontend/src/style.css` - “Readable 토글” 대신 중요도(critical/ambient) 기반으로 CRT 강도/대비/타이포 토큰을 재정의
- `frontend/src/stores/uiPrefsStore.ts` - Readable 설정 제거 + legacy 저장값 마이그레이션/무시 처리
- `frontend/src/App.tsx` - 헤더 Readable 토글 제거, DOM 데이터 속성/클래스 적용 정리
- `frontend/src/components/AgentConsole.tsx` - 마이크로 텍스트/배지 영역을 `critical`로 마킹(예: `data-ui-importance="critical"`)

**참조**:

- `vibe/prd.md` - 9.4 접근성/입력(Readable 제거/정보 계층), 9.5 CRT 효과(중요도 기반 적용)
- `vibe/unit-plans/U-028[Mvp].md` - UI 스케일/persist 및 마이크로 텍스트 기준(기존 구현 기반)
- `vibe/unit-plans/U-004[Mvp].md` - CRT 테마/오버레이 기본 규칙
- `.cursor/rules/10-frontend-game-ui.mdc` - CRT 테마/게임 UI 규칙

## 구현 흐름

### 1단계: 중요도(critical/ambient) 정책 확정 + 대상 목록화

- “읽혀야 하는 것”을 명시한다: 재화 HUD, 비용/위험/보상 텍스트, Agent Console 단계/배지, 버튼/선택지 라벨, 에러/차단 메시지.
- 해당 영역에는 `data-ui-importance="critical"`(또는 `.ui-critical`) 마킹을 적용하는 규칙을 정한다.
- 장식/분위기 영역(ambient)은 Scene Canvas 오버레이, 패널 크롬, 배경/분리선 등으로 한정한다(정보 전달 영역을 침범하지 않게).

### 2단계: Readable 모드 제거(상태/DOM/UI) + 저장값 마이그레이션

- `uiPrefsStore`에서 `readableMode`(또는 유사 플래그)를 제거하고, 기존 저장값이 남아있어도 앱이 깨지지 않게 기본값/마이그레이션을 둔다.
- `App.tsx` 헤더의 “READ” 토글을 제거하고, `html[data-readable]` 같은 DOM 속성도 더 이상 설정하지 않는다.

### 3단계: CSS 토큰 설계(중요도 기반) + CRT 오버레이 적용 범위 재조정

- CRT 강도 토큰을 “모드”가 아니라 “영역 중요도”로 분리한다(예시):
  - `--crt-overlay-opacity-ambient`
  - `--crt-scanline-strength-ambient`
  - `--crt-glow-ambient`
  - `--ui-text-contrast-critical`
  - `--ui-text-glow-critical`
- `critical` 영역에서는 스캔라인/글로우/플리커가 **텍스트를 해치지 않는 최소치**로 유지되도록 하고, `ambient` 영역에서 분위기를 확보한다.
- 오버레이가 전역일 경우, `critical` 영역에는 오버레이 강도를 낮추는 방식(예: 컨테이너 기반 토큰 덮어쓰기)으로 “읽힘”을 보호한다.

### 4단계: 접근성 가드(자동 완화) 추가

- `@media (prefers-reduced-motion: reduce)`에서 플리커 애니메이션을 비활성화(또는 정적/저빈도)한다.
- (선택) `prefers-contrast` 환경에서는 `critical` 텍스트 대비를 추가 상향한다.

### 5단계: 수동 검증(런북)

- 기본 UI에서 Agent Console/재화/비용/버튼 라벨이 **즉시 읽히고**, 장면/크롬/배경에서 CRT 분위기가 유지된다.
- reduced motion 환경에서 플리커가 자동으로 꺼지며, UI 기능(클릭/드래그/스크롤)이 방해받지 않는다.
- 기존 localStorage에 Readable 값이 남아 있어도 UI가 깨지지 않고, 새 정책이 우선 적용된다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-028[Mvp]](U-028[Mvp].md) - UI 스케일/persist 및 마이크로 텍스트 기준선(Readable 구현은 후속에서 제거)
- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - CRT 테마/오버레이 기본 규칙

**다음 작업에 전달할 것**:

- “중요 영역 보호(critical) + 분위기 연출(ambient)” 스타일 규칙(핵심 UI 전반에 재사용)
- U-038(아이콘 v2), U-032(Chrome) 등 에셋/장식 유닛에서 ‘식별성 우선’ 적용 기준

## 주의사항

**기술적 고려사항**:

- 플리커/글리치는 광과민/피로를 유발할 수 있으므로, reduced motion 가드는 필수다.
- 장식 효과는 정보 전달을 침범하면 안 된다(important text는 항상 readable).

**잠재적 리스크**:

- 중요도 마킹이 누락되면 일부 텍스트가 여전히 읽기 어려울 수 있음 → `critical` 대상 목록을 최소 1회 점검하고, 런북 시나리오에 “마이크로 텍스트” 검증을 포함한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 중요도 레벨을 몇 단계로 가져갈까?
  - Option A: 2단(critical/ambient) - 단순/빠름(권장) ✅
  - Option B: 3단(critical/normal/ambient) - 튜닝 여지 ↑, 규칙/마킹 비용 ↑
- [ ] **Q2**: CRT 오버레이의 분위기 SSOT를 어디에 둘까?
  - Option A: Scene Canvas 중심(장면에 분위기 집중, 텍스트 보호) ✅
  - Option B: 전역 오버레이 유지(레트로 감성 ↑) — 대신 critical 보호 토큰이 더 중요

## 참고 자료

- `vibe/prd.md` - 9.4/9.5 (가독성/CRT 효과 정책)
- `frontend/src/style.css` - CRT/타이포 토큰(SSOT)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - 접근성 가드
