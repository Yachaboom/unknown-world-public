# U-086[Mvp]: 턴 진행 피드백 보강 - 타이핑 효과와 이미지 생성 지연 동기화

## 메타데이터

| 항목      | 내용                                            |
| --------- | ----------------------------------------------- |
| Unit ID   | U-086[Mvp]                                      |
| Phase     | MVP                                             |
| 예상 소요 | 45분                                            |
| 의존성    | U-066[Mvp], U-071[Mvp]                          |
| 우선순위  | High (지연 체감 완화 + “멈춤” 오해 방지)        |
| **상태**  | ⏸️                                              |

## 작업 목표

턴 처리 과정에서 **텍스트 생성 → 이미지 생성 지연** 구간의 피드백을 강화한다. 특히, 내러티브가 “타이핑”되는 동안 이미지가 함께 생성되는 체감이 나도록 **타이핑 속도/표시가 이미지 pending 상태와 동기화**되게 하고, 사용자에게 “현재 이미지가 형성 중”임을 **NarrativeFeed에서도 명확히** 보여준다.

**배경**: U-066에서 “타이핑 효과로 지연을 흡수”하는 UX가 설계되었고(U-071에서 Scene Canvas 인디케이터도 강화됨), 실제 체감은 “텍스트는 끝났는데 이미지가 늦게 와서 멈춘 느낌”이 발생할 수 있다. 또한 타이핑 속도 결정을 위한 `isStreaming/isImageLoading` 신호가 UI에 제대로 전달되지 않으면, 의도한 동기화가 동작하지 않는다.

**완료 기준**:

- `NarrativeFeed`가 `isStreaming`/`isImageLoading`(또는 동등한 SSOT 신호)을 입력으로 받아, 이미지 pending 동안 **느린 타이핑 모드(시간 벌기)** 가 동작한다.
- 이미지가 `image_pending`인 동안 NarrativeFeed 하단에 **“이미지 형성 중…” 상태 라인/커서 연출**이 표시되어 대기 이유가 명확하다.
- `prefers-reduced-motion` 환경에서는 애니메이션/커서/타이핑이 자동 완화 또는 비활성화된다.
- i18n 정책(RULE-006) 준수: 메시지/라벨은 ko/en 혼합 없이 키 기반으로 표시된다.

## 영향받는 파일

**수정**:

- `frontend/src/App.tsx` - `NarrativeFeed`에 `isStreaming`/`isImageLoading`(또는 `processingPhase`)를 전달하여 타이핑 동기화가 실제로 동작하도록 연결
- `frontend/src/components/NarrativeFeed.tsx` - 이미지 pending 상태 라인 표시(타이핑 커서/라벨), 조건(스트리밍 종료 후에도 이미지 pending이면 유지) 정리
- `frontend/src/stores/worldStore.ts` - (필요 시) `sceneState.imageLoading/processingPhase`를 셀렉터로 제공(성능/가독성)
- `frontend/src/locales/ko-KR/translation.json` - `narrative.image_pending_label` 등 상태 라벨 키 추가
- `frontend/src/locales/en-US/translation.json` - 동일 키 영문 추가

**참조**:

- `vibe/unit-plans/U-066[Mvp].md` - 타이핑 효과/지연 흡수 플로우(SSOT)
- `vibe/unit-plans/U-071[Mvp].md` - `processingPhase` 및 Scene Canvas 로딩 인디케이터(SSOT)
- `frontend/src/turn/turnRunner.ts` - `processingPhase` 전이(`processing`→`rendering`→`image_pending`→`idle`)

## 구현 흐름

### 1단계: “지연 상태” 신호를 NarrativeFeed에 연결

- `App.tsx`에서 아래 신호를 조합하여 `NarrativeFeed`에 전달한다.
  - `agentStore.isStreaming`
  - `worldStore.sceneState.imageLoading`
  - (선택) `worldStore.sceneState.processingPhase`

### 2단계: 이미지 pending 상태 라인 표시(피드백 강화)

- `isImageLoading === true` 또는 `processingPhase === 'image_pending'` 동안,
  - NarrativeFeed 하단에 “이미지 형성 중…” 라벨을 **추가 엔트리(시스템 계열)** 로 표시한다.
  - 텍스트 타이핑이 이미 끝났더라도, 커서(▌) 또는 점멸(…)로 “진행 중” 느낌을 유지한다.
- 메시지 텍스트는 i18n 키(`narrative.image_pending_label`)로 관리한다.

### 3단계: 접근성/성능 보강

- `prefers-reduced-motion`일 때:
  - 커서/점멸 애니메이션을 비활성화하고, 정적 라벨만 표시한다.
- 추가 렌더 비용을 줄이기 위해 “상태 라인”은 단순한 DOM 노드 1개로 유지한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-066[Mvp]](U-066[Mvp].md) - 타이핑 효과(타깃 텍스트/fast-forward/접근성) 설계 및 상태 신호 정의
- **계획서**: [U-071[Mvp]](U-071[Mvp].md) - 처리 단계(`processingPhase`) 도입 및 이미지 pending 상태

**다음 작업에 전달할 것**:

- U-087: 입력 잠금(처리 중 입력 차단) UX에서 “상태 라벨”을 공통으로 재사용 가능
- CP-MVP-03: 데모 루프에서 “텍스트는 타이핑으로 진행 + 이미지 pending이 명확히 보임” 검증 항목 추가

## 주의사항

**기술적 고려사항**:

- (RULE-002) NarrativeFeed는 “채팅 버블”이 아니라 게임 로그이므로, 상태 라인은 **시스템/상태 메시지 스타일**로만 표현한다(대화형 말풍선 금지).
- (RULE-006) 상태 라벨/문구는 반드시 i18n 키로 관리한다.

**잠재적 리스크**:

- 타이핑 속도가 지나치게 느리면 사용자 불만이 생길 수 있음 → fast-forward(클릭/Enter/Space)를 항상 유지하고, 최소 속도 하한을 둔다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 이미지 pending 동안 타이핑 “느린 모드”를 얼마나 공격적으로 적용할까?
  - Option A: `isImageLoading`이면 무조건 느린 모드(체감 우선)
  - Option B: 텍스트 길이가 충분할 때만 느린 모드(가독성 우선)

## 참고 자료

- `vibe/unit-plans/U-066[Mvp].md` - 타이핑 효과/지연 흡수 설계
- `vibe/unit-plans/U-071[Mvp].md` - 처리 단계/로딩 인디케이터 설계

