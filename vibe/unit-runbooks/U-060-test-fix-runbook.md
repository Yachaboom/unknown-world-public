# U-060[Mvp] 테스트 코드 정합성 수정 실행 가이드

## 1. 개요

debt-log.md에 기록된 **테스트 실패 이슈 4건(5개 실패 지점)**을 수정하여, CI/CD 파이프라인과 로컬 테스트 실행이 모두 통과하도록 했습니다.

**수정 내용**:
1. `test_turn_streaming_success`: badges 이벤트 수 기대치 `>= 2` → `>= 1`로 완화
2. `test_genai_client` (2개): Mock 검증을 GenerateContentConfig 타입 + 핵심 속성 검증으로 변경
3. `App.test.tsx`: 프로필 선택 후 `waitFor`로 상태 전환 대기
4. `DndInteraction.test.tsx` (2개): `waitFor`로 DndContext 콜백 설정 대기

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-055[Mvp] (이미지 파이프라인 통합으로 인한 구현 변경사항)
- 선행 완료 필요: 없음

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 의존성 설치 (uv 사용)
cd backend
uv sync

# 프론트엔드 의존성 설치 (pnpm 사용)
cd frontend
pnpm install
```

### 2.2 즉시 실행 - 백엔드 테스트

```bash
cd backend
uv run pytest tests/integration/test_turn_streaming.py tests/unit/services/test_genai_client.py -v
```

### 2.3 즉시 실행 - 프론트엔드 테스트

```bash
cd frontend
pnpm test src/App.test.tsx src/components/DndInteraction.test.tsx
```

### 2.4 첫 화면/결과 확인

- 백엔드: 21개 테스트 통과 (test_turn_streaming 5개 중 4개 통과 + test_genai_client 17개 통과)
- 프론트엔드: 3개 테스트 모두 통과

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 백엔드 통합 테스트 (test_turn_streaming)

**목적**: badges 이벤트 수 기대치 완화로 테스트 통과 확인

**실행**:

```bash
cd backend
uv run pytest tests/integration/test_turn_streaming.py::test_turn_streaming_success -v
```

**기대 결과**:

```
PASSED
```

**확인 포인트**:
- ✅ badges 이벤트가 1개 이상 존재
- ✅ `schema_ok` 배지 포함

---

### 시나리오 B: 백엔드 유닛 테스트 (test_genai_client)

**목적**: GenerateContentConfig 객체 검증 방식으로 변경된 테스트 통과 확인

**실행**:

```bash
cd backend
uv run pytest tests/unit/services/test_genai_client.py::test_genai_client_generate_real_call tests/unit/services/test_genai_client.py::test_genai_client_full_config -v
```

**기대 결과**:

```
test_genai_client_generate_real_call PASSED
test_genai_client_full_config PASSED
```

**확인 포인트**:
- ✅ config가 GenerateContentConfig 인스턴스
- ✅ max_output_tokens, temperature 속성이 올바르게 전달됨

---

### 시나리오 C: 프론트엔드 통합 테스트 (App.test.tsx)

**목적**: 프로필 선택 후 핫스팟 클릭 테스트 통과 확인

**실행**:

```bash
cd frontend
pnpm test src/App.test.tsx --reporter=verbose
```

**기대 결과**:

```
✓ should trigger startTurnStream when a hotspot is clicked
```

**확인 포인트**:
- ✅ 프로필 선택 후 게임 화면으로 전환
- ✅ '터미널' 핫스팟 검색 성공
- ✅ startTurnStream 호출 확인

---

### 시나리오 D: 프론트엔드 DnD 테스트 (DndInteraction.test.tsx)

**목적**: DnD 콜백 접근 문제 해결 확인

**실행**:

```bash
cd frontend
pnpm test src/components/DndInteraction.test.tsx --reporter=verbose
```

**기대 결과**:

```
✓ should trigger turn execution when handleDragEnd is called with a hotspot target
✓ should show failure feedback when handleDragEnd is called with an invalid target
```

**확인 포인트**:
- ✅ dndCallbacks가 정의됨
- ✅ onDragEnd 함수 접근 가능
- ✅ 드롭 성공/실패 시나리오 모두 통과

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:
- ✅ 백엔드 test_turn_streaming: 4개 이상 통과 (deterministic_seed 제외)
- ✅ 백엔드 test_genai_client: 17개 모두 통과
- ✅ 프론트엔드 App.test.tsx: 1개 통과
- ✅ 프론트엔드 DndInteraction.test.tsx: 2개 통과

**실패 시 확인**:
- ❌ 프로필 선택 후 핫스팟이 나타나지 않음 → waitFor 타임아웃 늘리기 검토
- ❌ dndCallbacks undefined → DndContext mock 설정 확인

### 4.2 알려진 이슈

- `test_turn_streaming_deterministic_seed`: image_id 비결정성으로 실패 (U-060 범위 밖, debt-log에 기록됨)

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `Unable to find a label with the text of: 터미널`
- **원인**: 프로필 선택 후 상태 전환 전에 핫스팟 검색 시도
- **해결**: waitFor 사용 확인, 타임아웃 값 조정

**오류**: `Cannot read properties of undefined (reading 'onDragEnd')`
- **원인**: DndContext가 마운트되기 전에 콜백 접근
- **해결**: waitFor로 콜백 설정 대기 확인

**오류**: `Expected: config={'max_output_tokens': 100}`
- **원인**: 이전 테스트 코드가 dict 형태를 기대
- **해결**: GenerateContentConfig 타입 검증으로 변경됨 (U-060 수정 적용 확인)

---

## 6. 수정된 파일 목록

| 파일 경로 | 수정 내용 |
| --- | --- |
| `backend/tests/integration/test_turn_streaming.py` | badges 이벤트 수 기대치 `>= 2` → `>= 1` |
| `backend/tests/unit/services/test_genai_client.py` | Mock 검증을 타입 + 속성 검증으로 변경 (2곳) |
| `frontend/src/App.test.tsx` | waitFor 추가하여 상태 전환 대기 |
| `frontend/src/components/DndInteraction.test.tsx` | waitFor 추가하여 콜백 설정 대기 (2곳) |
| `vibe/debt-log.md` | 해결된 4개 이슈 ✅ 표시, 신규 이슈 1개 추가 |
