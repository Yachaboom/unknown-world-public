# U-063[Mvp]: 프론트엔드 턴 실행 후 재화 잔액 버그 수정

## 메타데이터

| 항목      | 내용                        |
| --------- | --------------------------- |
| Unit ID   | U-063[Mvp]                  |
| Phase     | MVP                         |
| 예상 소요 | 45분                        |
| 의존성    | U-055[Mvp]                  |
| 우선순위  | ⚡ Critical (Economy RULE-005) |

## 작업 목표

턴 실행 후 **재화(Signal/Shard)가 0으로 초기화되는 버그를 수정**하여, 재화 잔액이 올바르게 차감되고 표시되도록 한다.

**배경**: 프론트엔드에서 턴 실행 후 Signal/Shard가 0으로 표시되고 "잔액이 부족합니다" 경고가 발생한다. 이는 RULE-005(재화 잔액 음수 금지, 비용 누락 금지)를 위반하며, 게임 진행이 불가능해지는 치명적 버그다.

**완료 기준**:

- 턴 실행 후 재화가 올바르게 차감되어 표시됨 (예: 150 → 140)
- 폴백 응답에서도 재화가 유지됨
- 잔액 부족 경고가 실제 부족 시에만 표시됨
- `debt-log.md`에서 해당 이슈 ✅ 표시

## 영향받는 파일

**수정** (원인에 따라):

- `frontend/src/App.tsx` - 턴 응답 처리 및 상태 업데이트
- `frontend/src/stores/worldStore.ts` - 재화 상태 관리 (존재 시)
- `backend/src/unknown_world/orchestrator/fallback.py` - 폴백 응답의 economy 필드 (백엔드 원인 시)
- `backend/src/unknown_world/models/turn.py` - TurnOutput.economy 기본값 (스키마 원인 시)

**참조**:

- `backend/src/unknown_world/models/economy.py` - EconomyResult 스키마
- `frontend/src/schemas/turn.ts` - 프론트엔드 Zod 스키마
- `vibe/debt-log.md` - 이슈 기록

## 구현 흐름

### 1단계: 디버깅 - 원인 파악

#### A. 백엔드 응답 확인

```bash
# /api/turn 응답에서 economy 필드 확인
curl -X POST http://localhost:8000/api/turn \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "language": "ko-KR", ...}'
  
# 확인 포인트:
# - economy.balance_before: 150 (Signal), 5 (Shard)
# - economy.cost: 10 (예시)
# - economy.balance_after: 140 (Signal), 5 (Shard)
```

#### B. 프론트엔드 상태 추적

```tsx
// App.tsx 또는 useGameStore 내 확인
console.log('Before turn:', worldState.economy);
// 턴 실행
console.log('Response economy:', response.economy);
console.log('After update:', worldState.economy);
```

### 2단계: 원인별 수정

#### Case A: 백엔드 폴백 응답에서 balance_after가 0

```python
# backend/src/unknown_world/orchestrator/fallback.py
def create_fallback_response(turn_input: TurnInput, ...) -> TurnOutput:
    return TurnOutput(
        # ...
        economy=EconomyResult(
            balance_before=turn_input.economy.balance,  # 현재 잔액
            cost=ResourceCost(signal=0, shard=0),  # 폴백은 비용 0
            balance_after=turn_input.economy.balance,  # 잔액 유지!
        ),
    )
```

#### Case B: 프론트엔드에서 응답 파싱 오류

```tsx
// frontend/src/App.tsx
const handleTurnResponse = (response: TurnOutput) => {
  // 잘못된 코드 (가정)
  // setEconomy({ signal: 0, shard: 0 });
  
  // 올바른 코드
  setEconomy({
    signal: response.economy.balance_after.signal,
    shard: response.economy.balance_after.shard,
  });
};
```

#### Case C: Zustand/상태 관리 업데이트 누락

```tsx
// frontend/src/stores/worldStore.ts
const updateFromTurn = (turnOutput: TurnOutput) => {
  set((state) => ({
    ...state,
    economy: {
      signal: turnOutput.economy.balance_after.signal,
      shard: turnOutput.economy.balance_after.shard,
    },
  }));
};
```

### 3단계: 검증

```tsx
// 테스트 시나리오
// 1. 프로필 선택 후 게임 시작 (Signal: 150, Shard: 5)
// 2. 텍스트 입력 후 "실행" 클릭
// 3. 턴 완료 후 Signal: 140, Shard: 5 (예시, 비용에 따라 다름)
// 4. "잔액 부족" 경고 미표시
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-055[Mvp]](U-055[Mvp].md) - 이미지 파이프라인 통합 후 발견된 이슈
- **참조**: `backend/src/unknown_world/models/economy.py` - EconomyResult 스키마

**다음 작업에 전달할 것**:

- CP-MVP-03: 데모에서 재화 시스템 정상 동작 확인
- U-064/U-065: Real 모드에서도 재화 정합성 유지

## 주의사항

**기술적 고려사항**:

- (RULE-005) 재화 정합성: 잔액 음수 금지, 비용 누락 금지, 예상비용 미표기 금지
- 백엔드-프론트엔드 스키마 동기화: Pydantic + Zod 이중 검증 통과 필수
- 스트리밍 응답에서 economy 이벤트 순서 확인 (economy 이벤트가 마지막에 오는지)

**잠재적 리스크**:

- 여러 곳에서 재화 상태를 업데이트하면 경쟁 조건 발생 가능 → 단일 상태 관리 포인트 유지
- 폴백 응답과 정상 응답의 economy 구조가 다를 수 있음 → 스키마 일관성 확인

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 재화 상태의 SSOT(Single Source of Truth)?
  - Option A: 프론트엔드 상태 (Zustand/useState)
  - Option B: 백엔드 응답이 항상 최신 (프론트엔드는 캐시만)
  **권장**: Option B (백엔드가 재화 계산의 SSOT, 프론트엔드는 표시만)

- [ ] **Q2**: 재화 불일치 감지 시 처리?
  - Option A: 경고 표시 + 게임 진행 허용
  - Option B: 동기화 요청 후 재시도
  **권장**: Option A (MVP에서는 경고만, 동기화는 MMP에서)

## 참고 자료

- `backend/src/unknown_world/models/economy.py` - EconomyResult, ResourceBalance 스키마
- `frontend/src/schemas/turn.ts` - 프론트엔드 Zod 스키마
- `.cursor/rules/00-core-critical.mdc` - RULE-005 재화 정합성
- `vibe/debt-log.md` - 관련 이슈 기록
