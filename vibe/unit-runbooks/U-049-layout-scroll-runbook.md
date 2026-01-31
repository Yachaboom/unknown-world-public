# U-049[Mvp]: 레이아웃/스크롤 설계 개선 실행 가이드

## 1. 개요

우측 사이드바의 "컬럼 전체 스크롤" 문제를 해결하고, Economy HUD의 거래 장부(ledger)만 내부 스크롤되도록 스크롤 전략을 정리했습니다. 추가로 액션 카드 영역의 스크롤바를 제거하고 드래그 스크롤로 변경, 카드 배경과 텍스트 대비를 개선했습니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-004, U-013, U-014
- 선행 완료 필요: 없음

### 1.1 추가 개선 사항 (UI/UX)

- **첫 화면 스크롤 제거**: `game-container`에 `overflow: hidden` 및 `100dvh` 적용
- **액션 카드 드래그 스크롤**: 스크롤바 숨김, 마우스 드래그로 카드 이동
- **카드 배경/텍스트 대비 강화**: 더 불투명한 배경, 강한 텍스트 그림자
- **Web Interface Guidelines 준수**: `touch-action`, `prefers-reduced-motion` 등

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd d:\Dev\unknown-world\frontend
pnpm install
```

### 2.2 즉시 실행

```bash
pnpm dev
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001/` 접속
- 프로필 선택 후 게임 화면 진입
- 성공 지표: 우측 사이드바가 전체 스크롤 없이 모든 패널 표시

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 우측 사이드바 스크롤 확인 (기본 해상도 1366x768)

**목적**: 우측 사이드바가 컬럼 전체 스크롤 없이 패널을 표시하는지 확인

**실행**:
1. 브라우저 창을 1366x768 크기로 조정
2. 프로필 선택 후 게임 화면 진입
3. 우측 사이드바 확인:
   - Agent Console (상단, flex: 1로 확장)
   - 재화 현황 / Economy HUD (중간, 고정 높이)
   - Scanner (하단, 고정 높이)

**기대 결과**:
- 우측 사이드바가 스크롤바 없이 모든 패널 표시
- Agent Console이 유연하게 확장되어 남은 공간 차지

**확인 포인트**:
- ✅ Agent Console이 `flex: 1`로 확장됨
- ✅ Economy HUD와 Scanner가 축소되지 않음
- ✅ 컬럼 전체에 스크롤바가 생기지 않음

---

### 시나리오 B: Economy HUD 거래 장부 스크롤 테스트

**목적**: 거래 장부(ledger) 영역만 내부 스크롤되는지 확인

**실행**:
1. 게임 화면에서 액션 카드(예: "탐색하기") 클릭
2. 턴 완료 후 Economy HUD 확인
3. 여러 턴 실행하여 ledger에 5개 이상 항목 추가
4. ledger 영역에서 스크롤 동작 확인

**기대 결과**:
- ledger에 항목이 추가됨 (T1, T2, ...)
- ledger 리스트만 스크롤됨 (max-height: 120px)
- 잔액/비용 표시는 항상 고정

**확인 포인트**:
- ✅ ledger 헤더("거래 장부")가 항상 보임
- ✅ ledger 리스트만 스크롤됨
- ✅ Economy HUD 전체가 스크롤되지 않음

---

### 시나리오 C: 좌측 사이드바 스크롤 확인

**목적**: 좌측 사이드바도 동일한 스크롤 전략이 적용되었는지 확인

**실행**:
1. 게임 화면에서 좌측 사이드바 확인:
   - Inventory (상단, flex: 1로 확장)
   - Quest (중간)
   - Rule Board + Mutation Timeline (하단)
2. Rule Board에 규칙이 추가될 때 확인

**기대 결과**:
- 좌측 사이드바가 스크롤바 없이 모든 패널 표시
- 각 패널 콘텐츠 영역에서만 스크롤 발생

**확인 포인트**:
- ✅ 패널 헤더가 항상 보임
- ✅ 패널 콘텐츠만 스크롤됨
- ✅ 컬럼 전체 스크롤 없음

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:
- ✅ 1366x768 해상도에서 우측 사이드바 전체 스크롤 없음
- ✅ Economy HUD의 ledger 영역만 내부 스크롤
- ✅ Agent Console이 유연하게 확장됨 (Q1 Option A)
- ✅ 키보드/마우스 휠 동작이 예측 가능

**실패 시 확인**:
- ❌ 컬럼 전체 스크롤 발생 → CSS에서 `overflow: hidden` 확인
- ❌ 패널이 축소됨 → `min-height: 0` 확인
- ❌ ledger 스크롤 안됨 → `.ledger-list` 스타일 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 우측 사이드바가 전체 스크롤됨
- **원인**: `.sidebar-right`에 `overflow-y: auto`가 남아있음
- **해결**: CSS에서 `overflow: hidden`으로 변경

**오류**: Economy HUD가 과도하게 확장됨
- **원인**: `max-height` 제한이 없음
- **해결**: `.panel-economy`에 `max-height: 280px` 적용

**오류**: ledger 스크롤바가 보이지 않음
- **원인**: `.ledger-list`에 `max-height`가 없음
- **해결**: `.ledger-list`에 `max-height: 120px` 적용

### 5.2 환경별 주의사항

- **Windows**: 스크롤바 너비가 다를 수 있음 (`scrollbar-width: thin` 적용됨)
- **macOS**: 오버레이 스크롤바로 표시될 수 있음

---

## 6. 적용된 변경 사항

### CSS 변경 (`frontend/src/style.css`)

1. **사이드바 스크롤 제거**:
   - `.sidebar-left`, `.sidebar-right`: `overflow: hidden`, `min-height: 0`

2. **패널 flex 전략 정리**:
   - `.panel`: `min-height: 0`
   - `.panel-header`: `flex-shrink: 0`
   - `.panel-content`: `min-height: 0`

3. **패널별 높이 전략 (Q1 Option A)**:
   - `.panel-agent-console`: `flex: 1` (유연 확장)
   - `.panel-economy`: `flex-shrink: 0`, `max-height: 280px`
   - `.panel-scanner`: `flex-shrink: 0`

4. **Economy ledger 스크롤**:
   - `.economy-ledger`: `flex: 1`, `min-height: 0`
   - `.ledger-list`: `overflow-y: auto`, `max-height: 120px`

### App.tsx 변경

- 패널에 식별용 className 추가: `panel-agent-console`, `panel-economy`, `panel-scanner`
