# U-061[Mvp] 이미지 생성 지침(scene_prompt) 파이프라인 통합 및 i18n 정합성 강화

## 개요

- **목표**: 고립된 scene_prompt.md 지침을 Game Master 시스템 프롬프트에 결합하여 이미지 프롬프트 생성 품질 향상
- **의존성**: U-051~U-055 (이미지 파이프라인), U-036[Mvp] (프롬프트 파일 분리)
- **우선순위**: MVP 이미지 품질 향상

## 배경

현재 scene_prompt.md의 이미지 생성 지침이 실제 파이프라인에 통합되지 않아 LLM이 최적화된 이미지 프롬프트를 생성하지 못함. 또한 이미지 서비스 내 언어 하드코딩이 존재함.

## 작업 내용

### A. 오케스트레이터 통합

**파일**: `backend/src/unknown_world/orchestrator/generate_turn_output.py`

- `TurnOutputGenerator._build_prompt` 메서드 수정
- `load_image_prompt(language)` 호출하여 이미지 생성 가이드라인 로드
- 시스템 프롬프트 구성 시 `## 이미지 생성 지침` 섹션 추가

```python
# 예시 통합 방식
image_guidelines = load_image_prompt(turn_input.language)
system_prompt = f"""
{base_system_prompt}

## 이미지 생성 지침
{image_guidelines}
"""
```

### B. 이미지 서비스 정제

**파일**: `backend/src/unknown_world/services/image_generation.py`

- 미사용 변수 `_style_guidelines` 및 관련 코드 제거
- 하드코딩된 `Language.KO`를 호출부에서 전달받은 언어로 교체
- 또는 실제 모델 호출 시 해당 지침을 System Instruction으로 활용

### C. 프롬프트 로더 보완

**파일**: `backend/src/unknown_world/orchestrator/prompt_loader.py`

- `load_image_prompt` 호출 시 예외 처리 강화
- 언어별 파일 미존재 시 폴백 로직 점검

## 완료 기준 (DoD)

- [ ] Game Master가 생성하는 `image_job.prompt`에 scene_prompt.md 키워드(예: cinematic lighting, dark fantasy)가 포함됨
- [ ] 영문 세션(en-US)에서 `scene_prompt.en.md` 지침이 정상 로드/반영됨
- [ ] 백엔드 로그에서 미사용 프롬프트 로딩 관련 경고/에러가 사라짐
- [ ] 하드코딩된 `Language.KO` 제거됨

## 기대 효과

- **품질**: LLM이 이미지 모델에 최적화된 고품질 프롬프트를 일관되게 작성함
- **정합성**: 언어 정책(RULE-006)에 따라 모든 지침이 세션 언어와 동기화됨
- **클린코드**: 선언만 되고 사용되지 않던 코드 부채 해결

## 영향 범위

- `backend/src/unknown_world/orchestrator/generate_turn_output.py`
- `backend/src/unknown_world/services/image_generation.py`
- `backend/src/unknown_world/orchestrator/prompt_loader.py`
- `backend/prompts/image/scene_prompt.ko.md` (확인)
- `backend/prompts/image/scene_prompt.en.md` (확인/생성)
