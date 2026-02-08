# U-097[Mvp] SceneCanvas 렌더 중 Zustand setState 호출 분리 + economy_snapshot credit 필드 제거 실행 가이드

## 1. 개요

두 가지 문제를 수정하여 프로필 선택 후 첫 턴 요청 차단 버그를 해소했습니다:

1. **React 렌더링 경고 수정**: SceneCanvas 컴포넌트의 ResizeObserver 콜백 내부에서 `setCanvasSize`(React useState 업데이터) 실행 중 `setSceneCanvasSize`(Zustand store `set()`)를 호출하던 패턴을 분리하여, React의 **"Cannot update a component while rendering"** 경고를 제거했습니다.

2. **VALIDATION_ERROR 수정**: `turnRunner.ts`에서 `worldStore.economy`를 그대로 `economy_snapshot`에 전달할 때 `credit` 필드가 포함되어 백엔드의 `EconomySnapshot`(`extra="forbid"`) 검증에 실패하던 문제를 수정했습니다. `credit`은 EconomyOutput 전용 필드이므로 입력 스냅샷에서 제외합니다.

**예상 소요 시간**: 3분

**의존성**:
- 의존 유닛: U-085[Mvp] (setSceneCanvasSize 도입 및 ResizeObserver 연동)
- 선행 완료 필요: U-085 완료 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
pnpm install
```

### 2.2 즉시 실행

```bash
# 터미널 1: 프론트엔드 (포트 8001)
pnpm -C frontend dev

# 터미널 2: 백엔드 (포트 8011)
cd backend
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.3 첫 화면 확인

- http://localhost:8001 접속
- 프로필 선택 화면이 표시됨
- 성공 지표: 게임 UI 레이아웃이 정상 렌더

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 프로필 선택 후 첫 턴 요청 정상 진행

**목적**: 기존에 차단되던 첫 요청이 정상 동작하는지 검증

**실행**:
1. http://localhost:8001 접속
2. "서사꾼" (또는 다른) 프로필 클릭
3. 게임 UI 로딩 확인
4. 하단 Action Deck에서 아무 카드 클릭 (예: "탐색하기")

**기대 결과**:
- 게임 로그에 `[TURN 1]` 응답 텍스트가 표시됨
- 요청이 진행되며 Agent Console에 단계/배지가 갱신됨
- **게임이 차단되지 않고 정상 진행**

**확인 포인트**:
- ✅ 첫 턴 응답이 도착하여 내러티브가 표시됨
- ✅ Action Deck에 새 카드가 갱신됨

---

### 시나리오 B: React 콘솔 경고 미발생 확인

**목적**: "Cannot update a component while rendering" 경고가 완전히 제거되었는지 검증

**실행**:
1. 브라우저 DevTools > Console 탭 열기
2. 페이지 새로고침 (F5)
3. 프로필 선택
4. 액션 실행 (턴 진행)

**기대 결과**:
- 콘솔에 "Cannot update a component" 경고가 **전혀 나타나지 않음**

**확인 포인트**:
- ✅ 프로필 선택 시점 콘솔 경고 없음
- ✅ 턴 진행 시점 콘솔 경고 없음
- ✅ 페이지 리사이즈 시에도 경고 없음

---

### 시나리오 C: 브라우저 리사이즈 시 store 동기화 확인

**목적**: useEffect 분리 후에도 리사이즈 시 sceneCanvasSize store가 정상 갱신되는지 검증

**실행**:
1. 프로필 선택 후 게임 진입
2. 브라우저 창 크기를 드래그로 변경 (좁게 → 넓게)
3. 100ms+ 대기 후 안정화
4. 액션 카드 클릭하여 이미지 생성 트리거

**기대 결과**:
- 리사이즈 후 생성된 이미지가 변경된 Scene Canvas 비율에 맞음
- 콘솔에 경고/에러 없음

**확인 포인트**:
- ✅ 리사이즈 후 이미지 비율이 UI에 맞게 생성됨
- ✅ 디바운스(100ms)와 5px 임계값 동작 유지

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:
- ✅ 프로필 선택 후 첫 턴 요청이 정상 진행됨 (게임 차단 없음)
- ✅ 콘솔에 "Cannot update a component while rendering" 경고가 발생하지 않음
- ✅ 브라우저 리사이즈 시 sceneCanvasSize store 값이 정상 갱신됨
- ✅ 기존 ResizeObserver 디바운스(100ms)/5px 임계값 동작 유지
- ✅ 네트워크 요청에서 `economy_snapshot`에 `credit` 필드가 포함되지 않음
- ✅ 백엔드 배지가 모두 OK (schema_ok, economy_ok, safety_ok, consistency_ok)

**실패 시 확인**:
- ❌ 콘솔에 "Cannot update a component" 경고 발생 → `setCanvasSize` 업데이터 내부에서 외부 store를 갱신하는 코드가 남아있는지 확인
- ❌ VALIDATION_ERROR 발생 → 네트워크 탭에서 요청 본문의 `economy_snapshot`에 `credit` 등 추가 필드가 포함되어 있는지 확인
- ❌ 이미지 비율이 UI와 맞지 않음 → useEffect의 canvasSize 가드 조건(width > 0, height > 0) 확인
- ❌ 첫 요청 여전히 차단 → 다른 컴포넌트에서도 동일 패턴이 있는지 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 콘솔에 "Cannot update a component (`App`) while rendering a different component (`SceneCanvas`)" 경고 발생
- **원인**: `setCanvasSize` 업데이터 함수 내부에서 Zustand store를 갱신하는 코드가 남아있음
- **해결**: `SceneCanvas.tsx`의 `setCanvasSize` 콜백 내부에서 `setSceneCanvasSize` 호출이 완전히 제거되었는지 확인

**오류**: 이미지 비율이 잘못 선택됨
- **원인**: useEffect 분리로 인한 1프레임 지연
- **해결**: ResizeObserver 디바운스(100ms)가 이미 존재하므로 실질적 영향 없음. 만약 문제가 되면 이미지 생성 요청 시점에 DOM에서 직접 측정하는 방식으로 보완 가능

### 5.2 환경별 주의사항

- **Windows**: 특이사항 없음
- **macOS/Linux**: 특이사항 없음

---

### 시나리오 D: 텍스트 우선 출력 (Text-first Delivery, U-086 정합성)

**목적**: 백엔드 render_stage에서 이미지 생성을 프론트에 위임하여 텍스트가 이미지보다 먼저 출력되는지 검증

**실행**:
1. 프로필 선택 후 게임 진입
2. 하단 Action Deck에서 카드 클릭 (예: "탐색하기")
3. **3~5초 후** 화면 확인 (이미지 생성 전)

**기대 결과**:
- 게임 로그에 **TURN 텍스트가 먼저 타이핑 시작됨** (이미지 완료 전)
- Scene Canvas에 **"장면 생성 중…"** 로딩 인디케이터 표시
- 10~15초 후 이미지가 도착하여 Scene Canvas에 자연스럽게 반영

**확인 포인트**:
- ✅ 텍스트가 이미지 생성 완료를 기다리지 않고 즉시 출력됨
- ✅ 이미지 생성 중 Scene Canvas에 로딩 인디케이터 표시
- ✅ 이미지 도착 후 정상 반영 (late-binding)

---

## 6. 다음 단계

- ~~U-084~~ (취소됨): 이미지 사이즈 최적화에서 `sceneCanvasSize` store 값을 안전하게 참조 가능
- U-087: 입력 잠금 유닛에서 SceneCanvas 렌더 안정성이 전제됨
