# RU-003[Mvp]: 리팩토링 - UI 상태 슬라이스/경계 정리 개발 완료 보고서

## 메타데이터

- **작업 ID**: RU-003[Mvp]
- **단계 번호**: 2.2 (M2 마일스톤)
- **작성 일시**: 2026-01-18 01:40
- **담당**: AI Agent

---

## 1. 작업 요약

액션덱, 핫스팟, 인벤토리 등 파편화되었던 UI 상태와 비즈니스 로직을 `worldStore` 및 `turnRunner` 모듈로 통합/분리하여 시스템 경계를 명확히 하고, 데이터 흐름의 SSOT(Single Source of Truth)를 확보함.

---

## 2. 작업 범위

- **상태 관리 통합**: `worldStore` 도입을 통한 월드 델타 반영 로직 SSOT화 및 `App.tsx` 로컬 상태 축소
- **모듈 분리**: 턴 실행 및 스트리밍 결합 로직을 `turnRunner.ts`로 캡슐화
- **DnD 정제**: DnD 데이터 구조 상수화 및 타입 가드(`isInventoryDragData`, `isHotspotDropData`) 도입
- **에셋 및 데이터 격리**: 데모 픽스처 분리 및 i18n 기반 렌더링 강제로 ko/en 혼합 출력 방지
- **엣지 케이스 처리**: 핫스팟 겹침 우선순위 정책(Area-based) 및 리사이즈 안정화(Debounce) 적용
- **검증 체계 구축**: 9가지 핵심 시나리오 기반 수동 검증 가이드(`RU-003-S3`) 수립

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/stores/worldStore.ts` | 신규 | 월드 상태 및 TurnOutput 반영 로직 전담 스토어 |
| `frontend/src/turn/turnRunner.ts` | 신규 | 턴 실행/스트리밍 오케스트레이션 캡슐화 |
| `frontend/src/dnd/types.ts` | 신규 | DnD 데이터 계약 및 상수 SSOT |
| `frontend/src/demo/demoFixtures.ts` | 신규 | 개발/데모용 목 데이터 격리 |
| `frontend/src/App.tsx` | 수정 | 레이아웃 및 이벤트 라우팅 역할로 축소 |
| `frontend/src/components/SceneCanvas.tsx` | 수정 | 핫스팟 우선순위 및 리사이즈 안정화 로직 통합 |
| `frontend/src/locales/*` | 수정 | 데모 데이터용 i18n 키 추가 |
| `vibe/refactors/RU-003-S3.md` | 신규 | 수동 검증 시나리오 명세 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약 및 인터페이스**:
- `worldStore.applyTurnOutput(output)`: 모든 턴 결과 반영의 단일 진입점
- `useTurnRunner()`: 스트리밍 라이프사이클과 스토어 연동을 관리하는 Hook
- `DND_TYPE`: `'inventory-item'`, `'hotspot'` 상수를 통한 타입 안전한 DnD 실현

**설계 패턴/원칙**:
- **Domain Slice**: Zustand 스토어를 `agent`, `world`, `inventory`, `actionDeck`으로 분리 (Option A)
- **Schema-driven Transition**: `ui.scene.image_url` 존재 여부에 따른 명시적 씬 상태 전이

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `TurnOutput` 스키마에 `ui.scene.image_url` 필드 추가 반영
- **UI/UX**: 스트리밍 중 모든 상호작용 차단 정책 강제, 겹치는 핫스팟 중 작은 대상 우선 선택

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/refactors/RU-003-S3.md` (수동 검증 시나리오 포함)
- **실행 결과**: 정의된 9가지 핵심 시나리오(카드, 클릭, 드롭, 스트리밍 등)에 대한 자가 검증 완료

---

## 6. 리스크 및 주의사항

- **하드코딩 주의**: 향후 기능 추가 시 `demoFixtures.ts`나 i18n을 거치지 않은 로컬 목 데이터 삽입 금지
- **상태 동기화**: `agentStore.isStreaming` 상태가 인터랙션 차단의 핵심 지표이므로 전파 누락 주의

---

## 7. 다음 단계 안내

### 7.1 후속 작업
1. `CP-MVP-02` 체크포인트 검증 (클릭+드래그 데모)

### 7.2 의존 단계 확인
- **선행 단계**: U-012 (드롭→턴 연동)
- **후속 단계**: U-013 (Quest/Rule Board 패널 구현)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
