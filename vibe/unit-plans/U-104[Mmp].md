# U-104[Mmp]: 장기 세션 메모리 요약/핀 추천 고도화

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-104[Mmp]                        |
| Phase     | MMP                               |
| 예상 소요 | 75분                              |
| 의존성    | U-025                             |
| 우선순위  | High                              |

## 작업 목표

장기 세션에서 설정 붕괴/환각을 줄이기 위해, WorldState 요약과 Memory Pin 후보 추천을 고도화하고, 중요한 설정을 “고정”하는 흐름을 강화한다.

**배경**: PRD는 장시간 세션에서도 일관성을 유지하기 위한 메모리/요약/중요 설정 고정 체계를 요구한다. (PRD 2.2/6.7, RULE-001)

**완료 기준**:

- 일정 턴마다(또는 트리거 기반) WorldState 요약이 생성/갱신된다.
- Memory Pin 후보가 UI로 노출되고, 사용자가 Shard를 소비해 고정할 수 있다(경제 연동). (RULE-005)
- 고정된 설정은 다음 턴 입력에 일관되게 반영되며, 혼합 언어/좌표 규약 위반이 없다. (RULE-006/009)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/memory/summarize.py` - 요약 생성(선택: 모델 호출)
- `backend/src/unknown_world/memory/pins.py` - 핀 후보 추천/고정 로직
- `frontend/src/components/MemoryPinPanel.tsx` - 핀 후보/고정된 핀 UI

**수정**:

- `frontend/src/stores/economyStore.ts` - Shard 소비/가드(필요 시)
- `backend/src/unknown_world/orchestrator/*` - TurnInput 구성 시 핀/요약 주입(필요 시)

**참조**:

- `vibe/prd.md` 6.7 - Memory Pin UI 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-005/006/004

## 구현 흐름

### 1단계: 요약/핀 데이터 모델 확정

- `summary`: 장기 기억(짧은 텍스트)
- `pins[]`: 고정된 사실(짧은 문장/키)
- `pin_candidates[]`: 후보 + Shard 비용 + 고정 시 효과

### 2단계: 추천/고정 UX 연결

- 후보를 UI에 칩 형태로 노출하고, 클릭 시 Shard 소비(가드 포함)로 고정한다.
- 잔액 부족 시 대안을 제공한다(고정 없이 진행/저비용 요약). (RULE-005)

### 3단계: 입력/출력 일관성 강화

- 고정 핀은 다음 TurnInput 컨텍스트에 강제 주입하여 일관성을 높인다.
- 실패/충돌 시 repair loop 또는 안전 폴백으로 처리한다. (RULE-004)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-025[Mvp]](U-025[Mvp].md) - 엔딩 리포트/요약 데이터 흐름

**다음 작업에 전달할 것**:

- 장기 세션/Autopilot에서 “설정 붕괴”를 줄이는 핵심 기반
- U-105 시나리오 회귀에서 “핀/요약 인바리언트” 추가 가능

## 주의사항

**기술적 고려사항**:

- (RULE-006) 요약/핀도 언어 정책을 따라야 한다(혼합 금지).
- (RULE-005) 고정은 재화 소비를 동반하며, 잔액 음수/강행 금지.

**잠재적 리스크**:

- 요약이 잘못되면 오히려 일관성을 해칠 수 있음 → 핀 고정은 “사용자 승인”을 기본으로 둔다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 요약 생성은 언제 할까?
  - Option A: N턴마다 주기적으로(단순)
  - Option B: 규칙/관계 변화 등 트리거 기반(권장: 비용/효율)

## 참고 자료

- `vibe/prd.md` - Memory Pin/장기 세션 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-004/005/006


