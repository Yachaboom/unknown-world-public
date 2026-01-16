# U-011[Mvp]: Inventory 패널(DnD) 기본

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-011[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-004       |
| 우선순위  | ⚡ Critical |

## 작업 목표

Inventory 패널을 구현하고, 아이템을 **드래그 가능한 엔티티**로 만들어 “DnD 조작”이 데모 표면에서 즉시 보이게 한다.

**배경**: PRD는 Inventory(DnD) + 아이템을 장면 오브젝트로 드래그해 사용하는 경험을 “데모 표면 핵심”으로 요구한다. (PRD 6.7, RULE-002)

**완료 기준**:

- Inventory 패널이 상시 노출되고, 아이템 리스트가 렌더된다.
- dnd-kit 기반으로 아이템이 드래그 가능하며, 드래그 중 시각적 피드백(overlay/hover)이 있다. (tech-stack)
- 드래그만으로는 “실행”되지 않으며, 실제 드롭→행동 실행은 U-012에서 연결한다.

## 영향받는 파일

**생성**:

- `frontend/src/components/InventoryPanel.tsx` - 인벤토리 UI + draggable 아이템 렌더
- `frontend/src/stores/inventoryStore.ts` - 인벤토리 상태(Zustand) 및 선택/드래그 상태(선택)

**수정**:

- `frontend/src/App.tsx` - Inventory 패널 배치(고정 사이드 패널)
- `frontend/src/style.css` - 슬롯/칩/드래그 상태 스타일

**참조**:

- `vibe/tech-stack.md` - dnd-kit 버전/사용
- `.cursor/rules/10-frontend-game-ui.mdc` - DnD 핵심 인터랙션
- `vibe/prd.md` 6.7 - Inventory DnD 요구

## 구현 흐름

### 1단계: 인벤토리 데이터 모델 연결

- TurnOutput의 inventory 구조를 기준으로 “아이템 최소 표기(이름/아이콘/설명/수량)”를 정한다.
- 상태는 WorldState에 붙여 저장하되, UI/드래그 상태는 분리한다(RU-003에서 정리).

### 2단계: dnd-kit로 draggable 구현

- 아이템을 draggable로 만들고, 드래그 오버레이/커서 피드백을 제공한다.
- 키보드 접근성/모바일 대응은 MMP에서 고도화하되, MVP에서도 최소한의 피드백은 제공한다.

### 3단계: “드롭 타겟” 확장 준비

- U-012에서 핫스팟(오브젝트)이 droppable이 될 것을 고려해, drag 데이터에 `item_id` 등을 실어둘 수 있게 한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - Inventory 패널 슬롯/레이아웃
- **계획서**: [U-006[Mvp]](U-006[Mvp].md) - 스키마(Inventory 필드 정합)

**다음 작업에 전달할 것**:

- U-012에서 아이템→핫스팟 드롭(사용/조합) 실행을 연결할 draggable 기반
- CP-MVP-02에서 “드래그 동작”을 눈에 보이게 만드는 데모 표면 증거

## 주의사항

**기술적 고려사항**:

- (RULE-002) Inventory는 “게임 UI”로 상시 노출되어야 하며, 채팅 입력으로 대체하면 안 된다.
- dnd-kit 사용 시, 스타일/오버레이가 핫스팟 클릭을 방해하지 않게 레이어링을 조절한다.

**잠재적 리스크**:

- 드래그만 보이고 “드롭 결과”가 없으면 데모 설득력이 약함 → U-012를 크리티컬 패스로 붙여 즉시 드롭 실행까지 연결한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: DnD 컨텍스트(DndContext)는 어디에 둘까?
  - Option A: App 최상단(권장: 여러 패널/드롭 타겟 확장 용이)
  - Option B: InventoryPanel 내부(단순하지만 SceneCanvas 드롭 연동이 어려워질 수 있음)
  **A1**: Option A

## 참고 자료

- `vibe/prd.md` - Inventory DnD 데모 요구
- `vibe/tech-stack.md` - dnd-kit 버전
- `.cursor/rules/10-frontend-game-ui.mdc` - DnD UX 규칙
