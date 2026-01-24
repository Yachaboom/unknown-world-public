# [Prompt] TurnOutput Instructions (ko-KR)

- prompt_id: turn_output_instructions
- language: ko-KR
- version: 0.1.0
- last_updated: 2026-01-24

## 목적

TurnOutput JSON 스키마의 각 필드 작성 규칙을 명시합니다.

---

## 필수 필드 (Hard Gate)

### language
- 값: "ko-KR" (입력과 동일하게 고정)
- 혼합 출력 금지

### narrative
- 타입: string (필수)
- 플레이어에게 보여줄 내러티브 텍스트
- 2~3문장, 한국어로 작성
- 현재 시제, "당신" 지칭

### economy
- 타입: object (필수)
- cost: 이번 턴에 소비된 비용 {signal: int, memory_shard: int}
- balance_after: 소비 후 잔액 {signal: int, memory_shard: int}
- **중요**: balance_after.signal >= 0, balance_after.memory_shard >= 0

### safety
- 타입: object (필수)
- blocked: boolean (안전 정책 차단 여부)
- message: string | null (차단 시 표시할 메시지)

---

## 선택 필드

### ui
- action_deck.cards[]: 액션 카드 배열 (3~6장 권장)
  - id: 카드 고유 ID
  - label: 표시 라벨 (한국어)
  - cost: {signal, memory_shard}
  - risk: "low" | "medium" | "high"
  - enabled: boolean
  - is_alternative: boolean (저비용 대안 여부)
- objects[]: 클릭 가능한 장면 오브젝트
  - box_2d: {ymin, xmin, ymax, xmax} (0~1000 정규화 좌표)

### world
- rules_changed[]: 변경된 세계 규칙
- inventory_added[]: 추가된 아이템 ID
- inventory_removed[]: 제거된 아이템 ID
- quests_updated[]: 업데이트된 퀘스트
- memory_pins[]: 고정 후보

### render
- image_job: 이미지 생성 작업 (선택)
  - should_generate: boolean
  - prompt: 이미지 프롬프트 (영어 권장)

### agent_console
- current_phase: 현재 단계
- badges[]: 검증 배지
- repair_count: 복구 시도 횟수

---

## 좌표 규약 (RULE-009)

- 모든 좌표는 0~1000 정규화 좌표계
- bbox 순서: [ymin, xmin, ymax, xmax]
- 픽셀 좌표 사용 금지

---

## 예시 출력

```json
{
  "language": "ko-KR",
  "narrative": "낡은 문이 삐걱거리며 열립니다. 안쪽에서 차가운 공기가 밀려옵니다.",
  "economy": {
    "cost": {"signal": 5, "memory_shard": 0},
    "balance_after": {"signal": 95, "memory_shard": 5}
  },
  "safety": {"blocked": false, "message": null},
  "ui": {
    "action_deck": {
      "cards": [
        {"id": "enter", "label": "안으로 들어간다", "cost": {"signal": 10, "memory_shard": 0}, "risk": "medium", "enabled": true, "is_alternative": false},
        {"id": "peek", "label": "조심스럽게 엿본다", "cost": {"signal": 3, "memory_shard": 0}, "risk": "low", "enabled": true, "is_alternative": true}
      ]
    },
    "objects": []
  },
  "world": {"rules_changed": [], "inventory_added": [], "inventory_removed": [], "quests_updated": [], "memory_pins": []},
  "render": {"image_job": null},
  "agent_console": {"current_phase": "commit", "badges": ["schema_ok", "economy_ok", "safety_ok"], "repair_count": 0}
}
```
