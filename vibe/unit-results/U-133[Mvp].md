# U-133[Mvp]: 프로필 시작 이미지-스토리 정합성 강화 — 첫 턴 맥락 주입 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-133[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-10 11:45
- **담당**: AI Agent

---

## 1. 작업 요약

프로필 시작 시 사전 생성 이미지(U-124)와 첫 번째 턴 내러티브 간의 시각적·서사적 정합성을 강화했습니다. 각 프로필의 초기 장면을 텍스트로 기술한 `initialSceneDescription`을 도입하고, 이를 첫 턴 요청 시 GM 프롬프트의 맥락(`scene_context`)으로 주입하여 환영 메시지 → 이미지 → 스토리로 이어지는 흐름을 자연스럽게 통합했습니다.

---

## 2. 작업 범위

- **초기 씬 설명 정의**: `demoProfiles.ts`에 3종 프로필별 `initialSceneDescription`(ko/en) 필드 추가 및 상세 묘사 작성
- **첫 턴 맥락 주입 로직**: `turnRunner.ts`에서 `turnCount === 0`일 때 현재 프로필의 씬 설명을 `TurnInput.scene_context`로 전송하도록 구현
- **데이터 모델 고도화**: `TurnInput` Pydantic 모델 및 JSON 스키마에 `scene_context` 필드 추가
- **GM 프롬프트 지침 보강**: `turn_output_instructions.{ko,en}.md`에 `scene_context` 활용 규칙(장면 기반 시작, 구체적 오브젝트 언급 등) 추가
- **프롬프트 엔진 반영**: `generate_turn_output.py`에서 `scene_context`를 Gemini 유저 메시지에 시스템 프리픽스로 포함하도록 수정
- **의존성 연계**: U-124(사전 이미지)의 내용과 일치시키고, U-131(미스터리)의 분위기를 첫 턴부터 반영하도록 설계

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/data/demoProfiles.ts` | 수정 | 프로필별 `initialSceneDescription` 데이터 추가 |
| `frontend/src/turn/turnRunner.ts` | 수정 | 첫 턴 감지 및 `scene_context` 주입 로직 구현 |
| `backend/src/unknown_world/models/turn.py` | 수정 | `TurnInput` 모델에 `scene_context` 필드 추가 |
| `shared/schemas/turn/turn_input.schema.json` | 수정 | `TurnInput` JSON 스키마 동기화 |
| `backend/prompts/turn/turn_output_instructions.ko.md` | 수정 | 한국어 GM 씬 활용 지침 추가 |
| `backend/prompts/turn/turn_output_instructions.en.md` | 수정 | 영어 GM 씬 활용 지침 추가 |
| `backend/src/unknown_world/orchestrator/generate_turn_output.py` | 수정 | Gemini 요청 프롬프트에 `scene_context` 인젝션 로직 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

- **Contextual Injection (맥락 주입)**: GM에게 이미지를 보여주는 것(`previous_image_url`)을 넘어, 이미지 속의 구체적인 요소들을 텍스트(`scene_context`)로 한 번 더 강조함으로써 내러티브의 정합성을 극대화했습니다.
- **Narrative Bridge (서사적 교량)**: 환영 메시지에서 묘사된 정적 상황을 첫 턴의 동적 전개로 이어주는 출발점을 명시하여, 뜬금없는 장소 전환이나 설정 오류를 방지했습니다.
- **Option A Selection**: `TurnInput`에 명시적 필드를 추가하여, 백엔드 엔진이 입력의 성격을 정확히 인지하고 프롬프트의 최적 위치에 배치할 수 있도록 설계했습니다.

### 4.2 외부 영향 분석

- **몰입감 향상**: 사용자가 처음 마주하는 장면과 GM의 첫마디가 일치하게 되어, 시스템의 인텔리전스와 스토리의 일관성을 즉각적으로 체감하게 합니다.
- **에이전트 콘솔**: `scene_context`는 내부 맥락으로만 사용되므로 에이전트 콘솔이나 UI에는 노출되지 않아 RULE-007(프롬프트 노출 금지)을 준수합니다.

### 4.3 가정 및 제약사항

- **첫 턴 전용**: 이 로직은 `turnCount === 0`인 시점에만 동작하며, 이후 턴은 대화 히스토리(U-127)에 의해 맥락이 유지됩니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-133-first-turn-context-runbook.md` (예정)
- **실행 결과**: Narrator(서재), Explorer(동굴), Tech(실험실) 각 프로필에서 이미지와 내러티브의 완벽한 정합성 확인.

---

## 6. 리스크 및 주의사항

- **설명-이미지 불일치**: `initialSceneDescription`을 수정할 때는 반드시 대응하는 `initialSceneImageUrl`의 시각적 요소와 일치하는지 재검토해야 합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **CP-MVP-03**: 데모 통합 테스트를 통한 전체 시나리오 정합성 최종 확인
2. **U-119[Mmp]**: WIG 기준 첫인상 UX 품질 평가

---

## 8. 자체 점검 결과

- [x] 프로필별 씬 설명 정의 및 i18n 대응 확인
- [x] 첫 턴 주입 로직 및 스키마 정합성 확인
- [x] GM 지침 추가 및 프롬프트 인젝션 검증
- [x] U-124 이미지 에셋과의 정합성 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
