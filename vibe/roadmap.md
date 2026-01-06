# 📊 Unknown World 로드맵

**핵심 가치**: 구조화 출력(JSON Schema) 기반의 에이전트형 Game Master가 **상태(WorldState)·규칙(Rule Board)·경제(Economy)** 를 갱신하며, 플레이어가 **클릭·드래그·업로드(Scanner)** 로 조작 가능한 “채팅이 아닌 게임 UI”를 웹에서 즉시 플레이하게 한다.

## 진행 현황

**전체**: 11/50 (22%) | **MVP**: 11/37 (29%) | **MMP**: 0/13 (0%)

**예상 완료(가정)**: MVP D-8 | MMP D-24  
_가정: 1인 기준 / 1일 순개발 4h / 유닛 평균 45분 / 버퍼 30% 포함_

**진행 중**: 없음 / **최근 완료**: [RU-002-Q4](refactors/RU-002-Q4.md) (2026-01-07)

**블로커**: 없음

## 맥락 요약 (SSOT 근거)

### 프로젝트 핵심 가치 (1문장)

- “프롬프트 래퍼가 아닌” **상태 기반 게임 시스템**을, **구조화 출력 + 검증/복구 + 게임형 UI**로 증명한다.  
  (근거: `vibe/prd.md`, `.cursor/rules/00-core-critical.mdc`)

### 반드시 지켜야 할 제약 (TOP 3)

1. **Prompt-only wrapper / Generic chatbot 금지**: TurnInput/TurnOutput 계약 + State/Orchestrator/Artifacts 필수 (RULE-001/002)
2. **구조화 출력 + 이중 검증 + Repair loop 필수**: Pydantic+Zod, 실패 시 안전 폴백, Hard Gate 준수 (RULE-003/004)
3. **경제/보안/언어/좌표/버전 고정**: 잔액 음수 금지(ledger), Vertex 서비스계정(BYOK 금지), ko/en 혼합 금지, bbox 0~1000 규약, tech-stack 버전 고정 (RULE-005/006/007/009/010)

### 기술적 리스크 (TOP 3)

| ID    | 내용                                                                   | 영향 | 확률 | 대응(요약)                                                                            |
| ----- | ---------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------------------------------------------- |
| R-001 | LLM 출력 불안정(스키마/의미 불일치)로 UI/상태/경제 인바리언트 붕괴     | High | 35%  | Structured Outputs + 서버/클라 검증 + Repair loop + Safe fallback + Mock 모드         |
| R-002 | 지연/비용(특히 이미지/Thinking)으로 데모 체감 저하(TTFB>2s, 비용 폭증) | High | 30%  | HTTP Streaming 단계/배지 우선 스트리밍 + 경제(예상비용/대안) + Lazy 이미지 + 정책 프리셋 |
| R-003 | “채팅 앱처럼 보임”으로 심사/사용자 오해                                | High | 25%  | 고정 HUD(액션덱/인벤토리DnD/씬캔버스/에이전트콘솔) + 데모프로필/리셋 + 10분 데모 루프 |

### MVP 완료 기준 (Definition of Done)

- **Schema OK**: TurnOutput JSON이 스키마를 통과(서버 Pydantic + 클라 Zod)
- **Economy OK**: 예상 비용 노출, ledger 일관성, 잔액 음수 불가
- **Safety OK**: 차단/실패 시 명시 + 안전한 대체 결과(텍스트-only 등) 제공
- **Consistency OK**: 언어 정책(ko/en 혼합 금지), bbox 규약(0~1000, [ymin,xmin,ymax,xmax]) 준수
- **Demo OK(10분 루프)**: 드래그→클릭→(스캐너)업로드→룰 변형/퀘스트→오토파일럿→엔딩 리포트까지 반복 가능(데모프로필+리셋 포함)

---

## 마일스톤

| 단계 | ID        | 이름                                   | 목표일     | 진행률 | 상태 |
| ---- | --------- | -------------------------------------- | ---------- | ------ | ---- |
| MVP  | M1        | 스캐폴딩 + Turn 계약 + HTTP Streaming  | 2026-01-05 | 8/11   | 🚧   |
| MVP  | CP-MVP-01 | **✓ 체크포인트: 스트리밍/스키마/폴백** | 2026-01-05 | -      | ⏸️   |
| MVP  | M2        | 핵심 UI(액션덱/핫스팟/DnD)             | 2026-01-10 | 0/10   | ⏸️   |
| MVP  | CP-MVP-02 | **✓ 체크포인트: 클릭+드래그 데모**     | 2026-01-10 | -      | ⏸️   |
| MVP  | M3        | 세션/데모프로필 + 실모델 + 복구        | 2026-01-15 | 0/10   | ⏸️   |
| MVP  | CP-MVP-03 | **✓ 체크포인트: 10분 데모 루프**       | 2026-01-15 | -      | ⏸️   |
| MMP  | M5        | 배포/스토리지/관측 강화                | 2026-02-01 | 0/7    | ⏸️   |
| MMP  | CP-MMP-01 | **✓ 체크포인트: 배포/관측 게이트**     | 2026-02-01 | -      | ⏸️   |
| MMP  | M6        | 장기 세션/회귀 자동화/보안 하드닝      | 2026-02-12 | 0/6    | ⏸️   |
| MMP  | CP-MMP-02 | **✓ 체크포인트: 시나리오 회귀 100%**   | 2026-02-12 | -      | ⏸️   |

## 핵심 기능 (MVP)

### Turn 계약 + 오케스트레이터 스트리밍

- **완료 기준**: HTTP Streaming(POST)로 Queue/Badges/Auto-repair를 스트리밍하고, 최종 TurnOutput이 스키마/비즈니스 룰을 통과
- **책임 Unit**: U-005 ~ CP-MVP-01, U-016 ~ U-018
- **상태**: 🚧

### “채팅이 아닌” 고정 게임 UI + 핵심 인터랙션

- **완료 기준**: Action Deck / Inventory(DnD) / Scene Canvas(Hotspots) / Economy HUD / Agent Console이 상시 노출되고, 클릭+드래그가 동작
- **책임 Unit**: U-004, U-009 ~ CP-MVP-02, U-014
- **상태**: ⏸️

### 데모 반복 가능(데모프로필/리셋/세이브) + 엔딩 아티팩트

- **완료 기준**: 데모프로필 3종 + 즉시 시작/리셋 + SaveGame + 엔딩 리포트 아티팩트 생성
- **책임 Unit**: U-015, U-025
- **상태**: ⏸️

### 멀티모달(선택적 이미지 + Scanner 업로드)

- **완료 기준**: 텍스트 우선 + (조건부) 이미지 생성/표시, Scanner 업로드가 “아이템/단서”로 변환되어 인벤토리에 반영
- **책임 Unit**: U-019 ~ U-022
- **상태**: ⏸️

### Autopilot + 리플레이/시나리오 하네스(데모 회귀)

- **완료 기준**: Manual/Assist/Autopilot 모드가 보이며, seed+actions 기반 리플레이로 Hard Gate 인바리언트를 점검 가능
- **책임 Unit**: U-023 ~ U-026
- **상태**: ⏸️

## 리스크

| ID    | 내용                                | 영향 | 확률 | 대응                                   |
| ----- | ----------------------------------- | ---- | ---- | -------------------------------------- |
| R-001 | 스키마/의미 불일치로 Hard Gate 실패 | High | 35%  | Repair loop + Safe fallback + Mock     |
| R-002 | 이미지/Thinking로 지연/비용 폭발    | High | 30%  | Economy 정책 + Lazy 이미지 + 티어링    |
| R-003 | UI가 채팅처럼 보여 제출/데모 실패   | High | 25%  | 고정 HUD + DnD/핫스팟/스캐너/콘솔 강조 |

## 메트릭

| 지표                       | 현재 | 목표        |
| -------------------------- | ---- | ----------- |
| Streaming TTFB             | -    | < 2s        |
| API 응답(p95, 텍스트)      | -    | < 200ms     |
| 이미지 생성 시간(p95)      | -    | < 12s(선택) |
| Hard Gate 통과율(리플레이) | -    | 100%        |

**기술 부채**: 0h / 한도 8h

---

### 작업 백로그

**범례**: ⏸️ 대기 | 🚧 진행중 | ✅ 완료 | ❌ 차단 | ⚡ Critical Path

### MVP
ID=[RU-002[Mvp]](unit-plans/RU-002[Mvp].md) | 리팩토링: validation/폴백/이벤트 타입 통일 | Depends=U-008 | ⏸️
ID=[CP-MVP-01](unit-plans/CP-MVP-01.md) | **체크포인트: 스트리밍/스키마/폴백** | Depends=RU-002 | ⏸️

ID=[U-009[Mvp]](unit-plans/U-009[Mvp].md) | ⚡Action Deck(카드+비용/대안) | Depends=U-004,U-008 | ⏸️
ID=[U-010[Mvp]](unit-plans/U-010[Mvp].md) | ⚡Scene Canvas + Hotspot Overlay(0~1000 bbox) | Depends=U-004,U-008 | ⏸️
ID=[U-011[Mvp]](unit-plans/U-011[Mvp].md) | ⚡Inventory 패널(DnD) 기본 | Depends=U-004 | ⏸️
ID=[U-012[Mvp]](unit-plans/U-012[Mvp].md) | ⚡DnD 드롭(아이템→핫스팟) TurnInput 이벤트 | Depends=U-010,U-011,U-008 | ⏸️
ID=[RU-003[Mvp]](unit-plans/RU-003[Mvp].md) | 리팩토링: UI 상태 슬라이스/경계 정리 | Depends=U-012 | ⏸️
ID=[CP-MVP-02](unit-plans/CP-MVP-02.md) | **체크포인트: 클릭+드래그 데모** | Depends=RU-003 | ⏸️

ID=[U-013[Mvp]](unit-plans/U-013[Mvp].md) | Quest + Rule Board/Timeline 패널 | Depends=U-004,U-008 | ⏸️
ID=[U-014[Mvp]](unit-plans/U-014[Mvp].md) | ⚡Economy HUD + Ledger(프론트) | Depends=U-009,U-008 | ⏸️
ID=[U-015[Mvp]](unit-plans/U-015[Mvp].md) | ⚡SaveGame(local) + Reset + Demo Profiles(3종) | Depends=U-014,U-013 | ⏸️
ID=[RU-004[Mvp]](unit-plans/RU-004[Mvp].md) | 리팩토링: SaveGame/초기상태/데모 프로필 정리 | Depends=U-015 | ⏸️

ID=[U-016[Mvp]](unit-plans/U-016[Mvp].md) | ⚡Vertex 인증 + google-genai 클라이언트 + 모델 라벨 고정 | Depends=U-003 | ⏸️
ID=[U-017[Mvp]](unit-plans/U-017[Mvp].md) | ⚡Structured Output TurnOutput 생성 + Pydantic 검증 | Depends=U-016,U-005 | ⏸️
ID=[U-018[Mvp]](unit-plans/U-018[Mvp].md) | ⚡비즈니스 룰 검증 + Repair loop + 안전 폴백 | Depends=U-017 | ⏸️
ID=[RU-005[Mvp]](unit-plans/RU-005[Mvp].md) | 리팩토링: orchestrator pipeline stages 정리 | Depends=U-018 | ⏸️

ID=[U-019[Mvp]](unit-plans/U-019[Mvp].md) | ⚡이미지 생성 엔드포인트/잡(조건부) | Depends=U-016,U-017 | ⏸️
ID=[U-020[Mvp]](unit-plans/U-020[Mvp].md) | ⚡프론트 이미지 Lazy Render(placeholder/폴백) | Depends=U-010,U-019 | ⏸️
ID=[U-021[Mvp]](unit-plans/U-021[Mvp].md) | 이미지 이해(Scanner) 백엔드 엔드포인트 | Depends=U-016 | ⏸️
ID=[U-022[Mvp]](unit-plans/U-022[Mvp].md) | ⚡Scanner 슬롯 UI + 업로드→아이템화 반영 | Depends=U-011,U-021 | ⏸️
ID=[RU-006[Mvp]](unit-plans/RU-006[Mvp].md) | 리팩토링: media/artifacts 스토리지 추상화 | Depends=U-022 | ⏸️

ID=[U-023[Mvp]](unit-plans/U-023[Mvp].md) | ⚡Autopilot 모드 토글 + Goal 입력 + Plan/Queue UI | Depends=U-008,U-013 | ⏸️
ID=[U-024[Mvp]](unit-plans/U-024[Mvp].md) | ⚡Backend Autopilot(제한 스텝) + Action Queue Streaming | Depends=U-018,U-023 | ⏸️
ID=[U-025[Mvp]](unit-plans/U-025[Mvp].md) | 엔딩 리포트 아티팩트 생성(요약/타임라인/결산) | Depends=U-018,U-015 | ⏸️
ID=[U-026[Mvp]](unit-plans/U-026[Mvp].md) | 리플레이/시나리오 하네스(저장+수동 러너) | Depends=U-024,U-025 | ⏸️
ID=[RU-007[Mvp]](unit-plans/RU-007[Mvp].md) | 리팩토링: artifacts 버전/경로/링크 정리 | Depends=U-026 | ⏸️
ID=[CP-MVP-03](unit-plans/CP-MVP-03.md) | **체크포인트: 10분 데모 루프** | Depends=RU-007 | ⏸️

### MMP

ID=[U-100[Mmp]](unit-plans/U-100[Mmp].md) | ⚡Dockerfile/로컬 실행(프론트/백엔드) | Depends=CP-MVP-03 | ⏸️
ID=[U-101[Mmp]](unit-plans/U-101[Mmp].md) | ⚡Cloud Run 배포 구성 + env/secret 가이드 | Depends=U-100 | ⏸️
ID=[U-102[Mmp]](unit-plans/U-102[Mmp].md) | ⚡GCS 스토리지 어댑터(이미지/아티팩트) | Depends=U-100 | ⏸️
ID=[U-103[Mmp]](unit-plans/U-103[Mmp].md) | 이미지 편집(멀티턴, REF 유지) | Depends=U-019,U-102 | ⏸️
ID=[U-104[Mmp]](unit-plans/U-104[Mmp].md) | 장기 세션 메모리 요약/핀 추천 고도화 | Depends=U-025 | ⏸️
ID=[U-105[Mmp]](unit-plans/U-105[Mmp].md) | ⚡Scenario Library(5) + 자동 리플레이 확장 | Depends=U-026 | ⏸️
ID=[RU-010[Mmp]](unit-plans/RU-010[Mmp].md) | 리팩토링: 스키마/상수 SSOT 강화 + 파일 분리 | Depends=U-105 | ⏸️
ID=[CP-MMP-01](unit-plans/CP-MMP-01.md) | **체크포인트: 배포/관측 게이트** | Depends=U-101,RU-010 | ⏸️

ID=[U-106[Mmp]](unit-plans/U-106[Mmp].md) | 관측 지표/대시보드(Agent Console 메트릭) 고도화 | Depends=CP-MMP-01 | ⏸️
ID=[U-107[Mmp]](unit-plans/U-107[Mmp].md) | 접근성/단축키/모바일 UX 개선 | Depends=U-106 | ⏸️
ID=[U-108[Mmp]](unit-plans/U-108[Mmp].md) | ⚡보안 하드닝(인젝션 케이스/secret scan) | Depends=CP-MMP-01 | ⏸️
ID=[RU-011[Mmp]](unit-plans/RU-011[Mmp].md) | 리팩토링: Autopilot/Replay 모듈 정리 | Depends=U-108 | ⏸️
ID=[CP-MMP-02](unit-plans/CP-MMP-02.md) | **체크포인트: 시나리오 회귀 100%** | Depends=RU-011,U-107 | ⏸️

### 완료

- ✅ [U-027[Mvp]](unit-results/U-027[Mvp].md): 개발 스크립트: pnpm kill 포트 제한(8001~8020) (2026-01-05)
- ✅ [U-008[Mvp]](unit-results/U-008[Mvp].md): ⚡프론트 HTTP Streaming 클라이언트 + Agent Console/배지 (2026-01-05)
- ✅ [U-007[Mvp]](unit-results/U-007[Mvp].md): ⚡모의 Orchestrator + /api/turn HTTP Streaming(POST) (2026-01-04)
- ✅ [U-006[Mvp]](unit-results/U-006[Mvp].md): ⚡TurnInput/TurnOutput 스키마(Zod) (2026-01-04)
- ✅ [U-005[Mvp]](unit-results/U-005[Mvp].md): ⚡TurnInput/TurnOutput 스키마(Pydantic) (2026-01-04)
- ✅ [RU-001[Mvp]](unit-results/RU-001[Mvp].md): 리팩토링: 디렉토리/설정 정리 (2026-01-04)
- ✅ [U-001[Mvp]](unit-results/U-001[Mvp].md): 프로젝트 스캐폴딩 생성 (2026-01-03)
- ✅ [U-002[Mvp]](unit-results/U-002[Mvp].md): 프론트 Vite+React+TS 초기화 (2026-01-03)
- ✅ [U-003[Mvp]](unit-results/U-003[Mvp].md): 백엔드 FastAPI 초기화 (2026-01-04)
- ✅ [U-004[Mvp]](unit-results/U-004[Mvp].md): CRT 테마/고정 레이아웃 스켈레톤 (2026-01-04)

---

## 빠른 실행

**현재 작업**: [U-007[Mvp]](unit-plans/U-007[Mvp].md) - 모의 Orchestrator + /api/turn HTTP Streaming(POST)

```bash
# Frontend (RULE-011: 8001~8010)
pnpm -C frontend install
pnpm -C frontend dev
# → http://localhost:8001 에서 접근 가능
# ⚠️ 포트 충돌 시 (strictPort: true로 fail-fast):
#    pnpm -C frontend dev --port 8002  (8002~8010 중 선택)

# Backend (uv 기반, RULE-011: 8011~8020)
cd backend
uv sync
uv run uvicorn unknown_world.main:app --reload --port 8011
# → http://localhost:8011/health 로 확인
# ⚠️ 포트 충돌 시: --port 8012 (8012~8020 중 선택)

# 전체 포트 정리 (8001~8020)
pnpm kill
# → RULE-011에 정의된 포트 범위(8001~8020)의 프로세스만 안전하게 정리합니다.
```

**완료 확인**:

- [ ] 브라우저에서 고정 게임 UI 레이아웃이 렌더된다(채팅 버블 없음)
- [ ] HTTP Streaming 연결이 되고 Agent Console에 단계/배지가 보인다(프롬프트 원문 노출 없음)

---

## 일일 스탠드업 (YYYY-MM-DD)

**완료**: [{ID}](unit-plans/{ID}.md) - {설명}

**진행중**: [{ID}](unit-plans/{ID}.md) - {목표}

**블로커**: 없음 / ❌ [{ID}](unit-plans/{ID}.md): {사유} → {대응}

---
