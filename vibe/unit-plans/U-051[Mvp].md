# U-051[Mvp]: 렌더링 단계-이미지 생성 서비스 브릿지 구축

## 메타데이터

| 항목      | 내용                  |
| --------- | --------------------- |
| Unit ID   | U-051[Mvp]            |
| Phase     | MVP                   |
| 예상 소요 | 60분                  |
| 의존성    | U-019[Mvp],RU-005[Mvp] |
| 우선순위  | ⚡ Critical           |

## 작업 목표

현재 비어있는 렌더링 단계(`render_stage`)에서 이미지 생성 서비스(`image_generation`)를 호출할 수 있도록 **의존성을 주입하고 실행 구조를 연결**한다.

**배경**: U-019에서 이미지 생성 서비스를 구현했고, RU-005에서 파이프라인 단계를 모듈화했다. 현재 `render_stage`는 pass-through로 동작하며, 실제 이미지 생성이 턴 파이프라인과 분리되어 있다. 이 브릿지를 통해 턴 흐름 안에서 이미지 생성이 가능해진다.

**완료 기준**:

- `render_stage`가 `PipelineContext`를 통해 이미지 생성 서비스에 접근할 수 있다
- 이미지 생성 서비스 인스턴스는 파이프라인 생성 시점에 주입되며, 테스트에서 모킹 가능하다
- 기존 파이프라인 동작(텍스트-only)이 변경 없이 유지된다(동작 보존)

## 영향받는 파일

**생성**:

- 없음 (기존 파일 수정으로 충분)

**수정**:

- `backend/src/unknown_world/orchestrator/stages/types.py` - `PipelineContext`에 이미지 생성기 참조 추가
- `backend/src/unknown_world/orchestrator/stages/render.py` - 이미지 생성 서비스 호출 로직 추가
- `backend/src/unknown_world/orchestrator/pipeline.py` - `create_pipeline_context`에 이미지 생성기 주입

**참조**:

- `backend/src/unknown_world/services/image_generation.py` - 기존 이미지 생성 서비스
- `vibe/unit-results/U-019[Mvp].md` - 이미지 생성 서비스 구현 결과
- `vibe/refactors/RU-005-Q4.md` - 파이프라인 모듈화 결과

## 구현 흐름

### 1단계: PipelineContext 확장

- `PipelineContext`에 `image_generator: ImageGeneratorType | None` 필드 추가
- 기본값은 `None`으로 하여 기존 동작 보존
- 타입 힌트와 docstring 갱신

### 2단계: 파이프라인 팩토리 갱신

- `create_pipeline_context`에 `image_generator` 매개변수 추가 (선택적)
- 전달하지 않으면 `get_image_generator()`로 기본 인스턴스 획득
- Mock 모드 여부에 따라 적절한 생성기 선택

### 3단계: render_stage 연동

- `render_stage`에서 `ctx.image_generator`를 참조하는 구조만 추가
- 실제 생성 로직은 U-052/U-053에서 구현
- 현재 단계에서는 "연결 가능" 상태만 확보

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-019[Mvp]](U-019[Mvp].md) - 이미지 생성 서비스 인터페이스(`ImageGenerator`, `MockImageGenerator`, `get_image_generator`)
- **계획서**: [RU-005[Mvp]](RU-005[Mvp].md) - 파이프라인 단계 구조(`PipelineContext`, `render_stage`)

**다음 작업에 전달할 것**:

- U-052: 이미지 생성 여부 판정(`should_generate`) 및 프롬프트/해상도 추출 로직에서 사용할 컨텍스트 기반
- U-053: 비동기 이미지 생성 호출 및 결과 동기화를 위한 브릿지

## 주의사항

**기술적 고려사항**:

- (RULE-008) 단계 이벤트 일관성: 이미지 생성 도입 후에도 stage 이벤트(start/complete) 순서가 유지되어야 한다
- (동작 보존) 이미지 생성 서비스가 None이거나 should_generate가 false면 기존과 동일하게 pass-through
- 순환 의존 방지: `stages/types.py`는 `image_generation`을 직접 import하지 않고 타입만 참조(TYPE_CHECKING)

**잠재적 리스크**:

- 의존성 주입 구조가 복잡해지면 테스트 설정이 번거로워질 수 있음 → `create_pipeline_context`의 기본값 설계로 완화

## 페어링 질문 (결정 필요)

- [x] **Q1**: 이미지 생성기 주입 방식은?
  - Option A: `create_pipeline_context`의 매개변수로 전달 (권장: 테스트 용이)
  - Option B: 전역 싱글톤만 사용 (단순하지만 테스트 어려움)
  **A1**: Option A

## 참고 자료

- `backend/src/unknown_world/services/image_generation.py` - 이미지 생성 서비스 구현
- `backend/src/unknown_world/orchestrator/stages/render.py` - 현재 render_stage 구현
- `.cursor/rules/20-backend-orchestrator.mdc` - 오케스트레이터 설계 원칙
