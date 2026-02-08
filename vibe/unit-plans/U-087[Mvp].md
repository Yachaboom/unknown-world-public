# U-087[Mvp]: 대기열(턴 처리) 진행 중 모든 사용자 입력 잠금

## 메타데이터

| 항목      | 내용                                              |
| --------- | ------------------------------------------------- |
| Unit ID   | U-087[Mvp]                                        |
| Phase     | MVP                                               |
| 예상 소요 | 45분                                              |
| 의존성    | U-070[Mvp], U-071[Mvp]                            |
| 우선순위  | High (중복 입력/허위 로그/상태 경합 방지)          |
| **상태**  | ⏸️                                                |

## 작업 목표

턴 처리(Agent Queue) 또는 이미지 생성(후행 late-binding)이 진행 중일 때, **모든 사용자 입력을 차단**하여 “입력은 됐지만 실제 턴은 실행되지 않는” 혼란과 **허위 액션 로그**(행동 실행만 찍히고 서버 호출이 무시됨)를 제거한다. 입력 잠금 상태는 UI에서 명확히 표시한다.

**배경**: 현재는 `turnRunner`가 `isStreaming`일 때 `runTurn()`을 무시하지만, App 레벨에서 **액션 로그를 먼저 append**한 뒤 실행을 호출하는 경로가 존재한다(U-070). 이 경우 사용자는 입력이 막혔다고 느끼지 못하고 로그만 쌓이거나, DnD/클릭이 먹히지 않는 것처럼 보여 UX가 흔들린다. “대기열 에이전트 진행중에는 모든 사용자 입력을 방지”하는 정책을 명시적으로 구현해야 한다.

**완료 기준**:

- 처리 중(`isStreaming` 또는 `processingPhase !== 'idle'` 또는 `imageLoading === true`)에는 다음 입력이 모두 비활성화된다:
  - Action Deck 카드 클릭
  - Scene Canvas 핫스팟 클릭
  - Inventory DnD(드래그 시작/드롭)
  - Scanner 업로드/드롭
  - 커맨드 입력창/실행 버튼
  - Reset/Change Profile 버튼
- 처리 중 입력 시도는 **액션 로그/시스템 내러티브를 추가하지 않는다**(허위 피드백 금지).
- 입력 잠금 상태가 UI에 “처리 중…”로 명확히 표시된다(오버레이/커서/disabled 스타일).
- i18n 정책(RULE-006) 준수 + 접근성(`aria-disabled`, reduced-motion) 고려.

## 영향받는 파일

**수정**:

- `frontend/src/App.tsx` - `isInputLocked`(또는 `isBusy`)를 SSOT로 계산하고, 모든 입력 핸들러/컴포넌트에 disabled 전달 + 핸들러 내부 가드(액션 로그 생성 포함) 적용 + 잠금 오버레이 표시
- `frontend/src/components/ActionDeck.tsx` - (선택) `disabled` 프롭 추가 및 카드 UI 비활성화 스타일 적용
- `frontend/src/components/SceneCanvas.tsx` - `disabled` 프롭을 “스트리밍뿐 아니라 입력 잠금”으로 확장 적용(핫스팟 클릭/드롭 타겟 포함)
- `frontend/src/components/ScannerSlot.tsx` - `disabled` 동작 확인(현재 isStreaming 기반에서 isInputLocked로 전환)
- `frontend/src/style.css` - 잠금 오버레이(포인터 차단) 및 disabled 상태 시각화(CRT 톤 유지)
- `frontend/src/locales/ko-KR/translation.json` - `ui.input_locked`, `ui.input_locked_detail` 등 메시지 키 추가
- `frontend/src/locales/en-US/translation.json` - 동일 키 영문 추가

**참조**:

- `frontend/src/turn/turnRunner.ts` - `runTurn()`의 `isStreaming` 가드(서버 호출 무시 로직)
- `frontend/src/stores/worldStore.ts` - `appendActionLog()`가 턴 미발생으로도 누적될 수 있는 경로(혼란 원인)
- `vibe/unit-plans/U-070[Mvp].md` - 액션 로그 정책(“행동 실행:”)
- `vibe/unit-plans/U-071[Mvp].md` - `processingPhase` 기반 처리중 UI 상태(SSOT)

## 구현 흐름

### 1단계: 입력 잠금 SSOT 정의(App 단일 계산)

- `App.tsx`에서 아래 상태를 조합해 `isInputLocked`를 만든다:
  - `agentStore.isStreaming`
  - `worldStore.sceneState.processingPhase !== 'idle'`
  - `worldStore.sceneState.imageLoading === true`
- `isInputLocked`를 기준으로 UI/핸들러를 모두 가드한다(중복 분기 금지).

### 2단계: “허위 액션 로그” 경로 차단

- 카드 클릭/핫스팟 클릭/드롭 처리에서:
  - `appendActionLog()`/`appendSystemNarrative()` 호출 전에 `if (isInputLocked) return;`을 적용한다.
- DnD 이벤트(`handleDragStart/handleDragEnd`)는 잠금 시 즉시 return 하여 상태 흔들림을 방지한다.

### 3단계: UI에서 잠금 상태를 명시적으로 표시

- `.game-container` 위에 잠금 오버레이를 absolute로 덮어 **pointer-events로 입력 자체를 차단**한다.
- 오버레이에는 “처리 중…” + (선택) “이미지 형성 중…” 같은 짧은 설명을 표시한다(U-086과 메시지 공유 가능).
- 텍스트 입력/버튼/카드/핫스팟은 disabled 스타일(불투명도/커서 wait)로 통일한다.

### 4단계: 접근성/예외 처리

- 오버레이는 `aria-live="polite"` 또는 최소한의 스크린리더 친화 텍스트를 제공한다.
- `prefers-reduced-motion` 환경에서 반복 애니메이션(글리치/점멸)은 완화한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-070[Mvp]](U-070[Mvp].md) - 액션 로그가 “턴 실행 이전”에 추가되는 UX 패턴(현재 혼란의 원인)
- **계획서**: [U-071[Mvp]](U-071[Mvp].md) - 처리 단계(`processingPhase`) SSOT 및 Scene 처리중 UI 연출

**다음 작업에 전달할 것**:

- Autopilot/Queue(U-023/U-024)에서 “큐 진행 중 입력 잠금” 정책을 재사용(예: Pause/Cancel 도입 전까지 강제 잠금)
- CP-MVP-03: 데모 루프에서 “처리 중 입력 차단 + 허위 로그 없음” 검증 항목 추가

## 주의사항

**기술적 고려사항**:

- (RULE-002) “입력 무시”만으로는 UX가 흔들린다. 반드시 시각적으로 잠금 상태를 표시하고, 입력 시도에 의해 로그가 쌓이지 않게 해야 한다.
- (RULE-006) 잠금 메시지는 i18n 키 기반으로 관리한다.

**잠재적 리스크**:

- 입력을 과도하게 잠그면 게임이 답답해질 수 있음(특히 이미지 pending이 길 때) → U-086의 “진행 피드백”을 함께 적용하고, 필요 시 MMP에서 “Cancel/Pause”를 설계한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: 입력 잠금 범위는 어디까지인가?
  - ✅ Option A: **텍스트 스트리밍+이미지 pending 포함(완전 잠금)** (요청대로 가장 안전)
  - Option B: 스트리밍 중만 잠금, 이미지 pending 동안은 입력 허용(진행감 우선)

## 참고 자료

- `vibe/unit-plans/U-070[Mvp].md` - 액션 로그 정책
- `vibe/unit-plans/U-071[Mvp].md` - processingPhase 처리 상태 모델
- `frontend/src/App.tsx` - 입력 라우팅/액션 로그 추가 위치(핵심)

