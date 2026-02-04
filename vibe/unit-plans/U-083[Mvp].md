# U-083[Mvp]: UI 레이아웃 - 액션 카드 대안 뱃지 레이아웃 깨짐 수정

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-083[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 30분                              |
| 의존성    | U-009[Mvp]                        |
| 우선순위  | High (UI 안정성/데모 품질)        |

## 작업 목표

액션 카드에 **대안 뱃지(Alternative Badge)**가 표시될 때 **레이아웃이 깨지는 문제**를 수정하여, 대안 표시가 있어도 카드 레이아웃이 안정적으로 유지되도록 한다.

**배경**: 재화가 부족하거나 특정 조건에서 액션 카드에 "대안" 뱃지(예: "텍스트만", "저해상도", "FAST" 등)가 표시된다. 현재 이 뱃지가 카드의 기존 레이아웃(비용 표시, 설명 텍스트 등)과 겹치거나 카드 크기를 비정상적으로 늘려 전체 Action Deck 레이아웃이 깨지는 문제가 있다.

**완료 기준**:

- 대안 뱃지가 표시되어도 **카드 크기가 일정하게 유지**됨
- 뱃지가 **다른 요소(비용, 설명)와 겹치지 않음**
- 뱃지가 길어도 **텍스트가 잘리거나 줄바꿈**되어 레이아웃 유지
- 여러 뱃지가 동시에 표시되어도 안정적

## 영향받는 파일

**수정**:

- `frontend/src/components/ActionCard.tsx` - 뱃지 배치 로직 수정
- `frontend/src/components/ActionDeck.tsx` - 카드 그리드/플렉스 설정 확인
- `frontend/src/style.css` - 액션 카드 및 뱃지 CSS 수정

**참조**:

- `vibe/unit-plans/U-009[Mvp].md` - Action Deck 기본 구조
- `vibe/prd.md` 6.7절 - Action Deck 요구사항

## 구현 흐름

### 1단계: 문제 재현 및 분석

- 대안 뱃지가 표시되는 조건 확인 (재화 부족, 특정 옵션 등)
- 레이아웃이 깨지는 구체적인 케이스 식별:
  - 뱃지 텍스트가 너무 길 때
  - 여러 뱃지가 동시에 표시될 때
  - 카드 내 다른 요소와 겹칠 때

### 2단계: 카드 구조 정리

- 카드 내부 영역을 명확히 분리:
  - 상단: 제목
  - 중앙: 설명/힌트
  - 하단: 비용 + 대안 뱃지
- 각 영역에 고정 높이 또는 min-height 적용

```tsx
// frontend/src/components/ActionCard.tsx
<div className="action-card">
  <div className="action-card-header">
    <span className="action-title">{action.label}</span>
  </div>
  <div className="action-card-body">
    <span className="action-description">{action.hint}</span>
  </div>
  <div className="action-card-footer">
    <div className="action-cost">{cost}</div>
    <div className="action-badges">
      {alternatives?.map(alt => (
        <span key={alt} className="action-badge alternative">{alt}</span>
      ))}
    </div>
  </div>
</div>
```

### 3단계: 뱃지 CSS 안정화

- 뱃지에 `max-width` + `text-overflow: ellipsis` 적용
- 뱃지 컨테이너에 `flex-wrap: wrap` + `gap` 적용
- 뱃지 높이 고정으로 수직 레이아웃 안정화

```css
/* frontend/src/style.css */
.action-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 8px;
  min-height: 32px;
}

.action-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 60%;
}

.action-badge {
  padding: 2px 6px;
  font-size: 0.75rem;
  border-radius: 4px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-badge.alternative {
  background: var(--text-dim);
  color: var(--bg-color);
}
```

### 4단계: 카드 크기 고정

- 액션 카드에 고정 너비/높이 또는 min/max 설정
- Action Deck 그리드에서 카드 크기 일관성 유지

```css
.action-card {
  width: 100%;
  min-height: 100px;
  max-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
```

### 5단계: 테스트 케이스 확인

- 뱃지 없음 / 1개 / 여러 개 표시 시 레이아웃 확인
- 긴 뱃지 텍스트 (예: "저해상도 이미지") 표시 시 확인
- 비용 + 뱃지 동시 표시 시 겹침 없는지 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-009[Mvp]](U-009[Mvp].md) - Action Deck 기본 구조
- **결과물**: `frontend/src/components/ActionCard.tsx` 현재 구조

**다음 작업에 전달할 것**:

- CP-MVP-03: 재화 부족 시나리오에서 대안 표시가 깔끔하게 보이는지 확인

## 주의사항

**기술적 고려사항**:

- (PRD 6.7) Action Deck은 3~6장 카드가 동시에 표시될 수 있음 → 모든 카드 크기 일관성 필수
- (RULE-006) 뱃지 텍스트도 i18n 키 기반으로 제공 (ko/en 길이 차이 고려)
- CRT 테마에서 뱃지 색상이 가독성 있게 보이는지 확인

**잠재적 리스크**:

- 뱃지가 너무 많으면 카드가 복잡해 보일 수 있음 → 최대 2-3개로 제한하거나 "외 N개" 표시
- 텍스트 잘림(ellipsis)이 너무 공격적이면 의미 전달이 안 될 수 있음 → 툴팁으로 전체 텍스트 표시

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 뱃지 최대 표시 개수는?
  - Option A: 제한 없음 (wrap으로 모두 표시)
  - Option B: 최대 2개 + "외 N개" 표시
  - Option C: 최대 3개, 초과 시 첫 3개만 표시

- [ ] **Q2**: 긴 뱃지 텍스트 처리 방식?
  - Option A: **ellipsis + 툴팁**으로 전체 텍스트 확인
  - Option B: 줄바꿈 허용 (카드 높이 유동적)
  - Option C: 텍스트 축약 (예: "저해상도" → "저해상")

- [ ] **Q3**: 뱃지 위치?
  - Option A: 카드 하단 오른쪽 (비용 옆)
  - Option B: 카드 상단 오른쪽 코너
  - Option C: 비용 아래 별도 행

## 참고 자료

- `vibe/unit-plans/U-009[Mvp].md` - Action Deck 기본
- `vibe/prd.md` 6.7절 - Action Deck 요구사항
- `vibe/ref/frontend-style-guide.md` - CRT 테마 스타일 가이드
