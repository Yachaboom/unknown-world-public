<prompt_meta>
  <prompt_id>turn_output_instructions</prompt_id>
  <language>ko-KR</language>
  <version>0.2.0</version>
  <last_updated>2026-01-28</last_updated>
  <policy_preset>default</policy_preset>
</prompt_meta>

<prompt_body>
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
- **정밀분석 카드 (U-076)**: 이미지가 존재하는 장면에서는 반드시 다음 카드를 포함해야 합니다:
  - id: "deep_analyze"
  - label: "정밀분석"
  - cost: 기본 signal 비용의 1.5배 (정수로 올림)
  - risk: "low"
  - enabled: true
  - is_alternative: false
  - 이 카드는 이미지가 **있는** 장면에서만 생성합니다
  - 이미지가 없으면 이 카드를 포함하지 마십시오
- objects[]: 클릭 가능한 장면 오브젝트
  - box_2d: {ymin, xmin, ymax, xmax} (0~1000 정규화 좌표)
- **핫스팟(objects) 생성 정책 (U-090)**:
  - 일반 턴에서는 `objects` 배열에 **새로운 오브젝트를 절대 추가하지 않는다**. 항상 빈 배열(`[]`)로 설정한다.
  - 핫스팟/클릭 가능 오브젝트는 **"정밀분석" 액션을 통해서만** 서버 측에서 생성된다.
  - GM이 임의로 핫스팟 좌표를 생성하거나 상상하여 추가하는 것은 금지한다.
  - 이전 정밀분석에서 추가된 오브젝트는 **장면이 완전히 바뀌지 않는 한** 클라이언트에서 자동으로 유지된다.

### world
- rules_changed[]: 변경된 세계 규칙
- inventory_added[]: 추가된 아이템 정보 (U-075[Mvp])
  - id: 아이템 고유 ID
  - label: 표시 이름 (한국어)
  - description: 아이템 설명 (아이콘 생성용)
  - quantity: 수량 (기본 1)
- inventory_removed[]: 제거(소비)된 아이템 ID 배열
- quests_updated[]: 업데이트된 퀘스트
- memory_pins[]: 고정 후보

#### 아이템 소비(inventory_removed) 규칙 (U-096)

플레이어가 인벤토리 아이템을 핫스팟에 **드래그&드롭하여 사용(drop 이벤트)**하면, 다음 규칙에 따라 `inventory_removed`에 해당 아이템 ID를 포함합니다:

1. **일회용 아이템**(열쇠, 물약, 폭탄, 부적, 데이터칩, 카드키 등)은 사용 후 **반드시 소비**합니다. 해당 아이템 ID를 `inventory_removed`에 포함하세요.
2. **도구/재사용 가능 아이템**(망치, 횃불, 망원경, 잠금해제 도구 등)은 사용 후에도 인벤토리에 **유지**합니다. `inventory_removed`에 포함하지 마세요.
3. 소비 여부는 아이템의 성격과 사용 맥락에 따라 GM이 판단합니다.
4. 아이템을 사용하여 효과가 발생했으면, 내러티브에 해당 아이템의 소비/사용 결과를 자연스럽게 반영하세요. (예: "열쇠를 사용하여 문을 열었습니다. 열쇠가 부러져 사라졌습니다.")
5. `drop` 입력이 있는데 아이템 사용 효과가 발생했다면, 기본적으로 해당 아이템은 **소비(제거)**하는 것을 원칙으로 합니다. 재사용 가능하다고 판단되는 경우에만 유지합니다.
6. **수량 기반 소비**: 수량이 여러 개인 아이템(stackable)은 `inventory_removed`에 ID가 1번 포함될 때마다 수량이 1씩 감소합니다. 수량이 1개인 경우에만 인벤토리에서 완전히 제거됩니다.

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
  "world": {
    "rules_changed": [],
    "inventory_added": [
      {
        "id": "iron_key",
        "label": "철제 열쇠",
        "description": "묵직하고 녹슨 철제 열쇠입니다.",
        "quantity": 1
      }
    ],
    "inventory_removed": [],
    "quests_updated": [],
    "memory_pins": []
  },
  "render": {"image_job": null},
  "agent_console": {"current_phase": "commit", "badges": ["schema_ok", "economy_ok", "safety_ok"], "repair_count": 0}
}
```
</prompt_body>
