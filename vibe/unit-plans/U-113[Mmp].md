# U-113[Mmp]: 세션 상태 영속성 - 새로고침 시 Scene/ActionDeck/상태 복원

## 메타데이터

| 항목      | 내용                                       |
| --------- | ------------------------------------------ |
| Unit ID   | U-113[Mmp]                                 |
| Phase     | MMP                                        |
| 예상 소요 | 60분                                       |
| 의존성    | U-015[Mvp], U-041[Mvp]                     |
| 우선순위  | High (UX 연속성/데모 안정성)               |

## 작업 목표

브라우저 새로고침 시에도 **게임 진행 상태가 유지**되도록 세션 상태 영속성을 구현한다. 현재 메모리에만 존재하는 **Scene 이미지 URL, ActionDeck 카드, 스트리밍 텍스트, Agent Console 상태** 등을 영속 저장소에 기록하여, 새로고침 후에도 직전 상태로 복원할 수 있게 한다.

**배경**: 현재 SaveGame(U-015)은 WorldState/Inventory/Economy 등 핵심 게임 상태를 LocalStorage에 저장하지만, **UI 표시 상태**(Scene 이미지, ActionDeck 카드, NarrativeFeed 텍스트 등)는 메모리에만 존재한다. 브라우저 새로고침 시 이들이 초기화되어 "게임이 날아간 것처럼" 느껴지는 UX 문제가 있다. 특히 데모 중 실수로 새로고침하면 진행 상황이 손실되어 심사에 부정적 영향을 줄 수 있다.

**완료 기준**:

- 브라우저 새로고침 후에도 다음 상태가 복원됨:
  - Scene Canvas: 마지막 이미지 URL 및 핫스팟
  - ActionDeck: 마지막 턴의 액션 카드 목록
  - NarrativeFeed: 마지막 N개 내러티브 엔트리 (설정 가능, 기본 10개)
  - Agent Console: 마지막 단계/배지 상태
  - Economy HUD: 잔액/마지막 비용 (SaveGame과 연동)
- 복원 시 "이전 세션 복원 중..." 로딩 표시 후 자연스럽게 게임 UI로 전환
- 상태 저장은 **턴 완료 시점**에 자동으로 수행(수동 저장 불필요)
- 저장 데이터 용량 제한: 권장 최대 1MB (이미지는 URL만 저장, 바이너리 제외)
- 복원 불가/손상 시 SaveGame 기반 기본 복구 + 안내 메시지 표시

## 영향받는 파일

**생성**:

- `frontend/src/stores/sessionStateStore.ts` - UI 표시 상태 영속화 전용 스토어 (또는 기존 스토어 확장)
- `frontend/src/session/sessionPersistence.ts` - SessionStorage/LocalStorage 영속화 유틸리티

**수정**:

- `frontend/src/stores/worldStore.ts` - Scene 상태 변경 시 영속화 훅 추가
- `frontend/src/stores/agentStore.ts` - Agent Console 상태 변경 시 영속화 훅 추가
- `frontend/src/turn/turnRunner.ts` - `onFinal` 완료 시 세션 상태 자동 저장
- `frontend/src/App.tsx` (또는 진입점) - 앱 시작 시 세션 상태 복원 로직
- `frontend/src/components/SceneImage.tsx` - 복원된 이미지 URL 반영
- `frontend/src/components/ActionDeck.tsx` - 복원된 액션 카드 반영
- `frontend/src/components/NarrativeFeed.tsx` - 복원된 내러티브 엔트리 반영
- `frontend/src/locales/ko-KR/translation.json` - `session.restoring`, `session.restore_failed` 키 추가
- `frontend/src/locales/en-US/translation.json` - 동일

**참조**:

- `vibe/unit-plans/U-015[Mvp].md` - SaveGame 기본 구조
- `vibe/unit-plans/U-041[Mvp].md` - SaveGame 마이그레이션 패턴
- `frontend/src/save/sessionLifecycle.ts` - 세션 초기화/복원 SSOT

## 구현 흐름

### 1단계: 영속화 대상 상태 정의

- 저장할 UI 상태 목록 확정:
  - `sceneState`: imageUrl, previousImageUrl, hotspots, imageLoading, sceneRevision
  - `actionDeckState`: 현재 액션 카드 배열
  - `narrativeState`: 최근 N개 엔트리 (기본 10개, 설정 가능)
  - `agentState`: 마지막 단계, 배지 목록, isStreaming 제외(런타임 전용)
  - `economySnapshot`: 마지막 표시된 잔액/비용 (SaveGame과 중복이지만 빠른 복원용)

### 2단계: 영속화 유틸리티 구현

```typescript
// frontend/src/session/sessionPersistence.ts
interface SessionState {
  version: number;
  timestamp: number;
  scene: SceneCanvasState;
  actionDeck: ActionCard[];
  narrative: NarrativeEntry[];
  agent: { lastStage: string; badges: string[] };
  economySnapshot: { signal: number; shard: number };
}

const SESSION_KEY = 'uw_session_state';
const MAX_NARRATIVE_ENTRIES = 10;

export function saveSessionState(state: SessionState): void {
  try {
    const json = JSON.stringify(state);
    if (json.length > 1_000_000) {
      console.warn('Session state too large, truncating narrative');
      // 내러티브 줄이기
    }
    sessionStorage.setItem(SESSION_KEY, json);
  } catch (e) {
    console.error('Failed to save session state', e);
  }
}

export function loadSessionState(): SessionState | null {
  try {
    const json = sessionStorage.getItem(SESSION_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to load session state', e);
    return null;
  }
}

export function clearSessionState(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
```

### 3단계: 자동 저장 훅 추가

- `turnRunner.ts`의 `onFinal` 완료 후 `saveSessionState()` 호출
- Scene/ActionDeck/Narrative 상태 변경 시 debounce로 저장 (성능 고려)

```typescript
// frontend/src/turn/turnRunner.ts
onFinal: (data) => {
  // 기존 로직...
  
  // 세션 상태 자동 저장
  saveCurrentSessionState();
}
```

### 4단계: 앱 시작 시 복원 로직

- `App.tsx` 또는 진입점에서 `loadSessionState()` 호출
- 복원할 상태가 있으면:
  1. "이전 세션 복원 중..." 로딩 표시
  2. 각 스토어에 상태 반영
  3. SaveGame과 정합성 확인 (version/timestamp)
  4. 불일치 시 SaveGame 기반 기본 복구

```typescript
// frontend/src/App.tsx
useEffect(() => {
  const sessionState = loadSessionState();
  if (sessionState) {
    setIsRestoring(true);
    try {
      restoreSessionState(sessionState);
    } catch (e) {
      console.error('Session restore failed, using SaveGame fallback');
      // SaveGame 기반 복구
    } finally {
      setIsRestoring(false);
    }
  }
}, []);
```

### 5단계: 복원 UI 및 에러 처리

- 복원 중 로딩 인디케이터 표시
- 복원 실패 시 토스트/알림으로 안내: "이전 진행 상황을 불러오지 못했습니다. 저장된 게임에서 다시 시작합니다."
- i18n 키 추가

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-015[Mvp]](U-015[Mvp].md) - SaveGame 구조 및 LocalStorage 패턴
- **계획서**: [U-041[Mvp]](U-041[Mvp].md) - SaveGame 마이그레이션(버전 관리 패턴)
- **참조**: `frontend/src/save/sessionLifecycle.ts` - 세션 초기화/복원 SSOT

**다음 작업에 전달할 것**:

- CP-MMP-02: "새로고침 후 복원" 데모 시나리오/런북에 포함
- 브라우저 탭 복제/다중 탭 시나리오 고려(MMP 확장)

## 주의사항

**기술적 고려사항**:

- **SessionStorage vs LocalStorage**: SessionStorage는 탭 단위로 격리되어 다중 탭 간 충돌 방지. LocalStorage는 탭 간 공유되므로 주의 필요.
- **저장 용량**: SessionStorage는 브라우저별 5~10MB 제한. 이미지 바이너리는 저장하지 않고 URL만 저장.
- **이미지 URL 유효성**: 서버 재시작/정리 시 이미지 URL이 만료될 수 있음 → 복원 시 이미지 로드 실패하면 placeholder 표시
- **SaveGame과의 정합성**: 세션 상태와 SaveGame의 timestamp/turnCount가 불일치하면 SaveGame을 우선(더 신뢰할 수 있는 소스)

**잠재적 리스크**:

- 세션 상태가 손상되면 복원 실패 → 반드시 try-catch로 폴백 처리
- 빈번한 저장으로 성능 저하 → debounce 적용 (예: 500ms)
- 다중 탭에서 동시 플레이 시 상태 충돌 → (MVP) 단일 탭 가정, (MMP) 탭 ID 기반 격리 고려

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 영속 저장소 선택?
  - Option A: SessionStorage (탭 단위 격리, 새 탭에서 새 게임)
  - Option B: LocalStorage (탭 간 공유, 마지막 상태 유지)
  - Option C: 하이브리드 (SaveGame은 Local, 세션 상태는 Session)

- [ ] **Q2**: 복원 범위?
  - Option A: 전체 UI 상태 (Scene, ActionDeck, Narrative, Agent)
  - Option B: 핵심만 (Scene, ActionDeck) - Narrative는 "이전 로그"로 표시
  - Option C: Scene 이미지만 (가장 중요한 시각 요소)

- [ ] **Q3**: 복원 시 자동 vs 사용자 확인?
  - Option A: 자동 복원 (사용자 개입 없이)
  - Option B: 확인 다이얼로그 ("이전 진행 상황을 불러올까요?")
  - Option C: 토스트 알림으로 복원 완료 안내만

- [ ] **Q4**: 저장 트리거?
  - Option A: 턴 완료 시만 저장
  - Option B: 상태 변경 시마다 debounce 저장
  - Option C: 주기적 자동 저장 (예: 30초마다)

## 참고 자료

- `vibe/unit-plans/U-015[Mvp].md` - SaveGame 구조
- `vibe/unit-plans/U-041[Mvp].md` - SaveGame 마이그레이션
- `frontend/src/save/sessionLifecycle.ts` - 세션 SSOT
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- `vibe/prd.md` 6.6절 - 세이브/로드 요구사항
