# U-042[Mvp]: 용어/카피 정리 - 원장→거래 장부, Ledger→Resource Log 등 게임 친화 용어 통일

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-042[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-014,U-039 |
| 우선순위  | High        |

## 작업 목표

UI/문서에서 “대중적이지 않거나(과도하게 기술적/관료적)”, 또는 “언어가 어색하게 섞이는” 용어를 **게임 친화적인 표현**으로 통일한다. 대표적으로 `원장(ledger)`을 **거래 장부**, `Ledger`를 **Resource Log**로 바꿔 사용자가 직관적으로 이해할 수 있게 한다.

**배경**: Economy HUD/SaveGame/문서에서 `원장(ledger)` 같은 용어가 사용자에게는 낯설 수 있다. 또한 ko-KR 리소스에도 일부 영어 타이틀이 남아 있어(용어 혼용), “채팅이 아닌 게임 UI”의 몰입을 해칠 수 있다. i18n(키 기반) 체계(U-039)가 이미 마련되어 있으므로, 하드코딩 없이 “리소스 값 변경” 중심으로 정리한다.

**완료 기준**:

- ko-KR UI에서 `economy.ledger_*` 계열 라벨이 “원장”이 아닌 **거래 장부**로 표시된다.
- en-US UI에서 `economy.ledger_*` 계열 라벨이 “Ledger”가 아닌 **Resource Log**로 표시된다.
- PRD/로드맵 등 핵심 문서에서 “사용자 노출 용어”는 동일한 단어로 통일되고, 필요 시 내부 구현 용어(ledger)와의 매핑이 명시된다.

## 영향받는 파일

**수정**:

- `frontend/src/locales/ko-KR/translation.json` - `economy.ledger_title`, `economy.ledger_empty` 등 용어 교체(“원장” → “거래 장부”)
- `frontend/src/locales/en-US/translation.json` - `economy.ledger_title`, `economy.ledger_empty` 등 용어 교체(“Ledger” → “Resource Log”)
- (필요 시) `vibe/prd.md` - 용어(재화 거래 장부/Resource Log) 및 SaveGame 정책 문구 정합화
- (필요 시) `vibe/roadmap.md` - Economy/세이브 관련 용어 정합화

**참조**:

- `frontend/src/components/EconomyHud.tsx` - i18n 키 사용처(ledger_title/ledger_empty)
- `frontend/src/stores/economyStore.ts` - 내부 개념(ledger)과 사용자 노출 용어 분리 필요
- `vibe/prd.md` 5장 - Economy UX 요구(예상 비용/대안/로그 노출)

## 구현 흐름

### 1단계: 용어 매핑(SSOT) 정의

- 아래 매핑을 “사용자 노출(카피)” 기준으로 고정한다:
  - `원장` → `거래 장부` (ko-KR)
  - `Ledger` → `Resource Log` (en-US)
- 문서/코드에서 **내부 구현 용어(ledger)** 는 유지하되, UI에서는 위 매핑을 사용한다(리네이밍 폭발 방지).

### 2단계: i18n 리소스 값 교체(하드코딩 금지)

- `translation.json`에서 `economy.ledger_*` 관련 값을 교체한다.
- “혼합 출력 금지(RULE-006/007)”를 깨지 않도록, 한 화면에서 ko/en이 함께 보이는 케이스가 없는지 확인한다(특히 패널 타이틀/핵심 HUD).

### 3단계: 문서 동기화 + 회귀 방지

- PRD/로드맵에서 “사용자 노출 용어”가 동일하게 쓰이도록 정리하고, 필요하면 괄호로 내부 용어(ledger)만 짧게 남긴다.
- (권장) Economy HUD 관련 테스트(`EconomyHud.test.tsx`)가 특정 문자열을 단언한다면, i18n 키 기반 단언으로 유지하거나 번역값 변경에 맞춰 업데이트한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-014[Mvp]](U-014[Mvp].md) - Economy HUD/ledger 개념 및 UI 구조
- **계획서**: [U-039[Mvp]](U-039[Mvp].md) - i18n JSON 리소스 구조(키 기반)
- **결과물**: `frontend/src/locales/*/translation.json`, `EconomyHud`의 `t('economy.ledger_title')` 사용처

**다음 작업에 전달할 것**:

- 이후 유닛에서 신규 UI 문구 추가 시 “게임 친화 용어” 기준선(매핑) 유지
- SaveGame/엔딩 리포트 등에서 경제 로그를 사용자에게 노출할 때 “Resource Log/거래 장부” 용어로 일관되게 표현 가능

## 주의사항

**기술적 고려사항**:

- i18n 키 자체를 리네임하면 수정 범위가 급증한다 → MVP에서는 **키는 유지**하고 “번역 값”만 교체하는 전략을 우선한다.
- (RULE-006/007) ko/en 혼합 출력은 금지다. 특히 한국어 리소스에서 영어 타이틀/라벨이 남아 있는 영역은 “표면 중요도(critical)” 기준으로 우선 정리한다.

**잠재적 리스크**:

- 번역 값 변경이 테스트 스냅샷/문자열 단언을 깨뜨릴 수 있음 → 테스트는 키 기반/의미 단언으로 유지하고, 불가하면 변경된 번역 값에 맞춰 갱신한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: i18n 키 이름(예: `economy.ledger_title`)도 “Resource Log”에 맞춰 바꿀까?
  - Option A: 키는 유지하고 값만 교체(권장: 수정 범위 최소화) ✅
  - Option B: 키 자체를 리네임(정합성 ↑, 하지만 대규모 수정/회귀 위험 ↑)
  **A1**: Option A

## 참고 자료

- `frontend/src/locales/ko-KR/translation.json` - `economy.ledger_title: "최근 원장 이력"` (교체 대상)
- `frontend/src/locales/en-US/translation.json` - `economy.ledger_title: "Recent Ledger"` (교체 대상)
- `vibe/prd.md` - Economy/SaveGame 용어 및 정책
