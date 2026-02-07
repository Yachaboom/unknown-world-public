# U-082[Mvp] Agent Console 축소 및 재화 현황 영역 확대 실행 가이드

## 1. 개요

Agent Console의 사용 빈도가 낮은 영역(Plan/Queue)을 기본 접힘 상태로 변경하고, Economy HUD 영역을 확대하여 재화 현황(Signal/Shard)이 한눈에 보이도록 개선했습니다.

**주요 변경사항**:
- Agent Console: 기본 접힘(Badges + StreamingStatus만 표시), 토글 버튼으로 확장 가능
- Economy HUD: 잔액/비용 폰트 사이즈 증가, 아이콘 크기 확대, 패널 유연 확장(flex-1)
- 우측 사이드바 패널 높이 전략 반전 (Agent Console flex-1 → Economy HUD flex-1)

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-049[Mvp] (레이아웃/스크롤 설계), U-014[Mvp] (Economy HUD 기본 구조)
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
- 프로필 선택 후 게임 화면 진입
- 성공 지표:
  - Agent Console이 접힌 상태로 Badges + "▼ 상세 보기" 버튼 표시
  - Economy HUD에 큰 폰트로 Signal/Shard 잔액 표시

---

## 3. 핵심 기능 시나리오

### 시나리오 A: Agent Console 기본 접힘 확인

**목적**: Agent Console이 기본 접힘 상태이며, 핵심 정보만 표시되는지 확인

**실행**:
1. 프로필 선택 후 게임 화면 진입
2. 우측 사이드바 상단의 Agent Console 확인

**기대 결과**:
- StreamingStatus ("대기 중" 또는 "처리 중") 표시
- ModelLabel ("빠름 (FAST)" 또는 "고품질 (QUALITY)") 표시
- 검증 배지 (Badges) 영역 표시
- "▼ 상세 보기" 토글 버튼 표시
- Plan/Queue 단계 목록은 숨겨짐

**확인 포인트**:
- ✅ Agent Console이 접힘 상태로 시작
- ✅ Badges는 항상 보임
- ✅ 토글 버튼이 보임

---

### 시나리오 B: Agent Console 확장/접기 토글

**목적**: 토글 버튼으로 Agent Console을 확장/접기할 수 있는지 확인

**실행**:
1. "▼ 상세 보기" 버튼 클릭
2. Agent Console이 확장되어 Queue 정보 확인
3. "▲ 접기" 버튼 클릭
4. Agent Console이 다시 접힘 확인

**기대 결과**:
- 확장 시: Queue (Parse → Validate → Plan → Resolve → Render → Verify → Commit) 표시
- 접기 시: Queue 숨김, Badges만 표시

**확인 포인트**:
- ✅ 토글 버튼 클릭으로 확장/접기 전환
- ✅ 확장 시 Queue 단계 표시
- ✅ aria-expanded 속성 올바르게 변경
- ✅ 접기 후 원래 상태로 복귀

---

### 시나리오 C: Economy HUD 확대 확인

**목적**: Economy HUD의 재화 정보가 확대되어 잘 보이는지 확인

**실행**:
1. 게임 화면에서 우측 사이드바의 Economy HUD 확인
2. Signal/Shard 잔액 숫자 크기 확인
3. 재화 아이콘(⚡/💎) 크기 확인

**기대 결과**:
- Signal/Shard 잔액이 큰 폰트(1.25rem)로 표시
- 재화 아이콘이 28px로 표시 (기존 20px에서 확대)
- 비용 정보의 아이콘이 18px로 표시 (기존 14px에서 확대)
- 거래 장부(Ledger) 영역이 여유 있게 표시

**확인 포인트**:
- ✅ 잔액 숫자가 기존보다 크게 표시
- ✅ 아이콘이 기존보다 크게 표시
- ✅ 거래 장부가 내부 스크롤로 표시

---

### 시나리오 D: 레이아웃 영역 분배 확인

**목적**: Agent Console 축소 + Economy HUD 확대로 영역 분배가 적절한지 확인

**실행**:
1. 브라우저 창을 1366x768 크기로 조정
2. 우측 사이드바의 세 패널 확인:
   - Agent Console (상단, 콘텐츠 기반 높이)
   - Economy HUD (중간, flex-1 유연 확장)
   - Scanner (하단, 콘텐츠 기반 높이)

**기대 결과**:
- Agent Console이 접힌 상태에서 최소한의 공간만 차지
- Economy HUD가 나머지 공간을 넓게 사용
- Scanner가 정상 크기로 하단에 표시
- 컬럼 전체 스크롤 없음

**확인 포인트**:
- ✅ Agent Console 접힘 시 Economy HUD에 더 많은 공간 할당
- ✅ Agent Console 확장 시에도 전체 스크롤 없음
- ✅ Scanner가 축소되지 않음

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:
- ✅ Agent Console이 기본 접힘 상태로 시작
- ✅ Badges는 항상 보임 (접힘/펼침 상관없이)
- ✅ 토글 버튼으로 확장/접기 가능
- ✅ Economy HUD의 잔액/비용이 확대된 폰트로 표시
- ✅ Economy HUD가 flex-1로 유연 확장
- ✅ 컬럼 전체 스크롤 없음

**실패 시 확인**:
- ❌ Agent Console이 확장 상태로 시작 → `AgentConsole.tsx`의 `useState(false)` 확인
- ❌ 토글 버튼이 안 보임 → `agent-console-toggle` CSS 확인
- ❌ Economy HUD가 작게 표시 → `.panel-economy`에 `flex-1` 클래스 확인
- ❌ 잔액 폰트가 작음 → `.balance-value` CSS에서 `font-size: 1.25rem` 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: Agent Console이 접히지 않음
- **원인**: `isExpanded` 초기값이 `true`로 설정됨
- **해결**: `useState(false)` 확인 (Q1 Option A: 기본 접힘)

**오류**: Economy HUD가 확장되지 않음
- **원인**: `.panel-economy`에 `flex-1` 클래스 누락
- **해결**: `App.tsx`에서 `className="panel-economy flex-1"` 확인

**오류**: 토글 버튼의 텍스트가 표시되지 않음
- **원인**: i18n 키 누락
- **해결**: `locales/ko-KR/translation.json`의 `agent.console.expand`/`collapse` 키 확인

### 5.2 환경별 주의사항

- **Windows**: 스크롤바 너비가 다를 수 있음 (`scrollbar-width: thin` 적용됨)
- **macOS**: 오버레이 스크롤바로 표시될 수 있음

---

## 6. 다음 단계

- U-083: 액션 카드 대안 뱃지 레이아웃 깨짐 수정
- CP-MVP-03: 전체 10분 데모 루프에서 레이아웃 안정성 확인
