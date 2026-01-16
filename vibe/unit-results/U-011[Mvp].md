# U-011[Mvp]: Inventory 패널(DnD) 기본 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-011[Mvp]
- **단계 번호**: 2.2
- **작성 일시**: 2026-01-17 17:30
- **담당**: AI Agent

---

## 1. 작업 요약

Inventory 패널을 구현하고 `dnd-kit` 라이브러리를 도입하여 아이템을 드래그 가능한 엔티티로 만들었습니다. 이를 통해 사용자가 아이템을 조작하는 시각적 경험을 제공하며, 향후 핫스팟 드롭 액션(U-012)을 위한 기반을 마련했습니다.

---

## 2. 작업 범위

- [x] **Inventory UI 구현**: 그리드 레이아웃 기반의 인벤토리 패널 및 아이템 칩 디자인 적용
- [x] **DnD 시스템 도입**: `@dnd-kit`을 사용하여 아이템 드래그 기능 구현 (DndContext 최상단 배치)
- [x] **상태 관리 연동**: `inventoryStore`를 신규 생성하여 아이템 목록 및 드래그/선택 상태 관리
- [x] **서버 데이터 매핑**: TurnOutput의 `inventory_added/removed` 필드를 스토어 액션과 연동
- [x] **다국어 및 스타일**: 인벤토리 관련 i18n 키 추가 및 CRT 테마에 어울리는 드래그 오버레이 스타일 적용

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/components/InventoryPanel.tsx` | 신규 | 인벤토리 UI 및 Draggable 아이템 컴포넌트 |
| `frontend/src/components/InventoryPanel.test.tsx` | 신규 | 인벤토리 컴포넌트 렌더링 및 선택 로직 테스트 |
| `frontend/src/stores/inventoryStore.ts` | 신규 | 인벤토리 아이템 및 DnD 상태 관리 (Zustand) |
| `frontend/src/stores/inventoryStore.test.ts` | 신규 | 스토어 액션(추가/삭제/드래그) 유닛 테스트 |
| `frontend/src/App.tsx` | 수정 | DndContext 배치 및 인벤토리 패널 통합 |
| `frontend/src/style.css` | 수정 | 인벤토리 그리드 및 드래그/오버레이 스타일 추가 |
| `frontend/package.json` | 수정 | `dnd-kit` 관련 의존성 추가 |
| `frontend/src/locales/*/translation.json` | 수정 | 인벤토리 관련 다국어 리소스 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:
- `InventoryItem`: `{ id, name, description, icon, quantity, type, metadata }`
- `useInventoryStore`: 인벤토리 상태와 `addItems`, `removeItems`, `startDrag`, `endDrag` 액션 제공
- `parseInventoryAdded(ids: string[])`: 문자열 ID 배열을 기본 아이템 객체 배열로 변환하는 유틸리티

**설계 패턴/원칙**:
- **Option A (App 최상단 DndContext)**: 여러 패널 간의 드롭 연동을 위해 `DndContext`를 `App` 수준에서 관리
- **Drag Overlay**: 드래그 중인 아이템을 별도의 레이어(`DragOverlay`)에서 렌더링하여 레이아웃 간섭 방지 및 시각적 품질 향상

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `inventoryStore` 상태가 `localStorage`에 영구 저장되지는 않으나, 턴 결과에 따라 실시간 갱신됨
- **빌드/의존성**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 추가됨

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-011-inventory-dnd-runbook.md` (자동 생성 권장)
- **실행 결과**: 컴포넌트 렌더링 및 드래그 시작/종료 이벤트 정상 작동 확인
- **참조**: 실제 드롭 후 턴 실행은 U-012에서 검증 예정

---

## 6. 리스크 및 주의사항

- **Z-Index 레이어링**: CRT 오버레이 및 핫스팟 레이어와 드래그 오버레이 간의 클릭 간섭 여부 지속 관찰 필요
- **모바일 대응**: 현재 마우스 기반 드래그 위주로 구현되어 있으며, 향후 터치 센서 추가 고려 필요

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. `vibe/unit-runbooks/U-011-inventory-dnd-runbook.md` 작성 및 실행 검증
2. **U-012[Mvp]**: 드롭 이벤트를 핫스팟과 연결하여 실제 턴 실행 트리거 구현

### 7.2 의존 단계 확인

- **선행 단계**: U-010 (Hotspot Overlay) 완료
- **후속 단계**: U-012 (DnD 드롭 실행)

---

## 8. 자체 점검 결과

- [x] Inventory 패널 상시 노출 확인 (RULE-002)
- [x] dnd-kit 기반 아이템 드래그 및 오버레이 확인
- [x] TurnOutput 데이터 연동 규약 준수 (U-006)
- [x] 0~1000 bbox 규약에 따른 핫스팟 연동 준비 완료

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
