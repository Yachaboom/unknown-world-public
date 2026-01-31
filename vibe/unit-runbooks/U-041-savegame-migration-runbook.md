# U-041[Mvp] SaveGame 마이그레이션 실행 가이드

## 1. 개요

SaveGame 스키마(`SAVEGAME_VERSION`)가 변해도 기존 저장 데이터가 마이그레이션되어 데모 루프가 끊기지 않도록 하는 버전별 변환 로직을 구현했습니다.

**핵심 변경**:
- "스키마 검증 → 마이그레이션" 흐름을 "버전 판별 → 마이그레이션 → 검증"으로 변경
- `migrations.ts`에 버전별 변환 체인 구현
- 구버전(0.9.0) SaveGame도 최신 버전(1.0.0)으로 마이그레이션 가능

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: RU-004[Mvp]
- 선행 완료 필요: 없음 (독립 실행 가능)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 개발 서버 시작

```bash
pnpm run dev --port 8001
```

### 2.3 브라우저 접속

- URL: `http://localhost:8001`
- 개발자 도구(F12) → Console 탭 열기

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 최신 버전 SaveGame 정상 로드

**목적**: 현재 버전(1.0.0) SaveGame이 마이그레이션 없이 정상 로드되는지 확인

**실행**:
1. 프로필 선택 → Explorer 클릭
2. 게임 진행 (몇 턴 플레이)
3. 브라우저 새로고침 (F5)

**기대 결과**:
- 게임 상태가 복원됨
- Console에 마이그레이션 로그 없음 (버전 일치)

**확인 포인트**:
- ✅ 새로고침 후 playing 상태 유지
- ✅ 인벤토리/퀘스트/재화 복원
- ✅ Console에 `[Migration]` 로그 없음

---

### 시나리오 B: 구버전 SaveGame 마이그레이션 (핵심 테스트)

**목적**: 0.9.0 버전 SaveGame이 1.0.0으로 마이그레이션되어 정상 로드되는지 확인

**전제 조건**:
- 개발자 도구 Console 접근 가능

**실행**:
1. Console에서 구버전 SaveGame 직접 주입:

```javascript
// 0.9.0 버전 SaveGame (sceneObjects, economyLedger, mutationTimeline 누락)
const legacySave = {
  version: '0.9.0',
  seed: 'demo-test-legacy',
  language: 'ko-KR',
  profileId: 'explorer',
  savedAt: new Date().toISOString(),
  economy: {
    signal: 150,
    memory_shards: 10  // 오타: memory_shard가 아님 (마이그레이션에서 수정됨)
  },
  turnCount: 5,
  narrativeHistory: [
    { turn: 1, text: '구버전 내러티브 1' },
    { turn: 2, text: '구버전 내러티브 2' }
  ],
  inventory: [
    { id: 'legacy-item', name: '유산 아이템', quantity: 1 }
  ],
  quests: [
    { id: 'legacy-quest', label: '유산 퀘스트', is_completed: false }
  ],
  activeRules: [
    { id: 'legacy-rule', label: '유산 규칙', description: '구버전 규칙' }
  ]
  // sceneObjects, economyLedger, mutationTimeline 필드 없음
};

localStorage.setItem('unknown_world_savegame', JSON.stringify(legacySave));
console.log('Legacy SaveGame injected!');
```

2. 브라우저 새로고침 (F5)

**기대 결과**:
- Console에 마이그레이션 로그 출력
- 게임이 정상적으로 복원됨
- economy.memory_shard가 10으로 수정됨 (memory_shards → memory_shard)

**Console 로그 예상**:
```
[SaveGame] 마이그레이션 시작: 0.9.0 → 1.0.0
[Migration] Applying: 0.9.0 → 1.0.0: sceneObjects 필드 추가, economy 필드명 정규화
[SaveGame] 마이그레이션 완료: 0.9.0 → 1.0.0
```

**확인 포인트**:
- ✅ playing 상태로 진입
- ✅ 인벤토리에 '유산 아이템' 표시
- ✅ 퀘스트에 '유산 퀘스트' 표시
- ✅ 재화 HUD: Signal 150, Memory Shard 10
- ✅ Console에 마이그레이션 성공 로그

---

### 시나리오 C: 지원하지 않는 버전 폴백

**목적**: 마이그레이션 불가능한 버전은 안전하게 폴백(profile_select)되는지 확인

**실행**:
1. Console에서 지원하지 않는 버전 주입:

```javascript
const unsupportedSave = {
  version: '0.1.0',  // 지원하지 않는 버전
  language: 'ko-KR',
  profileId: 'explorer',
  savedAt: new Date().toISOString(),
  economy: { signal: 100, memory_shard: 5 },
  turnCount: 0,
  narrativeHistory: [],
  inventory: [],
  quests: [],
  activeRules: []
};

localStorage.setItem('unknown_world_savegame', JSON.stringify(unsupportedSave));
console.log('Unsupported version SaveGame injected!');
```

2. 브라우저 새로고침 (F5)

**기대 결과**:
- Console에 경고 로그
- profile_select 화면으로 이동 (새로 시작)

**Console 로그 예상**:
```
[SaveGame] 지원하지 않는 버전: 0.1.0
[SaveGame] 마이그레이션 실패, 새로 시작 필요
```

**확인 포인트**:
- ✅ profile_select 화면 표시
- ✅ 데이터 손상 없이 새로 시작 가능
- ✅ Console에 명확한 경고 메시지

---

### 시나리오 D: 손상된 SaveGame 폴백

**목적**: 파싱 불가능한 데이터가 저장된 경우 안전하게 폴백되는지 확인

**실행**:
1. Console에서 손상된 데이터 주입:

```javascript
localStorage.setItem('unknown_world_savegame', 'not-valid-json{{{');
console.log('Corrupted SaveGame injected!');
```

2. 브라우저 새로고침 (F5)

**기대 결과**:
- profile_select 화면으로 이동
- 에러가 사용자에게 노출되지 않음

**확인 포인트**:
- ✅ profile_select 화면 표시
- ✅ Console에 `[SaveGame] JSON 파싱 실패` 로그
- ✅ UI 정상 동작

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: 브라우저 개발자 도구 Console
- 주요 로그 메시지:
  - `[SaveGame] 마이그레이션 시작:`: 마이그레이션 시작
  - `[Migration] Applying:`: 단계별 마이그레이션 적용
  - `[SaveGame] 마이그레이션 완료:`: 마이그레이션 성공
  - `[SaveGame] 지원하지 않는 버전:`: 마이그레이션 불가
  - `[SaveGame] 마이그레이션 실패:`: 폴백 처리

### 4.2 localStorage 확인

개발자 도구 → Application → Local Storage:
- Key: `unknown_world_savegame`
- 마이그레이션 후 `version` 필드가 `1.0.0`으로 변경되어야 함

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 최신 버전 SaveGame 정상 로드
- ✅ 구버전(0.9.0) SaveGame 마이그레이션 후 로드
- ✅ 지원하지 않는 버전 안전 폴백
- ✅ 손상된 데이터 안전 폴백

**실패 시 확인**:
- ❌ 마이그레이션 후 스키마 검증 실패 → migrations.ts 변환 로직 확인
- ❌ 마이그레이션 로그 없이 profile_select → extractVersion 함수 확인
- ❌ 에러 노출 → try/catch 블록 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 마이그레이션 후에도 profile_select로 이동

- **원인**: 마이그레이션된 데이터가 스키마 검증 실패
- **해결**: 
  1. Console에서 마이그레이션 후 데이터 확인
  2. migrations.ts의 변환 로직에서 누락된 필드 확인

**오류**: `Cannot read property 'version' of null`

- **원인**: localStorage에 데이터가 없음
- **해결**: 시나리오 B의 스크립트로 데이터 주입

### 5.2 환경별 주의사항

- **Windows**: 개발 서버 포트 8001 사용 (RULE-011)
- **시크릿/프라이빗 브라우저**: localStorage가 세션 종료 시 초기화됨

---

## 6. 기술 세부사항

### 6.1 마이그레이션 흐름

```
JSON 파싱 → 버전 추출 → 마이그레이션 필요? → 
  Yes → upgradeToLatest() → 스키마 검증 → 성공/실패
  No  → 스키마 검증 → 성공/실패
```

### 6.2 버전 체인

```
0.9.0 → 1.0.0 (현재)
```

### 6.3 0.9.0 → 1.0.0 마이그레이션 내용

- `sceneObjects` 필드 추가 (빈 배열)
- `economyLedger` 필드 추가 (빈 배열)
- `mutationTimeline` 필드 추가 (빈 배열)
- `economy.memory_shards` → `economy.memory_shard` 필드명 수정
- 재화 음수 방지 (기본값 주입)
