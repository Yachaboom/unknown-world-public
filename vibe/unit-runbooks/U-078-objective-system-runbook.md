# U-078 게임 목표 시스템 강화 실행 가이드

## 1. 개요

기존 Quest 패널을 **주 목표(Main Objective) + 서브 목표(Sub-objectives)** 구조로 강화하여 플레이어에게 명확한 목표 제시, 진행률 표시, 보상 피드백을 제공합니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-013[Mvp] (Quest 패널 기본 구조), U-015[Mvp] (데모 프로필)
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
- 성공 지표:
  - 프로필 선택 → 아무 프로필 선택 후 게임 화면 진입
  - **상단 미니 트래커(ObjectiveTracker)** 가 표시됨
  - **좌측 Quest 패널** 에 주 목표(강조 카드) + 서브 목표가 표시됨

---

## 3. 핵심 기능 시나리오

### 3.1 주 목표 표시 확인

**단계**:
1. 프로필 변경 → "탐험가" 프로필 선택
2. Quest 패널(좌측) 확인

**기대 결과**:
- 🎯 아이콘 + "주 목표" 배지가 표시됨
- "탈출구 찾기" 제목 + "미로를 탐험하고 숨겨진 출구를 찾아 탈출하세요" 설명
- 진행률 바(15%) 표시
- "보상: 50 Signal" 미리보기 표시

### 3.2 서브 목표 표시 확인

**단계**:
1. 3.1 이후 Quest 패널 하단 확인

**기대 결과**:
- "세부 목표" 섹션: ○ 3개 구역 탐험하기 (+20⚡)
- "완료됨" 섹션: ✓ 보급품 수집 (+10 Signal 획득!)

### 3.3 ObjectiveTracker(미니 트래커) 확인

**단계**:
1. 게임 화면 중앙 상단(SceneCanvas 위) 확인

**기대 결과**:
- 🎯 아이콘 + 주 목표 제목 "탈출구 찾기"
- 서브 목표 카운트 "(1/2)" (2개 중 1개 완료)
- 미니 진행률 바

### 3.4 프로필별 목표 데이터 비교

**단계**:
1. "프로필 변경" → "서사꾼" 선택
2. Quest 패널 및 ObjectiveTracker 확인
3. "프로필 변경" → "기술 전문가" 선택
4. 동일하게 확인

**기대 결과**:
- 서사꾼: 주 목표 "이야기 완성하기" (또는 해당 프로필 정의 기준)
- 기술 전문가: 주 목표 "시스템 해킹" (또는 해당 프로필 정의 기준)
- 각 프로필마다 서로 다른 서브 목표와 보상값이 표시됨

### 3.5 빈 상태(자유 탐색) 확인

**단계**:
1. 브라우저 DevTools 콘솔에서 다음 실행:
   ```javascript
   // Zustand 스토어에서 퀘스트 비우기
   __ZUSTAND_WORLD_STORE__ && __ZUSTAND_WORLD_STORE__.setState({ quests: [] });
   ```
   또는 `useWorldStore.getState().reset()` 후 퀘스트 없는 상태 유지
2. Quest 패널 확인

**기대 결과**:
- 🧭 아이콘 + "자유 탐색 중" 텍스트
- "정해진 목표 없이 세계를 자유롭게 탐험하세요" 안내 문구
- ObjectiveTracker는 숨겨짐 (목표가 없으므로)

### 3.6 i18n(영어) 전환 확인

**단계**:
1. 프로필 선택 화면에서 "한국어" 버튼 클릭 → 영어로 전환
2. 영어 프로필 선택 후 Quest 패널 확인

**기대 결과**:
- "Main Objective" 배지
- "Sub-objectives" 섹션
- "Reward: 50 Signal" 미리보기
- "+10 Signal earned!" 완료 표시

---

## 4. 데이터 구조 확인

### 4.1 Quest 스키마

```typescript
// frontend/src/schemas/turn.ts
{
  id: string,
  label: string,
  is_completed: boolean,
  description: string | null,  // U-078: 선택적 설명
  is_main: boolean,            // U-078: 주 목표 여부
  progress: number,            // U-078: 0-100 진행률
  reward_signal: number,       // U-078: Signal 보상량
}
```

### 4.2 SaveGame 확인

**단계**:
1. 게임 플레이 후 브라우저 DevTools → Application → Local Storage
2. `unknown-world-save` 키의 `quests` 배열 확인

**기대 결과**:
- 각 quest 객체에 `description`, `is_main`, `progress`, `reward_signal` 필드 존재

---

## 5. 자동 테스트 실행

```bash
cd frontend

# TypeScript 타입 체크
pnpm run typecheck

# ESLint
pnpm run lint

# Vitest 유닛 테스트
pnpm test -- --run

# 특정 파일만 테스트
pnpm test -- --run src/components/QuestPanel.test.tsx
pnpm test -- --run src/stores/worldStore.test.ts
pnpm test -- --run src/save/saveGame.test.ts
```

**기대 결과**: U-078 관련 테스트 모두 통과

---

## 6. 트러블슈팅

### 6.1 무한 리렌더 (Maximum update depth exceeded)

**증상**: QuestPanel 또는 ObjectiveTracker에서 "Maximum update depth exceeded" 에러

**원인**: Zustand 셀렉터가 `filter`로 매번 새 배열을 생성하여 참조 비교 실패

**해결**: `useShallow`를 사용하여 얕은 비교 적용
```typescript
import { useShallow } from 'zustand/react/shallow';
const subObjectives = useWorldStore(useShallow(selectSubObjectives));
```

### 6.2 기존 세이브 데이터에서 주 목표가 표시되지 않음

**증상**: 프로필 진입 후 Quest 패널에 주 목표 없음

**원인**: 기존 저장 데이터에 `is_main` 필드가 없어 기본값 `false`로 처리됨

**해결**: "리셋" 버튼 또는 "프로필 변경"으로 새 데이터 로드

---

## 7. 관련 파일 목록

| 파일 | 역할 |
| --- | --- |
| `frontend/src/components/QuestPanel.tsx` | Quest 패널 (주 목표 + 서브 목표) |
| `frontend/src/components/ObjectiveTracker.tsx` | 미니 목표 트래커 |
| `frontend/src/stores/worldStore.ts` | 상태 관리 + 셀렉터 |
| `frontend/src/schemas/turn.ts` | Quest Zod 스키마 |
| `backend/src/unknown_world/models/turn.py` | Quest Pydantic 모델 |
| `frontend/src/data/demoProfiles.ts` | 데모 프로필 목표 데이터 |
| `frontend/src/style.css` | CSS 스타일 |
| `backend/prompts/turn/turn_output_instructions.ko.md` | GM 목표 관리 지침 |
