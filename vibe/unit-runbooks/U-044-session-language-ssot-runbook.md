# U-044[Mvp] 세션 언어 SSOT(토글=리셋) 실행 가이드

## 1. 개요

한 화면에서 ko/en이 섞여 보이는 문제(혼합 출력)를 프론트엔드 관점에서 재발 방지하기 위해,
**세션 언어를 SSOT로 고정**하고(언어 전환은 "리셋/새 세션"로만 허용), 시스템/폴백 메시지의 하드코딩·드리프트를 제거했습니다.

**예상 소요 시간**: 10분

**의존성**:

- 의존 유닛: U-015 (SaveGame/Reset/프로필 선택), U-039 (i18n JSON 리소스), U-043 (서버 측 언어 게이트)
- 선행 완료 필요: 위 유닛들의 런북 실행 완료 (SaveGame 저장/로드 정상 동작)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
cd frontend && pnpm install
```

### 2.2 개발 서버 시작

```bash
# 프론트엔드 개발 서버 (포트 8001)
cd frontend && pnpm dev
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- **프로필 선택 화면**이 표시됨
- **우측 상단에 언어 토글 버튼(🌐 한국어)** 이 표시됨
- 성공 지표: 언어 토글 버튼 클릭 시 "🌐 English" ↔ "🌐 한국어" 전환

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 프로필 선택 화면에서 언어 변경

**목적**: profile_select에서만 언어 변경이 가능한지 검증

**실행**:

1. 브라우저에서 `http://localhost:8001` 접속
2. 우측 상단 **🌐 한국어** 버튼 클릭
3. UI가 **🌐 English**로 변경되고 전체 UI가 영어로 전환됨
4. 프로필 카드의 이름/설명이 영어로 표시됨

**기대 결과**:

- 언어 토글 즉시 반영
- 모든 UI 텍스트가 선택된 언어로 일관되게 표시
- **혼합 출력 없음** (한글과 영어가 섞이지 않음)

**확인 포인트**:

- ✅ 프로필 카드 이름: "Narrator" / "Explorer" / "Tech Expert"
- ✅ 타이틀: "Select Your Profile"
- ✅ 힌트: "Each profile has different starting conditions..."

---

### 시나리오 B: 언어 선택 후 게임 시작 (SSOT 검증)

**목적**: 선택한 언어가 SaveGame에 저장되고 TurnInput에 반영되는지 검증

**실행**:

1. 프로필 선택 화면에서 **🌐 English** 선택
2. **Explorer** 프로필 클릭하여 게임 시작
3. 개발자 도구(F12) → Network 탭 열기
4. 명령어 입력창에 "look around" 입력 후 실행
5. `/api/turn` 요청의 Request Payload 확인

**기대 결과**:

```json
{
  "language": "en-US",
  "text": "look around",
  ...
}
```

**확인 포인트**:

- ✅ TurnInput.language가 "en-US"로 고정됨
- ✅ 서버 응답(TurnOutput)의 narrative가 영어로 반환됨
- ✅ UI 전체가 영어로 일관됨

---

### 시나리오 C: 게임 중 언어 토글 불가 확인

**목적**: playing 상태에서 언어 토글 UI가 없는지 검증 (토글=리셋 정책)

**실행**:

1. 프로필 선택 후 게임 시작
2. 헤더 영역 확인
3. 언어 토글 버튼이 **표시되지 않음** 확인

**기대 결과**:

- 게임 플레이 화면에는 언어 토글 버튼 없음
- 언어 변경하려면 "프로필 변경" 버튼을 통해 profile_select로 돌아가야 함

**확인 포인트**:

- ✅ 헤더에 언어 토글 버튼 없음
- ✅ "프로필 변경" 버튼 클릭 → profile_select 화면 → 언어 토글 가능

---

### 시나리오 D: 세이브 게임 복원 시 언어 동기화

**목적**: Continue 시 SaveGame.language가 i18n에 반영되는지 검증

**실행**:

1. 영어(en-US)로 게임 시작 후 몇 턴 진행
2. 브라우저 새로고침 (F5)
3. "Continue Saved Game" 버튼 클릭
4. UI 언어 확인

**기대 결과**:

- 게임 복원 후 UI가 **영어(en-US)**로 유지됨
- TurnInput.language도 "en-US"로 고정됨

**확인 포인트**:

- ✅ 복원 후 UI 언어 일관성 유지
- ✅ 혼합 출력 없음

---

### 시나리오 E: 네트워크 에러 시 i18n 메시지 확인

**목적**: 클라이언트 폴백 메시지가 현재 세션 언어로 표시되는지 검증

**실행**:

1. 백엔드 서버 중지 (또는 Network 탭에서 Offline 모드 설정)
2. 명령어 입력 후 실행
3. 에러 메시지 확인

**기대 결과 (한국어 세션)**:

- `[시스템] 서버 연결에 실패했습니다. 다시 시도해 주세요.`

**기대 결과 (영어 세션)**:

- `[System] Failed to connect to server. Please try again.`

**확인 포인트**:

- ✅ 에러 메시지가 현재 세션 언어로 표시됨
- ✅ 영어 하드코딩 메시지가 한국어 세션에서 노출되지 않음

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 브라우저 콘솔(F12)에서 `[TurnStream]` 관련 로그 확인
- 에러 발생 시 `[i18n] Missing translation key` 경고 없어야 함

### 4.2 성공/실패 판단 기준

**성공**:

- ✅ 프로필 선택 화면에서만 언어 토글 가능
- ✅ 게임 시작 후 TurnInput.language가 세션 언어로 고정됨
- ✅ 세이브 게임 복원 시 언어 동기화됨
- ✅ 에러/폴백 메시지가 세션 언어로 표시됨
- ✅ 화면 어디에서도 ko/en 혼합 출력 없음

**실패 시 확인**:

- ❌ 혼합 출력 발생 → TurnInput.language와 i18n 언어 불일치 확인
- ❌ 에러 메시지가 영어로만 표시 → turnStream.ts의 ERROR_MESSAGES 확인
- ❌ 언어 토글이 게임 중에도 표시 → App.tsx의 gamePhase 조건 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 언어 토글 버튼이 표시되지 않음

- **원인**: DemoProfileSelect에 `onLanguageChange` prop이 전달되지 않음
- **해결**: App.tsx에서 `onLanguageChange={handleLanguageChange}` 확인

**오류**: 게임 복원 후 언어가 이전과 다름

- **원인**: SaveGame.language가 제대로 저장/복원되지 않음
- **해결**: localStorage의 `unknown_world_savegame` 확인, `sessionLifecycle.continueSession` 로직 확인

**오류**: TurnInput.language가 계속 변경됨

- **원인**: getResolvedLanguage() 직접 호출 잔재
- **해결**: turnRunner.ts에서 language 주입 방식 확인

### 5.2 환경별 주의사항

- **Windows/macOS/Linux**: 동일하게 동작
- **시크릿 모드**: localStorage 접근 불가 시 세션 내 메모리만으로 동작

---

## 6. 다음 단계

- CP-MVP-05/CP-MVP-03에서 "언어 혼합 없음"을 UI까지 포함해 재현 가능하게 검증
- 이후 헤더에 언어 토글을 넣더라도(PRD 9.0/10.2), 혼합 출력 없이 안전하게 동작하는 정책(토글=리셋)이 적용됨
