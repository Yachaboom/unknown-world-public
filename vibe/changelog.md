# 로드맵 변경 이력

## 2026-01-04 - roadmap-update/http-streaming

### 변경 요약

기존 “SSE(EventSource) 기반 스트리밍” 전제를 제거하고, **HTTP Streaming (Fetch + POST) + NDJSON 이벤트 스트림**을 기본 스택으로 문서/유닛 계획서를 일괄 동기화했습니다.  
또한 `pnpm kill`이 `node.exe` 전체를 종료하는 문제를 해결하기 위한 MVP 유닛(U-027)을 백로그에 추가했습니다.

### 영향받은 문서

- ✏️ `vibe/prd.md`: 8.1/8.3/8.4의 스트리밍 스택을 HTTP Streaming으로 전환하고, NDJSON 이벤트 프로토콜(초안) 추가
- ✏️ `vibe/tech-stack.md`: Streaming/Reatime 항목을 HTTP Streaming으로 전환, 기술 선택 매트릭스/비교 섹션 동기화
- ✏️ `vibe/roadmap.md`: 진행률 재계산, U-027 추가, U-007/U-008 표기 변경, SSE 용어 정리
- ✏️ `vibe/architecture.md`: 백엔드 스트리밍 책임 표기 동기화
- ✏️ `.cursor/rules/20-backend-orchestrator.mdc`: 오케스트레이터 스트리밍 기본을 HTTP Streaming(Fetch+POST)로 전환
- ✏️ `vibe/unit-plans/*.md`: SSE 전제 제거 및 HTTP Streaming/NDJSON 기준으로 계획 동기화 (아래 목록 참조)

### 백로그 변경

**추가**:

- U-027[Mvp]: 개발 스크립트 - pnpm kill 포트 제한(8001~8020) - 다른 프로젝트 Node 프로세스 종료 방지

**수정**:

- U-007[Mvp]: `모의 Orchestrator + /api/turn SSE` → `모의 Orchestrator + /api/turn HTTP Streaming(POST)` - POST 입력(큰 TurnInput) 전제와 정합화
- U-008[Mvp]: `프론트 SSE 클라이언트` → `프론트 HTTP Streaming 클라이언트` - fetch+ReadableStream 기반 소비로 명확화
- RU-002[Mvp]: 이벤트/타입 통일 범위를 “SSE”에서 “NDJSON 스트림 이벤트”로 재정의
- U-024[Mvp]: `Action Queue SSE` → `Action Queue Streaming` - Autopilot 스트리밍도 동일 전제 유지
- CP-MVP-01 / CP-MMP-01: “SSE 스트리밍” 문구를 HTTP Streaming으로 교체(검증 기준 동일)

### 의존성 변경

- U-027[Mvp]: Depends=RU-001[Mvp] (포트 정책/kill:port SSOT 정리 이후 진행)

### 진행률 변화

- **MVP**: 33% → 19%
- **MMP**: 0% → 0%
- **전체**: 24% → 14%

> 사유: 완료 목록(unit-results 기준)과 진행률 표기가 불일치하여 **완료 유닛 7개 기준으로 재계산**했으며, 신규 유닛(U-027) 추가로 분모가 증가했습니다.

### 품질 검증 결과

- **품질 기준 문서**: U-006[Mvp]
- **신규 유닛 계획서**: 1개 생성(U-027) - 필수 섹션/완료 기준/의존성/리스크 포함 ✅
- **수정된 유닛 계획서**: 다수 - 섹션 누락 없이 “SSE → HTTP Streaming” 전제만 치환(상세도 유지/향상) ✅

### 리스크 변경

**신규**:

- R-004: 스트림 프로토콜(NDJSON) 파서/호환성 불안정 - 영향: Medium - 대응: RU-002에서 이벤트 타입/에러 처리/폴백 계약을 단일화

**해소(부분)**:

- R-???(암묵): EventSource(GET) 제약으로 TurnInput(큰 JSON) 전송이 어려운 설계 리스크 → HTTP Streaming(POST)로 구조적 해소

### 주의사항

- 과거 작성된 `unit-results/`, `unit-runbooks/` 일부에는 “SSE” 용어가 남아 있을 수 있습니다(역사적 기록). 이후 구현/런북 갱신 시점에 최신 스택 기준으로 정리하는 것을 권장합니다.

---

