# U-081[Mvp]: UI 레이아웃 - Quest/Rule 확장 시 Inventory 영역 침범 수정

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-081[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 45분                              |
| 의존성    | U-049[Mvp], U-077[Mvp]            |
| 우선순위  | High (UI 가시성/게임성 핵심)      |

## 작업 목표

Quest 목록이나 Rule Board의 항목이 늘어날 때 **Inventory 패널 영역이 축소되거나 가려지는 문제**를 수정하여, 모든 핵심 패널이 항상 최소 가시성을 유지하도록 한다.

**배경**: 현재 사이드 패널 레이아웃에서 Quest/Rule 패널이 확장되면 Inventory 패널의 높이가 줄어들거나 완전히 가려질 수 있다. 게임 진행에 따라 퀘스트와 룰이 누적되는 상황에서 인벤토리가 안 보이면 핵심 인터랙션(아이템 DnD)이 불가능해진다.

**완료 기준**:

- Quest/Rule 패널이 많아져도 **Inventory 패널이 최소 높이(min-height)를 보장**받음
- 각 패널에 **max-height + 내부 스크롤**이 적용되어 무한 확장을 방지
- 패널 간 영역 분배가 **flex-shrink/grow 또는 고정 비율**로 안정적으로 유지됨
- 모든 핵심 패널(Inventory/Quest/Rule)의 헤더가 항상 보임(collapse 시에도)

## 영향받는 파일

**수정**:

- `frontend/src/components/Sidebar.tsx` (또는 해당 레이아웃 컴포넌트) - 패널 배치 및 flex 설정
- `frontend/src/components/InventoryPanel.tsx` - min-height 적용
- `frontend/src/components/QuestPanel.tsx` - max-height + 내부 스크롤 적용
- `frontend/src/components/RuleBoard.tsx` - max-height + 내부 스크롤 적용
- `frontend/src/style.css` - 사이드바 패널 레이아웃 CSS 조정

**참조**:

- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계 원칙 (카드 내부 스크롤)
- `vibe/unit-plans/U-077[Mvp].md` - 인벤토리 스크롤 및 UX 개선
- `vibe/prd.md` 9.3절 - 레이아웃 원칙 (패널 콘텐츠 단위 스크롤)

## 구현 흐름

### 1단계: 현재 레이아웃 분석

- 사이드바 내 패널들의 flex 배치 방식 확인
- Quest/Rule이 늘어날 때 Inventory가 어떻게 축소되는지 재현/분석
- 각 패널의 현재 height/max-height/min-height 설정 확인

### 2단계: 패널 영역 분배 정책 수립

- **고정 비율 방식** 또는 **min-height 보장 방식** 선택
- 권장: Inventory에 `min-height: 120px` (최소 3-4개 아이템 표시 보장)
- Quest/Rule에 `max-height: 200px` + 내부 스크롤

```css
/* frontend/src/style.css */
.sidebar-panels {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
}

.inventory-panel {
  min-height: 120px;
  flex-shrink: 0; /* 절대 축소되지 않음 */
}

.quest-panel,
.rule-board {
  max-height: 200px;
  flex-shrink: 1;
  overflow-y: auto;
}
```

### 3단계: 패널별 내부 스크롤 적용

- Quest 패널: 목록 영역에 `overflow-y: auto` 적용
- Rule Board: 룰 카드 영역에 `overflow-y: auto` 적용
- 스크롤바 스타일링 (CRT 테마 호환)

### 4단계: 패널 헤더 고정

- 각 패널의 헤더(타이틀)가 스크롤 영역 밖에 위치하여 항상 보이도록 구조 조정
- collapse 기능이 있다면, collapse 상태에서도 헤더는 보이도록

```tsx
// 패널 구조 예시
<div className="panel quest-panel">
  <div className="panel-header">퀘스트</div>
  <div className="panel-content"> {/* 이 부분만 스크롤 */}
    {quests.map(q => <QuestItem key={q.id} quest={q} />)}
  </div>
</div>
```

### 5단계: 반응형 조정

- 뷰포트 높이가 작을 때(768px 이하) 패널 min-height/max-height 조정
- 모바일에서 패널 collapse 기본 적용 검토

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-049[Mvp]](U-049[Mvp].md) - 레이아웃/스크롤 설계 원칙
- **계획서**: [U-077[Mvp]](U-077[Mvp].md) - 인벤토리 스크롤 적용 방식

**다음 작업에 전달할 것**:

- U-082: Agent Console 영역 조정과 함께 전체 레이아웃 균형 확보
- CP-MVP-03: Quest/Rule이 많은 시나리오에서도 인벤토리 사용 가능 확인

## 주의사항

**기술적 고려사항**:

- (PRD 9.3) 스크롤은 "컬럼 전체(사이드바)"가 아니라 **패널 콘텐츠 단위**로 한정
- (RULE-002) Inventory/Quest/Rule은 항상 보이는 고정 HUD로 유지
- flex-shrink 설정 시 다른 패널에 영향이 가지 않도록 주의
- dnd-kit의 드래그 영역이 스크롤 컨테이너 변경으로 영향받지 않는지 확인

**잠재적 리스크**:

- min-height가 너무 크면 작은 화면에서 다른 패널이 안 보일 수 있음 → 반응형 미디어 쿼리로 조정
- 내부 스크롤이 중첩되면 UX가 혼란스러울 수 있음 → 스크롤 영역 명확히 구분 (시각적 힌트)

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 패널 영역 분배 방식은?
  - Option A: **Inventory min-height 고정** + Quest/Rule max-height 제한
  - Option B: 3등분 고정 비율 (각 33%)
  - Option C: Inventory 우선 + 나머지 균등 분배

- [ ] **Q2**: 패널 collapse 기능 추가?
  - Option A: 현재 없음, 그대로 유지
  - Option B: 헤더 클릭으로 패널 접기/펼치기 추가
  - Option C: MMP에서 구현

- [ ] **Q3**: 스크롤바 스타일?
  - Option A: CRT 테마 커스텀 스크롤바 (녹색 계열)
  - Option B: 브라우저 기본 (단순)
  - Option C: 스크롤바 숨기고 터치/휠만 지원

## 참고 자료

- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계
- `vibe/unit-plans/U-077[Mvp].md` - 인벤토리 스크롤 UX
- `vibe/prd.md` 9.3절 - 레이아웃 원칙
- [CSS Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
