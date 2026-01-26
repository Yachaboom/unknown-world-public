# U-043[Mvp]: ko/en 혼합 출력 게이트(언어 검증+Repair) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-043[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-26 14:00
- **담당**: AI Agent

---

## 1. 작업 요약

한 화면에서 한글과 영어가 섞여 나오는 현상을 방지하기 위해 백엔드 Hard Gate에 언어 콘텐츠 검증 로직을 추가하고, 위반 시 Repair loop를 통해 해당 언어로 자동 교정하도록 구현하였습니다.

---

## 2. 작업 범위

- **언어 감지 휴리스틱 구현**: 한글/라틴 문자 비율 측정 및 임계값(15%) 기반 혼합 판정 로직 개발
- **화이트리스트 정의**: Signal, Shard, FAST, QUALITY 등 게임 내 고유 용어에 대한 예외 처리
- **전수 검사 로직**: `TurnOutput`의 모든 사용자 노출 필드(narrative, ui, world 등) 자동 추출 및 검사
- **Repair loop 연동**: 언어 혼합 전용 피드백 템플릿 추가 및 `CONSISTENCY_FAIL` 배지 매핑
- **검증**: 단위 테스트 및 런북 시나리오를 통한 정상 동작 확인

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `backend/src/unknown_world/validation/language_gate.py` | 신규 | 언어 감지 휴리스틱 및 텍스트 추출/검증 유틸리티 |
| `backend/src/unknown_world/validation/business_rules.py` | 수정 | 비즈니스 룰 검증 단계에 언어 콘텐츠 검사 추가 |
| `backend/src/unknown_world/orchestrator/repair_loop.py` | 수정 | 언어 교정 전용 Repair 지시어 및 배지 매핑 추가 |
| `backend/src/unknown_world/validation/__init__.py` | 수정 | 언어 게이트 관련 함수/클래스 Export |
| `backend/tests/unit/test_u043_language_gate.py` | 신규 | 유닛 및 Repair 통합 테스트 케이스 |
| `vibe/unit-runbooks/U-043-language-gate-runbook.md` | 신규 | 구현 기능 실행 및 검증 가이드 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 인터페이스**:

- `validate_language_consistency(output, expected_lang) -> LanguageGateResult`: `TurnOutput`의 언어 일관성 전수 검사
- `is_language_mixed(text, expected_lang) -> bool`: 개별 문자열에 대한 혼합 여부 판정 (임계값 15%)
- `extract_user_facing_texts(output) -> list[ExtractedText]`: 검사 대상 필드(narrative, ui, world, safety) 추출

**설계 패턴/원칙**:
- **SSOT**: `TurnInput.language`를 기준으로 모든 사용자 노출 텍스트의 언어를 강제합니다.
- **Whitelist**: 고유명사 오탐 방지를 위해 `ALLOWED_ENGLISH_TERMS`를 정의하여 검사 전 정규화 과정에서 제거합니다.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 영향 없음
- **권한/보안**: 내부 추론이나 프롬프트 원문이 아닌, 사용자 노출 텍스트만 검사 대상에 포함하여 정보 유출 방지
- **빌드/의존성**: 추가 라이브러리 없이 Python 표준 라이브러리(`unicodedata`, `re`)만 사용

### 4.3 가정 및 제약사항

- 휴리스틱 기반 검사이므로 특수 문자나 기호가 극단적으로 많은 경우 판정이 어려울 수 있음 (최소 3글자 이상 권장)
- 화이트리스트에 없는 신규 고유 용어 추가 시 `language_gate.py` 업데이트 필요

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-043-language-gate-runbook.md`
- **실행 결과**: Python REPL 및 단위 테스트를 통해 혼합 출력 감지 및 Repair 지시어 생성 확인 완료

---

## 6. 리스크 및 주의사항

- **오탐 리스크**: 정상적인 약어 사용 시 `CONSISTENCY_FAIL`이 발생할 수 있으므로, 향후 CP 단계에서 임계값(0.15) 튜닝 필요
- **비용 증가**: Repair loop 작동 시 추가적인 API 호출 비용 발생

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-044**: 프론트엔드에서 `TurnInput.language` SSOT 고정 및 서버 연동 테스트
2. **CP-MVP-05**: 실제 시나리오에서의 언어 일관성 최종 검증

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
