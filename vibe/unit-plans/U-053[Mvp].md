# U-053[Mvp]: 비동기 이미지 생성 및 결과 데이터 동기화

## 메타데이터

| 항목      | 내용       |
| --------- | ---------- |
| Unit ID   | U-053[Mvp] |
| Phase     | MVP        |
| 예상 소요 | 60분       |
| 의존성    | U-052[Mvp] |
| 우선순위  | High       |

## 작업 목표

이미지 생성 모델을 호출하여 결과물을 얻고, 생성된 이미지의 로컬 저장 경로를 서빙 가능한 URL로 변환하여 최종 응답 객체(`TurnOutput`)에 **업데이트하는 데이터 동기화 작업**을 수행한다.

**배경**: U-052에서 이미지 생성 여부를 판정하고, U-051에서 이미지 생성 서비스를 render_stage에 연결했다. 이제 실제로 이미지를 생성하고 그 결과를 TurnOutput에 반영해야 한다. 이미지 생성은 비동기로 수행되며, 결과 URL은 프론트엔드의 SceneCanvas에서 사용된다.

**완료 기준**:

- `render_stage`에서 이미지 생성 서비스를 호출하고 결과를 await한다
- 생성된 이미지 URL이 `TurnOutput.render.image_url`(또는 적절한 필드)에 반영된다
- 이미지 생성 성공/실패 여부가 로그로 기록된다(프롬프트 원문 제외)

## 영향받는 파일

**생성**:

- 없음

**수정**:

- `backend/src/unknown_world/orchestrator/stages/render.py` - 이미지 생성 호출 및 결과 동기화 로직
- `backend/src/unknown_world/models/turn.py` - `TurnOutput` 또는 `RenderInfo`에 `image_url` 필드 추가 (필요 시)

**참조**:

- `backend/src/unknown_world/services/image_generation.py` - `ImageGenerationRequest`, `ImageGenerationResponse`
- `backend/src/unknown_world/storage/paths.py` - `build_image_url`

## 구현 흐름

### 1단계: 이미지 생성 요청 구성

- U-052의 판정 결과(should_generate, ImageJob)를 받아 `ImageGenerationRequest` 생성
- 프롬프트, aspect_ratio, image_size를 ImageJob에서 추출
- session_id는 PipelineContext에서 가져옴 (또는 turn_input에서)

### 2단계: 비동기 이미지 생성 호출

- `ctx.image_generator.generate(request)`를 await
- 생성 시간을 측정하여 로그에 기록
- 생성 결과(ImageGenerationResponse)를 받음

### 3단계: TurnOutput에 결과 반영

- 생성 성공 시: `response.image_url`을 TurnOutput에 반영
- 생성 실패 시: image_url은 None으로 유지, 에러 로그 기록
- 배경 제거 수행 여부도 메타데이터로 기록 가능

### 4단계: Stage 이벤트 업데이트

- 이미지 생성 중임을 나타내는 배지/이벤트 추가 고려 (선택적)
- 기존 stage 이벤트(start/complete)는 유지

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-052[Mvp]](U-052[Mvp].md) - 이미지 생성 판정 로직, ImageJob 추출 헬퍼

**다음 작업에 전달할 것**:

- U-054: 이미지 생성 실패 시 폴백 처리 및 복구 로직
- U-020(완료됨): 프론트엔드 SceneCanvas가 image_url을 렌더링

## 주의사항

**기술적 고려사항**:

- (RULE-008) 이미지 생성이 TTFB를 블로킹하지 않도록 주의 - 현재 구조에서는 render_stage 내에서 await하므로, narrative는 이미 스트리밍된 후임
- (RULE-007) 이미지 생성 요청/응답 로그에 프롬프트 원문 포함 금지
- TurnOutput이 이미 생성된 상태에서 image_url을 업데이트하는 방식 확인 필요 (Pydantic 모델 수정 가능성)

**잠재적 리스크**:

- 이미지 생성 지연(10초 이상)으로 전체 턴 응답이 느려질 수 있음 → Lazy Loading UI(U-020)로 UX 보완
- TurnOutput이 frozen model일 경우 수정 불가 → 필드 업데이트 전략 확인 필요

## 페어링 질문 (결정 필요)

- [x] **Q1**: TurnOutput에 image_url을 어떻게 반영할까?
  - Option A: TurnOutput 생성 후 ctx.output을 교체/갱신 (권장: 기존 구조 활용)
  - Option B: render_stage에서 새 TurnOutput을 생성
  **A1**: Option A

## 참고 자료

- `backend/src/unknown_world/services/image_generation.py` - ImageGenerator.generate()
- `backend/src/unknown_world/storage/paths.py` - build_image_url()
- `vibe/unit-results/U-020[Mvp].md` - 프론트엔드 이미지 Lazy Render
