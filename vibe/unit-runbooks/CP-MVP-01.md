# CP-MVP-01: 체크포인트 - 스트리밍/스키마/폴백 실행 가이드

## 1. 개요

초기 MVP 루프가 "항상 플레이 가능한 데모" 조건을 만족하는지, **스트리밍/검증/복구/폴백** 관점에서 수동 검증합니다.

- HTTP Streaming으로 Queue/Badges가 먼저 보이고(TTFB 체감), 최종 TurnOutput이 UI에 반영되는지 확인
- TurnOutput 스키마 실패를 유도해도 Auto-repair 또는 safe fallback으로 종료되는지 확인
- 채팅 UI/프롬프트 노출/좌표 규약 위반이 없는지 확인

**예상 소요 시간**: 15분

**의존성**:
- 의존 유닛: RU-002[Mvp] (이벤트 계약/폴백 흐름 정리)
- 선행 완료 필요: U-007, U-008 (스트리밍 파이프라인)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
pnpm -C frontend install

# 백엔드 의존성 동기화
cd backend && uv sync && cd ..
```

### 2.2 서버 실행

**터미널 1 - 백엔드 (포트 8011)**:
```bash
cd backend
uv run uvicorn unknown_world.main:app --reload --port 8011
# → http://localhost:8011/health 로 확인
```

**터미널 2 - 프론트엔드 (포트 8001)**:
```bash
pnpm -C frontend dev
# → http://localhost:8001 로 접근
```

### 2.3 즉시 실행

브라우저에서 http://localhost:8001 접속

### 2.4 첫 화면/결과 확인

- CRT 테마의 게임 UI가 렌더링됨
- Agent Console에 Queue(Parse→Commit), Badges(검증 대기 중) 표시
- Action Deck에 카드 3장(비용/위험 표시)
- Economy HUD에 Signal/Shard 표시

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 기본 데모 (성공 경로)

**목적**: HTTP Streaming으로 단계/배지가 먼저 보이고 최종 TurnOutput이 UI에 반영되는지 확인

**실행**:
1. 명령 입력창에 "문을 열어본다" 입력
2. EXECUTE 버튼 클릭

**기대 결과**:
1. Agent Console 상태가 "PROCESSING"으로 변경
2. Queue에서 Parse → Validate → Plan → Resolve → Render → Verify → Commit 순으로 진행
3. Badges에 Schema OK, Economy OK, Safety OK, Consistency OK 표시
4. 내러티브 피드에 새 턴 텍스트 표시 (타자 효과)
5. Economy HUD에서 Signal 차감 확인 (예: 100 → 96)
6. Action Deck에 새로운 카드들 표시

**확인 포인트**:
- ✅ TTFB < 2초 (첫 stage 이벤트가 즉시 도착)
- ✅ 모든 7단계가 순서대로 진행됨
- ✅ 4개 배지 모두 OK 상태
- ✅ 경제 상태가 TurnOutput의 balance_after와 일치

---

### 시나리오 B: 입력 검증 실패 (에러 폴백)

**목적**: 잘못된 입력 시 error + final(폴백)으로 안전하게 종료되는지 확인

**실행**:
```bash
# 잘못된 JSON 형식으로 API 직접 호출
curl -s -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d '{"invalid_field": true}'
```

**기대 결과**:
```
{"type": "error", "message": "Invalid input", "code": "VALIDATION_ERROR"}
{"type": "final", "data": {"language": "ko-KR", "narrative": "잠시 혼란이 있었습니다. 다시 시도해주세요.", ...}}
```

**확인 포인트**:
- ✅ error 이벤트가 먼저 송출됨
- ✅ final(폴백) 이벤트로 종료됨 (스트림 종료 인바리언트)
- ✅ economy.cost = 0 (손실 없음)
- ✅ agent_console.badges에 "schema_fail" 포함
- ✅ UI가 빈 화면이 되지 않음

---

### 시나리오 C: NDJSON 스트리밍 검증

**목적**: 모든 이벤트 타입이 올바른 순서로 스트리밍되는지 확인

**실행**:
```bash
# 테스트 JSON 파일 생성
cat > /tmp/test-turn.json << 'EOF'
{
  "language": "ko-KR",
  "text": "테스트 입력",
  "click": null,
  "client": {
    "viewport_w": 1920,
    "viewport_h": 1080,
    "theme": "dark"
  },
  "economy_snapshot": {
    "signal": 50,
    "memory_shard": 3
  }
}
EOF

# API 호출 (seed 파라미터로 재현성 보장)
curl -s -X POST "http://localhost:8011/api/turn?seed=12345" \
  -H "Content-Type: application/json" \
  -d @/tmp/test-turn.json
```

**기대 결과**:
```
{"type": "stage", "name": "parse", "status": "start"}
{"type": "stage", "name": "parse", "status": "complete"}
...
{"type": "badges", "badges": ["schema_ok", "economy_ok"]}
...
{"type": "badges", "badges": ["schema_ok", "economy_ok", "safety_ok", "consistency_ok"]}
...
{"type": "narrative_delta", "text": "당신은 \"테스트 입력\"..."}
...
{"type": "final", "data": {...}}
```

**확인 포인트**:
- ✅ stage 이벤트: 7단계 각각 start/complete
- ✅ badges 이벤트: Validate 후 2개, Verify 후 4개
- ✅ narrative_delta 이벤트: 텍스트가 청크로 분할됨
- ✅ final 이벤트: 완전한 TurnOutput 포함
- ✅ 좌표 규약: box_2d가 {ymin, xmin, ymax, xmax} 형식, 0~1000 범위

---

## 4. 금지사항/인바리언트 체크

### 4.1 채팅 버블 UI 확인 (RULE-002)

**검증 방법**:
```bash
# 프론트엔드 코드에서 ChatBubble 검색
grep -ri "ChatBubble\|chat-bubble\|chatBubble" frontend/src/
# 결과: 매칭 없음 ✅
```

**UI에서 확인**:
- 내러티브가 "게임 로그/피드" 형태로 표시됨
- 메신저형 버블 UI 없음

### 4.2 프롬프트 노출 확인 (RULE-007/008)

**검증 방법**:
1. 브라우저 DevTools > Console 탭 확인
2. 네트워크 탭에서 응답 확인

**확인 포인트**:
- ✅ 프롬프트 원문이 UI/콘솔에 노출되지 않음
- ✅ Agent Console에 단계/배지/복구 횟수만 표시됨
- ✅ Chain-of-thought 텍스트 없음

### 4.3 좌표 규약 확인 (RULE-009)

**검증 방법**:
```bash
# API 응답에서 box_2d 확인
curl -s -X POST "http://localhost:8011/api/turn?seed=12345" \
  -H "Content-Type: application/json" \
  -d @/tmp/test-turn.json | jq '.data.ui.objects[0].box_2d'
```

**기대 결과**:
```json
{
  "ymin": 543,
  "xmin": 422,
  "ymax": 742,
  "xmax": 601
}
```

**확인 포인트**:
- ✅ [ymin, xmin, ymax, xmax] 순서
- ✅ 0~1000 정규화 범위 내 값
- ✅ 0~1 좌표계나 [x,y,w,h] 형식이 아님

---

## 5. 실행 결과 확인

### 5.1 성공/실패 판단 기준

**성공** (MVP Hard Gate 통과):
- ✅ **Schema OK**: TurnOutput JSON이 Zod 스키마를 통과
- ✅ **Economy OK**: 비용/잔액 불일치 없음, 잔액 음수 금지
- ✅ **Safety OK**: 차단 시 명시 + 안전한 대체 결과 제공
- ✅ **Consistency OK**: WorldState/Rule Board/Memory Pin 일관성 유지

**실패 시 확인**:
- ❌ 스트리밍이 시작되지 않음 → 백엔드 서버 상태 확인
- ❌ Zod 검증 실패 → 프론트엔드 콘솔에서 에러 확인
- ❌ 경제 상태 불일치 → TurnOutput.economy.balance_after 확인

### 5.2 관측 메트릭

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| Streaming TTFB | < 2s | 네트워크 탭에서 첫 바이트 시간 |
| 단계 완료 시간 | < 1s | stage 이벤트 타임스탬프 |
| 스키마 통과율 | 100% | Badges에서 Schema OK 확인 |

---

## 6. 문제 해결 (Troubleshooting)

### 6.1 일반적인 오류

**오류**: `CORS error`
- **원인**: 프론트엔드-백엔드 포트 불일치
- **해결**: 백엔드 CORS 설정에 http://localhost:8001 포함 확인

**오류**: `Connection refused`
- **원인**: 백엔드 서버 미실행
- **해결**: `uv run uvicorn unknown_world.main:app --reload --port 8011` 실행

**오류**: `TurnOutput validation failed` (콘솔)
- **원인**: 서버 응답이 Zod 스키마와 불일치
- **해결**: 백엔드 TurnOutput Pydantic 모델과 프론트엔드 Zod 스키마 동기화 확인

### 6.2 환경별 주의사항

- **Windows**: curl 명령에서 JSON 이스케이프 문제 발생 가능 → 파일로 저장 후 `@파일명` 사용
- **macOS/Linux**: 특이사항 없음

---

## 7. 체크포인트 증거

### 7.1 검증 완료 시 확인 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| HTTP Streaming TTFB < 2s | ✅ | 첫 stage 이벤트 즉시 도착 |
| 7단계 Queue 진행 표시 | ✅ | Parse→Commit |
| 4개 배지 OK 표시 | ✅ | Schema/Economy/Safety/Consistency |
| 입력 실패 시 폴백 | ✅ | error + final(폴백) 순서 |
| 채팅 버블 UI 없음 | ✅ | RULE-002 준수 |
| 프롬프트 노출 없음 | ✅ | RULE-007/008 준수 |
| bbox 0~1000 정규화 | ✅ | RULE-009 준수 |

### 7.2 스크린샷

체크포인트 실행 시 다음 스크린샷을 캡처하여 보관:
1. 초기 화면 (CRT 테마 게임 UI)
2. 스트리밍 중 (PROCESSING 상태)
3. 완료 후 (Badges OK, 새 내러티브)

---

_본 런북은 CP-MVP-01 체크포인트를 위해 작성되었습니다._
