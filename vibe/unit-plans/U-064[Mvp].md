# U-064[Mvp]: Gemini 이미지 생성 API 호출 방식 수정

## 메타데이터

| 항목      | 내용                        |
| --------- | --------------------------- |
| Unit ID   | U-064[Mvp]                  |
| Phase     | MVP                         |
| 예상 소요 | 60분                        |
| 의존성    | U-055[Mvp]                  |
| 우선순위  | ⚡ Critical (Real 모드 이미지) |

## 작업 목표

Gemini 이미지 생성 API를 **올바른 방식(`generate_content`)으로 수정**하여, Real 모드에서 이미지 생성이 정상 동작하도록 한다.

**배경**: Real 모드에서 이미지 생성 시 11초 후 `ClientError` 발생. 현재 코드가 `generate_images()` 메서드를 사용하고 있으나, `gemini-3-pro-image-preview` 모델은 `generate_content()` 메서드를 사용해야 한다. 이는 Gemini API 문서에 명시된 올바른 호출 방식이다.

**완료 기준**:

- Real 모드에서 이미지 생성 성공
- 생성된 이미지가 프론트엔드 SceneCanvas에 정상 표시
- Mock 모드 동작에 영향 없음
- `debt-log.md`에서 해당 이슈 ✅ 표시

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/services/image_generation.py` - API 호출 방식 변경, 응답 파싱 로직 수정

**참조**:

- `backend/src/unknown_world/services/genai_client.py` - Gemini 클라이언트 래퍼
- https://ai.google.dev/gemini-api/docs/image-generation - Gemini 이미지 생성 문서
- `vibe/debt-log.md` - 이슈 기록

## 구현 흐름

### 1단계: 현재 코드 분석

```python
# 현재 (잘못된) 방식
response = await client.generate_images(
    model="gemini-3-pro-image-preview",
    prompt=image_prompt,
)
# ClientError 발생
```

### 2단계: 올바른 API 호출 방식으로 변경

```python
from google.genai.types import GenerateContentConfig, Modality

async def generate_image(self, prompt: str) -> bytes:
    """Gemini를 사용하여 이미지 생성"""
    response = await self.client.aio.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=prompt,
        config=GenerateContentConfig(
            response_modalities=[Modality.TEXT, Modality.IMAGE],
        ),
    )
    
    # 응답에서 이미지 추출
    for part in response.candidates[0].content.parts:
        if hasattr(part, 'inline_data') and part.inline_data:
            return base64.b64decode(part.inline_data.data)
    
    raise ValueError("No image in response")
```

### 3단계: 응답 파싱 로직 수정

```python
def _extract_image_from_response(self, response) -> bytes | None:
    """generate_content 응답에서 이미지 바이트 추출"""
    try:
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    # inline_data.data는 base64 인코딩된 문자열
                    return base64.b64decode(part.inline_data.data)
        return None
    except (AttributeError, IndexError) as e:
        logger.warning(f"Failed to extract image: {e}")
        return None
```

### 4단계: 에러 처리 업데이트

```python
async def generate(self, prompt: str, ...) -> ImageResult:
    try:
        image_bytes = await self._generate_image_with_content_api(prompt)
        if image_bytes:
            url = await self._save_image(image_bytes)
            return ImageResult(success=True, url=url)
        else:
            return ImageResult(success=False, error="No image in response")
    except google.api_core.exceptions.InvalidArgument as e:
        logger.error(f"Invalid argument: {e}")
        return ImageResult(success=False, error=str(e))
    except google.api_core.exceptions.ResourceExhausted as e:
        logger.warning(f"Rate limit: {e}")
        return ImageResult(success=False, error="Rate limited")
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        return ImageResult(success=False, error=str(e))
```

### 5단계: Mock 모드 동작 확인

```python
# MockImageGenerator는 변경 없이 유지
class MockImageGenerator:
    async def generate(self, prompt: str, ...) -> ImageResult:
        # 플레이스홀더 이미지 반환 (기존 로직 유지)
        ...
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-055[Mvp]](U-055[Mvp].md) - 이미지 파이프라인 통합 검증에서 Real 모드 문제 발견
- **계획서**: [U-019[Mvp]](U-019[Mvp].md) - 이미지 생성 서비스 최초 구현
- **참조**: Gemini API 문서 (https://ai.google.dev/gemini-api/docs/image-generation)

**다음 작업에 전달할 것**:

- U-065: 스키마 단순화 시 이미지 생성 API 동작 영향 확인
- CP-MVP-03: Real 모드 데모에서 이미지 생성 확인

## 주의사항

**기술적 고려사항**:

- (API 호환성) `generate_content`는 텍스트+이미지 동시 반환 가능 → TEXT와 IMAGE 모두 modality에 포함
- (응답 구조) `response.candidates[0].content.parts` 순회하여 이미지 찾기
- (인코딩) `inline_data.data`는 base64 문자열 → 디코딩 필요
- (비용) 이미지 생성은 텍스트 생성보다 비용이 높음 → Economy 시스템과 연동 확인

**잠재적 리스크**:

- API 버전 차이로 응답 구조가 다를 수 있음 → 방어적 파싱 (try-except, hasattr)
- 이미지 생성 시간이 길어 타임아웃 발생 가능 → 적절한 타임아웃 설정 (30초 권장)
- Vertex AI 할당량 초과 가능 → 에러 핸들링에서 rate limit 대응

## 페어링 질문 (결정 필요)

- [x] **Q1**: 이미지 생성 타임아웃?
  - Option A: 30초 (충분한 여유)
  - Option B: 15초 (빠른 실패, 사용자 대기 최소화)
  **A1**: Option A (이미지 생성은 15-20초 소요 가능)

- [x] **Q2**: 이미지 생성 실패 시 재시도?
  - Option A: 재시도 없이 즉시 폴백 (단순)
  - Option B: 1회 재시도 후 폴백 (안정성)
  **A2**: Option A (MVP에서는 재시도 없이 폴백, MMP에서 재시도 로직 추가)

- [ ] **Q3**: TEXT + IMAGE modality 동시 사용 시 텍스트 응답 처리?
  - Option A: 텍스트 무시, 이미지만 추출
  - Option B: 텍스트도 로깅 (디버깅용)

## 참고 자료

- https://ai.google.dev/gemini-api/docs/image-generation - Gemini 이미지 생성 공식 문서
- `backend/src/unknown_world/services/image_generation.py` - 현재 이미지 생성 구현
- `backend/src/unknown_world/services/genai_client.py` - Gemini 클라이언트
- `vibe/debt-log.md` - 관련 이슈 기록
