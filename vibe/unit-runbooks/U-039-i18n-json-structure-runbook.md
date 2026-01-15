# U-039[Mvp] i18n JSON 구조 도입 실행 가이드

## 1. 개요

프론트 UI/시스템 문구를 **i18n 키 기반**으로 정리하고, 언어 리소스를 **JSON 파일 구조**(`ko-KR`, `en-US`)로 분리하여 한/영 + 추후 언어 확장이 "파일 추가"만으로 가능해지도록 기반을 구축했습니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-004[Mvp]
- 선행 완료 필요: U-004(CRT 테마/고정 레이아웃) 완료 후 진행

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치
pnpm install
```

### 2.2 즉시 실행

```bash
# 개발 서버 실행 (RULE-011: 포트 8001)
pnpm dev --port 8001
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- 성공 지표:
  - 한국어 UI 문자열이 정상 표시됨
  - 콘솔에 i18n 누락 키 경고가 없음

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 한국어(ko-KR) 기본 표시 확인

**목적**: 기본 언어(ko-KR)로 모든 UI 문자열이 올바르게 표시되는지 검증

**실행**:
1. 브라우저에서 `http://localhost:8001` 접속
2. 개발자 도구 콘솔 열기 (F12)

**확인 포인트**:
- ✅ Header의 재화 라벨: "Signal:", "Shard:"
- ✅ 연결 상태: "온라인" (초록색 인디케이터)
- ✅ 패널 타이틀: "Inventory", "Quest", "Rule Board", "Agent Console", "Memory Pin", "Scanner"
- ✅ 패널 placeholder: "[ 드래그 앤 드롭 영역 ]", "[ 목표/퀘스트 목록 ]" 등
- ✅ Agent Console 라벨: "대기열", "검증 배지", "자동 복구"
- ✅ Agent Console 상태: "대기 중" (IDLE 상태)
- ✅ 커맨드 입력 placeholder: "명령을 입력하세요..."
- ✅ 실행 버튼: "실행"
- ✅ 환영 메시지: "미지의 세계에 오신 것을 환영합니다..."
- ✅ 액션 카드: "탐색하기", "조사하기", "대화하기"
- ✅ 콘솔에 `[i18n] Missing translation key:` 경고가 없음

### 시나리오 B: 영어(en-US) 폴백 및 전환 확인 (개발자 콘솔)

**목적**: 영어 리소스가 올바르게 로드되는지 검증

**실행**:
브라우저 개발자 콘솔에서 실행:

```javascript
// 현재 언어 확인
console.log('현재 언어:', i18next.resolvedLanguage);

// 영어로 전환
await i18next.changeLanguage('en-US');
console.log('변경 후 언어:', i18next.resolvedLanguage);
```

**확인 포인트**:
- ✅ 언어 전환 시 UI가 영어로 변경됨
- ✅ 재화 라벨: "Signal:", "Shard:"
- ✅ 연결 상태: "ONLINE"
- ✅ 패널 placeholder: "[ Drag & Drop Area ]", "[ Objectives / Quest List ]" 등
- ✅ Agent Console 상태: "IDLE"
- ✅ 커맨드 입력 placeholder: "Enter command..."
- ✅ 실행 버튼: "EXECUTE"
- ✅ 환영 메시지: "Welcome to the Unknown World..."
- ✅ 액션 카드: "Explore", "Investigate", "Talk"

**한국어로 복원**:

```javascript
await i18next.changeLanguage('ko-KR');
```

### 시나리오 C: JSON 리소스 파일 구조 확인

**목적**: JSON 리소스 파일이 올바르게 구성되었는지 검증

**실행**:

```bash
# 파일 구조 확인
ls -la frontend/src/locales/

# 한국어 리소스 내용 확인
cat frontend/src/locales/ko-KR/translation.json | head -30

# 영어 리소스 내용 확인
cat frontend/src/locales/en-US/translation.json | head -30
```

**확인 포인트**:
- ✅ `frontend/src/locales/ko-KR/translation.json` 존재
- ✅ `frontend/src/locales/en-US/translation.json` 존재
- ✅ `frontend/src/locales/README.md` 존재
- ✅ JSON 키 구조가 도메인.섹션.항목 형태

### 시나리오 D: i18n.ts 정합화 확인

**목적**: i18n 초기화 코드가 BCP-47 언어 코드를 올바르게 사용하는지 검증

**실행**:
브라우저 개발자 콘솔에서 실행:

```javascript
// 지원 언어 확인
console.log('지원 언어:', i18next.options.supportedLngs);

// 기본 언어 확인
console.log('기본 언어:', i18next.options.lng);

// 폴백 언어 확인
console.log('폴백 언어:', i18next.options.fallbackLng);
```

**기대 결과**:
```
지원 언어: ['ko-KR', 'en-US']
기본 언어: ko-KR
폴백 언어: en-US
```

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 개발 모드에서 누락된 키가 있으면 콘솔에 `[i18n] Missing translation key: "..."` 경고 출력
- 정상 동작 시 경고 없음

### 4.2 생성 파일

| 파일 경로 | 목적 |
|-----------|------|
| `frontend/src/locales/ko-KR/translation.json` | 한국어 리소스 (SSOT) |
| `frontend/src/locales/en-US/translation.json` | 영어 리소스 (SSOT) |
| `frontend/src/locales/README.md` | 언어 파일 구조/키 규칙/추가 절차 문서 |

### 4.3 수정 파일

| 파일 경로 | 변경 내용 |
|-----------|-----------|
| `frontend/src/i18n.ts` | JSON 리소스 import, 언어 코드 정합화 (ko→ko-KR, en→en-US) |
| `frontend/src/App.tsx` | 하드코딩 문자열을 `t()` 키 기반으로 전환 |
| `frontend/src/components/AgentConsole.tsx` | 라벨/상태 문자열을 `t()` 키 기반으로 전환 |

### 4.4 성공/실패 판단 기준

**성공**:
- ✅ 한국어 UI가 올바르게 표시됨
- ✅ 영어 전환 시 모든 문자열이 영어로 변경됨
- ✅ 콘솔에 i18n 경고가 없음
- ✅ 린트/타입 체크 통과

**실패 시 확인**:
- ❌ 일부 문자열이 키 이름으로 표시됨 → JSON 파일에 해당 키 추가 필요
- ❌ 빌드 에러 → JSON 파일 문법 오류 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `[i18n] Missing translation key: "some.key"`

- **원인**: JSON 리소스 파일에 해당 키가 없음
- **해결**: `frontend/src/locales/{lang}/translation.json`에 키 추가

**오류**: TypeScript 타입 에러 - JSON import 관련

- **원인**: TypeScript가 JSON 모듈을 인식하지 못함
- **해결**: `tsconfig.json`에 `"resolveJsonModule": true` 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 이슈 없음 (Vite가 처리)
- **macOS/Linux**: 동일하게 동작

---

## 6. 다음 단계

- **U-015(SaveGame)**: `language` 저장/복원 시 UI i18n 언어 동기화
- **U-036(프롬프트 ko/en 분리)**: 프롬프트 완료 후 UI 언어 토글을 사용자에게 노출
