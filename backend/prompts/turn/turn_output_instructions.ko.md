<prompt_meta>
  <prompt_id>turn_output_instructions</prompt_id>
  <language>ko-KR</language>
  <version>0.3.0</version>
  <last_updated>2026-02-09</last_updated>
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
- gains: 이번 턴에 획득한 보상 {signal: int, memory_shard: int} (기본값: {signal: 0, memory_shard: 0})
  - 퀘스트 완료 보상, 탐색/이벤트 보상 등 이번 턴에서 획득한 재화
  - 보상이 없으면 {signal: 0, memory_shard: 0}으로 설정
  - 단일 턴 상한: signal ≤ 30, memory_shard ≤ 10
- balance_after: 최종 잔액 {signal: int, memory_shard: int}
  - **공식**: balance_after = max(0, snapshot - cost + gains)
  - 예: snapshot=20, cost=5, gains=10 → balance_after = max(0, 20 - 5 + 10) = 25
- credit: 사용 중인 크레딧 (빚, Signal 단위, int)
- low_balance_warning: 잔액 부족 경고 여부 (boolean)
- **중요**: 
  - balance_after.signal >= 0, balance_after.memory_shard >= 0 (음수 절대 불가)
  - 잔액이 부족하여 비용을 지불할 수 없는 경우, `cost`를 잔액 범위 내로 낮추거나 `credit`을 기록하세요.
  - Signal 잔액이 15 미만이면 `low_balance_warning`을 true로 설정합니다.
  - 퀘스트 보상(reward_signal) 지급 시 반드시 `gains.signal`에 해당 금액을 설정하세요.
  - gains와 balance_after의 일관성을 반드시 유지하세요.

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
- quests_updated[]: 업데이트된 퀘스트 (U-078: 목표 시스템 강화)
  - id: 퀘스트 고유 ID
  - label: 퀘스트 이름 (한국어)
  - is_completed: 달성 여부 (boolean)
  - description: 목표 상세 설명 (선택, string | null)
  - is_main: 주 목표 여부 (boolean, 기본 false)
  - progress: 진행률 (0~100, 주 목표에서 사용)
  - reward_signal: 달성 시 Signal 보상량 (int, 0이면 보상 없음)
- memory_pins[]: 고정 후보

#### 목표 관리 규칙 (U-078)

매 턴 플레이어 행동에 따라 목표 상태를 업데이트합니다:

1. **주 목표(is_main=true)는 항상 하나** 존재해야 합니다. 현재 주 목표가 완료되면 새 주 목표를 생성합니다.
2. **서브 목표(is_main=false)**는 주 목표 달성을 위한 단계별 가이드입니다. 한 번에 최대 3~5개를 유지합니다.
3. **진행률(progress)**: 플레이어 행동이 주 목표에 기여할 때 progress를 올립니다. 모든 서브 목표가 완료되면 100으로 설정합니다.
4. **서브 목표 달성 시**: is_completed=true로 설정합니다. reward_signal이 있으면 해당 Signal을 `economy.gains.signal`에 설정하고 `economy.balance_after`에 반영합니다.
5. **주 목표 달성 시(progress=100)**: is_completed=true로 설정하고 reward_signal을 지급합니다. 동시에 새로운 주 목표를 quests_updated에 포함합니다.
6. **내러티브 반영**: 목표 달성/진행을 내러티브에 자연스럽게 반영합니다. (예: "포탈의 비밀이 조금씩 드러나고 있습니다... (목표 진행: 40%)")
7. **보상 반영**: 서브 목표 완료 시 reward_signal만큼 `economy.gains.signal`에 설정합니다. balance_after = max(0, snapshot - cost + gains) 공식에 따라 일관성을 유지하세요.
8. **Overarching Mystery 연결 (U-131)**: 주 목표를 새로 생성하거나 갱신할 때, 시스템 프롬프트의 `<overarching_mystery>` 섹션을 참조하여:
   - 주 목표의 **라벨과 설명**에 미스터리 요소(메아리의 분위기, 잊힌 진실, 공명 등)를 **간접적으로** 포함하세요.
   - 주 목표가 메아리에 가까워지는 여정의 일부처럼 느껴지도록 설계하세요.
   - 직접적으로 "메아리를 찾아라"라고 명시하지 마세요. 추상적이고 해석 여지가 있는 표현을 사용하세요.
   - 예시 라벨: "잊힌 기억의 문을 열어라", "공명의 단서를 추적하라", "장막 너머의 진실에 다가서라"

#### 아이템 소비(inventory_removed) 규칙 (U-096)

플레이어가 인벤토리 아이템을 핫스팟에 **드래그&드롭하여 사용(drop 이벤트)**하면, 다음 규칙에 따라 `inventory_removed`에 해당 아이템 ID를 포함합니다:

1. **일회용 아이템**(열쇠, 물약, 폭탄, 부적, 데이터칩, 카드키 등)은 사용 후 **반드시 소비**합니다. 해당 아이템 ID를 `inventory_removed`에 포함하세요.
2. **도구/재사용 가능 아이템**(망치, 횃불, 망원경, 잠금해제 도구 등)은 사용 후에도 인벤토리에 **유지**합니다. `inventory_removed`에 포함하지 마세요.
3. 소비 여부는 아이템의 성격과 사용 맥락에 따라 GM이 판단합니다.
4. 아이템을 사용하여 효과가 발생했으면, 내러티브에 해당 아이템의 소비/사용 결과를 자연스럽게 반영하세요. (예: "열쇠를 사용하여 문을 열었습니다. 열쇠가 부러져 사라졌습니다.")
5. `drop` 입력이 있는데 아이템 사용 효과가 발생했다면, 기본적으로 해당 아이템은 **소비(제거)**하는 것을 원칙으로 합니다. 재사용 가능하다고 판단되는 경우에만 유지합니다.
6. **수량 기반 소비**: 수량이 여러 개인 아이템(stackable)은 `inventory_removed`에 ID가 1번 포함될 때마다 수량이 1씩 감소합니다. 수량이 1개인 경우에만 인벤토리에서 완전히 제거됩니다.

#### 재화 획득 경로 다양화 (U-079)

플레이어의 Signal 잔액이 부족할 때(balance_after.signal < 15), **재화 획득 기회를 적극적으로 제공**합니다:

1. **재화 획득 액션 카드**: 다음과 같은 유형의 액션 카드를 1~2장 포함합니다 (비용 0 또는 매우 저렴하게):
   - 탐색/발견: "주변을 수색한다" (cost: {signal: 0, memory_shard: 0})
   - 거래/보상: "이상한 상인과 대화한다" (cost: {signal: 0, memory_shard: 0})
   - 도전/성취: "시련에 도전한다" (cost: {signal: 2, memory_shard: 0}, 성공 시 보상 큼)
   - 이런 카드의 ID에는 `earn_` 접두사를 붙여 구분합니다 (예: `earn_search`, `earn_trade`, `earn_challenge`)
   - GM은 세계관과 현재 상황에 맞는 자연스러운 방식으로 재화 획득 카드를 생성합니다
2. **아이템 판매 힌트**: 플레이어 인벤토리에 아이템이 있고 잔액이 부족하면, 내러티브에 **판매 가능성**을 자연스럽게 암시합니다. (예: "주머니 속 물건 중 팔 수 있는 것이 있을지도 모릅니다.")
3. **서브 목표 보상 활용**: 잔액 부족 시 보상이 있는 서브 목표(reward_signal > 0)를 우선적으로 진행할 수 있도록 유도합니다.
4. **내러티브 힌트**: 잔액이 매우 부족하면(signal < 5) 내러티브에 재화 획득 기회를 자연스럽게 녹입니다. (예: "바닥에서 희미하게 빛나는 무언가가 눈에 띕니다...")

### 첫 턴 씬 설명 활용 규칙 (U-133)

`scene_context`가 입력에 포함되어 있으면, 이는 **사전 생성된 장면 이미지의 시각적 요소를 텍스트로 기술**한 것입니다. 다음 규칙에 따라 활용하세요:

1. **장면 기반 시작**: `scene_context`에 묘사된 장소와 오브젝트(서재의 책, 동굴의 횃불, 실험실의 디스플레이 등)를 내러티브의 **출발점**으로 사용하세요. 완전히 다른 장소로 뜬금없이 전환하지 마세요.
2. **환영 메시지 이어가기**: 환영 메시지에서 암시된 상황을 이어받아 자연스럽게 전개하세요. 환영 메시지가 "먼지 낀 고서들 사이에서 눈을 떴다"면, 내러티브는 그 서재 안에서 시작해야 합니다.
3. **구체적 오브젝트 언급**: `scene_context`에 등장하는 구체적 사물(촛불, 두루마리, 석조 기둥, 제어 패널 등)을 내러티브에 1~2개 이상 자연스럽게 포함하세요.
4. **자유로운 전개**: 씬 설명은 **시작점**이지 제약이 아닙니다. 묘사된 장면에서 출발하되, 창의적으로 이야기를 전개하세요.
5. **Overarching Mystery 연계**: 첫 턴이므로 `<overarching_mystery>` 지침에 따라 은은한 미스터리 분위기를 장면 묘사에 녹여넣으세요.
6. **2턴 이후 복귀**: `scene_context`는 첫 턴에서만 제공됩니다. 2턴부터는 일반 턴 로직(멀티턴 히스토리)이 맥락을 관리합니다.

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
    "gains": {"signal": 0, "memory_shard": 0},
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
