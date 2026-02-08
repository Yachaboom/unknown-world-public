# U-114[Mvp]: Agent Console 레이아웃 변경 - 검증배지 접기 + 대기열(Queue) 상시 노출

## 메타데이터

| 항목      | 내용                                       |
| --------- | ------------------------------------------ |
| Unit ID   | U-114[Mvp]                                 |
| Phase     | MVP                                        |
| 예상 소요 | 45분                                       |
| 의존성    | U-082[Mvp]                                 |
| 우선순위  | Medium (데모 체감/에이전트 동작 가시화)    |

## 작업 목표

Agent Console의 **검증 배지(Schema OK, Economy OK 등)를 기본 접힌 상태**로 두고, **대기열(Action Queue)을 항상 노출**하도록 레이아웃을 변경한다. 에이전트의 단계별 진행 상황(Queue)이 실시간으로 보이는 것이 "채팅이 아닌 에이전트 시스템"을 증명하는 데 검증 배지보다 효과적이다.

**배경**: U-082에서 Agent Console을 축소하고 배지를 항상 노출하는 방식으로 구현했으나, 실제 데모에서 배지(턴 종료 후 확정되는 정보)보다 **대기열(턴 처리 중 실시간 진행되는 정보)**가 에이전트 동작을 더 생동감 있게 보여준다. 검증 배지는 필요 시 펼쳐 확인할 수 있도록 접고, 대기열이 상시 보이도록 전환한다.

**완료 기준**:

- Agent Console에서 **Action Queue(대기열/단계 진행)가 항상 노출**됨
- **검증 배지(Badges)가 기본 접힌 상태**이며, 토글 버튼으로 펼침 가능
- 배지 접힌 상태에서도 **실패 배지(fail)는 경고 아이콘으로 축약 표시** (최소 가시성 보장)
- 대기열 진행 중 단계(stage)가 실시간으로 업데이트됨
- Agent Console 전체 크기가 U-082에서 확보한 축소 범위를 유지하거나 더 줄어듦

## 영향받는 파일

**수정**:

- `frontend/src/components/AgentConsole.tsx` - 배지/대기열 영역 레이아웃 재구성, 배지 접힘 토글 추가, 대기열 상시 노출
- `frontend/src/style.css` - 배지 접힘/펼침 스타일, 대기열 상시 노출 스타일, 실패 배지 축약 아이콘
- `frontend/src/locales/ko-KR/translation.json` - 배지 토글 aria-label 등
- `frontend/src/locales/en-US/translation.json` - 동일 키 영문

**참조**:

- `vibe/unit-results/U-082.md` - Agent Console 축소 결과
- `vibe/unit-plans/U-008[Mvp].md` - Agent Console 기본 구조
- `vibe/prd.md` 6.8절 - 에이전트 동작 가시화(Action Queue/Badges)

## 구현 흐름

### 1단계: Agent Console 영역 재배치 설계

- 현재 구조(U-082 이후): `[Stage] [Badges(항상)] [Plan/Queue(접힘)]`
- 목표 구조: `[Stage] [Queue(항상)] [Badges(접힘)]`
- Queue 영역에 현재 진행 단계(Parse→Validate→Plan→Resolve→Render→Verify→Commit)와 소요시간을 표시
- 배지 영역은 접힌 상태에서 실패 시에만 경고 아이콘(⚠️) 축약 표시

### 2단계: 배지 접힘/펼침 토글 구현

- 기본 상태: 접힘(배지 숨김)
- 접힌 상태에서: 모든 배지 OK → 아무것도 표시하지 않음 / 실패 배지 있으면 → 경고 아이콘 + 실패 개수 표시
- 펼침 상태: 기존 배지 UI 그대로 표시
- 토글 버튼(▼/▲)으로 전환

```tsx
// AgentConsole.tsx (개념)
const [badgesExpanded, setBadgesExpanded] = useState(false);
const hasFailBadge = badges.some(b => b.includes('fail'));

return (
  <div className="agent-console">
    <div className="agent-stage">{currentStage}</div>
    {/* 대기열: 항상 노출 */}
    <div className="agent-queue-always">{queue}</div>
    {/* 배지: 기본 접힘 */}
    <div className="agent-badges-section">
      <button onClick={() => setBadgesExpanded(!badgesExpanded)}>
        {hasFailBadge && !badgesExpanded && <span className="badge-fail-indicator">⚠️</span>}
        {badgesExpanded ? '▲' : '▼'}
      </button>
      {badgesExpanded && <div className="agent-badges">{badges}</div>}
    </div>
  </div>
);
```

### 3단계: 대기열 상시 노출 UI

- Queue 영역에 현재 진행 단계를 단계 바(progress bar) 또는 스텝 인디케이터로 표시
- 각 단계: 대기(dim) / 진행중(glow+pulse) / 완료(check) / 실패(red) 상태 구분
- 소요시간 표시(선택): 각 단계별 ms 또는 전체 경과 시간

### 4단계: i18n 및 접근성

- 배지 토글 버튼: `aria-label="agent.badges_toggle"` → i18n 키 추가
- 실패 경고 아이콘: `aria-label="agent.badge_fail_warning"` → i18n 키 추가
- `prefers-reduced-motion` 시 Queue 애니메이션 완화

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-082[Mvp]](../unit-results/U-082.md) - Agent Console 축소 레이아웃, Economy HUD 확대 결과
- **결과물**: [U-008[Mvp]](../unit-results/U-008[Mvp].md) - Agent Console 기본 구조(Stage/Badges/Queue)

**다음 작업에 전달할 것**:

- CP-MVP-03: 대기열 상시 노출 상태에서 "에이전트 시스템" 데모 체감 검증
- U-087: 입력 잠금 시 대기열 진행 상황이 실시간으로 보이는지 통합 확인

## 주의사항

**기술적 고려사항**:

- (PRD 6.8) Agent Console은 "에이전트 동작 가시화"를 위해 상시 노출 → 배지를 접어도 대기열+단계가 보이므로 가시화 요구사항 충족
- (RULE-008) 프롬프트 원문/내부 추론은 대기열에 노출하지 않음 → 단계 이름(Parse/Validate 등)과 소요시간/상태만 표시
- U-082에서 확보한 Agent Console 축소 범위를 유지 → 배지를 접으면 오히려 공간이 절약됨

**잠재적 리스크**:

- 배지가 접혀있으면 "검증 시스템"의 존재감이 약해질 수 있음 → 실패 시 경고 아이콘으로 최소 가시성 보장
- 대기열이 턴 처리 중에만 활성화되므로 idle 상태에서는 빈 영역 → "대기 중" 또는 마지막 처리 결과 요약을 표시

## 페어링 질문 (결정 필요)

- [x] **Q1**: idle 상태(턴 미처리)에서 Queue 영역에 무엇을 표시할까?
  - ✅Option A: "대기 중..." 텍스트
  - Option B: 마지막 처리의 단계 요약(완료된 상태)
  - Option C: 빈 상태 유지

- [x] **Q2**: 배지 접힌 상태에서 모두 OK일 때 표시?
  - Option A: 아무것도 표시하지 않음(접힌 상태 유지)
  - Option B: 작은 체크 아이콘(✅) 하나만 표시
  - Option C: "4/4 OK" 같은 축약 텍스트

## 참고 자료

- `vibe/unit-results/U-082.md` - Agent Console 축소 구현 결과
- `vibe/unit-results/U-008[Mvp].md` - Agent Console 기본 구조
- `vibe/prd.md` 6.8절 - 에이전트 동작 가시화
- `vibe/ref/frontend-style-guide.md` - CRT 테마 규칙
