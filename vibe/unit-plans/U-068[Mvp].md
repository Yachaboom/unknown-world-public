# U-068[Mvp]: 이전 턴 이미지를 참조이미지로 사용하여 이미지 연결성 강화

## 메타데이터

| 항목      | 내용                                    |
| --------- | --------------------------------------- |
| Unit ID   | U-068[Mvp]                              |
| Phase     | MVP                                     |
| 예상 소요 | 60분                                    |
| 의존성    | U-080[Mvp], U-066[Mvp]                  |
| 우선순위  | High (시각적 연속성/몰입감 강화)        |

## 작업 목표

**이전 턴에서 생성된 장면 이미지를 다음 턴의 참조 이미지(reference image)로 전달**하여, 연속된 장면 간 시각적 일관성(캐릭터/오브젝트/톤)을 유지하고 몰입감을 강화한다.

**배경**: 현재는 매 턴마다 독립적으로 이미지를 생성하여, 동일 캐릭터/오브젝트가 다르게 그려지거나 톤이 급변하는 문제가 발생할 수 있다. Gemini 이미지 모델의 참조 이미지(Thought Signatures) 기능을 활용하면 연속성을 개선할 수 있다.

**완료 기준**:

- 이전 턴 이미지 URL이 다음 이미지 생성 요청 시 참조 이미지로 전달됨
- 참조 이미지가 있을 때와 없을 때의 생성 결과가 시각적으로 더 일관됨
- 참조 이미지 전달 여부를 제어할 수 있는 옵션(정책) 존재
- FAST 모델(gemini-2.5-flash-image) 사용 시 참조 이미지 제한 고려됨

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/services/image_generation.py` - 참조 이미지 파라미터 추가
- `backend/src/unknown_world/api/image.py` - 요청 스키마에 `reference_image_url` 필드 추가
- `backend/src/unknown_world/models/turn.py` - `ImageJob`에 `reference_image_url` 필드 추가
- `frontend/src/turn/turnRunner.ts` - 이미지 생성 요청 시 이전 이미지 URL 전달
- `frontend/src/stores/worldStore.ts` - `previousImageUrl` 관리 로직 보강

**참조**:

- `vibe/ref/image-generate-guide.md` - 참조 이미지 사용 가이드
- `vibe/unit-plans/U-066[Mvp].md` - 이미지 지연 흡수 플로우(late binding)
- `vibe/tech-stack.md` - 이미지 모델 라인업

## 구현 흐름

### 1단계: 참조 이미지 전달 구조 설계

- `ImageJob` 모델에 `reference_image_url: str | None` 필드 추가
- 이미지 생성 API에 참조 이미지 파라미터 전달 경로 확립

```python
# backend/src/unknown_world/models/turn.py
class ImageJob(BaseModel):
    should_generate: bool
    prompt: str
    model_label: str = "QUALITY"
    reference_image_url: str | None = None  # 이전 장면 이미지 참조
```

### 2단계: 백엔드 이미지 생성 서비스 수정

- `ImageGenerationService.generate()`에 참조 이미지 처리 로직 추가
- Gemini API 호출 시 참조 이미지를 `contents`에 포함

```python
# backend/src/unknown_world/services/image_generation.py
async def generate(
    self, 
    prompt: str, 
    reference_image_url: str | None = None,
    model_label: str = "QUALITY"
) -> ImageGenerationResult:
    contents = []
    
    # 참조 이미지가 있으면 먼저 추가
    if reference_image_url:
        ref_image = await self._load_image(reference_image_url)
        contents.append({"role": "user", "parts": [ref_image]})
    
    # 프롬프트 추가
    contents.append({"role": "user", "parts": [prompt]})
    
    # 모델 호출
    ...
```

### 3단계: 프론트엔드 이미지 요청 수정

- `turnRunner`에서 이미지 생성 요청 시 `previousImageUrl`을 함께 전달
- 새 턴 시작 시 이전 이미지 URL을 상태에서 가져와 사용

```typescript
// frontend/src/turn/turnRunner.ts
const imageRequest: ImageGenerateRequest = {
  prompt: imageJob.prompt,
  model_label: imageJob.model_label,
  reference_image_url: worldStore.getState().sceneState.previousImageUrl,
};
```

### 4단계: 정책/옵션 구현

- 참조 이미지 사용 여부를 제어하는 정책 추가
- FAST 모델 사용 시 참조 이미지 제한 고려 (1장 제한 등)

```python
class ImagePolicy:
    use_reference: bool = True  # 참조 이미지 사용 여부
    max_reference_images: int = 1  # 최대 참조 이미지 수
```

### 5단계: 테스트 및 검증

- 연속 3턴 이상 플레이하며 이미지 일관성 확인
- 참조 이미지 있을 때 / 없을 때 결과 비교
- FAST/QUALITY 모델별 참조 이미지 동작 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-080[Mvp]](U-080[Mvp].md) - API 키 인증 전용 (안정적 Gemini API 호출 기반)
- **계획서**: [U-066[Mvp]](U-066[Mvp].md) - 이미지 지연 흡수 플로우(late binding, sceneRevision)
- **참조**: `frontend/src/stores/worldStore.ts` - `previousImageUrl` 상태

**다음 작업에 전달할 것**:

- MMP U-103(이미지 편집/멀티턴): 참조 이미지 기반 편집 흐름의 기반
- CP-MVP-03: 시각적 연속성이 있는 데모 시나리오

## 주의사항

**기술적 고려사항**:

- (가이드 참조) `gemini-2.5-flash-image`는 참조 이미지 수 제한이 더 엄격할 수 있음 → FAST 모델 시 제한 확인
- (RULE-007) 참조 이미지 URL이 외부 노출되지 않도록 로그/UI에서 URL 자체는 숨김
- (성능) 참조 이미지 로딩이 추가 지연을 유발할 수 있음 → 캐싱 또는 사전 로드 고려

**잠재적 리스크**:

- 참조 이미지로 인해 새로운 장면(장소 이동 등)에서도 이전 스타일이 과도하게 유지될 수 있음 → "장면 전환" 플래그 시 참조 이미지 초기화 옵션
- 참조 이미지 파일이 삭제/만료되면 요청 실패 가능 → 참조 이미지 없이 생성하는 폴백

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 참조 이미지 사용 기본 정책?
  - Option A: 항상 이전 이미지를 참조로 사용 (연속성 최대화)
  - Option B: "장면 전환" 시에만 참조 초기화, 그 외 항상 사용
  - Option C: 사용자 토글로 참조 이미지 사용 여부 선택

- [ ] **Q2**: FAST 모델에서 참조 이미지 처리?
  - Option A: FAST 모델에서는 참조 이미지 사용 안 함 (제한 회피)
  - Option B: 가능한 범위(1장)에서 참조 이미지 사용
  - Option C: FAST 모델 사용 시 자동으로 QUALITY로 전환

## 참고 자료

- `vibe/ref/image-generate-guide.md` - Gemini 이미지 생성 가이드
- `vibe/prd.md` 8.5절 - 이미지 생성(멀티턴 편집, REF 유지)
- [Gemini Image Generation API](https://ai.google.dev/gemini-api/docs/image-generation)
- `frontend/src/stores/worldStore.ts` - Scene 상태 관리
