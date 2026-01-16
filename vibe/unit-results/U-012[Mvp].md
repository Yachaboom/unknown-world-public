# [U-012[Mvp]] DnD 드롭(아이템→핫스팟) TurnInput 이벤트 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-012[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-17 18:00
- **담당**: AI Agent

---

## 1. 작업 요약

인벤토리의 아이템을 씬 캔버스의 핫스팟 영역에 드롭했을 때 `TurnInput` 이벤트를 생성하고 턴 실행을 트리거하는 기능을 구현했습니다. `dnd-kit` 라이브러리를 고도화하여 핫스팟을 드롭 대상으로 지정하고, 드롭 시 아이템 정보와 대상 핫스팟 정보를 포함한 구조화된 데이터를 서버로 전송합니다.

---

## 2. 작업 범위

- **스키마 확장**: `TurnInput`에 `drop` 필드 추가 및 `DropInput` 스키마 정의 (Item ID, Target ID, Target Box2D 포함)
- **핫스팟 드롭 타겟화**: `SceneCanvas`의 `HotspotOverlay` 컴포넌트에 `useDroppable`을 적용하여 인벤토리 아이템의 드롭을 수용하도록 개선
- **이벤트 연동**: `App.tsx`의 `handleDragEnd` 로직을 확장하여 유효한 핫스팟 드롭 시 `executeTurn` 호출
- **시각적 피드백**: 아이템을 핫스팟 위로 드래그할 때의 마젠타색 하이라이트 및 펄스 애니메이션 추가
- **다국어 지원**: 드롭 액션에 대한 내러티브 텍스트(`Use {{item}} on {{target}}`) 및 실패 피드백 메시지 추가
- **검증**: DnD 인터랙션 로직을 검증하는 통합 테스트(`DndInteraction.test.tsx`) 작성

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/schemas/turn.ts` | 수정 | `DropInputSchema` 추가 및 `TurnInputSchema` 연동 |
| `frontend/src/components/SceneCanvas.tsx` | 수정 | `HotspotOverlay`에 `useDroppable` 통합 및 하이라이트 로직 추가 |
| `frontend/src/App.tsx` | 수정 | `handleDragEnd`에서 핫스팟 드롭 처리 및 `executeTurn` 연동 |
| `frontend/src/style.css` | 수정 | `.drop-target-active` 스타일 및 펄스 애니메이션 추가 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | 드롭 관련 한글 번역 키 추가 |
| `frontend/src/locales/en-US/translation.json` | 수정 | 드롭 관련 영문 번역 키 추가 |
| `frontend/src/components/DndInteraction.test.tsx` | 신규 | DnD 인터랙션 및 턴 실행 연동 통합 테스트 |
| `frontend/src/api/turnStream.test.ts` | 수정 | `TurnInput` 스키마 변경에 따른 모의 데이터 업데이트 |
| `vibe/unit-runbooks/U-012-dnd-drop-turn-input-runbook.md` | 신규 | 유닛 실행 및 검증을 위한 런북 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**데이터 계약 (TurnInput.drop)**:
- `item_id`: 드래그한 아이템의 고유 식별자
- `target_object_id`: 드롭 대상 핫스팟의 고유 식별자
- `target_box_2d`: 핫스팟의 0~1000 정규화 좌표 (서버 측 공간 이해를 위함)

**드롭 감지 및 처리**:
- `dnd-kit`의 `active`와 `over` 객체를 비교하여 `inventory-item` 타입이 `hotspot` 타입 위에서 멈췄는지 확인합니다.
- 유효한 드롭 시 `i18next`를 사용하여 "X을(를) Y에 사용" 형태의 자연어 텍스트를 자동 생성하여 함께 전송합니다.

### 4.2 외부 영향 분석

- **데이터 시스템**: 서버로 전송되는 JSON 페이로드에 `drop` 필드가 포함됩니다. 백엔드 오케스트레이터는 이 필드를 해석하여 아이템 상호작용 로직을 실행해야 합니다.
- **UI/UX**: 인벤토리 아이템을 드래그하는 동안 핫스팟이 시각적으로 반응하므로 "사용 가능성"을 직관적으로 인지할 수 있습니다.

### 4.3 가정 및 제약사항

- 핫스팟이 겹쳐 있는 경우 `dnd-kit`의 기본 알고리즘에 따라 마우스와 가장 가까운 핫스팟이 드롭 대상으로 선정됩니다.
- 스트리밍 중(`isStreaming=true`)에는 인터랙션 보호를 위해 드래그 기능이 비활성화됩니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-012-dnd-drop-turn-input-runbook.md`
- **실행 결과**: 드래그 시 하이라이트, 드롭 시 턴 실행 트리거, 유효하지 않은 영역 드롭 시 피드백 등 모든 시나리오 검증 완료

---

## 6. 리스크 및 주의사항

- **Z-Index**: 핫스팟 오버레이와 다른 UI 요소 간의 레이어링 문제로 드롭이 감지되지 않을 경우 `style.css`의 `hotspot-overlay` z-index를 확인해야 합니다.
- **좌표 일관성**: `target_box_2d`는 렌더링된 픽셀 값이 아닌 원본 0~1000 정규화 값을 전송해야 합니다. (구현 완료)

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **린트 및 타입 체크**: `pnpm -C frontend typecheck` 실행
2. **리팩토링**: `RU-003[Mvp]` UI 상태 슬라이스/경계 정리

### 7.2 의존 단계 확인

- **선행 단계**: U-010, U-011 완료 확인
- **후속 단계**: RU-003[Mvp], CP-MVP-02(체크포인트)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 0~1000 bbox 규약 준수 확인
- [x] i18n 언어 정책 준수 확인
- [x] 스트리밍 중 인터랙션 차단 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
