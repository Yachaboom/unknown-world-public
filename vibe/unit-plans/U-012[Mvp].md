# U-012[Mvp]: DnD 드롭(아이템→핫스팟) TurnInput 이벤트

## 메타데이터

| 항목      | 내용              |
| --------- | ----------------- |
| Unit ID   | U-012[Mvp]        |
| Phase     | MVP               |
| 예상 소요 | 75분              |
| 의존성    | U-010,U-011,U-008 |
| 우선순위  | ⚡ Critical       |

## 작업 목표

인벤토리 아이템을 Scene Canvas의 핫스팟(오브젝트)로 **드롭**하면, TurnInput(drag/drop)으로 변환되어 턴 실행이 일어나도록 연결한다.

**배경**: PRD의 데모 표면 핵심은 “드래그해서 사용/조합”이 실제로 동작하는 것을 보여주는 것이다. (PRD 6.7, RULE-002)

**완료 기준**:

- 아이템을 핫스팟 위로 드래그하면 대상이 하이라이트되고, 드롭 시 턴 실행이 발생한다.
- 드롭 실패(대상 없음/불가) 시 즉시 이유가 UI로 피드백된다(무반응 금지).
- 서버로 보내는 데이터는 id 중심이며, bbox 규약을 깨지 않는다(정규화 유지). (RULE-009)

## 영향받는 파일

**생성**:

- (선택) `frontend/src/components/dnd/DndLayer.tsx` - DnD 컨텍스트/오버레이 분리

**수정**:

- `frontend/src/components/SceneCanvas.tsx` - droppable 핫스팟/하이라이트/드롭 처리
- `frontend/src/components/InventoryPanel.tsx` - draggable 데이터(item_id 등) 포함
- `frontend/src/App.tsx` - 드롭 결과를 TurnInput으로 만들어 turn 실행
- `frontend/src/style.css` - 드롭 가능/불가 상태 시각화

**참조**:

- `.cursor/rules/10-frontend-game-ui.mdc` - DnD/핫스팟 핵심 규칙
- `.cursor/rules/00-core-critical.mdc` - RULE-002/005/009
- `vibe/prd.md` 6.7 - 드래그&드롭 데모 요구

## 구현 흐름

### 1단계: 드롭 계약(아이템/대상/의도) 정의

- TurnInput에 “드롭 액션”을 표현하는 최소 필드를 정의한다:
  - `item_id`
  - `target_object_id`
  - (선택) `target_box_2d`
- 서버가 해석할 수 있는 수준으로만 보내고, 좌표 규약을 위반하지 않는다. (RULE-009)

### 2단계: SceneCanvas를 droppable로 확장

- 핫스팟 overlay를 droppable 대상으로 만든다.
- hover 시 하이라이트/툴팁을 보여주고, 드롭 성공/실패를 즉시 시각화한다.

### 3단계: 드롭 → 턴 실행 연결

- 드롭 성공 시 TurnInput을 구성해 `/api/turn`을 호출한다(U-008).
- 결과는 로그 피드/패널 변화로 반영되며, 채팅 버블로 대체하지 않는다. (RULE-002)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-010[Mvp]](U-010[Mvp].md) - Hotspot overlay/click
- **계획서**: [U-011[Mvp]](U-011[Mvp].md) - Inventory draggable
- **계획서**: [U-008[Mvp]](U-008[Mvp].md) - turn 실행/스트리밍 표시

**다음 작업에 전달할 것**:

- RU-003에서 정리할 “상호작용 이벤트 → TurnInput” 표준
- CP-MVP-02에서 검증할 “드래그→드롭→결과 반영” 데모 시나리오

## 주의사항

**기술적 고려사항**:

- (RULE-005) 비용/대안 UX: 드롭 액션도 예산 부족 시 대안(텍스트-only 등)이 제공될 수 있어야 한다(표시는 U-014에서 강화).
- (RULE-009) 저장/전송은 정규화 bbox만, 렌더만 px 변환.

**잠재적 리스크**:

- 드롭 UX가 “불안정/무반응”이면 데모에서 즉시 신뢰를 잃음 → 성공/실패 피드백을 반드시 즉시 제공한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: 드롭 이벤트에 좌표 정보를 포함할까?
  - Option A: `item_id + target_object_id`만(권장: 단순/일관)
  - Option B: `target_box_2d`도 포함(서버에서 “정확히 어디에 드롭했는지” 해석 가능)
  **A1**: Option B

## 참고 자료

- `vibe/prd.md` - 드래그&드롭 데모 요구
- `.cursor/rules/10-frontend-game-ui.mdc` - DnD/핫스팟 규칙
- `.cursor/rules/00-core-critical.mdc` - RULE-002/009
