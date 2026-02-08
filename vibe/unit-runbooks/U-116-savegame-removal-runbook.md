# U-116 SaveGame 제거 + 프로필 초기 상태 정리 실행 가이드

## 1. 개요

SaveGame(진행 저장/불러오기) 시스템을 완전 제거하고, 세션 흐름을 단순화합니다.
새로고침 시 항상 프로필 선택 화면으로 복귀하며, 언어 설정만 `localStorage`에 유지됩니다.
데모 프로필의 `sceneObjectDefs`를 빈 배열로 초기화하여 U-090 정책을 준수합니다.

**예상 소요 시간**: 5분

**의존성**:
- 제거 대상 유닛: U-015[Mvp] (SaveGame 원 구현), U-041[Mvp] (마이그레이션), RU-004[Mvp] (리팩토링)
- 선행 완료 필요: 프론트엔드 서버 구동

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
pnpm -C frontend install
```

### 2.2 서버 시작

```bash
# 프론트엔드 시작
pnpm run dev:front
```

### 2.3 접근

브라우저에서 `http://localhost:8001` 접속

---

## 3. 검증 시나리오

### 시나리오 1: 프로필 선택 화면 기본 표시

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | `http://localhost:8001` 접속 | 프로필 선택 화면 표시 |
| 2 | "서사꾼", "탐험가", "기술 전문가" 3개 버튼 확인 | 3개 프로필 버튼 존재 |
| 3 | **"계속하기" 버튼 없음** 확인 | SaveGame 관련 UI 제거됨 |

### 시나리오 2: 프로필 선택 후 세션 시작

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | "서사꾼" 버튼 클릭 | 게임 화면 전환 |
| 2 | 인벤토리 확인 | 고대 서책, 깃펜, 기억 조각 (3개) |
| 3 | Economy HUD 확인 | Signal: 200, Shard: 10 |
| 4 | Quest 패널 확인 | 주 목표: "세계의 기원을 발견하기" |
| 5 | Rule Board 확인 | 시간의 흐름, 기억의 지속 (2개) |

### 시나리오 3: localStorage 검증

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | 프로필 선택 후 DevTools Console 열기 | — |
| 2 | `localStorage.getItem('unknown_world_language')` | `"ko-KR"` 또는 `"en-US"` |
| 3 | `localStorage.getItem('unknown_world_savegame')` | `null` |
| 4 | `localStorage.getItem('unknown_world_current_profile')` | `null` |

### 시나리오 4: 새로고침 시 프로필 선택 복귀

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | 게임 진행 중 F5(새로고침) | 프로필 선택 화면으로 복귀 |
| 2 | "계속하기" 버튼 없음 확인 | SaveGame 관련 UI 없음 |
| 3 | 언어 설정 유지 확인 | 새로고침 전과 동일한 언어 |

### 시나리오 5: "프로필 변경" 버튼

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | 게임 중 헤더의 "프로필 변경" 클릭 | 프로필 선택 화면 복귀 |
| 2 | 다른 프로필 선택 | 해당 프로필의 초기 상태로 새 세션 |

### 시나리오 6: "리셋" 버튼

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | 게임 중 헤더의 "리셋" 클릭 | "다시 클릭하여 확인" 표시 |
| 2 | 한 번 더 클릭 | 현재 프로필의 초기 상태로 리셋 |
| 3 | 인벤토리/재화/퀘스트 확인 | 초기값으로 복원됨 |

### 시나리오 7: 각 프로필 초기 상태 검증

| 프로필 | Signal | Shard | 인벤토리 | 퀘스트 | 규칙 수 |
|--------|--------|-------|----------|--------|---------|
| 서사꾼 | 200 | 10 | 고대 서책, 깃펜, 기억 조각 | 세계의 기원을 발견하기 | 2 |
| 탐험가 | 150 | 5 | 나침반, 밧줄, 랜턴, 지도 조각 | 탈출구 찾기 | 2 |
| 기술 전문가 | 80 | 15 | 데이터 코어, 회로 기판, 에너지 셀, 스캐너 장치 | 시스템 분석 완료하기 | 3 |

### 시나리오 8: 레거시 데이터 자동 정리

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | DevTools Console에서 수동으로 레거시 데이터 삽입: | — |
| | `localStorage.setItem('unknown_world_savegame', '{"v":1}')` | — |
| | `localStorage.setItem('unknown_world_current_profile', 'narrator')` | — |
| 2 | 페이지 새로고침 | 프로필 선택 화면 표시 |
| 3 | `localStorage.getItem('unknown_world_savegame')` 확인 | `null` (정리됨) |
| 4 | `localStorage.getItem('unknown_world_current_profile')` 확인 | `null` (정리됨) |

---

## 4. 변경 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/save/constants.ts` | SaveGame 상수 제거, `LANGUAGE_STORAGE_KEY`/레거시 키 추가 |
| `frontend/src/save/saveGame.ts` | SaveGame 스키마/함수 제거, `clearLegacySaveData()` 만 남김 |
| `frontend/src/save/sessionLifecycle.ts` | SaveGame 의존성 완전 제거, 세션 흐름 단순화 |
| `frontend/src/save/migrations.ts` | **삭제** |
| `frontend/src/App.tsx` | 자동 저장/계속하기 로직 제거 |
| `frontend/src/data/demoProfiles.ts` | SaveGame 변환 함수 제거, `sceneObjectDefs` 빈 배열 |
| `frontend/src/components/DemoProfileSelect.tsx` | "계속하기" UI 제거 |
| `frontend/src/stores/economyStore.ts` | 더미 거래 장부 제거, 빈 초기 상태 |
| `frontend/src/save/*.test.ts` | **삭제** (SaveGame 테스트) |
| `frontend/src/data/demoProfiles.test.ts` | **삭제** |
| `frontend/src/i18n-scenario.test.ts` | **삭제** |

---

## 5. 롤백

SaveGame 시스템을 복원해야 할 경우 이 유닛 커밋을 `git revert`합니다.
MMP에서 재설계가 필요할 경우 새로운 유닛으로 별도 구현합니다.

---

## 6. 콘솔 에러 체크리스트

- [ ] `[SaveGame]` 관련 에러/경고 없음
- [ ] `localStorage` 접근 에러 없음
- [ ] TypeScript 타입 에러 없음 (`npx tsc --noEmit`)
- [ ] ESLint 에러 없음
