# U-081[Mvp]: UI 레이아웃 - Quest 식별성 강화 + Rule Board 컴팩트화 + 패널 영역 안정화

## 메타데이터

| 항목      | 내용                                                 |
| --------- | ---------------------------------------------------- |
| Unit ID   | U-081[Mvp]                                           |
| Phase     | MVP                                                  |
| 예상 소요 | 60분                                                 |
| 의존성    | U-049[Mvp], U-077[Mvp], U-078[Mvp]                  |
| 우선순위  | High (UI 가시성/게임성 핵심)                         |

## 작업 목표

좌측 사이드바의 **3대 핵심 패널(Inventory/Quest/Rule Board)** 레이아웃을 개선한다. 기존 "Inventory 영역 침범 수정" 목표에 더해 다음 두 가지를 추가한다:

1. **Quest 패널 식별성 강화**: Quest 패널이 다른 패널과 시각적으로 구별되지 않아 중요 목표를 놓치기 쉽다 → 전용 색상/아이콘/테두리로 식별성을 높인다
2. **Rule Board 컴팩트화**: 활성 규칙(RuleBoard)과 변형 타임라인(MutationTimeline)이 **별도 섹션으로 분리**되어 있어 공간을 낭비하고 "왜 나뉘어 있는지" 직관적이지 않다 → **하나의 통합 뷰**로 합치고, 위치도 재검토한다

**배경**:

- 현재 Quest 패널은 Inventory/Rule Board와 동일한 Panel 컴포넌트 스타일을 사용하여 시각적 우선순위가 없다. 게임에서 "지금 뭘 해야 하는가"를 보여주는 Quest는 가장 눈에 띄어야 한다.
- Rule Board 내부에 "활성 규칙 카드" + "점선 구분" + "변형 타임라인 섹션"이 세로로 나열되어 있어 200px max-height 안에서 의미 없이 공간을 차지한다. 활성 규칙과 그 규칙의 변형 이력은 **같은 맥락의 정보**이므로 분리할 이유가 없다.

**완료 기준**:

- Quest/Rule 패널이 많아져도 **Inventory 패널이 최소 높이(min-height)를 보장**받음
- 각 패널에 **max-height + 내부 스크롤**이 적용되어 무한 확장을 방지
- 패널 간 영역 분배가 **flex-shrink/grow** 로 안정적으로 유지됨
- **Quest 패널이 전용 시각 언어**로 다른 패널과 구별됨 (테두리 색상, 패널 헤더 강조, 아이콘)
- **Rule Board + Mutation Timeline이 통합**되어 한 패널 안에서 컴팩트하게 표시됨
- 모든 핵심 패널 헤더가 항상 보임(collapse 시에도)

## 영향받는 파일

**수정**:

- `frontend/src/App.tsx` - 사이드바 패널 배치 변경 (Rule Board + MutationTimeline 통합)
- `frontend/src/components/RuleBoard.tsx` - MutationTimeline 통합, 컴팩트 레이아웃
- `frontend/src/components/MutationTimeline.tsx` - 인라인 컴팩트 모드 또는 RuleBoard에 흡수
- `frontend/src/components/QuestPanel.tsx` - 패널 헤더/테두리 식별성 강화 (클래스 추가)
- `frontend/src/components/InventoryPanel.tsx` - min-height 보장
- `frontend/src/style.css` - 패널 레이아웃 CSS + Quest 식별성 + RuleBoard 컴팩트화

**참조**:

- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계 원칙 (카드 내부 스크롤)
- `vibe/unit-plans/U-077[Mvp].md` - 인벤토리 스크롤 및 UX 개선
- `vibe/unit-plans/U-078[Mvp].md` - 목표 시스템 강화 (Quest UI 기반)
- `vibe/prd.md` 9.3절 - 레이아웃 원칙 (패널 콘텐츠 단위 스크롤)

## 구현 흐름

### 1단계: Quest 패널 식별성 강화

**문제**: Quest 패널이 Inventory/RuleBoard와 동일한 `.panel` 스타일(녹색 CRT 테두리)을 사용하여 시각적 우선순위가 없다. "지금 뭘 해야 하는가"는 게임에서 가장 중요한 정보인데 찾아보아야 한다.

**해결 방향**: Quest 패널에 전용 시각 언어를 부여하여 한눈에 구별되게 한다.

- **패널 테두리/헤더 색상 차별화**: accent 색상(magenta/amber 계열)으로 Quest 패널 테두리 강조
- **패널 헤더 아이콘**: 타이틀 옆에 목표 관련 아이콘(🎯 등) 고정 표시
- **상태 기반 시각 피드백**: 목표 진행 중(펄스 글로우), 완료 직후(완료 플래시)
- **빈 상태 구별**: 목표 없을 때도 "여기가 퀘스트 영역"임을 알 수 있는 고유 스타일

```css
/* Quest 패널 식별성 강화 */
.panel-quest {
  /* 기존 max-height 유지 */
  max-height: 200px;
  flex-shrink: 0;
}

/* Quest 전용 테두리/글로우 */
.panel-quest .panel-frame {
  border-color: var(--accent-color); /* 다른 패널과 차별화 */
  box-shadow: 0 0 6px rgba(255, 0, 255, 0.15);
}

/* 목표 진행 중일 때 미묘한 펄스 */
.panel-quest[data-has-active="true"] .panel-frame {
  animation: questPulse 3s ease-in-out infinite;
}

@keyframes questPulse {
  0%, 100% { box-shadow: 0 0 6px rgba(255, 0, 255, 0.15); }
  50% { box-shadow: 0 0 10px rgba(255, 0, 255, 0.3); }
}

/* 패널 헤더 타이틀 앞 아이콘 */
.panel-quest .panel-title::before {
  content: '🎯 ';
}
```

### 2단계: Rule Board + Mutation Timeline 통합

**문제**: 현재 구조

```
┌── Rule Board 패널 (max-height: 200px) ──┐
│  ┌ 활성 규칙 헤더 (N개 활성) ┐          │
│  │ [규칙 카드 1]              │          │
│  │ [규칙 카드 2]              │          │
│  └────────────────────────────┘          │
│  ┄┄┄┄ 점선 구분 ┄┄┄┄┄┄┄┄┄┄┄           │
│  ┌ 변형 타임라인 헤더 ┐                  │
│  │ [이벤트 1]          │                 │
│  │ [이벤트 2]          │                 │
│  └─────────────────────┘                 │
└──────────────────────────────────────────┘
```

→ 활성 규칙과 변형 이력은 **같은 맥락의 정보**. "현재 규칙"과 "그 규칙이 어떻게 바뀌어 왔는지"를 따로 보여줄 이유가 없다.

**해결: 통합 뷰**

- 각 규칙 카드 안에 해당 규칙의 최근 변형 이벤트를 **인라인 태그/뱃지**로 표시
- 별도 타임라인 섹션 제거 → 규칙 카드 자체가 변형 히스토리를 담음
- 변형이 없는 규칙은 "초기" 상태로, 변형이 있는 규칙은 유형(추가/수정/제거)별 뱃지 표시

```
┌── Rule Board 패널 (통합, 더 컴팩트) ────┐
│  활성 규칙 · 2개                         │
│  ┌ ⚙ 중력 반전  [🔄 T3에서 변형] ┐     │
│  │   물체가 위로 떨어진다          │     │
│  └─────────────────────────────────┘     │
│  ┌ ⚙ 시간 왜곡  [➕ T1에서 추가]  ┐     │
│  │   시간이 불규칙하게 흐른다      │     │
│  └─────────────────────────────────┘     │
└──────────────────────────────────────────┘
```

**구현 방식**:

- `RuleBoard.tsx`에서 `MutationTimeline` 데이터를 직접 참조하여 규칙별 최근 이벤트를 매칭
- `MutationTimeline.tsx`는 별도 렌더링 제거 (또는 "전체 히스토리 보기" 확장 토글로 전환)
- `App.tsx`에서 `<MutationTimeline />` 직접 렌더링 제거, RuleBoard 내부로 흡수

```tsx
// RuleBoard.tsx - 통합 후 구조
function RuleCard({ rule, recentMutation }: RuleCardProps) {
  return (
    <div className="rule-card" data-rule-id={rule.id}>
      <div className="rule-card-header">
        <span className="rule-card-icon" aria-hidden="true">⚙</span>
        <span className="rule-card-label">{rule.label}</span>
        {/* 최근 변형 뱃지 (인라인) */}
        {recentMutation && (
          <span className={`rule-mutation-badge rule-mutation-${recentMutation.type}`}>
            {mutationIcon[recentMutation.type]} T{recentMutation.turn}
          </span>
        )}
      </div>
      {rule.description && (
        <p className="rule-card-description">{rule.description}</p>
      )}
    </div>
  );
}
```

### 3단계: 패널 영역 분배 안정화

기존 U-081 핵심 목표. Inventory가 Quest/Rule 확장에 밀리지 않도록 보장.

- **Inventory**: `flex: 1` + `min-height: 120px` (축소 불가)
- **Quest**: `max-height: 200px` + 내부 스크롤
- **Rule Board**: `max-height: 180px` + 내부 스크롤 (통합으로 기존 200px에서 줄임)

```css
.sidebar-left {
  display: flex;
  flex-direction: column;
  gap: var(--layout-gap);
  height: 100%;
}

/* Inventory: 절대 축소 불가 */
.panel-inventory {
  flex: 1;
  min-height: 120px;
}

/* Quest: 식별성 강화 + max-height */
.panel-quest {
  max-height: 200px;
  flex-shrink: 0;
}

/* Rule Board: 통합으로 컴팩트화, max-height 축소 */
.panel-rule-board {
  max-height: 180px;
  flex-shrink: 0;
}
```

### 4단계: 패널 헤더 고정 + 내부 스크롤

- 각 패널의 헤더(타이틀)가 스크롤 영역 밖에 위치하여 항상 보이도록 구조 조정
- Quest/Rule Board의 `.panel-content`에만 `overflow-y: auto` 적용
- collapse 기능이 있다면, collapse 상태에서도 헤더는 보이도록

### 5단계: Rule Board 위치 검토 (선택)

현재: Inventory → Quest → Rule Board (아래에서 위)

**검토 옵션**:
- **Option A (현재)**: Inventory ↔ Quest ↔ Rule Board - Quest가 가운데, 양쪽에 다른 정보
- **Option B**: Quest ↔ Rule Board ↔ Inventory - 정보 계열(목표+규칙)을 상단에 모으고, 인터랙션(인벤토리)을 하단에
- **Option C**: Quest ↔ Inventory ↔ Rule Board - Quest를 최상단(가장 눈에 띄는 위치), 인벤토리 가운데, Rule Board 하단

→ **Q4에서 결정** (Quest 식별성 강화가 충분하면 위치 변경 불필요할 수 있음)

### 6단계: 반응형 조정

- 뷰포트 높이가 작을 때(768px 이하) 패널 min-height/max-height 조정
- 모바일에서 패널 collapse 기본 적용 검토

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-049[Mvp]](U-049[Mvp].md) - 레이아웃/스크롤 설계 원칙
- **계획서**: [U-077[Mvp]](U-077[Mvp].md) - 인벤토리 스크롤 적용 방식
- **결과물**: [U-078[Mvp]](U-078[Mvp].md) - 목표 시스템 (Quest 패널 UI 기반)

**다음 작업에 전달할 것**:

- U-082: Agent Console 영역 조정과 함께 전체 레이아웃 균형 확보
- CP-MVP-03: Quest/Rule이 많은 시나리오에서도 인벤토리 사용 가능 확인

## 주의사항

**기술적 고려사항**:

- (PRD 9.3) 스크롤은 "컬럼 전체(사이드바)"가 아니라 **패널 콘텐츠 단위**로 한정
- (RULE-002) Inventory/Quest/Rule은 항상 보이는 고정 HUD로 유지
- (PRD 6.4) Rule Mutation 정보 자체는 삭제하지 않음 — 별도 섹션이 아니라 규칙 카드에 **인라인 표시**로 전환
- flex-shrink 설정 시 다른 패널에 영향이 가지 않도록 주의
- dnd-kit의 드래그 영역이 스크롤 컨테이너 변경으로 영향받지 않는지 확인
- Quest 식별성 강화 시 CRT 테마 전체 톤과 조화 필요 (과도한 색상 사용 자제)

**잠재적 리스크**:

- min-height가 너무 크면 작은 화면에서 다른 패널이 안 보일 수 있음 → 반응형 미디어 쿼리로 조정
- 내부 스크롤이 중첩되면 UX가 혼란스러울 수 있음 → 스크롤 영역 명확히 구분 (시각적 힌트)
- RuleBoard + MutationTimeline 통합 시 mutationTimeline 데이터를 ruleId로 매칭해야 함 → 매칭 실패 시 뱃지 미표시(안전한 폴백)
- Quest 패널 강조가 과하면 CRT 테마 일관성 깨짐 → accent-color 계열 미세 변형으로 제한

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 패널 영역 분배 방식은?
  - Option A: **Inventory min-height 고정** + Quest/Rule max-height 제한
  - Option B: 3등분 고정 비율 (각 33%)
  - Option C: Inventory 우선 + 나머지 균등 분배

- [ ] **Q2**: 패널 collapse 기능 추가?
  - Option A: 현재 없음, 그대로 유지
  - Option B: 헤더 클릭으로 패널 접기/펼치기 추가
  - Option C: MMP에서 구현

- [ ] **Q3**: Quest 패널 식별성 강화 수준은?
  - Option A: **테두리 색상 + 미묘한 글로우** (accent 계열, CRT 톤 유지)
  - Option B: 테두리 + 패널 배경 그라데이션 변경 (더 강한 차별화)
  - Option C: 테두리 + 배경 + 펄스 애니메이션 (가장 강한, 주의 끌기)

- [ ] **Q4**: Rule Board + Mutation Timeline 통합 방식은?
  - Option A: **규칙 카드에 변형 뱃지 인라인** (MutationTimeline 섹션 완전 제거)
  - Option B: 규칙 카드에 뱃지 + 하단에 축소된 "최근 변형 1건" 요약만 표시
  - Option C: 토글 버튼으로 "활성 규칙 뷰" ↔ "타임라인 뷰" 전환

- [ ] **Q5**: Rule Board 패널 위치 변경?
  - Option A: 현재 유지 (Inventory → Quest → Rule Board)
  - Option B: Quest → Rule Board → Inventory (정보 계열 상단, 인터랙션 하단)
  - Option C: Quest → Inventory → Rule Board (목표 최상단)
  - Option D: Quest 식별성이 충분하면 위치 변경 불필요 → 구현 후 판단

- [ ] **Q6**: 스크롤바 스타일?
  - Option A: CRT 테마 커스텀 스크롤바 (녹색 계열)
  - Option B: 브라우저 기본 (단순)
  - Option C: 스크롤바 숨기고 터치/휠만 지원

## 참고 자료

- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계
- `vibe/unit-plans/U-077[Mvp].md` - 인벤토리 스크롤 UX
- `vibe/unit-plans/U-078[Mvp].md` - 목표 시스템 강화 (Quest UI)
- `vibe/prd.md` 9.3절 - 레이아웃 원칙
- `vibe/prd.md` 6.4절 - Rule Mutation Timeline
- [CSS Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
