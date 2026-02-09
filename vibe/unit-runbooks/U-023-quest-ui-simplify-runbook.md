# U-023 Quest UI 개선 + Rule UI 제거 (좌측 사이드바 심플화) 실행 가이드

## 1. 개요

좌측 사이드바에서 Rule UI(RuleBoard + MutationTimeline)를 완전 제거하고, Quest UI를 개선하여 Inventory + Quest 2패널로 심플화했습니다. Quest UI는 CRT glow 강화, 게임스러운 다이아몬드 체크 아이콘, 활성 목표 pulse 효과 등으로 "겉도는 느낌"을 해소하고 게임 진행과의 연결감을 높였습니다.

**예상 소요 시간**: 3분

**의존성**:
- 의존 유닛: U-013[Mvp] (Quest/Rule 데이터 모델 및 초기 UI)
- 선행 완료 필요: 없음 (단독 검증 가능)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 즉시 실행

```bash
pnpm dev --port 8001
```

### 2.3 첫 화면 확인

- 브라우저에서 http://localhost:8001 접속
- 프로필 선택 (Explorer 권장) → 게임 화면 진입
- 성공 지표:
  - 좌측 사이드바에 **Inventory + Quest 2패널만** 표시 (Rule Board 없음)
  - Quest 패널에 주 목표 + 서브 목표가 CRT glow 효과와 함께 표시
  - 상단에 ObjectiveTracker가 다이아몬드 아이콘(◇)으로 표시

---

## 3. 핵심 기능 시나리오

### 시나리오 A: Rule UI 제거 확인

**목적**: Rule Board + Mutation Timeline이 완전히 제거되었는지 확인

**실행**:
1. http://localhost:8001 접속 후 프로필 선택
2. 좌측 사이드바 확인

**기대 결과**:
```
좌측 사이드바
┌──────────────────────┐
│ INVENTORY (4)        │ ← 50% 공간
│ ┌ Compass       ⚡+5 │
│ ├ Rope    x2    ⚡+5 │
│ ├ Lantern       ⚡+5 │
│ └ Map Fragment  ⚡+5 │
├──────────────────────┤
│ QUEST                │ ← 50% 공간
│ ◇ MAIN OBJECTIVE    │
│ Find the Exit        │
│ ████████░░░ 15%      │
│ ⚡ Reward: 50 Signal │
│ SUB-OBJECTIVES       │
│ ◇ Explore 3 Areas   │
│ COMPLETED            │
│ ◆ Gather Supplies    │
└──────────────────────┘
```
- Rule Board 없음
- Mutation Timeline 없음

**확인 포인트**:
- ✅ Rule Board 패널이 사이드바에 없음
- ✅ Mutation Timeline이 사이드바에 없음
- ✅ Inventory와 Quest가 약 5:5로 균등하게 공간 차지

---

### 시나리오 B: Quest UI 개선 확인

**목적**: Quest UI가 개선된 디자인으로 올바르게 표시되는지 확인

**실행**:
1. 게임 화면에서 좌측 사이드바의 "QUEST" 패널 확인

**기대 결과**:
- 주 목표(Main Objective): CRT glow 테두리, 마젠타 상단 라인, 보상 미리보기(⚡ 아이콘)
- 서브 목표: 다이아몬드 체크 아이콘(◇/◆), 첫 번째 활성 목표에 pulse 효과
- 완료된 목표: 채워진 다이아몬드(◆), 마젠타 색상, Signal 획득 텍스트

**확인 포인트**:
- ✅ 주 목표에 CRT glow 테두리 + 마젠타 상단 라인 표시
- ✅ 진행률 바가 CRT 줄 효과와 함께 표시
- ✅ ⚡ 아이콘으로 보상 미리보기 표시
- ✅ 서브 목표에 다이아몬드 아이콘(◇) 사용
- ✅ 첫 번째 활성 서브 목표에 미묘한 pulse/glow 효과
- ✅ 완료된 목표에 채워진 다이아몬드(◆) + 마젠타 색상

---

### 시나리오 C: ObjectiveTracker 일관성 확인

**목적**: 미니 트래커가 Quest 패널과 시각적으로 일관되는지 확인

**실행**:
1. 게임 중앙 영역 상단의 ObjectiveTracker 확인

**기대 결과**:
- 다이아몬드 아이콘(◇/◆) — Quest 패널과 동일
- 진행률 바에 CRT glow 효과
- 서브 목표 카운트(n/m)가 작은 배지 형태로 표시

**확인 포인트**:
- ✅ 다이아몬드 아이콘이 Quest 패널과 일관됨
- ✅ 진행률 바에 그린 glow 효과
- ✅ 서브 목표 카운트 배지가 보임

---

### 시나리오 D: 빈 상태 확인

**목적**: 목표가 없을 때의 빈 상태가 게임적 톤으로 표시되는지 확인

**실행**:
1. 브라우저 개발자 도구 콘솔에서:
```javascript
// worldStore에서 퀘스트 초기화
window.__zustand_stores?.world?.getState()?.setQuests?.([]);
```
(또는 새 프로필로 시작하여 퀘스트가 없는 상태 확인)

**기대 결과**:
- 🌌 아이콘이 부드러운 pulse 애니메이션과 함께 표시
- "FREE EXPLORATION" 텍스트 (CRT glow)
- 탐험 안내 힌트 텍스트

**확인 포인트**:
- ✅ 빈 상태 아이콘이 분위기 있는 스타일로 표시
- ✅ 텍스트가 CRT 테마에 맞는 glow 효과

---

### 시나리오 E: 5:5 레이아웃 반응형 확인

**목적**: 다양한 화면 크기에서 Inventory:Quest가 5:5로 유지되는지 확인

**실행**:
1. 브라우저 창 높이를 줄여서 확인 (max-height: 768px 이하)
2. 1024px 이하로 줄여서 사이드바 숨김 확인

**기대 결과**:
| 화면 너비 | 좌측 사이드바 | Inventory:Quest 비율 |
|----------|--------------|---------------------|
| > 1024px | 표시됨       | 5:5 균등            |
| < 1024px | 숨김         | -                   |

**확인 포인트**:
- ✅ 화면 높이가 작아도 5:5 비율 유지
- ✅ 스크롤이 패널 내부에서 정상 동작
- ✅ 1024px 이하에서 사이드바 자연스럽게 숨김

---

## 4. 실행 결과 확인

### 4.1 콘솔 확인

- React 경고/에러 없음
- i18n 누락 키 경고 없음
- RuleBoard/MutationTimeline 관련 import 에러 없음

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ Rule UI(RuleBoard + MutationTimeline)가 사이드바에서 완전 제거
- ✅ Inventory + Quest가 5:5 균등 분배
- ✅ Quest UI에 CRT glow, 다이아몬드 아이콘, pulse 효과 적용
- ✅ ObjectiveTracker가 Quest 패널과 시각적으로 일관
- ✅ ESLint + TypeScript 타입 체크 통과
- ✅ 반응형 레이아웃 정상 동작

**실패 시 확인**:
- ❌ 사이드바 레이아웃 깨짐 → style.css 섹션 11.2 확인
- ❌ Quest 패널 미표시 → App.tsx에서 QuestPanel import 확인
- ❌ 스크롤 동작 이상 → `min-height: 0` 설정 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: Quest 패널이 세로로 너무 작게 표시됨

- **원인**: `min-height: 0` 누락으로 flex 내부 스크롤 미동작
- **해결**: `.panel-quest` 에 `flex: 1; min-height: 0;` 확인

**오류**: RuleBoard/MutationTimeline import 에러

- **원인**: 다른 파일에서 RuleBoard/MutationTimeline을 import하는 경우
- **해결**: 전체 프로젝트에서 해당 import를 검색하여 제거

### 5.2 환경별 주의사항

- **Windows**: 특이사항 없음
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

- CP-MVP-03에서 Quest UI가 10분 데모 루프에서 자연스럽게 보이는지 검증
- U-025에서 엔딩 리포트 작성 시 퀘스트 달성도 데이터 활용
