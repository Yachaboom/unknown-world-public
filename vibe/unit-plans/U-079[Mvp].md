# U-079[Mvp]: 재화 부족 시 이미지 생성 허용 + 재화 획득 경로 다양화

## 메타데이터

| 항목      | 내용                                           |
| --------- | ---------------------------------------------- |
| Unit ID   | U-079[Mvp]                                     |
| Phase     | MVP                                            |
| 예상 소요 | 75분                                           |
| 의존성    | U-014[Mvp], U-019[Mvp], U-078[Mvp]             |
| 우선순위  | High (게임 플로우 연속성/데모 체감 핵심)       |

## 작업 목표

**잔액이 부족해도 이미지 생성이 가능**하도록 경제 정책을 완화하고, 동시에 **재화를 획득할 수 있는 다양한 경로(아이템/행동/이벤트)**를 추가하여 게임 루프가 끊기지 않게 한다.

**배경**: 현재 RULE-005에서 "잔액 음수 금지"를 규정하고 있어, 재화가 바닥나면 이미지 생성이 차단될 수 있다. 이는 데모 중 "게임이 막힌" 느낌을 주어 UX에 치명적이다. 대신 **"빚(credit)" 시스템** 또는 **"무료 기본 이미지"** 정책을 도입하고, 재화 획득 경로를 다양화하여 플레이어가 게임을 계속 진행하면서 재화를 회복할 수 있게 한다.

**핵심 원칙**:
- **게임 진행은 절대 막히지 않아야 한다** (재화 부족으로 인한 완전 차단 금지)
- **이미지 생성이 완전 차단되기보다**, 저해상도/텍스트 우선 등 **대안을 자동 제공**
- **재화 획득 기회를 자연스럽게 제공**하여 경제 루프 완성

**완료 기준**:

- 잔액 부족 시에도 **기본 이미지 생성(FAST/저해상도)**은 가능 (또는 "크레딧" 사용)
- 잔액 부족 상태에서 이미지 생성 시 **"비용 초과" 경고 + 대안 안내** UI 표시
- **재화 획득 액션 카드**가 ActionDeck에 주기적으로 등장:
  - "주변 탐색" → 확률적 Signal 획득
  - "휴식/명상" → 소량 Signal 회복
  - "아이템 판매" → 인벤토리 아이템을 Signal로 변환
- **목표(Quest) 달성 시 보상**으로 Signal/Shard 지급 (U-078과 연동)
- **탐색 중 아이템 발견** 시 일부 아이템이 **Signal을 포함**하거나 **판매 가능**
- 잔액이 매우 낮을 때 GM이 **"재화 획득 힌트"** 를 내러티브에 자연스럽게 포함

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/orchestrator/stages/economy.py` - 잔액 부족 시 정책 완화 (크레딧/기본 이미지 허용)
- `backend/src/unknown_world/models/turn.py` - Economy 스키마에 `credit`, `low_balance_warning` 추가
- `backend/prompts/turn/turn_output_instructions.ko.md` - 재화 획득 액션 카드 생성 지침, 잔액 부족 시 힌트 지침
- `backend/prompts/turn/turn_output_instructions.en.md` - 동일
- `frontend/src/components/EconomyHUD.tsx` - 잔액 부족 경고 UI, 크레딧 표시
- `frontend/src/components/ActionDeck.tsx` - 재화 획득 액션 카드 특수 표시 (골드/그린 배지)
- `backend/src/unknown_world/services/image_generation.py` - 잔액 부족 시 FAST 모델로 자동 폴백
- `frontend/src/locales/ko-KR/translation.json` - 경고/힌트 i18n 키 추가
- `frontend/src/locales/en-US/translation.json` - 동일

**참조**:

- `vibe/unit-plans/U-014[Mvp].md` - Economy HUD + Ledger
- `vibe/unit-plans/U-019[Mvp].md` - 이미지 생성 엔드포인트
- `vibe/unit-plans/U-078[Mvp].md` - 목표 시스템(보상 지급)
- `vibe/prd.md` 5절 - 게임 재화(코스트) 시스템

## 구현 흐름

### 1단계: 잔액 부족 정책 완화

**Option A: 크레딧(빚) 시스템**
- 잔액이 0 미만이 되어도 최대 `-50 Signal`까지 "크레딧" 허용
- 크레딧 사용 시 Economy HUD에 빨간색 표시 + 경고
- 다음 재화 획득 시 크레딧 먼저 상환

**Option B: 무료 기본 이미지 정책**
- 잔액 부족 시 이미지 생성을 차단하지 않고, **FAST 모델(저해상도)로 자동 전환**
- "잔액 부족으로 기본 이미지를 생성합니다" 안내

**권장**: Option B를 기본으로, Option A는 MMP에서 고도화

```python
# backend/src/unknown_world/orchestrator/stages/economy.py
def check_image_generation_allowed(balance: int, cost: int) -> tuple[bool, str]:
    if balance >= cost:
        return True, "QUALITY"
    elif balance >= cost // 2:  # 절반 이상이면 FAST로 생성
        return True, "FAST"
    else:  # 매우 부족해도 최소 이미지는 생성
        return True, "FAST"  # 무료 기본 이미지
```

### 2단계: 재화 획득 액션 카드 정의

GM 프롬프트에 **재화 획득 액션 카드 유형** 지침 추가:

| 액션 이름 | 비용 | 효과 | 등장 조건 |
|-----------|------|------|-----------|
| 주변 탐색 | 5 Signal | +10~30 Signal (확률) | 항상 |
| 휴식/명상 | 0 Signal | +5 Signal | 잔액 < 20 |
| 아이템 판매 | 0 Signal | 아이템 → Signal 변환 | 인벤토리 비어있지 않음 |
| 보물 탐색 | 15 Signal | +50~100 Signal 또는 아이템 | 특정 장소/힌트 |
| 퀘스트 보상 수령 | 0 Signal | 목표 달성 보상 | 서브 목표 완료 시 |

### 3단계: 탐색 중 재화 아이템 발견

- GM이 탐색 행동 결과로 **Signal 포함 아이템** 생성:
  - "오래된 동전 주머니" → 사용 시 +20 Signal
  - "빛나는 결정" → 판매 가능 (30 Signal)
  - "행운의 부적" → 보유 시 행동당 +1 Signal 보너스
- 인벤토리에서 "판매" 액션 가능 (아이템 → Signal 변환)

### 4단계: 잔액 부족 시 GM 힌트

- 프롬프트에 지침 추가:
  - "플레이어 잔액이 20 Signal 미만일 때, 내러티브에 자연스럽게 재화 획득 힌트를 포함하세요"
  - 예: "저 구석에 무언가 빛나는 것이 보입니다...", "이 물건을 팔면 괜찮은 값을 받을 수 있을 것 같습니다"

### 5단계: UI 피드백

- Economy HUD에 잔액 부족 경고 (노란색/빨간색 테두리)
- 이미지 생성 시 FAST로 폴백되면 "(기본 품질)" 라벨 표시
- 재화 획득 액션 카드에 💰 또는 녹색 배지로 구분

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-014[Mvp]](U-014[Mvp].md) - Economy HUD + Ledger 기본 구조
- **계획서**: [U-019[Mvp]](U-019[Mvp].md) - 이미지 생성 서비스(모델 티어링)
- **계획서**: [U-078[Mvp]](U-078[Mvp].md) - 목표 시스템(보상 지급 흐름)

**다음 작업에 전달할 것**:

- CP-MVP-03: "재화 획득 → 소비 → 획득" 경제 루프 데모 시나리오
- MMP: 고급 경제 시스템 (인플레이션 방지, 밸런싱)

## 주의사항

**기술적 고려사항**:

- (RULE-005 수정) "잔액 음수 금지"를 "잔액 부족 시 대안 제공"으로 완화. 단, ledger 기록은 정확히 유지.
- 무료 기본 이미지는 비용 0이 아니라 "비용 발생하지만 잔액 차감 유예" 또는 "저비용 모델로 대체"로 처리
- 재화 획득 확률이 너무 높으면 경제 인플레이션 발생 → 적절한 밸런싱 필요

**잠재적 리스크**:

- 재화 획득이 너무 쉬우면 경제 시스템의 의미가 퇴색 → 적절한 비용/보상 비율 유지
- GM이 재화 획득 액션을 제대로 생성하지 않으면 플레이어가 막힘 → 프롬프트 지침 강화 + 폴백 액션 강제 삽입
- 크레딧 시스템 남용으로 무한 빚 → 크레딧 상한 설정 (-50 Signal)

## 페어링 질문 (결정 필요)

- [x] **Q1**: 잔액 부족 시 정책?
  - Option A: 크레딧(빚) 시스템 (잔액 음수 허용, 상한 있음)
  - ✅Option B: 무료 기본 이미지 (FAST 모델로 자동 폴백, 비용 유예)
  - Option C: 텍스트-only 폴백 (이미지 생성 완전 차단)

- [x] **Q2**: 재화 획득 액션 카드 등장 빈도?
  - Option A: 항상 1개 이상 포함 (보장)
  - Option B: 잔액이 낮을 때만 등장 (< 30 Signal)
  - ✅Option C: GM 판단에 맡김 (프롬프트 지침만)

- [x] **Q3**: 아이템 판매 기능?
  - ✅Option A: MVP에서 구현 (인벤토리에서 "판매" 버튼)
  - Option B: MMP로 미룸 (MVP에서는 판매 불가)
  - Option C: 특수 NPC/장소에서만 판매 가능

- [x] **Q4**: 재화 획득 이벤트 알림?
  - Option A: 내러티브에만 표시 ("10 Signal을 얻었다!")
  - Option B: Economy HUD에 애니메이션 + 내러티브
  - Option C: 별도 팝업/토스트 알림

## 참고 자료

- `vibe/prd.md` 5절 - 게임 재화(코스트) 시스템
- `vibe/prd.md` 5.5절 - UX 요구사항 (예상 비용/대안 제공)
- `vibe/unit-plans/U-014[Mvp].md` - Economy HUD
- `vibe/unit-plans/U-066[Mvp].md` - 모델 티어링 (FAST/QUALITY)
