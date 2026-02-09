# U-133[Mvp]: 프로필 시작 이미지-스토리 정합성 강화 — 첫 턴 맥락 주입

## 메타데이터

| 항목      | 내용                                                      |
| --------- | --------------------------------------------------------- |
| Unit ID   | U-133[Mvp]                                                |
| Phase     | MVP                                                       |
| 예상 소요 | 40분                                                      |
| 의존성    | U-124[Mvp], U-131[Mvp]                                   |
| 우선순위  | High (데모 첫인상 / 스토리 몰입 핵심)                     |

## 작업 목표

프로필 시작 시 **사전 생성 이미지(U-124)의 시각적 맥락이 첫 번째 턴의 내러티브에 자연스럽게 이어지도록**, 이미지 설명(scene description)을 첫 턴 프롬프트에 주입하고, 환영 메시지와 첫 턴 사이의 **서사적 연결**을 강화한다. 이미지가 "스타일 레퍼런스"에 그치지 않고, **이어지는 스토리의 한 축**으로 동작하게 한다.

**배경**: 현재 프로필 시작 시 환영 메시지(예: "고대의 도서관에 오신 것을 환영합니다")와 사전 생성 이미지(서재/도서관)는 일치하지만, 첫 번째 턴에서 GM이 생성하는 내러티브(예: "자욱한 안개를 헤치고... 금속 문이... 푸른 빛이 맥박처럼")가 이미지 맥락과 뜬금없이 달라지는 문제가 있다. 이는 GM이 첫 턴에서 사전 생성 이미지의 **구체적인 시각적 요소(서재, 촛불, 먼지 낀 책 등)**를 알지 못하기 때문이다. 이미지 설명을 첫 턴 맥락으로 주입하면, GM이 해당 장면에서 자연스럽게 이야기를 시작할 수 있다.

**완료 기준**:

- 3종 프로필 각각에 **초기 씬 설명(initialSceneDescription)** 텍스트가 정의됨
- 첫 턴(turn 1) 요청 시, 사전 생성 이미지의 **씬 설명이 GM 프롬프트에 맥락으로 주입**됨
- 첫 턴 내러티브가 환영 메시지 → 사전 생성 이미지 → 첫 턴 스토리로 **자연스럽게 이어짐**
- 뜬금없는 장소/상황 전환 없이, 이미지에 보이는 요소(서재의 책, 동굴의 횃불 등)가 첫 턴에 반영됨
- ko/en 양 언어에서 동일하게 동작
- 2턴 이후에는 일반 턴 로직으로 복귀 (첫 턴 전용 주입)
- Overarching Mystery(U-131)의 분위기가 첫 턴부터 은은하게 반영됨

## 영향받는 파일

**수정**:

- `frontend/src/data/demoProfiles.ts` - 각 프로필에 `initialSceneDescription` 필드 추가 (ko/en 키 또는 직접 텍스트)
- `frontend/src/turn/turnRunner.ts` - 첫 턴(turnCount === 0) 요청 시 `initialSceneDescription`을 TurnInput에 포함
- `backend/src/unknown_world/orchestrator/orchestrator.py` - (또는 프롬프트 구성 로직) 첫 턴에 씬 설명 맥락을 GM 프롬프트에 주입
- `backend/prompts/turn/turn_output_instructions.ko.md` - 첫 턴 씬 설명 활용 지침 추가
- `backend/prompts/turn/turn_output_instructions.en.md` - 동일 (영어)

**참조**:

- `vibe/unit-results/U-124[Mvp].md` - 프로필별 첫 씬 이미지 사전 생성
- `vibe/unit-plans/U-131[Mvp].md` - Overarching Mystery (첫 턴부터 분위기 반영)
- `frontend/src/save/sessionLifecycle.ts` - 프로필 시작 로직
- `frontend/src/locales/ko-KR/translation.json` / `en-US/translation.json` - 환영 메시지 키

## 구현 흐름

### 1단계: 프로필별 초기 씬 설명 정의

- `demoProfiles.ts`에 `initialSceneDescription` 필드 추가:

```typescript
// DemoProfileInitialState에 추가
initialSceneDescription?: {
  ko: string;
  en: string;
};
```

- 각 프로필의 사전 생성 이미지에 맞는 씬 설명 작성:

  - **Narrator**: "먼지가 쌓인 고풍스러운 서재. 흔들리는 촛불이 수백 권의 고서를 비추고, 큰 참나무 책상 위에 두루마리가 펼쳐져 있다. 달빛이 고딕 양식의 창문을 통해 스며든다."
  - **Explorer**: "미지의 동굴 입구. 횃불이 안개 사이로 흔들리고, 신비한 문양이 새겨진 석조 기둥이 양쪽에 서 있다. 동굴 안쪽에서 희미한 바람이 불어온다."
  - **Tech**: "첨단 실험실. 홀로그래픽 디스플레이가 공중에 떠 있고, 회로 기판과 빛나는 튜브가 벽을 따라 늘어서 있다. 중앙의 제어 패널이 청록색 빛을 내뿜는다."

### 2단계: 첫 턴 TurnInput에 씬 설명 주입

- `turnRunner.ts`에서 첫 턴(turnCount === 0 또는 첫 번째 사용자 액션) 요청 시:
  - 현재 프로필의 `initialSceneDescription`을 TurnInput의 추가 맥락(context 또는 system hint)으로 포함
  - 예: `TurnInput.context.scene_description` 또는 기존 `text` 필드에 프리픽스로 주입

### 3단계: 백엔드 프롬프트에 씬 설명 활용 지침

- `turn_output_instructions.{ko,en}.md`에 다음 지침 추가:
  - "첫 턴에 `scene_description`이 제공되면, 해당 장면의 시각적 요소를 기반으로 내러티브를 시작할 것"
  - "환영 메시지에서 자연스럽게 이어지는 장면 전개를 할 것 (뜬금없는 장소 전환 금지)"
  - "이미지에 보이는 구체적 오브젝트(책, 횃불, 디스플레이 등)를 내러티브에 언급할 것"

### 4단계: 환영 메시지 보강 (선택)

- 필요 시, 환영 메시지 i18n 키를 더 구체적으로 수정하여 이미지와의 연결성 강화
- 예: "고대의 도서관에 오신 것을 환영합니다" → "먼지 낀 고서들 사이에서 눈을 떴습니다. 촛불이 흔들리고, 오래된 양피지 냄새가 코끝에 닿습니다..."

### 5단계: 검증

- 3종 프로필 각각 시작 → 환영 메시지 → 첫 액션 → 첫 턴 내러티브 흐름 확인:
  - 이미지(서재)와 환영 메시지(도서관)와 첫 턴(서재 내부 탐색)이 **하나의 장면으로 이어지는지**
  - "자욱한 안개... 금속 문..." 같은 뜬금없는 전환이 발생하지 않는지
- ko/en 양 언어에서 검증
- Overarching Mystery 분위기가 첫 턴부터 살짝 느껴지는지 확인 (U-131 연계)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-124[Mvp]](../unit-results/U-124.md) - 프로필별 첫 씬 이미지 (이미지 스타일/내용 SSOT)
- **계획서**: [U-131[Mvp]](U-131[Mvp].md) - Overarching Mystery (첫 턴부터 분위기 반영)

**다음 작업에 전달할 것**:

- CP-MVP-03: 데모 루프에서 "프로필 시작 → 첫 턴" 전환의 자연스러움 검증
- U-119[Mmp]: WIG 폴리시에서 첫인상(이미지-텍스트 정합) 최종 점검

## 주의사항

**기술적 고려사항**:

- (RULE-007/008) 씬 설명은 GM에게 제공하는 **내부 맥락**이므로, UI/에이전트 콘솔에 원문을 노출하지 않음
- (PRD 6.1) GM의 출력은 구조화 결과(JSON Schema)이므로, 씬 설명 주입은 **입력 맥락**으로만 동작
- 첫 턴 전용 로직이므로, 2턴 이후에는 기존 멀티턴 히스토리(U-127)가 맥락을 관리
- `TurnInput` 스키마에 `scene_description` 필드를 추가하는 방식과, 기존 `text` 필드에 시스템 프리픽스로 주입하는 방식 중 선택 필요
- 참조 이미지(U-124의 `toBackendReferenceUrl`)는 이미 Gemini에 전달되지만, 이미지만으로는 GM이 시각적 요소를 충분히 활용하지 못할 수 있으므로 **텍스트 설명 병행이 효과적**

**잠재적 리스크**:

- 씬 설명이 너무 구체적이면 GM의 창의성이 제한될 수 있음 → "이 장면에서 시작하되, 자유롭게 전개" 수준의 지침 유지
- 씬 설명과 참조 이미지 간 불일치가 생기면 혼란 → 동일한 장면을 기술하므로 사전 정합 확인

## 페어링 질문 (결정 필요)

- [x] **Q1**: 씬 설명을 TurnInput에 전달하는 방식은?
  - ✅Option A: **`TurnInput`에 `scene_context` 필드 추가** (명시적, 스키마 변경 필요)
  - Option B: **`text` 필드에 시스템 프리픽스로 주입** (스키마 변경 없음, 간단)
  - Option C: **백엔드에서 첫 턴 감지 시 자동 주입** (프론트 변경 최소화)

- [x] **Q2**: 환영 메시지도 이미지 맥락에 맞게 수정할 것인가?
  - ✅Option A: **수정** — 환영 메시지를 더 구체적으로 변경 (이미지와의 연결 강화)
  - Option B: **유지** — 현재 환영 메시지 유지, 첫 턴에서만 씬 설명 활용

## 참고 자료

- `vibe/unit-results/U-124[Mvp].md` - 프로필별 첫 씬 이미지 (서재/동굴/실험실)
- `vibe/unit-plans/U-131[Mvp].md` - Overarching Mystery 시스템
- `frontend/src/data/demoProfiles.ts` - 프로필 초기 상태
- `frontend/src/turn/turnRunner.ts` - 턴 실행 흐름
- `backend/prompts/turn/turn_output_instructions.ko.md` - 턴 출력 지침
- `vibe/prd.md` 6.9절 - 데모 프로필 설계
