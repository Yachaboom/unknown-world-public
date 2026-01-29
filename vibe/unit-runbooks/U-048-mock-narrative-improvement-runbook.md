# U-048[Mvp] Mock Orchestrator 내러티브 개선 실행 가이드

## 1. 개요

Mock 모드에서 TurnInput이 Action Deck/클릭/드롭으로 들어오는 경우, 내러티브가 `...라고 말했습니다` 템플릿 대신 입력 타입별 **행동 로그** 형태로 표현되도록 개선했습니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-007[Mvp] (모의 Orchestrator 기본 골격)
- 선행 완료 필요: 백엔드 서버 실행 가능 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# backend 디렉토리로 이동
cd backend

# 의존성 설치 (uv 사용)
uv sync
```

### 2.2 백엔드 서버 실행

```bash
cd backend
uv run uvicorn unknown_world.main:app --reload --port 8011
```

### 2.3 첫 화면/결과 확인

- 서버가 `http://localhost:8011`에서 실행됨
- 성공 지표: `Uvicorn running on http://0.0.0.0:8011` 메시지 출력

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 액션 카드 실행 (action_id)

**목적**: Action Deck 카드 클릭 시 "말했습니다" 대신 행동 로그 프리픽스가 표시되는지 확인

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "문을 열어본다",
    "action_id": "action_1",
    "client": {"viewport_w": 1920, "viewport_h": 1080},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }'
```

**기대 결과**:

- 내러티브가 `[행동]`, `[실행]`, 또는 `[시도]` 중 하나로 시작
- 예: `[행동] 문을 열어본다: 어둠 속에서 희미한 빛이...`

**확인 포인트**:

- ✅ 내러티브에 `말했습니다` / `You said` 포함되지 않음
- ✅ 행동 로그 프리픽스(`[행동]`, `[실행]`, `[시도]`)로 시작

---

### 시나리오 B: 핫스팟 클릭 (click)

**목적**: 핫스팟 클릭 시 조사/탐색 행동 로그로 표시되는지 확인

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "click": {"object_id": "obj_door"},
    "client": {"viewport_w": 1920, "viewport_h": 1080},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }'
```

**기대 결과**:

- 내러티브가 `[조사]`, `[탐색]`, 또는 `[상호작용]` 중 하나로 시작
- 예: `[조사] obj_door: 오래된 문이 삐걱거리며...`

**확인 포인트**:

- ✅ 클릭한 오브젝트 ID가 프리픽스에 포함됨
- ✅ 조사/탐색 계열 프리픽스 사용

---

### 시나리오 C: 아이템 드롭 (drop)

**목적**: 인벤토리 아이템을 핫스팟에 드롭 시 사용/조합 행동 로그로 표시되는지 확인

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "drop": {
      "item_id": "key_001",
      "target_object_id": "obj_lock",
      "target_box_2d": {"ymin": 100, "xmin": 200, "ymax": 300, "xmax": 400}
    },
    "client": {"viewport_w": 1920, "viewport_h": 1080},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }'
```

**기대 결과**:

- 내러티브가 `[사용]`, `[조합]`, 또는 `[적용]` 중 하나로 시작
- 예: `[사용] key_001 → obj_lock: 안개가 걷히자...`

**확인 포인트**:

- ✅ 아이템 ID와 대상 오브젝트 ID가 프리픽스에 포함됨
- ✅ 사용/조합 계열 프리픽스 사용

---

### 시나리오 D: 자유 텍스트 입력 (free text)

**목적**: 자유 입력도 "말했습니다" 대신 행동 로그로 표시되는지 확인 (Q1: Option B 결정)

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "주변을 살펴본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }'
```

**기대 결과**:

- 내러티브가 `[입력]`, `[명령]`, 또는 `[지시]` 중 하나로 시작
- 예: `[입력] 주변을 살펴본다: 발걸음 소리가...`

**확인 포인트**:

- ✅ 입력 텍스트가 프리픽스에 포함됨
- ✅ 긴 텍스트(30자 초과)는 앞부분만 표시됨

---

### 시나리오 E: 결정적 다양성 확인

**목적**: 같은 seed에서 다른 입력을 넣었을 때 다른 결과가 나오는지 확인

**실행**:

```bash
# 동일 seed로 두 번 요청하되 입력만 다르게
# 요청 1: 문을 열어본다
curl -s -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "문을 열어본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }' | grep -o '"narrative":"[^"]*"'

# 요청 2: 주변을 탐색한다
curl -s -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "주변을 탐색한다",
    "client": {"viewport_w": 1920, "viewport_h": 1080},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }' | grep -o '"narrative":"[^"]*"'
```

**기대 결과**:

- 두 요청의 내러티브가 서로 다름 (다른 입력 → 다른 해시 → 다른 결과)

**확인 포인트**:

- ✅ 입력이 다르면 프리픽스 템플릿 선택이 달라짐
- ✅ 동일 입력은 동일 결과 (재현성 유지)

---

### 시나리오 F: 영어 언어 테스트

**목적**: 영어 언어 설정에서도 행동 로그가 올바르게 표시되는지 확인

**실행**:

```bash
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en-US",
    "text": "Open the door",
    "action_id": "action_1",
    "client": {"viewport_w": 1920, "viewport_h": 1080},
    "economy_snapshot": {"signal": 100, "memory_shard": 5}
  }'
```

**기대 결과**:

- 내러티브가 `[ACTION]`, `[EXECUTE]`, 또는 `[ATTEMPT]` 중 하나로 시작
- 예: `[ACTION] Open the door: A faint light seeps...`

**확인 포인트**:

- ✅ 영어 프리픽스 템플릿 사용
- ✅ `You said` 포함되지 않음

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 서버 콘솔에서 요청 로그 확인
- 200 OK 응답 확인

### 4.2 성공/실패 판단 기준

**성공**:

- ✅ 모든 시나리오에서 내러티브에 `말했습니다` / `You said` 없음
- ✅ 입력 타입에 따라 적절한 행동 로그 프리픽스 적용
- ✅ 다른 입력에 대해 다른 내러티브 생성 (결정적 다양성)
- ✅ 동일 입력에 대해 동일 내러티브 생성 (재현성)
- ✅ 영어/한국어 모두 올바른 프리픽스 적용

**실패 시 확인**:

- ❌ `말했습니다` 포함됨 → mock.py의 내러티브 생성 로직 확인
- ❌ 모든 입력에 같은 결과 → per-turn seed 계산 확인
- ❌ 프리픽스 없음 → `has_meaningful_input` 조건 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `Connection refused`

- **원인**: 백엔드 서버 미실행
- **해결**: `uv run uvicorn unknown_world.main:app --reload --port 8011`

**오류**: `422 Unprocessable Entity`

- **원인**: 요청 본문 스키마 불일치
- **해결**: TurnInput 스키마에 맞게 요청 본문 수정

### 5.2 환경별 주의사항

- **Windows**: curl 명령에서 JSON 이스케이프 주의 (PowerShell에서는 따옴표 처리 다름)
- **macOS/Linux**: 기본 curl 사용

---

## 6. 변경 사항 요약

### 6.1 개선된 내러티브 프리픽스

| 입력 타입 | 기존 (U-007) | 개선 (U-048) |
|-----------|--------------|--------------|
| action_id | `"...라고 말했습니다"` | `[행동] / [실행] / [시도]` |
| click | `"...라고 말했습니다"` | `[조사] / [탐색] / [상호작용]` |
| drop | `"...라고 말했습니다"` | `[사용] / [조합] / [적용]` |
| free text | `"...라고 말했습니다"` | `[입력] / [명령] / [지시]` |

### 6.2 결정적 다양성 메커니즘

- base seed + 입력 특징(text, action_id, click.object_id, drop.item_id, drop.target_object_id) 해시
- 동일 입력 → 동일 결과 (재현성)
- 다른 입력 → 다른 결과 (다양성)
