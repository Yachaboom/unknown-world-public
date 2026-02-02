# U-076[Mvp]: "정밀분석" 액션으로 기존 Scene 이미지 Agentic Vision 분석 및 핫스팟 추가

## 메타데이터

| 항목      | 내용                                          |
| --------- | --------------------------------------------- |
| Unit ID   | U-076[Mvp]                                    |
| Phase     | MVP                                           |
| 예상 소요 | 75분                                          |
| 의존성    | U-010[Mvp], U-019[Mvp], U-069[Mvp]            |
| 우선순위  | High (이미지-핫스팟 정합성/에이전틱 기능 체험) |

## 작업 목표

생성된 Scene 이미지가 있을 때 **"정밀분석" 액션 카드**를 제공하여, 사용자가 이를 선택하면 **Agentic Vision(gemini-3-flash-preview + Code Execution)**을 실행해 이미지 내 오브젝트를 분석하고, **정합성 있는 핫스팟(bbox)**을 추가한다. 이 턴에서는 **이미지 생성 없이** 텍스트 내러티브 + 핫스팟 추가만 진행한다.

**배경**: 현재 GM이 핫스팟 좌표를 "상상"해서 지정하므로, 실제 이미지와 핫스팟 위치가 어긋나는 문제가 있다. MMP의 U-109에서는 "이미지 생성 시 항상 자동 실행"을 계획했지만, 비용/지연 고려 및 MVP 단순화를 위해 **사용자가 명시적으로 "정밀분석"을 요청할 때만 실행**하는 방식을 MVP에서 먼저 구현한다. 이는 U-069의 "정밀조사" 모델 티어링 패턴과 유사하게 **트리거 기반**으로 동작한다.

**핵심 원칙**:
- **"정밀분석" 액션은 Scene 이미지가 존재할 때만 등장**한다(이미지 없으면 카드 미노출).
- 실행 시 **이미지 생성은 하지 않고**, 기존 이미지에 대해 Agentic Vision 분석만 수행한다.
- 분석 결과로 **새 핫스팟(텍스트 기반)만 추가**되며, 내러티브는 "장면을 자세히 살펴보니..." 형태로 진행된다.

**완료 기준**:

- Scene 이미지가 존재할 때 ActionDeck에 "정밀분석"(또는 "자세히 보기") 카드가 등장한다.
- "정밀분석" 카드 실행 시:
  - 현재 Scene 이미지에 대해 Agentic Vision(Flash + Code Execution)을 호출
  - 추출된 affordances(label, bbox, hint)를 기반으로 `ui.objects[]`에 핫스팟 추가
  - bbox는 0~1000 정규화, `[ymin, xmin, ymax, xmax]` 형식 준수 (RULE-009)
  - **이미지 생성은 하지 않음**(TurnOutput.render.image_job.should_generate=false)
- 내러티브에 "장면을 자세히 살펴보니, [발견된 오브젝트]가 보입니다" 형태의 텍스트 출력
- 비전 분석 실패/차단 시에도 턴이 중단되지 않고, "자세히 봐도 특별한 것은 보이지 않습니다" 등 폴백 내러티브 제공 (RULE-004)
- 비용: "정밀분석"은 QUALITY 모델(Pro) 수준의 Signal 비용 적용 (U-069 비용 정책 참조)

## 영향받는 파일

**생성**:

- `backend/prompts/vision/scene_affordances.ko.md` - Agentic Vision용 "장면 affordances 추출" 프롬프트 (Structured Outputs 전제, XML 태그 규격)
- `backend/prompts/vision/scene_affordances.en.md` - 동일(영문)
- `backend/src/unknown_world/services/agentic_vision.py` - Flash+Code Execution 기반 이미지 분석 + affordances 구조화 출력 서비스

**수정**:

- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - "정밀분석" 트리거 감지 + Agentic Vision 호출 분기
- `backend/src/unknown_world/models/turn.py` - (선택) affordances 관련 내부 타입 정의
- `backend/prompts/turn/turn_output_instructions.ko.md` - "정밀분석" 액션 카드 생성 조건 추가: "Scene 이미지가 있을 때만 제공"
- `backend/prompts/turn/turn_output_instructions.en.md` - 동일(영문)
- `frontend/src/components/ActionDeck.tsx` - "정밀분석" 카드에 특수 아이콘/라벨 표시, QUALITY 비용 배지

**참조**:

- `vibe/unit-plans/U-069[Mvp].md` - 텍스트 모델 티어링(트리거 기반 패턴)
- `vibe/unit-plans/U-109[Mmp].md` - MMP Agentic Vision(자동 실행 버전, 참조용)
- `vibe/prd.md` - 6.7(Action Deck), 8.6(이미지 이해/Agentic Vision)
- `vibe/tech-stack.md` - 비전 모델(gemini-3-flash-preview)
- `vibe/ref/gemini-api-guide.md` - Code Execution, Structured outputs with tools

## 구현 흐름

### 1단계: Agentic Vision 서비스 구현 (백엔드)

- `agentic_vision.py` 생성: `gemini-3-flash-preview` + `code_execution` 활성화
- 입력: Scene 이미지 URL(로컬 경로 또는 base64)
- 출력: affordances 배열 (Structured Outputs JSON Schema)
  - `label`: 오브젝트 이름(한/영)
  - `box_2d`: 0~1000 정규화 bbox `[ymin, xmin, ymax, xmax]`
  - `interaction_hint`: 상호작용 힌트(선택)
- 실패 시 빈 배열 반환(폴백)

```python
# backend/src/unknown_world/services/agentic_vision.py
class AgenticVisionService:
    async def analyze_scene(
        self, 
        image_url: str,
        language: str = "ko-KR"
    ) -> list[Affordance]:
        """Scene 이미지에서 affordances(오브젝트 후보) 추출"""
        # gemini-3-flash-preview + code_execution 호출
        # Structured Outputs로 affordances 배열 반환
        ...
```

### 2단계: 프롬프트 작성 (비전용)

- `scene_affordances.ko.md` / `scene_affordances.en.md` 작성
- XML 태그 규격 준수 (`<prompt_meta>`, `<prompt_body>`)
- 출력 스키마 정의: affordances 배열

### 3단계: 오케스트레이터 트리거 분기

- `generate_turn_output.py`에 "정밀분석" 트리거 감지 로직 추가
- 트리거 조건: 액션 ID가 `deep_analyze`, `정밀분석`, `analyze_scene` 등
- 트리거 시:
  1. 현재 Scene 이미지 URL 확인
  2. Agentic Vision 서비스 호출
  3. 결과 affordances를 `ui.objects[]`에 추가
  4. `render.image_job.should_generate = false` 강제
  5. 내러티브: "장면을 자세히 살펴보니..." 생성

### 4단계: GM 프롬프트 수정 (액션 카드 생성 조건)

- `turn_output_instructions.*.md`에 "정밀분석" 액션 카드 생성 규칙 추가:
  - "Scene 이미지가 존재하고, 아직 정밀분석을 하지 않은 장면일 때만 '정밀분석' 카드를 제공한다"
  - 비용: QUALITY 배수 (U-069 정책 참조)
  - 위험도: LOW, 보상 힌트: "숨겨진 단서/오브젝트 발견 가능"

### 5단계: 프론트엔드 UI 반영

- ActionDeck에 "정밀분석" 카드 특수 표시(돋보기 아이콘 등)
- QUALITY 비용 배지 표시
- 실행 중 로딩 연출: "장면을 분석하는 중..."

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-010[Mvp]](U-010[Mvp].md) - Scene Canvas + Hotspot Overlay(bbox 규약)
- **계획서**: [U-019[Mvp]](U-019[Mvp].md) - 이미지 생성 엔드포인트(이미지 URL 규약)
- **계획서**: [U-069[Mvp]](U-069[Mvp].md) - 텍스트 모델 티어링(트리거 기반 패턴, 비용 정책)

**다음 작업에 전달할 것**:

- **U-109[Mmp]**: MMP에서 "이미지 생성 시 자동 실행" 버전으로 확장할 때 본 서비스 재사용
- **CP-MVP-03**: "정밀분석 → 핫스팟 추가" 데모 시나리오/런북에 포함

## 주의사항

**기술적 고려사항**:

- (RULE-007/008) 프롬프트 원문/이미지 바이트를 로그/UI에 노출하지 않는다. 결과 요약(라벨 수, bbox 개수, 성공/실패)만 로깅한다.
- (RULE-009) bbox는 0~1000 정규화, `[ymin, xmin, ymax, xmax]` 형식 고정. 검증 실패 시 해당 오브젝트만 제외하고 진행.
- (RULE-006) 내러티브/라벨은 세션 언어(ko-KR/en-US)에 맞게 출력(혼합 금지).
- Gemini 3 Flash의 Code Execution은 Preview 상태일 수 있으므로, 권한/도구 제약으로 실패할 수 있음 → 반드시 폴백 처리.

**잠재적 리스크**:

- Agentic Vision 호출이 5~10초 지연될 수 있음 → "분석 중..." 로딩 연출로 체감 흡수
- Code Execution Preview 제약으로 bbox 정확도가 낮을 수 있음 → MMP에서 튜닝/개선 여지
- 동일 장면에서 반복 "정밀분석" 시 비용 누적 → (옵션) "이미 분석됨" 플래그로 중복 실행 방지 또는 비용 경고

## 페어링 질문 (결정 필요)

- [ ] **Q1**: "정밀분석" 카드 등장 조건?
  - Option A: Scene 이미지가 존재하면 항상 제공 (매 턴)
  - Option B: Scene 이미지가 있고, 해당 장면에서 아직 분석하지 않은 경우만
  - Option C: 특정 상황(단서 발견, 미스터리 등)에만 GM이 판단하여 제공

- [ ] **Q2**: "정밀분석" 비용 정책?
  - Option A: U-069와 동일하게 QUALITY 배수(2.5x) 적용
  - Option B: 별도의 비전 분석 비용 정책(예: 1.5x)
  - Option C: 첫 분석은 무료, 동일 장면 재분석만 비용 부과

- [ ] **Q3**: 분석 결과 핫스팟이 기존 핫스팟과 겹칠 때?
  - Option A: 기존 핫스팟 제거하고 분석 결과로 교체
  - Option B: 분석 결과를 추가(병합)
  - Option C: 라벨이 유사하면 bbox만 업데이트, 그 외는 추가

## 참고 자료

- `vibe/prd.md` - 6.7(Action Deck), 8.6(이미지 이해/Agentic Vision)
- `vibe/tech-stack.md` - 비전 모델(gemini-3-flash-preview)
- `vibe/ref/gemini-api-guide.md` - Code Execution, Structured outputs
- `vibe/unit-plans/U-109[Mmp].md` - MMP Agentic Vision(자동 실행 버전)
- [Agentic Vision 개요](https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/)
