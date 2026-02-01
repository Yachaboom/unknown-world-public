# U-064[Mvp] Gemini 이미지 생성 API 호출 방식 수정

## 개요

- **목표**: Gemini 이미지 생성 API를 올바른 방식(`generate_content`)으로 수정
- **의존성**: U-055[Mvp]
- **우선순위**: MVP Real 모드 이미지 생성

## 배경

Real 모드에서 이미지 생성 시 `ClientError` 발생. 현재 코드가 `generate_images()` 메서드를 사용하고 있으나, `gemini-3-pro-image-preview` 모델은 `generate_content()` 메서드를 사용해야 함.

## 현상

- Real 모드에서 이미지 생성 시 11초 후 실패
- 에러: `이미지 생성 중 오류가 발생했습니다: ClientError`

## 올바른 API 호출

```python
from google.genai.types import GenerateContentConfig, Modality

response = await client.aio.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="이미지 프롬프트",
    config=GenerateContentConfig(
        response_modalities=[Modality.TEXT, Modality.IMAGE],
    ),
)
# 응답에서 이미지 추출: response.candidates[0].content.parts[].inline_data.data
```

## 작업 내용

### A. API 호출 방식 변경

- `ImageGenerator.generate()` 메서드를 `generate_content()` 호출로 수정
- `response_modalities=[Modality.TEXT, Modality.IMAGE]` 설정 추가

### B. 응답 파싱 로직 수정

- `part.inline_data.data`에서 이미지 바이트 추출
- base64 인코딩 처리

### C. 에러 처리

- API 변경에 따른 에러 케이스 업데이트
- 폴백 로직 유지

## 완료 기준 (DoD)

- [ ] Real 모드에서 이미지 생성 성공
- [ ] 생성된 이미지가 프론트엔드에 정상 표시
- [ ] Mock 모드 동작에 영향 없음
- [ ] debt-log.md에서 해당 이슈 ✅ 표시

## 영향 범위

- `backend/src/unknown_world/services/image_generation.py`

## 참고

- https://ai.google.dev/gemini-api/docs/image-generation
