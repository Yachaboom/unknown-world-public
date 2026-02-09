# U-137[Mvp]: Signal 획득-소비 밸런스 조정 — 보상 상향 및 소비 최적화

## 메타데이터

| 항목      | 내용                                                         |
| --------- | ------------------------------------------------------------ |
| Unit ID   | U-137[Mvp]                                                   |
| Phase     | MVP                                                          |
| 예상 소요 | 30분                                                         |
| 의존성    | U-136[Mvp]                                                   |
| 우선순위  | High (게임 플레이 지속성 + 데모 체감 핵심)                   |

## 작업 목표

Signal 소비 대비 획득이 너무 낮아 **플레이 몇 턴 만에 재화 고갈**이 발생하는 문제를 해결하기 위해, 프롬프트 지시문과 데모 프로필 초기 재화를 조정하여 **10분 데모 루프(15~25턴)** 동안 재화 고갈 없이 플레이할 수 있는 밸런스를 달성한다.

**배경**: 현재 게임 경제의 문제점:
1. **소비**: 일반 턴 비용 3~8 Signal, 고비용 행동 10~15 Signal → 10턴이면 약 50~80 Signal 소비
2. **획득**: 퀘스트 완료 보상(reward_signal)이 실제로 balance_after에 반영되지 않음(U-136에서 수정), 무료 탐색/수집 카드(earn_*)의 보상이 낮거나 빈도가 부족
3. **결과**: 초기 Signal 100 기준, 10~15턴 내에 잔액 고갈 → 대체 행동(텍스트만)으로 전환 → 게임 체감 급격히 저하

U-136에서 `gains` 필드가 추가되어 보상이 검증을 통과하게 되면, 본 유닛에서 **실제 보상 수치와 빈도를 조정**하여 플레이어블 밸런스를 달성한다.

**완료 기준**:

- 데모 프로필 초기 Signal을 현실적 수준으로 조정 (필요 시 상향)
- 프롬프트 지시문에서 **턴당 기본 보상(Base Reward)** 규칙 신설 — 매 턴 1~3 Signal 자동 획득
- 퀘스트 완료 보상(reward_signal) 기본값 상향 (5~10 → 8~15)
- 무료 탐색 카드(earn_*)의 보상 명시 강화 — 성공 시 3~8 Signal 획득
- 10분 데모 루프(15~25턴) 시뮬레이션에서 잔액이 0에 도달하지 않음
- low_balance_warning 트리거 빈도가 전체 턴의 30% 이하

## 영향받는 파일

**수정**:

- `backend/prompts/turn/turn_output_instructions.en.md` — 경제 밸런스 규칙 섹션 보강:
  - 턴당 기본 보상(Base Reward) 규칙 추가
  - 퀘스트 보상 기본값 가이드라인 상향
  - earn_* 카드 보상 수치 명시
  - gains 필드 활용 예시 강화
- `backend/prompts/turn/turn_output_instructions.ko.md` — 동일 (한국어)
- `frontend/src/data/demoProfiles.ts` — 초기 Signal 수치 조정 (필요 시: 100 → 120~150)
- `backend/prompts/system/game_master.en.md` — 경제 밸런스 원칙 추가 (시스템 프롬프트 레벨)
- `backend/prompts/system/game_master.ko.md` — 동일 (한국어)

**참조**:

- `vibe/prd.md` 5절 — 게임 재화 시스템 (획득 루프/소비 정책)
- `vibe/unit-plans/U-136[Mvp].md` — Economy 검증 보상 반영 (gains 필드)
- `vibe/unit-results/U-079[Mvp].md` — 재화 부족 시 이미지 허용 + 획득 경로 다양화
- `frontend/src/stores/worldStore.ts` — 프론트엔드 잔액 업데이트 로직

## 구현 흐름

### 1단계: 현재 경제 밸런스 분석

- 현재 프롬프트에서 지시하는 비용/보상 수치 정리:
  - 일반 행동: Signal 2~8
  - 고비용 행동: Signal 10~15
  - 이미지 생성: Signal 0 (이미지는 별도 비용 없음, 모델 비용만)
  - 퀘스트 보상: reward_signal 5~10 (프롬프트 기준)
  - 무료 탐색: earn_* 카드 존재하지만 보상 수치 미명시
- 10턴 시뮬레이션: 초기 100 - (평균 5 × 10턴) = 50 (보상 미반영 시)
- 25턴 시뮬레이션: 초기 100 - (평균 5 × 25턴) = -25 (명확한 고갈)

### 2단계: 밸런스 목표 설정

- **목표**: 25턴 후에도 Signal ≥ 15 유지
- **수단**:
  - 턴당 기본 보상(Base Reward): 매 턴 1~3 Signal 자동 획득 (생존 보상)
  - 퀘스트 보상 상향: 서브 퀘스트 5~8, 메인 퀘스트 10~15
  - 무료 탐색 보상 명시: earn_* 카드 성공 시 3~8 Signal
  - 초기 Signal 조정: 100 → 120 (소폭 상향, 여유분 제공)
- **시뮬레이션 검증**:
  - 25턴 × 평균 비용 5 = 125 소비
  - 25턴 × 평균 기본 보상 2 = 50 획득
  - 5회 퀘스트 완료 × 평균 8 = 40 획득
  - 3회 탐색 카드 × 평균 5 = 15 획득
  - 잔액: 120 - 125 + 50 + 40 + 15 = **100** (건강한 수준)

### 3단계: 프롬프트 지시문 수정

- `turn_output_instructions.{en,ko}.md`에 추가:

```markdown
### Economy Balance Rules (U-137)

#### Base Reward (Every Turn)
- Every turn, the player earns 1-3 Signal as a base survival reward.
- Set gains.signal >= 1 for every turn, even if no quest is completed.
- Higher base reward (2-3) for risky or costly actions.

#### Quest Rewards
- Sub-objective completion: reward_signal = 5-8
- Main objective completion: reward_signal = 10-15
- When awarding quest rewards, add them to gains.signal.

#### Exploration Rewards (earn_* cards)
- When player chooses an earn_* card, award 3-8 Signal on success.
- Set gains.signal accordingly in the economy output.

#### Balance Target
- Aim to keep the player's signal balance above 15 at all times.
- If balance_after.signal < 10, increase base reward to 3 and provide earn_* cards.
```

### 4단계: 데모 프로필 초기 재화 조정

- `demoProfiles.ts`에서 초기 Signal 확인:
  - 현재: 각 프로필 Signal 100
  - 조정: 120으로 상향 (25턴 여유분 제공)
- Memory Shard는 현행 유지 (5)

### 5단계: 시스템 프롬프트 보강

- `game_master.{en,ko}.md`에 경제 밸런스 원칙 추가:
  - "The economy should never feel punishing. Players should always have enough Signal to take meaningful actions."
  - "Every turn provides a small survival reward (1-3 Signal) to prevent total depletion."

### 6단계: 실플레이 검증

- 3종 프로필 각각 15~25턴 플레이:
  - Signal 잔액이 0에 도달하지 않는지 확인
  - low_balance_warning이 전체 턴의 30% 이하인지 확인
  - 대체 행동(텍스트만) 강제 전환이 발생하지 않는지 확인
  - gains 필드가 매 턴 1 이상 채워지는지 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: U-136[Mvp] — `gains` 필드가 EconomyOutput에 추가되어 보상이 검증을 통과하는 구조
- **결과물**: U-079[Mvp] — 재화 부족 시 이미지 허용 + earn_* 카드 도입

**다음 작업에 전달할 것**:

- **CP-MVP-03**: 10분 데모 루프에서 경제 밸런스가 건강하게 유지되는지 검증
- **U-119[Mmp]**: WIG 폴리시에서 경제 체감(풍족/궁핍) 최종 튜닝

## 주의사항

**기술적 고려사항**:

- (RULE-005) 잔액 음수 금지 규칙은 불변 — 밸런스 조정은 "음수 방지"가 아니라 "충분한 양수 유지"가 목표
- (PRD 5.4-5.5) 소비 정책(텍스트 턴 소량, 이미지 중~대량)은 유지하되, 획득 루프를 강화하여 순소비율을 낮춤
- (U-136) `gains` 필드의 MAX_SINGLE_TURN_REWARD 상한과 본 유닛의 보상 수치가 충돌하지 않도록 정합 확인
- 프롬프트 변경은 GM의 비결정적 응답에 의존하므로, "정확한 수치"보다 "가이드라인 범위"로 지시
- 기본 보상(Base Reward)은 **모든 턴에 적용**되므로, 누적 효과가 클 수 있음 → 상한(3)을 엄격히 유지

**잠재적 리스크**:

- 보상을 너무 높이면 재화의 "희소성"이 사라져 게임 메카닉이 무의미해질 수 있음 → 기본 보상 1~3 범위 유지, 25턴 시뮬레이션으로 검증
- GM이 프롬프트 지시를 항상 정확히 따르지 않을 수 있음 → gains 필드의 기본값(0)이 안전망 역할, 경제 검증이 최종 게이트
- 초기 Signal 상향이 "첫 5턴 동안 비용을 신경 쓰지 않는 느낌"을 줄 수 있음 → 120 수준이면 크게 문제되지 않음

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 턴당 기본 보상(Base Reward)을 도입할 것인가?
  - Option A: **도입** — 매 턴 gains.signal ≥ 1 (안정적 플레이 보장)
  - Option B: **미도입** — 퀘스트/탐색 보상만 강화 (보상이 "의미 있는 행동"에만 연결)
  - Option C: **조건부** — 잔액 < 20일 때만 기본 보상 적용 (안전망 역할)

- [ ] **Q2**: 초기 Signal 수치를 조정할 것인가?
  - Option A: **100 유지** (보상 강화로 충분히 커버)
  - Option B: **120으로 상향** (5턴 여유분 제공)
  - Option C: **150으로 상향** (10분 데모 동안 재화 걱정 없이 플레이)

## 참고 자료

- `vibe/prd.md` 5절 — 게임 재화 시스템 (5.2 재화 정의, 5.3 획득 루프, 5.4 소비 정책)
- `vibe/unit-plans/U-136[Mvp].md` — Economy 검증 보상 반영 (gains 필드)
- `vibe/unit-results/U-079[Mvp].md` — 재화 부족 시 이미지 허용 + 획득 경로 다양화
- `backend/prompts/turn/turn_output_instructions.en.md` L119-131 — 현재 Currency Acquisition 규칙
- `frontend/src/data/demoProfiles.ts` — 프로필 초기 재화 설정
