# RU-004 리팩토링 제안 요약 보고서 (SaveGame/초기상태/Demo Profiles 정리)

## 분석 계획

- 아키텍처/SSOT 확인: `vibe/prd.md`(6.6 Save/Load, 6.9 Demo Profiles/Reset, RULE-006 언어), `vibe/tech-stack.md`, `vibe/architecture.md`(U-015 세션/세이브 정책)
- U-015 구현 근거 확인: `vibe/unit-results/U-015[Mvp].md`, U-015 커밋(`2bc8d...`)의 변경 범위/의도
- 실제 코드 교차 검증: `frontend/src/save/saveGame.ts`, `frontend/src/data/demoProfiles.ts`, `frontend/src/App.tsx`, 관련 store(`worldStore/economyStore/agentStore/actionDeckStore/inventoryStore`)
- 데모 반복성(Reset/Continue) 관점에서 “SSOT/중복/드리프트/엣지 케이스”를 분류(Q/S)하고 실행 가능한 제안서로 분리

---

## Executive Summary

U-015로 **Demo Profiles(3종) + Reset + localStorage SaveGame**이 빠르게 붙으면서 “심사자 온보딩 10초(PRD 6.9)”에 필요한 기능은 갖춰졌습니다.  
다만 RU-004 관점에서는 **초기상태(프로필 프리셋/SaveGame/스토어 초기화)의 SSOT가 App/SaveGame/Profiles에 분산**되어 있고, 특히 **복원(Continue/Reload) 경로에서 원장(ledger) 순서·마지막 비용·언어 적용이 미묘하게 틀어질 수 있는 버그**가 확인됩니다.

RU-004의 핵심은 기능 추가가 아니라 **“데모 반복성”을 최우선으로, 초기화/복원/리셋 경계를 단일화(SSOT)하고 중복을 제거**하여 이후 U-025(엔딩 리포트)/U-026(리플레이)까지 안정적으로 확장 가능한 기반을 만드는 것입니다.

---

## 페어링 질문(결정) 확인

- [x] **Q1: Demo Profiles 프리셋은 어디에 두는 게 좋을까?**
  - 결정: **Option A (`frontend/src/data/demoProfiles.ts` 코드 기반)**  
  - 확인: 현재 구현은 `frontend/src/data/demoProfiles.ts`에 3종 프로필 SSOT가 존재하며, RU-004 제안서도 이 결정을 전제로 “중복/드리프트 제거 + 초기화 SSOT 경계 정리”를 권장합니다.

---

## 핵심 발견사항 (강점 / 개선 필요 / 기술 부채)

### 강점

- **PRD 6.9 데모 표면 충족**: 프로필 선택 UI(`DemoProfileSelect`) + Reset/프로필 변경 UI(`ResetButton`)가 게임 UI 레이아웃 안에서 유지됨(RULE-002 준수)
- **SaveGame 최소 구조 확보**: `SaveGameSchema`(Zod) + localStorage 저장/복원 유틸리티가 분리되어 있으며(RULE-010/006 반영), 기본적인 저장/복원이 가능

### 개선 필요

- **세션 초기화 SSOT 분산**: 프로필 선택/복원/리셋 시 “스토어 초기화 + 상태 적용”이 `App.tsx`에 직접 구현되어 중복/누락 위험이 큼
- **복원 경로 안정성**: economy ledger 복원 방식이 store 정책(최신순 prepend)과 충돌하여 순서/lastCost가 왜곡될 수 있음

### 기술 부채(이번 제안에서 다룸)

- `migrateSaveGame()`이 존재하지만 `loadSaveGame()`에서 사용되지 않아 “버전/마이그레이션 훅”이 사실상 미사용 상태
- (분석 환경) `code-base.xml`(Repomix 스냅샷)이 워크스페이스에 존재하지 않아, 본 분석은 실제 소스 파일 기준으로 수행함(스냅샷 SSOT가 필요하면 재생성 권장)

---

## 제안 통계

- **총 제안 수**: 6
- **심각도 분포**
  - Critical: 0
  - High: 3 (RU-004-Q4, RU-004-S1, RU-004-S2)
  - Medium: 3 (RU-004-Q1, RU-004-Q5, RU-004-S3)
  - Low: 0

---

## 우선순위 목록 (ID / 심각도 / 기대효과 요약)

1. **RU-004-S1 (High)**: SaveGame 복원 시 ledger/lastCost/언어 적용 버그 제거 → “계속하기/새로고침” 신뢰도 상승
2. **RU-004-S2 (High)**: profileId/저장 키 드리프트 및 Continue/Reset 엣지 케이스 정리 → 데모 반복성 붕괴 방지
3. **RU-004-Q4 (High)**: 세션 초기화(프로필 선택/리셋/복원) SSOT 모듈화 → App 결합 축소 + 이후 확장 용이
4. **RU-004-Q1 (Medium)**: SaveGame 생성 경로 중복 제거(createSaveGame vs createSaveGameFromProfile) → 스키마 드리프트 방지
5. **RU-004-Q5 (Medium)**: 초기값/임계치/시드 등 하드코딩 상수화 및 “초기 상태” 정의 위치 고정 → 유지보수성 향상
6. **RU-004-S3 (Medium)**: RU-004 이후 수동 검증 시나리오 패키지 → Behavior Preservation 보장

---

## 비유닛 작업 커밋 메시지 추천 (docs)

> 아래는 “리팩토링 제안서 생성/문서 추가” 성격의 커밋 메시지 예시입니다. (진행률 수치는 임의 작성하지 않음)

```text
docs(vibe): RU-004[Mvp] SaveGame/초기상태/데모 프로필 리팩토링 제안서 추가

- SaveGame 복원(ledger/언어/프로필) 안정성 이슈 및 SSOT 경계 정리 제안 포함
- 데모 반복성(Reset/Continue) 중심 엣지 케이스/수동 검증 시나리오 포함

**Progress:**
- (roadmap 연동 항목이 없어 수치 작성 보류)
```

---

## 진행 순서 (Execution Order / File-based)

아래 순서는 “실제 구현 시” 추천 순서입니다.

1. `vibe/refactors/RU-004-S1.md`  
   - **선행 의존성**: 없음  
   - **이유**: 복원 경로의 실제 버그(ledger/언어)를 먼저 제거해야 데모 반복성이 확보됨
2. `vibe/refactors/RU-004-S2.md`  
   - **선행 의존성**: S1 권장(복원 품질 상향)  
   - **이유**: profileId/저장 키 불일치 등 “데모를 바로 깨뜨리는” 경계/엣지 케이스를 조기 차단
3. `vibe/refactors/RU-004-Q4.md`  
   - **선행 의존성**: S1/S2 적용 후 또는 병행  
   - **이유**: 세션 초기화/복원 로직을 모듈로 단일화(SSOT)하면 이후 변경 반경이 급격히 줄어듦
4. `vibe/refactors/RU-004-Q1.md`  
   - **선행 의존성**: Q4 권장(적용 지점이 명확해짐)  
   - **이유**: SaveGame 생성 중복을 제거해 스키마 드리프트 위험을 낮춤
5. `vibe/refactors/RU-004-Q5.md`  
   - **선행 의존성**: Q4 병행 권장  
   - **이유**: 초기값/임계치/시드 등 “초기 상태” 정의를 한 곳으로 고정해 유지보수성 개선
6. `vibe/refactors/RU-004-S3.md`  
   - **선행 의존성**: 위 변경 적용 후 수행  
   - **이유**: Reset/Continue/Reload의 체감 회귀를 수동 시나리오로 확인(Behavior Preservation)

---

## 생성된 파일 목록

### 코드 품질 개선(Q)

- `vibe/refactors/RU-004-Q4.md`
- `vibe/refactors/RU-004-Q1.md`
- `vibe/refactors/RU-004-Q5.md`

### 안정성 확보(S)

- `vibe/refactors/RU-004-S1.md`
- `vibe/refactors/RU-004-S2.md`
- `vibe/refactors/RU-004-S3.md`

### 기술 부채 해결(T)

- (없음)

---

## 카테고리별 분포

- 코드 중복(Q1): 1
- 네이밍(Q2): 0
- 복잡도(Q3): 0
- 모듈 설계(Q4): 1
- 하드코딩(Q5): 1
- 잠재적 오류(S1): 1
- 엣지 케이스(S2): 1
- 수동 검증 시나리오(S3): 1
- 회기 기록 부채(T1): 0

