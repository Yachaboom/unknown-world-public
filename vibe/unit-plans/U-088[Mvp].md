# U-088[Mvp]: 인벤토리 UI Row 형태 전환

## 메타데이터

| 항목      | 내용                                 |
| --------- | ------------------------------------ |
| Unit ID   | U-088[Mvp]                           |
| Phase     | MVP                                  |
| 예상 소요 | 45분                                 |
| 의존성    | U-011[Mvp], U-077[Mvp]               |
| 우선순위  | Medium (인벤토리 UX 개선)            |

## 작업 목표

인벤토리 패널의 아이템 표시 방식을 **그리드/타일 형태에서 Row(행) 형태**로 전환하여, 아이템별 정보(이름, 수량, 설명 등)를 더 명확하게 보여주고, 스크롤 방향을 세로로 통일하며, DnD 조작의 정확성을 높인다.

**배경**: 현재 인벤토리가 그리드 형태(2열 이상)로 표시될 경우, 아이템 이름이 잘리거나 정보가 아이콘에 가려질 수 있다. Row 형태로 전환하면 각 아이템이 가로로 충분한 공간을 확보하여 이름/설명/수량을 명확히 표시할 수 있고, 모바일에서도 터치 타겟이 커져 조작성이 개선된다.

**완료 기준**:

- 인벤토리 아이템이 **한 줄에 하나씩(Row) 표시**됨
- 각 Row에 **아이콘 + 이름 + (수량 또는 태그)** 가 가로로 배치됨
- Row 클릭/탭 시 아이템 상세 정보(툴팁 또는 확장)가 표시됨
- **DnD(드래그 앤 드롭)가 Row 형태에서 정상 동작**함
- 스크롤 시 Row 간 구분이 명확함 (구분선 또는 줄무늬)
- 기존 그리드 레이아웃 대비 **패널 너비 내에서 정보 가독성 향상**

## 영향받는 파일

**수정**:

- `frontend/src/components/InventoryPanel.tsx` - Row 레이아웃 구현, 기존 그리드 제거
- `frontend/src/components/InventoryItem.tsx` - Row 아이템 컴포넌트 스타일 변경
- `frontend/src/style.css` - Row 레이아웃 스타일(flexbox, 구분선, 높이)
- `frontend/src/stores/inventoryStore.ts` - (선택) 확장/선택 상태 추가

**참조**:

- `vibe/unit-plans/U-011[Mvp].md` - 인벤토리 패널 기본 구조
- `vibe/unit-plans/U-077[Mvp].md` - 인벤토리 스크롤 및 아이템 관리 UX
- `vibe/unit-plans/U-056[Mvp].md` - 아이템 이름 텍스트 잘림 최소화 + 툴팁
- `vibe/prd.md` 6.7절 - Inventory(인벤토리) + Drag & Drop

## 구현 흐름

### 1단계: Row 레이아웃 구조 설계

- 기존 그리드(2열 이상) 레이아웃을 **단일 열(1 column)** 로 변경
- 각 아이템 Row 구조 정의:
  ```
  [아이콘(32~48px)] [이름(flex-grow)] [수량/태그(고정폭)] [액션버튼?]
  ```
- Row 높이: 40~56px 권장 (터치 타겟 44px 이상)

```css
/* frontend/src/style.css */
.inventory-items {
  display: flex;
  flex-direction: column;
  gap: 2px; /* 또는 구분선 사용 */
}

.inventory-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  min-height: 48px;
  border-bottom: 1px solid var(--border-color);
  cursor: grab;
}

.inventory-row:hover {
  background: rgba(51, 255, 0, 0.1);
}
```

### 2단계: InventoryItem 컴포넌트 수정

- 기존 타일/카드 형태를 Row 형태로 변경
- 아이콘, 이름, 수량을 가로로 배치
- 툴팁은 hover 시 표시 (U-056 구현 유지)

```tsx
// frontend/src/components/InventoryItem.tsx
const InventoryItem: React.FC<{ item: Item }> = ({ item }) => {
  return (
    <div className="inventory-row" draggable>
      <img 
        src={item.icon || '/ui/icons/item-default.png'} 
        alt={item.name}
        className="inventory-row-icon"
      />
      <span className="inventory-row-name">{item.name}</span>
      {item.quantity > 1 && (
        <span className="inventory-row-quantity">x{item.quantity}</span>
      )}
    </div>
  );
};
```

### 3단계: DnD 호환성 확인 및 조정

- dnd-kit의 `useSortable` 또는 `useDraggable`이 Row 형태에서 정상 동작하는지 확인
- 드래그 핸들을 Row 전체 또는 아이콘 영역으로 지정
- 드래그 오버레이(ghost) 스타일을 Row 형태에 맞게 조정

```tsx
// dnd-kit 설정 조정
const { attributes, listeners, setNodeRef, transform } = useDraggable({
  id: item.id,
});
```

### 4단계: 스크롤 및 구분 UI

- U-077의 스크롤 컨테이너와 호환 확인
- Row 간 구분: 구분선(border-bottom) 또는 줄무늬(zebra striping)
- 스크롤 시 헤더(아이템 개수 표시) 고정

```css
/* 줄무늬 옵션 */
.inventory-row:nth-child(even) {
  background: rgba(51, 255, 0, 0.03);
}
```

### 5단계: 반응형 및 접근성

- 작은 화면에서도 Row가 잘리지 않도록 `min-width` 설정
- 이름이 길 경우 `text-overflow: ellipsis` 적용 (툴팁으로 전체 이름 확인)
- 키보드 포커스 및 Tab 순서 유지

### 6단계: i18n 키 확인

- 기존 `inventory.*` 키가 Row 형태에서도 호환되는지 확인
- 필요 시 추가 키: `inventory.item_count` 등

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-011[Mvp]](U-011[Mvp].md) - 인벤토리 패널 기본 구조, DnD 설정
- **계획서**: [U-077[Mvp]](U-077[Mvp].md) - 인벤토리 스크롤 및 아이템 관리 UX
- **결과물**: `frontend/src/components/InventoryPanel.tsx` - 현재 구현

**다음 작업에 전달할 것**:

- U-081(Quest/Rule 확장 시 Inventory 영역 보호): Row 형태의 min-height 기준
- CP-MVP-03: Row 형태 인벤토리로 10분 데모 루프 검증

## 주의사항

**기술적 고려사항**:

- (PRD 6.7) Inventory는 항상 보이는 고정 HUD로 유지 (Row 형태로 변경해도 동일)
- (RULE-002) 인벤토리 DnD는 핵심 인터랙션이므로 Row 전환 후 반드시 테스트
- Row 높이를 너무 크게 하면 한 화면에 보이는 아이템 수가 줄어듦 → 40~56px 권장
- 아이콘 크기와 이름 길이의 균형을 맞춰야 함

**잠재적 리스크**:

- 기존 그리드 UI에 익숙한 사용자가 혼란할 수 있음 → 변경 후 피드백 수집
- Row가 길어지면 드래그 시작점과 드롭 영역 인식이 어려울 수 있음 → 드래그 핸들 아이콘 고려
- CRT 테마의 구분선/줄무늬가 가독성을 해칠 수 있음 → 투명도/색상 조정

## 페어링 질문 (결정 필요)

- [x] **Q1**: Row 높이와 아이콘 크기?
  - ✅Option A: Row 48px, 아이콘 32px (컴팩트)
  - Option B: Row 56px, 아이콘 40px (여유로움)
  - Option C: 가변 높이 (아이템 설명 길이에 따라)

- [x] **Q2**: Row 간 구분 방식?
  - Option A: 구분선 (border-bottom 1px)
  - Option B: 줄무늬 (zebra striping)
  - ✅Option C: 구분선 + 줄무늬 조합
  - Option D: gap만 사용 (구분선 없음)

- [x] **Q3**: 아이템 확장/상세 정보 표시?
  - ✅Option A: Hover 툴팁만 (기존 U-056 유지)
  - Option B: 클릭 시 Row가 확장되어 상세 정보 표시
  - Option C: 별도 상세 패널(사이드) 표시

- [x] **Q4**: 드래그 핸들 위치?
  - Option A: Row 전체가 드래그 가능
  - ✅Option B: 아이콘 영역만 드래그 가능 - 아이콘만 드래그 이미
  - Option C: 별도 드래그 핸들 아이콘 추가 (⋮⋮)

## 참고 자료

- `vibe/unit-plans/U-011[Mvp].md` - 인벤토리 패널 기본
- `vibe/unit-plans/U-077[Mvp].md` - 인벤토리 스크롤 UX
- `vibe/unit-plans/U-056[Mvp].md` - 아이템 이름 툴팁
- `vibe/prd.md` 6.7절 - Inventory + DnD
- [dnd-kit Sortable Lists](https://docs.dndkit.com/presets/sortable)
