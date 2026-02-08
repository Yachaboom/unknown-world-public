# U-098[Mvp]: 새로고침 시 완전 리셋 + 프로필 시작 초기 핫스팟/데모 텍스트 제거

## 메타데이터

| 항목      | 내용                                                              |
| --------- | ----------------------------------------------------------------- |
| Unit ID   | U-098[Mvp]                                                        |
| Phase     | MVP                                                               |
| 예상 소요 | 45분                                                              |
| 의존성    | U-015[Mvp], U-090[Mvp]                                           |
| 우선순위  | High (프로필 초기화 미동작 + 데모 체감 저해)                      |

## 작업 목표

**새로고침(F5/브라우저 리로드) 시 세션 상태가 완전히 리셋**되도록 수정하고, **프로필 시작 시 초기 핫스팟(sceneObjectDefs)과 데모 대상 텍스트를 제거**하여 깨끗한 상태에서 게임을 시작할 수 있게 한다.

**배경**: 현재 프로필 초기화(리셋) 기능이 정상 동작하지 않아, 새로고침 후에도 이전 세션의 잔재(Scene 이미지, 핫스팟, 액션 카드 등)가 남아있거나 상태 불일치로 게임 진행이 불가한 경우가 있다. 또한 데모 프로필의 `sceneObjectDefs`에 정의된 초기 핫스팟(예: "신비로운 책장", "고대의 문" 등)이 **이미지 없는 Scene Canvas에 핫스팟만 표시**되어 어색하고, U-090(핫스팟은 정밀분석 전용) 정책과도 충돌한다.

**완료 기준**:

- 새로고침 시 `localStorage`의 SaveGame이 무효화되거나 정상적으로 복원되어, 상태 불일치로 인한 진행 불가가 발생하지 않는다.
- 프로필 리셋(Reset 버튼) 클릭 시 모든 세션 store(worldStore, inventoryStore, economyStore, actionDeckStore, agentStore)가 완전히 초기화된다.
- 3종 데모 프로필(`narrator`, `explorer`, `tech`)의 `sceneObjectDefs`가 빈 배열(`[]`)로 변경되어, 시작 시 핫스팟이 표시되지 않는다.
- 프로필 시작 시 Scene Canvas는 placeholder 상태(`default`)로 표시된다.
- 데모 대상(데모 표면 전용) 하드코딩 텍스트가 있다면 제거 또는 i18n 키로 전환한다.

## 영향받는 파일

**수정**:

- `frontend/src/data/demoProfiles.ts` - 3종 프로필의 `sceneObjectDefs`를 빈 배열로 변경, 불필요한 데모 텍스트 정리
- `frontend/src/save/sessionLifecycle.ts` - `resetToCurrentProfile`/`startSessionFromProfile`에서 sceneState(이미지URL, processingPhase, imageLoading 등) 완전 초기화 보장
- `frontend/src/stores/worldStore.ts` - `reset()` 함수에서 sceneState, sceneCanvasSize 등 모든 하위 상태가 초기값으로 리셋되는지 검증/보강
- `frontend/src/App.tsx` - (필요 시) 새로고침 시 부팅 흐름(`bootstrapSession`)에서 깨진 SaveGame 감지 및 안전 리셋 로직 보강

**참조**:

- `frontend/src/save/saveGame.ts` - SaveGame 검증/로드/클리어 로직
- `vibe/unit-plans/U-015[Mvp].md` - SaveGame/Reset/Demo Profiles 설계
- `vibe/unit-plans/U-090[Mvp].md` - 핫스팟 생성은 정밀분석 전용 정책

## 구현 흐름

### 1단계: 데모 프로필 초기 핫스팟 제거

- `demoProfiles.ts`에서 3종 프로필(`PROFILE_NARRATOR`, `PROFILE_EXPLORER`, `PROFILE_TECH`)의 `sceneObjectDefs`를 빈 배열(`[]`)로 변경한다.
- 프로필 시작 시 Scene Canvas가 `default` placeholder 상태로 표시되며, 핫스팟이 없는 깨끗한 상태로 시작한다.
- 관련 i18n 키(`profile.*.scene.*`)는 유지하되, 런타임에서 사용되지 않으므로 향후 정리 대상으로 표시한다.

### 2단계: worldStore.reset() 완전 초기화 보장

- `worldStore.reset()`에서 `sceneState`의 모든 하위 필드(`status`, `imageUrl`, `previousImageUrl`, `message`, `processingPhase`, `imageLoading`, `pendingImageTurnId`)가 `createInitialState()`의 초기값으로 리셋되는지 확인한다.
- `sceneCanvasSize`도 초기값(`{ width: 0, height: 0 }`)으로 리셋되는지 확인한다.
- `isAnalyzing` 상태도 `false`로 리셋되는지 확인한다.
- 누락된 필드가 있으면 `createInitialState()`에 추가한다.

### 3단계: 새로고침 시 부팅 흐름 안정화

- `bootstrapSession()`에서 `getValidSaveGameOrNull()`이 깨진 SaveGame(스키마 불일치/버전 불일치)을 감지하면 안전하게 `profile_select`로 폴백하는지 확인한다.
- `continueSession()`에서 로드 실패 시 `clearSaveGame()` + `clearCurrentProfileId()` + 모든 store `reset()`이 호출되는지 확인한다.
- (필요 시) 새로고침 후 유효한 SaveGame이 있어도 sceneState(이미지 URL 등)는 런타임 전용이므로 복원하지 않고 placeholder로 시작하는 정책을 명확히 한다.

### 4단계: 데모 대상 텍스트 정리

- 데모 프로필에 하드코딩된 데모용 텍스트(예: 데모 안내 문구 등)가 있다면 제거하거나 i18n 키로 전환한다.
- 프로필 시작 시 `welcomeMessage`만 남기고 불필요한 데모 메시지를 정리한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-015[Mvp]](../unit-results/U-015[Mvp].md) - SaveGame/Reset/Demo Profiles 기반 구현
- **결과물**: [U-090[Mvp]](../unit-results/U-090[Mvp].md) - 핫스팟 생성을 정밀분석 전용으로 제한하는 정책

**다음 작업에 전달할 것**:

- CP-MVP-03: 데모 루프에서 "프로필 시작 → 깨끗한 상태 → 첫 턴" 검증 항목 추가
- U-113[Mmp]: 세션 상태 영속성에서 "어떤 상태를 복원할 것인가" 정책의 기준선 제공

## 주의사항

**기술적 고려사항**:

- (RULE-002) 프로필 시작 시 Scene Canvas가 채팅형 "빈 화면"이 아니라 **게임 UI의 placeholder(대기 상태)** 로 보이도록 유지한다.
- (RULE-006) 데모 프로필의 welcomeMessage는 반드시 i18n 키 기반(`t(profile.*.welcome)`)으로 표시한다.
- (U-090 정책) 초기 핫스팟 제거는 "핫스팟은 정밀분석 전용" 정책과 일관된다. 프로필 시작 시에는 이미지도 핫스팟도 없는 깨끗한 상태가 올바르다.
- 새로고침 후 SaveGame 복원 시 `sceneState.imageUrl`은 **서버 임시 URL(만료 가능)** 이므로, 복원하더라도 이미지가 표시되지 않을 수 있다. MVP에서는 복원하지 않고 placeholder로 시작하는 것이 안전하다.

**잠재적 리스크**:

- 초기 핫스팟 제거로 프로필 시작 직후 "클릭 가능한 요소"가 없어져 조작감이 줄어들 수 있음 → 액션 카드(Action Deck)가 바로 제공되므로 대체 인터랙션은 존재한다.
- SaveGame 복원 로직 수정 시 기존 유효 세이브가 무효화될 수 있음 → `getValidSaveGameOrNull()`의 검증 범위를 과도하게 확대하지 않는다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 새로고침 시 유효한 SaveGame이 있으면 자동 복원할까, 아니면 항상 프로필 선택 화면으로 갈까?
  - Option A: 유효 SaveGame → 자동 복원(현재 동작 유지, 복원 시 sceneState는 placeholder) 
  - Option B: 새로고침 시 항상 프로필 선택 화면(SaveGame은 유지하되 수동 Continue)
  - Option C: 유효 SaveGame → 자동 복원하되, sceneState/imageUrl은 복원하지 않음(항상 placeholder)

## 참고 자료

- `vibe/unit-plans/U-015[Mvp].md` - SaveGame/Reset 설계
- `vibe/unit-plans/U-090[Mvp].md` - 핫스팟 정밀분석 전용 정책
- `frontend/src/save/sessionLifecycle.ts` - 세션 라이프사이클 SSOT
