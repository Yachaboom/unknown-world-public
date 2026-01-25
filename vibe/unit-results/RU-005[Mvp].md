# RU-005[Mvp] 리팩토링 - orchestrator pipeline stages 정리 개발 완료 보고서

## 메타데이터

- **작업 ID**: RU-005[Mvp]
- **단계 번호**: 3.3
- **작성 일시**: 2026-01-25 18:00
- **담당**: AI Agent

---

## 1. 작업 요약

모의/실모델 경로, 검증/복구 로직이 섞여 있던 기존 오케스트레이터를 **단계(Stages) 기반의 함수 체인 파이프라인**으로 리팩토링했습니다. 이를 통해 PRD 요구사항인 "단계별 가시화(Observability)"를 코드 수준에서 명확히 구현하고 유지보수성을 확보했습니다.

---

## 2. 작업 범위

- **Pipeline Engine**: `PipelineContext`와 `EmitFn`을 기반으로 한 비동기 함수 체인 실행기(`run_pipeline`) 구현
- **Stage Modularization**: 오케스트레이션 과정을 7대 단계(`Parse` → `Validate` → `Plan` → `Resolve` → `Render` → `Verify` → `Commit`)로 완전 모듈화
- **Observability Integration**: 각 단계의 시작/완료, 배지(Badges), 복구(Repair) 이벤트를 도메인 이벤트로 추상화하여 일관되게 송출
- **Mock/Real Unified Pipeline**: 환경변수(`UW_MODE`)에 따라 모의/실모델 경로를 동일한 파이프라인 구조 내에서 투명하게 전환하도록 통합
- **Error Handling & Fallback**: 파이프라인 레벨에서 예외를 포착하고 안전한 폴백(`create_safe_fallback`)으로의 수렴 보장

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/orchestrator/pipeline.py` | 신규 | 파이프라인 엔진 및 실행 로직 |
| `backend/src/unknown_world/orchestrator/stages/types.py` | 신규 | 파이프라인 컨텍스트 및 이벤트 타입 정의 |
| `backend/src/unknown_world/orchestrator/stages/*.py` | 신규 | 7대 단계별 독립 모듈 (parse, validate, plan 등) |
| `backend/src/unknown_world/api/turn.py` | 수정 | API 레이어에서 파이프라인 호출 및 이벤트 스트리밍 연결 |
| `backend/src/unknown_world/orchestrator/generate_turn_output.py` | 수정 | 기존 로직을 stage 기반으로 위임 및 정리 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:

- `run_pipeline(ctx, emit): PipelineContext` - 단계별 함수 체인 실행
- `StageFn(ctx, emit): PipelineContext` - 각 단계의 표준 인터페이스
- `PipelineEvent`: `stage_start`, `stage_complete`, `badges`, `repair` 등 도메인 이벤트 정의

**설계 패턴/원칙**:
- **Option A (Function Chain)**: 클래스 없이 컨텍스트 객체를 전달하고 반환하는 단순하고 테스트 용이한 함수 체인 방식 채택
- **Separation of Concerns**: API 레이어(SSE 변환)와 오케스트레이터 레이어(도메인 로직)를 `EmitFn` 콜백을 통해 격리
- **Behavior Preservation**: 리팩토링 후에도 기존의 턴 처리 결과 및 스트리밍 메시지 의미를 동일하게 유지

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 변경 없음 (내부 로직 구조 개선)
- **권한/보안**: 영향 없음
- **빌드/의존성**: 영향 없음

### 4.3 가정 및 제약사항

- 파이프라인은 `UW_MODE` 환경변수에 따라 동작하며, 기본값은 `mock`으로 유지 (MVP 단계)
- 각 단계는 독립적으로 실행 가능하며, `ctx.output`의 유무에 따라 후속 단계 진행 여부 결정

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/RU-005-S3-runbook.md`
- **실행 결과**: 리팩토링 후에도 기존 모의/실모델 시나리오가 동일하게 동작하며, 단계별 이벤트가 정확한 순서로 송출됨을 확인
- **참조**: 단계 가시화 및 동작 보존 검증은 위 런북 참조

---

## 6. 리스크 및 주의사항

- **이벤트 누락**: 리팩토링 과정에서 특정 이벤트 송출이 누락되지 않도록 `emit` 호출 위치 엄격 관리
- **상태 오염**: `PipelineContext`가 단계 간에 공유되므로, 의도치 않은 상태 변경 주의

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-019[Mvp]**: 단계 기반 파이프라인에 이미지 생성(Render/Verify) 확장 기능 통합
2. **U-024[Mvp]**: Autopilot 로직을 특정 stage(Plan/Resolve)에 통합

### 7.2 의존 단계 확인

- **선행 단계**: U-018 (비즈니스 룰 검증 완료)
- **후속 단계**: MVP 마일스톤의 이미지 및 고도화 단계

---

## 8. 자체 점검 결과

- [x] 오케스트레이션 단계(7단계) 코드 모듈화 완료 확인
- [x] `UW_MODE` 기반 모의/실모델 경로 동작 보존 확인
- [x] 단계/배지/복구 이벤트의 일관된 송출 확인
- [x] 예외 발생 시 안전한 폴백 수렴 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
