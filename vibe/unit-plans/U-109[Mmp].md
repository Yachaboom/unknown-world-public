# U-109[Mmp]: Agentic Vision - 생성된 장면 이미지 기반 행동/핫스팟 근거화

## 메타데이터

| 항목      | 내용               |
| --------- | ------------------ |
| Unit ID   | U-109[Mmp]         |
| Phase     | MMP                |
| 예상 소요 | 75분               |
| 의존성    | U-019,U-020,RU-005 |
| 우선순위  | High               |

## 작업 목표

Gemini 3 Flash의 **Agentic Vision(Code Execution)** 을 활용해 “생성된 장면 이미지”를 근거로 **Action Deck(행동 카드)** 과 **Scene Hotspots(클릭 오브젝트)** 를 더 구체적이고 사실적으로 제시한다.

**배경**: 현재 모델은 장면을 “한 번에” 보고 추론하는 경향이 있어, 작은 디테일/텍스트/오브젝트를 놓치면 행동 카드가 장면과 어긋날 수 있다. Agentic Vision은 Think→Act→Observe 루프로 이미지 패치를 직접 조사(줌/크롭/주석)하며 결과를 시각적 증거에 고정할 수 있다. (PRD 6.7/8.6, `https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/`)

**완료 기준**:

- (입력) TurnInput에 **현재 장면 이미지 참조**(예: `scene_image_url`)를 선택적으로 포함할 수 있고, 서버는 안전하게 이미지 바이트를 로드할 수 있다.
- (비전) `gemini-3-flash-preview` + built-in `code_execution` + Structured Outputs(JSON Schema)로 **장면 affordances(오브젝트 후보 + bbox + 행동 힌트)** 를 추출한다.
- (출력) affordances를 근거로 TurnOutput의 `ui.action_deck.cards[]`와 `ui.objects[]`가 장면에 정합되게 생성된다(좌표는 0~1000, bbox는 `[ymin,xmin,ymax,xmax]` 준수). (RULE-009)
- (경제/폴백) 비전 호출은 비용/지연이 있으므로 **명시적 트리거(예: “정밀 조사” 카드)** 또는 정책(Assist/Autopilot/Key scene)으로 제어되며, 실패/차단 시 기존 텍스트 기반 생성으로 안전 폴백한다. (RULE-004/005/008)
- (보안) 프롬프트 원문/이미지 바이트/비밀정보가 로그/스트림/UI로 노출되지 않는다(메타만). (RULE-007/008)

## 영향받는 파일

**생성**:

- `backend/prompts/vision/scene_affordances.ko.md` - Agentic Vision용 “장면 affordances 추출” 프롬프트(Structured Outputs 전제, XML 태그 규격)
- `backend/prompts/vision/scene_affordances.en.md` - 동일(영문)
- `backend/src/unknown_world/services/agentic_vision.py` - Flash+Code Execution 기반 이미지 조사(줌/크롭) + affordances 구조화 출력 래퍼

**수정**:

- `backend/src/unknown_world/models/turn.py` - (선택) TurnInput에 `scene_image_url`(또는 `scene_image_id`) 같은 “현재 장면 이미지 참조” 필드 추가(하위 호환: optional)
- `backend/src/unknown_world/orchestrator/repair_loop.py` - Repair loop 내부에서 **비전 분석은 1회만 수행**하고, 결과를 `world_context`로 주입(재시도 시 중복 호출 방지)
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - (선택) 프롬프트 입력 요약에 `scene_image_url` 포함(모델이 “정밀 조사” 카드를 자연스럽게 제시/해석하도록)
- `backend/prompts/turn/turn_output_instructions.ko.md` - “정밀 조사(Agentic Vision)” 액션 카드/정합성 규칙 추가(프롬프트 XML 태그 규격 유지)
- `backend/prompts/turn/turn_output_instructions.en.md` - 동일(영문)
- `frontend/src/api/turnStream.ts` / `frontend/src/turn/turnRunner.ts` - (선택) TurnInput에 현재 Scene 이미지 참조를 함께 전송(트리거 조건일 때만)
- `frontend/src/schemas/turn.ts` - (선택) TurnInput Zod 스키마에 `scene_image_url` 동기화

**참조**:

- `vibe/prd.md` - 6.7(Action Deck), 8.6(이미지 이해/Agentic Vision), 5장(경제 UX), 10장(게이트/리플레이)
- `vibe/tech-stack.md` - 비전/공간 모델(`gemini-3-flash-preview`), Structured Outputs/Tools 결합 원칙
- `backend/src/unknown_world/services/image_generation.py` - 생성 이미지 로컬 저장/서빙 경로(`/static/images/*`) 규약
- `vibe/ref/gemini-api-guide.md` - Code Execution, Structured outputs with tools

## 구현 흐름

### 1단계: “장면 이미지 참조” 입력 경로 확정(하위 호환)

- TurnInput에 `scene_image_url`(또는 `scene_image_id`)를 **선택 필드**로 추가하여, 서버가 현재 화면의 장면 이미지를 식별할 수 있게 한다.
- 서버는 `scene_image_url`이 `/static/images/` 프리픽스를 만족하는지 검증하고, 로컬 저장 디렉토리(`generated_images/`)로 안전하게 매핑한다(경로 탈출 방지).
- (선택) 이 값은 기본 턴에서 항상 보내지 않고, “정밀 조사(비전)” 트리거 액션일 때만 보내 비용을 통제한다.

### 2단계: Agentic Vision(Flash+Code Execution) affordances 추출 서비스

- `gemini-3-flash-preview`로 “장면 affordances 추출”을 수행한다.
- built-in tool로 `code_execution`을 활성화하여, 모델이 이미지 패치를 반복 검사(줌/크롭/주석)할 수 있게 한다.
- 응답은 Structured Outputs(JSON Schema)로 받아서:
  - `label`(표시명)
  - `box_2d`(0~1000 정규화 bbox)
  - `suggested_actions[]`(짧은 행동 후보)
  - (선택) `confidence`, `evidence_notes`(디버그/관측용)
  형태로 정규화한다.
- 실패 시에는 빈 affordances로 폴백하고, 턴 생성 흐름을 중단하지 않는다. (RULE-004)

### 3단계: Repair loop에 “1회 분석 + 컨텍스트 주입” 연결

- `run_repair_loop()` 진입 시(또는 attempt=0 이전) 비전 분석을 1회 수행하고, 결과를 **짧은 JSON/요약 텍스트**로 `world_context`에 주입한다.
- repair 재시도(attempt>0)에서는 비전 분석을 재호출하지 않으며, 동일 컨텍스트를 재사용한다(비용 폭증 방지).
- TurnOutput 생성 프롬프트에는 “이 컨텍스트에 있는 affordances와 bbox를 근거로 Action Deck/Hotspots를 구성하라”는 규칙을 명시한다.

### 4단계: Action Deck/Hotspots 정합성 규칙(프롬프트) 보강

- `turn_output_instructions.*.md`에 아래 정책을 추가한다:
  - `scene_image_url`이 존재할 때 “정밀 조사(Agentic Vision)” 카드(고정 id 권장)를 1장 포함(사용자가 비용을 보고 선택 가능)
  - `world_context`에 affordances가 제공되면, `ui.objects[]`의 라벨/상호작용 힌트는 affordances를 우선 사용하고, bbox는 임의 생성하지 않는다.
  - affordances가 비어있거나 실패했을 때는 기존 텍스트 기반 추천으로 폴백(단, 환각 억제: ‘보이지 않는 오브젝트’ 언급 최소화)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서/결과물**: [U-019[Mvp]](U-019[Mvp].md) - 생성 이미지 로컬 저장/서빙(기본), image_url 규약
- **계획서/결과물**: [U-020[Mvp]](U-020[Mvp].md) - Scene Canvas 이미지 레이어/placeholder/폴백(“이미지 없어도 진행”)
- **결과물**: [RU-005[Mvp]](../unit-results/RU-005[Mvp].md) - stage pipeline(Validate에서 생성, Repair loop 경계)

**다음 작업에 전달할 것**:

- (선택) U-106(관측 지표)에서 “비전 호출 횟수/지연/성공률/폴백률”을 메트릭으로 추가할 수 있는 기반
- (선택) U-105(자동 리플레이)에서 “장면 정합성(행동 카드가 화면 오브젝트를 참조)” 회귀 시나리오 추가 기반

## 주의사항

**기술적 고려사항**:

- (RULE-004/005) Agentic Vision은 “추가 호출”이므로, 자동 실행 시 비용/지연이 급증할 수 있다 → 기본은 **명시적 트리거(카드)** 또는 Key scene 제한을 권장한다.
- (RULE-007/008) 프롬프트/이미지 원문 노출 금지: 로그/스트림에는 결과 요약(라벨 수, bbox 개수, 성공/실패) 같은 메타만 남긴다.
- Structured Outputs + built-in tools(code_execution)는 가능하지만, built-in tools와 function calling 동시 사용은 제한될 수 있으므로 설계 분리 원칙을 유지한다. (PRD 8.4)

**잠재적 리스크**:

- Agentic Vision 호출이 실패/불안정(Preview/권한/도구 제약)할 수 있음 → 실패를 “정상 흐름”으로 취급하고 텍스트 기반 추천으로 즉시 폴백한다.
- bbox/좌표계 드리프트로 클릭이 어긋날 수 있음 → 항상 0~1000 정규화 + `[ymin,xmin,ymax,xmax]` 고정, 검증 실패 시 objects를 비우고도 진행 가능하게 한다. (RULE-009)

## 페어링 질문 (결정 필요)

- [ ] **Q1**: Agentic Vision은 언제 실행할까?
  - Option A: “정밀 조사(비전)” 카드 선택 시에만 실행(권장: 비용/지연 제어)
  - Option B: Assist/Autopilot에서 자동 실행(정합성↑, 비용/지연↑)
- [ ] **Q2**: TurnInput으로 이미지 참조를 어떻게 전달할까?
  - Option A: `scene_image_url`(예: `/static/images/...`) 전달(권장: 프론트가 이미 알고 있음)
  - Option B: `scene_image_id`만 전달하고 서버가 매핑(더 엄격, 프론트 변경 필요)
- [ ] **Q3**: affordances 결과를 TurnOutput에 포함할까?
  - Option A: 포함하지 않고(내부 전용), `ui.action_deck/objects`만 개선(권장: 스키마 변경 최소)
  - Option B: `agent_console` 또는 `render` 하위에 디버그 필드로 포함(관측↑, 계약 변경↑)

## 참고 자료

- `https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/` - Agentic Vision 개요(Think→Act→Observe, Code Execution)
- `vibe/ref/gemini-api-guide.md` - Structured outputs with tools / Code Execution / media_resolution
- `vibe/prd.md` - Action Deck/Hotspots/멀티모달/경제 UX 요구
- `backend/src/unknown_world/models/turn.py` - TurnOutput 스키마(액션덱/오브젝트/bbox 규약)
