# U-099[Mvp]: 거래 장부(Resource Log) 버그 수정 - i18n 언어 혼합 + 하단 여백 과다

## 메타데이터

| 항목      | 내용                                                              |
| --------- | ----------------------------------------------------------------- |
| Unit ID   | U-099[Mvp]                                                        |
| Phase     | MVP                                                               |
| 예상 소요 | 30분                                                              |
| 의존성    | U-042[Mvp], U-044[Mvp]                                           |
| 우선순위  | Medium (데모 체감 저하 + i18n 정책 위반)                          |

## 작업 목표

거래 장부(Resource Log / Economy HUD 내 ledger 목록)의 **두 가지 버그를 수정**한다: (1) 영문(en-US) 모드에서도 거래 장부 항목이 **한국어로 표시되는 i18n 혼합 출력** 문제, (2) 거래 장부 내용이 적을 때(높이가 짧을 때) **하단 스크롤 여백이 과도하게 남는** CSS 레이아웃 이슈.

**배경**: U-042에서 용어를 "거래 장부(Resource Log)"로 통일하고, U-044에서 세션 언어 SSOT를 구현했으나, 거래 장부에 기록되는 항목(ledger entry)의 `description`/`label` 텍스트가 **이전 세션(다른 언어)의 로그를 그대로 유지**하거나, **서버 응답의 economy cost 설명이 세션 언어를 반영하지 않아** 영문 세션에서도 한국어 텍스트가 표시된다. 또한 Economy HUD의 거래 장부 영역은 카드 내부 스크롤(PRD 9.3)을 적용하고 있으나, 내용이 적을 때 `min-height`/`flex-grow` 설정으로 인해 빈 여백이 과도하게 남아 시각적으로 어색하다.

**완료 기준**:

- 영문(en-US) 모드에서 거래 장부의 모든 항목이 영어로 표시된다(한국어 텍스트 혼합 없음).
- 한국어(ko-KR) 모드에서 거래 장부의 모든 항목이 한국어로 표시된다.
- 언어 전환(세션 리셋) 후 이전 세션의 거래 장부 로그가 남지 않는다.
- 거래 장부 내용이 적을 때(항목 0~3개) 하단에 과도한 빈 여백이 표시되지 않는다.
- 거래 장부 내용이 많을 때(항목 10개 이상) 카드 내부 스크롤이 정상 동작한다.

## 영향받는 파일

**수정**:

- `frontend/src/components/EconomyHud.tsx` - 거래 장부 항목의 텍스트가 세션 언어를 반영하도록 수정 + 하단 여백 과다 해소를 위한 CSS/레이아웃 조정
- `frontend/src/style.css` (또는 관련 CSS) - Economy HUD 거래 장부 영역의 `min-height`/`flex-grow`/`padding-bottom` 조정
- `frontend/src/stores/economyStore.ts` - (필요 시) ledger entry의 텍스트가 i18n 키 기반인지, 하드코딩된 텍스트인지 확인 및 수정
- `frontend/src/save/sessionLifecycle.ts` - (필요 시) 언어 전환 리셋 시 economyLedger가 완전히 초기화되는지 확인

**참조**:

- `vibe/unit-plans/U-042[Mvp].md` - 용어/카피 정리(거래 장부)
- `vibe/unit-plans/U-044[Mvp].md` - 세션 언어 SSOT
- `vibe/prd.md` §9.3 - 레이아웃/스크롤 설계 원칙(카드 내부 스크롤)

## 구현 흐름

### 1단계: i18n 혼합 출력 원인 분석

- `economyStore.ts`의 ledger entry 구조를 확인한다: `description`/`label`이 하드코딩된 텍스트인지, i18n 키인지 파악한다.
- 서버(TurnOutput.economy.cost) 응답의 설명 텍스트가 세션 언어에 맞게 생성되는지 확인한다.
- 이전 세션의 ledger가 새 세션에서 그대로 남는지 확인한다(sessionLifecycle.ts의 reset 경로).

### 2단계: ledger 항목 i18n 정합 수정

- ledger entry의 `description`이 하드코딩 문자열이면 i18n 키로 전환하거나, 서버 응답을 세션 언어에 맞게 생성하도록 수정한다.
- 세션 리셋(언어 전환 포함) 시 `economyStore.reset()`이 ledger를 완전히 비우는지 확인하고, 미비하면 보강한다.
- 프로필 시작 시 초기 ledger는 빈 배열(`[]`)이어야 한다(이전 세션 잔재 제거).

### 3단계: 하단 여백 과다 CSS 수정

- Economy HUD의 거래 장부 컨테이너의 CSS를 조정한다:
  - `min-height`를 제거하거나 작은 값으로 줄인다.
  - `flex-grow: 1`이 불필요하게 빈 공간을 확장하지 않도록 `flex-shrink`/`max-height` 조합을 조정한다.
  - 내용이 없을 때는 최소 높이만 유지하고, 내용이 많을 때만 스크롤이 활성화되도록 한다.
- 수정 후 다양한 항목 수(0, 3, 10, 20개)에서 레이아웃이 정상인지 확인한다.

### 4단계: 검증

- `en-US` 모드에서 턴 진행 후 거래 장부에 영어만 표시되는지 확인한다.
- `ko-KR` → `en-US` 언어 전환(리셋) 후 이전 한국어 로그가 남지 않는지 확인한다.
- 거래 장부 항목이 적을 때/많을 때 하단 여백이 적절한지 확인한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-042[Mvp]](../unit-results/U-042[Mvp].md) - 용어/카피 정리(거래 장부 명칭 통일)
- **결과물**: [U-044[Mvp]](../unit-results/U-044[Mvp].md) - 세션 언어 SSOT(언어 전환=리셋)

**다음 작업에 전달할 것**:

- CP-MVP-03: 데모 루프에서 "영문 모드 거래 장부 정합성" 검증 항목
- U-113[Mmp]: 세션 상태 영속성에서 ledger 복원 시 언어 정합 전제

## 주의사항

**기술적 고려사항**:

- (RULE-005) 거래 장부의 금액/잔액 값은 정확해야 하며, 텍스트 수정이 금액 로직에 영향을 주지 않아야 한다.
- (RULE-006) 거래 장부 항목의 모든 사용자 노출 텍스트는 i18n 키 기반이어야 한다.
- (PRD 9.3) 카드 내부 스크롤 원칙: 잔액/비용은 항상 보이고, 긴 ledger 목록만 카드 내부 스크롤로 처리한다.
- 서버 응답의 `economy.cost` 설명이 `TurnInput.language`를 반영하는지 확인 필요. 미반영이면 프론트에서 i18n 키 기반으로 매핑하는 것이 안전하다.

**잠재적 리스크**:

- ledger entry의 `description`을 i18n 키로 전환하면 기존 SaveGame에 저장된 하드코딩 문자열과 호환이 깨질 수 있음 → SaveGame 로드 시 하드코딩 문자열은 그대로 표시하고, 신규 항목만 i18n 키 적용으로 점진적 마이그레이션 가능.
- CSS 수정 시 다른 EconomyHud 영역(잔액/비용 표시)의 레이아웃에 영향을 줄 수 있음 → 수정 범위를 거래 장부 컨테이너로 한정한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: ledger entry의 `description`을 i18n 키 기반으로 전환할까, 아니면 서버 응답 텍스트를 그대로 사용할까?
  - Option A: 프론트에서 action type별 i18n 키 매핑 (예: `economy.cost.turn` → "턴 진행 비용" / "Turn cost")
  - Option B: 서버 응답의 description을 세션 언어에 맞게 생성하도록 백엔드 수정
  - Option C: 혼합 방식 - 프론트에서 i18n 키를 우선 시도하고, 매핑 실패 시 서버 텍스트 폴백

## 참고 자료

- `vibe/unit-plans/U-042[Mvp].md` - 용어/카피 정리
- `vibe/unit-plans/U-044[Mvp].md` - 세션 언어 SSOT
- `vibe/prd.md` §9.3 - 레이아웃/스크롤 설계 원칙
- `frontend/src/components/EconomyHud.tsx` - 현재 거래 장부 UI 구현
