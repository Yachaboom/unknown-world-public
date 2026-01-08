# U-008[Mvp] 프론트 HTTP Streaming 클라이언트 + Agent Console/배지 실행 가이드

## 1. 개요

프론트엔드에서 `/api/turn` **HTTP Streaming 응답 스트림**을 소비하여 **단계(Queue)/배지(Badges)/Auto-repair 트레이스**를 실시간으로 표시하고, 최종 TurnOutput을 Zod 검증 후 UI에 반영하는 기능을 구현했습니다.

**주요 기능**:
- fetch 기반 HTTP Streaming + NDJSON 파서
- Zustand 상태 관리 (queue/badges/repair)
- Agent Console 실시간 렌더링
- TurnOutput Zod 검증 및 폴백 처리

**프로토콜 버전**: v1 (현행 계약) — PRD 8.4.3 참조. 클라이언트는 v1(`data`) 및 v2(`turn_output`) 별칭을 모두 수용합니다.

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-004 (고정 HUD 레이아웃), U-006 (Zod 스키마), U-007 (스트림 이벤트 계약)
- 선행 완료 필요: 백엔드 서버 실행 (포트 8011)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치 (프로젝트 루트에서)
cd frontend
pnpm install
```

### 2.2 백엔드 서버 실행 (의존 유닛 확인)

```bash
# 터미널 1: 백엔드 서버 실행 (포트 8011)
cd backend
uv run uvicorn unknown_world.main:app --host 0.0.0.0 --port 8011 --reload
```

**확인**: `http://localhost:8011/docs`에서 Swagger UI 접근 가능

### 2.3 프론트엔드 서버 실행

```bash
# 터미널 2: 프론트엔드 서버 실행 (포트 8001)
cd frontend
pnpm dev -- --port 8001
```

### 2.4 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- 성공 지표:
  - CRT 테마의 게임 UI 레이아웃 표시
  - Agent Console 패널에 "IDLE" 상태 표시
  - 단계 큐(Queue)에 Parse→...→Commit 단계 표시

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 명령 입력 및 스트리밍 확인

**목적**: 사용자 입력 시 Agent Console에 실시간 단계 진행 표시 확인

**실행**:
1. 브라우저에서 `http://localhost:8001` 접속
2. 하단 명령 입력창에 "문을 열어본다" 입력
3. EXECUTE 버튼 클릭 또는 Enter 키

**기대 결과**:
- Agent Console 상태가 "IDLE" → "PROCESSING"으로 변경
- 단계 큐에서 Parse, Validate, Plan, ... 순서로 상태 변화
  - ○ (pending) → ◎ (in_progress) → ● (completed)
- 스트리밍 완료 후 내러티브 피드에 응답 추가

**확인 포인트**:
- ✅ PROCESSING 상태에서 단계가 순차적으로 진행됨
- ✅ 완료 후 상태가 IDLE로 복귀
- ✅ 내러티브에 새 항목 추가됨

---

### 시나리오 B: 배지(Badges) 표시 확인

**목적**: 검증 배지가 정상적으로 표시되는지 확인

**실행**:
1. 시나리오 A 완료 후 Agent Console 확인

**기대 결과**:
```
Badges
┌────────────┬────────────┐
│ Schema OK  │ Economy OK │
├────────────┼────────────┤
│ Safety OK  │ Consistency│
│            │    OK      │
└────────────┴────────────┘
```

**확인 포인트**:
- ✅ 4개 배지가 2x2 그리드로 표시
- ✅ OK 배지는 녹색, FAIL 배지는 빨간색

---

### 시나리오 C: 액션 카드 클릭

**목적**: 액션 카드 클릭으로 턴 실행 확인

**실행**:
1. Footer의 Action Deck에서 아무 카드 클릭

**기대 결과**:
- Agent Console이 다시 PROCESSING 상태로 전환
- 새 턴이 실행되고 내러티브 추가

**확인 포인트**:
- ✅ 카드 클릭 시 턴 실행됨
- ✅ 스트리밍 중 카드 비활성화됨 (disabled)
- ✅ 경제 HUD의 Signal 값이 업데이트됨

---

### 시나리오 D: 스트리밍 중 UI 상태

**목적**: 스트리밍 중 UI가 적절히 비활성화되는지 확인

**실행**:
1. 명령 입력 후 EXECUTE 클릭
2. 스트리밍 중 UI 상태 확인

**기대 결과**:
- 입력창에 "처리 중..." placeholder 표시
- EXECUTE 버튼이 "WAIT"로 변경되고 비활성화
- 액션 카드들이 반투명해지고 클릭 불가

**확인 포인트**:
- ✅ 스트리밍 중 중복 요청 불가
- ✅ 완료 후 UI 정상 활성화

---

### 시나리오 E: 네트워크 에러 처리

**목적**: 백엔드 연결 실패 시 에러 표시 확인

**실행**:
1. 백엔드 서버 종료 (Ctrl+C)
2. 프론트엔드에서 명령 입력 후 EXECUTE 클릭

**기대 결과**:
- Agent Console에 에러 메시지 표시
- 연결 상태가 "OFFLINE"으로 변경

**확인 포인트**:
- ✅ 에러 메시지가 빨간색 박스로 표시
- ✅ UI가 멈추지 않고 에러 상태 표시
- ✅ 백엔드 재시작 후 정상 동작 가능

---

## 4. 실행 결과 확인

### 4.1 브라우저 개발자 도구

- **Console 탭**: NDJSON 파싱 경고/에러 확인
- **Network 탭**: `/api/turn` POST 요청 확인
  - 요청 헤더: `Content-Type: application/json`
  - 응답 헤더: `Content-Type: application/x-ndjson`

### 4.2 생성 파일

| 파일 경로 | 목적 |
|-----------|------|
| `frontend/src/api/turnStream.ts` | NDJSON 파서 + HTTP Streaming 클라이언트 |
| `frontend/src/stores/agentStore.ts` | Zustand 상태 관리 |
| `frontend/src/components/AgentConsole.tsx` | Agent Console 컴포넌트 |

### 4.3 수정 파일

| 파일 경로 | 변경 내용 |
|-----------|-----------|
| `frontend/src/App.tsx` | 스트림 연동, 상태 관리 |
| `frontend/src/style.css` | Agent Console 스타일 추가 |

### 4.4 성공/실패 판단 기준

**성공**:
- ✅ Agent Console에 단계 진행이 실시간 표시됨
- ✅ 배지가 정상적으로 표시됨
- ✅ TurnOutput이 Zod 검증을 통과하고 UI에 반영됨
- ✅ 스트리밍 중 UI가 적절히 비활성화됨
- ✅ 에러 발생 시 UI가 멈추지 않고 에러 표시

**실패 시 확인**:
- ❌ 백엔드 미실행 → 포트 8011에서 서버 실행
- ❌ CORS 에러 → 백엔드 CORS 설정 확인
- ❌ JSON 파싱 실패 → 브라우저 콘솔에서 NDJSON 형식 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `fetch failed` 또는 `Network error`

- **원인**: 백엔드 서버 미실행
- **해결**: 
  ```bash
  cd backend
  uv run uvicorn unknown_world.main:app --port 8011
  ```

**오류**: CORS policy 차단

- **원인**: 백엔드 CORS 설정 누락
- **해결**: `backend/src/unknown_world/main.py`에서 CORS 미들웨어 확인
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:8001"],
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

**오류**: TurnOutput validation failed

- **원인**: 서버 응답이 Zod 스키마와 불일치
- **해결**: 
  1. 브라우저 콘솔에서 경고 메시지 확인
  2. 폴백 UI가 표시되었는지 확인
  3. 서버 Pydantic 모델과 클라이언트 Zod 스키마 동기화

### 5.2 환경별 주의사항

- **Windows**: 백엔드/프론트엔드 터미널을 별도로 실행
- **macOS/Linux**: 동일

---

## 6. 다음 단계

- **U-009[Mvp]**: Action Deck 실제 카드 렌더링 및 비용 시스템 연동
- **U-010[Mvp]**: Scene Canvas 내 이미지 렌더링 및 핫스팟 오버레이 구현
- **CP-MVP-01**: "스트리밍 + 스키마 + 폴백" 통합 검증

