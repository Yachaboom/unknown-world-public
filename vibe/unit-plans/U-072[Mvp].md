# U-072[Mvp]: Scanner 의미론적 사용 유도 UX

## 메타데이터

| 항목      | 내용                                  |
| --------- | ------------------------------------- |
| Unit ID   | U-072[Mvp]                            |
| Phase     | MVP                                   |
| 예상 소요 | 45분                                  |
| 의존성    | U-022[Mvp]                            |
| 우선순위  | High (멀티모달 기능 발견성 강화)      |

## 작업 목표

Scanner(이미지 업로드) 기능이 **게임 맥락에서 자연스럽게 사용될 수 있도록 유도하는 UX**를 제공하여, 플레이어가 "현실 이미지를 게임에 가져올 수 있다"는 것을 직관적으로 이해하고 활용할 수 있게 한다.

**배경**: Scanner 기능이 구현되어 있지만(U-022), 플레이어가 언제/왜 이 기능을 사용해야 하는지 명확하지 않을 수 있다. 게임 내러티브나 UI 힌트를 통해 "이미지를 업로드하면 아이템/단서가 된다"는 것을 자연스럽게 알려줘야 한다.

**완료 기준**:

- Scanner 슬롯에 "무엇을 할 수 있는지" 설명하는 툴팁/힌트 텍스트 표시
- 특정 게임 상황(예: "단서가 필요해 보인다")에서 Scanner 사용을 유도하는 내러티브 힌트
- Scanner 드래그 영역에 시각적 어포던스(아이콘, 점선 테두리, 애니메이션 등)
- 첫 사용 시 간단한 온보딩 토스트/가이드

## 영향받는 파일

**수정**:

- `frontend/src/components/ScannerSlot.tsx` - 툴팁, 힌트 텍스트, 시각적 어포던스 추가
- `frontend/src/components/NarrativeFeed.tsx` - Scanner 유도 힌트 표시 로직
- `frontend/src/stores/worldStore.ts` - Scanner 사용 여부 추적 (첫 사용 온보딩용)
- `frontend/src/locales/ko-KR/translation.json` - Scanner 관련 힌트/툴팁 텍스트
- `frontend/src/locales/en-US/translation.json` - 영문 힌트/툴팁
- `frontend/src/style.css` - Scanner 어포던스 스타일

**참조**:

- `vibe/unit-plans/U-022[Mvp].md` - Scanner 슬롯 UI 구현
- `vibe/prd.md` 6.7절 - Scanner 슬롯(이미지 드랍/업로드)

## 구현 흐름

### 1단계: Scanner 슬롯 툴팁/힌트 추가

- hover 시 툴팁으로 기능 설명
- 슬롯 내 placeholder 텍스트

```tsx
// frontend/src/components/ScannerSlot.tsx
<ScannerSlotContainer
  onMouseEnter={() => setShowTooltip(true)}
  onMouseLeave={() => setShowTooltip(false)}
>
  <ScannerIcon />
  <PlaceholderText>
    {t("scanner.placeholder")}
  </PlaceholderText>
  
  {showTooltip && (
    <Tooltip>
      {t("scanner.tooltip")}
    </Tooltip>
  )}
</ScannerSlotContainer>
```

### 2단계: i18n 텍스트 추가

```json
// frontend/src/locales/ko-KR/translation.json
{
  "scanner": {
    "placeholder": "이미지를 여기에 드래그",
    "tooltip": "현실의 사진을 업로드하면 게임 속 아이템이나 단서로 변환됩니다",
    "hint_narrative": "주변을 더 자세히 살펴볼 필요가 있을 것 같다. 혹시 관련된 사진이나 이미지가 있다면...",
    "first_use_guide": "Scanner에 이미지를 드래그해 보세요! 현실의 사진이 게임 속 아이템으로 변환됩니다.",
    "drop_active": "이미지를 놓으세요"
  }
}
```

### 3단계: 시각적 어포던스 강화

- 점선 테두리로 드롭 영역 명시
- 드래그 중일 때 하이라이트 애니메이션
- Scanner 아이콘에 미묘한 펄스 효과

```css
/* frontend/src/style.css */
.scanner-slot {
  border: 2px dashed var(--text-dim);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s ease;
}

.scanner-slot:hover {
  border-color: var(--text-color);
  box-shadow: 0 0 10px var(--text-color);
}

.scanner-slot.drag-active {
  border-color: var(--accent-color);
  background: rgba(255, 0, 255, 0.1);
  animation: pulse 1s infinite;
}

.scanner-icon {
  animation: subtle-pulse 3s ease-in-out infinite;
}

@keyframes subtle-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
```

### 4단계: 내러티브 힌트 시스템

- 특정 상황에서 Scanner 사용을 유도하는 힌트 표시
- TurnOutput에 `scanner_hint: boolean` 플래그 또는 내러티브에 키워드 포함

```typescript
// frontend/src/turn/turnRunner.ts
// TurnOutput 처리 시 Scanner 힌트 체크
if (turnOutput.hints?.scanner) {
  addNarrativeEntry({
    type: "system",
    text: t("scanner.hint_narrative"),
  });
}
```

### 5단계: 첫 사용 온보딩

- Scanner를 처음 사용하는 플레이어에게 가이드 토스트
- localStorage로 "첫 사용 여부" 추적

```typescript
// frontend/src/components/ScannerSlot.tsx
const handleDrop = async (files: File[]) => {
  const hasUsedScanner = localStorage.getItem("scanner_used");
  
  if (!hasUsedScanner) {
    showToast(t("scanner.first_use_guide"), { type: "info" });
    localStorage.setItem("scanner_used", "true");
  }
  
  // 업로드 처리...
};
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-022[Mvp]](../unit-results/U-022[Mvp].md) - Scanner 슬롯 UI 구현
- **참조**: `vibe/prd.md` 6.7절 - Scanner 기능 정의

**다음 작업에 전달할 것**:

- U-074: 전체 인터랙션 안내 UX에 Scanner 포함
- CP-MVP-03: Scanner 사용이 자연스러운 데모 시나리오

## 주의사항

**기술적 고려사항**:

- (RULE-006) 모든 힌트/툴팁 텍스트는 i18n 키 기반
- (접근성) 툴팁은 키보드로도 접근 가능해야 함 (focus 시 표시)
- Scanner 힌트가 너무 자주 나오면 성가심 → 적절한 빈도 제어

**잠재적 리스크**:

- 내러티브 힌트가 몰입을 깨뜨릴 수 있음 → 게임 맥락에 자연스럽게 녹여서 표현
- 첫 사용 가이드가 계속 보이면 불편 → localStorage로 한 번만 표시

## 페어링 질문 (결정 필요)

- [x] **Q1**: Scanner 힌트 트리거 방식?
  - Option A: 백엔드(LLM)가 상황에 맞게 `scanner_hint` 플래그 생성
  - Option B: 프론트엔드에서 특정 조건(인벤토리 비어있음, 막힘 상태 등) 감지
  - Option C: 특정 키워드("단서", "증거", "사진" 등)가 내러티브에 포함될 때
  **A1**: Option A

- [x] **Q2**: 온보딩 가이드 형태?
  - Option A: 토스트 메시지 (간단, 비침입적)
  - Option B: 모달 팝업 (상세 설명, 이미지 포함)
  - Option C: Scanner 슬롯 위에 화살표 + 말풍선
  **A2**: Option C

## 참고 자료

- `vibe/unit-results/U-022[Mvp].md` - Scanner 슬롯 구현 결과
- `vibe/prd.md` 6.7절 - Scanner 슬롯(이미지 드랍/업로드)
- `frontend/src/components/ScannerSlot.tsx` - 현재 Scanner 구현
