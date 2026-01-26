# U-036[Mvp]: 스토리/이미지 프롬프트 파일 분리(ko/en) + 핫리로드

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-036[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-017,U-019 |
| 우선순위  | High        |

## 작업 목표

스토리(텍스트) 및 이미지 생성에 사용되는 **핵심 프롬프트**를 **별도 `.md` 파일**로 분리하고, 한국어/영어 형태로 관리하여 **편집/튜닝/버전 관리**를 용이하게 한다.

**배경**: PRD 3.2에서 프롬프트를 별도 파일로 관리하도록 요구하며, 10.4에서 프롬프트 핫리로드를 명시한다. 프롬프트가 코드에 하드코딩되면 튜닝/실험이 어렵고, ko/en 혼합 출력 위반(RULE-007) 리스크가 증가한다.

**완료 기준**:

- `backend/prompts/` 디렉토리 구조가 PRD 3.2 예시에 맞게 생성된다.
- 최소 2종 프롬프트(시스템/이미지)가 ko/en 파일로 분리되어 저장된다.
- 프롬프트 로더가 `language` 파라미터에 따라 올바른 파일을 로드한다.
- (권장) 서버 재시작 없이 프롬프트 파일 변경이 반영되는 핫리로드가 동작한다.

## 영향받는 파일

**생성**:

- `backend/prompts/system/game_master.ko.md` - 시스템 프롬프트(한국어)
- `backend/prompts/system/game_master.en.md` - 시스템 프롬프트(영어)
- `backend/prompts/image/scene_prompt.ko.md` - 이미지 생성 프롬프트(한국어)
- `backend/prompts/image/scene_prompt.en.md` - 이미지 생성 프롬프트(영어)
- `backend/prompts/turn/turn_output_instructions.ko.md` - 턴 출력 지시(한국어)
- `backend/prompts/turn/turn_output_instructions.en.md` - 턴 출력 지시(영어)
- `backend/src/unknown_world/services/prompt_loader.py` - 프롬프트 로더/핫리로드 서비스

**수정**:

- `backend/src/unknown_world/orchestrator/pipeline.py` - 프롬프트 로더 호출로 전환
- `backend/src/unknown_world/services/image_generation.py` - 이미지 프롬프트 로더 호출로 전환

**참조**:

- `vibe/prd.md` - 3.2 프롬프트 디렉토리 예시, 10.4 핫리로드
- `.cursor/rules/00-core-critical.mdc` - RULE-007(ko/en 혼합 금지)
- `.cursor/rules/30-prompts-i18n.mdc` - 프롬프트/i18n 관리 규칙

## 구현 흐름

### 1단계: 프롬프트 디렉토리 구조 생성

- PRD 3.2 예시에 맞게 `backend/prompts/` 하위에 `system/`, `turn/`, `image/` 폴더를 생성한다.
- 각 폴더에 `*.ko.md`, `*.en.md` 파일을 생성한다(초안/placeholder).

### 2단계: 프롬프트 로더 서비스 작성

- `prompt_loader.py`에 `load_prompt(category, name, language)` 함수를 구현한다.
- 예: `load_prompt("system", "game_master", "ko-KR")` → `backend/prompts/system/game_master.ko.md` 읽기
- 파일이 없을 경우 기본 언어(ko-KR) 또는 에러 폴백을 제공한다.

### 3단계: 기존 코드에서 하드코딩 프롬프트를 로더 호출로 전환

- `pipeline.py`의 시스템 프롬프트를 로더 호출로 대체한다.
- `image_generation.py`의 이미지 프롬프트를 로더 호출로 대체한다.

### 4단계: (권장) 핫리로드 지원

- 개발 모드(`ENVIRONMENT=development`)에서는 매 호출 시 파일을 다시 읽도록 한다.
- 운영 모드에서는 시작 시 로드 후 캐싱하거나, 주기적 리로드를 지원한다(선택).

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-017[Mvp]](U-017[Mvp].md) - TurnOutput 생성(시스템/턴 프롬프트 사용처)
- **계획서**: [U-019[Mvp]](U-019[Mvp].md) - 이미지 생성 엔드포인트(이미지 프롬프트 사용처)
- **결과물**: 현재 하드코딩된 프롬프트 위치(pipeline.py, image_generation.py)

**다음 작업에 전달할 것**:

- U-021(Scanner 이미지 이해)에서 이미지 분석 프롬프트도 동일 패턴으로 관리 가능
- MMP(U-104 장기 세션 메모리)에서 요약/핀 프롬프트 확장 시 동일 로더 재사용

## 주의사항

**기술적 고려사항**:

- (RULE-007) ko/en 혼합 금지: 로더는 `language` 파라미터에 따라 **단일 언어 파일만** 로드해야 한다.
- 프롬프트 파일에 민감 정보(키/토큰)를 포함하지 않는다(비밀정보 커밋 금지).
- 프롬프트 파일은 마크다운 형식이지만, 렌더링 없이 **텍스트 그대로** 모델에 전달된다.

**잠재적 리스크**:

- 프롬프트 파일이 누락되거나 잘못된 경우 → 폴백(기본 언어/하드코딩)을 제공하여 서비스 중단을 방지한다.
- 핫리로드가 운영 환경에서 예기치 않은 변경을 유발할 수 있음 → 운영에서는 시작 시 로드/캐싱을 기본으로 한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: MVP에서 핫리로드는 어느 수준까지 지원할까?
  - Option A: 개발 모드에서만 매 호출 시 리로드(권장: 운영 안정성 유지)
  - Option B: 운영에서도 주기적 리로드(복잡도 증가)
  **A1**: Option A

- [x] **Q2**: 프롬프트 파일 형식은 순수 텍스트로 할까, 프론트매터(메타 포함) 마크다운으로 할까?
  - Option A: 순수 텍스트(단순, MVP 권장)
  - Option B: 프론트매터(버전/정책 메타 포함) — PRD 10.4 요구 충족(버전 기록)
  **A2**: Option B

## 참고 자료

- `vibe/prd.md` - 3.2 프롬프트 디렉토리 예시, 10.4 프롬프트 라이프사이클
- `.cursor/rules/30-prompts-i18n.mdc` - 프롬프트/i18n 관리 규칙
- `.cursor/rules/00-core-critical.mdc` - RULE-007(ko/en 혼합 금지)
