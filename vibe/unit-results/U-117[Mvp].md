# [U-117[Mvp]] 인벤토리 드래그 영역 Row 확장 + 스캐너 온보딩 팝업 제거 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-117[Mvp]
- **단계 번호**: 4.1
- **작성 일시**: 2026-02-08 17:15
- **담당**: AI Agent

---

## 1. 작업 요약

인벤토리 아이템의 조작성 향상을 위해 드래그 시작 영역을 Row 전체(아이콘+이름+수량)로 확장하고, 드래그 중 시각적 가독성을 위해 고스트(미리보기) 이미지를 아이콘만 표시하도록 개선했습니다. 또한, 불필요한 온보딩 가이드 팝업을 제거하여 게임 UI의 몰입감을 높였습니다.

---

## 2. 작업 범위

- **인벤토리 DnD 영역 확장**: 아이콘 영역에 국한되었던 드래그 핸들을 Row 전체 div로 확대 적용.
- **고스트 이미지 커스텀**: `DragOverlay`를 사용하여 드래그 중에는 아이템의 아이콘(40x40px)만 마우스 커서를 따라다니도록 구현.
- **클릭/드래그 간섭 방지**: `activationConstraint` (distance: 5px)를 도입하여 단순 클릭(선택)과 드래그 조작을 명확히 구분.
- **온보딩 시스템 경량화**: `OnboardingGuide` 컴포넌트 및 관련 스타일/상태를 삭제하고, `InteractionHint` 기반의 hover 힌트 시스템만 유지.
- **U-118 흡수 통합**: 온보딩 제거 작업을 본 유닛에 통합 수행.

---

## 3. 생성/수정 파일

_(커밋 e7fed3a 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/components/InventoryPanel.tsx` | 수정 | Row 전체 드래그 핸들 적용 및 `DragOverlay` 커스텀 |
| `frontend/src/App.tsx` | 수정 | DnD `PointerSensor` 제약 조건(5px) 추가 및 온보딩 컴포넌트 제거 |
| `frontend/src/stores/onboardingStore.ts` | 수정 | 온보딩 팝업 상태 제거 및 힌트 카운트 로직만 유지 |
| `frontend/src/style.css` | 수정 | 드래그 중 Row 반투명(0.4) 및 dashed 보더 피드백 스타일 추가 |
| `frontend/src/components/OnboardingGuide.tsx` | 삭제 | 불필요한 온보딩 팝업 컴포넌트 제거 |
| `frontend/src/styles/onboarding-guide.css` | 삭제 | 온보딩 전용 CSS 제거 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**DnD 핸들 확장 (InventoryPanel.tsx)**:
- 기존: `img` 태그에만 `{...listeners}` 적용.
- 변경: 아이템 행 전체를 감싸는 `.inventory-item` div에 `{...listeners}` 및 `{...attributes}` 주입.

**커스텀 드래그 오버레이**:
- `activeItem` 상태를 기반으로 `DragOverlay` 내부에 `InventoryItem`을 고스트 모드(icon-only)로 렌더링.
- 스타일: `width: 40px`, `height: 40px`, 마젠타 글로우 효과 적용.

**클릭/드래그 구분 (App.tsx)**:
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5, // 5px 이상 이동 시에만 드래그로 판정
    },
  })
);
```

### 4.2 외부 영향 분석

- **UI/UX**: 인벤토리 아이템을 집어 올리는 동작이 훨씬 관대해졌으며, 화면을 가리던 거대한 온보딩 팝업이 사라져 시야가 확보됨.
- **성능**: 불필요한 컴포넌트 및 CSS 제거로 프론트엔드 번들 크기 미세 감소 및 렌더링 부하 경감.
- **데이터**: `localStorage`에서 온보딩 진행 단계 상태를 더 이상 저장하지 않음.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-117-inventory-drag-row-extension-runbook.md`
- **실행 결과**: 런북의 7가지 시나리오(Row 드래그, 아이콘 고스트, 클릭 구분, 온보딩 제거 등) 전수 검증 완료.
- **참조**: 상세 실행 방법 및 성공/실패 기준은 위 런북 파일 참조.

---

## 6. 리스크 및 주의사항

- **조작 감도**: 마우스/터치 환경에 따라 5px 제약이 너무 빡빡하거나 헐거울 수 있음. 현재는 마우스 기준 최적화됨.
- **기능 발견성**: 온보딩 팝업이 사라짐에 따라, 스캐너 드롭존 등의 기능을 처음 접하는 사용자를 위한 hover 힌트(`InteractionHint`)의 가시성이 더욱 중요해짐.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **CP-MVP-03**: 10분 데모 루프 통합 검증 (인벤토리 DnD 개선 사항 포함)
2. **U-087**: 입력 잠금 시 드래그 비활성화 상태 확인

### 7.2 의존 단계 확인

- **선행 단계**: U-088[Mvp], U-011[Mvp] (완료)
- **후속 단계**: 통합 데모 및 성능 최적화

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항(Row 드래그, 고스트 커스텀, 온보딩 제거) 충족 확인
- [x] 5px 이동 제약으로 클릭-드래그 충돌 방지 확인
- [x] 드래그 중 원래 Row 시각적 피드백(반투명/점선) 적용 확인
- [x] 아키텍처/네이밍/경로 일관성 유지

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
