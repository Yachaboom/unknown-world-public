# CP-MVP-02: 체크포인트 - 클릭+드래그 데모 개발 완료 보고서

## 메타데이터

- **작업 ID**: CP-MVP-02
- **단계 번호**: MVP 체크포인트 2
- **작성 일시**: 2026-01-18 17:45
- **담당**: AI Agent

---

## 1. 작업 요약

데모 표면의 핵심 조작 2종(핫스팟 클릭, 인벤토리 드래그&드롭)과 Action Deck 클릭이 "게임처럼" 동작하는지 검증을 완료하고, 관련 UI 컴포넌트의 린트 및 안정성을 개선했습니다.

---

## 2. 작업 범위

- **Action Deck 클릭 검증**: 카드 클릭 시 턴 실행 및 스트리밍 중 인터랙션 차단 정책 확인
- **핫스팟 클릭 검증**: Scene Canvas 내 `0~1000` 정규화 좌표계 기반 핫스팟 클릭 및 턴 연동 확인
- **DnD 인터랙션 검증**: 인벤토리 아이템을 핫스팟에 드롭 시 즉시 피드백 및 턴 실행 연동 확인
- **코드 안정성 개선**: `App.tsx`, `SceneCanvas.tsx` 등 주요 컴포넌트의 린트 오류 수정 및 타입 안전성 강화
- **수동 검증 런북 작성**: 재현 가능한 테스트 시나리오(`CP-MVP-02-click-drag-demo-runbook.md`) 구축

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `vibe/unit-results/CP-MVP-02.md` | 신규 | 작업 완료 보고서 작성 |
| `vibe/unit-runbooks/CP-MVP-02-click-drag-demo-runbook.md` | 신규 | 수동 검증 런북 작성 |
| `frontend/src/App.tsx` | 수정 | 린트 수정 및 타입 가드 정제 |
| `frontend/src/components/SceneCanvas.tsx` | 수정 | 핫스팟 렌더링 로직 안정화 및 린트 수정 |
| `frontend/src/turn/turnRunner.ts` | 수정 | 턴 실행 로직 내 사용되지 않는 변수 제거 및 정제 |
| `vibe/unit-results/CP-MVP-02-drag-drop-test.png` | 신규 | 검증 증거 스크린샷 저장 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**인터랙션 레이어링**:
- `dnd-kit`의 `DndContext`를 최상위에 배치하여 인벤토리(Drag)와 SceneCanvas(Drop) 간의 통신 보장
- `pointer-events` 제어를 통해 스트리밍 중 클릭 가로채기 방지

**좌표 정규화**:
- `utils/box2d.ts`: `[ymin, xmin, ymax, xmax]` 순서의 0~1000 정규화 좌표계를 픽셀로 변환하는 SSOT 엔진 유지

### 4.2 외부 영향 분석

- **UI/UX**: 채팅 버블을 완전히 제거하고 고정 HUD 레이아웃을 통해 "게임" 정체성 확립
- **데이터 흐름**: 드롭 성공 시 `TurnInput(type='drop', object_id, item_id)` 구조가 서버로 정확히 전달됨

### 4.3 가정 및 제약사항

- **취소(Abort) 정책**: 현재 `cancel()` 기본 골격은 구현되어 있으나, Abort 시 UI 복구는 다음 유닛에서 고도화 예정
- **데모 데이터**: `demoFixtures.ts`를 통해 i18n이 적용된 목 데이터를 사용하여 검증 진행

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/CP-MVP-02-click-drag-demo-runbook.md`
- **실행 결과**: Action Deck 클릭, 핫스팟 클릭, DnD 드롭 시나리오 모두 PASS
- **참조**: 상세 실행 방법 및 체크리스트는 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **포트 충돌**: RULE-011에 따라 8001(Front), 8011(Back) 포트를 사용하며, 충돌 시 `pnpm kill` 권장
- **가독성**: CRT 효과로 인해 일부 텍스트 가독성이 떨어질 수 있으나, 중요 정보 영역은 `U-037` 정책에 의해 보호됨

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. `U-013`: Quest + Rule Board 패널 구현
2. `U-014`: Economy HUD 및 실시간 잔액 연동

### 7.2 의존 단계 확인

- **선행 단계**: RU-003, U-009, U-010, U-012 (모두 완료)
- **후속 단계**: 마일스톤 M3 진입

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
