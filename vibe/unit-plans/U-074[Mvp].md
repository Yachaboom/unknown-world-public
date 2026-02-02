# U-074[Mvp]: 핫스팟/아이템 인터랙션 안내 UX

## 메타데이터

| 항목      | 내용                                  |
| --------- | ------------------------------------- |
| Unit ID   | U-074[Mvp]                            |
| Phase     | MVP                                   |
| 예상 소요 | 45분                                  |
| 의존성    | U-012[Mvp], U-010[Mvp]                |
| 우선순위  | High (핵심 인터랙션 발견성 강화)      |

## 작업 목표

플레이어가 **핫스팟을 클릭하여 진행하거나 아이템을 드래그 앤 드롭할 수 있다는 것을 안내하는 UX**를 제공하여, "채팅 입력"이 아닌 "게임 조작"이 핵심임을 직관적으로 이해할 수 있게 한다.

**배경**: 핫스팟 클릭과 아이템 DnD가 핵심 인터랙션이지만, 처음 접하는 플레이어는 이 기능의 존재를 모르고 텍스트 입력만 시도할 수 있다. 시각적 힌트와 온보딩 가이드를 통해 "게임스러운 조작"을 자연스럽게 유도해야 한다.

**완료 기준**:

- 핫스팟에 hover 시 "클릭하여 조사" 힌트 표시
- 인벤토리 아이템에 hover 시 "드래그하여 사용" 힌트 표시
- 첫 세션 시작 시 인터랙션 안내 오버레이/가이드 표시 (스킵 가능)
- 안내 텍스트는 i18n 지원

## 영향받는 파일

**수정**:

- `frontend/src/components/SceneCanvas.tsx` - 핫스팟 hover 힌트 추가
- `frontend/src/components/InventoryPanel.tsx` - 아이템 hover 힌트 추가
- `frontend/src/components/OnboardingGuide.tsx` - 인터랙션 안내 오버레이 (신규 또는 기존 확장)
- `frontend/src/stores/uiStore.ts` - 온보딩 상태 관리
- `frontend/src/locales/ko-KR/translation.json` - 안내 텍스트
- `frontend/src/locales/en-US/translation.json` - 영문 안내 텍스트
- `frontend/src/style.css` - 힌트/가이드 스타일

**생성** (필요 시):

- `frontend/src/components/InteractionHint.tsx` - 재사용 가능한 힌트 컴포넌트

**참조**:

- `vibe/unit-plans/U-010[Mvp].md` - Scene Canvas + Hotspot Overlay
- `vibe/unit-plans/U-012[Mvp].md` - DnD 드롭 이벤트

## 구현 흐름

### 1단계: 인터랙션 힌트 컴포넌트 설계

- 재사용 가능한 힌트 툴팁 컴포넌트
- 위치, 텍스트, 아이콘을 props로 받음

```tsx
// frontend/src/components/InteractionHint.tsx
interface InteractionHintProps {
  text: string;
  icon?: "click" | "drag" | "drop";
  position?: "top" | "bottom" | "left" | "right";
}

const InteractionHint: React.FC<InteractionHintProps> = ({ text, icon, position = "top" }) => (
  <HintContainer position={position}>
    {icon && <HintIcon type={icon} />}
    <HintText>{text}</HintText>
  </HintContainer>
);
```

### 2단계: i18n 텍스트 추가

```json
// frontend/src/locales/ko-KR/translation.json
{
  "interaction": {
    "hotspot_click": "클릭하여 조사",
    "item_drag": "드래그하여 사용",
    "drop_here": "여기에 놓기",
    "onboarding_title": "조작 안내",
    "onboarding_hotspot": "화면의 반짝이는 영역을 클릭하면 조사할 수 있습니다",
    "onboarding_item": "인벤토리 아이템을 화면의 오브젝트로 드래그하면 사용할 수 있습니다",
    "onboarding_scanner": "Scanner에 이미지를 업로드하면 아이템으로 변환됩니다",
    "onboarding_skip": "건너뛰기",
    "onboarding_start": "시작하기"
  }
}
```

### 3단계: 핫스팟 hover 힌트

- 핫스팟에 마우스를 올리면 힌트 표시
- 클릭 아이콘과 함께 "클릭하여 조사" 텍스트

```tsx
// frontend/src/components/SceneCanvas.tsx (Hotspot 부분)
const HotspotOverlay: React.FC<{ hotspot: Hotspot }> = ({ hotspot }) => {
  const [showHint, setShowHint] = useState(false);
  const { t } = useTranslation();
  
  return (
    <HotspotArea
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
      onClick={() => handleHotspotClick(hotspot)}
    >
      {showHint && (
        <InteractionHint 
          text={t("interaction.hotspot_click")} 
          icon="click" 
        />
      )}
    </HotspotArea>
  );
};
```

### 4단계: 아이템 hover 힌트

- 인벤토리 아이템에 마우스를 올리면 힌트 표시
- 드래그 아이콘과 함께 "드래그하여 사용" 텍스트

```tsx
// frontend/src/components/InventoryPanel.tsx
const InventoryItem: React.FC<{ item: Item }> = ({ item }) => {
  const [showHint, setShowHint] = useState(false);
  
  return (
    <DraggableItem
      id={item.id}
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
    >
      <ItemIcon src={item.icon} />
      <ItemLabel>{item.label}</ItemLabel>
      {showHint && (
        <InteractionHint 
          text={t("interaction.item_drag")} 
          icon="drag" 
        />
      )}
    </DraggableItem>
  );
};
```

### 5단계: 첫 세션 온보딩 가이드

- 첫 세션 시작 시 인터랙션 안내 오버레이 표시
- 핫스팟/아이템/Scanner 사용법을 순서대로 안내
- "스킵" 버튼으로 건너뛰기 가능
- localStorage로 "온보딩 완료" 상태 저장

```tsx
// frontend/src/components/OnboardingGuide.tsx
const OnboardingGuide: React.FC = () => {
  const [step, setStep] = useState(0);
  const { t } = useTranslation();
  
  const steps = [
    { target: "hotspot", text: t("interaction.onboarding_hotspot") },
    { target: "inventory", text: t("interaction.onboarding_item") },
    { target: "scanner", text: t("interaction.onboarding_scanner") },
  ];
  
  const handleComplete = () => {
    localStorage.setItem("onboarding_complete", "true");
    closeOnboarding();
  };
  
  return (
    <OnboardingOverlay>
      <HighlightArea target={steps[step].target} />
      <GuideCard>
        <GuideText>{steps[step].text}</GuideText>
        <GuideActions>
          <SkipButton onClick={handleComplete}>
            {t("interaction.onboarding_skip")}
          </SkipButton>
          {step < steps.length - 1 ? (
            <NextButton onClick={() => setStep(s => s + 1)}>
              {t("common.next")}
            </NextButton>
          ) : (
            <StartButton onClick={handleComplete}>
              {t("interaction.onboarding_start")}
            </StartButton>
          )}
        </GuideActions>
      </GuideCard>
    </OnboardingOverlay>
  );
};
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-010[Mvp]](../unit-results/U-010[Mvp].md) - Scene Canvas + Hotspot Overlay
- **결과물**: [U-012[Mvp]](../unit-results/U-012[Mvp].md) - DnD 드롭 이벤트

**다음 작업에 전달할 것**:

- CP-MVP-03: 인터랙션 안내가 포함된 데모 시나리오
- 데모 프로필: 온보딩 완료 상태로 시작하는 프로필 옵션

## 주의사항

**기술적 고려사항**:

- (RULE-006) 모든 안내 텍스트는 i18n 키 기반
- (접근성) 힌트 텍스트는 스크린리더로 읽을 수 있어야 함 (aria-label 등)
- 힌트가 게임 플레이를 방해하지 않도록 적절한 타이밍/위치 조절

**잠재적 리스크**:

- 힌트가 너무 많으면 화면이 산만함 → hover 시에만 표시, 일정 시간 후 자동 숨김
- 온보딩이 강제되면 반복 플레이어에게 불편 → 스킵 버튼 및 localStorage 기반 상태 저장

## 페어링 질문 (결정 필요)

- [ ] **Q1**: hover 힌트 표시 조건?
  - Option A: 모든 핫스팟/아이템에 항상 표시
  - Option B: 첫 N번만 표시 후 숨김 (학습 후 사라짐)
  - Option C: 설정에서 "힌트 표시" 토글

- [ ] **Q2**: 온보딩 가이드 형태?
  - Option A: 풀스크린 오버레이 + 단계별 하이라이트
  - Option B: 화면 코너에 작은 팝업 가이드
  - Option C: 첫 턴 내러티브에 자연스럽게 녹여서 안내

- [ ] **Q3**: 데모 프로필에서 온보딩?
  - Option A: 데모 프로필은 온보딩 스킵 (이미 알고 있다고 가정)
  - Option B: 데모 프로필도 첫 접속 시 온보딩 표시
  - Option C: 프로필별 선택 가능 (Narrator=온보딩O, Explorer=온보딩X 등)

## 참고 자료

- `vibe/unit-results/U-010[Mvp].md` - Hotspot Overlay 구현
- `vibe/unit-results/U-012[Mvp].md` - DnD 드롭 이벤트 구현
- `vibe/prd.md` 6.7절 - 핵심 인터랙션(클릭/드래그)
- `vibe/prd.md` 6.9절 - 데모 프로필
