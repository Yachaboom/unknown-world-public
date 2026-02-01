# U-061[Mvp]: 이미지 생성 지침(scene_prompt) 파이프라인 통합 및 i18n 정합성 강화 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-061[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-01 16:35
- **담당**: AI Agent

---

## 1. 작업 요약

고립되어 있던 `scene_prompt.md` 이미지 생성 지침을 Game Master 시스템 프롬프트 파이프라인에 통합하고, 영문 세션 지원을 위한 `scene_prompt.en.md` 추가 및 언어별 로딩 로직(i18n)을 강화하여 RULE-006(언어 정합성)을 달성하고 이미지 프롬프트 생성 품질을 상향 평준화함.

---

## 2. 작업 범위

- **이미지 지침 i18n 지원**: 영문 이미지 생성 가이드라인(`scene_prompt.en.md`) 신규 작성 및 배치
- **프롬프트 로더 강화**: `prompt_loader.py`에 언어별 이미지 지침 로딩 및 폴백 로직 구현
- **오케스트레이터 통합**: `generate_turn_output.py`에서 시스템 프롬프트 구성 시 이미지 지침 섹션을 동적으로 삽입하도록 수정
- **코드 부채 및 하드코딩 제거**: `image_generation.py` 내의 미사용 스타일 가이드 및 `Language.KO` 하드코딩 제거

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `backend/prompts/image/scene_prompt.en.md` | 신규 | 영문 세션용 이미지 생성 스타일 및 키워드 가이드라인 |
| `backend/src/unknown_world/orchestrator/prompt_loader.py` | 수정 | `load_image_prompt` 함수 추가 및 언어 폴백 로직 구현 |
| `backend/src/unknown_world/orchestrator/generate_turn_output.py` | 수정 | 시스템 프롬프트에 이미지 가이드라인 섹션 통합 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | 하드코딩 제거 및 서비스 레이어 정제 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**프롬프트 로딩 파이프라인**:
- `prompt_loader.load_image_prompt(language)`: 
  - 요청된 언어(`ko` 또는 `en`)에 맞는 파일을 `backend/prompts/image/`에서 로드.
  - 파일 미존재 시 `ko`(한국어)를 기본값으로 사용하는 세이프 폴백 적용.

**시스템 프롬프트 구성 (Orchestrator)**:
- `TurnOutputGenerator._build_prompt` 내에서 시스템 프롬프트 문자열 끝에 `## 이미지 생성 지침 (Image Generation Guidelines)` 섹션을 추가하여 LLM이 출력 스키마의 `image_job.prompt`를 구성할 때 참조하도록 유도.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 새로운 프롬프트 파일(`scene_prompt.en.md`)이 추가됨.
- **성능/지연**: 시스템 프롬프트 토큰 수가 약간 증가(약 200-300 tokens)했으나, 이미지 생성 품질 향상을 위한 필수 비용으로 판단됨.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: N/A (계획서 및 유닛 테스트 기반 검증)
- **실행 결과**:
  - `load_image_prompt`를 통한 언어별 로딩 및 폴백 정상 작동 확인.
  - 시스템 프롬프트 내에 지침 섹션이 정상적으로 주입됨을 로그로 확인.
  - 영문 세션에서 영문 지침이 우선적으로 사용됨을 검증.

---

## 6. 리스크 및 주의사항

- **프롬프트 노출**: 이미지 지침은 시스템 프롬프트의 일부로만 존재하며, 사용자에게 직접 노출되지 않도록 `narrative` 필드 생성을 방해하지 않게 배치됨.
- **번역 일관성**: 한/영 지침의 핵심 키워드(Cinematic, Dark Fantasy 등)를 일치시켜 언어에 따른 화풍 차이를 최소화함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-064**: 실제 생성된 이미지 프롬프트가 가이드라인의 키워드를 충실히 반영하는지 최종 시각적 검증.
2. **린트 및 타입 체크**: `ruff` 및 `pyright`를 통한 정적 분석 수행.

### 7.2 의존 단계 확인

- **선행 단계**: U-055 (이미지 파이프라인 통합)
- **후속 단계**: U-064 (품질 최종 검증), CP-MVP-03 (데모 반영)

---

## 8. 자체 점검 결과

- [x] 계획서 요구사항(이미지 지침 통합) 충족 확인
- [x] 언어 정합성(i18n) 정책 준수 확인
- [x] `Language.KO` 하드코딩 제거 확인
- [x] 아키텍처/네이밍 일관성 유지 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
