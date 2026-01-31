# U-042[Mvp] 용어/카피 정리 실행 가이드

## 1. 개요

"원장(ledger)"을 **거래 장부**(ko-KR), "Ledger"를 **Resource Log**(en-US)로 게임 친화적 용어로 통일했습니다. i18n 키는 유지하고 번역 값만 교체하여 수정 범위를 최소화했습니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-014 (Economy HUD/ledger), U-039 (i18n JSON 리소스 구조)
- 선행 완료 필요: 없음

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 즉시 실행

```bash
pnpm dev
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001/` 접속
- 성공 지표: "VITE ready" 메시지 출력 후 게임 UI 표시

---

## 3. 핵심 기능 시나리오

### 시나리오 A: ko-KR 용어 확인

**목적**: 한국어 UI에서 "거래 장부"가 정상 표시되는지 검증

**실행**:
1. 브라우저에서 `http://localhost:8001/` 접속
2. 언어가 한국어(ko-KR)인지 확인 (기본 언어)
3. 프로필 선택 후 게임 시작
4. 오른쪽 사이드바의 "재화 현황" 패널 확인

**기대 결과**:
- Economy HUD의 ledger 섹션 타이틀이 **"거래 장부"**로 표시됨
- 이력이 없을 때 **"[ 이력 없음 ]"** 표시됨

**확인 포인트**:
- ✅ "최근 원장 이력" 대신 "거래 장부" 표시
- ✅ 한국어 일관성 유지 (혼합 출력 없음)

---

### 시나리오 B: en-US 용어 확인

**목적**: 영어 UI에서 "Resource Log"가 정상 표시되는지 검증

**실행**:
1. 브라우저에서 `http://localhost:8001/` 접속
2. 언어 변경 버튼(🌐) 클릭하여 영어(English)로 전환
3. 프로필 선택 후 게임 시작
4. 오른쪽 사이드바의 "Economy Status" 패널 확인

**기대 결과**:
- Economy HUD의 ledger 섹션 타이틀이 **"Resource Log"**로 표시됨
- 이력이 없을 때 **"[ NO HISTORY ]"** 표시됨

**확인 포인트**:
- ✅ "Recent Ledger" 대신 "Resource Log" 표시
- ✅ 영어 일관성 유지 (혼합 출력 없음)

---

### 시나리오 C: 턴 진행 후 Resource Log 표시 확인

**목적**: 실제 턴 진행 시 거래 장부/Resource Log에 이력이 기록되는지 확인

**실행 순서**:
1. **Step 1**: 게임 시작 후 Action Deck에서 아무 카드나 클릭

   - 결과: 턴이 진행되고 비용이 차감됨

2. **Step 2**: Economy HUD의 거래 장부/Resource Log 섹션 확인

   - 결과: 턴 번호(T1), 비용(-N), 모델 라벨(Q/F)이 표시됨

---

## 4. 실행 결과 확인

### 4.1 수정된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/locales/ko-KR/translation.json` | `economy.ledger_title`: "최근 원장 이력" → "거래 장부" |
| `frontend/src/locales/en-US/translation.json` | `economy.ledger_title`: "Recent Ledger" → "Resource Log" |

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ ko-KR: "거래 장부" 표시
- ✅ en-US: "Resource Log" 표시
- ✅ 기존 i18n 키(`economy.ledger_title`) 유지
- ✅ 린트/타입 체크 통과

**실패 시 확인**:
- ❌ 용어가 변경되지 않음 → i18n 캐시 문제일 수 있음, 브라우저 새로고침/캐시 삭제 후 재시도
- ❌ 키가 깨져서 표시됨 → translation.json 문법 오류 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 용어가 변경되지 않고 이전 값이 표시됨
- **원인**: 브라우저 캐시 또는 Vite HMR 미갱신
- **해결**: 
  1. 브라우저 강제 새로고침 (Ctrl+Shift+R)
  2. 개발 서버 재시작

**오류**: i18n 키가 그대로 표시됨 (`economy.ledger_title`)
- **원인**: JSON 파일 문법 오류
- **해결**: 
  1. translation.json 파일의 JSON 유효성 검사
  2. 쉼표, 따옴표 누락 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 문제 없음 (JSON 파일 수정만 진행)
- **macOS/Linux**: 동일

---

## 6. 용어 매핑 참고

| 내부 구현 용어 | ko-KR 사용자 노출 | en-US 사용자 노출 |
|----------------|-------------------|-------------------|
| `ledger` | 거래 장부 | Resource Log |
| `ledger_empty` | [ 이력 없음 ] | [ NO HISTORY ] |

**주의**: 코드/스토어 내 변수명(`ledger`, `LedgerEntry` 등)은 유지됩니다. 용어 변경은 **i18n 리소스 값**에만 적용됩니다.
