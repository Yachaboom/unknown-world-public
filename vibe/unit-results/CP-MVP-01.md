# CP-MVP-01: 체크포인트 - 스트리밍/스키마/폴백 개발 완료 보고서

## 메타데이터

- **작업 ID**: CP-MVP-01
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-10 13:00
- **담당**: AI Agent

---

## 1. 작업 요약

초기 MVP 루프의 핵심인 **스트리밍, 스키마 검증, 자동 복구 및 안전 폴백** 메커니즘이 PRD 하드 게이트(RULE-004/008)를 준수하며 안정적으로 동작함을 최종 검증하고 문서를 동기화함.

---

## 2. 작업 범위

- [x] **NDJSON 스트리밍 검증**: 서버(FastAPI)와 클라이언트(Fetch) 간의 단계별 이벤트(Stage/Badges) 및 내러티브 델타 전송 확인
- [x] **이중 검증 체계 확인**: 서버(Pydantic) 및 클라이언트(Zod)의 TurnOutput 엄격 검증 로직 점검
- [x] **복구 및 폴백 루프 검증**: 스키마 실패 또는 네트워크 에러 시 Repair loop 및 Safe fallback 동작 확인
- [x] **인바리언트 체크**: 채팅 UI 배제, 프롬프트 은닉, 0~1000 좌표 규약 준수 확인

---

## 3. 생성/수정 파일

_(분석 기반 주요 파일)_

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `backend/src/unknown_world/api/turn.py` | 수정 | 스트리밍 엔드포인트 및 서버측 폴백 로직 |
| `backend/src/unknown_world/api/turn_stream_events.py` | 신규 | 스트림 이벤트 계약(Contract) SSOT |
| `frontend/src/api/turnStream.ts` | 수정 | NDJSON 파서 및 클라이언트측 검증/폴백 로직 |
| `frontend/src/schemas/turn.ts` | 수정 | Zod 기반 TurnOutput 스키마 및 안전 파싱 유틸리티 |
| `vibe/unit-runbooks/CP-MVP-01.md` | 신규 | 체크포인트 재현을 위한 수동 검증 런북 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약 (Stream Events)**:
- `StageEvent`: 처리 단계(Parse→...→Commit) 시각화 (RULE-008)
- `BadgesEvent`: 검증 상태(Schema/Economy/Safety OK) 가시화
- `RepairEvent`: 자동 복구 시도 알림 (RULE-004)
- `FinalEvent`: 최종 구조화 출력(`TurnOutput`)

**설계 패턴/원칙**:
- **Fail-safe 종료 인바리언트**: 어떤 에러 상황에서도 최종적으로 `final` 이벤트를 송출하여 UI 멈춤 방지
- **이중 검증(Double Validation)**: 서버 Pydantic 검증 후 클라이언트 Zod Strict Parse 수행
- **NDJSON 버퍼 파싱**: 청크 단위 수신 시 라인 복구 및 부분 파싱 실패 격리

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 영향 없음 (메모리 내 스트리밍 처리)
- **권한/보안**: 내부 추론(CoT) 및 프롬프트 원문 스트림 제외 (RULE-007 준수)
- **빌드/의존성**: Pydantic V2 및 Zod 4.x 필수 사용

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/CP-MVP-01.md`
- **실행 결과**: 성공 경로(정상 턴), 실패 경로(스키마 위반), 에러 경로(네트워크 단절) 시나리오 모두 통과
- **참조**: 상세 재현 방법은 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **네트워크 지연**: TTFB 2초 목표 달성을 위해 첫 `stage(start)` 이벤트가 즉시 송출되어야 함
- **스키마 불일치**: 서버와 클라이언트의 스키마 버전(`1.0.0`) 동기화가 깨질 경우 폴백 빈도 증가 가능

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-009[Mvp]**: Action Deck UI 컴포넌트 구현
2. **U-010[Mvp]**: Scene Canvas + Hotspot 오버레이 구현

### 7.2 의존 단계 확인

- **선행 단계**: RU-002[Mvp] (완료)
- **후속 단계**: M2 마일스톤 (핵심 UI 개발)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._