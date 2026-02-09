# U-135[Mvp]: Backend 로그 영문화 — 한글 로그 메시지 전면 영어 전환

## 메타데이터

| 항목      | 내용                                                         |
| --------- | ------------------------------------------------------------ |
| Unit ID   | U-135[Mvp]                                                   |
| Phase     | MVP                                                          |
| 예상 소요 | 20분                                                         |
| 의존성    | None                                                         |
| 우선순위  | Medium (운영/디버깅 품질 + 해커톤 제출 시 로그 일관성)       |

## 작업 목표

백엔드 Python 코드의 **모든 `logger.*()` 및 `print()` 호출에서 한글 메시지를 영어로 전환**하여, 로그 출력이 영어로 통일되도록 한다. 이모지가 포함된 로그가 있으면 함께 제거한다.

**배경**: 현재 백엔드 로그에 한글 메시지가 18곳(10개 파일), 테스트/docstring 내 print문에 한글이 6곳 혼재되어 있다. 해커톤 심사(영어 기반) 및 국제 개발 환경에서 로그 가독성을 해치며, 로그 파싱/모니터링 도구에서 인코딩 문제를 유발할 수 있다. 이모지는 현재 로그에서 발견되지 않았으나, 향후 유입 방지를 위한 가이드라인도 확립한다.

**완료 기준**:

- 백엔드 `backend/src/` 하위 모든 `logger.info/warning/error/debug()` 호출의 메시지가 영어
- 백엔드 `backend/tests/` 하위 테스트용 `print()` 문의 한글도 영어로 전환
- docstring 내 예시 `print()` 문도 영어로 수정
- 로그에 이모지(유니코드 이모지 문자)가 포함되지 않음
- `BUSINESS_RULE_MESSAGES`의 한국어 에러 메시지는 **별도** (i18n 정책에 의해 유지, 본 유닛 범위 외)
- 기존 로그의 `[ModuleName]` 접두사 패턴 유지 (영어화만 수행)

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/services/item_icon_generator.py` — 1건: `초기화 완료` → `Initialized`
- `backend/src/unknown_world/orchestrator/stages/render_helpers.py` — 3건: `ImageJob 없음`, `should_generate=false`, `프롬프트 비어있음` → 영어
- `backend/src/unknown_world/main.py` — 3건: `백엔드 시작/완료/종료` → 영어
- `backend/src/unknown_world/orchestrator/conversation_history.py` — 2건: `히스토리 초기화됨`, `전체 히스토리 리셋` → 영어
- `backend/src/unknown_world/services/image_generation.py` — 1건: `Mock 모드로 폴백` → 영어
- `backend/src/unknown_world/orchestrator/stages/render.py` — 4건: `이미지 생성 조건 불충족` 등 → 영어
- `backend/src/unknown_world/services/agentic_vision.py` — 2건: `Mock 분석 수행`, `프롬프트 파일 미존재` → 영어
- `backend/src/unknown_world/services/image_understanding.py` — 2건: `Mock 분석 수행`, `안전 차단` → 영어
- `backend/src/unknown_world/orchestrator/prompt_loader.py` — 1건: `프롬프트 캐시 초기화됨` → 영어
- `backend/src/unknown_world/orchestrator/repair_loop.py` — 2건: `모델 폴백 전환`, `API 에러 재시도` → 영어 (docstring 내 print 2건 포함)
- `backend/src/unknown_world/validation/language_gate.py` — 1건: docstring 내 `혼합 발견` print → 영어
- `backend/tests/manual_test_image.py` — 4건: 테스트 print 한글 → 영어

**참조**:

- `backend/src/unknown_world/validation/business_rules.py` — `BUSINESS_RULE_MESSAGES` 한국어 에러 메시지는 i18n 정책(RULE-006)에 의해 **유지** (본 유닛 범위 외)
- `vibe/prd.md` 3.1/3.2절 — 언어 정책
- `.cursor/rules/20-backend-orchestrator.mdc` — 백엔드 규칙

## 구현 흐름

### 1단계: 대상 파일 목록 확인 및 일괄 검색

- `backend/src/` 하위에서 `logger.` 호출 중 한글이 포함된 모든 줄 식별
- `backend/tests/` 하위에서 `print()` 호출 중 한글이 포함된 줄 식별
- docstring/주석 내 `print()` 예시도 확인
- 이모지 포함 여부 최종 확인 (현재 0건이지만, 최종 검증)

### 2단계: 영어 메시지로 일괄 전환

- 각 로그 메시지를 동일한 의미의 영어로 전환:
  - `[ModuleName]` 접두사는 그대로 유지
  - 메시지 내용만 영어로 변경
  - 예: `logger.info("[Startup] Unknown World 백엔드 시작")` → `logger.info("[Startup] Unknown World backend starting")`
- docstring/주석 내 한글 print 예시도 영어로 수정

### 3단계: 검증

- 전체 백엔드 소스에서 한글 문자가 포함된 `logger.*()` / `print()` 호출이 0건인지 확인
- `BUSINESS_RULE_MESSAGES` 등 i18n 딕셔너리/상수는 제외하고 검증
- 서버 기동 후 로그 출력이 영어로 일관되는지 확인
- 이모지 문자(`\U0001F...` 범위) 포함 로그가 0건인지 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- 없음 (독립 작업)

**다음 작업에 전달할 것**:

- U-119[Mmp]: WIG 폴리시에서 로그 일관성(영어 통일) 최종 점검
- 운영/디버깅 시 로그 파싱 도구가 영어 메시지를 전제할 수 있음

## 주의사항

**기술적 고려사항**:

- (RULE-006) `BUSINESS_RULE_MESSAGES`의 한국어 에러 메시지는 **사용자 노출용 i18n 리소스**이므로 본 유닛에서 수정하지 않음. 이 메시지는 `language` 파라미터에 따라 선택되는 구조이므로 영어 대응 메시지가 이미 존재함
- (PRD 3.2) 프롬프트 파일(`.md`)의 한글 내용은 **프롬프트 i18n**(ko/en 분리)이므로 본 유닛 범위 외
- 로그 레벨/구조(`[ModuleName] message` 패턴)는 변경하지 않음 — 메시지 내용만 영어화

**잠재적 리스크**:

- 변경 범위가 넓지만(12개 파일) 각 변경이 단순 문자열 교체이므로 기능 영향 없음
- 로그 메시지를 grep하는 기존 스크립트/문서가 있다면 깨질 수 있음 → 현재 해당 의존 없음

## 페어링 질문 (결정 필요)

- [x] **Q1**: 주석(코드 주석, `# 한글 설명`)도 영어로 전환할 것인가?
  - Option A: **로그/print만** (최소 범위, 본 유닛)
  - ✅Option B: **로그/print + 핵심 인라인 주석** (주석은 MMP 범위로 보류)
  - Option C: **모든 한글 주석 영어화** (대규모, MMP 이후)

## 참고 자료

- `vibe/prd.md` 3.1-3.2절 — 언어 정책
- `.cursor/rules/20-backend-orchestrator.mdc` — 백엔드 규칙
- `vibe/ref/structured-outputs-guide.md` — 구조화 출력 가이드 (에러 메시지 i18n 참고)
