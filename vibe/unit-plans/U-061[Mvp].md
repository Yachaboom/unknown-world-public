# U-061[Mvp]: 이미지 생성 지침(scene_prompt) 파이프라인 통합 및 i18n 정합성 강화

## 메타데이터

| 항목      | 내용                        |
| --------- | --------------------------- |
| Unit ID   | U-061[Mvp]                  |
| Phase     | MVP                         |
| 예상 소요 | 45분                        |
| 의존성    | U-055[Mvp], U-036[Mvp]      |
| 우선순위  | ⚡ Critical (이미지 품질)    |

## 작업 목표

고립된 `scene_prompt.md` 지침을 **Game Master 시스템 프롬프트에 결합**하여, LLM이 이미지 모델에 최적화된 고품질 프롬프트를 일관되게 생성하도록 한다. 또한 **i18n 정합성을 강화**하여 세션 언어에 따라 올바른 지침이 로드되도록 한다.

**배경**: U-051~U-055에서 이미지 생성 파이프라인을 구축했으나, `scene_prompt.md`의 이미지 생성 가이드라인이 실제 Game Master 프롬프트에 통합되지 않았다. 또한 `image_generation.py`에 `Language.KO` 하드코딩이 존재하여 RULE-006(언어 정합성) 위반 상태다.

**완료 기준**:

- Game Master가 생성하는 `image_job.prompt`에 scene_prompt.md 키워드(예: cinematic lighting, dark fantasy)가 포함됨
- 영문 세션(en-US)에서 `scene_prompt.en.md` 지침이 정상 로드/반영됨
- 백엔드 로그에서 미사용 프롬프트 로딩 관련 경고/에러가 사라짐
- 하드코딩된 `Language.KO`가 제거됨

## 영향받는 파일

**생성**:

- `backend/prompts/image/scene_prompt.en.md` - 영문 이미지 생성 가이드라인 (존재하지 않을 경우)

**수정**:

- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 시스템 프롬프트에 이미지 가이드라인 섹션 추가
- `backend/src/unknown_world/services/image_generation.py` - 미사용 코드 제거, 언어 하드코딩 수정
- `backend/src/unknown_world/orchestrator/prompt_loader.py` - 예외 처리 강화, 폴백 로직 검증

**참조**:

- `backend/prompts/image/scene_prompt.ko.md` - 기존 한국어 가이드라인
- `vibe/unit-results/U-036[Mvp].md` - 프롬프트 파일 분리 결과
- `.cursor/rules/30-prompts-i18n.mdc` - 프롬프트/i18n 규칙

## 구현 흐름

### 1단계: 영문 이미지 가이드라인 생성

- `scene_prompt.ko.md` 내용을 영문으로 번역/변환
- `scene_prompt.en.md`로 저장
- 언어별 파일명 규칙: `{name}.{lang}.md` (ko/en)

### 2단계: 오케스트레이터 프롬프트 통합

**파일**: `backend/src/unknown_world/orchestrator/generate_turn_output.py`

```python
# TurnOutputGenerator._build_prompt 수정
def _build_prompt(self, turn_input: TurnInput, ...) -> str:
    base_prompt = load_system_prompt(turn_input.language)
    
    # 이미지 생성 가이드라인 로드 및 추가
    try:
        image_guidelines = load_image_prompt(turn_input.language)
        system_prompt = f"{base_prompt}\n\n## 이미지 생성 지침\n{image_guidelines}"
    except FileNotFoundError:
        # 가이드라인 없으면 기본 프롬프트만 사용
        system_prompt = base_prompt
        logger.warning(f"Image guidelines not found for {turn_input.language}")
    
    return system_prompt
```

### 3단계: 이미지 서비스 정제

**파일**: `backend/src/unknown_world/services/image_generation.py`

- `_style_guidelines` 변수 및 관련 미사용 코드 제거
- 하드코딩된 `Language.KO` → 호출부에서 전달받은 언어로 교체
- 또는 해당 로직이 이미 오케스트레이터에서 처리되므로 중복 제거

### 4단계: 프롬프트 로더 예외 처리 강화

**파일**: `backend/src/unknown_world/orchestrator/prompt_loader.py`

```python
def load_image_prompt(language: Language) -> str:
    """이미지 생성 가이드라인 로드. 언어별 파일 미존재 시 기본 언어로 폴백."""
    lang_code = language.value.split("-")[0]  # ko-KR -> ko
    primary_path = PROMPTS_DIR / "image" / f"scene_prompt.{lang_code}.md"
    fallback_path = PROMPTS_DIR / "image" / "scene_prompt.ko.md"
    
    if primary_path.exists():
        return primary_path.read_text(encoding="utf-8")
    elif fallback_path.exists():
        logger.info(f"Image prompt fallback to ko for {language}")
        return fallback_path.read_text(encoding="utf-8")
    else:
        raise FileNotFoundError(f"No image prompt found for {language}")
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-055[Mvp]](U-055[Mvp].md) - 이미지 파이프라인 통합 검증 결과
- **계획서**: [U-036[Mvp]](U-036[Mvp].md) - 프롬프트 파일 분리 구조 (`prompt_loader.py`)
- **참조**: `backend/prompts/` - 프롬프트 파일 디렉토리 구조

**다음 작업에 전달할 것**:

- U-064: Real 모드 이미지 생성 시 개선된 프롬프트 품질 확인
- CP-MVP-03: 데모에서 이미지 품질 향상 체감

## 주의사항

**기술적 고려사항**:

- (RULE-006) 언어 정합성: 세션 언어와 프롬프트 언어가 항상 일치해야 함
- (RULE-007) 프롬프트 노출 금지: 이미지 가이드라인 내용이 사용자 UI에 노출되지 않아야 함
- 프롬프트 길이 증가: 시스템 프롬프트 토큰 수 증가로 비용/지연 미세 증가 가능 → 가이드라인은 간결하게 유지

**잠재적 리스크**:

- 영문 가이드라인 번역 품질이 낮으면 영문 세션에서 이미지 품질 저하 → 핵심 키워드 위주로 간결하게 작성
- 프롬프트 로더 폴백 로직 오류 시 전체 턴 실패 가능 → try-except로 안전하게 처리

## 페어링 질문 (결정 필요)

- [x] **Q1**: 이미지 가이드라인 통합 위치?
  - Option A: Game Master 시스템 프롬프트에 섹션 추가 (권장: 일관된 생성)
  - Option B: render_stage에서 별도 프롬프트로 후처리 (분리되지만 복잡)
  **A1**: Option A

- [x] **Q2**: 언어별 폴백 정책?
  - Option A: 영문 없으면 한국어로 폴백 (안전)
  - Option B: 영문 없으면 빈 문자열 (이미지 가이드 없이 생성)
  **A2**: Option A

## 기대 효과

- **품질**: LLM이 이미지 모델에 최적화된 고품질 프롬프트를 일관되게 작성함 (cinematic lighting, dark fantasy 등 키워드 포함)
- **정합성**: 언어 정책(RULE-006)에 따라 모든 지침이 세션 언어와 동기화됨
- **클린코드**: 선언만 되고 사용되지 않던 코드 부채 해결

## 참고 자료

- `backend/prompts/image/scene_prompt.ko.md` - 기존 한국어 가이드라인
- `.cursor/rules/30-prompts-i18n.mdc` - 프롬프트/i18n 관리 규칙
- `vibe/ref/structured-outputs-guide.md` - 구조화 출력 가이드
- `backend/src/unknown_world/orchestrator/prompt_loader.py` - 프롬프트 로더 구현
