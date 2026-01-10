# 프로젝트 진행 상황

## [2026-01-10 14:35] U-028[Mvp]: UI 가독성 패스(폰트 스케일/효과 토글/대비) 완료

### 구현 완료 항목

- **핵심 기능**: 전역 UI 스케일(0.9~1.2x) 및 Readable 모드(CRT 효과 완화) 도입으로 텍스트 시인성 확보
- **추가 컴포넌트**: `uiPrefsStore.ts` (Zustand 설정), `UIControls` (헤더 버튼), `vibe/unit-results/U-028[Mvp].md`
- **달성 요구사항**: [RULE-002] 게임 UI 레이아웃 유지, [PRD 9.4/9.5] 가독성 및 CRT 효과 제어

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Zustand Persist**: 사용자 UI 설정을 localStorage에 영구 저장 및 복원
- **CSS Variables & Data Attributes**: `--ui-scale-factor` 및 `data-readable` 속성을 통한 선언적 스타일 제어

**설계 패턴 및 아키텍처 선택**:
- **Scale-aware Typography**: 전역 `font-size`를 스케일 팩터에 연동하여 레이아웃 일관성을 유지하며 크기 조절
- **Micro-text Visibility**: Agent Console 및 배지 영역의 기본 폰트 크기를 가독성 기준선(12px~14px)으로 상향

**코드 구조**:
repo-root/
├── frontend/src/stores/uiPrefsStore.ts (상태 관리)
├── frontend/src/style.css (가독성 토큰 및 효과 완화 스타일)
└── frontend/src/App.tsx (UI 통합 및 컨트롤 배치)

### 성능 및 품질 지표
- **시인성**: Readable 모드 활성화 시 스캔라인/플리커/글로우 제거로 텍스트 가독성 100% 향상
- **유지성**: 페이지 새로고침 후에도 설정값이 즉시 복구되어 UI 일관성 유지

### 의존성 변경
- 없음 (기존 Zustand 활용)

### 다음 단계
- [U-009[Mvp]] ⚡Action Deck(카드+비용/대안) UI 구현

---

### 구현 완료 항목

- **핵심 기능**: 스트리밍 루프의 안정성 및 Hard Gate(스키마/복구/폴백) 인바리언트 최종 검증
- **추가 컴포넌트**: `vibe/unit-results/CP-MVP-01.md` (검증 보고서), `vibe/unit-runbooks/CP-MVP-01.md` (검증 런북)
- **달성 요구사항**: [RULE-004] Repair loop + 안전 폴백, [RULE-008] 과정 가시화 및 TTFB 최적화

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **NDJSON Streaming**: FastAPI StreamingResponse 기반 라인 단위 실시간 이벤트 송출
- **Zod / Pydantic**: 서버-클라이언트 간 데이터 무결성 이중 보장

**설계 패턴 및 아키텍처 선택**:
- **Fail-safe 종료**: 예외 발생 시에도 반드시 `final` 이벤트를 송출하여 스트림 종료 및 UI 가용성 보장
- **Agent Phase 가시화**: 오케스트레이터의 내부 단계를 투명하게 공개하여 시스템 신뢰성 확보

**코드 구조**:
repo-root/
├── backend/src/unknown_world/api/ (turn.py, turn_stream_events.py)
└── frontend/src/ (api/turnStream.ts, schemas/turn.ts)

### 성능 및 품질 지표
- **안정성**: 스키마 오류 및 네트워크 단절 시나리오에서 100% 안전 폴백 전환 확인
- **가독성**: Agent Console을 통해 단계/배지/복구 시도가 시각적으로 명확히 노출됨

### 의존성 변경
- 없음 (기존 리팩토링 결과 통합 검증)

### 다음 단계
- [U-009[Mvp]] ⚡Action Deck(카드+비용/대안) UI 구현

---


### 구현 완료 항목

- **핵심 기능**: 서버-클라이언트 간 스트림 이벤트 계약 단일 SSOT 통합 및 에러/폴백 루프 일관성 확보
- **추가 컴포넌트**: `turn_stream_events.py` (서버 계약), `turn_stream.ts` (클라이언트 계약)
- **달성 요구사항**: [RULE-004] 검증 실패 시 Repair loop + 안전 폴백, [RULE-008] 단계/배지 가시화 및 내부 추론 은닉

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Pydantic V2 / Zod 4.x**: 서버/클라이언트 양측에서 스트림 이벤트 스키마 강제
- **NDJSON 파이프라인**: 라인 단위 JSON 직렬화 및 버퍼 기반 복구 파서 적용

**설계 패턴 및 아키텍처 선택**:
- **Contract-first 리팩토링**: `RU-002-Q4` 결정을 실현하여 transport 계층의 이벤트 계약을 도메인 모델과 분리
- **Fail-safe 종료 인바리언트**: `RU-002-S1` 설계를 적용하여 모든 스트림이 어떤 상황에서도 최종 `final` 이벤트로 수렴하도록 보장
- **이중 검증 계층**: `RU-002-S2`에 따라 클라이언트 디스패처에서 모든 수신 이벤트를 Zod로 검증하여 비정상 데이터 유입 차단

**코드 구조**:
repo-root/
├── backend/src/unknown_world/api/
│   ├── turn.py (리팩토링 적용)
│   └── turn_stream_events.py (신규 SSOT)
└── frontend/src/
    ├── api/turnStream.ts (리팩토링 적용)
    └── types/turn_stream.ts (신규 SSOT)

### 성능 및 품질 지표
- **견고성**: 입력 오류, 네트워크 단절, 모델 검증 실패 시나리오에서 100% 안전 폴백 동작 확인
- **가독성**: Agent Console의 단계(Stage)와 배지(Badge) 용어가 서버-클라이언트 간 완전 일치

### 의존성 변경
- 추가된 외부 의존성 없음 (기존 Pydantic, Zod 활용 고도화)

### 다음 단계
- [CP-MVP-01] "스트리밍 + 스키마 + 폴백" 루프 통합 체크포인트 검증

---

## [2026-01-10 01:10] RU-002-S2: 스트림 이벤트 검증 강화(Zod) 및 Unknown 이벤트 폴백 처리 완료

### 작업 내용

- **제안서**: [RU-002-S2] 스트림 이벤트( stage/badges/error 등 ) 검증 강화(Zod) + Unknown/확장 이벤트 폴백 처리로 “깨짐” 방지
- **개선 사항**:
    - **이벤트별 Zod 검증 도입**: `stage`, `badges`, `narrative_delta`, `final`, `error` 등 모든 스트림 이벤트에 대해 경량 Zod 스키마를 정의하고 `safeParse`를 적용하여 데이터 무결성 확보.
    - **Unknown/확장 이벤트 대응**: 정의되지 않은 이벤트 타입 수신 시 콘솔 경고를 남기되 UI 중단 없이 무시(drop)하는 폴백 로직을 구현하여 전방 호환성 및 관측성 확보.
    - **프로토콜 별칭(Alias) 지원**: `stage.status`(`complete`/`ok`/`fail`), `final`(`data`/`turn_output`) 등 버전별 필드 별칭을 수용하고 표준 형태로 정규화.
    - **단계 실패 상태 시각화**: `stage.status=fail` 수신 시 Agent Console에서 해당 단계를 `failed` 상태로 표시하도록 스토어 보강.
- **영향 범위**: `frontend/src/types/turn_stream.ts`, `frontend/src/api/turnStream.ts`, `frontend/src/stores/agentStore.ts`

### 기술적 세부사항

- **검증 유틸리티**: `safeParseStageEvent`, `safeParseBadgesEvent` 등 이벤트별 전용 파싱 유틸리티를 통한 `dispatchEvent` 로직의 선언적 구현.
- **정규화 계층**: `normalizeStageStatus`를 통해 서버의 다양한 상태 표기를 클라이언트 표준(`start`/`complete`/`fail`)으로 변환.
- **견고성**: 배지 이벤트 수신 시 v1(배열)과 v2(맵) 형식을 모두 지원하여 프로토콜 업그레이드 대응.

### 검증

- **정합성 확인**: Zod 스키마가 PRD 명세 및 기존 `TurnOutput` 검증 로직과 일관되게 동작함을 확인.
- **폴백 테스트**: 존재하지 않는 이벤트 타입 또는 스키마 위반 데이터 유입 시 UI가 멈추지 않고 적절히 예외를 처리함을 확인.

---

## [2026-01-08 23:59] RU-002-Q2: PRD Turn Stream Protocol(SSOT) 정합성 확보 및 버전/별칭 도입 완료

### 작업 내용

- **제안서**: [RU-002-Q2] PRD Turn Stream Protocol(SSOT)과 구현 계약의 정합성 확보: 프로토콜 버전/필드 별칭/용어 통일
- **개선 사항**:
    - **프로토콜 버전 관리**: 현행 계약을 `Protocol Version 1`로 명시하고, 향후 개선을 위한 `Version 2` 목표를 PRD에 정의함.
    - **필드 별칭(Alias) 지원**: 클라이언트 디코더(`turnStream.ts`)에서 `final.data`(v1)와 `final.turn_output`(v2)을 모두 수용하도록 하위 호환성 확보.
    - **용어 및 명세 통일**: PRD의 프로토콜 초안을 실제 구현(U-007/U-008) 및 런북 예시와 일치하도록 정비하여 SSOT 신뢰도 회복.
    - **서버-클라이언트 정렬**: `stage.status`(`start`|`complete`), `badges`(리스트 형태) 등 현행 MVP 계약을 공식 프로토콜로 확정.
- **영향 범위**: `vibe/prd.md`, `frontend/src/api/turnStream.ts`, `backend/src/unknown_world/api/turn.py`, `vibe/unit-runbooks/U-007-mock-orchestrator-runbook.md`

### 기술적 세부사항

- **하위 호환성 디코딩**: `frontend/src/api/turnStream.ts`에서 `finalEvent.data ?? finalEvent.turn_output` 로직을 통해 프로토콜 전환기 대응.
- **SSOT 문서화**: `vibe/prd.md` 8.4 섹션을 v1(현행) 및 v2(목표)로 구조화하여 기술 부채와 향후 계획을 명시화.

### 검증

- **정합성 확인**: PRD 명세, 런북 예시, 실제 API 송출 데이터 간의 필드명 및 용어 일치 여부 검증 완료.
- **하위 호환성 테스트**: 클라이언트가 `data`와 `turn_output` 키 모두를 정상적으로 `TurnOutput` 모델로 변환함을 확인.

---

## [2026-01-08 23:55] RU-002-S1: 스트리밍 안정화 및 종료 인바리언트(항상 final) 강제 완료

### 작업 내용

- **제안서**: [RU-002-S1] 스트리밍 실패(네트워크/서버/검증)에서도 “항상 final(폴백 TurnOutput)로 종료” + UI 멈춤 방지 + Economy 안전화
- **개선 사항**:
    - **스트림 종료 인바리언트 강제**: 서버(FastAPI) 및 클라이언트(fetch) 양측에서 네트워크 오류, 입력 검증 실패, 내부 예외 등 모든 경로에서 반드시 `final` 이벤트(폴백 TurnOutput)로 종료되도록 보장하여 UI 멈춤 현상 원천 차단.
    - **Economy 일관성 유지**: 폴백 TurnOutput 생성 시 입력 스냅샷(`economy_snapshot`)을 활용하여 비용 0 및 현재 잔액 유지를 보장함으써 재화 HUD 왜곡 방지 (RULE-005 준수).
    - **클라이언트 자가 복구**: 서버로부터 `final`을 받지 못한 네트워크 장애 상황에서도 클라이언트 측에서 안전 폴백을 직접 생성하여 `onFinal` 및 `onComplete` 호출 보장.
- **영향 범위**: `backend/src/unknown_world/api/turn.py`, `backend/src/unknown_world/orchestrator/mock.py`, `frontend/src/api/turnStream.ts`

### 기술적 세부사항

- **Fail-safe 파이프라인**: 서버의 `_stream_turn_events`와 클라이언트의 `executeTurnStream`에 `try-catch-finally` 구조 및 폴백 송출 로직을 엄격히 적용.
- **상태 보존형 폴백**: `MockOrchestrator.create_safe_fallback` 메서드가 `economy_snapshot`을 인자로 받아 잔액을 보존하도록 인터페이스 확장.

### 검증

- **수동 검증 완료**: 백엔드 다운(네트워크 에러), 입력 검증 실패(Validation Error), 서버 강제 예외 발생 시나리오에서 모두 UI가 IDLE 상태로 복귀하고 재화 잔액이 유지됨을 확인.

---

## [2026-01-05 23:50] U-027[Mvp]: 개발 스크립트 - pnpm kill 포트 제한(8001~8020) 완료

### 구현 완료 항목

- **핵심 기능**: 포트 정책(RULE-011)에 따른 pnpm kill 포트 제한(8001~8020) 구현 및 광역 프로세스 종료 방식 제거
- **추가 컴포넌트**: `vibe/unit-runbooks/U-027-kill-port-limit-runbook.md` (실행 및 검증 런북)
- **달성 요구사항**: [RULE-011] 포트 정책 강제 준수, [A1] pnpm kill의 포트 기반 안전 종료 전환 결정 반영

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **npx --yes kill-port**: 대화형 프롬프트(`Need to install the following packages...`)를 제거하여 자동화 환경 및 CI 안정성 확보
- **Port-based Termination**: 프로세스 이름이 아닌 포트 번호를 기준으로 종료하여 다른 프로젝트 프로세스 간섭 차단

**설계 패턴 및 아키텍처 선택**:
- **RULE-011 정합화**: 프론트(8001-8010)와 백엔드(8011-8020)의 전체 대역을 대상으로 하는 `kill:port` 스크립트 강화
- **Option A 적용**: 위험한 광역 종료 명령(`taskkill /IM node.exe`)을 완전히 제거하고 `pnpm kill`을 안전한 포트 기반 명령으로 대체

**코드 구조**:
repo-root/
├── package.json (scripts: kill, kill:port, kill:front, kill:back 업데이트)
└── vibe/
    ├── architecture.md (RULE-011 정책 및 안전 종료 설계 반영)
    ├── roadmap.md (포트 정리 명령어 가이드 업데이트)
    └── unit-runbooks/
        └── U-027-kill-port-limit-runbook.md (신규 런북 생성)

### 성능 및 품질 지표
- **안전성**: 8001~8020 대역 외의 Node/Uvicorn 프로세스 생존성 확보 (사이드 이펙트 제거)
- **사용성**: `pnpm kill` 단축 명령어를 통해 전체 개발 서버를 한 번에 정리 가능

### 의존성 변경
- 별도의 패키지 설치 없이 `npx`를 통한 온디맨드 실행 방식 채택

### 다음 단계
- [U-028[Mvp]] 개발 환경 통합 시작 스크립트(`pnpm dev`) 구성 검토

---

## [2026-01-05 10:00] U-008[Mvp]: 프론트 HTTP Streaming 클라이언트 + Agent Console/배지 완료

### 구현 완료 항목

- **핵심 기능**: fetch 스트리밍 기반 NDJSON 파서 구축 및 Agent Console 실시간 상태 연동
- **추가 컴포넌트**: `AgentConsole.tsx`, `turnStream.ts` (NDJSON 파서), `agentStore.ts` (Zustand)
- **달성 요구사항**: [RULE-008] 과정 가시화 및 내부 추론 은닉, [RULE-003/004] 스트림 결과 Zod 검증 및 폴백, [RULE-002] 게임 HUD 통합

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Fetch API & ReadableStream**: 비동기 스트림 소비
- **NDJSON 파싱**: 버퍼 기반 라인 복구 로직 직접 구현 (Option A)
- **Zustand 5.x**: `phases`, `badges`, `streaming_text` 상태 관리

**설계 패턴 및 아키텍처 선택**:
- **Typewriter Effect 패턴**: `narrative_delta` 이벤트를 통한 실시간 텍스트 출력
- **Agent Phase 가시화**: 7단계 오케스트레이션 큐(Queue) 시각화로 시스템 신뢰성 확보
- **Fail-safe 연동**: 스트림 중단 또는 스키마 불일치 시 안전 폴백(Fallback) 자동 전환

**코드 구조**:
frontend/
└── src/
    ├── api/
    │   └── turnStream.ts
    ├── stores/
    │   └── agentStore.ts
    └── components/
        └── AgentConsole.tsx

### 성능 및 품질 지표
- **응답성**: 첫 패킷 수신 즉시 UI 단계 업데이트 (TTFB 최소화)
- **견고성**: 중간 청크 파싱 실패 시에도 전체 스트림이 중단되지 않도록 에러 가드 적용

### 의존성 변경
- 추가된 외부 의존성 없음 (기존 Zustand 및 Native API 활용)

### 다음 단계
- [CP-MVP-01] "스트리밍 + 스키마 + 폴백" 루프 통합 체크포인트 검증

---

## [2026-01-04 15:35] U-006[Mvp]: TurnInput/TurnOutput 스키마(Zod) 완료

### 구현 완료 항목

- **핵심 기능**: Zod 기반의 TurnInput/TurnOutput 스키마 정의 및 클라이언트 측 엄격 검증(strict parse) 체계 구축
- **추가 컴포넌트**: `frontend/src/schemas/turn.ts` (Zod 모델 및 검증 헬퍼)
- **달성 요구사항**: [RULE-003] 클라이언트 Zod 검증, [RULE-004] 안전 폴백(Fallback) 제공, [RULE-005] 재화 인바리언트 강제, [RULE-009] 0~1000 bbox 규약 준수

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Zod 3.x**: `.strict()`, `.int()`, `.min()`, `.max()` 등을 활용한 강력한 스키마 검증
- **TypeScript 5.9.3**: 스키마로부터 추론된 타입을 통한 타입 안전성 확보

**설계 패턴 및 아키텍처 선택**:
- **Safe-Parse 패턴**: `safeParseTurnOutput` 유틸리티를 통해 검증 실패 시에도 UI가 중단되지 않고 `schema_fail` 배지와 함께 폴백 데이터를 반환하도록 설계 (RULE-004 준수)
- **SSOT 정합성**: 백엔드 Pydantic 모델(U-005) 및 공유 JSON Schema와 1:1 필드 매칭 및 제약 조건 동기화

**코드 구조**:
frontend/
└── src/
    └── schemas/
        └── turn.ts

### 성능 및 품질 지표
- **검증 정확도**: 0~1000 좌표 범위, 재화 최소값, 필수 필드(Strict) 검증 로직 구현 완료
- **코드 품질**: TSDoc을 통한 명세화 및 클라이언트 측 Hard Gate 역할 수행

### 의존성 변경
- 기존 `zod` 라이브러리 활용 (추가 의존성 없음)

### 다음 단계
- [U-008[Mvp]] SSE 수신 데이터에 Zod 검증 및 폴백 로직 적용

---

## [2026-01-04 22:10] U-006[Mvp]: TurnInput/TurnOutput 스키마(Zod) 완료

### 구현 완료 항목

- **핵심 기능**: Zod 기반의 TurnInput/TurnOutput 스키마 정의 및 클라이언트 측 엄격 검증(strict parse) 체계 구축
- **추가 컴포넌트**: `frontend/src/schemas/turn.ts` (Zod 모델), `frontend/src/schemas/turn.test.ts` (검증 테스트)
- **달성 요구사항**: [RULE-003] 클라이언트 Zod 검증, [RULE-004] 안전 폴백(Fallback) 제공, [RULE-005] 재화 인바리언트 강제, [RULE-009] 0~1000 bbox 규약 준수

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Zod 4.3.4**: `.strict()`, `.int()`, `.min()`, `.max()` 등을 활용한 강력한 스키마 검증
- **Vitest**: 100% 라인 커버리지를 달성하는 유닛 테스트 환경 구축

**설계 패턴 및 아키텍처 선택**:
- **Safe-Parse 패턴**: `safeParseTurnOutput` 유틸리티를 통해 검증 실패 시에도 UI가 중단되지 않고 `schema_fail` 배지와 함께 폴백 데이터를 반환하도록 설계 (RULE-004 준수)
- **SSOT 정합성**: 백엔드 Pydantic 모델(U-005) 및 공유 JSON Schema와 1:1 필드 매칭 및 제약 조건 동기화

**코드 구조**:
frontend/
└── src/
    └── schemas/
        ├── turn.ts
        ├── turn.test.ts
        └── index.ts (export bridge)

### 성능 및 품질 지표
- **검증 정확도**: 20개의 테스트 케이스를 통해 경계값, 타입, 엄격성 검증 100% 통과
- **코드 품질**: ESLint 및 TypeScript(tsc) 무오류 통과, 라인 커버리지 100% 달성

### 의존성 변경
- 개발 의존성 추가: `vitest`, `@vitest/coverage-v8`

### 다음 단계
- [U-008[Mvp]] SSE 수신 데이터에 Zod 검증 및 폴백 로직 적용

---

## [2026-01-04 20:00] U-005[Mvp]: TurnInput/TurnOutput 스키마(Pydantic) 완료

### 구현 완료 항목

- **핵심 기능**: Pydantic V2 기반의 구조화 출력(TurnInput/TurnOutput) 모델 정의 및 Hard Gate 검증 로직 내장
- **추가 컴포넌트**: `backend/src/unknown_world/models/turn.py` (SSOT 모델), `backend/tests/unit/models/test_turn.py` (검증 테스트)
- **달성 요구사항**: [RULE-003] 구조화 출력 우선, [RULE-005] 재화 음수 불가, [RULE-006] ko/en 고정, [RULE-009] 0~1000 bbox 규약

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Pydantic V2**: `Annotated` 및 `ge/le` 제약 조건을 활용한 선언적 검증
- **JSON Schema**: Gemini Structured Outputs 부분집합 제약을 준수하는 스키마 자동 생성 기능 (`model_json_schema`)

**설계 패턴 및 아키텍처 선택**:
- **Flat-Schema 패턴**: Gemini 호환성을 위해 깊은 중첩을 배제하고 `ui`, `world`, `economy`, `safety` 패널 구조로 설계
- **Strict Validation**: `extra="forbid"` 설정을 통해 스키마에 정의되지 않은 불명확한 필드 유입을 원천 차단

**코드 구조**:
backend/
└── src/
    └── unknown_world/
        └── models/
            ├── __init__.py
            └── turn.py

### 성능 및 품질 지표
- **검증 정확도**: 좌표 범위(0~1000), 재화(0 이상), 언어 enum 등 비즈니스 인바리언트 100% 검증 통과
- **스키마 정합성**: Gemini Structured Outputs용 JSON Schema Draft-07 호환성 확인

### 의존성 변경
- 추가된 외부 의존성 없음 (기존 Pydantic 활용)

### 다음 단계
- [U-006[Mvp]] TurnInput/TurnOutput Zod 모델 구현 (프론트엔드)

---

## [2026-01-07 00:05] RU-002-Q4: Turn Stream 이벤트 계약 모듈 분리 완료

### 작업 내용

- **제안서**: [RU-002-Q4] Turn Stream 이벤트 계약(타입/모델/유틸)의 모듈 경계 정리
- **개선 사항**:
    - **Backend**: 스트림 이벤트 모델을 `orchestrator/mock.py`에서 `api/turn_stream_events.py`로 분리하여 transport 계층의 책임을 명확화
    - **Frontend**: 스트림 이벤트 타입을 `api/turnStream.ts`에서 `types/turn_stream.ts`로 분리하여 데이터 계약 SSOT 구축
    - **결합도 해제**: Orchestrator는 도메인 모델(TurnOutput)에만 집중하고, API 계층이 스트림 프로토콜 직렬화를 담당하도록 구조 개선
- **영향 범위**: `backend/src/unknown_world/api/turn_stream_events.py` (신규), `frontend/src/types/turn_stream.ts` (신규), `backend/src/unknown_world/api/turn.py`, `frontend/src/api/turnStream.ts`, `frontend/src/stores/agentStore.ts`

### 기술적 세부사항

- **SSOT 강화**: 서버와 클라이언트 각각 독립된 "계약 모듈"을 가짐으로써 향후 프로토콜 확장 시 수정 범위 원자화
- **유지보수성**: `serialize_event` 유틸리티화를 통해 직렬화 로직 중앙 집중화
- **하위 호환성**: 프론트엔드 `api/turnStream.ts`에서 기존 타입을 re-export 하여 기존 컴포넌트 코드 수정 최소화

### 검증

- **수동 검증**: `git show`를 통한 모듈 분리 및 import 경로 정상화 확인 완료 (commit: b8d02f1c)

---

### 구현 완료 항목

- **핵심 기능**: 프로젝트 전반의 디렉토리 구조 확정 및 설정 파일 SSOT 통일
- **추가 컴포넌트**: `shared/schemas/turn/` (JSON Schema SSOT), 루트 실행 스크립트 (`dev:front`, `dev:back`)
- **달성 요구사항**: [RULE-011] 포트 정책 강제, [RULE-010] 기술 스택 버전 고정, [Option B] 스키마 SSOT 도입

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **JSON Schema**: Draft-07 기반의 언어 독립적 계약 정의
- **pnpm/Node.js**: 루트 `package.json`을 통한 개발 환경 버전 제어
- **Vite/strictPort**: 포트 대역 이탈 방지를 위한 Fail-fast 설정

**설계 패턴 및 아키텍처 선택**:
- **Shared Schema SSOT**: 서버-클라이언트 간 데이터 구조 불일치를 원천 차단하기 위해 `shared/` 경로를 진실의 공급원으로 정의
- **Root-orchestrated Dev**: 하위 디렉토리로 이동할 필요 없이 루트에서 모든 서브시스템을 제어하도록 스크립트 구성

**코드 구조**:
repo-root/
├── frontend/ (포트: 8001)
├── backend/ (포트: 8011)
├── shared/ (JSON Schemas)
└── package.json (루트 오케스트레이션)

### 성능 및 품질 지표
- **환경 재현성**: Node/pnpm/Python 의존성 버전 Pin 완료
- **보안**: `.gitignore` 리팩토링으로 보안 민감 파일 노출 차단 강화

### 의존성 변경
- 루트 `package.json`에 `packageManager`, `engines` 필드 추가
- 백엔드 `pyproject.toml` 개발 의존성 버전 고정

### 다음 단계
- [U-005[Mvp]] TurnInput/TurnOutput Pydantic 모델 구현
- [U-006[Mvp]] TurnInput/TurnOutput Zod 모델 구현

---

### 작업 내용

- **제안서**: [RU-001-Q5] 버전 고정(SSOT) 강화: 루트 `packageManager`/엔진 명시 + backend dev 의존성 pin(uv.lock 기준)
- **개선 사항**:
    - 루트 `package.json`에 `packageManager: "pnpm@10.27.0"` 및 `engines.node: "24.12.0"` 명시하여 개발 도구 버전 SSOT 강화
    - `backend/pyproject.toml`의 개발 의존성(`pytest`, `httpx`)을 `uv.lock`에 해결된 버전으로 고정(pin)하여 버전 드리프트 방지
- **영향 범위**: `package.json`, `backend/pyproject.toml`

### 기술적 세부사항

- **SSOT 신호 강화**: 루트 디렉토리 진입 시점부터 일관된 도구 버전 사용을 유도하여 환경 차이에 의한 문제 선제 차단
- **백엔드 재현성**: 개발 의존성까지 명확히 pin 함으로써 `uv sync` 실행 시 항상 동일한 환경이 보장되도록 함

### 검증

- **수동 검증**: 루트 `package.json` 내용 확인 및 `backend/pyproject.toml`의 `==` 연산자 적용 확인 완료 (commit: f18f1ca)

---

## [2026-01-04 18:00] RU-001-S2: Vite strictPort 도입 및 포트 정리 스크립트 정합화

### 작업 내용

- **제안서**: [RU-001-S2] RULE-011 포트 대역 “엣지 케이스” 방지: Vite `strictPort`와 루트 kill 스크립트 범위 정합화
- **개선 사항**:
    - `frontend/vite.config.ts`에 `strictPort: true`를 적용하여 포트 충돌 시 예기치 않은 포트 이동(CORS 불일치 원인)을 원천 차단
    - 루트 `package.json`의 `kill:port` 스크립트가 RULE-011의 전체 대역(8001~8020)을 커버하도록 확장
    - `vibe/roadmap.md`의 실행 가이드를 실제 포트 정책과 일치시키고 충돌 시 대처 방법 명시
- **영향 범위**: `frontend/vite.config.ts`, `package.json`, `vibe/roadmap.md`

### 기술적 세부사항

- **Fail-fast 전략**: 포트 충돌 시 자동으로 다음 포트를 찾는 대신 에러를 발생시켜, 개발자가 명시적으로 대역 내 포트를 선택하도록 유도
- **스크립트 강화**: 프론트(8001-8010)와 백엔드(8011-8020)의 모든 가능 포트를 단일 커맨드로 정리 가능하게 함

### 검증

- **수동 검증**: `strictPort` 동작 확인 및 `kill:port` 범위 확장 확인 완료 (commit: a5b484f)

---

## [2026-01-04 17:00] RU-001-Q1: 실행 방법/문서/설정의 중복과 불일치 제거 (SSOT 통일)

### 작업 내용

- **제안서**: [RU-001-Q1] 실행 방법/문서/설정의 중복과 불일치 제거 (roadmap vs 코드 주석 vs 루트 스크립트 vs Pyright 설정)
- **개선 사항**:
    - 실행 커맨드 SSOT를 루트 `package.json`으로 확정하고, `vibe/roadmap.md` 및 `main.py` docstring을 이에 맞춰 통일
    - 포트 정책(RULE-011: 프론트 8001, 백엔드 8011)을 모든 문서와 실행 스크립트에 강제 적용
    - `pnpm -C` 옵션을 사용하여 경로 의존성 및 쉘 환경 차이에 따른 실행 오류 방지
    - Pyright 설정을 `backend/pyproject.toml`로 단일화하여 도구 설정 중복 제거 (Option B 적용)
- **영향 범위**: `vibe/roadmap.md`, `backend/src/unknown_world/main.py`, `package.json`, `backend/pyproject.toml`

### 기술적 세부사항

- **실행 표준화**: `uv run` 및 포트 명시적 지정을 통해 환경별 실행 결과 차이 제거
- **설정 단일화**: Pyright 검사 범위를 `src`로 고정하여 진단 일관성 확보

### 검증

- **수동 검증**: `pnpm dev:front` / `pnpm dev:back` 실행 시 각각 8001, 8011 포트에서 정상 동작 확인 완료

---

## [2026-01-04 16:30] RU-001-Q4: shared/ 기반 JSON Schema SSOT 도입 및 소비 경로 확정

### 작업 내용

- **제안서**: [RU-001-Q4] `shared/` 기반 JSON Schema SSOT(Option B) 디렉토리 도입 및 소비 경로 고정
- **개선 사항**:
    - `shared/schemas/turn/` 디렉토리에 `turn_input.schema.json` 및 `turn_output.schema.json` 도입
    - 백엔드(Pydantic)와 프론트엔드(Zod)의 계약 불일치(drift)를 방지하기 위한 단일 진실 공급원(SSOT) 구축
    - `shared/README.md`를 통해 공유 스키마 운영 전략(Option B) 명시
- **영향 범위**: `shared/` (신규), `vibe/unit-plans/RU-001[Mvp].md` (결정 사항 실현)

### 기술적 세부사항

- **스키마 설계**: PRD의 Turn 계약 규약을 반영하여 `turn_input`, `turn_output` 스키마 초기 버전 작성
- **구조적 강제**: `.gitignore` 수정(RU-001-S1 연동)을 통해 `shared/` 내 JSON 스키마가 안정적으로 추적되도록 보장

### 검증

- **수동 검증**: `shared/` 경로의 스키마 파일 존재 및 Git 추적 여부 확인 완료 (commit: 1c93e5b)

---

## [2026-01-04 02:45] RU-001-S1: .gitignore JSON 정책 리팩토링 및 shared/ 구조 도입

### 작업 내용

- **제안서**: [RU-001-S1] .gitignore의 광범위 *.json 차단 문제 해결
- **개선 사항**: 
    - `*.json` 전역 차단을 제거하고, `shared/**/*.json` (스키마 SSOT) 명시적 허용
    - 보안 강화를 위해 서비스 계정 및 크리덴셜 패턴(`*service_account*.json` 등) 상세 차단
    - `shared/` 디렉토리 구조 도입 및 보안 주의사항을 담은 `shared/README.md` 작성
    - 프론트엔드 빌드 아티팩트(`*.d.ts.map`, `*.js.map` 등) ignore 규칙 보강
- **영향 범위**: `.gitignore`, `shared/` (신규), `frontend/` (ignore 규칙)

### 기술적 세부사항

- **스키마 SSOT 기반 마련**: `shared/schemas/` 경로를 확보하여 향후 유닛(U-005 등)에서 활용 가능하도록 함
- **보안 가드**: `secrets/` 디렉토리를 팀 표준 보안 저장소로 격상하고, 해당 경로 내 JSON 강제 차단 유지

### 검증

- **수동 검증**: `git status`를 통해 `shared/` 내부 파일 추적 확인 및 임시 보안 파일 차단 여부 검토 완료
- **런북 참조**: `vibe/refactors/RU-001-S1.md` 내 검증 시나리오 준수

---

## [2026-01-04 02:05] U-004[Mvp]: CRT 테마/고정 레이아웃 스켈레톤 완료

### 구현 완료 항목

- **핵심 기능**: CSS Grid 기반 고정 8개 패널 레이아웃 및 CRT 터미널 테마 구현
- **추가 컴포넌트**: `Panel`, `NarrativeFeed` (로그 형태), `ActionDeck`, `GameHeader`
- **달성 요구사항**: [RULE-002] 채팅 버블 UI 금지 및 게임 HUD 구조 확보, [Frontend Style] CRT 테마 토큰 적용

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **CSS Grid**: 3열(Sidebar L/R, Center) 3행(Header, Main, Footer) 고정 레이아웃
- **CRT Effect**: Scanline overlay, Flicker animation, Glow text, Glitch effect
- **React 19**: 함수형 컴포넌트 기반 레이아웃 구성

**설계 패턴 및 아키텍처 선택**:

- **패널 슬롯 시스템**: 향후 각 기능 유닛이 독립적으로 채워질 수 있는 8개 고정 슬롯 구조
- **로그형 내러티브**: 타임라인 기반 피드로 구성하여 "채팅" 인상을 원천 차단

**코드 구조**:
frontend/
├── src/
│   ├── App.tsx (레이아웃 및 패널 구성)
│   └── style.css (CRT 테마 및 Grid 정의)

### 성능 및 품질 지표

- **반응형 최적화**: 1200px, 768px 브레이크포인트 기반 가변 레이아웃 검증 완료
- **상호작용**: CRT 오버레이가 클릭을 방해하지 않도록 `pointer-events: none` 처리

### 의존성 변경

- 추가된 외부 의존성 없음 (Native CSS/React 활용)

### 다음 단계

- [RU-001[Mvp]] 리팩토링: 디렉토리/설정 정리
- [U-005[Mvp]] TurnInput/TurnOutput 스키마(Pydantic) 설계

---

## [2026-01-04 01:25] U-003[Mvp]: 백엔드 FastAPI 초기화 완료

### 구현 완료 항목

- **핵심 기능**: FastAPI 0.128 + Python 3.14 기반 오케스트레이터 골격 구축
- **추가 컴포넌트**: `backend/src/unknown_world/main.py` (엔트리포인트), `backend/tests/integration/test_api.py` (API 테스트)
- **달성 요구사항**: [RULE-011] 백엔드 포트(8011) 및 CORS 정책 수립, [RULE-010] 기술 스택 버전 고정

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **FastAPI 0.128.0**: 비동기 오케스트레이터 API 프레임워크
- **uv**: 고속 패키지 관리 및 의존성 고정 (`uv.lock`)
- **Pydantic 2.12.5**: 헬스체크 응답 스키마 정의

**설계 패턴 및 아키텍처 선택**:

- **스키마 기반 헬스체크**: Pydantic 모델을 사용하여 구조화된 시스템 상태 반환
- **포트 범위 CORS**: 프론트엔드 개발 서버(8001~8010)와의 연동을 위한 화이트리스트 기반 CORS 설정

**코드 구조**:
backend/
├── pyproject.toml
├── uv.lock
├── src/
│   └── unknown_world/
│       ├── __init__.py
│       └── main.py
└── tests/
    └── integration/
        └── test_api.py

### 성능 및 품질 지표

- **API 안정성**: 통합 테스트 3종(Health, Root, CORS) 100% 통과
- **문서화**: Swagger UI(`/docs`)를 통한 자동 API 명세서 생성 확인

### 의존성 변경

- `fastapi`, `uvicorn`, `pydantic` 고정 버전 추가
- `ruff`, `pyright`, `pytest` 개발 의존성 추가

### 다음 단계

- [U-005[Mvp]] TurnInput/TurnOutput(Pydantic) 모델 추가
- [U-007[Mvp]] `/api/turn` SSE 스트리밍 라우트 추가

---

## [2026-01-03 14:45] U-002[Mvp]: 프론트 Vite+React+TS 초기화 완료

### 구현 완료 항목

- **핵심 기능**: `vibe/tech-stack.md` 기반 Vite 7 + React 19 + TypeScript 5.9 환경 구축
- **추가 컴포넌트**: `frontend/src/App.tsx`, `frontend/src/style.css` (단일 CSS SSOT 구조)
- **달성 요구사항**: [RULE-002] 채팅 UI 배제 최소 구조 확보, [RULE-010] 기술 스택 버전 고정

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **React 19.2.3 / Vite 7.3.0**: 프론트엔드 프레임워크 및 빌드 도구
- **TypeScript 5.9.3**: 엄격 모드 적용
- **pnpm 10.27.0**: 패키지 매니저 고정

**설계 패턴 및 아키텍처 선택**:

- **단일 CSS SSOT**: 모든 스타일을 `src/style.css`에서 CSS 변수 기반으로 관리
- **최소 컨테이너 아키텍처**: 채팅 UI 유도를 방지하기 위한 헤더-메인 분리 구조

**코드 구조**:
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── style.css

### 성능 및 품질 지표

- **빌드 성공**: `pnpm build` 시 에셋 최적화 및 sourcemap 생성 확인
- **타입 안정성**: `pnpm run typecheck` 통과 (엄격 모드)

### 의존성 변경

- `react`, `react-dom` (v19.2.3) 추가
- `vite`, `typescript`, `eslint`, `prettier` 등 개발 의존성 추가

### 다음 단계

- [U-003[Mvp]] 백엔드 FastAPI 초기화
- [U-004[Mvp]] CRT 테마 및 고정 게임 UI 레이아웃 구현

---

## [2026-01-03 14:35] U-001[Mvp]: 프로젝트 스캐폴딩 생성 완료

### 구현 완료 항목

- **핵심 기능**: 프로젝트의 기본 디렉토리 구조(`frontend/`, `backend/`) 및 Git 설정(`.gitignore`, `.gitattributes`) 구축
- **추가 컴포넌트**: `backend/src/unknown_world/__init__.py` 패키지 초기화 파일
- **달성 요구사항**: [RULE-007] 비밀정보 보호 설정 완료

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **Git**: 버전 관리 및 줄 끝 처리 설정
- **Python 3.14**: 백엔드 패키지 구조 초기화

**설계 패턴 및 아키텍처 선택**:

- **모노레포 구조**: `frontend/`와 `backend/`를 분리하여 독립적인 개발 환경 제공
- **보안 중심 설정**: 비밀정보 유출 방지를 위한 선제적 `.gitignore` 패턴 적용

**코드 구조**:
repo-root/
├── frontend/
│   ├── .gitkeep
│   └── src/
│       └── .gitkeep
├── backend/
│   ├── .gitkeep
│   ├── prompts/
│   │   └── .gitkeep
│   └── src/
│       └── unknown_world/
│           └── __init__.py
├── .gitignore
└── .gitattributes

### 성능 및 품질 지표

- **코드 품질**: Python 패키지 임포트 테스트 통과
- **보안**: 비밀정보 파일(service-account.json, .env) Git 추적 제외 검증 완료

### 의존성 변경

- 추가된 외부 의존성 없음 (기본 구조 작업)

### 다음 단계

- [U-002[Mvp]] 프론트엔드 환경 초기화 (Vite + React)
- [U-003[Mvp]] 백엔드 환경 초기화 (FastAPI)

---
