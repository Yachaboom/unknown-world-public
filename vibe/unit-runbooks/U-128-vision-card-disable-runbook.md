# U-128 정밀분석 완료 상태에서 정밀분석 카드 비활성화 실행 가이드

## 1. 개요

정밀분석(Agentic Vision)이 이미 수행되어 핫스팟이 화면에 표시된 상태에서, "정밀분석" 액션 카드를 비활성화하여 불필요한 중복 분석 호출과 비용(1.5x) 낭비를 방지하는 기능입니다. 새 장면 이미지가 생성되어 핫스팟이 초기화되면 정밀분석 카드가 자동으로 다시 활성화됩니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-090[Mvp] (핫스팟 정밀분석 전용 정책), U-087[Mvp] (입력 잠금 SSOT)
- 선행 완료 필요: 프론트엔드/백엔드 개발 서버 실행

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# Frontend (RULE-011: 8001~8010)
cd frontend
pnpm install
pnpm dev
# → http://localhost:8001

# Backend (RULE-011: 8011~8020)
cd backend
uv sync
uv run uvicorn unknown_world.main:app --reload --port 8011
# → http://localhost:8011/health
```

### 2.2 즉시 실행

브라우저에서 `http://localhost:8001` 접속 후 프로필을 선택하여 게임 시작.

### 2.3 첫 화면 확인

- 게임 UI 하단에 Action Deck(카드 3~6장) 표시
- 성공 지표: 프로필 선택 후 게임 화면에 카드가 렌더링됨

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 핫스팟 없는 상태에서 정밀분석 카드 활성 확인

**목적**: 핫스팟이 없을 때 정밀분석 카드가 정상적으로 클릭 가능한지 확인

**실행**:

1. 프로필 선택하여 게임 시작
2. "탐색하기" 등 일반 액션으로 첫 턴 수행
3. 턴 완료 후 Action Deck에서 "정밀분석" 카드 확인

**기대 결과**:

- 정밀분석 카드에 `🔍 정밀분석` 배지 표시
- 카드가 **활성 상태** (클릭 가능, 시안(cyan) 테두리)
- 비활성화 오버레이 없음

**확인 포인트**:

- ✅ 정밀분석 카드가 활성화 상태로 렌더링
- ✅ 카드 클릭 시 정상적으로 턴 실행
- ✅ DevTools Console: `__worldStore.getState().sceneObjects.length === 0`

---

### 시나리오 B: 정밀분석 수행 후 카드 비활성화 확인

**목적**: 정밀분석으로 핫스팟이 생성된 후 정밀분석 카드가 비활성화되는지 확인

**전제 조건**:

- 시나리오 A에서 장면 이미지가 생성된 상태

**실행**:

1. "정밀분석" 카드를 클릭하여 비전 분석 턴 실행
2. 턴 완료 후 핫스팟(오브젝트)이 Scene Canvas에 표시되는지 확인
3. Action Deck에서 정밀분석 카드 상태 확인

**기대 결과**:

- Scene Canvas에 핫스팟 1~3개 표시 (클릭 가능한 오브젝트 버튼)
- 정밀분석 카드가 **비활성화(disabled)** 상태:
  - 카드 opacity 약 0.4 (dimmed)
  - 테두리 색상이 흐려짐 (rgba(0, 229, 255, 0.25))
  - 비활성화 오버레이에 "이미 분석된 장면입니다" 텍스트 표시
  - 카드 클릭 불가 (disabled 속성)
- 다른 카드(일반 액션, 대안)는 정상 활성 상태

**확인 포인트**:

- ✅ 핫스팟이 1개 이상 생성됨 (`__worldStore.getState().sceneObjects.length > 0`)
- ✅ 정밀분석 카드에 `aria-disabled="true"` 속성
- ✅ 비활성화 사유: "이미 분석된 장면입니다" (ko-KR) / "Scene already analyzed" (en-US)
- ✅ 카드 클릭해도 턴이 실행되지 않음
- ✅ 🔍 정밀분석 배지도 함께 dim 처리

---

### 시나리오 C: 새 장면 생성 후 카드 재활성화 확인

**목적**: 새 이미지가 생성되어 핫스팟이 초기화되면 정밀분석 카드가 다시 활성화되는지 확인

**전제 조건**:

- 시나리오 B에서 핫스팟이 존재하고 정밀분석 카드가 비활성화된 상태

**실행**:

1. 일반 액션 카드(핫스팟 클릭 또는 일반 행동)를 실행하여 새 장면 이미지를 생성
2. 턴 완료 후 핫스팟이 초기화되었는지 확인
3. Action Deck에서 정밀분석 카드 상태 확인

**기대 결과**:

- Scene Canvas에 새 이미지가 표시됨
- 기존 핫스팟이 모두 사라짐 (U-090 정책: 장면 전환 시 초기화)
- 정밀분석 카드가 **다시 활성화**:
  - 정상 opacity (1.0)
  - 시안(cyan) 테두리 색상 복원
  - 비활성화 오버레이 없음
  - 카드 클릭 가능

**확인 포인트**:

- ✅ 핫스팟 초기화됨 (`__worldStore.getState().sceneObjects.length === 0`)
- ✅ 정밀분석 카드가 활성 상태로 복원
- ✅ 카드 클릭 시 정상적으로 턴 실행 가능

---

## 4. 실행 결과 확인

### 4.1 DevTools Console 검증

브라우저 DevTools Console에서 다음 명령어로 상태를 확인할 수 있습니다:

```javascript
// 핫스팟(SceneObjects) 수 확인
__worldStore.getState().sceneObjects.length

// 핫스팟 상세 정보
__worldStore.getState().sceneObjects.map(o => ({ id: o.id, label: o.label }))

// 현재 턴 카운트
__worldStore.getState().turnCount
```

### 4.2 성공/실패 판단 기준

**성공**:

- ✅ 핫스팟 없을 때 정밀분석 카드 활성
- ✅ 핫스팟 있을 때 정밀분석 카드 비활성화 + 사유 표시
- ✅ 새 장면 생성 후 카드 자동 재활성화
- ✅ i18n: ko-KR과 en-US 모두 정상 표시

**실패 시 확인**:

- ❌ 카드가 비활성화되지 않음 → `VISION_TRIGGER_ACTION_IDS`에 카드 ID가 포함되는지 확인
- ❌ 새 장면 후 재활성화되지 않음 → `worldStore.applyTurnOutput`의 핫스팟 초기화 로직 확인
- ❌ 사유 텍스트 미표시 → i18n 키 `action.vision_already_analyzed` 존재 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 정밀분석 카드가 항상 활성 상태

- **원인**: 서버가 보내는 카드 ID가 `VISION_TRIGGER_ACTION_IDS`에 포함되지 않음
- **해결**: `ActionDeck.tsx`의 `VISION_TRIGGER_ACTION_IDS` 상수에 해당 ID 추가

**오류**: 새 장면 후에도 카드가 비활성화 상태

- **원인**: 새 이미지 생성 시 핫스팟 초기화가 동작하지 않음
- **해결**: `worldStore.ts`의 `applyTurnOutput` 내 `isNewImageGeneration` 판정 로직 확인

### 5.2 환경별 주의사항

- **Windows**: 개발 서버 포트 충돌 시 `pnpm kill` 실행 후 재시작
- **macOS/Linux**: 동일 절차

---

## 6. 다음 단계

- U-115: 핫스팟 컴팩트 원형 디자인에서 "이미 분석됨" 상태 시각 피드백 통합
- CP-MVP-03: 10분 데모 루프에서 정밀분석 → 핫스팟 → 비활성화 → 새 장면 → 재활성화 시나리오 검증
