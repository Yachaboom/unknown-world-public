# U-053[Mvp] 비동기 이미지 생성 및 결과 데이터 동기화 실행 가이드

## 1. 개요

이미지 생성 모델을 호출하여 결과물을 얻고, 생성된 이미지의 로컬 저장 경로를 서빙 가능한 URL로 변환하여 `TurnOutput.render`에 동기화하는 기능을 구현했습니다.

**핵심 기능**:

- `render_stage`에서 U-052 판정 결과가 `should_generate=True`일 때 이미지 생성 서비스 호출
- 생성된 이미지 URL을 `TurnOutput.render.image_url`에 반영
- 이미지 생성 성공/실패 여부를 로그로 기록 (프롬프트 원문 제외)

**예상 소요 시간**: 10분

**의존성**:

- 의존 유닛: U-052[Mvp] (이미지 생성 판정 로직)
- 선행 완료 필요: U-051[Mvp] (이미지 서비스 브릿지)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 의존성 설치 (uv 사용)
cd backend
uv sync
```

### 2.2 의존 유닛 확인

```bash
# render_helpers.py (U-052) 존재 확인
ls -la src/unknown_world/orchestrator/stages/render_helpers.py

# image_generation.py (U-019/U-051) 존재 확인
ls -la src/unknown_world/services/image_generation.py
```

### 2.3 즉시 실행 (개발 서버)

```bash
# Mock 모드로 백엔드 서버 실행 (포트 8011)
cd backend
UW_MODE=mock uv run uvicorn unknown_world.api.main:app --host 0.0.0.0 --port 8011 --reload
```

### 2.4 첫 결과 확인

- 서버 시작 시 `[ImageGen] Mock 모드로 초기화됨` 로그 확인
- 프론트엔드에서 턴 요청 시 이미지 생성 로그 확인

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 이미지 생성 성공 (Mock 모드)

**목적**: Mock 이미지 생성기로 이미지 생성 → TurnOutput.render.image_url 반영 확인

**실행**:

```bash
# 터미널 1: Mock 모드 서버 실행
cd backend
UW_MODE=mock uv run uvicorn unknown_world.api.main:app --host 0.0.0.0 --port 8011 --reload

# 터미널 2: 테스트 요청 (curl 또는 프론트엔드 사용)
# 프론트엔드에서 "이미지 생성이 필요한 액션" 선택
```

**입력 조건**:

- `TurnOutput.render.image_job.should_generate = true`
- `TurnOutput.render.image_job.prompt = "A mysterious forest..."`
- 잔액 충분 (signal >= 10)

**기대 결과**:

```
[Render] 이미지 생성 시작
[ImageGen] Mock 이미지 생성 요청
[ImageGen] Mock 이미지 생성 완료
[Render] 이미지 생성 성공
[Render] TurnOutput.render 업데이트 완료
```

**확인 포인트**:

- ✅ 로그에 `[Render] 이미지 생성 성공` 표시
- ✅ `image_id`가 `img_` 프리픽스로 시작
- ✅ `image_url`이 `/static/images/generated/` 경로로 생성
- ✅ `generation_time_ms` 값이 기록됨
- ✅ 프롬프트 원문이 로그에 노출되지 않음 (해시만 표시)

---

### 시나리오 B: 이미지 생성 건너뜀 (should_generate=false)

**목적**: 이미지 생성이 필요 없는 경우 pass-through 동작 확인

**실행**:

```bash
# Mock 모드 서버 실행 상태에서
# 프론트엔드에서 "텍스트만 필요한 액션" 선택
```

**입력 조건**:

- `TurnOutput.render.image_job.should_generate = false` 또는 `image_job = null`

**기대 결과**:

```
[Render] 이미지 생성 판정 완료
# should_generate: false, reason: should_generate_false (또는 no_image_job)
# 이미지 생성 관련 추가 로그 없음
```

**확인 포인트**:

- ✅ `[Render] 이미지 생성 시작` 로그가 없음
- ✅ TurnOutput.render.image_url이 None으로 유지
- ✅ 기존 동작(텍스트 스트리밍)에 영향 없음

---

### 시나리오 C: 잔액 부족 시 텍스트-only 폴백

**목적**: 잔액 부족 시 이미지 생성을 건너뛰고 로그 기록 확인

**실행**:

```bash
# 프론트엔드에서 signal 잔액을 9 이하로 설정 후 턴 요청
```

**입력 조건**:

- `economy_snapshot.signal < 10` (IMAGE_GENERATION_COST_SIGNAL 미만)
- `image_job.should_generate = true`

**기대 결과**:

```
[RenderHelpers] 잔액 부족, 이미지 생성 건너뜀
[Render] 잔액 부족, 텍스트-only 폴백 적용
```

**확인 포인트**:

- ✅ 잔액 부족 로그에 `current_signal`, `required_signal` 표시
- ✅ 이미지 생성 시도하지 않음
- ✅ fallback_message가 판정 결과에 포함 (U-054에서 UI 반영 예정)

---

### 시나리오 D: 배경 제거 옵션 (U-035 연동)

**목적**: 배경 제거 요청 시 rembg가 호출되고 결과 반영 확인

**실행**:

```bash
# Mock 모드 서버 실행 상태에서
# 프론트엔드에서 "캐릭터 이미지 생성" 액션 선택 (remove_background=true)
```

**입력 조건**:

- `image_job.remove_background = true`
- `image_job.image_type_hint = "character"`

**기대 결과**:

```
[ImageGen] Mock 이미지 배경 제거 완료
[Render] 이미지 생성 성공
# background_removed: true, rembg_model_used: birefnet-general
```

**확인 포인트**:

- ✅ `background_removed: true` 로그 확인
- ✅ 생성된 파일명에 `_nobg` 접미사 (선택적)
- ✅ `rembg_model_used` 값 기록

---

### 시나리오 E: TurnOutput.render 필드 검증

**목적**: 새로 추가된 RenderOutput 필드들이 올바르게 채워지는지 확인

**Python 테스트 코드**:

```python
# backend/ 디렉토리에서 실행
# uv run python -c "..."

from unknown_world.models.turn import RenderOutput, ImageJob

# 기본 RenderOutput 생성
render = RenderOutput()
assert render.image_job is None
assert render.image_url is None
assert render.image_id is None
assert render.generation_time_ms is None
assert render.background_removed is False

# 이미지 생성 결과 포함 RenderOutput
render_with_image = RenderOutput(
    image_job=ImageJob(should_generate=True, prompt="test"),
    image_url="/static/images/generated/img_abc123.png",
    image_id="img_abc123",
    generation_time_ms=1500,
    background_removed=True,
)
assert render_with_image.image_url is not None
assert render_with_image.generation_time_ms == 1500
print("✅ RenderOutput 필드 검증 통과")
```

**확인 포인트**:

- ✅ 기본값이 올바르게 설정됨 (None, False)
- ✅ 모든 필드가 올바른 타입으로 채워짐
- ✅ Pydantic 검증 통과

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: 터미널 또는 `logs/` 디렉토리
- 주요 로그 메시지:
  - `[Render] 이미지 생성 시작`: 생성 프로세스 시작
  - `[Render] 이미지 생성 성공`: 성공적으로 완료
  - `[Render] 이미지 생성 실패`: 실패 (상태, 메시지 포함)
  - `[Render] TurnOutput.render 업데이트 완료`: ctx.output 갱신 완료

### 4.2 생성 파일

- `.data/images/generated/img_*.png`: 생성된 이미지 파일
- 배경 제거 시: `*_nobg.png` 접미사

### 4.3 성능 지표

- 이미지 생성 시간: `generation_time_ms` 필드 확인
- Mock 모드: 수십 ms
- 실제 모드: 3~15초 (Gemini API 응답 시간에 따라 다름)

### 4.4 성공/실패 판단 기준

**성공**:

- ✅ 이미지 생성 시 `image_url`이 TurnOutput에 반영됨
- ✅ 프롬프트 원문이 로그에 노출되지 않음 (RULE-007)
- ✅ 기존 텍스트 스트리밍에 영향 없음 (RULE-008)
- ✅ 잔액 부족 시 생성 시도하지 않음 (RULE-005)

**실패 시 확인**:

- ❌ `[Render] 이미지 생성 실패` 로그 → status, message 확인
- ❌ `[Render] 이미지 생성 중 예외 발생` → error_type 확인
- ❌ image_url이 None → 판정 로그 확인 (should_generate, reason)

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `이미지 생성 클라이언트가 초기화되지 않았습니다.`

- **원인**: Vertex AI 클라이언트 초기화 실패 (실제 모드)
- **해결**: `UW_MODE=mock` 환경변수로 Mock 모드 사용

**오류**: `[Render] ImageJob 또는 프롬프트 없음, 생성 건너뜀`

- **원인**: AI 모델이 image_job을 생성하지 않았거나 prompt가 비어있음
- **해결**: 프롬프트 설계 확인, validate_stage 로그 확인

**오류**: `KeyError: 'image_generator'`

- **원인**: PipelineContext에 image_generator가 주입되지 않음
- **해결**: run_pipeline 호출 시 image_generator 파라미터 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 `\` 대신 `/` 사용 권장 (Path 객체 사용)
- **macOS/Linux**: 특이사항 없음
- **rembg**: 첫 실행 시 모델 다운로드로 지연 발생 가능

---

## 6. 다음 단계

1. **U-054**: 이미지 생성 실패 시 폴백 메시지를 TurnOutput.narrative에 반영
2. **프론트엔드**: SceneCanvas에서 `TurnOutput.render.image_url` 렌더링 (U-020 완료됨)
3. **비용 차감**: 이미지 생성 성공 시 Economy에서 Signal 차감 (별도 유닛)
