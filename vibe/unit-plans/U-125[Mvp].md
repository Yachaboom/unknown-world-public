# U-125[Mvp]: 이전턴 텍스트 주목성 제거 - 색상 변경 + 폰트 축소

## 메타데이터

| 항목      | 내용                                       |
| --------- | ------------------------------------------ |
| Unit ID   | U-125[Mvp]                                 |
| Phase     | MVP                                        |
| 예상 소요 | 30분                                       |
| 의존성    | U-086[Mvp]                                 |
| 우선순위  | Medium (텍스트 가독성 / 현재턴 집중)       |

## 작업 목표

NarrativeFeed의 **이전 턴 텍스트(entries)**를 시각적으로 약화하여, 현재 턴(스트리밍/타이핑 중) 텍스트에 **시선이 집중**되도록 한다. 이전 턴은 **색상을 어둡게 변경**하고 **폰트 크기를 줄여** 배경 정보로 전환한다.

**배경**: 현재 NarrativeFeed에서 이전 턴과 현재 턴이 동일한 스타일(색상, 크기)로 표시되어, 새로 들어오는 텍스트에 대한 주목성이 낮다. 게임에서 "지금 일어나는 일"이 가장 중요하므로, 과거 텍스트는 시각적 계층을 낮추어 현재 턴의 내러티브가 돋보이도록 해야 한다. 이는 RPG 게임 로그의 일반적인 패턴(최신 메시지 강조, 과거 메시지 페이드)과 일치한다.

**완료 기준**:

- 이전 턴 텍스트의 **색상이 현재 턴보다 어둡게**(dim) 표시됨 (예: `var(--text-dim)` 활용)
- 이전 턴 텍스트의 **폰트 크기가 현재 턴보다 작게** 표시됨 (예: 0.85em~0.9em)
- 현재 턴(스트리밍 중 또는 타이핑 중) 텍스트는 **기존 스타일 유지** (밝은 색, 기본 크기)
- 액션 로그 엔트리(`action-log-entry`)도 이전 턴과 동일하게 약화됨
- 시스템 메시지(`system-entry`)는 별도 스타일 유지 (기존과 동일)
- 다크/라이트 테마 모두에서 이전턴-현재턴 구분이 명확함
- `prefers-reduced-motion` 준수 (색상/크기 변경은 모션 아님, 영향 없음)

## 영향받는 파일

**수정**:

- `frontend/src/style.css` - 이전 턴 엔트리 색상/폰트 크기 스타일 추가, 현재 턴 강조 스타일
- `frontend/src/components/NarrativeFeed.tsx` - (필요 시) 이전 턴 엔트리에 구분 클래스 추가

**참조**:

- `vibe/unit-results/U-086[Mvp].md` - 텍스트 우선 타이핑 출력
- `vibe/prd.md` 9.1~9.5절 - CRT 테마, 가독성 원칙
- `vibe/ref/frontend-style-guide.md` - 색상 변수/테마 규칙

## 구현 흐름

### 1단계: 이전 턴 엔트리 스타일 정의

- 이전 턴 엔트리에 CSS 클래스 적용 (기존 `.narrative-entry`에 추가 또는 구분)
- 현재 NarrativeFeed는 `entries`(과거 턴)와 스트리밍/타이핑 텍스트(현재 턴)를 이미 구분하여 렌더링하므로, 과거 entries에 스타일만 적용하면 됨

```css
/* style.css */
/* 이전 턴: 약화 (dim + 작은 폰트) */
.narrative-entry {
  color: var(--text-dim);
  font-size: 0.85em;
  opacity: 0.75;
  line-height: 1.4;
}

/* 액션 로그도 동일하게 약화 */
.action-log-entry {
  color: var(--text-dim);
  font-size: 0.85em;
  opacity: 0.75;
}

/* 현재 턴 (스트리밍/타이핑): 강조 유지 */
.narrative-active-text {
  color: var(--text-color);
  font-size: 1em;
  opacity: 1;
  line-height: 1.6;
}
```

### 2단계: 라이트 테마 대응

- 라이트 테마에서도 이전 턴 구분이 명확하도록 `--text-dim` 변수가 적절한 대비를 제공하는지 확인
- 필요 시 라이트 테마 전용 dim 색상 조정

```css
[data-theme='light'] {
  --text-dim: #6a8a6a;  /* 기존값 확인 후 조정 */
}
```

### 3단계: 시각적 계층 미세 조정

- 이전 턴 간에도 **가장 최근 1~2턴은 약간 덜 약화**하는 그라데이션 효과 고려 (선택사항)
- 이전 턴과 현재 턴 사이에 **미세한 구분선 또는 간격** 추가 (시각적 분리 강화)

```css
/* 현재 턴 영역 위에 미세한 구분선 (선택) */
.narrative-active-area {
  border-top: 1px solid var(--border-color);
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  opacity: 0.3;
}
```

### 4단계: 검증

- 3턴 이상 진행 후: 이전 턴은 dim/작게, 현재 턴은 밝게/기본 크기로 표시 확인
- 다크 모드 + 라이트 모드 모두 대비 확인
- 액션 로그 엔트리도 이전 턴으로 약화되는지 확인
- 스크롤 시 이전 턴 텍스트가 읽기 어려울 정도로 약하지 않은지 확인 (dim이지만 readable)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-086[Mvp]](../unit-results/U-086[Mvp].md) - 텍스트 우선 타이핑 출력 (현재 턴 타이핑 메커니즘)
- **결과물**: [U-049[Mvp]](../unit-results/U-049[Mvp].md) - 레이아웃/스크롤 설계

**다음 작업에 전달할 것**:

- CP-MVP-03: "현재 턴 집중" 데모 체감 검증
- U-119[Mmp]: WIG 폴리시에서 텍스트 계층 최종 점검

## 주의사항

**기술적 고려사항**:

- (PRD 9.4) 가독성 필수 → 이전 턴 텍스트가 **너무 약해서 읽을 수 없으면 안 됨** (dim이지만 readable 대비 유지)
- (PRD 9.1) CRT 테마의 `--text-dim` 변수 활용 → 하드코딩 색상 금지
- NarrativeFeed의 entries와 active text 영역이 이미 구분되어 있으므로, CSS만으로 구현 가능할 가능성이 높음
- `shouldHideLastEntry` 로직과 충돌하지 않도록 주의 (마지막 entry 숨김 → 현재 턴 타이핑 전환 시)

**잠재적 리스크**:

- opacity + dim 색상을 동시에 적용하면 너무 약해질 수 있음 → 하나만 적용하거나 값을 보수적으로 설정
- 이전 턴 텍스트를 읽으려는 사용자에게 불편할 수 있음 → 스크롤 시 hover로 약간 밝아지는 효과 고려 (선택)
- 시스템 메시지(이미지 형성 중 등)까지 약화되면 안 됨 → `.system-entry` 스타일 별도 유지

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 이전 턴 약화 정도는?
  - Option A: **색상 dim + 폰트 0.85em + opacity 0.75** (3중 약화, 강한 구분)
  - Option B: 색상 dim + 폰트 0.9em (2중 약화, 중간 구분)
  - Option C: 색상 dim만 (약한 구분, 폰트 동일)

- [ ] **Q2**: 이전 턴 hover 시 밝아지는 효과?
  - Option A: 없음 (항상 약화)
  - Option B: **hover 시 opacity: 1 + 기본 색상** (읽기 편의)
  - Option C: hover 시 opacity만 복원

## 참고 자료

- `vibe/unit-results/U-086[Mvp].md` - 텍스트 우선 타이핑 출력
- `vibe/prd.md` 9.1~9.5절 - CRT 테마, 가독성
- `vibe/ref/frontend-style-guide.md` - 색상 변수/테마
- RPG 게임 로그 UX 패턴 (최신 메시지 강조, 과거 메시지 페이드)
