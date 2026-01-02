# U-026[Mvp]: 리플레이/시나리오 하네스(저장+수동 러너)

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-026[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 75분                              |
| 의존성    | U-024,U-025                       |
| 우선순위  | ⚡ Critical                        |

## 작업 목표

대표 데모 시나리오를 seed+액션 시퀀스로 저장하고, 동일 액션을 재실행하는 **리플레이 하네스(수동 러너)** 를 구축해 회귀(regression)를 지속적으로 잡을 수 있게 한다.

**배경**: PRD는 “지속적으로 데모 테스트를 직접 할 수 있도록” replay/scenario harness를 핵심 개발 방식으로 요구한다. (PRD 10.3)

**완료 기준**:

- 시나리오 파일이 `seed + actions + invariants` 형태로 저장된다.
- 수동 러너(스크립트/버튼)가 시나리오를 재실행해 Hard Gate 인바리언트(스키마/경제/안전/일관성)를 점검할 수 있다.
- 결과로 WorldState diff(최소) 또는 체크 결과가 아티팩트로 남는다(프롬프트 원문/내부 추론은 제외). (RULE-008)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/replay/scenario_types.py` - 시나리오 모델(Pydantic, seed/actions/invariants)
- `backend/src/unknown_world/replay/scenario_library/` - 대표 시나리오 파일(예: json)
- `backend/src/unknown_world/replay/runner.py` - 수동 러너(시나리오 실행)
- `frontend/src/components/ReplayRunnerPanel.tsx` - (선택) 데모 모드에서 실행 버튼/결과 표시

**수정**:

- 없음(연동은 선택)

**참조**:

- `vibe/prd.md` 10.3 - Replay & Scenario Harness 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-008/004/005
- `.gemini/GEMINI.md` (observability-replay rules) - scenario 형태/체크리스트

## 구현 흐름

### 1단계: 시나리오 포맷 정의(seed+actions+invariants)

- actions 예: `text`, `click(object_id, box_2d?)`, `drag(item_id → object_id)`, `upload(image)` 등
- invariants 예: `schema_valid`, `economy_non_negative`, `safety_fallback_present`, `bbox_format_ok`

### 2단계: 수동 러너 구현

- 시나리오를 순차 실행하며 각 턴마다:
  - TurnOutput 스키마 검증 결과
  - economy 잔액 음수 여부
  - blocked/폴백 존재 여부
  - bbox 규약 위반 여부
  를 체크한다.
- 실패 시 어느 단계에서 깨졌는지(턴 번호/인바리언트)만 기록한다(프롬프트 원문 금지).

### 3단계: 결과 아티팩트 생성

- 러너 결과를 `unit-results` 또는 runtime artifacts로 저장한다:
  - 요약: pass/fail, 실패 원인, 첫 실패 턴
  - (선택) WorldState diff 요약

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-024[Mvp]](U-024[Mvp].md) - Autopilot(자동 액션 시퀀스) 실행 흐름
- **계획서**: [U-025[Mvp]](U-025[Mvp].md) - 엔딩 리포트 아티팩트(결과물 검증)

**다음 작업에 전달할 것**:

- RU-007에서 정리할 artifacts 경로/버전/링크 표준
- MMP의 U-105(Scenario Library 확장)로 자연스럽게 확장되는 기반

## 주의사항

**기술적 고려사항**:

- (RULE-008) 관측/리플레이는 “증거”지만 프롬프트 원문/내부 추론은 기록하지 않는다.
- (RULE-004) 비결정성은 인정하되, 인바리언트는 항상 만족해야 한다(텍스트 내용은 달라도 됨).

**잠재적 리스크**:

- 멀티모달 업로드(이미지)는 자동화가 어려울 수 있음 → MVP는 텍스트/클릭/드래그 중심 시나리오부터 시작하고 업로드는 수동 보조로 둔다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 시나리오 저장 위치/형식은?
  - Option A: `backend/src/unknown_world/replay/scenario_library/*.json` (권장: 단순/명확)
  - Option B: `vibe/unit-runbooks/`에 사람이 읽는 형태로 저장(문서 친화, 실행 자동화는 별도 필요)

## 참고 자료

- `vibe/prd.md` - Replay/Scenario Harness
- `.cursor/rules/00-core-critical.mdc` - RULE-004/005/008


