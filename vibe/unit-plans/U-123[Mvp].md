# U-123[Mvp]: Agent Console 배치 재조정 - 접기 제거 + 대기열 상단 + 배지 하단

## 메타데이터

| 항목      | 내용                                       |
| --------- | ------------------------------------------ |
| Unit ID   | U-123[Mvp]                                 |
| Phase     | MVP                                        |
| 예상 소요 | 30분                                       |
| 의존성    | U-114[Mvp]                                 |
| 우선순위  | Medium (데모 체감 / 에이전트 동작 가시화)  |

## 작업 목표

U-114에서 구현한 Agent Console의 **배지 접기(토글) 기능을 제거**하고, **대기열(Queue)을 상단, 배지(Badges)를 하단**에 배치하여 항상 모두 노출되도록 레이아웃을 재조정한다.

**배경**: U-114에서 배지를 접고 대기열을 상시 노출하는 방식으로 구현했으나, 실제 데모에서 배지가 접혀있으면 "검증 시스템"의 존재감이 약해지고, 접기/펼치기 토글이 오히려 UI 복잡성을 높인다는 피드백이 있었다. 배지와 대기열 모두 항상 보이되, **대기열(실시간 진행)을 상단에 배치하여 1차 시선을 확보**하고, **배지(검증 결과)를 하단에 배치하여 보조 정보로 제공**하는 것이 "에이전트 시스템"을 증명하는 데 더 효과적이다.

**완료 기준**:

- Agent Console에서 **접기/펼치기 토글 버튼이 제거**됨
- **대기열(Action Queue)이 상단**, **검증 배지(Badges)가 하단**에 항상 노출됨
- 배지 접힘 상태 관련 코드(`badgesExpanded`, `BadgesSummary` 접힘 모드) 제거
- 배지 실패 시 경고 아이콘은 **배지 자체가 항상 보이므로** 별도 축약 불필요 (기존 UI 유지)
- Agent Console 전체 높이가 과도하게 커지지 않도록 **컴팩트 배지 레이아웃** 유지
- 대기열 + 배지가 동시에 보일 때 시각적 구분(구분선 또는 간격)이 명확함

## 영향받는 파일

**수정**:

- `frontend/src/components/AgentConsole.tsx` - 접기 토글 제거, 대기열→상단 / 배지→하단 순서 변경, `badgesExpanded` 상태 제거
- `frontend/src/style.css` - 접기 관련 스타일 제거, 대기열/배지 항상 노출 레이아웃, 구분선/간격 추가
- `frontend/src/locales/ko-KR/translation.json` - 배지 토글 관련 i18n 키 제거 (불필요 시)
- `frontend/src/locales/en-US/translation.json` - 동일

**참조**:

- `vibe/unit-results/U-114.md` - Agent Console 접기 구현 결과
- `vibe/unit-results/U-082.md` - Agent Console 축소 결과
- `vibe/prd.md` 6.8절 - 에이전트 동작 가시화(Action Queue/Badges)

## 구현 흐름

### 1단계: 접기 토글 제거

- `AgentConsole.tsx`에서 `badgesExpanded` 상태 변수 제거
- 토글 버튼(`▼/▲`) 렌더링 제거
- `BadgesSummary`의 접힘 모드(축약 표시) 제거 — 배지가 항상 보이므로 불필요
- 접기/펼치기 관련 CSS 클래스 제거

### 2단계: 레이아웃 순서 변경

- 기존: `[StreamingStatus] [ModelLabel] [Queue(항상)] [Badges(접힘)]`
- 변경: `[StreamingStatus] [ModelLabel] [Queue(항상)] [구분선] [Badges(항상)]`
- 대기열이 상단에서 실시간 진행을 보여주고, 배지가 하단에서 검증 결과를 보여주는 자연스러운 흐름

```tsx
// AgentConsole.tsx (개념)
return (
  <div className="agent-console">
    <StreamingStatus />
    <ModelLabelBadge />
    {/* 대기열: 상단 항상 노출 */}
    <div className="agent-queue-section">{queue}</div>
    {/* 구분선 */}
    <hr className="agent-console-divider" />
    {/* 배지: 하단 항상 노출 */}
    <div className="agent-badges-section">{badges}</div>
  </div>
);
```

### 3단계: 배지 컴팩트 레이아웃 유지

- 배지가 항상 보이므로 높이가 과도하게 커지지 않도록 `badges-grid`를 1줄 또는 2x2 그리드로 유지
- RepairTrace는 배지 아래에 조건부 표시 (repair 발생 시에만)
- 배지 아이콘 크기를 기존 컴팩트 모드와 동일하게 유지

### 4단계: 스타일 정리 및 접근성

- 접기 관련 CSS(`.agent-badges-collapsed`, `.badge-toggle-btn` 등) 제거
- 구분선 스타일: CRT 테마에 맞는 미세한 구분선 (예: `border-color: var(--border-color); opacity: 0.3`)
- `aria-expanded` 속성 제거 (접기가 없으므로)
- 스크린리더 레이블 정리

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-114[Mvp]](../unit-results/U-114.md) - Agent Console 접기 구현 (수정 대상)
- **결과물**: [U-082[Mvp]](../unit-results/U-082.md) - Agent Console 축소 레이아웃 기준선

**다음 작업에 전달할 것**:

- CP-MVP-03: "대기열 + 배지 상시 노출" 상태에서 데모 체감 검증
- U-119[Mmp]: WIG 기반 폴리시에서 Agent Console 레이아웃 최종 점검

## 주의사항

**기술적 고려사항**:

- (PRD 6.8) 접기 제거로 배지가 항상 보이면 "검증 시스템" 가시성이 향상되나, Agent Console 전체 높이가 커질 수 있음 → 컴팩트 배지 그리드로 높이 제어
- (RULE-008) 배지에 프롬프트 원문/내부 추론은 노출하지 않음 (기존 정책 유지)
- U-082에서 확보한 축소 범위를 유지하면서 배지를 항상 표시해야 하므로, 배지 폰트/아이콘 크기 튜닝이 필요할 수 있음

**잠재적 리스크**:

- 대기열 + 배지가 모두 보이면 Agent Console 영역이 커져 다른 패널(Economy HUD 등)을 압박할 수 있음 → 배지 1줄 그리드 + 최소 높이로 제어
- 모바일/좁은 뷰포트에서 레이아웃이 깨질 수 있음 → 반응형 미디어쿼리로 배지를 더 작게 표시

## 페어링 질문 (결정 필요)

- [x] **Q1**: 대기열과 배지 사이 구분은?
  - ✅Option A: **얇은 구분선** (CRT 테마, 반투명)
  - Option B: 간격만 (구분선 없이 padding)
  - Option C: 라벨 섹션 헤더 ("Queue" / "Verification")

## 참고 자료

- `vibe/unit-results/U-114.md` - Agent Console 접기 구현
- `vibe/unit-results/U-082.md` - Agent Console 축소
- `vibe/prd.md` 6.8절 - 에이전트 동작 가시화
- `vibe/ref/frontend-style-guide.md` - CRT 테마 규칙
