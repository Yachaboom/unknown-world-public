# U-014[Mvp] Economy HUD + Ledger 실행 가이드

## 1. 개요

Signal/Memory Shard 재화 HUD를 구현하고, 턴별 비용/잔액 변화를 **원장(ledger)**으로 추적하는 기능을 검증합니다.

**구현 내용**:
- Header에 Signal/Shard 잔액 상시 표시
- 카드 호버 시 예상 비용(최소/최대) 표시
- 턴 완료 시 확정 비용/잔액(balance_after) 표시
- 클라이언트 ledger 저장 (최근 20턴)
- 잔액 부족 시 경고 및 대안 안내

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-008[Mvp], U-009[Mvp]
- 선행 완료 필요: 백엔드 서버 실행 (또는 Mock 모드)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
cd frontend
pnpm install
```

### 2.2 개발 서버 실행

```bash
# 프론트엔드 개발 서버 시작 (포트 8001)
pnpm run dev

# 백엔드 서버 시작 (필요 시, 포트 8011)
cd ../backend
uv run uvicorn unknown_world.main:app --port 8011 --reload
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- 성공 지표:
  - 헤더에 `Signal: 100`, `Shard: 5` 표시 확인
  - Action Deck에 카드 3장 이상 표시 확인

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 잔액 표시 확인

**목적**: Header에 현재 Signal/Shard 잔액이 상시 표시되는지 확인

**실행**:
1. 브라우저에서 `http://localhost:8001` 접속
2. 헤더 영역 확인

**기대 결과**:
- `Signal: 100` 표시
- `Shard: 5` 표시
- 아이콘(⚡/💎 또는 이미지)과 함께 표시

**확인 포인트**:
- ✅ 잔액이 숫자로 명확히 표시됨
- ✅ 새로고침해도 초기값 유지

---

### 시나리오 B: 예상 비용 표시 (카드 호버)

**목적**: 카드에 마우스를 올리면 예상 비용이 표시되는지 확인

**실행**:
1. Action Deck의 카드에 마우스 호버
2. 헤더의 Economy HUD 영역 관찰

**기대 결과**:
- 헤더에 예상 비용 미니 표시 (`→ -1` 형태)
- 카드에 이미 비용 정보 표시됨 (예: `⚡1`)

**확인 포인트**:
- ✅ 카드 호버 시 예상 비용 표시
- ✅ 마우스 아웃 시 예상 비용 숨김
- ✅ 비용 범위가 있는 경우 `1~3` 형태로 표시

---

### 시나리오 C: 턴 실행 후 비용 반영

**목적**: 카드 클릭으로 턴 실행 시 비용이 차감되고 ledger에 기록되는지 확인

**실행**:
1. 카드 클릭하여 턴 실행
2. 내러티브 응답 수신 대기
3. 헤더의 잔액 변화 확인

**기대 결과**:
- 잔액이 비용만큼 차감됨 (예: 100 → 99)
- 확정 비용이 표시됨 (예상 비용이 없을 때)

**확인 포인트**:
- ✅ 비용 차감이 즉시 반영됨
- ✅ 잔액이 음수가 되지 않음 (RULE-005)
- ✅ Agent Console에 Economy 배지 표시

---

### 시나리오 D: 잔액 부족 경고

**목적**: 잔액이 낮아지면 경고가 표시되는지 확인

**실행**:
1. 개발자 도구(F12) → Console 탭 열기
2. 다음 명령 실행하여 잔액을 낮춤:
   ```javascript
   // Zustand 스토어 직접 조작 (테스트용)
   const worldStore = window.__ZUSTAND_DEVTOOLS__.stores.get('world');
   worldStore.getState().setEconomy({ signal: 5, memory_shard: 0 });
   ```
   또는 여러 턴을 실행하여 자연스럽게 잔액 소모
3. 헤더의 Economy HUD 확인

**기대 결과**:
- 잔액 부족 경고 아이콘(⚠) 표시
- Economy HUD 테두리가 주황색으로 변경
- 잔액 영역이 펄스 애니메이션

**확인 포인트**:
- ✅ 임계값(Signal 10) 미만 시 경고 표시
- ✅ 경고 표시가 시각적으로 명확함

---

### 시나리오 E: Ledger 기록 확인

**목적**: 턴별 비용이 원장(ledger)에 기록되는지 확인

**실행**:
1. 여러 턴 실행 (카드 클릭 3회 이상)
2. 개발자 도구 → Console 탭에서 확인:
   ```javascript
   // Economy Store의 ledger 확인
   const economyStore = window.__ZUSTAND_DEVTOOLS__.stores.get('economy');
   console.log(economyStore.getState().ledger);
   ```

**기대 결과**:
- ledger 배열에 각 턴의 기록 포함
- 각 엔트리에 turnId, cost, balanceAfter, timestamp 포함

**확인 포인트**:
- ✅ 최근 20턴까지만 보관 (Q1: Option A)
- ✅ 각 엔트리에 필수 필드 존재
- ✅ 최신 턴이 배열 앞에 위치

---

## 4. 실행 결과 확인

### 4.1 콘솔 로그

- 에러 없이 실행되어야 함
- `[System]` 접두사 로그는 정상 동작

### 4.2 DevTools 확인 방법

1. F12로 개발자 도구 열기
2. Redux DevTools 또는 Zustand DevTools 확인
3. `economy` 스토어의 상태 변화 추적

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 잔액이 헤더에 상시 표시됨
- ✅ 카드 호버 시 예상 비용 표시
- ✅ 턴 완료 시 비용 차감 및 ledger 기록
- ✅ 잔액 부족 시 경고 표시
- ✅ 잔액이 절대 음수가 되지 않음

**실패 시 확인**:
- ❌ 잔액이 표시되지 않음 → GameHeader 컴포넌트 확인
- ❌ 예상 비용이 표시되지 않음 → ActionDeck 호버 핸들러 확인
- ❌ 비용이 차감되지 않음 → worldStore.applyTurnOutput 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 잔액이 업데이트되지 않음
- **원인**: worldStore와 economyStore 연동 누락
- **해결**: `worldStore.applyTurnOutput`에서 `economyStore.addLedgerEntry` 호출 확인

**오류**: 예상 비용이 표시되지 않음
- **원인**: ActionDeck 호버 핸들러 미연결
- **해결**: ActionCardItem의 onMouseEnter/onMouseLeave 확인

**오류**: 스타일이 적용되지 않음
- **원인**: CSS 클래스 미적용
- **해결**: `economy-hud` 클래스와 관련 스타일 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 차이 없음 (프론트엔드)
- **macOS/Linux**: 동일하게 동작

---

## 6. 다음 단계

- U-015: SaveGame에 economy ledger/잔액 포함
- U-018: 서버 경제 Hard gate/repair loop와 클라 UX 정합
