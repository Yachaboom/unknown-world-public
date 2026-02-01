# U-053[Mvp]: 비동기 이미지 생성 및 결과 데이터 동기화 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-053[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-01 16:15
- **담당**: AI Agent

---

## 1. 작업 요약

이미지 생성 모델을 호출하여 결과물을 얻고, 생성된 이미지의 로컬 저장 경로를 서빙 가능한 URL로 변환하여 최종 응답 객체(`TurnOutput`)에 동기화하는 기능을 구현했습니다. 이미지 생성은 비동기(`await`)로 수행되며, 생성된 `image_url`, `image_id`, `generation_time_ms` 등의 메타데이터가 `TurnOutput.render` 필드에 정확히 반영됩니다.

---

## 2. 작업 범위

- [x] `render_stage` 내 이미지 생성 서비스(`ImageGenerator`) 호출 로직 구현
- [x] 비동기 이미지 생성 및 소요 시간 측정 기능 추가
- [x] `TurnOutput.render`(`RenderOutput`) 필드 확장 및 데이터 동기화 로직 구현
- [x] 이미지 생성 성공/실패 시나리오별 로깅 강화 (RULE-007 준수: 프롬프트 해시 사용)
- [x] `model_copy`를 활용한 Pydantic 모델 불변성 유지 및 컨텍스트 업데이트 전략 적용

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `backend/src/unknown_world/orchestrator/stages/render.py` | 수정 | `_execute_image_generation` 및 `_update_render_output` 추가, `render_stage` 통합 |
| `backend/src/unknown_world/models/turn.py` | 수정 | `RenderOutput` 스키마에 `image_url`, `image_id`, `generation_time_ms`, `background_removed` 필드 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 기능 및 흐름**:
1. **판정 결과 수신**: U-052에서 결정된 `ImageGenerationDecision`을 바탕으로 생성이 필요한 경우에만 진행.
2. **비동기 호출**: `ctx.image_generator.generate(request)`를 호출하여 이미지 생성 및 로컬 저장을 수행.
3. **데이터 동기화 (Option A)**: 생성된 이미지의 서빙 URL과 고유 ID를 `ctx.output.render` 필드에 주입. Pydantic의 `model_copy(update=...)`를 사용하여 안전하게 객체를 교체.
4. **로깅 보안**: RULE-007에 따라 프롬프트 원문 대신 8자리 해시를 로그에 기록하여 보안 및 가시성 확보.

**설계 패턴/원칙**:
- **비차단 렌더링(Text-First)**: `render_stage`는 내러티브가 이미 결정된 후 실행되므로 텍스트 스트리밍에는 영향을 주지 않으면서 이미지를 비동기로 보완.
- **상태 무결성**: 이미지 생성 실패 시에도 `image_url`을 `None`으로 유지하고 에러를 캡슐화하여 전체 파이프라인 중단 방지(RULE-004).

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 생성된 이미지가 `.data/images/generated/`에 저장되고 해당 경로가 URL로 변환됨.
- **권한/보안**: Vertex AI 서비스 계정을 통한 인증 유지, 로그 보안 강화.
- **빌드/의존성**: 추가 의존성 없음 (U-051/U-052 기반 위에서 구현).

### 4.3 가정 및 제약사항

- 이미지 생성 실패 시 텍스트 내러티브에 실패 사유를 폴백으로 명시하는 로직은 후속 유닛(U-054)에서 담당합니다.
- 이미지 생성 비용 차감(Economy 연동)은 별도 유닛에서 처리될 예정입니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-053-async-image-generation-runbook.md`
- **실행 결과**: 
    - ✅ 시나리오 A (생성 성공): `image_url` 정상 반영 확인
    - ✅ 시나리오 B (생성 건너뜀): pass-through 동작 확인
    - ✅ 시나리오 C (잔액 부족 폴백): 로그 기록 확인
    - ✅ 시나리오 D (배경 제거 연동): `background_removed` 플래그 확인
    - ✅ 시나리오 E (필드 검증): `RenderOutput` 확장 필드 타입 정합성 확인

---

## 6. 리스크 및 주의사항

- **생성 지연**: 실제 Gemini API 호출 시 10초 이상의 지연이 발생할 수 있으나, 이는 텍스트가 먼저 나간 후 수행되므로 UX 상의 TTFB 리스크는 최소화됨.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-054**: 이미지 생성 실패 시 폴백 메시지를 `TurnOutput.narrative`에 반영하여 사용자 피드백 강화.
2. **U-055**: 이미지 파이프라인 Mock/Real 모드 통합 검증.

### 7.2 의존 단계 확인

- **선행 단계**: U-052[Mvp] (판정 로직) 완료
- **후속 단계**: U-054[Mvp] (실패 복구 체계)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시 (RULE-007, RULE-008)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
