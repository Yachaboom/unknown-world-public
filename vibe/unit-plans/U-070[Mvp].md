# U-070[Mvp]: 아이템-핫스팟 사용 시 액션 로그 출력

## 메타데이터

| 항목      | 내용                                  |
| --------- | ------------------------------------- |
| Unit ID   | U-070[Mvp]                            |
| Phase     | MVP                                   |
| 예상 소요 | 45분                                  |
| 의존성    | U-012[Mvp]                            |
| 우선순위  | High (인터랙션 피드백 강화)           |

## 작업 목표

인벤토리 아이템을 핫스팟에 드래그 앤 드롭하여 사용할 때, **지정된 형식의 액션 로그가 NarrativeFeed에 출력**되어 플레이어가 수행한 행동을 명확하게 인지할 수 있도록 한다.

**배경**: 현재 아이템을 핫스팟에 드롭하면 TurnInput이 전송되지만, 사용자 행동에 대한 즉각적인 피드백(액션 로그)이 부족하여 "내 행동이 인식되었는가?"가 불명확하다. `PRD 9.0`에서 정의한 "행동 로그(예: `행동 실행: 열쇠를 자물쇠에 사용한다`)" 형식으로 피드백을 제공해야 한다.

**완료 기준**:

- 아이템→핫스팟 드롭 시 즉시 NarrativeFeed에 액션 로그가 표시됨
- 로그 형식: `"행동 실행: {아이템명}을(를) {핫스팟명}에 사용한다"` (또는 i18n 키 기반)
- 영문 세션에서는 `"Action: Use {item} on {hotspot}"` 형식
- 액션 로그는 게임 내러티브와 시각적으로 구분됨 (스타일링)

## 영향받는 파일

**수정**:

- `frontend/src/components/SceneCanvas.tsx` - 드롭 이벤트 핸들러에서 액션 로그 생성
- `frontend/src/components/NarrativeFeed.tsx` - 액션 로그 엔트리 스타일링 (타입 구분)
- `frontend/src/stores/worldStore.ts` - `narrativeEntries`에 액션 로그 타입 추가
- `frontend/src/locales/ko-KR/translation.json` - 액션 로그 템플릿 키 추가
- `frontend/src/locales/en-US/translation.json` - 영문 액션 로그 템플릿

**참조**:

- `vibe/prd.md` 9.0절 - 행동 로그 형식 정의
- `frontend/src/components/InventoryPanel.tsx` - DnD 소스(아이템)
- `vibe/unit-plans/U-012[Mvp].md` - DnD 드롭 TurnInput 이벤트

## 구현 흐름

### 1단계: 액션 로그 타입 정의

- NarrativeEntry에 `type: "narrative" | "action_log" | "system"` 추가
- 액션 로그용 스타일/아이콘 정의

```typescript
// frontend/src/types/narrative.ts
interface NarrativeEntry {
  id: string;
  type: "narrative" | "action_log" | "system";
  text: string;
  timestamp: number;
}
```

### 2단계: i18n 템플릿 추가

```json
// frontend/src/locales/ko-KR/translation.json
{
  "action_log": {
    "use_item_on_hotspot": "행동 실행: {{item}}을(를) {{hotspot}}에 사용한다",
    "click_hotspot": "행동 실행: {{hotspot}}을(를) 조사한다"
  }
}

// frontend/src/locales/en-US/translation.json
{
  "action_log": {
    "use_item_on_hotspot": "Action: Use {{item}} on {{hotspot}}",
    "click_hotspot": "Action: Examine {{hotspot}}"
  }
}
```

### 3단계: 드롭 이벤트에서 액션 로그 생성

- SceneCanvas의 `handleDrop`에서 액션 로그 추가
- TurnInput 전송 전에 먼저 로그를 표시하여 즉각적 피드백 제공

```typescript
// frontend/src/components/SceneCanvas.tsx
const handleDrop = (itemId: string, hotspotId: string) => {
  const item = inventory.find(i => i.id === itemId);
  const hotspot = hotspots.find(h => h.id === hotspotId);
  
  // 즉시 액션 로그 추가
  addNarrativeEntry({
    type: "action_log",
    text: t("action_log.use_item_on_hotspot", { 
      item: item?.label, 
      hotspot: hotspot?.label 
    }),
  });
  
  // TurnInput 전송
  executeTurn({
    action: { type: "use_item", item_id: itemId, target_id: hotspotId },
    ...
  });
};
```

### 4단계: NarrativeFeed 스타일링

- 액션 로그는 내러티브와 시각적으로 구분
- 예: 앞에 `▶` 아이콘, 다른 색상(dim 계열), 이탤릭체

```tsx
// frontend/src/components/NarrativeFeed.tsx
{entry.type === "action_log" && (
  <ActionLogEntry>
    <ActionIcon>▶</ActionIcon>
    <ActionText>{entry.text}</ActionText>
  </ActionLogEntry>
)}
```

```css
/* frontend/src/style.css */
.action-log-entry {
  color: var(--text-dim);
  font-style: italic;
  padding-left: 1em;
  border-left: 2px solid var(--text-dim);
}
```

### 5단계: 핫스팟 클릭에도 액션 로그 적용

- 핫스팟 클릭 시에도 동일 패턴으로 액션 로그 출력
- `"행동 실행: {핫스팟명}을(를) 조사한다"`

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-012[Mvp]](../unit-results/U-012[Mvp].md) - DnD 드롭 이벤트 처리 로직
- **참조**: `vibe/prd.md` 9.0절 - 행동 로그 형식 정의

**다음 작업에 전달할 것**:

- U-074: 인터랙션 안내 UX에서 액션 로그 예시 활용
- CP-MVP-03: 데모에서 플레이어 행동이 명확히 로깅되는 시나리오

## 주의사항

**기술적 고려사항**:

- (RULE-006) 액션 로그도 i18n 키 기반으로 처리 (ko/en 혼합 금지)
- (PRD 9.0) "...라고 말했습니다" 같은 대사 템플릿 금지 → "행동 실행:" 형식 사용
- 액션 로그는 NarrativeEntry로 저장되어 SaveGame에도 포함됨

**잠재적 리스크**:

- 액션 로그가 너무 많으면 내러티브를 가릴 수 있음 → 로그 접기/필터 옵션 (MMP)
- 아이템/핫스팟 이름이 길면 로그가 길어짐 → max-width 및 ellipsis 처리

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 액션 로그 스타일?
  - Option A: 내러티브와 동일 영역에 다른 스타일(dim, 이탤릭)로 표시
  - Option B: 별도의 "액션 로그" 패널/섹션에 표시
  - Option C: 토스트/팝업 형태로 잠시 표시 후 사라짐

- [ ] **Q2**: 액션 카드 클릭에도 액션 로그 적용?
  - Option A: 적용 (모든 플레이어 행동에 로그)
  - Option B: 아이템 사용/핫스팟 조사만 적용 (직접 인터랙션만)

## 참고 자료

- `vibe/prd.md` 9.0절 - UI 형태 원칙, 행동 로그 형식
- `vibe/unit-results/U-012[Mvp].md` - DnD 드롭 이벤트 구현 결과
- `frontend/src/components/NarrativeFeed.tsx` - 내러티브 표시 컴포넌트
