# U-085[Mvp]: ⚡핫픽스 - 이미지 크기를 현재 UI 레이아웃(Scene Canvas)에 최대한 맞춤으로 생성

## 메타데이터

| 항목      | 내용                                                   |
| --------- | ------------------------------------------------------ |
| Unit ID   | U-085[Mvp]                                             |
| Phase     | MVP                                                    |
| 예상 소요 | 60분                                                   |
| 의존성    | U-066[Mvp], U-049[Mvp]                                 |
| 우선순위  | ⚡ Critical (핫픽스: 이미지-UI 정합성/데모 체감 품질)    |
| **상태**  | ✅ 완료                                                 |

## 작업 목표

Scene Canvas가 실제로 표시되는 **UI 레이아웃(가로/세로 비율 및 표시 영역 크기)** 에 최대한 맞춰, 이미지 생성 요청의 `aspect_ratio`/`image_size`를 자동 선택하고, 백엔드 Gemini 호출에 `image_config`를 적용해 **실제 출력 이미지의 비율/크기 제어가 동작**하도록 한다.

**배경**: 현재 파이프라인은 `TurnOutput.render.image_job.aspect_ratio/image_size`를 전달하고 있지만,
(1) 프론트의 이미지 생성 요청이 기본값(예: `image_size=1024x1024`)로 고정되기 쉽고, (2) 백엔드의 `generate_content()` 호출에 `image_config`가 적용되지 않으면 모델 출력이 **1:1에 수렴**하여 UI에서 letterbox/여백이 발생한다. 결과적으로 Scene Canvas 레이아웃과 이미지가 어긋나 “게임 화면” 체감이 떨어지고, 이미지 생성 비용/시간 대비 효율도 낮아진다.

**완료 기준**:

- Scene Canvas의 실제 렌더링 크기(px)를 기반으로 **지원 가능한 `aspect_ratio`(예: 16:9, 1:1, 9:16…) 중 가장 근접한 값**이 선택된다.
- 프론트 이미지 생성 요청(`/api/image/generate`)에 선택된 `aspect_ratio`/`image_size`가 **기본값이 아닌 실제 값**으로 전달된다.
- 백엔드 Gemini 호출에서 `GenerateContentConfig.image_config`가 적용되어, **출력 이미지 비율이 요청과 일치(또는 가장 근접)** 한다.
- UI 레이아웃이 바뀌어도(리사이즈/패널 높이 변경) 다음 이미지 생성부터는 **새 레이아웃에 맞는 비율/크기**로 요청된다.
- (안전/정합) `SUPPORTED_IMAGE_SIZES` 정책(검증/에러 메시지, RULE-004/007) 및 bbox 0~1000 규약(RULE-009)은 유지된다.

## 영향받는 파일

**생성**:

- (선택) `frontend/src/utils/imageSizing.ts` - Scene Canvas 크기 → (aspect_ratio, image_size) 선택 유틸 (중복 방지)

**수정**:

- `frontend/src/components/SceneCanvas.tsx` - ResizeObserver로 측정한 Scene Canvas 크기를 Store에 공유(SSOT)하도록 보강
- `frontend/src/stores/worldStore.ts` - Scene Canvas 크기(예: `sceneCanvasSize`) 상태 및 setter 추가
- `frontend/src/turn/turnRunner.ts` - 이미지 잡 실행 시 `sceneCanvasSize` 기반으로 `aspectRatio`/`imageSize` 선택 후 `startImageGeneration()`에 전달
- `frontend/src/api/image.ts` - `imageSize`/`aspectRatio` 전달 기본값 정책을 SSOT(`backend/src/unknown_world/storage/validation.py`)와 정합화
- `backend/src/unknown_world/services/image_generation.py` - `GenerateContentConfig(image_config=...)` 적용(가이드 기반) + (필요 시) `image_size` 값 매핑
- `backend/src/unknown_world/api/image.py` - 요청 스키마 주석/기본값 정합(프론트 기본값과 일치)

**참조**:

- `vibe/ref/image-generate-guide.md` - `image_config.aspect_ratio/image_size` 적용 예시(SSOT)
- `backend/src/unknown_world/storage/validation.py` - `SUPPORTED_IMAGE_SIZES`, 기본값 정책(검증/에러 메시지)
- `vibe/unit-plans/U-066[Mvp].md` - late-binding 이미지 잡(턴과 분리) 설계
- `frontend/src/components/SceneImage.tsx` - `object-fit`/렌더링 전략(레터박스 최소화)

## 구현 흐름

### 1단계: Scene Canvas 표시 크기(px) SSOT 확립

- `SceneCanvas.tsx`에서 이미 측정 중인 `canvasSize`를 **Store에 반영**한다.
  - 예: `worldStore.setSceneCanvasSize({ width, height })`
- 업데이트 빈도는 기존 디바운스(100ms)를 유지하고, 의미 있는 변화(예: 5px 이상)만 반영한다.

### 2단계: UI 레이아웃 기반 aspect ratio/size 선택 규칙 정의

- 지원 가능한 후보를 SSOT로 고정한다(예: `['16:9','1:1','9:16','3:2','2:3']`).
- `sceneCanvasSize(width,height)`에서 목표 비율 \(r = w/h\)을 계산하고, 후보 중 **가장 가까운 비율**을 선택한다.
- `image_size`는 `SUPPORTED_IMAGE_SIZES` 중 선택된 `aspect_ratio`에 가장 자연스러운 프리셋으로 스냅한다.
  - 예: `16:9 → 1280x768`, `9:16 → 768x1280`, `1:1 → 1024x1024`, `3:2 → 1536x1024`, `2:3 → 1024x1536`
- (중요) “완벽한 픽셀 일치”가 아니라 “UI 레이아웃과 비율 정합”을 우선으로 하고, 크기는 **지원 프리셋**으로만 선택한다(검증/안전).

### 3단계: 프론트 이미지 잡 실행 경로에 선택값 적용

- `turnRunner.ts`에서 이미지 잡 실행 직전에:
  - `worldStore.sceneCanvasSize`(또는 동등한 SSOT 상태)를 읽고,
  - (aspectRatio, imageSize)를 계산하여 `startImageGeneration({ aspectRatio, imageSize, ... })`로 전달한다.
- `image_job.aspect_ratio/image_size`가 이미 존재하더라도, **UI 레이아웃이 우선**이 되도록 정책을 정한다(페어링 질문 참조).

### 4단계: 백엔드 Gemini 호출에 image_config 적용

- `image_generation.py`에서 `generate_content()` 호출 시 `GenerateContentConfig`에 `image_config`를 추가한다.
  - `aspect_ratio`: 프론트에서 전달된 값 사용
  - `image_size`: SDK가 기대하는 값(예: `"1K"|"2K"|"4K"`)과 현재 API 값(예: `"1280x768"`)이 다르면 **매핑/정규화**를 추가한다.
- SDK 적용 근거는 `vibe/ref/image-generate-guide.md`의 “Aspect ratios and image size” 섹션을 SSOT로 삼는다.

### 5단계: 관측 가능성(최소) 보강

- 프론트/백엔드 로그에는 프롬프트 원문 대신(금지) **선택된 `aspect_ratio/image_size`** 및 `model_label`만 기록한다(RULE-007/008).
- (선택) Agent Console에 “이미지 설정 라벨”(예: `IMAGE 16:9@1K`)을 노출하되, 모델 ID/프롬프트 원문은 노출하지 않는다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-066[Mvp]](U-066[Mvp].md) - 턴과 분리된 이미지 잡 실행(startImageGeneration) + late-binding 가드
- **계획서**: [U-049[Mvp]](U-049[Mvp].md) - 레이아웃/스크롤 원칙(“첫 화면 과도 스크롤 제거”, 패널 내부 스크롤)
- **참조**: `vibe/ref/image-generate-guide.md` - SDK의 `image_config` 필드 사용 예시(SSOT)

**다음 작업에 전달할 것**:

- ~~U-084: 픽셀 스타일/Scene 높이 조정~~ (취소됨)
- CP-MVP-03: 데모 루프에서 “이미지와 Scene Canvas 레이아웃 정합” 검증 항목으로 포함

## 주의사항

**기술적 고려사항**:

- (RULE-007/008) 프롬프트 원문/비밀정보를 로그/UI에 노출하지 않는다. 선택된 비율/크기/라벨만 노출한다.
- (RULE-009) 핫스팟 좌표는 0~1000 정규화이므로 이미지 비율/크기 변경과 무관하게 유지되어야 한다.
- (SDK 정합) `image_size` 포맷은 SDK가 기대하는 값과 다를 수 있으므로, “프론트 API 값(픽셀)” ↔ “SDK 값(1K/2K/4K)” 매핑을 계획에 포함한다.

**잠재적 리스크**:

- 잘못된 비율 선택으로 Scene Canvas에서 더 큰 여백이 생길 수 있음 → 후보 비율을 제한하고(16:9/1:1/9:16 우선), “가장 가까운 값” 스냅을 단순화한다.
- 레이아웃 측정이 0 또는 비정상 값일 수 있음(초기 렌더) → 측정 실패 시 기존 기본값으로 폴백한다(예: `16:9 + 1024x1024`).

## 페어링 질문 (결정 필요)

> 개발자가 구현 전 정책을 확정하기 위한 질문들입니다.

- [x] **Q1**: `image_job.aspect_ratio/image_size`와 UI 레이아웃이 충돌하면 무엇이 우선인가?
  - ✅Option A: **UI 레이아웃 우선**(권장) — “현재 화면에 맞는 이미지”가 목적
  - Option B: 모델 출력(image_job) 우선 — 프롬프트가 의도한 연출을 보존
- [x] **Q2**: `image_size` 값의 SSOT는?
  - Option A: 현재 계약 유지(픽셀 문자열: `1280x768`) + 백엔드에서 SDK 값으로 매핑
  - ✅Option B: 스키마를 SDK 값(`1K/2K/4K`)으로 마이그레이션

## 참고 자료

- `vibe/ref/image-generate-guide.md` - Aspect ratios and image size / `image_config` 적용 예시
- `backend/src/unknown_world/storage/validation.py` - `SUPPORTED_IMAGE_SIZES` 및 검증 정책
- `vibe/unit-plans/U-066[Mvp].md` - 이미지 잡 분리/late-binding 설계

