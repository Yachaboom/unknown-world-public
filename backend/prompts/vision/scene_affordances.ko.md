<prompt_meta>
  <prompt_id>scene_affordances</prompt_id>
  <language>ko-KR</language>
  <version>0.1.0</version>
  <last_updated>2026-02-07</last_updated>
  <policy_preset>vision</policy_preset>
</prompt_meta>

<prompt_body>
## 목적

주어진 장면(Scene) 이미지를 분석하여 플레이어가 **클릭/상호작용할 수 있는 오브젝트(affordances)**를 추출합니다.

---

## 작업 지시

1. 이미지를 세심하게 관찰하여 **상호작용 가능한 오브젝트**를 식별하세요.
2. 장면에서 가장 중요하고 상호작용 가능한 오브젝트를 **1~3개만** 선택하세요.
3. **선택 기준** (우선순위 순):
   - (1) 화면에서 차지하는 **크기가 크고** 눈에 잘 띄는 오브젝트
   - (2) 게임 진행에 **중요한** 오브젝트 (문, 열쇠, NPC 등)
   - (3) 맥락상 **상호작용에 적합한** 오브젝트
4. **서로 가까이 있거나 겹치는 오브젝트는 하나만 선택**하세요.
5. 각 오브젝트에 대해:
   - **label**: 오브젝트 이름 (한국어, 간결하게)
   - **box_2d**: 바운딩 박스 좌표 `{ymin, xmin, ymax, xmax}` (0~1000 정규화)
   - **interaction_hint**: 어떤 상호작용이 가능한지 한 줄 힌트 (선택)

---

## 좌표 규약 (RULE-009)

- 모든 좌표는 **0~1000 정규화 좌표계** 사용
- bbox 순서: `[ymin, xmin, ymax, xmax]`
  - ymin: 오브젝트 상단 Y 좌표
  - xmin: 오브젝트 좌측 X 좌표
  - ymax: 오브젝트 하단 Y 좌표
  - xmax: 오브젝트 우측 X 좌표
- 이미지의 좌상단이 (0, 0), 우하단이 (1000, 1000)

---

## 상호작용 대상 기준

**포함**:
- 문, 상자, 레버, 스위치 등 조작 가능한 오브젝트
- 무기, 열쇠, 도구 등 획득 가능한 아이템
- NPC, 동물 등 대화/상호작용 가능한 캐릭터
- 비밀 통로, 균열, 빛나는 영역 등 탐색 포인트
- 표지판, 문서, 벽화 등 정보를 제공하는 오브젝트

**제외**:
- 배경 장식 (단순한 벽, 하늘, 바닥 등)
- 너무 작거나 불명확한 오브젝트
- 게임에 부적절한 콘텐츠

---

## 출력 형식 (JSON)

```json
{
  "affordances": [
    {
      "label": "오브젝트 이름",
      "box_2d": {"ymin": 100, "xmin": 200, "ymax": 400, "xmax": 500},
      "interaction_hint": "상호작용 힌트"
    }
  ]
}
```

---

## 예시

```json
{
  "affordances": [
    {
      "label": "낡은 나무 문",
      "box_2d": {"ymin": 80, "xmin": 300, "ymax": 850, "xmax": 650},
      "interaction_hint": "열어볼 수 있을 것 같다"
    },
    {
      "label": "벽에 걸린 횃불",
      "box_2d": {"ymin": 100, "xmin": 750, "ymax": 350, "xmax": 850},
      "interaction_hint": "가져갈 수 있을 것 같다"
    },
    {
      "label": "석상의 눈",
      "box_2d": {"ymin": 200, "xmin": 50, "ymax": 300, "xmax": 150},
      "interaction_hint": "무언가 비밀이 있는 것 같다"
    }
  ]
}
```
</prompt_body>
