# U-096[Mvp]: 아이템 사용 시 소비(삭제) 로직

## 메타데이터

| 항목      | 내용                                            |
| --------- | ----------------------------------------------- |
| Unit ID   | U-096[Mvp]                                      |
| Phase     | MVP                                             |
| 예상 소요 | 45분                                            |
| 의존성    | U-012[Mvp], U-011[Mvp]                          |
| 우선순위  | High (게임 경제/인벤토리 일관성)                |
| **상태**  | **✅ 완료** (2026-02-07)                        |
| 결과물    | [U-096[Mvp] 결과](../unit-results/U-096[Mvp].md) |
| 런북      | [U-096 런북](../unit-runbooks/U-096-item-consumption-runbook.md) |

## 작업 목표

아이템을 핫스팟에 **드래그&드롭하여 사용하면 인벤토리에서 해당 아이템이 소비(삭제)** 되도록 수정한다. 현재는 아이템 사용 후에도 인벤토리에 그대로 남아있어 무한 사용이 가능한 상태이다.

**배경**: 아이템을 핫스팟에 드래그하여 사용(예: 열쇠 → 자물쇠)하면 해당 아이템은 "소비"되어야 게임 경제와 인벤토리 관리의 의미가 생긴다. 현재는 사용 후에도 인벤토리에 남아 있어 무한 반복 사용이 가능하고, 이는 게임 메커닉을 무력화한다.

**완료 기준**:

- 아이템을 핫스팟에 드래그&드롭하여 사용한 후, 해당 아이템이 인벤토리에서 **제거됨**
- GM(서버)의 TurnOutput에 `consumed_items[]` (또는 기존 `world.delta`에 인벤토리 변경) 정보 포함
- 프론트엔드에서 아이템 소비 시 **fade-out 애니메이션** 후 인벤토리에서 제거
- 아이템 소비 결과가 내러티브에 반영 (예: "열쇠를 사용하여 문을 열었습니다. 열쇠가 부서졌습니다.")
- 소비 불가 아이템(재사용 가능)은 인벤토리에 유지 (GM이 판단)

## 영향받는 파일

**수정**:

- `backend/prompts/turn/turn_output_instructions.ko.md` - "사용된 아이템은 consumed_items에 포함" 규칙 추가
- `backend/prompts/turn/turn_output_instructions.en.md` - 동일 (영문)
- `backend/src/unknown_world/models/turn.py` - (선택) TurnOutput에 `consumed_items` 필드 추가 또는 기존 `world.delta.inventory_changes` 활용
- `frontend/src/stores/worldStore.ts` - 아이템 소비 시 인벤토리에서 제거 로직
- `frontend/src/components/InventoryPanel.tsx` - 소비 아이템 fade-out 애니메이션
- `frontend/src/style.css` - `.item-consumed` fade-out 스타일

**참조**:

- `vibe/unit-results/U-012[Mvp].md` - DnD 드롭 이벤트 구현
- `vibe/unit-results/U-011[Mvp].md` - Inventory 패널 구현
- `vibe/prd.md` - 6.7(인벤토리 DnD), 5(재화 시스템)

## 구현 흐름

### 1단계: GM 프롬프트 수정

- `turn_output_instructions.*.md`에 아이템 소비 규칙 추가:
  - "아이템을 핫스팟에 사용하여 효과가 발생하면, 해당 아이템을 `world.delta.removed_items`에 포함하라"
  - "일회용 아이템(열쇠, 물약 등)은 사용 후 소비, 도구(망치, 횃불 등)는 유지 가능"
  - "소비 여부는 아이템의 성격과 사용 맥락에 따라 GM이 판단"

### 2단계: TurnOutput 스키마 확인/확장

- 기존 `world.delta`에 `removed_items: list[str]` (아이템 ID 목록) 필드가 있는지 확인
- 없다면 추가 (Pydantic 모델 수정)
- Zod 스키마에도 동기화

### 3단계: 프론트엔드 소비 로직

- `worldStore.ts`에서 턴 결과 처리 시:
  - `removed_items`에 포함된 아이템 ID를 인벤토리에서 제거
  - 제거 전 `item-consumed` 클래스 추가 → fade-out 애니메이션(0.5s) → DOM에서 제거
- InventoryPanel에서 소비 애니메이션 구현

### 4단계: 내러티브 반영

- GM이 자연스럽게 "~를 사용했습니다. ~가 사라졌습니다" 형태로 내러티브 생성
- 프론트에서 별도 시스템 메시지 불필요 (내러티브에 포함)

### 5단계: 검증

- 일회용 아이템 사용 → 인벤토리에서 제거 확인
- 재사용 가능 아이템 사용 → 인벤토리에 유지 확인
- 소비 후 동일 아이템을 다시 사용 시도 → 인벤토리에 없으므로 불가

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-012[Mvp]](../unit-results/U-012[Mvp].md) - DnD 드롭 → TurnInput 이벤트
- **결과물**: [U-011[Mvp]](../unit-results/U-011[Mvp].md) - Inventory 패널 기본

**다음 작업에 전달할 것**:

- U-079: 아이템 소비와 재화 획득 루프 연결 (아이템 사용 보상)
- CP-MVP-03: "아이템 사용 → 소비 → 결과 반영" 데모 시나리오

## 주의사항

**기술적 고려사항**:

- GM이 `removed_items`를 빠뜨릴 수 있음 → 서버 검증에서 "사용 이벤트가 있는데 removed_items가 비어있으면" 경고/기본 소비 처리
- 아이템 ID가 프론트/백 간 정합해야 함 (동일 키 사용)
- SaveGame에 인벤토리 변경이 반영되어야 함 (기존 SaveGame 로직에서 자동 처리 여부 확인)

**잠재적 리스크**:

- GM이 "소비 불가" 아이템을 소비로 처리하거나 그 반대 → 프롬프트 명확화 + MMP에서 아이템 속성 관리
- 인벤토리 상태와 서버 상태 불일치 → 턴 결과의 `removed_items`를 SSOT로 사용

## 페어링 질문 (결정 필요)

- [x] **Q1**: 소비 판단 주체?
  - Option A: GM(모델)이 아이템 성격에 따라 자유 판단
  - Option B: 아이템 데이터에 `consumable: boolean` 속성 추가 (확정적)
  - ✅ Option C: Option A + 서버에서 기본 정책(드래그 사용 시 기본 소비) 적용

- [x] **Q2**: 소비 방식?
  - ✅ Option A: TurnOutput에 `removed_items: list[str]` 추가
  - Option B: 기존 `world.delta.inventory_changes`에 `{action: "remove", item_id: "xxx"}` 포함
  - Option C: TurnOutput의 `inventory[]`를 전체 교체 (서버가 최종 인벤토리 반환)

## 참고 자료

- `vibe/unit-results/U-012[Mvp].md` - DnD 드롭 이벤트
- `vibe/unit-results/U-011[Mvp].md` - Inventory 패널
- `vibe/prd.md` - 6.7(인벤토리 DnD), 5(재화 시스템)
- `vibe/tech-stack.md` - Pydantic/Zod 스키마
