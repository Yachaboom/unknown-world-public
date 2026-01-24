# U-018[Mvp] 비즈니스 룰 검증 + Repair loop + 안전 폴백 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-018[Mvp]
- **단계 번호**: 3.2
- **작성 일시**: 2026-01-25 15:30
- **담당**: AI Agent

---

## 1. 작업 요약

Pydantic 스키마 검증 이후 단계에서 발생하는 비즈니스 룰(재화 음수 금지, 언어 일관성, 좌표 규약, 안전 차단)을 검증하고, 실패 시 자동 복구(Repair loop) 및 최종 안전 폴백을 제공하는 하드 게이트 시스템을 구축했습니다.

---

## 2. 작업 범위

- **Business Rules Validator**: 경제(RULE-005), 언어(RULE-006), 좌표(RULE-009), 안전 규칙에 대한 서버 측 검증 로직 구현
- **Repair Loop**: 검증 실패 시 Gemini 모델에게 피드백을 주어 재시도하는 루프(최대 2회) 구현 및 `repair` 이벤트 스트리밍
- **Safe Fallback**: 모든 재시도 실패 또는 심각한 예외 발생 시, 입력 스냅샷을 보존하고 스키마를 준수하는 안전한 `TurnOutput` 생성 및 반환
- **SSE Stream Integration**: `api/turn.py` 내의 스트리밍 파이프라인에 검증 및 복구 단계를 원자적으로 통합

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/api/turn.py` | 수정 | 스트리밍 파이프라인에 Repair loop 및 검증 단계 통합 |
| `backend/src/unknown_world/orchestrator/validator.py` | 신규 | 비즈니스 룰 검증 클래스 (BusinessRulesValidator) |
| `backend/src/unknown_world/orchestrator/mock.py` | 수정 | 모의 오케스트레이터에 폴백 생성 및 검증 로직 반영 |
| `vibe/unit-runbooks/U-018-business-rules-repair-runbook.md` | 신규 | 기능 검증 및 수동 테스트 가이드 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:

- `BusinessRulesValidator.validate(turn_input, turn_output): ValidationResult` - 4대 핵심 규칙(Economy, Language, Box2D, Safety) 검증
- `Orchestrator.create_safe_fallback(turn_input, reason): TurnOutput` - 재화 보존 및 스키마 준수 폴백 생성
- `SSE Event: repair` - `{"type": "repair", "attempt": n, "reason": "..."}` 형식의 스트림 이벤트

**설계 패턴/원칙**:
- **Hard Gate Strategy**: 스키마가 맞더라도 비즈니스 로직에 위배되면 실패로 간주하여 시스템 인바리언트 보호
- **Feedback-driven Repair**: 실패 사유를 모델에게 전달하여 다음 시도에서 스스로 수정할 수 있는 기회 제공

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 상태 변경 없음 (In-memory 검증 및 스트리밍)
- **권한/보안**: Vertex AI 호출 횟수 관리(Max attempts)를 통해 비용 폭발 방지
- **빌드/의존성**: 변경 없음 (기존 Pydantic 활용)

### 4.3 가정 및 제약사항

- `max_repair_attempts`는 기본 2회로 설정 (지연 시간과 품질의 트레이드오프)
- 폴백 발생 시 비용(`cost`)은 0으로 고정하여 사용자 재화 손실 방지

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-018-business-rules-repair-runbook.md`
- **실행 결과**: 정상 턴, 입력 오류, 잔액 부족, Real 모드 재시도 시나리오 전수 검증 완료
- **참조**: 상세 실행 방법 및 curl 예시는 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **지연 시간(Latency)**: Repair loop 발생 시 턴 처리 시간이 N배로 증가할 수 있음 (TTFB 가시화를 통해 UX 완화)
- **무한 루프 방지**: 최대 시도 횟수 도달 시 반드시 폴백으로 수렴하도록 보장

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **RU-005[Mvp]**: 오케스트레이터 파이프라인 단계(Stages) 리팩토링 및 정리
2. **CP-MVP-04**: 실모델 하드 게이트 통합 체크포인트 검증

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항(RULE-005, 006, 009) 충족 확인
- [x] 모든 경로에서 `final` 이벤트(폴백 포함)로 종료 보장
- [x] Repair 시도 횟수 및 사유 SSE 스트리밍 확인
- [x] 폴백 시 재화 잔액 보존(Economy Snapshot 활용) 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
