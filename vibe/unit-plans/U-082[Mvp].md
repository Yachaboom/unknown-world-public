# U-082[Mvp]: UI 레이아웃 - Agent Console 축소 및 재화 현황 영역 확대

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-082[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 45분                              |
| 의존성    | U-049[Mvp]                        |
| 우선순위  | High (UI 가시성/데모 체감 향상)   |

## 작업 목표

**Agent Console 영역에서 사용 빈도가 낮은 부분을 축소**하고, **재화 현황(Economy HUD) 영역을 확대**하여 게임 경제 상태가 더 잘 보이도록 한다.

**배경**: 현재 Agent Console은 Plan/Queue/Badges 등 다양한 정보를 표시하지만, 실제 플레이 중에는 배지(Badges)와 현재 단계(Stage) 정도만 주로 확인한다. 반면 재화(Signal/Shard) 잔액과 비용 정보는 게임플레이의 핵심 의사결정에 중요한데 상대적으로 작게 표시되어 있다.

**완료 기준**:

- Agent Console의 **Plan/Queue 영역이 기본적으로 접히거나 축소**됨
- **재화 현황(Economy HUD) 영역이 확대**되어 잔액/비용이 한눈에 보임
- 필요 시 Agent Console을 펼쳐서 상세 정보 확인 가능 (토글)
- 배지(Badges)는 항상 보이도록 유지

## 영향받는 파일

**수정**:

- `frontend/src/components/AgentConsole.tsx` - 레이아웃 재구성, 축소/확대 토글
- `frontend/src/components/EconomyHud.tsx` - 영역 확대, 폰트/아이콘 사이즈 조정
- `frontend/src/style.css` - Agent Console/Economy HUD 크기 및 배치 CSS
- `frontend/src/stores/uiStore.ts` (또는 해당 상태 관리) - Agent Console 확장 상태

**참조**:

- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계 원칙
- `vibe/unit-plans/U-014[Mvp].md` - Economy HUD 기본 구조
- `vibe/prd.md` 6.8절 - 에이전트 동작 가시화 요구사항

## 구현 흐름

### 1단계: 현재 Agent Console 구조 분석

- 현재 Agent Console에 표시되는 정보 목록 확인:
  - Stage (현재 단계)
  - Badges (Schema OK, Economy OK 등)
  - Plan (계획)
  - Queue (작업 큐)
  - TTFB/지연 지표
- 각 영역의 사용 빈도 및 중요도 분석

### 2단계: Agent Console 축소 구조 설계

- **항상 표시**: Stage 아이콘, Badges (compact 형태)
- **기본 접힘**: Plan/Queue (펼침 버튼으로 확장)
- **접힘/펼침 토글** 구현

```tsx
// frontend/src/components/AgentConsole.tsx
const [isExpanded, setIsExpanded] = useState(false);

return (
  <div className={`agent-console ${isExpanded ? 'expanded' : 'collapsed'}`}>
    {/* 항상 표시 영역 */}
    <div className="agent-console-always">
      <div className="agent-stage">{currentStage}</div>
      <div className="agent-badges">{badges}</div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? '▲' : '▼'}
      </button>
    </div>
    
    {/* 확장 시에만 표시 */}
    {isExpanded && (
      <div className="agent-console-details">
        <div className="agent-plan">{plan}</div>
        <div className="agent-queue">{queue}</div>
      </div>
    )}
  </div>
);
```

### 3단계: Economy HUD 확대

- 재화 잔액(Signal/Shard) 폰트 사이즈 증가
- 아이콘 크기 확대 (24px → 32px)
- 비용 정보(예상 비용/확정 비용) 가시성 강화
- 거래 장부(ledger) 영역은 기존 유지 (카드 내부 스크롤)

```css
/* frontend/src/style.css */
.economy-hud {
  padding: 12px;
}

.economy-balance {
  font-size: 1.4rem;
  font-weight: bold;
}

.economy-icon {
  width: 32px;
  height: 32px;
}

.economy-cost {
  font-size: 1rem;
  margin-top: 8px;
}
```

### 4단계: 레이아웃 재배치

- Agent Console과 Economy HUD의 위치 관계 재검토
- 권장: Economy HUD를 상단 또는 더 눈에 띄는 위치로 이동
- Agent Console은 하단 또는 사이드로 배치

### 5단계: i18n 키 확인

- 토글 버튼의 aria-label 등 접근성 텍스트 i18n 처리
- `agent.expand`, `agent.collapse` 키 추가 (필요 시)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-049[Mvp]](U-049[Mvp].md) - 레이아웃/스크롤 설계 원칙
- **계획서**: [U-014[Mvp]](U-014[Mvp].md) - Economy HUD 기본 구조

**다음 작업에 전달할 것**:

- U-081: 전체 사이드바 레이아웃과 조화
- CP-MVP-03: 재화 정보가 잘 보이는 데모 루프 확인

## 주의사항

**기술적 고려사항**:

- (PRD 6.8) Agent Console은 "에이전트 동작 가시화"를 위해 상시 노출 권장 → 완전히 숨기지 않고 축소/확장 방식 채택
- (RULE-002) Economy HUD는 항상 보이는 고정 HUD로 유지
- 접힘/펼침 상태를 localStorage에 저장하여 새로고침 시에도 유지되도록 (선택)

**잠재적 리스크**:

- Agent Console을 너무 축소하면 "에이전트형 시스템" 인상이 약해질 수 있음 → Badges는 항상 보이도록 유지
- Economy HUD가 너무 크면 다른 영역을 침범할 수 있음 → max-width/max-height 제한

## 페어링 질문 (결정 필요)

- [ ] **Q1**: Agent Console 기본 상태는?
  - Option A: **기본 접힘** (Badges만 표시, 클릭으로 확장)
  - Option B: 기본 펼침 (현재와 동일)
  - Option C: 사용자 설정에 따라 기억

- [ ] **Q2**: Economy HUD 위치는?
  - Option A: 현재 위치 유지, 크기만 확대
  - Option B: 상단(Header) 영역으로 이동
  - Option C: Agent Console 상단에 통합

- [ ] **Q3**: Agent Console 확장 상태 저장?
  - Option A: 저장하지 않음 (매번 기본 상태로 시작)
  - Option B: localStorage에 저장
  - Option C: 세션 상태에 포함

## 참고 자료

- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계
- `vibe/unit-plans/U-014[Mvp].md` - Economy HUD 기본
- `vibe/prd.md` 6.8절 - 에이전트 동작 가시화
- `vibe/prd.md` 5절 - 게임 재화 시스템
