# U-131[Mvp]: 추상적 최종 목표(Overarching Mystery) 시스템 — Quest/스토리 방향성 정렬

## 메타데이터

| 항목      | 내용                                                 |
| --------- | ---------------------------------------------------- |
| Unit ID   | U-131[Mvp]                                           |
| Phase     | MVP                                                  |
| 예상 소요 | 45분                                                 |
| 의존성    | U-078[Mvp]                                           |
| 우선순위  | High (스토리 일관성 / 데모 체감 핵심)                |

## 작업 목표

모든 프로필에 **추상적이고 미스터리한 최종 목표(Overarching Mystery)**를 부여하여, 턴이 진행될수록 Quest와 스토리가 **점점 멀어지는 문제를 구조적으로 해결**한다. 이 최종 목표는 초기 이야기와 무관하게 굉장히 추상적이므로, 어떤 방향으로 스토리가 전개되어도 자연스럽게 포괄할 수 있으며, 모든 턴의 내러티브 생성 시 **맥락(context)**으로 주입되어 이야기의 방향성을 일정 부분 정렬한다.

**배경**: 현재 Quest 시스템(U-078)은 주 목표/서브 목표를 GM이 동적으로 생성·갱신하지만, 목표가 스토리 진행과 맞지 않거나, 목표와 내러티브가 별개의 방향으로 발산하는 경우가 발생한다. 이는 GM이 매 턴마다 "이전 맥락"만 보고 다음 행동을 결정하기 때문이다. **"모든 세션에 공통된 미스터리한 최종 지향점"**을 시스템 프롬프트에 고정하면, GM이 항상 이 지향점을 의식하며 내러티브와 퀘스트를 생성하므로 정합성이 유지된다.

**완료 기준**:

- 3종 프로필 모두에 **공통 Overarching Mystery** 텍스트가 시스템 프롬프트에 주입됨
- Overarching Mystery는 **추상적·미스터리·해석 여지**가 크어 어떤 장르/스토리에도 자연스럽게 적용됨
- GM이 생성하는 주 목표(main quest)가 Overarching Mystery의 **하위 단계/변주**로 느껴짐
- 5턴 이상 진행 후에도 스토리와 퀘스트의 방향이 발산하지 않음 (정성적 확인)
- 시스템 프롬프트에 Overarching Mystery 섹션이 ko/en 양 언어로 존재
- 프롬프트 원문은 UI에 노출되지 않음 (RULE-007/008)

## 영향받는 파일

**수정**:

- `backend/prompts/system/game_master.ko.md` - Overarching Mystery 섹션 추가 (한국어)
- `backend/prompts/system/game_master.en.md` - Overarching Mystery 섹션 추가 (영어)
- `backend/prompts/turn/turn_output_instructions.ko.md` - Quest 생성 시 Overarching Mystery 참조 지침 보강
- `backend/prompts/turn/turn_output_instructions.en.md` - 동일 (영어)

**참조**:

- `vibe/unit-results/U-078[Mvp].md` - 게임 목표 시스템 강화 (주 목표/서브 목표 구조)
- `vibe/prd.md` 6.1, 6.8절 - 에이전트형 GM 엔진, 목표 시스템
- `frontend/src/data/demoProfiles.ts` - 프로필별 초기 퀘스트 (라벨 정합 확인)

## 구현 흐름

### 1단계: Overarching Mystery 텍스트 설계

- 3종 프로필 공통으로 적용할 **추상적 최종 목표 텍스트**를 설계:
  - 예시 (en): *"Somewhere beyond the veil of this world lies the Echo — a resonance that binds all stories, all choices, all forgotten truths. You do not yet know its shape, but every step you take draws you closer to its frequency. The Echo remembers what you have forgotten."*
  - 예시 (ko): *"이 세계의 장막 너머 어딘가에 '메아리(Echo)'가 있다 — 모든 이야기, 모든 선택, 모든 잊힌 진실을 묶는 공명. 당신은 아직 그 형체를 모르지만, 당신의 모든 발걸음이 그 주파수에 가까워지고 있다. 메아리는 당신이 잊은 것을 기억한다."*
- 핵심 원칙: **구체적 목표가 아닌, 해석의 여지가 큰 메타포/미스터리**

### 2단계: 시스템 프롬프트에 Overarching Mystery 섹션 추가

- `game_master.{ko,en}.md`에 `<overarching_mystery>` XML 태그 섹션 추가
- GM에게 다음을 지시:
  1. **매 턴 내러티브에 Overarching Mystery의 힌트/분위기를 은은하게 반영**할 것 (노골적 언급 금지)
  2. **주 목표(main quest)는 Overarching Mystery의 하위 단계/변주로 생성**할 것
  3. 서브 목표는 주 목표의 구체적 행동으로 유지 (기존 U-078 정책)
  4. 플레이어가 Overarching Mystery에 대해 질문하면 **모호하지만 의미심장한 힌트**만 제공

### 3단계: Turn Output Instructions 보강

- `turn_output_instructions.{ko,en}.md`의 Quest 생성 규칙에:
  - "주 목표 생성 시 Overarching Mystery와의 연결성을 고려할 것" 지침 추가
  - "주 목표 라벨/설명에 미스터리 요소를 간접적으로 포함할 것" 지침 추가

### 4단계: 검증

- 각 프로필(Narrator/Explorer/Tech)로 5턴 이상 진행:
  - 내러티브에 Overarching Mystery의 분위기/힌트가 자연스럽게 스며드는지 확인
  - 주 목표가 Overarching Mystery와 연결되는 느낌인지 확인
  - 스토리와 퀘스트가 발산하지 않고 일관된 방향성을 유지하는지 확인
- ko/en 양 언어에서 동일하게 동작하는지 확인
- 프롬프트 원문이 UI(에이전트 콘솔 등)에 노출되지 않는지 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-078[Mvp]](../unit-results/U-078[Mvp].md) - 게임 목표 시스템 (주 목표/서브 목표 구조, 프롬프트 지침)

**다음 작업에 전달할 것**:

- U-133[Mvp]: 프로필 시작 이미지-스토리 정합성에서 Overarching Mystery를 첫 턴 맥락으로 활용
- CP-MVP-03: 데모 루프에서 "스토리-퀘스트 일관성" 검증

## 주의사항

**기술적 고려사항**:

- (RULE-007/008) Overarching Mystery 텍스트는 시스템 프롬프트 내부에만 존재하며, UI/로그에 원문을 노출하지 않음
- (PRD 6.1) GM은 "출력이 UI/상태/비용을 포함한 구조화 결과"를 반환해야 하므로, Overarching Mystery는 **프롬프트 레벨 지침**으로만 동작하고 TurnOutput 스키마에는 영향 없음
- 프롬프트 `.md` 파일 수정 시 XML 태그 표준(`<overarching_mystery>`) 준수 (U-046 정책)
- Overarching Mystery 텍스트가 너무 구체적이면 특정 장르에만 맞게 되므로, **의도적으로 추상적/범용**으로 유지

**잠재적 리스크**:

- GM이 Overarching Mystery를 과도하게 강조하면 스토리가 획일화될 수 있음 → "은은한 힌트" 수준으로 지침 강도 조절, "노골적 언급 금지" 명시
- 5턴 미만의 짧은 세션에서는 효과가 미미할 수 있음 → 데모 10분 루프(약 5~8턴)에서는 충분히 체감 가능하도록 첫 턴부터 분위기를 시작

## 페어링 질문 (결정 필요)

- [x] **Q1**: Overarching Mystery의 구체적 텍스트는?
  - ✅Option A: **"Echo(메아리)"** 컨셉 — 모든 이야기/선택/진실을 묶는 공명 (위 예시)
  - Option B: **"The Threshold(문턱)"** 컨셉 — 알려진 것과 미지 사이의 경계를 넘으려는 여정
  - Option C: 개발자가 직접 작성

- [x] **Q2**: GM이 Overarching Mystery를 참조하는 강도는?
  - ✅Option A: **매 턴 은은하게** — 분위기/단어 선택에 반영 (권장)
  - Option B: **3~5턴마다 직접적 힌트** — 간헐적으로 미스터리 이벤트 발생
  - Option C: **주 목표 전환 시에만** — 새 주 목표 생성 시에만 연결

## 참고 자료

- `vibe/unit-results/U-078[Mvp].md` - 게임 목표 시스템
- `backend/prompts/system/game_master.ko.md` - 현재 시스템 프롬프트
- `vibe/prd.md` 6.1, 6.8절 - 에이전트형 GM, 목표 시스템
- 로그라이크 게임의 "Overarching Goal" 패턴 (예: Hades의 "탈출", Slay the Spire의 "정상")
