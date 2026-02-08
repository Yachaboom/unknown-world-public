# 📊 Unknown World 로드맵

**핵심 가치**: 구조화 출력(JSON Schema) 기반의 에이전트형 Game Master가 **상태(WorldState)·규칙(Rule Board)·경제(Economy)** 를 갱신하며, 플레이어가 **클릭·드래그·업로드(Scanner)** 로 조작 가능한 "채팅이 아닌 게임 UI"를 웹에서 즉시 플레이하게 한다.

## 진행 현황

**전체**: 117/145 (80.7%) | **MVP**: 117/124 (94.4%) | **MMP**: 0/21 (0%)

**예상 완료(가정)**: MVP D-2 | MMP(M5 제출): D-2 | MMP(M6 후속): D-7+
_가정: 1인 기준 / 1일 순개발 4h / 유닛 평균 45분 / 버퍼 30% 포함_
_진행률 산정: `vibe/unit-results/` 또는 `vibe/progress.md`에 존재하는 완료 유닛(U/RU/CP) 기준._

**진행 중(현재 포커스)**: [U-117[Mvp]](unit-plans/U-117[Mvp].md) 인벤토리 드래그 영역 Row 확장 / **최근 완료**: [U-114[Mvp]](vibe/unit-results/U-114.md) (2026-02-08)

**블로커**: 없음 | **마감**: Devpost 2026-02-09 5:00 PM PST (**KST 2/10 화 10:00 AM, D-2**)

**메모**:
- 취소 UX(Cancel 버튼) 미완성 → 정책 SSOT: `vibe/refactors/RU-003-S1.md`
- U-081 skip(U-077에 흡수). U-116으로 SaveGame 완전 제거 → U-098/U-113 의존성 수정 완료.
- **[2026-02-08 유닛 병합]** U-098→U-116 흡수, U-118→U-117 흡수, U-025+U-026 통합, RU-007→MMP 이동. 상세: `vibe/changelog.md`
- **[2026-02-08 MMP 제출 최적화]** M5를 "해커톤 제출 준비"로 재편. U-100+U-101→U-120 흡수. U-119(WIG 폴리시), U-121(제출 문서), U-122(데모 영상), CP-SUB-01 추가. 상세: `vibe/changelog.md`

## 맥락 요약 (SSOT 근거)

### 프로젝트 핵심 가치 (1문장)

- "프롬프트 래퍼가 아닌" **상태 기반 게임 시스템**을, **구조화 출력 + 검증/복구 + 게임형 UI**로 증명한다.  
  (근거: `vibe/prd.md`, `.cursor/rules/00-core-critical.mdc`)

### 반드시 지켜야 할 제약 (TOP 3)

1. **Prompt-only wrapper / Generic chatbot 금지**: TurnInput/TurnOutput 계약 + State/Orchestrator/Artifacts 필수 (RULE-001/002)
2. **구조화 출력 + 이중 검증 + Repair loop 필수**: Pydantic+Zod, 실패 시 안전 폴백, Hard Gate 준수 (RULE-003/004)
3. **경제/보안/언어/좌표/버전 고정**: 잔액 음수 금지(거래 장부), **API 키 인증 기본**(BYOK 금지), ko/en 혼합 금지, bbox 0~1000 규약, tech-stack 버전 고정 (RULE-005/006/007/009/010)

### 기술적 리스크 (TOP 3)

| ID    | 내용                                                                   | 영향 | 확률 | 대응(요약)                                                                            |
| ----- | ---------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------------------------------------------- |
| R-001 | LLM 출력 불안정(스키마/의미 불일치)로 UI/상태/경제 인바리언트 붕괴     | High | 35%  | Structured Outputs + 서버/클라 검증 + Repair loop + Safe fallback + Mock 모드         |
| R-002 | 지연/비용(특히 이미지/Thinking)으로 데모 체감 저하(TTFB>2s, 비용 폭증) | High | 30%  | HTTP Streaming 단계/배지 우선 스트리밍 + 경제(예상비용/대안) + Lazy 이미지 + 정책 프리셋 |
| R-003 | "채팅 앱처럼 보임"으로 심사/사용자 오해                                | High | 25%  | 고정 HUD(액션덱/인벤토리DnD/씬캔버스/에이전트콘솔) + 데모프로필/리셋 + 10분 데모 루프 |

### MVP 완료 기준 (Definition of Done)

- **Schema OK**: TurnOutput JSON이 스키마를 통과(서버 Pydantic + 클라 Zod)
- **Economy OK**: 예상 비용 노출, 거래 장부(ledger) 일관성, 잔액 음수 불가
- **Safety OK**: 차단/실패 시 명시 + 안전한 대체 결과(텍스트-only 등) 제공
- **Consistency OK**: 언어 정책(ko/en 혼합 금지), bbox 규약(0~1000, [ymin,xmin,ymax,xmax]) 준수
- **Demo OK(10분 루프)**: 드래그→클릭→(스캐너)업로드→룰 변형/퀘스트→오토파일럿→엔딩 리포트까지 반복 가능(데모프로필+리셋 포함)

---

## 마일스톤

| 단계 | ID        | 이름                                   | 진행률 | 상태 |
| ---- | --------- | -------------------------------------- | ------ | ---- |
| MVP  | M1        | 스캐폴딩 + Turn 계약 + HTTP Streaming  | 11/11  | ✅   |
| MVP  | CP-MVP-01 | **✓ 체크포인트: 스트리밍/스키마/폴백** | -      | ✅   |
| MVP  | M2        | 핵심 UI(액션덱/핫스팟/DnD) + 가독성/에셋 | 11/22  | 🚧   |
| MVP  | CP-MVP-02 | **✓ 체크포인트: 클릭+드래그 데모**     | -      | ✅   |
| MVP  | M3        | 세션/데모프로필 + 실모델 + 복구        | 10/10  | ✅   |
| MVP  | CP-MVP-04~07 | ✓ 실모델/이미지/Scanner/real모드 게이트 | -   | ✅   |
| MVP  | CP-MVP-03 | **체크포인트: 10분 데모 루프**          | -      | ⏸️   |
| MMP  | M5        | ⚡해커톤 제출 준비 (Submission Sprint) | 0/5    | ⏸️   |
| MMP  | CP-SUB-01 | **체크포인트: 해커톤 제출 완료**       | -      | ⏸️   |
| MMP  | M6        | 품질 강화/후속 (Post-Submission)       | 0/16   | ⏸️   |

## 핵심 기능 (MVP)

### Turn 계약 + 오케스트레이터 스트리밍

- **완료 기준**: HTTP Streaming(POST)로 Queue/Badges/Auto-repair를 스트리밍하고, 최종 TurnOutput이 스키마/비즈니스 룰을 통과
- **상태**: ✅ (리팩토링 완료)

### "채팅이 아닌" 고정 게임 UI + 핵심 인터랙션

- **완료 기준**: Action Deck / Inventory(DnD Row) / Scene Canvas(Hotspots) / Economy HUD / Agent Console 상시 노출, 클릭+드래그 동작, 가독성 확보 _(✅ 레이아웃/스크롤/Row 전환/아이콘/소비 로직/디자인 개선 완료)_
- **잔여**: Agent Console 배지 접기(U-114), 핫스팟 원형 1~3개(U-115), 드래그+온보딩(U-117), 입력 잠금(U-087), 이미지 최적화(U-084)
- **상태**: 🚧

### 데모 반복 가능(데모프로필/리셋) + 엔딩 아티팩트

- **완료 기준**: 데모프로필 3종 + 리셋 + 새로고침 시 프로필 선택(SaveGame 제거: U-116) + 엔딩 리포트 + 목표 시스템
- **잔여**: SaveGame 제거+프로필 정리(U-116), 거래 장부 버그(U-099)
- **상태**: 🚧

### 게임 경제/재화 시스템

- **완료 기준**: 예상 비용 노출, 잔액 부족 시 대안, 재화 획득 다양화, 거래 장부 i18n 정합
- **잔여**: U-099
- **상태**: 🚧

### 멀티모달(선택적 이미지 + Scanner 업로드)

- **완료 기준**: 텍스트 우선 + 조건부 이미지, Scanner→아이템화, 정밀분석(Agentic Vision), 지연 흡수/티어링 _(✅ 파이프라인 통합/API키 전환/rembg 제거/아이콘/연결성 완료)_
- **잔여**: 이미지 픽셀 스타일(U-084 공유)
- **상태**: 🚧

### Autopilot + 리플레이/엔딩(데모 회귀)

- **완료 기준**: Manual/Assist/Autopilot 모드, 엔딩 리포트, seed+actions 리플레이로 Hard Gate 점검
- **잔여**: U-023, U-024, U-025(+U-026 흡수)
- **상태**: ⏸️

## 리스크 (활성만)

_해소 완료: R-005~R-008, R-010~R-018, R-020~R-022 (대응 유닛 완료). 이력 → `vibe/changelog.md`_

| ID    | 내용                                   | 영향 | 확률 | 대응                                      |
| ----- | -------------------------------------- | ---- | ---- | ----------------------------------------- |
| R-001 | 스키마/의미 불일치로 Hard Gate 실패    | High | 35%  | Repair loop + Safe fallback + Mock        |
| R-002 | 이미지/Thinking로 지연/비용 폭발      | High | 30%  | Economy 정책 + Lazy 이미지 + 티어링       |
| R-003 | UI가 채팅처럼 보여 제출/데모 실패      | High | 25%  | 고정 HUD + DnD/핫스팟/스캐너/콘솔 강조    |
| R-004 | CRT 튜닝 ↔ 가독성 균형 붕괴           | Med  | 25%  | 중요도 기반 효과 분리 + 대비 가이드       |
| R-009 | Agentic Vision 비용/지연 악화          | Med  | 20%  | Economy 게이트 + 텍스트 폴백              |
| R-019 | 처리 중 입력 허용 → 허위 액션/경합     | Med  | 35%  | U-087 입력 잠금 + U-086 텍스트 우선       |
| R-023 | 리셋 시 세션 상태 잔재                 | Med  | 40%  | U-116 완전 리셋 + U-099 ledger 정합       |
| R-024 | 새로고침 시 진행 전량 소실(SaveGame 제거) | Med | 30% | MMP U-113 세션 영속성 재설계              |
| R-025 | 배포 환경 다운 → 심사 불가               | High | 20% | U-120 min-instances=1 + 모니터링          |
| R-026 | 영문 모드 UI/내러티브 품질 부족          | Med  | 30% | U-099 i18n 수정 + U-119 WIG 폴리시       |

## Devpost 제출 요건 매핑 (Gemini 3 Hackathon)

_마감: 2026-02-09 5:00 PM PST | 심사: Technical Execution(40%), Innovation/Wow(30%), Impact(20%), Presentation(10%)_

| 제출 요건                                | 상태 | 담당 유닛 | 비고                                       |
| ---------------------------------------- | ---- | --------- | ------------------------------------------ |
| 공개 데모 링크 (Public Project Link)     | ⏸️   | U-120     | 로그인/결제 없이 접근 가능                 |
| 공개 코드 저장소 (Public Code Repo)      | ⏸️   | U-121     | GitHub Public + README                     |
| Gemini Integration 텍스트 (~200 words)   | ⏸️   | U-121     | 영문 필수                                  |
| 데모 영상 (3분 이내, 영어/영어자막)      | ⏸️   | U-122     | YouTube/Vimeo 공개                         |
| 영어 지원 (English language)             | 🚧   | U-099     | en-US i18n 정합 수정 중                    |
| 프로젝트 기능 동작 (Functionality)       | 🚧   | MVP 잔여  | 핵심 플로우 동작 중, 데모 프로필 즉시 시작 |
| 아키텍처 다이어그램 (심사 가점)          | ⏸️   | U-121     | Mermaid 기반                               |
| UI 폴리시 (Innovation/Wow Factor 30%)    | ⏸️   | U-119     | WIG 스킬 기반 종합 점검                    |

## 메트릭

| 지표              | 현재 | 목표        |
| ----------------- | ---- | ----------- |
| Streaming TTFB    | -    | < 2s        |
| Hard Gate 통과율  | -    | 100%        |

**기술 부채**: 0h / 한도 8h  | SSOT: `vibe/debt-log.md`

---

### 작업 백로그

**범례**: ⏸️ 대기 | 🚧 진행중 | ✅ 완료 | ❌ 차단 | ⚡ Critical Path

### MVP (8개)
ID=[U-117[Mvp]](unit-plans/U-117[Mvp].md) | 인벤토리 드래그 영역 Row 확장 + 온보딩 팝업 제거 **(U-118 흡수)** | Depends=U-088,U-074 | ⏸️
ID=[U-087[Mvp]](unit-plans/U-087[Mvp].md) | 턴 처리 중 모든 사용자 입력 잠금 | Depends=U-070,U-071 | ⏸️
ID=[U-084[Mvp]](unit-plans/U-084[Mvp].md) | 이미지 픽셀 스타일 + 사이즈 축소 + Scene 높이 조정 | Depends=U-066,U-049,U-085 | ⏸️
ID=[U-115[Mvp]](unit-plans/U-115[Mvp].md) | 핫스팟 컴팩트 원형 1~3개 + 우선순위/겹침 방지 | Depends=U-090,U-087,U-116 | ⏸️
ID=[U-023[Mvp]](unit-plans/U-023[Mvp].md) | ⚡Autopilot 모드 토글 + Goal 입력 + Plan/Queue UI | Depends=U-008,U-013 | ⏸️
ID=[U-024[Mvp]](unit-plans/U-024[Mvp].md) | ⚡Backend Autopilot(제한 스텝) + Action Queue Streaming | Depends=U-018,U-023 | ⏸️
ID=[U-025[Mvp]](unit-plans/U-025[Mvp].md) | 엔딩 리포트 + 리플레이/시나리오 하네스 **(U-026 흡수)** | Depends=U-018,U-024 | ⏸️
ID=[CP-MVP-03](unit-plans/CP-MVP-03.md) | **체크포인트: 10분 데모 루프** | Depends=U-025,U-056,U-057,U-058,U-061 | ⏸️

### MMP - M5: 해커톤 제출 준비 (5개)

_Devpost 마감: 2026-02-09 5:00 PM PST. 제출 요건 매핑 → 아래 "제출 요건 매핑" 참조._

ID=[U-119[Mmp]](unit-plans/U-119[Mmp].md) | ⚡Frontend Layout 전체 다듬기 (WIG 기반 폴리시) | Depends=None | ⏸️
ID=[U-120[Mmp]](unit-plans/U-120[Mmp].md) | ⚡제출용 배포 + 공개 데모 URL **(U-100+U-101 흡수)** | Depends=None | ⏸️
ID=[U-121[Mmp]](unit-plans/U-121[Mmp].md) | ⚡제출 문서 패키지 (README + 아키텍처 + Write-up) | Depends=U-120 | ⏸️
ID=[U-122[Mmp]](unit-plans/U-122[Mmp].md) | ⚡데모 영상 제작 (3분, 영어 자막) | Depends=U-119,U-120 | ⏸️
ID=[CP-SUB-01](unit-plans/CP-SUB-01.md) | **⚡체크포인트: 해커톤 제출 완료** | Depends=U-119,U-120,U-121,U-122 | ⏸️

### MMP - M6: 품질 강화/후속 (16개)

_Post-Submission. U-100/U-101은 U-120에 흡수되어 skip._

ID=[U-102[Mmp]](unit-plans/U-102[Mmp].md) | ⚡GCS 스토리지 어댑터 | Depends=U-120 | ⏸️
ID=[U-103[Mmp]](unit-plans/U-103[Mmp].md) | 이미지 편집(멀티턴, REF 유지) | Depends=U-019,U-102 | ⏸️
ID=[U-109[Mmp]](unit-plans/U-109[Mmp].md) | Agentic Vision 자동 실행 확장(U-076 재사용) | Depends=U-019,U-020,RU-005,U-076 | ⏸️
ID=[U-104[Mmp]](unit-plans/U-104[Mmp].md) | 장기 세션 메모리 요약/핀 고도화 | Depends=U-025 | ⏸️
ID=[U-105[Mmp]](unit-plans/U-105[Mmp].md) | ⚡Scenario Library(5) + 자동 리플레이 | Depends=U-025 | ⏸️
ID=[RU-007[Mmp]](unit-plans/RU-007[Mvp].md) | 리팩토링: artifacts 버전/경로/링크 정리 **(MVP→MMP 이동)** | Depends=U-025 | ⏸️
ID=[RU-010[Mmp]](unit-plans/RU-010[Mmp].md) | 리팩토링: 스키마/상수 SSOT 강화 | Depends=U-105 | ⏸️
ID=[CP-MMP-01](unit-plans/CP-MMP-01.md) | **체크포인트: 배포/관측 게이트** | Depends=U-120,RU-010 | ⏸️
ID=[U-106[Mmp]](unit-plans/U-106[Mmp].md) | 관측 지표/대시보드 고도화 | Depends=CP-MMP-01 | ⏸️
ID=[U-107[Mmp]](unit-plans/U-107[Mmp].md) | 접근성/단축키/모바일 UX (심층, U-119 후속) | Depends=U-106 | ⏸️
ID=[U-108[Mmp]](unit-plans/U-108[Mmp].md) | ⚡보안 하드닝 | Depends=CP-MMP-01 | ⏸️
ID=[U-110~112[Mmp]] | 디버깅 모드/스토리지 TTL/Panel Corner 수정 | Depends=Various | ⏸️
ID=[U-113[Mmp]](unit-plans/U-113[Mmp].md) | 세션 상태 영속성(SaveGame 제거 후 재설계) | Depends=U-116,CP-MMP-01 | ⏸️
ID=[CP-MMP-02](unit-plans/CP-MMP-02.md) | **체크포인트: 시나리오 회귀 100%** | Depends=U-108,U-107,U-110~112 | ⏸️

### 완료 (117개)

- ✅ [U-114[Mvp]](vibe/unit-results/U-114.md): Agent Console 검증배지 접기 + 대기열 상시 노출 (2026-02-08)
- ✅ U-099[Mvp]: 거래 장부 i18n 혼합 출력 + 하단 여백 수정 (2026-02-08)
- ✅ U-116[Mvp]: SaveGame 제거 + 프로필 초기 상태 정리 (2026-02-08)
- ✅ U-097[Mvp]: ⚡SceneCanvas 렌더 중 Zustand setState 분리 (2026-02-08)
- ✅ U-086[Mvp]: 텍스트 우선 타이핑 출력 + 지연 흡수 (2026-02-08)
- ✅ U-085[Mvp]: 이미지 크기 Scene Canvas 맞춤 생성 (2026-02-08)
- ✅ U-083[Mvp]: 액션 카드 대안 뱃지 레이아웃 수정 (2026-02-08)
- ✅ U-082[Mvp]: Agent Console 축소 + 재화 현황 확대 (2026-02-08)
- ✅ U-079[Mvp]: 재화 부족 시 이미지 허용 + 획득 경로 다양화 (2026-02-08)
- ✅ U-078[Mvp]: 게임 목표 시스템 강화 (2026-02-08)
- ✅ U-088[Mvp]: 인벤토리 Row 형태 전환 (2026-02-07)
- ✅ U-096[Mvp]: 아이템 소비(삭제) 로직 (2026-02-07)
- _... 105개 추가 완료 유닛 (2026-01-03 ~ 2026-02-07)_

---

## 빠른 실행

**현재 작업**: [U-114[Mvp]](unit-plans/U-114[Mvp].md) - Agent Console 검증배지 접기
**다음 작업(MVP 완료 후)**: [U-119[Mmp]](unit-plans/U-119[Mmp].md) - Frontend Layout WIG 폴리시 → [U-120[Mmp]](unit-plans/U-120[Mmp].md) - 배포

```bash
# Frontend (RULE-011: 8001~8010)
pnpm -C frontend install && pnpm -C frontend dev
# → http://localhost:8001

# Backend (uv 기반, RULE-011: 8011~8020)
cd backend && cp .env.example .env && uv sync
uv run uvicorn unknown_world.main:app --reload --port 8011
# → http://localhost:8011/health

# 전체 포트 정리
pnpm kill
```

**완료 확인**:
- [ ] 고정 게임 UI 레이아웃 렌더(채팅 버블 없음)
- [ ] HTTP Streaming + Agent Console 단계/배지 표시(프롬프트 비노출)

---

## 일일 스탠드업 (2026-02-08)

**완료**: U-116[Mvp] - SaveGame 제거 + 프로필 초기 상태 정리, U-099[Mvp] - 거래 장부 버그 수정
**진행중**: U-114[Mvp] - Agent Console 검증배지 접기
**블로커**: 없음
**마감**: Devpost 2026-02-09 5:00 PM PST (**KST 2/10 화 10:00 AM, D-2**)
**MMP 재편**: M5 "해커톤 제출 준비"로 전면 재편 (U-119 WIG 폴리시, U-120 배포, U-121 문서, U-122 영상, CP-SUB-01). U-100+U-101→U-120 흡수.
**제출 크리티컬 패스**: MVP 잔여(U-114 등) → U-119(폴리시) + U-120(배포) 병렬 → U-121(문서) → U-122(영상) → CP-SUB-01(제출)
