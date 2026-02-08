# U-128[Mvp]: 정밀분석 완료 상태에서 정밀분석 카드 비활성화

## 메타데이터

| 항목      | 내용                                                     |
| --------- | -------------------------------------------------------- |
| Unit ID   | U-128[Mvp]                                               |
| Phase     | MVP                                                      |
| 예상 소요 | 30분                                                     |
| 의존성    | U-090[Mvp], U-087[Mvp]                                   |
| 우선순위  | Medium (중복 분석 방지 + 비용 절약)                      |

## 작업 목표

**정밀분석이 이미 수행되어 화면에 핫스팟이 표시된 상태**에서는 "정밀분석" 액션 카드를 선택할 수 없도록 비활성화하여, 불필요한 중복 분석 호출과 비용 낭비를 방지한다.

**배경**: 현재 정밀분석(Agentic Vision) 액션 카드는 화면에 핫스팟이 이미 존재하는 경우에도 활성 상태로 표시된다. 사용자가 이미 분석된 장면에서 다시 정밀분석을 선택하면 동일한 이미지를 재분석하게 되어 비용(1.5x 배수)이 낭비되고, 기존 핫스팟이 중복/충돌할 수 있다. 새로운 장면 이미지가 생성되면 핫스팟이 초기화되므로, 그때 다시 정밀분석이 가능해져야 한다.

**완료 기준**:

- `sceneObjects`(핫스팟)가 1개 이상 존재할 때, VISION_TRIGGER 계열 액션 카드(`정밀분석`, `deep_analyze` 등)가 **비활성화(disabled)** 상태로 표시된다.
- 비활성화된 카드는 클릭해도 턴이 실행되지 않으며, 시각적으로 dim/disabled 스타일이 적용된다.
- 비활성화 사유를 **툴팁 또는 서브라벨**로 표시한다 (예: "이미 분석된 장면입니다" / i18n 키).
- 새 장면 이미지가 생성되어 핫스팟이 초기화되면, 정밀분석 카드가 다시 활성화된다.
- i18n 정책(RULE-006) 준수.

## 영향받는 파일

**수정**:

- `frontend/src/components/ActionDeck.tsx` - VISION_TRIGGER 계열 카드에 `disabled` 조건 추가: `sceneObjects.length > 0`일 때 비활성화. disabled 스타일 + 툴팁 메시지.
- `frontend/src/style.css` - `.action-card.card-vision.disabled` 스타일 추가 (opacity, cursor, pointer-events)
- `frontend/src/locales/ko-KR/translation.json` - `action.vision_already_analyzed` 키 추가
- `frontend/src/locales/en-US/translation.json` - 동일 키 영문 추가

**참조**:

- `frontend/src/stores/worldStore.ts` - `sceneObjects` 상태 (핫스팟 존재 여부 SSOT)
- `frontend/src/components/ActionDeck.tsx` - `VISION_TRIGGER_ACTION_IDS` 상수
- `vibe/unit-results/U-090[Mvp].md` - 핫스팟 정밀분석 전용 정책

## 구현 흐름

### 1단계: 핫스팟 존재 여부를 ActionDeck에 전달

- `App.tsx`(또는 ActionDeck이 사용하는 스토어)에서 `worldStore.sceneObjects`의 길이를 확인하여 `hasHotspots: boolean` 상태를 ActionDeck에 전달한다.
- 또는 ActionDeck 내부에서 직접 `useWorldStore(s => s.sceneObjects.length > 0)`을 구독한다.

### 2단계: VISION 카드에 disabled 조건 적용

- `ActionDeck.tsx`의 카드 렌더링 로직에서:
  - `isVisionAction === true && hasHotspots === true` → `disabled = true`
  - disabled 카드는 `onClick` 핸들러를 무시하고, `aria-disabled="true"` 속성을 추가한다.
  - disabled 상태에서 툴팁/서브라벨에 `t('action.vision_already_analyzed')` 메시지를 표시한다.

### 3단계: 시각 스타일 적용

- `.action-card.card-vision.disabled` CSS:
  - `opacity: 0.4`
  - `cursor: not-allowed`
  - `pointer-events: none` (또는 핸들러 가드)
  - CRT 톤 유지하되 dim 처리
- VISION 배지도 함께 dim 처리

### 4단계: 새 장면 시 자동 해제 확인

- `worldStore.applyTurnOutput()`에서 새 이미지가 생성되면 `sceneObjects`가 초기화되는 기존 로직(U-090)이 정상 작동하는지 확인한다.
- 핫스팟이 초기화되면 `hasHotspots`가 `false`로 전환되어 정밀분석 카드가 자동 활성화된다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-090[Mvp]](../unit-results/U-090[Mvp].md) - 핫스팟 생성 정책 (정밀분석 전용), 핫스팟 초기화 로직
- **결과물**: [U-087[Mvp]](../unit-results/U-087[Mvp].md) - 입력 잠금 SSOT (`isInputLocked`)

**다음 작업에 전달할 것**:

- U-115: 핫스팟 컴팩트 원형 디자인에서 "이미 분석됨" 상태의 핫스팟 시각 피드백 통합
- CP-MVP-03: 데모 루프에서 "정밀분석 → 핫스팟 표시 → 정밀분석 카드 비활성화 → 새 장면 → 다시 활성화" 시나리오 검증

## 주의사항

**기술적 고려사항**:

- (U-090) 핫스팟은 "정밀분석 턴에서만 생성"되므로, `sceneObjects.length > 0`은 곧 "정밀분석이 수행된 장면"을 의미한다. 추가 플래그 없이도 판별 가능하다.
- (RULE-005) 비활성화로 인해 불필요한 비전 API 호출이 차단되어 비용 절약 효과가 있다 (1.5x 배수 호출 1회 절약).

**잠재적 리스크**:

- 사용자가 다른 행동(핫스팟 클릭 등)으로 장면이 변경되었지만 이미지가 갱신되지 않은 경우, 핫스팟이 남아있어 정밀분석이 차단될 수 있음 → 새 이미지 생성 시에만 핫스팟 초기화되므로 자연스럽게 해결됨.

## 페어링 질문 (결정 필요)

- [x] **Q1**: 비활성화 방식은?
  - Option A: 카드를 **숨김(hide)** — 정밀분석 카드 자체가 보이지 않음 (깔끔하지만 기능 발견성 저하)
  - ✅Option B: 카드를 **비활성화(disabled)** — 보이지만 클릭 불가 + 사유 표시 (권장, 기능 존재 인지 유지)

## 참고 자료

- `vibe/unit-results/U-090[Mvp].md` - 핫스팟 정밀분석 전용 정책
- `frontend/src/components/ActionDeck.tsx` - `VISION_TRIGGER_ACTION_IDS`, 카드 렌더링 로직
- `frontend/src/stores/worldStore.ts` - `sceneObjects` 상태, `applyTurnOutput()` 핫스팟 관리
- `vibe/prd.md` 6.2 - 핫스팟 생성 제한 정책
