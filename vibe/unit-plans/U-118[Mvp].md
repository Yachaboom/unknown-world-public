# U-118[Mvp]: ~~스캐너 첫 시작 온보딩 팝업 제거~~ → **U-117에 흡수됨**

> **⚠️ 이 유닛은 U-117[Mvp]에 통합되었습니다.** 소규모 프론트 UX 작업(20분)이므로 U-117(인벤토리 드래그 개선, 30분)과 병합하여 관리 효율성을 높였습니다. 구현은 U-117의 "추가 작업: 스캐너 온보딩 팝업 제거" 섹션을 참조하세요.

## 메타데이터

| 항목      | 내용                                       |
| --------- | ------------------------------------------ |
| Unit ID   | U-118[Mvp]                                 |
| Phase     | MVP                                        |
| 예상 소요 | 20분                                       |
| 의존성    | U-074[Mvp]                                 |
| 우선순위  | Low (UX 단순화)                            |

## 작업 목표

U-074에서 구현한 **첫 세션 시작 시 3단계 온보딩 팝업 가이드를 제거**한다. 게임 플로우를 방해하지 않는 **hover 힌트(Contextual Tooltip)**만 유지한다.

**배경**: U-074에서 핫스팟/인벤토리/Scanner 사용법을 안내하는 3단계 팝업 온보딩을 구현했으나, 실제 데모에서 팝업이 게임 시작 직후의 몰입을 방해하고, 플레이어가 "스킵"만 누르는 경향이 있다. hover 힌트와 Contextual Tooltip은 플레이 중 자연스럽게 노출되어 효과적이므로, 팝업 온보딩만 제거하고 힌트는 유지한다.

**완료 기준**:

- 첫 세션 시작 시 **온보딩 팝업(OnboardingGuide)이 표시되지 않음**
- `OnboardingGuide` 컴포넌트 및 관련 상태(`onboarding_complete` 등)가 **제거**됨
- **hover 힌트(InteractionHint)는 유지**: 핫스팟 hover 시 "클릭하여 조사", 아이템 hover 시 "드래그하여 사용" 표시
- **학습 힌트 시스템 유지**: 첫 N회 노출 후 자동 숨김 로직은 유지
- i18n 키 정리: 온보딩 관련 키(`interaction.onboarding_*`)는 삭제, 힌트 키(`interaction.hotspot_click` 등)는 유지
- LocalStorage의 `onboarding_complete` 키 정리

## 영향받는 파일

**삭제**:

- `frontend/src/components/OnboardingGuide.tsx` - 온보딩 팝업 컴포넌트 전체

**수정**:

- `frontend/src/App.tsx` (또는 OnboardingGuide를 렌더링하는 부모) - OnboardingGuide 렌더링 제거
- `frontend/src/stores/uiStore.ts` - 온보딩 상태(showOnboarding 등) 제거
- `frontend/src/locales/ko-KR/translation.json` - `interaction.onboarding_*` 키 삭제
- `frontend/src/locales/en-US/translation.json` - 동일 키 삭제
- `frontend/src/style.css` - 온보딩 오버레이/가이드 카드 스타일 제거

**유지 (변경 없음)**:

- `frontend/src/components/InteractionHint.tsx` - hover 힌트 컴포넌트 유지
- `frontend/src/components/SceneCanvas.tsx` - 핫스팟 hover 힌트 유지
- `frontend/src/components/InventoryPanel.tsx` - 아이템 hover 힌트 유지

**참조**:

- `vibe/unit-results/U-074[Mvp].md` - 인터랙션 안내 UX 구현 결과
- `vibe/prd.md` 6.7절 - 인터랙션 안내 UX 정책

## 구현 흐름

### 1단계: OnboardingGuide 컴포넌트 제거

- `OnboardingGuide.tsx` 파일 삭제
- 부모 컴포넌트(App.tsx 등)에서 `<OnboardingGuide />` 렌더링 및 import 제거

### 2단계: 온보딩 상태 제거

- `uiStore.ts`에서 `showOnboarding`, `onboardingStep` 등 관련 상태 제거
- LocalStorage의 `onboarding_complete` 키를 참조하는 코드 제거
- (선택) 기존 사용자의 `onboarding_complete` 키 정리(부팅 시 제거)

### 3단계: i18n 키 정리

- `translation.json`(ko-KR, en-US)에서 다음 키 삭제:
  - `interaction.onboarding_title`
  - `interaction.onboarding_hotspot`
  - `interaction.onboarding_item`
  - `interaction.onboarding_scanner`
  - `interaction.onboarding_skip`
  - `interaction.onboarding_start`
- 유지할 키: `interaction.hotspot_click`, `interaction.item_drag`, `interaction.drop_here`

### 4단계: CSS 정리

- 온보딩 관련 스타일(`.onboarding-overlay`, `.guide-card` 등) 제거
- InteractionHint 관련 스타일은 유지

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-074[Mvp]](../unit-results/U-074[Mvp].md) - 인터랙션 안내 UX 전체 구현 (팝업 + 힌트)

**다음 작업에 전달할 것**:

- CP-MVP-03: "온보딩 팝업 없이 hover 힌트만으로 조작 안내" 데모 시나리오 검증

## 주의사항

**기술적 고려사항**:

- (RULE-006) 삭제하는 i18n 키가 다른 곳에서 참조되고 있지 않은지 검색으로 확인
- hover 힌트(InteractionHint)와 학습 힌트 시스템(첫 N회 노출 후 숨김)은 반드시 유지
- 온보딩 관련 코드가 다른 컴포넌트에 분산되어 있을 수 있음 → TypeScript 컴파일러로 미참조 확인

**잠재적 리스크**:

- 온보딩 팝업 없이 처음 접하는 사용자가 조작법을 모를 수 있음 → hover 힌트가 자연스럽게 안내하므로 큰 문제는 아님
- Scanner 사용법이 특히 비직관적일 수 있음 → Scanner 영역에 "이미지를 여기에 드롭" 안내 텍스트가 이미 있으면 유지

## 페어링 질문 (결정 필요)

- [ ] **Q1**: hover 힌트의 학습 시스템(첫 N회)은 유지할까?
  - Option A: 유지 (현재 동작 그대로)
  - Option B: 항상 표시 (학습 시스템도 제거, 단순화)

## 참고 자료

- `vibe/unit-results/U-074[Mvp].md` - 인터랙션 안내 UX 구현 결과
- `vibe/prd.md` 6.7절 - 인터랙션 안내 UX
- `frontend/src/components/OnboardingGuide.tsx` - 제거 대상
