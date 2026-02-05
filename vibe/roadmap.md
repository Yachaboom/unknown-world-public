# 📊 Unknown World 로드맵

**핵심 가치**: 구조화 출력(JSON Schema) 기반의 에이전트형 Game Master가 **상태(WorldState)·규칙(Rule Board)·경제(Economy)** 를 갱신하며, 플레이어가 **클릭·드래그·업로드(Scanner)** 로 조작 가능한 “채팅이 아닌 게임 UI”를 웹에서 즉시 플레이하게 한다.

## 진행 현황

**전체**: 92/130 (70.8%) | **MVP**: 92/112 (82.1%) | **MMP**: 0/18 (0%)

**예상 완료(가정)**: MVP D-5 | MMP D-11
_가정: 1인 기준 / 1일 순개발 4h / 유닛 평균 45분 / 버퍼 30% 포함_

_진행률 산정: `vibe/unit-results/` 또는 `vibe/progress.md`에 존재하는 완료 유닛(U/RU/CP) 기준._

**진행 중(현재 포커스)**: [U-080[Mvp]](unit-plans/U-080[Mvp].md) API 키 인증 핫픽스 / **최근 완료**: [U-072[Mvp]](unit-results/U-072[Mvp].md) (2026-02-05)

**블로커**: 없음

**추가 메모**:
- 취소 UX(Cancel 버튼)는 현재 `frontend/src/turn/turnRunner.ts`의 `cancel()` 기본 골격만 구현되어 있으며, Abort 정책(Abort 시 `onComplete` 미호출) 때문에 취소 시 UI 복구가 미완성일 수 있다. 정책 SSOT: `vibe/refactors/RU-003-S1.md`.
- M3 통합 구간에서 "나중에 한 번에 붙이기"로 인한 기술 부채/회귀를 줄이기 위해, 중간 체크포인트(CP-MVP-04~06)를 추가했다(실모델 Hard Gate / 멀티모달 이미지 게이트 / Scanner 업로드 게이트). **ID는 유지**하되, 목표일/Depends 기준으로 실행 순서를 정렬한다.
- ko/en 혼합 출력 사례: `vibe/ref/en-ko-issue.png` (현상/원인 분류 및 수정 계획은 U-043/U-044에서 정리)
- 로컬에서 `.env`가 자동 로딩되지 않으면 `UW_MODE`가 기본값(mock)으로 동작해 MockOrchestrator 템플릿("...라고 말했습니다", 고정 내러티브)이 반복 노출될 수 있다 → U-047(백엔드 `.env` 자동 로딩) + U-048(Mock 내러티브/액션 echo 개선)로 해결한다.
- **[2026-02-01 추가]** MVP 품질 개선을 위한 신규 유닛 추가: UI 품질(U-056~U-058), 테스트 수정(U-060), 이미지 프롬프트 통합(U-061), 언어/재화/API 버그 수정(U-062~U-065). 프롬프트 ko/en 분리는 U-036에서 이미 완료됨.
- **[2026-02-02 추가]** 이미지 생성 지연이 길어도 자연스러운 플로우(진행 연출/late binding/모델 티어링)를 위한 MVP 유닛 추가: U-066.
- **[2026-02-03 추가]** MVP 품질/UX 강화를 위한 신규 유닛 9개 추가: Vertex AI Production 설정(U-067), 이미지 연결성(U-068), 텍스트 모델 티어링(U-069), 액션 로그(U-070), Scene 로딩 UI(U-071), Scanner 유도 UX(U-072), 레이아웃 확장(U-073), 인터랙션 안내(U-074), 아이템 아이콘 동적 생성(U-075).
- **[2026-02-03 추가]** "정밀분석" 액션으로 기존 Scene 이미지에 대해 Agentic Vision 분석 및 핫스팟 추가 기능 계획(U-076). MMP U-109(자동 실행)의 MVP 선행 버전으로, 사용자 트리거 기반.
- **[2026-02-03 추가]** MMP: 새로고침 시 날아가는 UI 상태(Scene 이미지, ActionDeck 등) 복원을 위한 세션 상태 영속성 유닛 추가(U-113).
- **[2026-02-03 추가]** MVP 게임플레이 품질 강화: 인벤토리 스크롤(U-077), 명확한 목표 시스템(U-078), 재화 부족 시 이미지 생성 허용 + 재화 획득 경로 다양화(U-079).
- **[2026-02-05 추가]** 핫픽스: Vertex AI 서비스계정 → API 키 인증 방식으로 전환(U-080). MVP UI 품질 강화: Quest/Rule 확장 시 Inventory 영역 침범 수정(U-081), Agent Console 축소 및 재화 현황 확대(U-082), 액션 카드 대안 뱃지 레이아웃 깨짐 수정(U-083), 이미지 생성 픽셀 스타일/사이즈 축소/Scene 영역 높이 조정(U-084).
- **[2026-02-05 추가]** 핫픽스/UX 보강: **UI 레이아웃(Scene Canvas) 기반 이미지 비율/크기 정합(U-085)**, **턴 진행 피드백 보강(타이핑↔이미지 pending 동기화, U-086)**, **처리 중 입력 잠금(허위 액션 로그/중복 입력 방지, U-087)**.
- **[2026-02-05 추가]** 인벤토리 UX 개선: **인벤토리 UI Row 형태 전환(U-088)** - 그리드/타일에서 Row 형태로 변경하여 아이템 정보 가독성 및 DnD 조작성 향상.

## 맥락 요약 (SSOT 근거)

### 프로젝트 핵심 가치 (1문장)

- “프롬프트 래퍼가 아닌” **상태 기반 게임 시스템**을, **구조화 출력 + 검증/복구 + 게임형 UI**로 증명한다.  
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
| R-003 | “채팅 앱처럼 보임”으로 심사/사용자 오해                                | High | 25%  | 고정 HUD(액션덱/인벤토리DnD/씬캔버스/에이전트콘솔) + 데모프로필/리셋 + 10분 데모 루프 |

### MVP 완료 기준 (Definition of Done)

- **Schema OK**: TurnOutput JSON이 스키마를 통과(서버 Pydantic + 클라 Zod)
- **Economy OK**: 예상 비용 노출, 거래 장부(ledger) 일관성, 잔액 음수 불가
- **Safety OK**: 차단/실패 시 명시 + 안전한 대체 결과(텍스트-only 등) 제공
- **Consistency OK**: 언어 정책(ko/en 혼합 금지), bbox 규약(0~1000, [ymin,xmin,ymax,xmax]) 준수
- **Demo OK(10분 루프)**: 드래그→클릭→(스캐너)업로드→룰 변형/퀘스트→오토파일럿→엔딩 리포트까지 반복 가능(데모프로필+리셋 포함)

---

## 마일스톤

| 단계 | ID        | 이름                                   | 목표일     | 진행률 | 상태 |
| ---- | --------- | -------------------------------------- | ---------- | ------ | ---- |
| MVP  | M1        | 스캐폴딩 + Turn 계약 + HTTP Streaming  | 2026-01-05 | 11/11  | ✅   |
| MVP  | CP-MVP-01 | **✓ 체크포인트: 스트리밍/스키마/폴백** | 2026-01-10 | -      | ✅   |
| MVP  | M2        | 핵심 UI(액션덱/핫스팟/DnD) + 가독성/에셋 | 2026-01-15 | 11/23  | 🚧   |
| MVP  | CP-MVP-02 | **✓ 체크포인트: 클릭+드래그 데모**     | 2026-01-15 | -      | ✅   |
| MVP  | M3        | 세션/데모프로필 + 실모델 + 복구        | 2026-01-24 | 10/10  | ✅   |
| MVP  | CP-MVP-04 | **✓ 체크포인트: 실모델 Hard Gate**     | 2026-01-21 | -      | ✅   |
| MVP  | CP-MVP-07 | **✓ 체크포인트: real 모드 로컬 실행 게이트(.env/Vertex)** | 2026-01-22 | -      | ✅   |
| MVP  | CP-MVP-06 | **✓ 체크포인트: Scanner 업로드 게이트** | 2026-01-31 | -      | ✅   |
| MVP  | CP-MVP-03 | **✓ 체크포인트: 10분 데모 루프**       | 2026-01-24 | -      | ⏸️   |
| MMP  | M5        | 배포/스토리지/관측 강화                | 2026-02-01 | 0/8    | ⏸️   |
| MMP  | CP-MMP-01 | **✓ 체크포인트: 배포/관측 게이트**     | 2026-02-01 | -      | ⏸️   |
| MMP  | M6        | 장기 세션/회귀 자동화/보안 하드닝      | 2026-02-12 | 0/8    | ⏸️   |
| MMP  | CP-MMP-02 | **✓ 체크포인트: 시나리오 회귀 100%**   | 2026-02-12 | -      | ⏸️   |

## 핵심 기능 (MVP)

### Turn 계약 + 오케스트레이터 스트리밍

- **완료 기준**: HTTP Streaming(POST)로 Queue/Badges/Auto-repair를 스트리밍하고, 최종 TurnOutput이 스키마/비즈니스 룰을 통과
- **책임 Unit**: U-005 ~ CP-MVP-01, U-016 ~ U-018, CP-MVP-04, RU-005, U-047, U-048, CP-MVP-07
- **상태**: ✅ (리팩토링 완료)

### "채팅이 아닌" 고정 게임 UI + 핵심 인터랙션

- **완료 기준**: Action Deck / Inventory(DnD) / Scene Canvas(Hotspots) / Economy HUD / Agent Console이 상시 노출되고, 클릭+드래그가 동작하며, 기본 폰트/대비가 "읽을 수 있는" 수준으로 유지된다, **인벤토리 아이템 이름 툴팁 지원**, **텍스트 번짐 개선**, **핫스팟 디자인 품질 향상**, **아이템→핫스팟 사용 시 액션 로그 출력**, **처리중 Scene UI 로딩 인디케이터**, **레이아웃 확장(좌우 빈공간 활용)**, **핫스팟/아이템 인터랙션 안내 UX**, **인벤토리 스크롤(아이템 많아질 때)**, **인벤토리 Row 형태 전환(정보 가독성/DnD 조작성)**, **Quest/Rule 확장 시 Inventory 영역 보호**, **Agent Console 축소 + 재화 현황 확대**, **액션 카드 대안 뱃지 레이아웃 안정화**
- **책임 Unit**: U-004, U-009 ~ CP-MVP-02, U-014, U-028, U-029, U-030 ~ U-034, U-037, U-038, U-042, U-049, U-050, **U-056, U-057, U-058**, **U-070, U-071, U-073, U-074**, **U-077, U-088**, **U-081, U-082, U-083**, **U-086, U-087**
- **상태**: 🚧

### 데모 반복 가능(데모프로필/리셋/세이브) + 엔딩 아티팩트

- **완료 기준**: 데모프로필 3종 + 즉시 시작/리셋 + SaveGame + 엔딩 리포트 아티팩트 생성, **명확한 게임 목표 시스템**
- **책임 Unit**: U-015, U-041, U-025, **U-078**
- **상태**: 🚧

### 게임 경제/재화 시스템

- **완료 기준**: 예상 비용 노출, 잔액 부족 시 대안 제공(FAST 이미지/텍스트-only), 재화 획득 경로 다양화(액션 카드/아이템/목표 보상), 경제 루프 완성
- **책임 Unit**: U-014, **U-079**
- **상태**: 🚧

### 멀티모달(선택적 이미지 + Scanner 업로드)

- **완료 기준**: 텍스트 우선 + (조건부) 이미지 생성/표시, Scanner 업로드가 "아이템/단서"로 변환되어 인벤토리에 반영, 오브젝트 이미지 배경 제거(rembg) 지원, 프롬프트 파일 분리/핫리로드 지원, **분리 프롬프트(.md) 내 XML 태그 규격 통일**, **턴 파이프라인-이미지 생성 서비스 통합(Mock/Real 모두)**, **이미지 생성 지침(scene_prompt) 파이프라인 통합**, **Gemini 이미지 생성 API 호출 방식 수정**, **이미지 생성 지연 흡수 플로우(진행 연출/late binding) + 모델 티어링(FAST/QUALITY)**, **이전 턴 이미지 참조로 연결성 강화**, **Scanner 의미론적 사용 유도 UX**, **인벤토리 아이템 아이콘 동적 생성(rembg/캐싱/i18n)**, **"정밀분석" 액션으로 기존 이미지 Agentic Vision 분석 및 핫스팟 추가**, **API 키 인증 방식 전환**, **이미지 픽셀 스타일 + 사이즈 축소 + Scene 영역 높이 조정**
- **책임 Unit**: U-019 ~ U-022, U-035, U-036, U-043, U-045, U-046, CP-MVP-05, CP-MVP-06, **U-051 ~ U-055**, **U-061**, **U-064**
- **책임 Unit(보강)**: **U-066**, **U-067, U-068, U-069, U-072, U-075**, **U-076**, **U-080, U-084, U-085, U-086**
- **상태**: 🚧

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
| R-004 | 작은 글씨/CRT 튜닝으로 가독성·정체성 균형 붕괴 | Medium | 25% | UI 스케일 + 중요도(critical/ambient) 기반 효과 분리 + 대비/라인하이트 가이드 + reduced-motion 가드 |
| R-005 | 에셋 난립/용량 비대화/스타일 불일치  | Medium | 25% | nanobanana mcp 에셋 SSOT + 매니페스트/QA + 예산 상한 + (필요 시) rembg 배경 제거 |
| R-006 | 통합 구간(M3)에서 체크포인트 부족으로 기술 부채/회귀 누적 | Medium | 30% | 중간 CP 추가(CP-MVP-04~06) + debt-log 기록 + 리플레이로 Hard Gate 회귀 확인 |
| R-007 | ko/en 혼합 출력(내러티브/룰/퀘스트/UI)이 한 화면에 노출되어 데모 신뢰도 붕괴 | High | 20% | 세션 언어 SSOT(언어 전환=리셋) + 언어 게이트/Repair + i18n/폴백/하드코딩 정리 |
| R-008 | 프롬프트 포맷 드리프트(프론트매터/태그 혼재)로 메타 추적/튜닝/검증이 흔들림 | Medium | 25% | 분리 프롬프트(.md) XML 태그 규격 통일 + (권장) 로더 파싱/검증 단일화(U-046) |
| R-009 | Agentic Vision(코드 실행) 추가 호출로 비용/지연이 커져 UX가 악화되거나, 생성 이미지-행동/핫스팟 정합이 깨질 수 있음 | Medium | 20% | Key scene 제한 + Economy 게이트/예상비용 + 실패/차단 시 텍스트 폴백 + (Dev) 시각적 증거(annotated crop) 아티팩트로 디버그 |
| R-010 | 로컬/데모에서 실모델(real) 모드 환경변수 로딩 누락으로 mock 출력(고정 내러티브) 또는 인증 실패로 데모가 흔들릴 수 있음 | Medium | 25% | 백엔드 `.env` 자동 로딩(U-047) + real 모드 스모크 체크포인트(CP-MVP-07) + 실패 시 안전 폴백 |
| R-011 | 오버레이(핫스팟/CRT) 색이 콘텐츠를 과도하게 덮거나, 패널 스크롤 전략이 불편해 “게임 UI” 체감이 저하될 수 있음 | Medium | 30% | 오버레이 팔레트/강도 토큰 튜닝(U-050) + 레이아웃/스크롤 설계 개선(U-049) + 가이드 기반 점검 |
| R-012 | Action 실행 시 템플릿 문장(“...라고 말했습니다”)이 반복되어 몰입/자연스러움이 깨질 수 있음(특히 mock 모드) | Low | 35% | MockOrchestrator 액션 타입별 로그/내러티브 개선(U-048) + real 모드 기본 동선(CP-MVP-07) |
| R-013 | 이미지 생성 지연이 길 때 “장면 갱신” 타이밍이 어긋나 몰입이 깨질 수 있음(늦게 도착한 이미지가 새 장면을 덮는 문제 포함) | Medium | 25% | U-066: late-binding 가드(turn_id/scene revision) + 모델 티어링(FAST) + “형성 중” 연출 |
| R-014 | 연속 장면 간 시각적 일관성 부족(동일 캐릭터/오브젝트가 다르게 그려짐)으로 몰입 저하 | Medium | 30% | U-068: 이전 턴 이미지를 참조이미지로 전달 + 장면 전환 시 초기화 정책 |
| R-015 | 핵심 인터랙션(핫스팟 클릭/아이템 DnD) 발견성 부족으로 플레이어가 텍스트 입력만 시도 | Medium | 35% | U-074: 인터랙션 안내 UX + U-072: Scanner 유도 UX + 온보딩 가이드 |
| R-016 | 새로고침/탭 종료 시 게임 진행 상태(Scene 이미지/ActionDeck)가 날아가 데모 중 치명적 손실 | Medium | 40% | U-113(MMP): 세션 상태 영속성 + SaveGame 기반 폴백 |
| R-017 | 재화 부족으로 게임 진행이 막히거나, 이미지 생성이 완전 차단되어 데모 체감 급락 | High | 35% | U-079: 잔액 부족 시 FAST 폴백 + 재화 획득 경로 다양화 |
| R-018 | 플레이어가 목표를 모르고 방황하여 "뭘 해야 하는지 모르겠다" 피드백 발생 | Medium | 40% | U-078: 명확한 목표 시스템 + 서브 목표 가이드 |
| R-019 | 처리 중 입력이 허용되어 **허위 액션 로그**가 쌓이거나 요청 경합/상태 혼선이 발생 | Medium | 35% | U-087: 입력 잠금(완전 차단) + U-086: 진행 피드백 보강 |

## 메트릭

| 지표                       | 현재 | 목표        |
| -------------------------- | ---- | ----------- |
| Streaming TTFB             | -    | < 2s        |
| API 응답(p95, 텍스트)      | -    | < 200ms     |
| 이미지 생성 시간(p95)      | -    | < 12s(선택) |
| Hard Gate 통과율(리플레이) | -    | 100%        |

**기술 부채**: 0h(미추정 2건 있음: U-040, U-043/U-044로 해결 예정) / 한도 8h  \| SSOT: `vibe/debt-log.md`

---

### 작업 백로그

**범례**: ⏸️ 대기 | 🚧 진행중 | ✅ 완료 | ❌ 차단 | ⚡ Critical Path

### MVP

ID=[U-073[Mvp]](unit-plans/U-073[Mvp].md) | 레이아웃 확장 - 좌우 빈공간 활용으로 덜 답답한 UI | Depends=U-049 | ⏸️
ID=[U-074[Mvp]](unit-plans/U-074[Mvp].md) | 핫스팟/아이템 인터랙션 안내 UX | Depends=U-012,U-010 | ⏸️
ID=[U-075[Mvp]](unit-plans/U-075[Mvp].md) | ⚡인벤토리 아이템 아이콘 동적 생성 및 이름 정합성 | Depends=U-011,U-035 | ⏸️
ID=[U-076[Mvp]](unit-plans/U-076[Mvp].md) | "정밀분석" 액션으로 기존 Scene 이미지 Agentic Vision 분석 및 핫스팟 추가 | Depends=U-010,U-019,U-069 | ⏸️
ID=[U-077[Mvp]](unit-plans/U-077[Mvp].md) | 인벤토리 패널 스크롤 및 아이템 관리 UX 개선 | Depends=U-011,U-049 | ⏸️
ID=[U-088[Mvp]](unit-plans/U-088[Mvp].md) | 인벤토리 UI Row 형태 전환 - 정보 가독성 및 DnD 조작성 향상 | Depends=U-011,U-077 | ⏸️
ID=[U-078[Mvp]](unit-plans/U-078[Mvp].md) | 게임 목표 시스템 강화 - 명확한 목표 제시 및 진행 가이드 | Depends=U-013,U-015 | ⏸️
ID=[U-079[Mvp]](unit-plans/U-079[Mvp].md) | ⚡재화 부족 시 이미지 생성 허용 + 재화 획득 경로 다양화 | Depends=U-014,U-019,U-078 | ⏸️
ID=[U-081[Mvp]](unit-plans/U-081[Mvp].md) | UI 레이아웃 - Quest/Rule 확장 시 Inventory 영역 침범 수정 | Depends=U-049,U-077 | ⏸️
ID=[U-082[Mvp]](unit-plans/U-082[Mvp].md) | UI 레이아웃 - Agent Console 축소 및 재화 현황 영역 확대 | Depends=U-049 | ⏸️
ID=[U-083[Mvp]](unit-plans/U-083[Mvp].md) | UI 레이아웃 - 액션 카드 대안 뱃지 레이아웃 깨짐 수정 | Depends=U-009 | ⏸️
ID=[U-085[Mvp]](unit-plans/U-085[Mvp].md) | ⚡핫픽스 - 이미지 크기를 현재 UI 레이아웃(Scene Canvas)에 최대한 맞춤으로 생성 | Depends=U-066,U-049 | ⏸️
ID=[U-086[Mvp]](unit-plans/U-086[Mvp].md) | 턴 진행 피드백 보강 - 타이핑 효과와 이미지 생성 지연 동기화 | Depends=U-066,U-071 | ⏸️
ID=[U-087[Mvp]](unit-plans/U-087[Mvp].md) | 대기열(턴 처리) 진행 중 모든 사용자 입력 잠금 | Depends=U-070,U-071 | ⏸️
ID=[U-084[Mvp]](unit-plans/U-084[Mvp].md) | 이미지 생성 최적화 - 픽셀 스타일 + 사이즈 축소 + Scene 영역 높이 조정 | Depends=U-066,U-049,U-085 | ⏸️
ID=[U-023[Mvp]](unit-plans/U-023[Mvp].md) | ⚡Autopilot 모드 토글 + Goal 입력 + Plan/Queue UI | Depends=U-008,U-013 | ⏸️
ID=[U-024[Mvp]](unit-plans/U-024[Mvp].md) | ⚡Backend Autopilot(제한 스텝) + Action Queue Streaming | Depends=U-018,U-023 | ⏸️
ID=[U-025[Mvp]](unit-plans/U-025[Mvp].md) | 엔딩 리포트 아티팩트 생성(요약/타임라인/결산) | Depends=U-018,U-015 | ⏸️
ID=[U-026[Mvp]](unit-plans/U-026[Mvp].md) | 리플레이/시나리오 하네스(저장+수동 러너) | Depends=U-024,U-025 | ⏸️
ID=[RU-007[Mvp]](unit-plans/RU-007[Mvp].md) | 리팩토링: artifacts 버전/경로/링크 정리 | Depends=U-026 | ⏸️
ID=[CP-MVP-03](unit-plans/CP-MVP-03.md) | **체크포인트: 10분 데모 루프** | Depends=RU-007,U-056,U-057,U-058,U-061 | ⏸️

### MMP

ID=[U-100[Mmp]](unit-plans/U-100[Mmp].md) | ⚡Dockerfile/로컬 실행(프론트/백엔드) | Depends=CP-MVP-03 | ⏸️
ID=[U-101[Mmp]](unit-plans/U-101[Mmp].md) | ⚡Cloud Run 배포 구성 + env/secret 가이드 | Depends=U-100 | ⏸️
ID=[U-102[Mmp]](unit-plans/U-102[Mmp].md) | ⚡GCS 스토리지 어댑터(이미지/아티팩트) | Depends=U-100 | ⏸️
ID=[U-103[Mmp]](unit-plans/U-103[Mmp].md) | 이미지 편집(멀티턴, REF 유지) | Depends=U-019,U-102 | ⏸️
ID=[U-109[Mmp]](unit-plans/U-109[Mmp].md) | Agentic Vision: 생성된 장면 이미지 기반 행동/핫스팟 근거화 | Depends=U-019,U-020,RU-005 | ⏸️
ID=[U-104[Mmp]](unit-plans/U-104[Mmp].md) | 장기 세션 메모리 요약/핀 추천 고도화 | Depends=U-025 | ⏸️
ID=[U-105[Mmp]](unit-plans/U-105[Mmp].md) | ⚡Scenario Library(5) + 자동 리플레이 확장 | Depends=U-026 | ⏸️
ID=[RU-010[Mmp]](unit-plans/RU-010[Mmp].md) | 리팩토링: 스키마/상수 SSOT 강화 + 파일 분리 | Depends=U-105 | ⏸️
ID=[CP-MMP-01](unit-plans/CP-MMP-01.md) | **체크포인트: 배포/관측 게이트** | Depends=U-101,RU-010 | ⏸️

ID=[U-106[Mmp]](unit-plans/U-106[Mmp].md) | 관측 지표/대시보드(Agent Console 메트릭) 고도화 | Depends=CP-MMP-01 | ⏸️
ID=[U-107[Mmp]](unit-plans/U-107[Mmp].md) | 접근성/단축키/모바일 UX 개선 | Depends=U-106 | ⏸️
ID=[U-108[Mmp]](unit-plans/U-108[Mmp].md) | ⚡보안 하드닝(인젝션 케이스/secret scan) | Depends=CP-MMP-01 | ⏸️
ID=[U-110[Mmp]](unit-plans/U-110[Mmp].md) | 프론트엔드 디버깅 모드 토글 UI(스트림 로그/상태 diff/스토리지 사용량) | Depends=U-106 | ⏸️
ID=[U-111[Mmp]](unit-plans/U-111[Mmp].md) | 스토리지 TTL/정리 정책 정의(로컬/GCS Lifecycle) | Depends=U-102 | ⏸️
ID=[U-112[Mmp]](unit-plans/U-112[Mmp].md) | Panel Corner 이미지 방향 수정(panel-corner-br.png 식별성 개선) | Depends=U-032[Mvp] | ⏸️
ID=[U-113[Mmp]](unit-plans/U-113[Mmp].md) | 세션 상태 영속성 - 새로고침 시 Scene/ActionDeck/상태 복원 | Depends=U-015,U-041 | ⏸️
ID=[RU-011[Mmp]](unit-plans/RU-011[Mmp].md) | 리팩토링: Autopilot/Replay 모듈 정리 | Depends=U-108 | ⏸️
ID=[CP-MMP-02](unit-plans/CP-MMP-02.md) | **체크포인트: 시나리오 회귀 100%** | Depends=RU-011,U-107,U-110,U-111 | ⏸️

### 완료

- ✅ [U-072[Mvp]](unit-results/U-072[Mvp].md): Scanner 의미론적 사용 유도 UX (2026-02-05)
- ✅ [U-071[Mvp]](unit-results/U-071[Mvp].md): Scene 처리중 UI 로딩 인디케이터 강화 (2026-02-05)
- ✅ [U-070[Mvp]](unit-results/U-070[Mvp].md): 아이템-핫스팟 사용 시 액션 로그 출력 (2026-02-05)
- ✅ [U-069[Mvp]](unit-results/U-069[Mvp].md): 텍스트 생성 FAST 모델 기본 + "정밀조사" 트리거 Pro 모델 전환 (2026-02-05)
- ✅ [U-068[Mvp]](unit-results/U-068[Mvp].md): 이전 턴 이미지를 참조이미지로 사용하여 이미지 연결성 강화 (2026-02-05)
- ✅ [U-067[Mvp]](unit-results/U-067[Mvp].md): ⚡핫픽스 - Vertex AI Production 설정 수정 (2026-02-04)
- ✅ [U-066[Mvp]](unit-results/U-066[Mvp].md): 이미지 생성 지연 흡수 플로우(진행 연출/late binding) + 모델 티어링(FAST/QUALITY) + 타이핑 효과 (2026-02-03)
- ✅ [U-065[Mvp]](unit-results/U-065[Mvp].md): TurnOutput 스키마 단순화 (Gemini API 제한 대응) (2026-02-02)
- ✅ [U-064[Mvp]](unit-results/U-064[Mvp].md): Gemini 이미지 생성 API 호출 방식 수정 (2026-02-02)
- ✅ [U-063[Mvp]](unit-results/U-063[Mvp].md): 프론트엔드 턴 실행 후 재화 잔액 버그 수정 (2026-02-02)
- ✅ [U-062[Mvp]](unit-results/U-062[Mvp].md): MockOrchestrator 영어 입력 시 LanguageGate 수정 (2026-02-01)
- ✅ [U-061[Mvp]](unit-results/U-061[Mvp].md): 이미지 생성 지침(scene_prompt) 파이프라인 통합 및 i18n 정합성 강화 (2026-02-01)
- ✅ [U-060[Mvp]](unit-results/U-060[Mvp].md): 테스트 코드 정합성 수정 (2026-02-01)
- ✅ [U-058[Mvp]](unit-results/U-058[Mvp].md): 핫스팟 디자인 개선 (코너/스트로크/색상) (2026-02-01)
- ✅ [U-057[Mvp]](unit-results/U-057[Mvp].md): 텍스트 번짐 식별성 개선 (2026-02-01)
- ✅ [U-056[Mvp]](unit-results/U-056[Mvp].md): 인벤토리 아이템 이름 텍스트 잘림 최소화 + 툴팁 (2026-02-01)
- ✅ [U-055[Mvp]](unit-results/U-055[Mvp].md): 이미지 파이프라인 Mock/Real 모드 통합 검증 (2026-02-01)
- ✅ [U-054[Mvp]](unit-results/U-054[Mvp].md): 이미지 생성 폴백 및 실패 복구 체계 강화 (2026-02-01)
- ✅ [U-053[Mvp]](unit-results/U-053[Mvp].md): 비동기 이미지 생성 및 결과 데이터 동기화 (2026-02-01)
- ✅ [U-052[Mvp]](unit-results/U-052[Mvp].md): 조건부 이미지 생성 제어 로직(should_generate 판정) (2026-02-01)
- ✅ [U-051[Mvp]](unit-results/U-051[Mvp].md): ⚡렌더링 단계-이미지 생성 서비스 브릿지 구축 (2026-02-01)
- ✅ [U-050[Mvp]](unit-results/U-050[Mvp].md): UI/UX - 오버레이 팔레트/강도 튜닝 및 반응형 폴리시(가이드 준수) (2026-02-01)
- ✅ [U-049[Mvp]](unit-results/U-049[Mvp].md): UI/UX - 레이아웃/스크롤 설계 개선(첫 화면 과도 스크롤 제거, 카드 내부 스크롤) (2026-02-01)
- ✅ [U-042[Mvp]](unit-results/U-042[Mvp].md): 용어/카피 정리: 원장→거래 장부, Ledger→Resource Log 등 게임 친화 용어 통일 (2026-01-31)
- ✅ [U-041[Mvp]](unit-results/U-041[Mvp].md): SaveGame 마이그레이션 - 버전별 변환 로직 구현 (2026-01-31)
- ✅ [RU-006-S1](vibe/refactors/RU-006-S1.md): 리팩토링 - 업로드 이미지 임시 저장 정책 명확화 (2026-01-31)
- ✅ [RU-006-Q5](vibe/refactors/RU-006-Q5.md): 리팩토링 - 저장 경로 및 URL 하드코딩 제거 (2026-01-31)
- ✅ [RU-006-Q4](vibe/refactors/RU-006-Q4.md): 리팩토링 - 스토리지 인터페이스 추상화 도입 (2026-01-31)
- ✅ [RU-006-Q1](vibe/refactors/RU-006-Q1.md): 리팩토링 - 파일 검증/제한 로직 중앙화(SSOT) (2026-01-31)
- ✅ [CP-MVP-06](unit-results/CP-MVP-06.md): 체크포인트 - Scanner 업로드 게이트(안전/좌표/비용) (2026-01-31)
- ✅ [U-022[Mvp]](unit-results/U-022[Mvp].md): Scanner 슬롯 UI + 업로드→아이템화(Option B) 반영 (2026-01-31)
- ✅ [U-021[Mvp]](unit-results/U-021[Mvp].md): 이미지 이해(Scanner) 백엔드 엔드포인트(POST /api/scan) (2026-01-31)
- ✅ [U-048[Mvp]](unit-results/U-048[Mvp].md): Mock Orchestrator: 액션 echo/내러티브 템플릿 개선(“말했습니다” 제거, 반복 완화) (2026-01-30)
- ✅ [CP-MVP-07](unit-results/CP-MVP-07.md): 체크포인트: real 모드 로컬 실행 게이트(.env/Vertex/스트리밍) (2026-01-29)
- ✅ [U-047[Mvp]](unit-results/U-047[Mvp].md): Backend `.env` 자동 로딩(로컬) + 모드/ENV 가드(프롬프트/Vertex) (2026-01-28)
- ✅ [CP-MVP-05](unit-results/CP-MVP-05.md): 체크포인트: 멀티모달 이미지 게이트(텍스트 우선/폴백/비용) 검증 완료 (2026-01-28)
- ✅ [U-040[Mvp]](unit-results/U-040[Mvp].md): 에셋 요청 스키마 정합(rembg_model 이슈) + 테스트/런북 복구 (2026-01-28)
- ✅ [U-046[Mvp]](unit-results/U-046[Mvp].md): 분리 프롬프트(.md) XML 태그 규격 통일 + 로더 파싱 단일화 (2026-01-28)
- ✅ [U-045[Mvp]](unit-results/U-045[Mvp].md): Backend 시작 시 rembg/모델 사전 점검 + 다운로드(preflight) (2026-01-28)
- ✅ [U-044[Mvp]](unit-results/U-044[Mvp].md): 세션 언어 SSOT(토글=리셋) + 혼합 출력(상태/시스템) 제거 (2026-01-27)
- ✅ [U-036[Mvp]](unit-results/U-036[Mvp].md): 스토리/이미지 프롬프트 파일 분리(ko/en) + 핫리로드 (2026-01-26)
- ✅ [U-035[Mvp]](unit-results/U-035[Mvp].md): 실시간 이미지 생성 시 rembg 배경 제거 통합 (2026-01-25)
- ✅ [U-020[Mvp]](unit-results/U-020[Mvp].md): ⚡프론트 이미지 Lazy Render(placeholder/폴백) (2026-01-25)
- ✅ [U-019[Mvp]](unit-results/U-019[Mvp].md): ⚡이미지 생성 엔드포인트/잡(조건부) (2026-01-25)
- ✅ [CP-MVP-04](unit-results/CP-MVP-04.md): 체크포인트 - 실모델 Hard Gate(스키마/경제/복구) (2026-01-25)
- ✅ [RU-005[Mvp]](vibe/unit-results/RU-005[Mvp].md): 리팩토링 - orchestrator pipeline stages 정리 (2026-01-25)
- ✅ [RU-005-S3](vibe/unit-runbooks/RU-005-S3-runbook.md): 수동 검증 시나리오: “/api/turn stage pipeline” 패키지 (2026-01-25)
- ✅ [RU-005-S2](refactors/RU-005-S2.md): 엣지 케이스: Cancel/예외/언어(i18n) 경로 일관성 (2026-01-25)
- ✅ [RU-005-Q1[Mvp]](refactors/RU-005-Q1.md): 리팩토링 - 폴백/단계/복구 로직 중복 제거(SSOT) (2026-01-25)
- ✅ [RU-005-S1[Mvp]](unit-plans/RU-005[Mvp].md): 잠재적 오류 - badges/단계 이벤트 인바리언트 정합성 (2026-01-25)
- ✅ [RU-005-Q3[Mvp]](unit-plans/RU-005[Mvp].md): 복잡도 - api/turn.py 스트리밍 오케스트레이션 축소 (2026-01-25)
- ✅ [RU-005-Q4[Mvp]](unit-plans/RU-005[Mvp].md): 모듈 설계 - orchestrator pipeline stages 모듈화 (2026-01-25)
- ✅ [U-018[Mvp]](unit-results/U-018[Mvp].md): ⚡비즈니스 룰 검증 + Repair loop + 안전 폴백 (2026-01-25)
- ✅ [U-017[Mvp]](unit-results/U-017[Mvp].md): ⚡Structured Output TurnOutput 생성 + Pydantic 검증 (2026-01-24)
- ✅ [U-016[Mvp]](unit-results/U-016[Mvp].md): ⚡Vertex 인증 + google-genai 클라이언트 + 모델 라벨 고정 (2026-01-24)
- ✅ [RU-004[Mvp]](unit-results/RU-004[Mvp].md): 리팩토링 - SaveGame/초기상태/데모 프로필 정리 (2026-01-24)
- ✅ [RU-004-S3](refactors/RU-004-S3.md): 수동 검증 시나리오: “SaveGame/프로필/리셋/복원” 패키지 (2026-01-24)
- ✅ [RU-004-Q1](refactors/RU-004-Q1.md): 리팩토링 - SaveGame 생성 경로 단일화(SSOT) (2026-01-24)
- ✅ [RU-004-Q4](save/sessionLifecycle.ts): 모듈 설계 - 세션 초기화/복원/리셋 SSOT 단일화 (2026-01-23)
- ✅ [U-015[Mvp]](unit-results/U-015[Mvp].md): ⚡SaveGame(local) + Reset + Demo Profiles(3종) (2026-01-19)
- ✅ [U-014[Mvp]](unit-results/U-014[Mvp].md): ⚡Economy HUD + Ledger(프론트) (2026-01-18)
- ✅ [U-013[Mvp]](unit-results/U-013[Mvp].md): Quest + Rule Board/Timeline 패널 (2026-01-18)
- ✅ [CP-MVP-02](unit-results/CP-MVP-02.md): 체크포인트 - 클릭+드래그 데모 (2026-01-18)
- ✅ [RU-003[Mvp]](unit-results/RU-003[Mvp].md): 리팩토링: UI 상태 슬라이스/경계 정리 (2026-01-18)
- ✅ [RU-003-S3](refactors/RU-003-S3.md): 수동 검증 시나리오: 카드/클릭/드롭/스트리밍 상태 경계 회귀 방지 (2026-01-18)
- ✅ [RU-003-Q5](refactors/RU-003-Q5.md): 하드코딩/DEV 목 데이터 격리: i18n 혼합 출력 방지 + 데모 프로필 경계 확보 (2026-01-17)
- ✅ [RU-003-S1](refactors/RU-003-S1.md): 잠재 버그: 연결 상태/Scene 상태 리셋/취소(Abort) 정책 정리 (2026-01-17)
- ✅ [RU-003-Q3](refactors/RU-003-Q3.md): App.tsx 복잡도 축소: Turn Runner 모듈 분리 (2026-01-17)
- ✅ [RU-003-Q4](stores/worldStore.ts): UI 상태 슬라이스/경계 재정의: worldStore 도입 (2026-01-17)
- ✅ [RU-003[Mvp]](unit-plans/RU-003[Mvp].md): 리팩토링: UI 상태 슬라이스/경계 정리 (2026-01-17)
- ✅ [U-012[Mvp]](unit-results/U-012[Mvp].md): ⚡DnD 드롭(아이템→핫스팟) TurnInput 이벤트 (2026-01-17)
- ✅ [U-011[Mvp]](unit-results/U-011[Mvp].md): ⚡Inventory 패널(DnD) 기본 (2026-01-17)
- ✅ [U-010[Mvp]](unit-results/U-010[Mvp].md): ⚡Scene Canvas + Hotspot Overlay(0~1000 bbox) (2026-01-17)
- ✅ [U-009[Mvp]](unit-results/U-009[Mvp].md): ⚡Action Deck(카드+비용/대안) (2026-01-17)
- ✅ [U-039[Mvp]](unit-results/U-039[Mvp].md): i18n 언어 리소스 JSON 구조 도입(ko-KR/en-US, 확장 가능) (2026-01-15)
- ✅ [U-038[Mvp]](unit-results/U-038[Mvp].md): 핵심 UI 아이콘 12종 재생성(v2, 퀄리티/용량/사이즈/식별성) (2026-01-14)
- ✅ [U-037[Mvp]](unit-results/U-037[Mvp].md): CRT/가독성 레이어링(Readable 모드 제거, 중요 영역 보호) (2026-01-14)
- ✅ [U-033[Mvp]](unit-results/U-033[Mvp].md): nanobanana mcp 에셋 매니페스트 + QA(크기/대비/폴백) (2026-01-12)
- ✅ [U-032[Mvp]](unit-results/U-032[Mvp].md): nanobanana mcp UI Chrome Pack(패널/카드 프레임/코너) (2026-01-12)
- ✅ [U-031[Mvp]](unit-results/U-031[Mvp].md): nanobanana mcp 상태 Placeholder Pack(Scene/오프라인/에러/차단) (2026-01-11)
- ✅ [U-029[Mvp]](unit-results/U-029[Mvp].md): nanobanana mcp 에셋 패스(UI 아이콘/프레임/placeholder) (2026-01-11)
- ✅ [U-034[Mvp]](unit-results/U-034[Mvp].md): nanobanana mcp 에셋 요청 스키마 + 프롬프트 템플릿(재현성) (2026-01-11)
- ✅ [U-030[Mvp]](unit-results/U-030[Mvp].md): nanobanana mcp 에셋 SSOT(폴더/네이밍/사이즈/폴백/라이선스) (2026-01-10)
- ✅ [U-028[Mvp]](unit-results/U-028[Mvp].md): UI 가독성 패스(폰트 스케일/효과 토글/대비) (2026-01-10)
- ✅ [CP-MVP-01](unit-results/CP-MVP-01.md): 체크포인트 - 스트리밍/스키마/폴백 (2026-01-10)
- ✅ [RU-002[Mvp]](unit-results/RU-002[Mvp].md): 리팩토링: validation/폴백/이벤트 타입 통일 (2026-01-10)
- ✅ [RU-002-S2](refactors/RU-002-S2.md): 스트림 이벤트 검증 강화(Zod) 및 Unknown 이벤트 폴백 처리 (2026-01-10)
- ✅ [RU-002-S1](refactors/RU-002-S1.md): 스트리밍 안정화 및 종료 인바리언트(항상 final) 강제 (2026-01-08)
- ✅ [RU-002-Q2](refactors/RU-002-Q2.md): PRD Turn Stream Protocol(SSOT) 정합성 확보 및 버전/별칭 도입 (2026-01-08)
- ✅ [RU-002-Q4](refactors/RU-002-Q4.md): Turn Stream 이벤트 계약 모듈 분리 (2026-01-07)
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

**현재 작업**: [U-065[Mvp]](unit-plans/U-065[Mvp].md) - TurnOutput 스키마 단순화 (Gemini API 제한 대응)

```bash
# Frontend (RULE-011: 8001~8010)
pnpm -C frontend install
pnpm -C frontend dev
# → http://localhost:8001 에서 접근 가능
# ⚠️ 포트 충돌 시 (strictPort: true로 fail-fast):
#    pnpm -C frontend dev --port 8002  (8002~8010 중 선택)

# Backend (uv 기반, RULE-011: 8011~8020)
cd backend
# (로컬) 환경변수 예시 파일 복사 후 값 입력
cp .env.example .env
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

## 일일 스탠드업 (2026-02-05)

**완료**: [U-067[Mvp]](unit-results/U-067[Mvp].md) - 핫픽스 - Vertex AI Production 설정 수정

**진행중**: [U-080[Mvp]](unit-plans/U-080[Mvp].md) - ⚡**핫픽스(최우선)** - Vertex AI 제거 → API 키 인증 전용

**블로커**: 없음

**신규 유닛 추가 (8개)**:
- [U-080[Mvp]](unit-plans/U-080[Mvp].md) - 핫픽스 - API 키 인증
- [U-081[Mvp]](unit-plans/U-081[Mvp].md) - Quest/Rule 확장 시 Inventory 침범 수정
- [U-082[Mvp]](unit-plans/U-082[Mvp].md) - Agent Console 축소 + 재화 현황 확대
- [U-083[Mvp]](unit-plans/U-083[Mvp].md) - 액션 카드 대안 뱃지 레이아웃 수정
- [U-084[Mvp]](unit-plans/U-084[Mvp].md) - 이미지 픽셀 스타일 + Scene 영역 높이 조정
- [U-085[Mvp]](unit-plans/U-085[Mvp].md) - ⚡핫픽스 - 이미지 크기/비율을 Scene Canvas 레이아웃에 최대한 맞춤
- [U-086[Mvp]](unit-plans/U-086[Mvp].md) - 턴 진행 피드백 보강(타이핑↔이미지 pending 동기화)
- [U-087[Mvp]](unit-plans/U-087[Mvp].md) - 처리 중 입력 잠금(허위 액션 로그/중복 입력 방지)
