# U-137[Mvp] Signal 획득-소비 밸런스 조정 실행 가이드

## 1. 개요

Signal 소비 대비 획득이 너무 낮아 플레이 몇 턴 만에 재화 고갈이 발생하는 문제를 해결하기 위해, 프롬프트 지시문에 **턴당 기본 보상(Base Reward)** 규칙을 신설하고, 퀘스트/탐색 보상 가이드라인을 상향하며, 데모 프로필 초기 재화를 조정했습니다.

**예상 소요 시간**: 10분

**의존성**:

- 의존 유닛: U-136[Mvp] (gains 필드 추가), U-079[Mvp] (earn_* 카드 + 저잔액 정책)
- 선행 완료 필요: U-136 런북 정상 수행

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd d:\Dev\unknown-world
```

프론트엔드 의존성이 최신인지 확인:

```bash
pnpm -C frontend install
```

### 2.2 의존 유닛 확인

U-136에서 추가된 `gains` 필드가 정상 작동하는지 확인:

```bash
# 백엔드 모듈 import 테스트
cd backend
uv run python -c "from unknown_world.models.turn import EconomyOutput; print('gains field:', hasattr(EconomyOutput.model_fields, 'gains') or 'gains' in EconomyOutput.model_fields)"
```

### 2.3 즉시 실행

```bash
# 프론트엔드
pnpm dev:front
```

```bash
# 백엔드 (별도 터미널)
pnpm dev:back
```

### 2.4 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- 프로필 선택 화면이 표시되면 성공
- 성공 지표: "⚙️ Tech Enthusiast" 프로필 선택 가능

---

## 3. 핵심 기능 시나리오

### 시나리오 A: Tech 프로필 초기 Signal 확인 (150)

**목적**: Tech 프로필의 초기 Signal이 80에서 150으로 상향되었는지 확인

**실행**:

1. `http://localhost:8001` 접속
2. "⚙️ Tech Enthusiast" 프로필 선택
3. Economy HUD 영역에서 Signal 잔액 확인

**기대 결과**:

- Signal 잔액: **150** (기존 80에서 상향)
- Memory Shard: **15** (변경 없음)

**확인 포인트**:

- ✅ Economy HUD에 Signal 150 표시
- ✅ Narrator 프로필: Signal 200 (변경 없음)
- ✅ Explorer 프로필: Signal 150 (변경 없음)

---

### 시나리오 B: 기본 보상(Base Reward) 규칙 적용 확인

**목적**: GM이 매 턴 gains.signal >= 1 을 설정하는지 확인

**실행**:

1. 아무 프로필 선택 후 게임 시작
2. 일반 행동 (예: "주변을 둘러본다") 수행
3. Agent Console에서 economy 배지 확인
4. 3~5턴 진행하며 Signal 변화 추적

**기대 결과**:

- 매 턴 gains.signal >= 1 (Base Reward 적용)
- balance_after가 턴당 순손실 3~5 범위 (기존 5~8에서 개선)
- 5턴 후에도 Signal 잔액 양호 (> 100)

**확인 포인트**:

- ✅ economy_ok 배지가 정상 발급됨
- ✅ gains 필드에 1 이상의 Signal 보상 포함 (성공 시)
- ✅ repair loop 발생 시에도 안전한 폴백 작동

---

### 시나리오 C: 저잔액 시 earn_* 카드 제공 확인

**목적**: Signal < 10일 때 earn_* 카드와 기본 보상 3이 적용되는지 확인

**전제 조건**:

- Signal 잔액이 10 미만인 상태 (여러 턴 소비 후 또는 직접 API 호출)

**실행 (API 직접 호출)**:

요청 JSON 파일 생성 (`test_low_balance.json`):

```json
{
  "language": "ko-KR",
  "text": "주변을 둘러본다",
  "client": {
    "viewport_w": 1920,
    "viewport_h": 1080,
    "theme": "dark"
  },
  "economy_snapshot": {
    "signal": 8,
    "memory_shard": 3
  }
}
```

```bash
curl -s -X POST http://localhost:8011/api/turn -H "Content-Type: application/json" -d @test_low_balance.json
```

**기대 결과**:

- `low_balance_warning: true` ✅
- GM이 earn_* 카드를 action_deck에 포함 시도
- gains.signal >= 3 (저잔액 시 기본 보상 상향)
- balance_after.signal >= 0 (음수 절대 금지)

**확인 포인트**:

- ✅ low_balance_warning이 true로 설정됨
- ✅ 잔액이 음수가 되지 않음
- ✅ repair loop 후에도 안전한 폴백이 잔액을 보존

---

### 시나리오 D: 25턴 시뮬레이션 (밸런스 지속성)

**목적**: 10분 데모 루프(15~25턴) 동안 재화 고갈이 발생하지 않는지 검증

**실행**:

1. Narrator 프로필(Signal 200)로 게임 시작
2. 다양한 행동(일반 탐색, 고비용 행동, earn_* 카드)을 섞어 25턴 진행
3. 매 턴 Signal 잔액 기록

**기대 결과**:

| 턴 범위 | 예상 Signal 범위 | 비고 |
|---------|-----------------|------|
| 1~5턴 | 180~200 | 초기 여유 구간 |
| 6~15턴 | 120~180 | 정상 소비 구간 |
| 16~25턴 | 80~150 | 보상 누적으로 안정 |

**확인 포인트**:

- ✅ 25턴 동안 Signal이 0에 도달하지 않음
- ✅ low_balance_warning 트리거가 전체 턴의 30% 이하
- ✅ 대체 행동(텍스트만) 강제 전환이 발생하지 않음

---

## 4. 실행 결과 확인

### 4.1 프롬프트 변경 확인

다음 파일에서 U-137 관련 섹션이 존재하는지 확인:

- `backend/prompts/turn/turn_output_instructions.en.md` — "Economy Balance Rules (U-137)" 섹션
- `backend/prompts/turn/turn_output_instructions.ko.md` — "경제 밸런스 규칙 (U-137)" 섹션
- `backend/prompts/system/game_master.en.md` — "Economy Balance (U-137)" 원칙
- `backend/prompts/system/game_master.ko.md` — "경제 밸런스 (U-137)" 원칙

### 4.2 데모 프로필 검증

`frontend/src/data/demoProfiles.ts`에서 각 프로필 초기 Signal:

| 프로필 | Signal | 변경 여부 |
|--------|--------|----------|
| Narrator | 200 | 유지 |
| Explorer | 150 | 유지 |
| Tech | **150** | 80→150 상향 (U-137) |

### 4.3 경제 정합성

- MAX_SINGLE_TURN_REWARD_SIGNAL = 30 (상한)
- U-137 최대 보상 = base 3 + quest 15 = **18** (상한 이내 ✅)
- 25턴 시뮬레이션 밸런스: 150 - 125(소비) + 50(기본) + 40(퀘스트) + 15(탐색) = **130** (건강)

### 4.4 성공/실패 판단 기준

**성공**:

- ✅ Tech 프로필 초기 Signal이 150
- ✅ 프롬프트에 Base Reward 규칙 포함
- ✅ 시스템 프롬프트에 경제 밸런스 원칙 포함
- ✅ 25턴 시뮬레이션에서 Signal이 0에 도달하지 않음
- ✅ 린트/타입 체크 통과

**실패 시 확인**:

- ❌ GM이 gains 필드를 무시함 → 프롬프트 지시문 강화 필요
- ❌ repair loop이 과도하게 발생 → GM 모델 응답 패턴 분석 필요
- ❌ 잔액이 음수 → RULE-005 위반, business_rules.py 검증 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: GM이 gains.signal을 0으로 계속 설정

- **원인**: GM이 프롬프트의 Base Reward 규칙을 무시
- **해결**: `turn_output_instructions.{en,ko}.md`에서 Base Reward 규칙이 economy 섹션의 Important 영역 내에 있는지 확인. 필요 시 볼드/강조 추가

**오류**: repair loop 2회 후 항상 폴백

- **원인**: GM의 balance_after 계산 오류 (gains + cost 혼동)
- **해결**: `gains` 필드와 `balance_after` 공식을 프롬프트 예시에서 더 명확히 설명. U-136 프롬프트의 예시를 참조

**오류**: Signal이 예상보다 빠르게 감소

- **원인**: 고비용 행동 빈도가 높거나, GM이 높은 cost를 설정
- **해결**: Action Deck의 평균 cost가 3~5 범위인지 확인. 필요 시 프롬프트에 cost 상한 가이드라인 추가

### 5.2 환경별 주의사항

- **Windows**: curl 명령에서 JSON 직접 전달 시 이스케이핑 문제 발생 가능. `-d @file.json` 형식 사용 권장
- **macOS/Linux**: 표준 curl 사용 가능

---

## 6. 다음 단계

- **CP-MVP-03**: 10분 데모 루프에서 경제 밸런스가 건강하게 유지되는지 통합 검증
- **U-119[Mmp]**: WIG 폴리시에서 경제 체감(풍족/궁핍) 최종 튜닝
