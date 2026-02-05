# U-073[Mvp]: 레이아웃 확장 - 좌우 빈공간 활용으로 덜 답답한 UI

## 메타데이터

| 항목      | 내용                                  |
| --------- | ------------------------------------- |
| Unit ID   | U-073[Mvp]                            |
| Phase     | MVP                                   |
| 예상 소요 | 60분                                  |
| 의존성    | U-049[Mvp]                            |
| 우선순위  | High (데모 UI 체감 개선)              |

## 작업 목표

**좌우 빈공간을 활용하여 레이아웃을 확장**하고, 패널들이 덜 답답하게 배치되어 "게임 HUD"로서의 인상을 강화한다.

**배경**: 현재 레이아웃이 중앙에 집중되어 있어, 넓은 화면에서 좌우 여백이 낭비되고 패널들이 좁게 느껴질 수 있다. 좌우 공간을 활용하면 정보 밀도를 낮추고 시각적 여유를 확보하여 "채팅 앱"이 아닌 "게임 UI" 인상을 강화할 수 있다.

**완료 기준**:

- 와이드스크린(1920px 이상)에서 좌우 패널이 더 넓게 펼쳐짐
- Scene Canvas와 사이드 패널 간 적절한 간격 확보
- 최소 지원 해상도(1366x768)에서도 레이아웃이 깨지지 않음
- 각 패널의 최소/최대 너비가 명확히 정의됨

## 영향받는 파일

**수정**:

- `frontend/src/App.tsx` - 레이아웃 구조 조정 (grid/flexbox 설정)
- `frontend/src/style.css` - 레이아웃 관련 CSS 변수/미디어쿼리 추가
- `frontend/src/components/Header.tsx` - 헤더 너비 조정 (필요 시)
- `frontend/src/components/Footer.tsx` - 푸터(ActionDeck) 너비 조정

**참조**:

- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계 개선
- `vibe/prd.md` 9.3절 - 레이아웃 원칙
- `vibe/ref/frontend-style-guide.md` - 레이아웃 가이드

## 구현 흐름

### 1단계: 현재 레이아웃 분석 및 목표 정의

- 현재 레이아웃의 max-width, 패널 비율 확인
- 목표 레이아웃 비율 정의:
  - 좌측 패널(Inventory/Quest): 250px~350px
  - 중앙(Scene Canvas + Narrative): flex-grow
  - 우측 패널(Rule Board/Agent Console): 250px~350px

### 2단계: CSS 레이아웃 변수 정의

```css
/* frontend/src/style.css */
:root {
  /* 레이아웃 */
  --layout-max-width: 1800px;
  --layout-side-panel-min: 250px;
  --layout-side-panel-max: 350px;
  --layout-center-min: 500px;
  --layout-gap: 1rem;
  
  /* 반응형 브레이크포인트 */
  --breakpoint-wide: 1920px;
  --breakpoint-normal: 1366px;
  --breakpoint-compact: 1024px;
}
```

### 3단계: App.tsx 레이아웃 구조 조정

- CSS Grid로 3컬럼 레이아웃 구성
- 와이드스크린에서 패널이 더 넓게 펼쳐지도록

```tsx
// frontend/src/App.tsx
<AppContainer>
  <Header />
  <MainContent>
    <LeftPanel>
      <InventoryPanel />
      <QuestPanel />
    </LeftPanel>
    <CenterArea>
      <SceneCanvas />
      <NarrativeFeed />
    </CenterArea>
    <RightPanel>
      <RuleBoardPanel />
      <AgentConsole />
    </RightPanel>
  </MainContent>
  <Footer>
    <ActionDeck />
  </Footer>
</AppContainer>
```

```css
.main-content {
  display: grid;
  grid-template-columns: 
    minmax(var(--layout-side-panel-min), var(--layout-side-panel-max))
    1fr
    minmax(var(--layout-side-panel-min), var(--layout-side-panel-max));
  gap: var(--layout-gap);
  max-width: var(--layout-max-width);
  margin: 0 auto;
  padding: 0 var(--layout-gap);
}
```

### 4단계: 반응형 조정

- 와이드스크린(1920px+): 패널 최대 너비 활용
- 일반(1366px~1920px): 기본 레이아웃
- 컴팩트(1024px~1366px): 사이드 패널 축소
- 모바일(768px 이하): 단일 컬럼 (MMP 범위)

```css
/* 와이드스크린 */
@media (min-width: 1920px) {
  :root {
    --layout-side-panel-max: 400px;
    --layout-gap: 1.5rem;
  }
}

/* 컴팩트 */
@media (max-width: 1024px) {
  :root {
    --layout-side-panel-min: 200px;
    --layout-side-panel-max: 280px;
  }
}
```

### 5단계: 패널 간 시각적 분리 강화

- 패널 사이에 미묘한 구분선 또는 그림자
- 빈공간에 CRT 효과(스캔라인 등) 유지

```css
.left-panel, .right-panel {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.center-area {
  display: flex;
  flex-direction: column;
  gap: var(--layout-gap);
}
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-049[Mvp]](../unit-results/U-049[Mvp].md) - 레이아웃/스크롤 설계 개선
- **참조**: `vibe/prd.md` 9.3절 - 레이아웃 원칙

**다음 작업에 전달할 것**:

- CP-MVP-03: 와이드스크린에서 여유 있는 UI 데모
- MMP U-107: 모바일 UX 개선

## 주의사항

**기술적 고려사항**:

- (RULE-002) 채팅 UI로 회귀하지 않도록 고정 HUD/패널 구조 유지
- (PRD 9.3) 최소 뷰포트(1366x768)에서 초기 화면이 불필요한 스크롤을 강제하지 않게
- 패널 너비 변경 시 내부 콘텐츠(텍스트, 버튼 등) 레이아웃도 함께 확인

**잠재적 리스크**:

- 너무 넓으면 시선 분산 → 적절한 max-width 제한
- 패널 사이 간격이 너무 넓으면 연결감 저하 → 시각적 그룹핑(컬러, 라인) 활용

## 페어링 질문 (결정 필요)

- [x] **Q1**: 레이아웃 max-width?
  - Option A: 1600px (중간, 대부분 모니터에서 여백 확보)
  - Option B: 1800px (와이드, 대형 모니터 활용)
  - Option C: 100% (전체 너비, 완전히 펼침)
  **A1**: Option A

- [x] **Q2**: 좌우 패널 배치?
  - Option A: 좌측(Inventory+Quest), 우측(Rule Board+Agent Console) - 현재 구조 유지
  - Option B: 좌측(Inventory), 우측(Quest+Rule Board+Agent Console) - 인벤토리 강조
  - Option C: 동적 배치 (사용자가 패널 위치 조정 가능) - MMP
  **A2**: Option A

- [x] **Q3**: 빈공간 처리?
  - Option A: 순수 배경색 + CRT 효과
  - Option B: 장식용 패턴/텍스처 (게임 테마 강화)
  - Option C: 추가 정보 패널 배치 (미니맵, 시계 등)
  **A3**: Option B

## 참고 자료

- `vibe/unit-results/U-049[Mvp].md` - 레이아웃/스크롤 개선 결과
- `vibe/prd.md` 9.3절 - 레이아웃 원칙
- `vibe/ref/frontend-style-guide.md` - 레이아웃/스타일 가이드
