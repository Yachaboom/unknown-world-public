# U-109[Mmp]: Agentic Vision - 생성된 장면 이미지 기반 핫스팟 자동 정합

## 메타데이터

| 항목      | 내용               |
| --------- | ------------------ |
| Unit ID   | U-109[Mmp]         |
| Phase     | MMP                |
| 예상 소요 | 90분               |
| 의존성    | U-019,U-020,RU-005 |
| 우선순위  | High               |

## 작업 목표

Gemini 3 Flash의 **Agentic Vision(Code Execution)** 을 활용해 "생성된 장면 이미지"를 분석하고, **Scene Hotspots(클릭 오브젝트)** 의 bbox가 실제 이미지와 **항상 정합**되도록 보장한다.

**배경**: 현재 GM이 이미지 생성 전에 핫스팟 좌표를 "상상"해서 지정하므로, 실제 생성된 이미지의 오브젝트 위치와 핫스팟이 어긋나는 문제가 발생한다. Agentic Vision은 Think→Act→Observe 루프로 이미지 패치를 직접 조사(줌/크롭/주석)하며 **실제 오브젝트 위치를 정확하게 추출**할 수 있다. (PRD 6.7/8.6, `https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/`)

**핵심 원칙**: 이미지가 생성될 때마다 Agentic Vision을 **자동 실행**하여 핫스팟 정합성을 보장한다. 트리거 기반 선택 방식은 사용하지 않는다.

**완료 기준**:

- (자동 실행) 이미지 생성이 완료되면 **자동으로** Agentic Vision을 실행하여 장면 affordances를 추출한다.
- (비전) `gemini-3-flash-preview` + built-in `code_execution` + Structured Outputs(JSON Schema)로 **장면 affordances(오브젝트 후보 + bbox + 행동 힌트)** 를 추출한다.
- (정합성 보장) 추출된 affordances의 bbox를 사용하여 `ui.objects[]`를 **업데이트/교체**한다. GM이 생성한 핫스팟은 비전 분석 결과로 덮어쓴다.
- (출력) affordances를 근거로 TurnOutput의 `ui.action_deck.cards[]`와 `ui.objects[]`가 장면에 정합되게 생성된다(좌표는 0~1000, bbox는 `[ymin,xmin,ymax,xmax]` 준수). (RULE-009)
- (폴백) 비전 분석 실패/차단 시 기존 GM 생성 핫스팟을 유지하고 턴을 중단하지 않는다. (RULE-004)
- (보안) 프롬프트 원문/이미지 바이트/비밀정보가 로그/스트림/UI로 노출되지 않는다(메타만). (RULE-007/008)

## 영향받는 파일

**생성**:

- `backend/prompts/vision/scene_affordances.ko.md` - Agentic Vision용 "장면 affordances 추출" 프롬프트(Structured Outputs 전제, XML 태그 규격)
- `backend/prompts/vision/scene_affordances.en.md` - 동일(영문)
- `backend/src/unknown_world/services/agentic_vision.py` - Flash+Code Execution 기반 이미지 조사(줌/크롭) + affordances 구조화 출력 래퍼

**수정**:

- `backend/src/unknown_world/orchestrator/stages/render.py` - 이미지 생성 완료 후 **자동으로** Agentic Vision 호출 및 핫스팟 업데이트
- `backend/src/unknown_world/orchestrator/stages/render_helpers.py` - 비전 분석 결과로 `ui.objects[]` 업데이트하는 헬퍼 함수 추가
- `backend/src/unknown_world/models/turn.py` - (선택) affordances 관련 내부 타입 정의
- `backend/prompts/turn/turn_output_instructions.ko.md` - 핫스팟 정합성 규칙 추가: "비전 분석이 수행되면 bbox는 분석 결과로 교체됨"
- `backend/prompts/turn/turn_output_instructions.en.md` - 동일(영문)

**참조**:

- `vibe/prd.md` - 6.7(Action Deck), 8.6(이미지 이해/Agentic Vision), 5장(경제 UX), 10장(게이트/리플레이)
- `vibe/tech-stack.md` - 비전/공간 모델(`gemini-3-flash-preview`), Structured Outputs/Tools 결합 원칙
- `backend/src/unknown_world/services/image_generation.py` - 생성 이미지 로컬 저장/서빙 경로(`/static/images/*`) 규약
- `vibe/ref/gemini-api-guide.md` - Code Execution, Structured outputs with tools

## 구현 흐름

### 1단계: Agentic Vision affordances 추출 서비스 구현

- `agentic_vision.py`에서 `gemini-3-flash-preview`로 "장면 affordances 추출"을 수행한다.
- built-in tool로 `code_execution`을 활성화하여, 모델이 이미지 패치를 반복 검사(줌/크롭/주석)할 수 있게 한다.
- 응답은 Structured Outputs(JSON Schema)로 받아서:
  - `label`(표시명)
  - `box_2d`(0~1000 정규화 bbox, `[ymin,xmin,ymax,xmax]` 형식)
  - `interaction_hint`(상호작용 힌트)
  - (선택) `confidence`, `evidence_notes`(디버그/관측용)
  형태로 정규화한다.
- 실패 시에는 빈 affordances로 폴백하고, 턴 생성 흐름을 중단하지 않는다. (RULE-004)

### 2단계: Render stage에 자동 비전 분석 통합

- `render_stage()`에서 이미지 생성이 성공적으로 완료된 후:
  1. 생성된 이미지 파일을 로드
  2. Agentic Vision 서비스 호출
  3. 추출된 affordances로 `TurnOutput.ui.objects[]` 업데이트
- 비전 분석은 이미지 생성 성공 시에만 실행 (이미지 없으면 스킵)
- 비전 분석 실패 시 GM이 생성한 기존 핫스팟을 유지

### 3단계: 핫스팟 업데이트 로직 구현

- `render_helpers.py`에 `update_objects_with_affordances()` 헬퍼 추가:
  - GM이 생성한 `ui.objects[]`와 비전 분석 affordances를 매칭
  - 라벨이 유사한 오브젝트의 bbox를 affordances 값으로 교체
  - 매칭되지 않는 affordances는 새 오브젝트로 추가
  - 매칭되지 않는 기존 오브젝트는 제거 (이미지에 없는 것으로 판단)
- bbox 검증: 0~1000 범위 확인, `[ymin,xmin,ymax,xmax]` 형식 강제 (RULE-009)

### 4단계: 프롬프트 규칙 보강

- `turn_output_instructions.*.md`에 아래 정책을 추가한다:
  - "이미지 생성 시 비전 분석이 자동 수행되며, `ui.objects[]`의 bbox는 분석 결과로 교체됩니다"
  - "GM은 오브젝트의 의미적 라벨과 상호작용 힌트에 집중하고, 정확한 좌표는 비전 분석에 위임합니다"
  - affordances가 비어있거나 실패했을 때는 GM 생성 핫스팟을 그대로 사용 (폴백)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서/결과물**: [U-019[Mvp]](U-019[Mvp].md) - 생성 이미지 로컬 저장/서빙(기본), image_url 규약
- **계획서/결과물**: [U-020[Mvp]](U-020[Mvp].md) - Scene Canvas 이미지 레이어/placeholder/폴백("이미지 없어도 진행")
- **결과물**: [RU-005[Mvp]](../unit-results/RU-005[Mvp].md) - stage pipeline(Validate에서 생성, Repair loop 경계)
- **계획서**: [U-076[Mvp]](U-076[Mvp].md) - MVP 선행 버전(사용자 트리거 기반 "정밀분석" 액션). 본 유닛에서 `agentic_vision.py` 서비스를 재사용하고, "자동 실행"으로 확장함.

**다음 작업에 전달할 것**:

- U-106(관측 지표)에서 "비전 분석 성공률/지연/폴백률"을 메트릭으로 추가
- U-105(자동 리플레이)에서 "핫스팟 정합성" 회귀 시나리오 추가 기반

## 주의사항

**기술적 고려사항**:

- (비용/지연) Agentic Vision은 이미지 생성에 추가로 ~5-10초 지연이 발생할 수 있다. 이는 정합성 보장을 위해 감수한다.
- (RULE-007/008) 프롬프트/이미지 원문 노출 금지: 로그/스트림에는 결과 요약(라벨 수, bbox 개수, 성공/실패) 같은 메타만 남긴다.
- Structured Outputs + built-in tools(code_execution)는 가능하지만, built-in tools와 function calling 동시 사용은 제한될 수 있으므로 설계 분리 원칙을 유지한다. (PRD 8.4)

**잠재적 리스크**:

- Agentic Vision 호출이 실패/불안정(Preview/권한/도구 제약)할 수 있음 → 실패를 "정상 흐름"으로 취급하고 GM 생성 핫스팟으로 즉시 폴백한다.
- bbox/좌표계 드리프트로 클릭이 어긋날 수 있음 → 항상 0~1000 정규화 + `[ymin,xmin,ymax,xmax]` 고정, 검증 실패 시 해당 오브젝트만 제외하고 진행. (RULE-009)

## 페어링 질문 (결정됨)

- [x] **Q1**: Agentic Vision은 언제 실행할까?
  - ~~Option A: "정밀 조사(비전)" 카드 선택 시에만 실행~~ → **MVP에서 U-076으로 구현됨**
  - **Option C (신규): 이미지 생성 시 항상 자동 실행** ← MMP에서 채택
  - 사유: 핫스팟 정합성을 항상 보장하기 위해 자동 실행 필수. 비용/지연은 정합성 보장을 위해 감수.
  - **참고**: MVP U-076에서 먼저 "정밀분석" 트리거 기반을 구현하고, MMP에서 자동 실행으로 확장함.
- [x] **Q2**: TurnInput으로 이미지 참조를 어떻게 전달할까?
  - **Option A: 내부 처리** ← 채택
  - 사유: Render stage에서 이미지 생성 직후 내부적으로 비전 분석을 수행하므로, TurnInput 변경 불필요.
- [x] **Q3**: affordances 결과를 TurnOutput에 포함할까?
  - **Option A: 포함하지 않고(내부 전용), `ui.objects[]`만 업데이트** ← 채택
  - 사유: 스키마 변경 최소화. 사용자에게는 정합된 핫스팟만 노출.

## 파이프라인 흐름 (변경 후)

```
[Render Stage]
    │
    ├─ 1. 이미지 생성 (기존)
    │      └─ image_url 획득
    │
    ├─ 2. Agentic Vision 분석 (신규)
    │      ├─ 생성된 이미지 로드
    │      ├─ affordances 추출 (label, bbox, hint)
    │      └─ 실패 시 → 스킵 (GM 핫스팟 유지)
    │
    └─ 3. 핫스팟 업데이트 (신규)
           ├─ ui.objects[] bbox 교체
           └─ TurnOutput 갱신
```

## 참고 자료

- `https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/` - Agentic Vision 개요(Think→Act→Observe, Code Execution)
- `vibe/ref/gemini-api-guide.md` - Structured outputs with tools / Code Execution / media_resolution
- `vibe/prd.md` - Action Deck/Hotspots/멀티모달/경제 UX 요구
- `backend/src/unknown_world/models/turn.py` - TurnOutput 스키마(액션덱/오브젝트/bbox 규약)
