# U-132[Mvp] 영어(en-US) 기본 언어 전환 실행 가이드

## 1. 개요

프론트엔드의 기본 언어(DEFAULT_LANGUAGE)를 `ko-KR`에서 `en-US`로 전환하여, LocalStorage에 언어 설정이 없는 첫 접속 시 **영어로 시작**하도록 변경하였습니다. Devpost 제출 요건 *"The Application must, at a minimum, support English language use"*에 직접 대응합니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-099[Mvp] (거래 장부 i18n 혼합 출력 수정), U-044[Mvp] (세션 언어 SSOT)
- 선행 완료 필요: 없음 (의존 유닛 모두 완료)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
pnpm -C frontend install
```

### 2.2 즉시 실행

```bash
pnpm -C frontend dev
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- 성공 지표: 프로필 선택 화면이 **영어**로 표시됨 ("SELECT YOUR PROFILE")

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 첫 접속 시 영어 기본 UI

**목적**: LocalStorage에 언어 설정이 없는 상태에서 영어 UI가 표시되는지 검증

**실행**:

1. 브라우저 DevTools > Application > Local Storage > `http://localhost:8001` 에서 모든 항목 삭제
2. 페이지 새로고침 (F5)

**기대 결과**:

- 프로필 선택 화면: "SELECT YOUR PROFILE"
- 프로필 이름: "Narrator", "Explorer", "Tech Expert"
- 언어 변경 버튼: "Change Language"
- 하단 힌트: "Each profile has different starting conditions and objectives"

**확인 포인트**:

- ✅ 화면의 모든 텍스트가 영어로 표시
- ✅ 한국어 텍스트가 전혀 없음

---

### 시나리오 B: 기존 한국어 사용자 설정 유지

**목적**: 이전에 ko-KR로 설정한 사용자의 언어가 유지되는지 검증

**실행**:

1. DevTools Console에서 실행: `localStorage.setItem('unknown_world_language', 'ko-KR')`
2. 페이지 새로고침 (F5)

**기대 결과**:

- 프로필 선택 화면: "프로필을 선택하세요"
- 프로필 이름: "서사꾼", "탐험가", "기술 전문가"

**확인 포인트**:

- ✅ LocalStorage의 ko-KR 설정이 우선 적용됨
- ✅ 기존 한국어 사용자 경험에 영향 없음

---

### 시나리오 C: 영어 모드 게임 내 전체 UI 검증

**목적**: 영어 모드에서 게임 내 모든 패널이 영어로 표시되는지 검증

**전제 조건**:

- LocalStorage에 `unknown_world_language` 키가 없는 상태 (첫 접속)

**실행**:

1. `http://localhost:8001` 접속 (LocalStorage 클리어 상태)
2. "Narrator" 프로필 클릭

**기대 결과**:

| 패널 | 확인 항목 |
|------|-----------|
| Header | "Reset", "Change Profile", "Signal: 200", "ONLINE" |
| Inventory | "Ancient Tome", "Quill Pen", "Memory Fragment", "Sell" 버튼 |
| Quest | "Discover the World's Origin", "Collect 3 Memory Fragments" |
| Rule Board | "Flow of Time", "Memory Persistence" |
| Agent Console | "IDLE", "QUEUE", "WAITING...", "BADGES" |
| Economy HUD | "SIGNAL", "SHARD", "RESOURCE LOG", "[ NO HISTORY ]" |
| Narrative | "Welcome to the Ancient Library..." |
| Action Deck | "EXPLORE", "INVESTIGATE", "TALK" |
| Command Input | "Enter command...", "EXECUTE" |

**확인 포인트**:

- ✅ 모든 패널이 영어로 일관되게 표시
- ✅ ko/en 혼합 출력 없음 (RULE-006)

---

### 시나리오 D: 언어 토글 양방향 동작

**목적**: 프로필 선택 화면에서 언어 토글이 양방향으로 정상 동작하는지 검증

**실행**:

1. LocalStorage 클리어 후 `http://localhost:8001` 접속 (영어)
2. "Change Language" 버튼 클릭 → 한국어로 전환
3. "언어 변경" 버튼 다시 클릭 → 영어로 재전환

**결과 비교**:

| 항목 | 1단계 (영어) | 2단계 (한국어) | 3단계 (영어) |
|------|-------------|---------------|-------------|
| 타이틀 | SELECT YOUR PROFILE | 프로필을 선택하세요 | SELECT YOUR PROFILE |
| 프로필1 | Narrator | 서사꾼 | Narrator |
| 버튼 | Change Language | 언어 변경 | Change Language |

**확인 포인트**:

- ✅ 언어 토글이 즉시 UI에 반영
- ✅ 토글 후 프로필 선택 시 해당 언어로 게임 시작
- ✅ 세션 리셋 정책 동작 (U-044)

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:

- ✅ LocalStorage 비어있을 때 영어 UI로 시작
- ✅ LocalStorage에 ko-KR 저장 시 한국어 유지
- ✅ 게임 내 모든 UI/인벤토리/퀘스트/규칙이 영어로 일관 표시
- ✅ 언어 토글 양방향 정상 동작

**실패 시 확인**:

- ❌ 영어 대신 한국어로 시작 → `frontend/src/i18n.ts`의 `DEFAULT_LANGUAGE` 값 확인
- ❌ 한국어 설정이 유지되지 않음 → `resolveInitialLanguage()` 함수의 LocalStorage 읽기 로직 확인
- ❌ 일부 텍스트가 한국어로 표시 → `en-US/translation.json`에 누락된 키가 있는지 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 첫 접속인데도 한국어로 표시됨

- **원인**: LocalStorage에 이전 `unknown_world_language` 값이 남아있음
- **해결**: DevTools > Application > Local Storage에서 해당 키 삭제 후 새로고침

**오류**: 일부 UI 텍스트가 i18n 키로 표시됨 (예: `economy.ledger_reason.xxx`)

- **원인**: en-US/translation.json에 해당 키가 누락됨
- **해결**: ko-KR/translation.json과 대조하여 누락된 키 보충

### 5.2 환경별 주의사항

- **시크릿/프라이빗 모드**: localStorage 접근이 제한될 수 있으며, 이 경우 항상 DEFAULT_LANGUAGE(en-US)로 시작
- **기존 개발자**: 이전 테스트로 localStorage에 ko-KR이 저장되어 있을 수 있으므로, 테스트 전 LocalStorage 클리어 필요
