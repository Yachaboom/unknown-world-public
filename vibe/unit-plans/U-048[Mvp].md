# U-048[Mvp]: Mock Orchestrator - 액션 echo/내러티브 템플릿 개선(“말했습니다” 제거, 반복 완화)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-048[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 45분        |
| 의존성    | U-007[Mvp]  |
| 우선순위  | High        |

## 작업 목표

Mock 모드에서 TurnInput이 Action Deck/클릭/드롭으로 들어오는 경우, 내러티브가 `...라고 말했습니다`(또는 `You said ...`) 같은 **대사 템플릿**으로 고정되지 않게 하고, 반복되는 고정 내러티브를 완화하여 “데모/개발 중 체감”을 개선한다.

**배경**: 현재 `backend/src/unknown_world/orchestrator/mock.py`는 `turn_input.text`가 존재하면 무조건 `...라고 말했습니다` 프리픽스를 붙이고, seed 기반 결정적 생성 특성상 로컬에서 같은 입력/시드 조합으로 **동일한 문장**이 반복 노출될 수 있다. Action Deck 카드 라벨(예: “말을 걸어본다”, “문을 열어본다”)은 ‘대사’가 아니므로 UX가 어색해진다. (PRD 9.0, RULE-002)

**완료 기준**:

- `action_id`가 있는 입력(Action Deck 클릭)은 `...라고 말했습니다`가 아니라 “행동 실행/시도” 형태의 로그로 표현된다.
- `click`/`drop` 입력은 각각 “조사/사용” 같은 행동 로그로 표현되어, 입력 타입과 문장이 불일치하지 않는다.
- seed 기반 재현성은 유지하되, 서로 다른 입력(액션 라벨/클릭/드롭)에 대해 내러티브가 **완전히 동일하게 고정**되지 않도록 결정적 다양성이 확보된다.
- 기존 Hard Gate(스키마/경제/안전/좌표) 및 스트리밍 계약에 영향을 주지 않는다(모의 오케스트레이터 내부 텍스트만 개선).

## 영향받는 파일

**생성**:

- `backend/tests/unit/orchestrator/test_mock_orchestrator.py` - mock 내러티브 프리픽스/결정적 다양성 테스트(권장)

**수정**:

- `backend/src/unknown_world/orchestrator/mock.py`
  - 입력 타입별( action_id / click / drop / free text ) 프리픽스 템플릿 재정의
  - per-turn 결정적 RNG(예: base seed + 입력 특징 해시)로 “고정 내러티브 반복” 완화

**참조**:

- `vibe/prd.md` - 9.0(UI 형태/행동 로그), 10장(데모/검증 루프)
- `backend/src/unknown_world/models/turn.py` - `TurnInput.action_id/click/drop` 계약
- `backend/src/unknown_world/orchestrator/pipeline.py` - mock/real 모드 분기(맥락)
- `.cursor/rules/00-core-critical.mdc` - RULE-002/004/005/008/009

## 구현 흐름

### 1단계: 입력 타입별 “행동 로그” 템플릿 정의

- `TurnInput`의 입력 타입을 우선순위로 분류한다(예시):
  - drop(아이템 사용) > click(조사) > action_id(카드 실행) > free text(대사/명령)
- 한국어/영어 모두에서 “said” 템플릿이 액션에 붙지 않도록 템플릿을 분리한다.
  - 예: `행동 실행: {text}` / `조사: {object_id}` / `사용: {item_id} → {target_object_id}`

### 2단계: 결정적 다양성 확보(고정 반복 완화)

- 현재 `MockOrchestrator(seed)`가 매 요청마다 같은 seed로 재생성될 수 있으므로,
  “첫 샘플이 항상 동일”해지는 문제를 피한다.
- 방식(예시):
  - base seed + `(turn_input.text, action_id, click.object_id, drop.item_id, drop.target_object_id)`를 해시하여
    per-turn RNG를 만들고, 내러티브/카드/오브젝트 선택에 사용한다.
- 목표는 “랜덤”이 아니라 **입력에 반응하는 결정적 변화**다(재현성 유지).

### 3단계: 테스트/검증

- action_id가 있는 입력에 대해, 생성된 `TurnOutput.narrative`에 `...라고 말했습니다`가 포함되지 않는지 확인한다.
- 서로 다른 카드 라벨(예: “문을 열어본다” vs “주변을 탐색한다”)에 대해 내러티브가 동일하게 고정되지 않는지 확인한다.
- 기존 스키마/경제/좌표 인바리언트는 여전히 만족해야 한다(회귀 방지).

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-007[Mvp]](U-007[Mvp].md) - 모의 Orchestrator 기본 골격/스트리밍 전제

**다음 작업에 전달할 것**:

- `.env` 로딩이 누락되어 mock 모드로 실행되더라도 “어색한 문장 반복” 없이 프론트 개발/데모가 가능
- UI/UX 폴리시(U-049/U-050) 단계에서 내러티브 피드 체감 품질이 올라가 “채팅 래퍼” 오해를 줄임

## 주의사항

**기술적 고려사항**:

- mock 모드는 dev/데모 지속성을 위한 장치이므로, 문장 품질 개선이 “구조화 출력/검증/경제” 계약을 건드리면 안 된다.
- “입력 프리픽스”는 게임 로그 성격으로 짧게 유지하고, 프롬프트/내부 추론을 흉내 내지 않는다. (RULE-008)

**잠재적 리스크**:

- 해시/결정적 RNG 설계가 부주의하면, 입력이 조금만 달라져도 결과가 너무 흔들릴 수 있음 → “입력 타입/핵심 필드”만 사용해 안정성을 유지한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: free text(사용자 직접 입력)에도 `...라고 말했습니다` 템플릿을 유지할까?
  - Option A: 유지(대사/입력 느낌, 단순)
  - Option B: 일관되게 “행동 로그”로 통일(권장: 액션/입력 혼선을 줄임)
  **A1**: Option B

## 참고 자료

- `backend/src/unknown_world/orchestrator/mock.py` - 현재 템플릿/seed 구조
- `vibe/prd.md` - 9.0(게임 로그/행동 로그), 10장(데모 루프)
