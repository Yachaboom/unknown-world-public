# U-117[Mvp]: 인벤토리 드래그 영역 Row 확장 + 스캐너 온보딩 팝업 제거 (U-118 흡수)

## 메타데이터

| 항목      | 내용                                       |
| --------- | ------------------------------------------ |
| Unit ID   | U-117[Mvp]                                 |
| Phase     | MVP                                        |
| 예상 소요 | 50분 (드래그 30분 + 온보딩 제거 20분)      |
| 의존성    | U-088[Mvp], U-074[Mvp]                     |
| 우선순위  | Medium (인벤토리 DnD 조작성 향상)          |

## 작업 목표

인벤토리 아이템의 **드래그 시작 영역을 Row 전체**로 확장하여 드래그 조작의 편의성을 높이고, **드래그 중 고스트(미리보기) 이미지는 아이콘만** 표시하여 시각적 깔끔함을 유지한다.

**배경**: U-088에서 인벤토리를 Row 형태로 전환하면서 드래그 핸들이 아이콘 영역으로 제한되었다(Q4에서 Option B 선택). 그러나 실제 사용 시 Row의 넓은 영역 어디서든 드래그를 시작할 수 있는 것이 더 자연스럽고, 특히 터치 환경에서 유리하다. 다만 드래그 중 표시되는 고스트 이미지가 Row 전체이면 화면을 과도하게 덮으므로, 고스트는 아이콘만으로 표시한다.

**완료 기준**:

- Row 영역 **전체**(아이콘 + 이름 + 태그 영역 포함)에서 드래그 시작 가능
- 드래그 중 **고스트(미리보기) 이미지는 아이템 아이콘만** 표시 (Row 전체가 아님)
- 고스트 아이콘 크기: 32~48px (기존 아이콘 크기와 동일)
- 드래그 중 원래 Row는 반투명(opacity) 처리
- DnD 드롭 타겟(핫스팟)에 대한 기존 동작 유지
- 키보드/접근성: Tab 포커스 및 드래그 가능 표시(cursor: grab) 유지

## 영향받는 파일

**수정**:

- `frontend/src/components/InventoryItem.tsx` - 드래그 핸들을 Row 전체로 확장, `useDraggable` 적용 범위 변경
- `frontend/src/components/InventoryPanel.tsx` - (있다면) DnD 설정에서 드래그 오버레이(ghost) 커스텀 렌더링
- `frontend/src/style.css` - 드래그 중 Row 반투명 스타일, 커서 스타일

**참조**:

- `vibe/unit-results/U-088[Mvp].md` - 인벤토리 Row 형태 전환 결과
- `vibe/unit-results/U-011[Mvp].md` - Inventory 패널 DnD 기본 구현
- `vibe/unit-results/U-012[Mvp].md` - DnD 드롭 이벤트 구현
- `vibe/prd.md` 6.7절 - Inventory DnD 정책

## 구현 흐름

### 1단계: 드래그 영역 Row 전체로 확장

- `InventoryItem.tsx`에서 `useDraggable`(또는 `useSortable`)의 `listeners`와 `setNodeRef`를 **Row 전체 요소**에 적용
- 기존: 아이콘 영역에만 `{...listeners}` → 변경: Row 전체 div에 `{...listeners}`

```tsx
// InventoryItem.tsx (변경 전)
<div className="inventory-row">
  <img {...listeners} ref={setNodeRef} src={item.icon} /> {/* 아이콘만 드래그 */}
  <span>{item.name}</span>
</div>

// InventoryItem.tsx (변경 후)
<div className="inventory-row" {...listeners} ref={setNodeRef}> {/* Row 전체 드래그 */}
  <img src={item.icon} />
  <span>{item.name}</span>
</div>
```

### 2단계: 드래그 오버레이(고스트) 커스텀 - 아이콘만

- dnd-kit의 `DragOverlay`에서 활성 드래그 아이템의 **아이콘만 렌더링**:

```tsx
// InventoryPanel.tsx (DragOverlay 부분)
<DragOverlay>
  {activeDragItem && (
    <div className="drag-ghost-icon">
      <img 
        src={activeDragItem.icon || '/ui/icons/item-default.png'} 
        alt={activeDragItem.name}
        width={40} height={40}
      />
    </div>
  )}
</DragOverlay>
```

### 3단계: 시각 피드백

- 드래그 중 원래 Row: `opacity: 0.4` + `border-style: dashed`
- 고스트 아이콘: 약간의 그림자(box-shadow) + 스케일(1.1x)
- 드롭 가능 영역(핫스팟) 위: 기존 하이라이트 유지

```css
/* style.css */
.inventory-row[data-dragging="true"] {
  opacity: 0.4;
  border-style: dashed;
}

.drag-ghost-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(51, 255, 0, 0.3);
  transform: scale(1.1);
}
```

### 4단계: 접근성 확인

- Row 전체에 `cursor: grab` (드래그 중: `cursor: grabbing`)
- `aria-grabbed` 속성 적용
- Tab 포커스 순서 유지

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-088[Mvp]](../unit-results/U-088[Mvp].md) - 인벤토리 Row 형태 레이아웃
- **결과물**: [U-011[Mvp]](../unit-results/U-011[Mvp].md) - Inventory DnD 기본 구현

**다음 작업에 전달할 것**:

- CP-MVP-03: "Row 전체 드래그 + 아이콘 고스트" 데모 시나리오 검증
- U-087: 입력 잠금 시 드래그 비활성화 통합 확인

## 주의사항

**기술적 고려사항**:

- (PRD 6.7) Inventory DnD는 핵심 인터랙션 → 드래그 영역 변경 후 반드시 Scene Canvas 핫스팟 드롭 테스트
- Row 전체가 드래그 가능하면 Row 내부의 다른 클릭 이벤트(툴팁 등)와 충돌할 수 있음 → 클릭과 드래그를 구분하는 dnd-kit의 `activationConstraint` 활용 (distance: 5px 이상 이동 시에만 드래그 시작)
- 기존 dnd-kit `DragOverlay`가 이미 사용 중인지 확인 후 커스텀 적용

**잠재적 리스크**:

- 클릭(툴팁)과 드래그가 같은 영역에서 발생하면 의도치 않은 드래그 시작 → `activationConstraint: { distance: 5 }` 로 방지
- 터치 환경에서 스크롤과 드래그가 충돌할 수 있음 → `activationConstraint: { delay: 200, tolerance: 5 }` 로 방지

## 페어링 질문 (결정 필요)

- [x] **Q1**: 드래그 시작 조건(activationConstraint)?
  - ✅ Option A: distance 5px (마우스 이동 후 시작)
  - Option B: delay 200ms + tolerance 5px (터치 우선)
  - Option C: 환경 감지하여 자동 선택

## 추가 작업: 스캐너 온보딩 팝업 제거 (구 U-118)

### 구현 흐름 (온보딩 제거)

1. `OnboardingGuide.tsx` 파일 삭제
2. `App.tsx`에서 `<OnboardingGuide />` 렌더링/import 제거
3. `uiStore.ts`에서 `showOnboarding`, `onboardingStep` 등 상태 제거
4. `translation.json`(ko/en)에서 `interaction.onboarding_*` 키 삭제 (hover 힌트 키는 유지)
5. `style.css`에서 `.onboarding-overlay`, `.guide-card` 등 스타일 제거
6. LocalStorage `onboarding_complete` 키 참조 코드 제거

**유지**: `InteractionHint.tsx` hover 힌트, 학습 힌트 시스템(첫 N회 노출 후 숨김)

## 참고 자료

- `vibe/unit-results/U-088[Mvp].md` - 인벤토리 Row 전환
- `vibe/unit-results/U-011[Mvp].md` - Inventory DnD 기본
- `vibe/unit-results/U-074[Mvp].md` - 인터랙션 안내 UX (온보딩 + 힌트)
- `vibe/unit-plans/U-118[Mvp].md` - 온보딩 제거 상세 (본 유닛에 흡수)
- [dnd-kit DragOverlay](https://docs.dndkit.com/api-documentation/draggable/drag-overlay) - 커스텀 고스트
- [dnd-kit Activation Constraints](https://docs.dndkit.com/api-documentation/sensors#activation-constraints) - 클릭/드래그 구분
