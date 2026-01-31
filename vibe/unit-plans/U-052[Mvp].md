# U-052[Mvp]: 조건부 이미지 생성 제어 로직

## 메타데이터

| 항목      | 내용                  |
| --------- | --------------------- |
| Unit ID   | U-052[Mvp]            |
| Phase     | MVP                   |
| 예상 소요 | 45분                  |
| 의존성    | U-051[Mvp],U-017[Mvp] |
| 우선순위  | High                  |

## 작업 목표

모델이 반환한 구조화 데이터(`TurnOutput`) 내의 이미지 작업 지시(`image_job`)를 분석하여, 실제 생성 여부(`should_generate`)와 프롬프트, 해상도 설정을 추출하는 **판정 로직**을 구현한다.

**배경**: PRD는 "텍스트 우선 + 조건부 이미지 생성"을 요구한다(RULE-008). 모델이 항상 이미지를 생성하지 않고, `image_job.should_generate`가 `true`이고 프롬프트가 유효할 때만 생성해야 한다. 또한 잔액 부족 시 대안(텍스트-only)을 제시해야 한다(RULE-005).

**완료 기준**:

- `TurnOutput.render.image_job`에서 `should_generate`, `prompt`, `aspect_ratio`, `image_size`를 추출하는 헬퍼 함수가 존재한다
- `should_generate=false`이거나 프롬프트가 비어있으면 이미지 생성을 건너뛴다
- 잔액 부족 시 생성을 건너뛰고, 대안(텍스트-only) 메시지를 TurnOutput에 반영할 수 있는 구조가 마련된다

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/orchestrator/stages/render_helpers.py` - 이미지 생성 판정/추출 헬퍼 함수

**수정**:

- `backend/src/unknown_world/orchestrator/stages/render.py` - 헬퍼 함수 호출 로직 추가
- `backend/src/unknown_world/orchestrator/stages/__init__.py` - 헬퍼 모듈 export (필요 시)

**참조**:

- `backend/src/unknown_world/models/turn.py` - `TurnOutput`, `ImageJob` 스키마
- `backend/src/unknown_world/services/image_generation.py` - `ImageGenerationRequest` 스키마

## 구현 흐름

### 1단계: ImageJob 분석 헬퍼 구현

- `extract_image_job(turn_output: TurnOutput) -> ImageJob | None`
  - `turn_output.render`가 None이면 None 반환
  - `render.image_job`이 None이면 None 반환
  - 유효한 ImageJob 반환
- `should_generate_image(image_job: ImageJob | None) -> bool`
  - `image_job`이 None이면 False
  - `image_job.should_generate`가 False면 False
  - `image_job.prompt`가 비어있으면 False (빈 프롬프트 방어)
  - 그 외 True

### 2단계: Economy 기반 판정 연동

- `can_afford_image_generation(economy_snapshot: CurrencyAmount, estimated_cost: int) -> bool`
  - 현재 잔액에서 이미지 생성 비용을 감당할 수 있는지 판정
  - MVP에서는 고정 비용(예: 10 Signal)으로 단순화 가능
- 비용 부족 시 반환할 메시지 상수 정의

### 3단계: render_stage 통합

- `render_stage`에서 위 헬퍼 호출
- 판정 결과에 따라 이미지 생성 여부 결정 (실제 호출은 U-053)
- 판정 로그 출력 (디버깅용, 프롬프트 원문 제외)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-051[Mvp]](U-051[Mvp].md) - PipelineContext에 이미지 생성기 참조
- **계획서**: [U-017[Mvp]](U-017[Mvp].md) - TurnOutput 스키마(render.image_job 포함)

**다음 작업에 전달할 것**:

- U-053: 판정 결과(should_generate, ImageJob)를 받아 실제 이미지 생성 수행
- U-054: Economy 판정 실패 시 폴백 메시지 반영 로직

## 주의사항

**기술적 고려사항**:

- (RULE-007) 프롬프트 원문을 로그에 출력하지 않는다 (해시만 사용)
- (RULE-005) 잔액 부족 시 "텍스트-only"로 안내하고, 음수 잔액을 허용하지 않는다
- 판정 로직은 순수 함수로 구현하여 테스트 용이성 확보

**잠재적 리스크**:

- 모델이 프롬프트 없이 `should_generate=true`를 반환할 수 있음 → 프롬프트 유효성 검사로 방어

## 페어링 질문 (결정 필요)

- [x] **Q1**: MVP에서 이미지 생성 비용은 어떻게 산정할까?
  - Option A: 고정 비용(예: 10 Signal) (권장: 단순, 빠른 구현)
  - Option B: 해상도별 비용 테이블
  **A1**: Option A

## 참고 자료

- `backend/src/unknown_world/models/turn.py` - ImageJob 스키마
- `vibe/prd.md` 6.7 - Economy HUD/비용 정책
- `.cursor/rules/00-core-critical.mdc` - RULE-005/007/008
