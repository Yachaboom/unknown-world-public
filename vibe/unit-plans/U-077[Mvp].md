# U-077[Mvp]: 인벤토리 패널 스크롤 및 아이템 관리 UX 개선

## 메타데이터

| 항목      | 내용                                 |
| --------- | ------------------------------------ |
| Unit ID   | U-077[Mvp]                           |
| Phase     | MVP                                  |
| 예상 소요 | 45분                                 |
| 의존성    | U-011[Mvp], U-049[Mvp]               |
| 우선순위  | Medium (UX 품질/장기 플레이 대응)    |

## 작업 목표

인벤토리 아이템이 많아질 경우에도 **패널 레이아웃이 깨지지 않고 스크롤로 모든 아이템에 접근**할 수 있게 한다. 또한 아이템 개수 표시, 정렬/필터(선택), 빈 슬롯 상태 등 **아이템 관리 UX**를 개선한다.

**배경**: 현재 인벤토리 패널(U-011)은 기본 DnD 기능만 구현되어 있어, 아이템이 5~10개를 넘어가면 패널 영역을 넘치거나 레이아웃이 깨질 수 있다. 게임 진행에 따라 아이템이 누적되는 상황을 고려해, 스크롤 및 아이템 개수 표시가 필요하다.

**완료 기준**:

- 인벤토리 아이템이 패널 높이를 초과하면 **패널 내부 스크롤**이 활성화됨 (전체 사이드바 스크롤 아님)
- 스크롤 시에도 **DnD(드래그 앤 드롭)가 정상 동작**함
- 인벤토리 헤더에 **총 아이템 개수**가 표시됨 (예: "인벤토리 (12)")
- 아이템이 없을 때 **빈 상태 안내** 표시 (예: "아이템이 없습니다")
- (선택) 아이템 정렬 버튼 (이름순/획득순) 또는 카테고리 필터 탭

## 영향받는 파일

**수정**:

- `frontend/src/components/InventoryPanel.tsx` - 스크롤 컨테이너, 아이템 개수 표시, 빈 상태 UI
- `frontend/src/style.css` - 인벤토리 스크롤 스타일, max-height, overflow-y 설정
- `frontend/src/stores/inventoryStore.ts` - (선택) 정렬/필터 상태 추가

**참조**:

- `vibe/unit-plans/U-011[Mvp].md` - 인벤토리 패널 기본 구조
- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계 원칙 (카드 내부 스크롤)
- `vibe/prd.md` 9.3절 - "패널 콘텐츠 단위 스크롤" 원칙

## 구현 흐름

### 1단계: 스크롤 컨테이너 설정

- `InventoryPanel.tsx`의 아이템 목록 영역에 스크롤 컨테이너 적용
- CSS: `max-height: calc(100% - 헤더높이)`, `overflow-y: auto`
- 스크롤바 스타일링 (CRT 테마 호환)

```css
/* frontend/src/style.css */
.inventory-items {
  max-height: calc(100% - 40px); /* 헤더 높이 제외 */
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--text-dim) var(--bg-color);
}
```

### 2단계: DnD + 스크롤 호환성 확인

- dnd-kit의 `DndContext`와 스크롤 컨테이너 호환성 테스트
- 스크롤 중 드래그 시 자동 스크롤(autoscroll) 동작 확인
- 필요 시 `useSensors`의 `activationConstraint` 조정

### 3단계: 아이템 개수 및 빈 상태 UI

- 인벤토리 헤더에 아이템 개수 표시: `인벤토리 ({items.length})`
- 아이템이 0개일 때 빈 상태 메시지 및 가이드 표시

```tsx
// frontend/src/components/InventoryPanel.tsx
{items.length === 0 ? (
  <div className="inventory-empty">
    {t('inventory.empty')}
  </div>
) : (
  <div className="inventory-items">
    {items.map(item => <InventoryItem key={item.id} item={item} />)}
  </div>
)}
```

### 4단계: (선택) 정렬/필터 기능

- 간단한 정렬 토글: 이름순 / 획득순(시간순)
- 카테고리 필터 탭 (예: 전체 / 도구 / 소비품 / 재료)
- MVP에서는 최소 구현, MMP에서 고도화

### 5단계: i18n 키 추가

- `inventory.empty`: "아이템이 없습니다" / "No items"
- `inventory.count`: "인벤토리 ({{count}})" / "Inventory ({{count}})"

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-011[Mvp]](U-011[Mvp].md) - 인벤토리 패널 기본 구조, DnD 설정
- **계획서**: [U-049[Mvp]](U-049[Mvp].md) - 레이아웃/스크롤 설계 원칙 (카드 내부 스크롤)

**다음 작업에 전달할 것**:

- CP-MVP-03: 아이템이 많은 상황에서도 인벤토리 UX가 유지되는 데모 시나리오
- U-075(아이콘 동적 생성): 아이템 개수가 많아도 렌더링 성능 유지

## 주의사항

**기술적 고려사항**:

- (PRD 9.3) 스크롤은 "컬럼 전체(사이드바)"가 아니라 **패널 콘텐츠 단위**로 한정
- (RULE-002) 인벤토리는 항상 보이는 고정 HUD로 유지 (스크롤바가 있어도 패널 자체는 숨겨지지 않음)
- dnd-kit의 autoscroll 기능이 스크롤 컨테이너와 잘 동작하는지 테스트 필요

**잠재적 리스크**:

- 스크롤 컨테이너 내 드래그 시 스크롤이 부자연스러울 수 있음 → dnd-kit의 `AutoScrollActivator` 옵션 조정
- 아이템이 매우 많으면(50+) 렌더링 성능 저하 가능 → MMP에서 가상화(virtualization) 고려

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 정렬/필터 기능을 MVP에 포함할까?
  - Option A: MVP에서는 스크롤만 구현, 정렬/필터는 MMP
  - Option B: 간단한 정렬 토글(이름순/획득순)만 MVP에 포함
  - Option C: 카테고리 탭까지 MVP에 포함

- [ ] **Q2**: 스크롤바 스타일?
  - Option A: 브라우저 기본 (단순)
  - Option B: CRT 테마에 맞춘 커스텀 스크롤바 (녹색 계열)
  - Option C: 스크롤바 숨기고 터치/휠만 지원

- [ ] **Q3**: 빈 상태에서 가이드 표시?
  - Option A: 단순 텍스트 ("아이템이 없습니다")
  - Option B: 아이템 획득 방법 힌트 포함 ("장면을 탐색하여 아이템을 찾으세요")
  - Option C: Scanner 사용 유도 링크 포함

## 참고 자료

- `vibe/unit-plans/U-011[Mvp].md` - 인벤토리 패널 기본
- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계
- `vibe/prd.md` 9.3절 - 레이아웃 원칙
- [dnd-kit Scrollable Containers](https://docs.dndkit.com/api-documentation/sensors#auto-scroll)
