# RU-004[Mvp]: 리팩토링 - SaveGame/초기상태/데모 프로필 정리 개발 완료 보고서

## 메타데이터

- **작업 ID**: RU-004[Mvp]
- **단계 번호**: 2.3 (Refactor)
- **작성 일시**: 2026-01-24 16:20
- **담당**: AI Agent

---

## 1. 작업 요약

`U-015[Mvp]`에서 구현된 SaveGame, Reset, Demo Profiles 기능을 리팩토링하여 중복을 제거하고 세션 관리의 단일 진실 공급원(SSOT)을 구축함. 특히 부팅, 복원, 리셋의 경계를 명확히 하고 상수를 중앙화하여 데모 반복성과 유지보수성을 극대화함.

---

## 2. 작업 범위

- **상수 중앙화 (SSOT)**: `save/constants.ts`를 신설하여 버전, 스토리지 키, 시드 정책 등 하드코딩된 정책 상수를 통합.
- **세션 라이프사이클 모듈화**: `App.tsx`의 세션 관리 로직을 `sessionLifecycle.ts`로 이관하여 부팅, 프로필 선택, 복원, 리셋 로직을 캡슐화.
- **생성 경로 단일화**: `createSaveGame`을 유일한 생성 창구로 고정하고 `profileToSaveGameInput` 어댑터를 통해 스키마 드리프트 방지.
- **검증형 로딩 도입**: 단순 키 존재 확인이 아닌 스키마 검증 및 마이그레이션이 포함된 `getValidSaveGameOrNull` 적용.
- **원자적 리셋**: `resetAllSessionStores`를 통해 모든 관련 스토어(world, economy, actionDeck, agent 등)를 한 번에 초기화.

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/save/constants.ts` | 신규 | 세이브 버전, 키, 시드 정책 등 핵심 상수 중앙화 |
| `frontend/src/save/sessionLifecycle.ts` | 신규 | 부팅, 복원, 리셋 등 세션 라이프사이클 관리 통합 |
| `frontend/src/save/saveGame.ts` | 수정 | 생성 경로 단일화, 검증 로직 강화, 상수 연동 |
| `frontend/src/data/demoProfiles.ts` | 수정 | 프로필 데이터 구조 정제 및 중복 생성 로직 제거 |
| `frontend/src/App.tsx` | 수정 | 세션 관리 로직 위임을 통한 컴포넌트 복잡도 축소 |
| `frontend/src/stores/economyStore.ts` | 수정 | `hydrateLedger` 도입 및 상수 연동 |
| `frontend/src/stores/worldStore.ts` | 수정 | 초기 상태 주입 정책 반영 및 리셋 로직 정제 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**세션 라이프사이클 SSOT (`sessionLifecycle.ts`)**:
- `bootstrapSession()`: 앱 부팅 시 세이브 존재 여부 및 유효성 판단.
- `startSessionFromProfile(profileId)`: 선택한 프로필로 새 세이브 생성 및 시작.
- `continueSession()`: 기존 유효 세이브로부터 상태 복원.
- `resetCurrentSession()`: 현재 프로필의 초기 상태로 완전 리셋.

**데이터 흐름 최적화**:
- **Injection-first**: 스토어의 초기값은 최소한의 placeholder만 유지하고, 실제 데이터는 항상 `applySaveGame`을 통해 주입받는 구조로 통일.
- **Validation-First**: 로드 시점에 `Zod`를 통한 전수 검증을 수행하여 손상된 데이터로 인한 런타임 오류 차단.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `localStorage` 접근이 `sessionLifecycle`로 캡슐화되어 의존성이 단일화됨.
- **UI/UX**: 리셋이나 프로필 변경 시 HUD와 에이전트 콘솔의 잔재가 완벽히 클린업되어 "데모 반복성" 향상.
- **유지보수**: 필드 추가나 정책 변경 시 `constants.ts` 또는 `saveGame.ts` 한 곳만 수정하면 전체 시스템에 반영됨.

### 4.3 가정 및 제약사항

- 세이브 데이터의 버전 마이그레이션은 현재 `migrateSaveGame` 훅 구조만 준비되어 있으며, 향후 스키마 파괴적 변경 시 구체적인 변환 로직 추가가 필요함.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/refactors/RU-004-S3.md` (수동 검증 시나리오 패키지)
- **실행 결과**: 프로필 3종 초기 상태, autosave, 새로고침 복원, Reset 후 복구 등 7대 시나리오 전수 통과.
- **참조**: 상세 검증 절차는 위 리팩토링 시나리오 문서 참조.

---

## 6. 리스크 및 주의사항

- **스토어 추가 시 주의**: 새로운 도메인 스토어가 추가될 경우 `sessionLifecycle.ts`의 `resetAllSessionStores` 리스트에 반드시 포함해야 함.
- **언어 복원**: 언어 전환(`changeLanguage`)은 비동기 작업이므로 복원 파이프라인의 `await` 순서가 보장되어야 함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-016[Mvp]**: Vertex AI 서비스 계정 연동 및 실모델 API 클라이언트 구축.
2. **CP-MVP-04**: 실모델 적용 후 하드 게이트(스키마/경제/복구) 검증.

### 7.2 의존 단계 확인

- **선행 단계**: U-015[Mvp] 완료
- **후속 단계**: U-016[Mvp]

---

## 8. 자체 점검 결과

- [x] 세션 관리 로직의 SSOT 단일화 완료
- [x] 상수 중앙화를 통한 하드코딩 제거
- [x] 리셋/복원 시 스토어 정합성 유지 확인
- [x] RULE-006(언어 일관성) 및 RULE-010(DB 금지) 준수 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
