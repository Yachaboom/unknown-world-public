# U-052[Mvp]: 조건부 이미지 생성 제어 로직 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-052[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-01 15:40
- **담당**: AI Agent

---

## 1. 작업 요약

`TurnOutput` 내의 이미지 작업 지시(`image_job`)를 분석하여 실제 생성 여부를 결정하는 판정 로직을 구현했습니다. 특히 경제 시스템(Economy)과 연동하여 잔액 부족 시 텍스트-only 폴백을 제안하고, 빈 프롬프트 방어 및 로깅 보안(프롬프트 해싱)을 강화했습니다.

---

## 2. 작업 범위

- [x] `render_helpers.py` 신규 생성 및 이미지 생성 판정 순수 함수 구현
- [x] `IMAGE_GENERATION_COST_SIGNAL` 상수 정의 (10 Signal)
- [x] 프롬프트 유효성 검사 및 SHA-256 해싱 로직 구현 (RULE-007 준수)
- [x] 경제 기반 잔액 검증 및 언어별 폴백 메시지 매핑 (RULE-005, RULE-006 준수)
- [x] `render_stage`에 판정 로직 통합 및 다음 단계(U-053, U-054)를 위한 구조 마련

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `backend/src/unknown_world/orchestrator/stages/render_helpers.py` | 신규 | 이미지 생성 판정, 비용 산정, 해시, 폴백 헬퍼 함수 |
| `backend/src/unknown_world/orchestrator/stages/render.py` | 수정 | `render_stage` 내 판정 로직 호출 및 통합 |
| `backend/src/unknown_world/orchestrator/stages/__init__.py` | 참조 | 스테이지 패키지 노출 설정 확인 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약 (헬퍼 함수)**:

- `decide_image_generation(turn_output, economy_snapshot, language) -> ImageGenerationDecision`: 종합 판정 메인 함수
- `extract_image_job(turn_output) -> ImageJob | None`: 스키마에서 작업 지시 추출
- `should_generate_image(image_job) -> bool`: 플래그 및 프롬프트 유효성 판정
- `can_afford_image_generation(economy_snapshot, cost) -> bool`: 잔액 검증
- `get_prompt_hash(prompt) -> str`: 프롬프트 원문 노출 방지를 위한 8자리 해시 생성

**설계 패턴/원칙**:
- **순수 함수(Pure Functions)**: 판정 로직을 상태와 분리하여 테스트 가능성 확보
- **방어적 프로그래밍**: 모델이 `should_generate=true`를 반환하더라도 프롬프트가 비어있으면 생성을 차단

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 영향 없음 (메모리 내 판정)
- **권한/보안**: RULE-007 준수를 통해 로그를 통한 프롬프트/비밀정보 유출 방지
- **빌드/의존성**: 추가 의존성 없음 (표준 라이브러리 `hashlib` 사용)

### 4.3 가정 및 제약사항

- MVP 이미지 생성 비용은 10 Signal로 고정합니다 (Option A).
- 실제 폴백 메시지의 `TurnOutput` 반영 및 이미지 생성기 호출은 후속 유닛(U-053, U-054)에서 수행합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-052-conditional-image-generation-runbook.md`
- **실행 결과**: 
    - ✅ 시나리오 A (정상 판정): 통과
    - ✅ 시나리오 B (생성 안 함): 통과
    - ✅ 시나리오 C (잔액 부족 폴백): 통과
    - ✅ 시나리오 D (빈 프롬프트 방어): 통과
    - ✅ 시나리오 E (render_stage 통합): 통과

---

## 6. 리스크 및 주의사항

- **모델 일관성**: 모델이 구조화 출력 시 `image_job`을 누락하거나 잘못된 형식을 줄 경우 `validate_stage`에서 이미 걸러진다고 가정하나, `render_helpers`에서 한 번 더 방어적으로 처리합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-053**: 판정 결과가 `True`일 때 `PipelineContext.image_generator`를 통한 실제 이미지 생성 및 결과 동기화 구현
2. **U-054**: `insufficient_balance` 시 폴백 메시지를 `TurnOutput.narrative` 등에 반영하는 로직 구현

### 7.2 의존 단계 확인

- **선행 단계**: U-051[Mvp] (브릿지 구축) 완료 확인
- **후속 단계**: U-053[Mvp] (이미지 생성 실행)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시 (RULE-005, 007, 008)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
