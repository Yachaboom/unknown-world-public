# U-057[Mvp]: 텍스트 번짐 식별성 개선

## 메타데이터

| 항목      | 내용                        |
| --------- | --------------------------- |
| Unit ID   | U-057[Mvp]                  |
| Phase     | MVP                         |
| 예상 소요 | 45분                        |
| 의존성    | U-037[Mvp]                  |
| 우선순위  | Medium (품질 개선)          |

## 작업 목표

CRT 효과로 인해 **과도하게 번져 가독성이 떨어지는 텍스트들을 개선**하여, 터미널 테마 분위기를 유지하면서도 모든 텍스트가 명확히 읽히도록 한다.

**배경**: U-037에서 CRT/가독성 레이어링을 구현했으나, 일부 텍스트에 적용된 `text-shadow`, `filter: blur`, 글로우 효과 등이 과도하여 식별성이 저하되었다. 특히 작은 폰트(12px 이하)나 얇은 글꼴(font-weight: 300)에서 문제가 심화된다. PRD의 "게임 UI 품질" 요구사항을 충족하려면 분위기와 가독성의 균형이 필요하다.

**완료 기준**:

- 모든 텍스트가 명확히 읽히는 수준으로 개선됨
- CRT 테마 분위기 유지 (과도한 효과 완화, 전체 제거 아님)
- `frontend-style-guide.md` 가이드라인 준수
- 주요 UI 영역(내러티브, 액션, 퀘스트, 룰) 가독성 확인

## 영향받는 파일

**수정**:

- `frontend/src/styles/crt.css` - CRT 효과 관련 스타일 조정
- `frontend/src/styles/variables.css` - 텍스트 관련 CSS 변수 조정
- `frontend/src/components/NarrativePanel.tsx` - 가독성 클래스 적용 (필요 시)
- `frontend/src/components/ActionDeck.tsx` - 가독성 클래스 적용 (필요 시)

**생성** (필요 시):

- `frontend/src/styles/readable.css` - 가독성 보호 클래스 정의

**참조**:

- `vibe/ref/frontend-style-guide.md` - CRT 테마 및 가독성 가이드라인
- `vibe/unit-results/U-037[Mvp].md` - CRT/가독성 레이어링 구현 결과
- `.cursor/rules/10-frontend-game-ui.mdc` - 프론트엔드 UI 규칙

## 구현 흐름

### 1단계: 번짐 원인 분석

#### A. CRT 효과 분석

```css
/* 현재 적용된 효과 확인 */
.crt-effect {
  text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);  /* 글로우 */
  filter: blur(0.5px);  /* 미세 번짐 */
  /* 이 조합이 작은 텍스트에서 식별성 저하 */
}
```

#### B. 영향받는 영역 식별

| 영역 | 폰트 크기 | 현재 상태 | 우선순위 |
| ---- | --------- | --------- | -------- |
| 내러티브 본문 | 14-16px | 경미한 번짐 | Medium |
| 액션 라벨 | 12-14px | 심한 번짐 | High |
| 상태 텍스트 (HP/재화) | 10-12px | 심한 번짐 | High |
| 로그/타임스탬프 | 10px | 거의 읽기 어려움 | Critical |
| 퀘스트/룰 | 12-14px | 경미한 번짐 | Medium |

### 2단계: 가독성 보호 클래스 정의

```css
/* frontend/src/styles/readable.css */

/* 가독성 우선 영역 - CRT 효과 최소화 */
.readable-text {
  text-shadow: none !important;
  filter: none !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 분위기 유지하면서 가독성 확보 - 미세한 효과만 */
.readable-glow {
  text-shadow: 0 0 1px currentColor;  /* 최소 글로우 */
  filter: none;
}

/* 중요 텍스트 - 약간의 글로우로 강조 */
.readable-emphasis {
  text-shadow: 0 0 2px rgba(0, 255, 0, 0.3);
  filter: none;
}
```

### 3단계: 선택적 효과 조정

```css
/* frontend/src/styles/crt.css 수정 */

/* 기존: 전체 적용 */
/* .crt-container * { text-shadow: 0 0 5px ...; } */

/* 수정: 장식 요소에만 적용, 텍스트 영역 제외 */
.crt-container {
  /* 배경/테두리에는 효과 유지 */
  box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.1);
}

.crt-container h1,
.crt-container h2,
.crt-container .title {
  /* 제목은 글로우 유지 */
  text-shadow: 0 0 3px rgba(0, 255, 0, 0.4);
}

.crt-container p,
.crt-container span,
.crt-container .body-text {
  /* 본문은 효과 제거 */
  text-shadow: none;
  filter: none;
}
```

### 4단계: 대비/선명도 개선

```css
/* 텍스트-배경 대비 강화 */
:root {
  /* 기존: --text-primary: #00ff00; (순수 녹색) */
  /* 수정: 약간 밝게 조정 */
  --text-primary: #33ff66;
  --text-secondary: #88cc88;
  
  /* 배경과의 대비 확보 */
  --bg-dark: #0a0a0a;  /* 더 어둡게 */
}

/* 작은 텍스트 보정 */
.small-text,
.timestamp,
.subtitle {
  font-weight: 500;  /* 얇은 글꼴 대신 중간 두께 */
  letter-spacing: 0.02em;  /* 자간 약간 넓힘 */
}
```

### 5단계: 컴포넌트별 적용

```tsx
// frontend/src/components/NarrativePanel.tsx
<div className="narrative-panel readable-text">
  {narrative}
</div>

// frontend/src/components/ActionDeck.tsx  
<button className="action-button readable-glow">
  {action.label}
</button>

// frontend/src/components/EconomyHUD.tsx
<span className="balance readable-text">
  Signal: {balance.signal}
</span>
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-037[Mvp]](U-037[Mvp].md) - CRT/가독성 레이어링 구현 (현재 효과 구조)
- **참조**: `vibe/ref/frontend-style-guide.md` - 기존 스타일 가이드

**다음 작업에 전달할 것**:

- U-058: 핫스팟 디자인 개선 시 가독성 클래스 활용
- CP-MVP-03: 데모에서 텍스트 가독성 확인

## 주의사항

**기술적 고려사항**:

- (RULE-002) 채팅 UI 금지: 가독성 개선이 UI를 "채팅 앱"처럼 만들지 않도록 주의
- CSS 특이성(specificity): `!important` 남용 대신 선택자 우선순위 설계
- 성능: `filter` 속성은 렌더링 비용이 높으므로 필요한 곳에만 사용

**잠재적 리스크**:

- 효과 제거 과다 시 CRT 테마 분위기 손실 → 제목/강조 요소는 효과 유지
- 브라우저별 렌더링 차이 (특히 font-smoothing) → 주요 브라우저에서 테스트
- 고해상도/저해상도 모니터에서 다르게 보일 수 있음 → 다양한 해상도 확인

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 가독성 보호 범위?
  - Option A: 본문 텍스트만 보호, 제목/라벨은 글로우 유지 (권장)
  - Option B: 모든 텍스트 보호, 배경/테두리에만 효과
  - Option C: 폰트 크기 기준 (12px 이하만 보호)

- [ ] **Q2**: 글로우 효과 수준?
  - Option A: 완전 제거 (깔끔하지만 분위기 약화)
  - Option B: 1px 미만의 미세 글로우 (권장: 분위기 유지 + 가독성)
  - Option C: 현재 유지, blur만 제거

- [ ] **Q3**: 폰트 두께 조정?
  - Option A: 작은 텍스트(12px 이하)만 font-weight 상향
  - Option B: 전체적으로 font-weight 상향
  - Option C: 현재 유지

## 검증 체크리스트

- [ ] 내러티브 패널: 긴 문단 읽기 편안함
- [ ] 액션 덱: 버튼 라벨 즉시 인식 가능
- [ ] Economy HUD: 숫자 정확히 읽힘 (1, 7, 0 등 혼동 없음)
- [ ] 로그/타임스탬프: 작은 글씨도 읽기 가능
- [ ] 퀘스트/룰 패널: 설명 텍스트 가독성 확보
- [ ] 핫스팟 라벨: 오브젝트 이름 명확히 표시
- [ ] CRT 분위기: 스크린샷 비교 시 "터미널 게임" 느낌 유지

## 참고 자료

- `vibe/ref/frontend-style-guide.md` - CRT 테마 및 스타일 가이드
- `vibe/unit-results/U-037[Mvp].md` - CRT/가독성 레이어링 결과
- `.cursor/rules/10-frontend-game-ui.mdc` - 프론트엔드 UI 규칙
- https://webaim.org/resources/contrastchecker/ - 대비 비율 검사 도구
- `frontend/src/styles/crt.css` - 현재 CRT 효과 구현
