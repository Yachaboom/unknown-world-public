# U-132[Mvp]: 영어(en-US) 기본 언어 전환 — Devpost 제출 요건 대응

## 메타데이터

| 항목      | 내용                                                   |
| --------- | ------------------------------------------------------ |
| Unit ID   | U-132[Mvp]                                             |
| Phase     | MVP                                                    |
| 예상 소요 | 25분                                                   |
| 의존성    | U-099[Mvp]                                             |
| 우선순위  | High (Devpost 제출 요건 "English language" 필수 대응)  |

## 작업 목표

프론트엔드의 **기본 언어(DEFAULT_LANGUAGE)**를 `ko-KR`에서 `en-US`로 전환하여, 첫 접속 시(LocalStorage에 언어 설정이 없는 경우) **영어로 시작**하도록 한다. 이는 Devpost 해커톤 제출 요건 *"The Application must, at a minimum, support English language use"*에 대한 직접적 대응이며, 심사자가 별도 설정 없이 즉시 영어로 게임을 체험할 수 있게 한다.

**배경**: 현재 `frontend/src/i18n.ts`에서 `DEFAULT_LANGUAGE`가 `ko-KR`로 고정되어 있어, 첫 접속 시 한국어로 시작한다. 심사자(대부분 영어권)가 직접 언어 전환을 해야 하는 불편이 있고, 언어 전환 시 세션이 리셋되므로(U-044 정책) 이미 진행한 데모가 초기화되는 문제도 있다. 기본 언어를 영어로 설정하면 심사자 접근성이 크게 개선된다.

**완료 기준**:

- `frontend/src/i18n.ts`의 `DEFAULT_LANGUAGE`가 `'en-US'`로 변경됨
- LocalStorage에 언어 설정이 없는 상태에서 첫 접속 시 **영어 UI/내러티브**로 시작
- 이전에 `ko-KR`로 설정한 사용자는 LocalStorage 설정이 유지되어 한국어로 계속 사용 가능
- 프로필 선택 화면, 환영 메시지, 게임 내러티브 모두 영어로 표시
- 데모 프로필 3종의 초기 퀘스트/규칙/인벤토리 라벨이 영어 i18n 키로 정상 표시
- 언어 토글(ko↔en)이 기존과 동일하게 동작 (전환 시 세션 리셋)

## 영향받는 파일

**수정**:

- `frontend/src/i18n.ts` - `DEFAULT_LANGUAGE` 값 변경: `'ko-KR'` → `'en-US'`

**참조**:

- `frontend/src/save/sessionLifecycle.ts` - `getInitialSessionLanguage()` — `DEFAULT_LANGUAGE` 사용처
- `frontend/src/locales/en-US/translation.json` - 영어 번역 키 완성도 확인
- `vibe/unit-results/U-099[Mvp].md` - 거래 장부 i18n 혼합 출력 수정 (영어 모드 품질 의존)
- `vibe/unit-results/U-044[Mvp].md` - 세션 언어 SSOT (언어 전환=리셋 정책)

## 구현 흐름

### 1단계: DEFAULT_LANGUAGE 변경

- `frontend/src/i18n.ts`에서:
  ```typescript
  // 변경 전
  export const DEFAULT_LANGUAGE: SupportedLanguage = 'ko-KR';
  // 변경 후
  export const DEFAULT_LANGUAGE: SupportedLanguage = 'en-US';
  ```
- 주석도 업데이트: "데모 일관성을 위해 ko-KR 고정" → "Devpost 제출 요건 대응을 위해 en-US 기본"

### 2단계: 영어 번역 키 완성도 확인

- `frontend/src/locales/en-US/translation.json`의 모든 키가 빠짐없이 영어로 번역되어 있는지 확인
- 누락된 키가 있으면 보충 (특히 U-129 판매 UI, U-130 재시도 UI 관련 키)
- i18next의 `fallbackLng` 동작 확인: en-US 키 누락 시 ko-KR로 폴백되므로 혼합 출력 위험 → 누락 방지

### 3단계: 데모 프로필 영어 표시 검증

- 프로필 선택 화면: 3종 프로필의 이름/설명이 영어로 표시
- 게임 시작: 환영 메시지(welcomeMessageKey)가 영어로 표시
- 퀘스트/규칙/인벤토리: 라벨이 영어로 표시
- 거래 장부: 항목이 영어로 일관되게 표시 (U-099 완료 전제)

### 4단계: 검증

- LocalStorage 클리어 후 첫 접속 → 영어 UI 확인
- LocalStorage에 `ko-KR` 저장된 상태 → 한국어 유지 확인
- 영어 → 한국어 전환 시 세션 리셋 정상 동작 확인
- 한국어 → 영어 전환 시 세션 리셋 정상 동작 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-099[Mvp]](../unit-results/U-099[Mvp].md) - 거래 장부 i18n 혼합 출력 수정 (영어 모드 품질 기반)
- **결과물**: [U-044[Mvp]](../unit-results/U-044[Mvp].md) - 세션 언어 SSOT (언어 전환=리셋)

**다음 작업에 전달할 것**:

- U-119[Mmp]: WIG 폴리시에서 영어 UI 기본 상태로 최종 점검
- U-121[Mmp]: 제출 문서(README)에 "기본 영어, 한국어 전환 지원" 명시
- CP-SUB-01: 해커톤 제출 요건 "English language" 충족 확인

## 주의사항

**기술적 고려사항**:

- (RULE-006) 언어 정책은 세션 SSOT(U-044)를 따르므로, DEFAULT_LANGUAGE 변경은 **LocalStorage에 설정이 없는 경우에만** 영향
- (PRD 3.1) 혼합 출력 방지: `en-US` 기본 상태에서 모든 시스템 메시지/내러티브/UI가 영어로 일관되는지 확인 필수
- `i18n.init()`의 `lng` 파라미터는 `getInitialSessionLanguage()`가 결정하므로, DEFAULT_LANGUAGE 변경만으로 동작함 — 별도 초기화 로직 수정 불필요
- 한국어 사용자를 위해 **언어 토글은 프로필 선택 화면에서 여전히 제공** (기존 동작 유지)

**잠재적 리스크**:

- 영어 번역 키가 누락된 곳에서 ko-KR 폴백이 발생하면 **ko/en 혼합 출력** 위험 → `en-US/translation.json` 키 완성도를 반드시 확인
- 기존 한국어 사용자의 LocalStorage 설정이 유지되므로 영향 없음, 하지만 개발 환경에서 테스트 시 LocalStorage 클리어 필요

## 페어링 질문 (결정 필요)

- [x] **Q1**: 기본 언어를 변경하는 범위는?
  - ✅ Option A: **DEFAULT_LANGUAGE만 변경** (1줄 수정, 최소 범위)
  - Option B: 브라우저 `navigator.language` 감지 후 자동 선택 (복잡도 증가, MVP에서 불필요)

- [x] **Q2**: 한국어 사용자를 위한 추가 조치는?
  - ✅ Option A: **없음** — 언어 토글로 전환 가능 (기존 동작, 권장)
  - Option B: 프로필 선택 화면에 "🇰🇷 한국어로 플레이" 버튼 추가 (추가 UI 작업)

## 참고 자료

- `frontend/src/i18n.ts` - 현재 DEFAULT_LANGUAGE 정의
- `frontend/src/save/sessionLifecycle.ts` - 언어 초기화 로직
- `vibe/unit-results/U-099[Mvp].md` - i18n 혼합 출력 수정
- `vibe/unit-results/U-044[Mvp].md` - 세션 언어 SSOT
- Devpost 제출 요건: "The Application must, at a minimum, support English language use."
