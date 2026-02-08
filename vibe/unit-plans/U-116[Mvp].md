# U-116[Mvp]: SaveGame 제거 + 프로필 초기 상태 정리 (U-098 흡수)

## 메타데이터

| 항목      | 내용                                                  |
| --------- | ----------------------------------------------------- |
| Unit ID   | U-116[Mvp]                                            |
| Phase     | MVP                                                   |
| 예상 소요 | 60분                                                  |
| 의존성    | None (기존 완료 유닛 기반 제거 작업)                  |
| 우선순위  | ⚡ Critical (상태 불일치 원천 차단)                   |

## 작업 목표

MVP에서 **SaveGame(진행상황 저장/로드) 시스템을 완전히 제거**한다. LocalStorage 기반 SaveGame이 스키마 변경·버전 불일치·상태 잔재로 인한 오류를 빈번하게 유발하고 있으며, 이를 유지·보수하는 비용이 데모 안정성 대비 높다. 새로고침 시 항상 **프로필 선택 화면으로 복귀**하는 단순하고 안정적인 흐름으로 전환한다.

**배경**: 현재 SaveGame 시스템(U-015, U-041, RU-004)은 WorldState/Inventory/Economy/Language를 LocalStorage에 직렬화하여 저장하고, 새로고침 시 복원한다. 그러나 (1) 스키마 변경이 잦아 마이그레이션이 빈번하고, (2) 복원 시 sceneState(이미지 URL 등) 정합이 깨지며, (3) 저장된 핫스팟/액션카드가 새 정책(정밀분석 전용 등)과 충돌하는 등, SaveGame이 원인인 오류가 반복되고 있다. MVP 데모 루프의 안정성을 위해 완전 제거하고, MMP에서 재설계를 검토한다.

**완료 기준**:

- `frontend/src/save/saveGame.ts`의 저장/로드/검증 로직이 **제거 또는 비활성화**됨
- `frontend/src/save/migrations.ts`의 마이그레이션 체인이 **제거**됨
- `sessionLifecycle.ts`에서 SaveGame 관련 경로(`getValidSaveGameOrNull`, `continueSession` 등)가 **제거/단순화**됨
- `App.tsx`의 부팅 흐름(`bootstrapSession`)이 항상 **프로필 선택 화면(`profile_select`)**으로 시작
- LocalStorage에 SaveGame 데이터를 쓰지 않음 (기존 데이터도 부팅 시 제거)
- Reset 버튼은 단순히 **모든 store 초기화 + 프로필 선택 복귀**로 동작
- 데모 프로필 시작 시 항상 깨끗한 초기 상태에서 시작

## 영향받는 파일

**삭제**:

- `frontend/src/save/migrations.ts` - 버전별 마이그레이션 체인 (불필요)
- `frontend/src/save/saveGame.test.ts` - 관련 테스트 (불필요)

**수정 (주요)**:

- `frontend/src/save/saveGame.ts` - 저장/로드 함수 제거, `clearSaveGame()` 유지(기존 데이터 정리용), 나머지 내보내기(export) 제거 또는 빈 함수로 대체
- `frontend/src/save/sessionLifecycle.ts` - `getValidSaveGameOrNull()` 제거, `continueSession()` 제거, `bootstrapSession()` 단순화(항상 profile_select), `resetToCurrentProfile()`에서 SaveGame 저장 경로 제거
- `frontend/src/save/constants.ts` - `SAVEGAME_VERSION`, `SUPPORTED_SAVEGAME_VERSIONS` 등 제거 또는 정리
- `frontend/src/App.tsx` - 부팅 흐름에서 SaveGame 복원 경로 제거, 항상 profile_select 시작
- `frontend/src/components/ResetButton.tsx` - SaveGame 클리어 대신 단순 store reset + profile_select 전환
- `frontend/src/turn/turnRunner.ts` - (있다면) 턴 완료 시 SaveGame 자동 저장 로직 제거

**수정 (보조)**:

- `frontend/src/data/demoProfiles.ts` - SaveGame 호환 구조 불필요, 순수 프로필 데이터만 유지
- `frontend/src/stores/*.ts` - (있다면) SaveGame hydrate/persist 연동 제거

**참조**:

- `vibe/unit-results/U-015[Mvp].md` - SaveGame/Reset/Demo Profiles 원 구현
- `vibe/unit-results/U-041[Mvp].md` - SaveGame 마이그레이션 구현
- `vibe/unit-results/RU-004[Mvp].md` - SaveGame/초기상태/데모프로필 리팩토링
- `vibe/prd.md` 6.6절 - 세이브/로드 정책

## 구현 흐름

### 1단계: 부팅 흐름 단순화

- `sessionLifecycle.ts`의 `bootstrapSession()`:
  - 기존: SaveGame 존재 여부 확인 → 유효하면 복원 → 아니면 profile_select
  - 변경: 항상 `{ phase: 'profile_select' }` 반환
  - 기존 LocalStorage의 SaveGame 데이터를 `clearSaveGame()`으로 정리(한 번)
- `App.tsx`에서 `bootstrapSession()` 호출 후 항상 프로필 선택 화면 표시

### 2단계: SaveGame 저장/로드 제거

- `saveGame.ts`에서:
  - `saveSaveGame()` → 제거 (호출처 모두 확인 후 제거)
  - `loadSaveGame()` → 제거
  - `getValidSaveGameOrNull()` → 제거
  - `clearSaveGame()` → 유지 (기존 데이터 정리용, 부팅 시 1회 호출)
- `migrations.ts` → 파일 삭제
- `constants.ts`에서 `SAVEGAME_VERSION` 등 → 정리

### 3단계: 턴 완료 시 자동 저장 제거

- `turnRunner.ts` 또는 `App.tsx`에서 턴 완료 후 `saveSaveGame()` 호출하는 부분 → 제거
- 어떤 경로에서도 SaveGame을 LocalStorage에 쓰지 않는지 확인

### 4단계: Reset/프로필 흐름 단순화

- `ResetButton`: store 전체 초기화(`worldStore.reset()`, `inventoryStore.reset()`, `economyStore.reset()` 등) + phase를 `profile_select`로 전환
- `startSessionFromProfile()`: SaveGame 생성/저장 없이 프로필 데이터를 store에 직접 적용

### 5단계: 프로필 초기 상태 정리 (구 U-098 흡수)

- `demoProfiles.ts`의 3종 프로필 `sceneObjectDefs`를 빈 배열(`[]`)로 변경 (초기 핫스팟 제거, U-090 정책 준수)
- `worldStore.reset()`에서 `sceneState` 모든 하위 필드(`imageUrl`, `previousImageUrl`, `processingPhase`, `imageLoading`, `pendingImageTurnId`, `isAnalyzing`)가 초기값으로 리셋되는지 확인/보강
- 프로필 시작 시 Scene Canvas가 placeholder(`default`) 상태로 시작
- 데모 프로필의 불필요한 데모 전용 텍스트 정리

### 6단계: 정리 및 검증

- 모든 `import { saveSaveGame, loadSaveGame, ... }` 참조 제거
- TypeScript 컴파일 에러 없음 확인
- 새로고침 → 항상 프로필 선택 화면 확인
- 프로필 시작 → 플레이 → 새로고침 → 프로필 선택 화면(이전 상태 없음) 확인
- Reset → 프로필 선택 화면 확인
- 프로필 시작 시 핫스팟 없음 + placeholder 이미지 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-015[Mvp]](../unit-results/U-015[Mvp].md) - SaveGame/Reset/Demo Profiles 원 구현 (제거 대상)
- **결과물**: [U-041[Mvp]](../unit-results/U-041[Mvp].md) - SaveGame 마이그레이션 (제거 대상)
- **결과물**: [RU-004[Mvp]](../unit-results/RU-004[Mvp].md) - SaveGame 리팩토링 (제거 대상)

**다음 작업에 전달할 것**:

- **U-098[Mvp]**: ~~별도 유닛~~ → **본 유닛(U-116)에 흡수됨** (5단계에서 처리)
- **U-113[Mmp]**: MMP에서 세이브/상태 영속성 재설계 시 "SaveGame 없는 상태"를 기준선으로 출발
- CP-MVP-03: "새로고침 → 항상 프로필 선택" 데모 시나리오 검증

## 주의사항

**기술적 고려사항**:

- (PRD 6.6) 세이브/로드 정책이 "MVP에서 제거"로 변경됨 → PRD 동기화 필수
- LocalStorage에 SaveGame 외 다른 데이터(언어 설정, 온보딩 상태 등)는 **유지** → SaveGame 키(`unknown-world-save`)만 제거
- 프로필 ID 기억(`currentProfileId`)도 제거하여 항상 선택 화면에서 시작 (단, 언어 설정은 유지 가능)
- 기존 SaveGame이 남아있는 사용자의 브라우저에서 부팅 시 `clearSaveGame()`으로 정리

**잠재적 리스크**:

- 데모 중 실수로 새로고침하면 진행이 날아감 → MVP에서는 의도적 선택(안정성 우선), MMP에서 영속성 재설계
- 10분 데모 루프 중 새로고침이 발생하면 처음부터 재시작 → 데모 시나리오에 "새로고침 금지" 안내 또는 데모 시간을 5~7분으로 조정
- SaveGame 관련 코드가 광범위하게 참조되어 있을 수 있음 → TypeScript 컴파일러로 미참조/에러를 체계적으로 추적

## 페어링 질문 (결정 필요)

- [x] **Q1**: 언어 설정(language)은 LocalStorage에 유지할까?
  - Option A: 언어 설정도 제거 (매번 선택)
  - ✅ Option B: 언어 설정만 유지 (프로필 선택 시 이전 언어로 시작)

- [x] **Q2**: SaveGame 코드를 물리적으로 삭제할까, 주석/비활성화할까?
  - ✅Option A: 완전 삭제 (깔끔, MMP에서 처음부터 재설계)
  - Option B: 비활성화 (코드 유지, import만 제거, MMP에서 재활용 가능)

## 참고 자료

- `vibe/unit-results/U-015[Mvp].md` - SaveGame/Reset 원 구현
- `vibe/unit-results/U-041[Mvp].md` - SaveGame 마이그레이션
- `vibe/unit-results/RU-004[Mvp].md` - SaveGame 리팩토링
- `vibe/prd.md` 6.6절 - 세이브/로드 정책
- `frontend/src/save/` - SaveGame 관련 코드 SSOT
