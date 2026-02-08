# U-086[Mvp]: 턴 진행 피드백 보강 - 텍스트 우선 타이핑 출력(이미지 생성 중 지연 흡수)

## 메타데이터

| 항목      | 내용                                            |
| --------- | ----------------------------------------------- |
| Unit ID   | U-086[Mvp]                                      |
| Phase     | MVP                                             |
| 예상 소요 | 45분                                            |
| 의존성    | U-066[Mvp], U-071[Mvp]                          |
| 우선순위  | High (지연 체감 완화 + "멈춤" 오해 방지)        |
| **상태**  | ⏸️                                              |

## 작업 목표

턴 처리 과정에서 **텍스트 생성이 완료되면 이미지 생성 완료를 기다리지 않고 즉시 텍스트를 사용자에게 출력**한다. 이미지 생성에는 약 **10~15초**가 소요되므로, 이 대기 시간 동안 텍스트를 **느린 타이핑(Typewriter) 효과**로 한 글자씩 출력하여 지연을 자연스럽게 흡수한다. 텍스트 타이핑이 끝난 후에도 이미지가 아직 생성 중이면 NarrativeFeed 하단에 **"이미지 형성 중…" 상태 라인**을 표시하여 대기 이유를 명확히 한다.

**배경**: 현재 구조는 텍스트와 이미지가 **모두 생성 완료된 후에야 사용자에게 결과가 출력**되므로, 이미지 생성 지연(10~15초) 동안 사용자는 아무 피드백 없이 대기하게 된다. U-066에서 "타이핑 효과로 지연을 흡수"하는 UX가 설계되었고(U-071에서 Scene Canvas 인디케이터도 강화됨), 이제 **텍스트를 먼저 내주는(text-first delivery)** 흐름을 실제로 연결해야 한다. 핵심은 "텍스트와 이미지를 동시에 맞추는 것"이 아니라, **텍스트를 먼저 보여주고 이미지는 준비되는 대로 나중에 반영**하는 것이다.

**완료 기준**:

- 텍스트 생성이 완료되면 **이미지 생성 완료와 무관하게 즉시** NarrativeFeed에 느린 타이핑 출력이 시작된다.
- `NarrativeFeed`가 `isStreaming`/`isImageLoading`(또는 동등한 SSOT 신호)을 입력으로 받아, 이미지가 아직 생성 중(`image_pending`)인 동안 **느린 타이핑 모드(~10~15초에 걸쳐 출력)**가 동작한다.
- 타이핑이 완료된 후에도 이미지가 `image_pending`이면 NarrativeFeed 하단에 **"이미지 형성 중…" 상태 라인/커서 연출**이 표시되어 대기 이유가 명확하다.
- 이미지가 도착하면 Scene Canvas에 자연스럽게 반영된다(late-binding, U-066 가드 유지).
- `prefers-reduced-motion` 환경에서는 애니메이션/커서/타이핑이 자동 완화 또는 비활성화된다.
- i18n 정책(RULE-006) 준수: 메시지/라벨은 ko/en 혼합 없이 키 기반으로 표시된다.

## 영향받는 파일

**수정**:

- `frontend/src/App.tsx` - `NarrativeFeed`에 `isStreaming`/`isImageLoading`(또는 `processingPhase`)를 전달하여 텍스트 우선 출력 + 타이핑 속도 제어가 동작하도록 연결
- `frontend/src/components/NarrativeFeed.tsx` - 텍스트 우선 출력 로직: 텍스트 생성 완료 즉시 타이핑 시작(이미지 대기와 무관), 이미지 pending 상태 라인 표시(타이핑 완료 후에도 이미지 미도착 시), 타이핑 속도 동적 조절(이미지 생성 중이면 느리게)
- `frontend/src/turn/turnRunner.ts` - 텍스트 생성 완료 시점에 NarrativeFeed 타이핑을 즉시 트리거하도록 흐름 조정(이미지 생성 완료를 기다리지 않음)
- `frontend/src/stores/worldStore.ts` - (필요 시) `sceneState.imageLoading/processingPhase`를 셀렉터로 제공(성능/가독성)
- `frontend/src/locales/ko-KR/translation.json` - `narrative.image_pending_label` 등 상태 라벨 키 추가
- `frontend/src/locales/en-US/translation.json` - 동일 키 영문 추가

**참조**:

- `vibe/unit-plans/U-066[Mvp].md` - 타이핑 효과(타깃 텍스트/fast-forward/접근성) 설계 및 상태 신호 정의, late-binding 가드
- `vibe/unit-plans/U-071[Mvp].md` - `processingPhase` 및 Scene Canvas 로딩 인디케이터(SSOT)
- `frontend/src/turn/turnRunner.ts` - `processingPhase` 전이(`processing`→`rendering`→`image_pending`→`idle`)

## 구현 흐름

### 1단계: 텍스트 우선 출력 흐름 연결 (턴 러너 → NarrativeFeed)

- `turnRunner.ts`에서 텍스트 생성(스트리밍) 완료 시점에 **이미지 생성 완료를 기다리지 않고** NarrativeFeed에 타이핑 대상 텍스트를 즉시 전달한다.
  - 현재 흐름: 텍스트 + 이미지 모두 완료 → UI 갱신 → 사용자에게 출력
  - 변경 흐름: 텍스트 완료 → **즉시** NarrativeFeed 타이핑 시작 → 이미지는 백그라운드에서 계속 생성 → 이미지 도착 시 Scene Canvas에 late-binding 반영
- `App.tsx`에서 아래 신호를 조합하여 `NarrativeFeed`에 전달한다:
  - `agentStore.isStreaming` (텍스트 스트리밍 진행 여부)
  - `worldStore.sceneState.imageLoading` (이미지 생성 진행 여부)
  - (선택) `worldStore.sceneState.processingPhase`

### 2단계: 느린 타이핑으로 이미지 생성 대기 시간 흡수

- `isImageLoading === true` 동안 타이핑 속도를 **느리게** 조절하여 10~15초에 걸쳐 텍스트가 출력되도록 한다.
  - U-066에서 정의한 `TARGET_DURATION_MS_WHILE_STREAMING = 12000`(느린 모드)를 활용
  - 이미지 생성이 완료되면(`isImageLoading === false`) 남은 텍스트를 **빠르게** 출력(TARGET_DURATION_MS_IDLE = 2500)
- 사용자가 기다리기 싫을 때를 위해 **fast-forward(클릭/Enter/Space)** 는 항상 유지한다.

### 3단계: 이미지 pending 상태 라인 표시(타이핑 완료 후 피드백)

- 타이핑이 모두 끝났는데도 `isImageLoading === true`이면:
  - NarrativeFeed 하단에 "이미지 형성 중…" 라벨을 **추가 엔트리(시스템 계열)**로 표시한다.
  - 커서(▌) 또는 점멸(…)로 "진행 중" 느낌을 유지한다.
- 이미지가 도착하면 상태 라인을 제거하고 Scene Canvas에 이미지가 자연스럽게 표시된다.
- 메시지 텍스트는 i18n 키(`narrative.image_pending_label`)로 관리한다.

### 4단계: 접근성/성능 보강

- `prefers-reduced-motion`일 때:
  - 커서/점멸 애니메이션을 비활성화하고, 정적 라벨만 표시한다.
  - 타이핑 효과도 비활성화(즉시 전체 텍스트 표시)
- 추가 렌더 비용을 줄이기 위해 "상태 라인"은 단순한 DOM 노드 1개로 유지한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-066[Mvp]](U-066[Mvp].md) - 타이핑 효과(타깃 텍스트/fast-forward/접근성) 설계, 상태 신호 정의, late-binding 가드
- **계획서**: [U-071[Mvp]](U-071[Mvp].md) - 처리 단계(`processingPhase`) 도입 및 이미지 pending 상태

**다음 작업에 전달할 것**:

- U-087: 입력 잠금(처리 중 입력 차단) UX에서 "상태 라벨"을 공통으로 재사용 가능
- CP-MVP-03: 데모 루프에서 "텍스트가 먼저 타이핑으로 출력되고 + 이미지는 나중에 도착" 검증 항목 추가

## 주의사항

**기술적 고려사항**:

- (RULE-002) NarrativeFeed는 "채팅 버블"이 아니라 게임 로그이므로, 상태 라인은 **시스템/상태 메시지 스타일**로만 표현한다(대화형 말풍선 금지).
- (RULE-006) 상태 라벨/문구는 반드시 i18n 키로 관리한다.
- (핵심 원칙) **텍스트와 이미지의 출력 타이밍을 분리**하는 것이 이 유닛의 핵심이다. 텍스트는 생성 즉시 사용자에게 전달하고, 이미지는 late-binding으로 나중에 반영한다. "동기화"가 아니라 "분리(text-first delivery)"가 목표임을 구현 시 유의한다.

**잠재적 리스크**:

- 타이핑 속도가 지나치게 느리면 사용자 불만이 생길 수 있음 → fast-forward(클릭/Enter/Space)를 항상 유지하고, 최소 속도 하한(MIN_CPS=10)을 둔다.
- 이미지 생성이 예상보다 빨리 완료될 때(2~3초) 텍스트 타이핑이 아직 초반이면 어색할 수 있음 → 이미지 도착 시 타이핑 속도를 빠른 모드로 전환하여 자연스럽게 마무리한다.
- 텍스트 먼저 출력 시 turnRunner 흐름 변경이 필요할 수 있음 → 기존 `onFinal` 이후 이미지 잡 분기(U-066 설계)를 활용하되, 텍스트 상태 갱신 시점을 이미지 완료 이전으로 앞당긴다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: 이미지 pending 동안 타이핑 "느린 모드"를 얼마나 공격적으로 적용할까?
  - ✅Option A: `isImageLoading`이면 무조건 느린 모드(~12초 목표, 체감 우선)
  - Option B: 텍스트 길이가 충분할 때만 느린 모드, 짧은 텍스트는 빠르게 완료(가독성 우선)

- [x] **Q2**: 텍스트 출력 시점을 어디서 트리거할까?
  - ✅Option A: `onFinal` 콜백에서 이미지 잡 시작과 동시에 NarrativeFeed 타이핑 시작(현재 U-066 설계 활용)
  - Option B: 스트리밍 완료(`isStreaming=false`) 시점에 바로 타이핑 시작(이미지 잡 시작보다 먼저)

## 참고 자료

- `vibe/unit-plans/U-066[Mvp].md` - 타이핑 효과/지연 흡수 설계, late-binding 가드, 타이핑 속도 상수(TARGET_DURATION_MS 등)
- `vibe/unit-plans/U-071[Mvp].md` - 처리 단계/로딩 인디케이터 설계
