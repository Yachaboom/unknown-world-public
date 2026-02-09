# U-025 엔딩 리포트 + 리플레이 하네스 — 런북

## 개요
세션 종료 시 서버에서 엔딩 리포트를 생성하고 CRT 테마 모달로 표시합니다.
리포트에는 내러티브 요약, 퀘스트 달성도, 경제 결산(ledger 기반), 룰 변형 타임라인, 플레이 통계가 포함됩니다.

## 전제 조건
- 프론트엔드: `pnpm -C frontend dev` (포트 8001)
- 백엔드: `uvicorn unknown_world.main:app --port 8011 --reload` (포트 8011)

## 시나리오 1: 세션 종료 → 엔딩 리포트 표시

### 준비
1. `http://localhost:8001` 접속
2. 프로필 선택 (Explorer 권장) → 게임 진입

### 실행
1. 상단 헤더의 **"END SESSION"** 버튼 클릭
2. 확인 다이얼로그에서 **확인** 클릭

### 검증
- [ ] 엔딩 리포트 모달이 표시됨
- [ ] **SESSION REPORT** 타이틀 표시
- [ ] **NARRATIVE SUMMARY** 섹션에 내러티브 텍스트 표시
- [ ] **QUEST ACHIEVEMENT** 섹션에 퀘스트 목록 + 달성률 바 표시
- [ ] **ECONOMY SETTLEMENT** 섹션에 Initial/Final/Spent/Earned/Transactions 표시
- [ ] **Ledger Consistent** 배지 표시 (잔액 일관성)
- [ ] **RULE MUTATIONS** 섹션에 룰 변형 타임라인 표시
- [ ] **PLAY STATISTICS** 섹션에 턴/아이템/규칙/프로필 표시
- [ ] **CLOSE** 버튼 클릭 시 모달 닫힘
- [ ] ESC 키로도 모달 닫힘

## 시나리오 2: 턴 진행 후 엔딩 리포트

### 준비
1. `http://localhost:8001` 접속
2. 프로필 선택 → 게임 진입

### 실행
1. **EXPLORE** 액션 카드 클릭하여 1~2턴 진행
2. (선택) 아이템 판매하여 경제 거래 발생
3. 상단 **"END SESSION"** 클릭 → 확인

### 검증
- [ ] 턴 수가 0보다 큰 값으로 표시
- [ ] Economy Settlement에서 소비 비용이 반영
- [ ] Narrative Summary에 플레이한 내러티브 반영
- [ ] 콘솔에 에러 없음

## 시나리오 3: 백엔드 API 직접 테스트 (curl)

### 실행
```bash
curl -s -X POST http://localhost:8011/api/ending-report \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "language": "en-US",
  "profile_id": "test",
  "turn_count": 3,
  "narrative_entries": [
    {"text": "Started the adventure.", "type": "narrative", "turn": 1}
  ],
  "quests": [
    {"id": "q1", "label": "Main Quest", "is_completed": false, "is_main": true, "progress": 50, "reward_signal": 100}
  ],
  "economy_ledger": [
    {"reason": "action cost", "cost_signal": 5, "cost_memory_shard": 0, "balance_signal": 95, "balance_memory_shard": 5, "turn_id": 1}
  ],
  "balance_final": {"signal": 95, "memory_shard": 5},
  "balance_initial": {"signal": 100, "memory_shard": 5},
  "active_rules": [],
  "mutation_events": [],
  "inventory_items": [{"id": "i1", "name": "Sword", "quantity": 1}]
}
EOF
```

### 검증
- [ ] HTTP 200 응답
- [ ] JSON에 `language`, `title`, `narrative_summary`, `quest_achievement`, `economy_settlement`, `rule_timeline`, `play_stats`, `generated_at` 필드 포함
- [ ] `economy_settlement.balance_consistent`가 `true`
- [ ] `quest_achievement.completion_rate`가 0~1 범위

## 시나리오 4: 한국어 리포트

### 준비
1. 프로필 선택 화면에서 언어를 **한국어**로 변경
2. 프로필 선택 → 게임 진입

### 실행
1. **"세션 종료"** 버튼 클릭 → 확인

### 검증
- [ ] 모달 라벨이 한국어로 표시 ("세션 리포트", "내러티브 요약", "퀘스트 달성도" 등)
- [ ] 리포트 내용 언어가 세션 언어와 일치 (RULE-006)

## 시나리오 5: 리플레이 하네스 (백엔드 전용)

### 실행
```python
# backend/ 디렉토리에서 실행
from unknown_world.harness.scenario import Scenario, ScenarioStep
from unknown_world.harness.replay_runner import save_scenario, load_scenario

# 시나리오 생성
scenario = Scenario(
    name="test-scenario",
    seed=42,
    steps=[
        ScenarioStep(
            description="First exploration",
            turn_input={"text": "explore", "language": "en-US"}
        ),
    ]
)

# 저장/로드 테스트
save_scenario(scenario, "test-scenario.json")
loaded = load_scenario("test-scenario.json")
assert loaded.name == scenario.name
print("Harness save/load OK")
```

### 검증
- [ ] 시나리오 저장 파일이 생성됨
- [ ] 로드된 시나리오가 원본과 동일

## Hard Gate 체크리스트
- [x] **Schema OK**: EndingReport JSON이 Pydantic 스키마 통과
- [x] **Economy OK**: balance_consistent 필드로 ledger 일관성 검증
- [x] **Safety OK**: 에러 시 에러 메시지 표시 + 닫기 가능
- [x] **Consistency OK**: 세션 데이터가 store 스냅샷에서 수집되어 일관성 유지
