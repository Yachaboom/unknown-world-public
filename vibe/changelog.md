# 로드맵 변경 이력

## 2026-01-10 - roadmap-update/nanobanana-mcp-expansion

### 변경 요약

`nanobanana mcp`를 개발용 이미지 에셋 제작 도구의 **공식 용어(SSOT)** 로 고정하고,
에셋 제작/관리 계획을 “단일 유닛”에서 **SSOT/placeholder/chrome/매니페스트/템플릿**까지 전방위로 확장했습니다.  
또한 `.gemini/rules/red-line.md`를 추가해 **보안/용어/dev-only** 레드라인을 명문화했습니다.

### 영향받은 문서

- 🆕 `.gemini/rules/red-line.md`: `nanobanana mcp` 용어 SSOT, dev-only 사용, 비밀정보/프롬프트 노출 금지 규칙 추가
- ✏️ `vibe/prd.md`: 9.7 “UI 이미지 에셋 파이프라인(nanobanana mcp, Dev-only)” 섹션 추가 및 요구사항 명문화
- ✏️ `vibe/roadmap.md`: U-030~U-034 추가, U-029 Depends 갱신, 진행률/마일스톤/리스크(R-005) 동기화
- ✏️ `vibe/commands.md`: 업데이트 항목의 표기를 `nanobanana mcp`로 통일
- ✏️ `vibe/ref/standard-guide.md`: Creative Autopilot 문맥에서 `nanobanana mcp` 용어 사용으로 정합화
- ✏️ `vibe/unit-plans/U-029[Mvp].md`: Depends=U-030,U-028,U-008로 갱신 및 템플릿/매니페스트 연동 힌트 추가
- 🆕 `vibe/unit-plans/U-030[Mvp].md`: 에셋 SSOT(폴더/네이밍/예산/폴백/라이선스)
- 🆕 `vibe/unit-plans/U-031[Mvp].md`: 상태 placeholder pack(Scene/오프라인/에러/차단)
- 🆕 `vibe/unit-plans/U-032[Mvp].md`: UI chrome pack(패널/카드 프레임/코너)
- 🆕 `vibe/unit-plans/U-033[Mvp].md`: 에셋 매니페스트 + QA 체크리스트
- 🆕 `vibe/unit-plans/U-034[Mvp].md`: 에셋 요청 스키마 + 프롬프트 템플릿(재현성)

### 백로그 변경

**추가**:

- U-030[Mvp]: nanobanana mcp 에셋 SSOT(폴더/네이밍/사이즈/폴백/라이선스) - 에셋 규칙 단일화/난립 방지
- U-031[Mvp]: nanobanana mcp 상태 Placeholder Pack - 실패/지연을 UX로 흡수
- U-032[Mvp]: nanobanana mcp UI Chrome Pack - “게임 HUD” 인상 강화(과잉 적용 금지)
- U-033[Mvp]: nanobanana mcp 에셋 매니페스트 + QA - 사용처/예산/가독성 관리
- U-034[Mvp]: nanobanana mcp 에셋 요청 스키마 + 템플릿 - 일관성/재현성 확보

**수정**:

- U-029[Mvp]: Depends 변경 (이전: U-028,U-008 → 이후: U-030,U-028,U-008) - SSOT 선행 강제

### 진행률 변화

- **MVP**: 31% (12/39) → 27% (12/44)
- **MMP**: 0% (0/13) → 0% (0/13)
- **전체**: 23% (12/52) → 21% (12/57)

> 사유: 신규 유닛 5개 추가로 분모가 증가했습니다(완료 유닛 수는 동일).

### 품질 검증 결과

- **품질 기준 문서**: CP-MVP-01
- **신규 유닛 계획서**: 5개 생성(U-030~U-034) - 필수 섹션/완료 기준/의존성/리스크/페어링 질문 포함 ✅
- **수정된 문서**: PRD/로드맵/기존 유닛(U-029) - 섹션 누락 없음, 용어 SSOT 정합화 ✅

### 리스크 변경

**신규**:

- R-005: 에셋 난립/용량 비대화/스타일 불일치 - 영향: Medium - 대응: SSOT + 매니페스트/QA + 예산 상한

### 주의사항

- `nanobanana mcp`는 개발용 에셋 제작 도구로만 사용하며, 런타임 의존/비밀정보 커밋은 레드라인 위반입니다.

---

## 2026-01-10 - roadmap-update/ui-readability-nanobanana-assets

### 변경 요약

데모 UI의 “작은 글씨” 가독성 이슈를 해결하기 위한 MVP 유닛(U-028)과, nanobanana mcp를 활용해 필요한 UI 이미지 에셋을 제작/반영하는 MVP 유닛(U-029)을 백로그에 추가했습니다.  
또한 진행률 산정을 `vibe/unit-results/` 기반으로 고정하여 로드맵 대시보드/마일스톤/현재 작업 표시를 현실 값으로 동기화했습니다.

### 영향받은 문서

- ✏️ `vibe/roadmap.md`: U-028/U-029 추가, M2 카운트 조정, 가독성 리스크(R-004) 추가, 진행률/현재 작업 갱신
- ✏️ `vibe/prd.md`: 9.4 접근성/입력에 UI 스케일/Readable 모드 요구 추가, 9.6에 nanobanana mcp UI 에셋 활용 계획 명시
- 🆕 `vibe/unit-plans/U-028[Mvp].md`: UI 가독성 패스 계획서 생성
- 🆕 `vibe/unit-plans/U-029[Mvp].md`: nanobanana mcp UI 에셋 패스 계획서 생성

### 백로그 변경

**추가**:

- U-028[Mvp]: UI 가독성 패스(폰트 스케일/효과 토글/대비) - 작은 글씨로 인한 데모 체감 저하 방지
- U-029[Mvp]: nanobanana mcp 에셋 패스(UI 아이콘/프레임/placeholder) - 게임 UI 인상 강화(폴백 포함)

### 의존성 변경

- U-029[Mvp]: Depends=U-028,U-008 (Readable/스케일 및 Agent Console 연동 기반 위에서 에셋 반영)

### 진행률 변화

- **MVP**: 57% (21/37) → 31% (12/39)
- **MMP**: 0% (0/13) → 0% (0/13)
- **전체**: 42% (21/50) → 23% (12/52)

> 사유: 로드맵의 진행률 표기가 `unit-results`(완료 증거)와 불일치하여, 완료 유닛을 `vibe/unit-results/`에 존재하는 U/RU/CP로 고정해 재계산했습니다. 또한 신규 유닛 2개 추가로 분모가 증가했습니다.

### 품질 검증 결과

- **품질 기준 문서**: CP-MVP-01
- **신규 유닛 계획서**: 2개 생성(U-028, U-029) - 필수 섹션/완료 기준/의존성/리스크/페어링 질문 포함 ✅
- **수정된 문서**: PRD/로드맵 - 기존 섹션 유지, 정보량 감소 없음 ✅

### 리스크 변경

**신규**:

- R-004: 작은 글씨/과한 CRT 효과로 가독성 저하 - 영향: Medium - 대응: UI 스케일/Readable 모드 + 최소 글자 크기 가이드

### 주의사항

- U-029는 “에셋 제작/반영” 유닛이므로, 실제 이미지 파일 생성/커밋은 해당 유닛 수행 시점에 진행합니다(현재는 계획/규칙만 반영).

---

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

