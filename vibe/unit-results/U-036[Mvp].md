# U-036[Mvp]: 스토리/이미지 프롬프트 파일 분리(ko/en) + 핫리로드 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-036[Mvp]
- **단계 번호**: 2.3 (MVP 프롬프트 관리 체계 구축)
- **작성 일시**: 2026-01-26 23:45
- **담당**: AI Agent

---

## 1. 작업 요약

하드코딩된 시스템 및 이미지 프롬프트를 별도 마크다운 파일로 분리하고, 언어별(ko/en) 로딩 및 개발 모드 핫리로드를 지원하는 `PromptLoader` 서비스를 구현하였습니다. 이를 통해 프롬프트의 유지보수성과 실험 효율성을 극대화하였습니다.

---

## 2. 작업 범위

- [x] `backend/prompts/` 디렉토리 구조 설계 및 생성 (system, turn, image)
- [x] 언어별 프롬프트 파일 생성 (`*.ko.md`, `*.en.md`)
- [x] `PromptLoader` 유틸리티 구현 (`orchestrator/prompt_loader.py`)
    - 프론트매터(메타데이터) 파싱 지원
    - 개발 모드(`ENVIRONMENT=development`) 핫리로드 지원
    - LRU 캐시를 통한 운영 모드 성능 최적화
    - 폴백(Fallback) 언어 처리 로직 포함
- [x] 서비스 코드 내 하드코딩 프롬프트를 로더 호출로 전환 (`image_generation.py` 등)

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `backend/prompts/system/game_master.{ko,en}.md` | 신규 | 시스템 프롬프트 (게임 마스터 페르소나) |
| `backend/prompts/turn/turn_output_instructions.{ko,en}.md` | 신규 | 턴 출력 형식(JSON Schema) 지시사항 |
| `backend/prompts/image/scene_prompt.{ko,en}.md` | 신규 | 이미지 생성 스타일 가이드라인 |
| `backend/src/unknown_world/orchestrator/prompt_loader.py` | 신규 | 프롬프트 로딩 및 핫리로드 서비스 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | 하드코딩된 프롬프트 대신 로더 호출 적용 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 인터페이스 (`prompt_loader.py`):**

- `load_prompt(category, name, language) -> str`: 기본 프롬프트 텍스트 로드.
- `load_prompt_with_metadata(category, name, language) -> PromptData`: 프론트매터(버전, ID 등)를 포함한 데이터 로드.
- `load_system_prompt(language) -> str`: 헬퍼 함수.

**설계 결정 사항:**
- **핫리로드**: `os.environ.get("ENVIRONMENT") == "development"` 조건에서만 캐시를 우회하여 실시간 파일 읽기 수행.
- **프론트매터**: `- key: value` 형식을 파싱하여 프롬프트 버전 및 정책 메타데이터를 관리 가능하게 함.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `backend/prompts/` 디렉토리가 시스템의 SSOT(Single Source of Truth)로 기능함.
- **보안**: 프롬프트 원문이 로그에 노출되지 않도록 로깅 시 해시 또는 메타데이터만 사용하도록 가이드라인 준수.

---

## 5. 런북(Runbook) 정보

- **참조**: 별도의 런북 파일 대신 계획서의 완료 기준을 바탕으로 코드 레벨 검증 수행.
- **검증 결과**:
    - `ENVIRONMENT=development` 설정 시 파일 수정 사항이 즉시 반영됨을 확인.
    - `Language` 열거형에 따른 정확한 경로 탐색 및 파일 로딩 확인.

---

## 6. 리스크 및 주의사항

- **파일 누락**: 프롬프트 파일이 존재하지 않을 경우 `FileNotFoundError`가 발생할 수 있으므로, 적절한 폴백 언어(KO -> EN) 처리 로직을 내장함.
- **인코딩**: 모든 파일은 `utf-8` 인코딩을 강제함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-021[Mvp]**: 스캐너 이미지 이해(Vision) 프롬프트 추가 시 동일 로더 활용.
2. **U-017[Mvp]**: 개별 파이프라인 스테이지에서 하드코딩된 텍스트 지시사항을 `turn_output_instructions.md`로 완전 이전.

### 7.2 의존 단계 확인

- **선행 단계**: U-017, U-019 (완료)
- **후속 단계**: U-021, U-104

---

## 8. 자체 점검 결과

- [x] 프롬프트 파일 분리 및 디렉토리 구조 준수
- [x] 개발 모드 핫리로드 기능 동작 확인
- [x] 프론트매터 파싱을 통한 메타데이터 관리 지원
- [x] ko/en 언어 정책(RULE-007) 준수

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
