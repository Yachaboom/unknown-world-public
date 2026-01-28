# CP-MVP-07: 체크포인트 - real 모드 로컬 실행 게이트(.env/Vertex/스트리밍) 개발 완료 보고서

## 메타데이터

- **작업 ID**: CP-MVP-07
- **단계 번호**: 3.5 (M3 마일스톤 체크포인트)
- **작성 일시**: 2026-01-29 11:30
- **담당**: AI Agent

---

## 1. 작업 요약

로컬 개발 환경에서 `.env` 기반 설정으로 **real 모드(실모델) 실행**이 안정적으로 재현되고, 스트리밍/검증/폴백이 “데모 품질” 기준으로 동작하는지 전수 검증하였습니다. 특히 인증 실패 시의 안전 폴백(Safe Fallback)과 민감 정보 은닉(RULE-007)을 중점적으로 강화하였습니다.

---

## 2. 작업 범위

- **로컬 real 모드 통합 검증**: `.env` 자동 로딩 연동 및 `/health` 상태 확인
- **스트리밍 무결성 검증**: 7단계 stage 이벤트 순서 및 NDJSON 규격 준수 확인
- **Hard Gate 인바리언트 검증**:
    - **Schema OK**: TurnOutput Pydantic/Zod 검증 통과
    - **Economy OK**: 잔액 음수 금지 및 폴백 시 비용 0 보장
    - **Safety OK**: 인증 실패/에러 시 안전 폴백(텍스트-only) 수렴 확인
    - **Consistency OK**: 언어(ko-KR/en-US) 일관성 및 시드(seed) 결정성 확인
- **보안 가드 강화**: `/health` 및 에러 응답 내 민감 정보(GCP 키 경로 등) 노출 차단 (RULE-007)
- **환경변수 정책 수립**: `override=False` 정책을 통한 운영 설정 우선순위 보장

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/tests/integration/test_real_mode_gate.py` | 신규 | real 모드 로컬 실행 및 Hard Gate 통합 테스트 |
| `vibe/unit-runbooks/CP-MVP-07.md` | 신규 | real 모드 로컬 실행 검증 런북 |
| `vibe/unit-results/CP-MVP-07.md` | 신규 | 본 개발 완료 보고서 |

---

## 4. 구현 상세

### 4.1 핵심 설계 및 검증 결과 (Integration Test 기반)

**서버 기동 및 상태 확인 (시나리오 A)**:
- `/health` 엔드포인트가 `status: ok` 및 `rembg` 설치 상태를 정상 반환함.
- `UW_MODE` 환경변수가 `.env`로부터 정상 로드됨을 확인.

**real 모드 턴 스모크 테스트 (시나리오 B)**:
- 7단계 stage 이벤트(`parse` → `validate` → `plan` → `resolve` → `render` → `verify` → `commit`)가 NDJSON 스트림으로 순차 송출됨.
- `final` 이벤트가 유효한 `TurnOutput` 스키마를 준수함.

**Hard Gate 및 폴백 (시나리오 C/D)**:
- **인증 실패 재현**: 잘못된 설정 시 서버 크래시 없이 `error` 이벤트와 함께 비용 0인 `final`(폴백) 결과로 안전하게 종료됨.
- **보안 준수**: 응답 본문에 `GOOGLE_APPLICATION_CREDENTIALS` 등 키 경로가 절대 포함되지 않음을 검증.

### 4.2 인바리언트 준수 현황

- **Schema**: 100% (Pydantic 검증 통과)
- **Economy**: 100% (잔액 음수 없음, 폴백 비용 0)
- **Safety**: 100% (에러 시 안전 폴백 수렴)
- **Consistency**: 100% (언어 일관성 및 시드 기반 결정성)

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/CP-MVP-07.md`
- **실행 결과**: 통합 테스트(`test_real_mode_gate.py`)를 통해 모든 검증 시나리오 자동화 및 수동 확인 완료.
- **참조**: 로컬 실행을 위한 `.env` 설정값은 위 런북 참조.

---

## 6. 리스크 및 주의사항

- **Vertex 인증 만료**: 로컬 테스트용 서비스 계정 키의 유효기간이 만료될 경우 `real` 모드 호출이 실패할 수 있으며, 이때 시스템은 자동으로 `fallback_text_only` 모드로 전환됩니다.
- **네트워크 지연**: 로컬 환경의 네트워크 상태에 따라 스트리밍 TTFB가 가변적일 수 있습니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **CP-MVP-06**: 데모 프로필(3종) 통합 및 "즉시 시작" 게이트 검증.
2. **U-019[Mvp]**: 멀티모달 이미지 생성 통합.

### 7.2 의존 단계 확인

- **선행 단계**: U-047[Mvp], CP-MVP-04 완료
- **후속 단계**: 데모 루프 및 멀티모달 통합 마일스톤

---

## 8. 자체 점검 결과

- [x] `.env` 기반 real 모드 실행 안정성 확인
- [x] 7단계 스트리밍 및 Hard Gate 준수 확인
- [x] 에러 시 안전 폴백(Safe Fallback) 수렴 확인
- [x] RULE-007(보안) 준수 및 민감 정보 은닉 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._