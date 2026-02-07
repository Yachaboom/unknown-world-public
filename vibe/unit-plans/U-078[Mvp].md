# U-078[Mvp]: 게임 목표 시스템 강화 - 명확한 목표 제시 및 진행 가이드

## 메타데이터

| 항목      | 내용                                      |
| --------- | ----------------------------------------- |
| Unit ID   | U-078[Mvp]                                |
| Phase     | MVP                                       |
| 예상 소요 | 60분                                      |
| 의존성    | U-013[Mvp], U-015[Mvp]                    |
| 우선순위  | High (게임 방향성/몰입감 핵심)            |
| **상태**  | **✅ 완료** (2026-02-08)                  |
| **결과**  | `vibe/unit-results/U-078[Mvp].md`         |
| **런북**  | `vibe/unit-runbooks/U-078-objective-system-runbook.md` |

## 작업 목표

게임 시작 시 **명확한 주 목표(Main Objective)**를 제시하고, 진행 중에도 **현재 무엇을 해야 하는지** 플레이어가 항상 알 수 있도록 목표 시스템을 강화한다. 목표 달성 시 보상(재화/아이템)을 명시적으로 지급하여 게임 루프를 완성한다.

**배경**: 현재 Quest 패널(U-013)은 퀘스트 목록을 표시하지만, "게임을 어떻게 진행해야 하는지"에 대한 가이드가 부족할 수 있다. 특히 처음 플레이하는 사용자는 자유도 높은 환경에서 방향을 잃기 쉽다. 명확한 목표 → 진행 → 달성 → 보상 루프를 확립하여 몰입감과 방향성을 제공한다.

**핵심 원칙**:
- **항상 하나의 주 목표**가 있어야 한다 (달성 시 다음 목표로 자동 전환 또는 엔딩)
- **서브 목표**는 주 목표 달성을 위한 단계별 가이드 역할
- **목표 없이 방황하는 상태**를 최소화 (목표 완료 → 즉시 새 목표 또는 "자유 탐색" 모드 명시)

**완료 기준**:

- 게임 시작(데모 프로필 시작) 시 **주 목표(Main Objective)**가 Quest 패널 상단에 표시됨
- 주 목표 아래에 **서브 목표(Sub-objectives)**가 체크리스트로 표시되며, 달성 시 체크됨
- 서브 목표 달성 시 **보상(Signal/아이템)**이 즉시 지급되고 UI에 피드백 표시
- 주 목표 달성 시 **다음 주 목표로 자동 전환** 또는 **엔딩 트리거** (게임 종류에 따라)
- GM 프롬프트에 "매 턴 목표 진행 상황을 반영"하는 지침 포함
- 목표가 없는 상태에서는 "자유 탐색" 또는 "새 모험 시작" 안내 표시

## 영향받는 파일

**수정**:

- `frontend/src/components/QuestPanel.tsx` - 주 목표/서브 목표 분리 UI, 진행률 바, 보상 표시
- `frontend/src/stores/worldStore.ts` - 현재 목표 상태 관리 (`currentObjective`, `subObjectives`)
- `backend/prompts/turn/turn_output_instructions.ko.md` - 목표 반영 지침 추가
- `backend/prompts/turn/turn_output_instructions.en.md` - 동일
- `backend/src/unknown_world/models/turn.py` - TurnOutput의 `world.objectives` 스키마 보강
- `frontend/src/locales/ko-KR/translation.json` - 목표 관련 i18n 키 추가
- `frontend/src/locales/en-US/translation.json` - 동일

**생성**:

- `frontend/src/components/ObjectiveTracker.tsx` - (선택) 화면 상단/하단에 항상 보이는 미니 목표 트래커

**참조**:

- `vibe/unit-plans/U-013[Mvp].md` - Quest 패널 기본 구조
- `vibe/unit-plans/U-015[Mvp].md` - 데모 프로필(초기 목표 설정)
- `vibe/prd.md` 6.7절 - Quest/Objective Panel 요구

## 구현 흐름

### 1단계: 목표 데이터 모델 정의

- TurnOutput의 `world.objectives` 구조 확정:

```typescript
interface Objectives {
  main: {
    id: string;
    title: string;
    description: string;
    progress: number; // 0-100
    reward?: { signal?: number; items?: string[] };
  } | null;
  sub: Array<{
    id: string;
    title: string;
    completed: boolean;
    reward?: { signal?: number; items?: string[] };
  }>;
}
```

### 2단계: Quest 패널 UI 개선

- **주 목표 영역**: 강조 표시, 진행률 바, 보상 미리보기
- **서브 목표 리스트**: 체크박스 스타일, 완료 시 취소선 + 보상 표시
- 목표가 없을 때 "자유 탐색 중" 또는 "새 모험 시작" 버튼

```tsx
// frontend/src/components/QuestPanel.tsx
<div className="quest-panel">
  {objectives.main ? (
    <>
      <div className="main-objective">
        <h3>🎯 {objectives.main.title}</h3>
        <p>{objectives.main.description}</p>
        <ProgressBar value={objectives.main.progress} />
        {objectives.main.reward && (
          <span className="reward-preview">
            보상: {objectives.main.reward.signal} Signal
          </span>
        )}
      </div>
      <div className="sub-objectives">
        {objectives.sub.map(sub => (
          <div key={sub.id} className={sub.completed ? 'completed' : ''}>
            <Checkbox checked={sub.completed} />
            <span>{sub.title}</span>
          </div>
        ))}
      </div>
    </>
  ) : (
    <div className="no-objective">
      {t('quest.free_exploration')}
    </div>
  )}
</div>
```

### 3단계: GM 프롬프트 지침 추가

- `turn_output_instructions.*.md`에 목표 관련 지침 추가:
  - "매 턴 시작 시 현재 목표 상태를 확인하고, 플레이어 행동이 목표에 어떻게 기여하는지 반영한다"
  - "서브 목표 달성 조건을 구체적으로 정의하고, 달성 시 completed=true로 설정한다"
  - "모든 서브 목표 달성 시 주 목표 progress를 100으로 설정하고, 다음 주 목표를 제안한다"

### 4단계: 보상 지급 흐름

- 서브 목표 완료 시:
  - 내러티브에 "목표 달성! +10 Signal" 형태로 표시
  - Economy ledger에 기록
  - UI 피드백(애니메이션/사운드 효과 - 선택)
- 주 목표 완료 시:
  - 큰 보상 지급
  - 다음 목표 또는 엔딩 트리거

### 5단계: 데모 프로필 초기 목표 설정

- `U-015`의 데모 프로필에 초기 목표 데이터 포함
- 각 프로필(Narrator/Explorer/Tech)별로 다른 시작 목표

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-013[Mvp]](U-013[Mvp].md) - Quest 패널 기본 구조
- **계획서**: [U-015[Mvp]](U-015[Mvp].md) - 데모 프로필(초기 상태 설정)
- **참조**: `backend/prompts/turn/turn_output_instructions.*.md` - 턴 출력 지침

**다음 작업에 전달할 것**:

- U-023(Autopilot): 자동 플레이 시 목표 기반 플랜 생성
- U-025(엔딩 리포트): 달성한 목표 타임라인 포함
- CP-MVP-03: "목표 달성 → 보상" 데모 시나리오

## 주의사항

**기술적 고려사항**:

- (RULE-002) Quest 패널은 항상 보이는 고정 HUD로 유지
- (RULE-005) 보상 지급 시 Economy 규칙 준수 (ledger 기록, 잔액 일관성)
- (RULE-006) 목표 텍스트는 세션 언어(ko/en)에 맞게 출력

**잠재적 리스크**:

- GM이 목표를 무시하고 자유롭게 스토리를 진행할 수 있음 → 프롬프트 지침 강화 + 검증 로직
- 목표가 너무 쉽거나 어려우면 몰입 저하 → 데모 프로필에서 밸런스 조정
- 서브 목표가 너무 많으면 복잡함 → 한 번에 최대 3~5개 권장

## 페어링 질문 (결정 필요)

- [x] **Q1**: 주 목표 없이 플레이 가능한 "자유 탐색" 모드를 허용할까?
  - Option A: 항상 주 목표 필수 (달성 시 자동으로 다음 목표 설정)
  - Option B: "자유 탐색" 모드 허용 (플레이어가 원하면 목표 없이 진행)
  - ✅Option C: 데모에서는 항상 목표 필수, 전체 게임에서는 선택

- [x] **Q2**: 목표 진행 상황 표시 위치?
  - Option A: Quest 패널에만 표시
  - ✅Option B: 화면 상단에 미니 트래커 추가 (항상 보임)
  - Option C: 화면 하단에 진행률 바 (ActionDeck 근처)

- [x] **Q3**: 서브 목표 달성 보상?
  - ✅Option A: Signal만 지급 (단순)
  - Option B: Signal + 확률적 아이템 지급
  - Option C: 서브 목표별로 다른 보상 (GM이 결정)

- [x] **Q4**: 목표 달성 피드백 강도?
  - Option A: 텍스트만 ("목표 달성!")
  - ✅Option B: 텍스트 + UI 애니메이션 (체크 효과)
  - Option C: 텍스트 + 애니메이션 + 사운드 효과

## 참고 자료

- `vibe/unit-plans/U-013[Mvp].md` - Quest 패널 기본
- `vibe/unit-plans/U-015[Mvp].md` - 데모 프로필
- `vibe/prd.md` 6.7절 - Quest/Objective Panel
- `vibe/prd.md` 7절 - 사용자 여정(목표 기반 진행)
