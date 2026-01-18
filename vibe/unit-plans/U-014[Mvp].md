# U-014[Mvp]: Economy HUD + Ledger(프론트)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-014[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-009,U-008 |
| 우선순위  | ⚡ Critical |

## 작업 목표

Signal/Memory Shard 재화 HUD를 구현하고, 턴별 비용/잔액 변화를 **원장(ledger)** 으로 추적해 “비용/지연을 게임 메커닉”으로 UX에 반영한다.

**배경**: PRD는 행동 전에 예상 비용을 보여주고, 잔액 부족 시 대체 행동을 제공하며, 잔액 음수는 금지라고 명시한다. (RULE-005)

**완료 기준**:

- Header(또는 고정 HUD 영역)에 Signal/Shard 잔액이 상시 표시된다.
- 이번 행동의 예상 비용(최소/최대)과 확정 비용/잔액(balance_after)이 구분되어 표시된다.
- 클라이언트에서도 ledger를 저장/표시하며, “음수로 내려갈 수 있는 표시/진행”을 방지한다(서버 Hard gate는 U-018에서). (RULE-005)

## 영향받는 파일

**생성**:

- `frontend/src/components/EconomyHud.tsx` - 잔액/비용/대안 표시
- `frontend/src/stores/economyStore.ts` - ledger/잔액/정책 상태(Zustand)

**수정**:

- `frontend/src/App.tsx` - HUD 배치 및 turn 결과 반영 연결
- `frontend/src/components/ActionDeck.tsx` - 카드 비용 표시/부족 안내(필요 시)
- `frontend/src/style.css` - HUD/배지/경고 스타일

**참조**:

- `vibe/prd.md` 5장 - 재화 목적/UX 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-005
- `.gemini/GEMINI.md` (economy-rules import) - ledger/대안 UX 체크리스트

## 구현 흐름

### 1단계: Economy 상태 모델 확정(ledger 포함)

- 최소 상태:
  - `balance`: { signal, memory_shard }
  - `last_cost`: { signal, memory_shard } (확정)
  - `cost_estimate`: { signal_min/max, shard_min/max } (예상)
  - `ledger[]`: turn_id/action_id/reason/model_label 등(요약)

### 2단계: HUD 렌더 + 부족 시 대안 가이드

- 잔액/예상/확정 비용을 한 화면에서 비교 가능하게 표시한다.
- 잔액 부족이 예상되면 “텍스트-only/저해상도/Thinking 낮춤” 같은 대안을 Action Deck과 함께 제시할 수 있도록 UI 훅을 둔다.

### 3단계: TurnOutput 반영 경로 연결

- final TurnOutput 수신 시:
  - cost/balance_after를 반영
  - ledger_entry(있다면) 추가
  - Agent Console의 Economy badge와 일관되게 표시

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-009[Mvp]](U-009[Mvp].md) - Action Deck 비용/대안 표기
- **계획서**: [U-008[Mvp]](U-008[Mvp].md) - turn 실행/스트리밍 + final 반영

**다음 작업에 전달할 것**:

- U-015에서 SaveGame에 economy ledger/잔액을 포함할 기반
- U-018에서 서버 경제 Hard gate/repair loop를 붙일 때, 클라 UX(예상비용/대안)와 정합

## 주의사항

**기술적 고려사항**:

- (RULE-005) 잔액 음수는 “표시/진행” 모두 금지: 부족 시 실행 강행이 아니라 대체 행동을 제안한다.
- (RULE-008) 비용/모델 선택 이유는 프롬프트가 아니라 “라벨(FAST/QUALITY/REF)”로만 설명한다.

**잠재적 리스크**:

- 서버/클라 ledger 불일치가 발생할 수 있음 → 서버를 SSOT로 두고, 클라는 “표시/입력 가드” 역할로 한정한다(U-018에서 확정).

## 페어링 질문 (결정 필요)

- [x] **Q1**: 클라이언트 ledger는 얼마나 오래 보관할까?
  - Option A: 최근 N턴만 보관(권장: UI/메모리 절감)
  - Option B: 전체 세션 ledger 보관(SaveGame 크기 증가)
  **A1**: Option A

## 참고 자료

- `vibe/prd.md` - Economy UX/원장 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-005
