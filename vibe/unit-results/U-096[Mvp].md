# [U-096[Mvp]] 아이템 사용 시 소비(삭제) 로직 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-096[Mvp]
- **단계 번호**: 4.10 (예상)
- **작성 일시**: 2026-02-07 22:30
- **담당**: AI Agent

---

## 1. 작업 요약

플레이어가 인벤토리 아이템을 핫스팟에 드래그 앤 드롭하여 사용할 때, 아이템의 성격(소모품 vs 도구)에 따라 인벤토리에서 자동으로 삭제되거나 수량이 감소하는 로직을 구현했습니다. 프론트엔드에서는 Magenta 테마의 fade-out 애니메이션을 통해 시각적 피드백을 제공합니다.

---

## 2. 작업 범위

- **GM 프롬프트 강화**: `turn_output_instructions`에 소모품(열쇠, 포션 등)과 도구(망치, 랜턴 등)의 구분 규칙 및 `inventory_removed` 반영 지침 추가.
- **백엔드 스키마 검증**: `WorldDelta` 모델의 `inventory_removed` 필드 연동 및 단위 테스트 완료.
- **프론트엔드 상태 관리**: `inventoryStore`에 `consumingItemIds` 상태와 애니메이션 제어용 액션(`markConsuming`, `clearConsuming`) 추가.
- **시각적 피드백 구현**: 아이템 소비 시 0.5초간의 `item-consume-fadeout` 애니메이션 및 i18n 메시지 적용.
- **비즈니스 로직 통합**: `worldStore`에서 턴 결과 수신 시 애니메이션과 실제 데이터 삭제를 동기화하는 파이프라인 구축.

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/prompts/turn/turn_output_instructions.ko.md` | 수정 | 아이템 소비 규칙(GM 지침) 추가 |
| `backend/prompts/turn/turn_output_instructions.en.md` | 수정 | 아이템 소비 규칙(영문) 추가 |
| `backend/tests/unit/test_u096_consumption.py` | 신규 | 백엔드 소비 로직 검증 테스트 |
| `frontend/src/stores/inventoryStore.ts` | 수정 | 소비 상태 및 수량 기반 삭제 로직 구현 |
| `frontend/src/stores/worldStore.ts` | 수정 | 턴 결과 반영 시 소비 애니메이션 트리거 |
| `frontend/src/components/InventoryPanel.tsx` | 수정 | 소비 중인 아이템의 시각적 상태 표시 |
| `frontend/src/style.css` | 수정 | `item-consume-fadeout` 애니메이션 정의 |
| `frontend/src/stores/inventory_consumption.test.ts` | 신규 | 프론트엔드 소비 파이프라인 통합 테스트 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | `item_consumed` 메시지 추가 |
| `frontend/src/locales/en-US/translation.json` | 수정 | `item_consumed` 메시지 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**GM 소비 판정 규칙**:
- **소모품**: 1회성 아이템(열쇠, 물약 등)은 사용 후 `inventory_removed`에 포함.
- **도구**: 재사용 가능 아이템(망치, 손전등 등)은 인벤토리에 유지.
- **수량 기반**: 스택형 아이템은 ID가 포함될 때마다 수량이 1씩 감소.

**프론트엔드 애니메이션 파이프라인**:
1. `worldStore.applyTurnOutput`에서 `inventory_removed` 감지.
2. `inventoryStore.markConsuming(ids)` 호출 -> 해당 아이템에 `.item-consumed` CSS 클래스 적용.
3. 500ms 대기 (CSS 트랜지션 시간).
4. `inventoryStore.clearConsuming(ids)` 호출 -> 실제 상태에서 삭제/수량 감소.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `SaveGame` 복원 시 소모된 아이템 상태가 영속적으로 반영됨.
- **권한/보안**: 영향 없음.
- **빌드/의존성**: 신규 의존성 없음.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-096-item-consumption-runbook.md`
- **실행 결과**: 런북의 시나리오 A(CSS), B(Zustand), C(Real GM)를 통해 기능 검증 완료.

---

## 6. 리스크 및 주의사항

- **애니메이션 지연**: 500ms의 지연 시간 동안 아이템이 인벤토리에 머물러 있으므로, 이 기간 동안 중복 조작을 방지하기 위해 `pointer-events: none` 처리를 적용함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-088**: 인벤토리 UI Row 형태 전환 (가독성 강화)
2. **CP-MVP-03**: 10분 데모 루프 통합 검증

### 7.2 의존 단계 확인

- **선행 단계**: U-012, U-011 완료 확인됨.
- **후속 단계**: U-088 (인벤토리 레이아웃 개선)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
