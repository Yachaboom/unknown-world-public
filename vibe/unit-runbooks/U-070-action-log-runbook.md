# U-070[Mvp] 아이템-핫스팟 사용 시 액션 로그 출력 실행 가이드

## 1. 개요

인벤토리 아이템을 핫스팟에 드래그 앤 드롭하거나, 핫스팟을 클릭하거나, 액션 카드를 클릭할 때 **PRD 9.0에서 정의한 "행동 로그" 형식으로 NarrativeFeed에 즉각적인 피드백**이 표시되는 기능입니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-012[Mvp] (DnD 드롭 이벤트 처리 로직)
- 선행 완료 필요: U-012 런북 실행 완료

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
cd frontend
pnpm install
```

### 2.2 즉시 실행

```bash
cd frontend
pnpm run dev --port 8002
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8002` 접속
- 프로필 선택 화면에서 아무 프로필 선택 (예: "탐험가")
- 게임 화면으로 진입

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 액션 카드 클릭 → 액션 로그 표시

**목적**: 액션 카드 클릭 시 액션 로그가 NarrativeFeed에 표시되는지 확인

**실행**:
1. 게임 화면 하단의 Action Deck에서 "탐색하기" 또는 "조사하기" 카드 클릭

**기대 결과**:
- NarrativeFeed에 즉시 액션 로그 표시:
  - 한국어: `▶ 행동 실행: 탐색하기`
  - 영문: `▶ Action: Explore`
- 액션 로그는 다음 스타일로 구분됨:
  - 이탤릭체 (기울임꼴)
  - dim 색상 (흐린 녹색)
  - 왼쪽에 `▶` 아이콘
  - 왼쪽 테두리 (border-left)

**확인 포인트**:
- ✅ 액션 로그가 일반 내러티브와 시각적으로 구분됨
- ✅ 턴 라벨 `[TURN n]` 대신 `▶` 아이콘 표시
- ✅ 텍스트가 i18n 키 기반으로 올바른 언어로 표시됨

---

### 시나리오 B: 핫스팟 클릭 → 액션 로그 표시

**목적**: 씬 캔버스의 핫스팟 클릭 시 액션 로그가 표시되는지 확인

**실행**:
1. 씬 캔버스에서 핫스팟(예: "터미널" 또는 "문") 클릭

**기대 결과**:
- NarrativeFeed에 즉시 액션 로그 표시:
  - 한국어: `▶ 행동 실행: 터미널을(를) 조사한다`
  - 영문: `▶ Action: Examine Terminal`

**확인 포인트**:
- ✅ 핫스팟 라벨이 로그에 정확히 표시됨
- ✅ 액션 로그 스타일이 적용됨 (이탤릭, dim, 테두리)
- ✅ 클릭 즉시 로그가 표시됨 (TurnInput 전송 전)

---

### 시나리오 C: 아이템 → 핫스팟 드롭 → 액션 로그 표시

**목적**: 인벤토리 아이템을 핫스팟에 드롭할 때 액션 로그가 표시되는지 확인

**실행**:
1. 인벤토리 패널에서 아이템(예: "키카드 A") 드래그 시작
2. 씬 캔버스의 핫스팟(예: "터미널") 위로 이동
3. 핫스팟에 드롭

**기대 결과**:
- 드롭 즉시 NarrativeFeed에 액션 로그 표시:
  - 한국어: `▶ 행동 실행: 키카드 A을(를) 터미널에 사용한다`
  - 영문: `▶ Action: Use Keycard A on Terminal`

**확인 포인트**:
- ✅ 아이템명과 핫스팟명이 정확히 표시됨
- ✅ 드롭 즉시 로그가 표시됨 (서버 응답 전)
- ✅ 이후 서버 응답(내러티브)과 구분됨

---

### 시나리오 D: 드롭 실패 시 시스템 메시지

**목적**: 유효하지 않은 드롭 대상에서의 시스템 피드백 확인

**실행**:
1. 인벤토리에서 아이템 드래그
2. 핫스팟이 아닌 빈 영역에 드롭

**기대 결과**:
- NarrativeFeed에 시스템 메시지 표시
- 액션 로그는 표시되지 않음

**확인 포인트**:
- ✅ 시스템 메시지가 표시됨
- ✅ 액션 로그가 아닌 시스템 스타일로 표시됨
- ✅ 턴 실행이 트리거되지 않음

---

## 4. 실행 결과 확인

### 4.1 브라우저 DevTools 확인

**Elements 탭**:
- `.narrative-entry.action-log-entry` 클래스가 적용된 요소 확인
- `.action-log-icon` 요소에 `▶` 아이콘 확인

**Console 탭**:
- 에러 메시지 없음 확인

### 4.2 스타일 검증

액션 로그 엔트리의 CSS 스타일 확인:
```css
.action-log-entry {
  color: var(--text-dim);
  font-style: italic;
  padding-left: 1em;
  border-left: 2px solid var(--text-dim);
}
```

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 액션 카드 클릭 시 즉시 액션 로그 표시
- ✅ 핫스팟 클릭 시 즉시 액션 로그 표시
- ✅ 아이템 드롭 시 즉시 액션 로그 표시
- ✅ 액션 로그가 내러티브와 시각적으로 구분됨
- ✅ i18n 키 기반으로 ko/en 정확히 표시
- ✅ `▶` 아이콘이 턴 라벨 대신 표시됨

**실패 시 확인**:
- ❌ 로그가 표시되지 않음 → `appendActionLog` 호출 확인
- ❌ 스타일이 적용되지 않음 → `.action-log-entry` 클래스 확인
- ❌ i18n 키 누락 → `translation.json` 파일 확인
- ❌ 아이콘 미표시 → `NarrativeFeed.tsx` 렌더링 로직 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 액션 로그가 표시되지 않음
- **원인**: `appendActionLog` 함수가 호출되지 않음
- **해결**: `App.tsx`의 이벤트 핸들러에서 `appendActionLog` 호출 확인

**오류**: 스타일이 적용되지 않음
- **원인**: CSS 클래스가 누락됨
- **해결**: `NarrativeFeed.tsx`에서 `entry.type`에 따른 클래스 적용 확인

**오류**: i18n 키 오류 (`action_log.xxx`)
- **원인**: 번역 키가 없음
- **해결**: `ko-KR/translation.json`, `en-US/translation.json`에 키 추가 확인

### 5.2 환경별 주의사항

- **Windows**: 특이사항 없음
- **macOS/Linux**: 특이사항 없음

---

## 6. 관련 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/stores/worldStore.ts` | `NarrativeEntryType` 타입 추가, `appendActionLog` 액션 추가 |
| `frontend/src/components/NarrativeFeed.tsx` | 액션 로그 타입 렌더링 로직 추가 |
| `frontend/src/App.tsx` | 이벤트 핸들러에 `appendActionLog` 호출 추가 |
| `frontend/src/style.css` | `.action-log-entry` 스타일 추가 |
| `frontend/src/locales/ko-KR/translation.json` | `action_log.*` 키 추가 |
| `frontend/src/locales/en-US/translation.json` | `action_log.*` 키 추가 |

---

## 7. 페어링 질문 결정 사항

- **Q1**: 액션 로그 스타일? → **Option A 채택**: 내러티브와 동일 영역에 다른 스타일(dim, 이탤릭)로 표시
- **Q2**: 액션 카드 클릭에도 액션 로그 적용? → **Option A 채택**: 모든 플레이어 행동에 로그 적용

---

## 8. 다음 단계

- U-074: 인터랙션 안내 UX에서 액션 로그 예시 활용
- CP-MVP-03: 데모에서 플레이어 행동이 명확히 로깅되는 시나리오
