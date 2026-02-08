# U-127 런북: 멀티턴 대화 히스토리 맥락 유지 + gemini-3-pro-preview 전환 검증

## 개요

이 런북은 U-127[Mvp]에서 구현한 멀티턴 대화 히스토리 시스템과 기본 텍스트 모델 전환의 수동 검증 시나리오를 제공합니다.

**핵심 기능**:
- 최근 N턴(기본 5턴) 대화 히스토리를 Gemini API `contents` 배열로 전달
- Gemini 3 Thought Signatures 턴 간 순환 (추론 맥락 유지)
- 기본 모델 `gemini-3-pro-preview` (QUALITY) + 실패 시 `gemini-3-flash-preview` (FAST) 자동 폴백
- 슬라이딩 윈도우: 히스토리 토큰 초과 시 오래된 턴 자동 제거
- `system_instruction`으로 분리된 시스템 프롬프트 + `world_context`

---

## 사전 조건

1. 백엔드 서버 실행 중 (`http://localhost:8011`)
2. 유효한 Gemini API 키가 `backend/.env`에 설정됨 (`GOOGLE_API_KEY=...`)
3. `UW_MODE=real` (기본값)

---

## 시나리오 1: 멀티턴 대화 히스토리 — 맥락 유지 확인

### 목적
연속 3턴 이상 진행 시 이전 턴의 내러티브/사건/NPC가 기억되는지 확인

### 절차

1. 서버 시작 (세션 초기화):
   ```bash
   cd backend && uv run uvicorn unknown_world.main:app --port 8011 --no-access-log
   ```

2. **1턴** — 초기 입력:
   ```bash
   curl -s -X POST http://localhost:8011/api/turn \
     -H "Content-Type: application/json" \
     -d '{"language":"ko-KR","text":"주변을 둘러본다","economy_snapshot":{"signal":100,"memory_shard":5},"client":{"viewport_w":1920,"viewport_h":1080,"theme":"dark"}}'
   ```
   - 내러티브에 장소/사물 기술이 포함되는지 확인
   - `agent_console.model_label`이 `"QUALITY"`인지 확인
   - `agent_console.repair_count`가 0인지 확인

3. **2턴** — 1턴 응답의 액션카드 중 하나 선택:
   ```bash
   curl -s -X POST http://localhost:8011/api/turn \
     -H "Content-Type: application/json" \
     -d '{"language":"ko-KR","text":"불빛 쪽으로 다가간다","action_id":"investigate_light","economy_snapshot":{"signal":90,"memory_shard":5},"client":{"viewport_w":1920,"viewport_h":1080,"theme":"dark"}}'
   ```
   - 1턴에서 언급된 장소/사물이 2턴 내러티브에서 **자연스럽게 이어지는지** 확인
   - 새로운 사건/NPC가 기존 맥락 위에 쌓이는지 확인

4. **3턴** — 2턴 응답 기반 후속 행동:
   ```bash
   curl -s -X POST http://localhost:8011/api/turn \
     -H "Content-Type: application/json" \
     -d '{"language":"ko-KR","text":"화면의 코드를 읽는다","action_id":"read_screen","economy_snapshot":{"signal":80,"memory_shard":5},"client":{"viewport_w":1920,"viewport_h":1080,"theme":"dark"}}'
   ```
   - 1턴 + 2턴 내용이 3턴에도 반영되는지 확인 (장소/사건/NPC 연속성)

### 예상 결과

- 3턴 모두 `repair_count: 0` (또는 경미한 비즈니스 룰 수정 1회)
- 내러티브가 **연속적인 이야기**로 연결됨 (장소/사물/NPC 참조 유지)
- `model_label: "QUALITY"` (기본 Pro 모델 사용)
- `badges`에 `schema_ok`, `economy_ok` 포함

---

## 시나리오 2: 기본 모델 gemini-3-pro-preview 확인

### 목적
기본 텍스트 모델이 `gemini-3-pro-preview` (QUALITY)로 설정되어 있는지 확인

### 절차

1. 시나리오 1의 1턴 실행
2. 응답의 `agent_console.model_label` 확인

### 예상 결과

- `model_label: "QUALITY"` (gemini-3-pro-preview)
- 모든 일반 턴에서 QUALITY 모델 사용
- "정밀조사" 등 QUALITY 트리거 시 추가 비용 배수(2x) 적용은 U-069과 동일

---

## 시나리오 3: Pro→Flash 자동 폴백 확인

### 목적
Pro 모델 API 에러 시 Flash 모델로 자동 전환되는지 확인

### 절차

> **참고**: 자연 발생하는 API 에러(429 등)에서 관찰 가능. 강제로 재현하려면:
> 1. `config/models.py`에서 `MODEL_QUALITY_ID`를 존재하지 않는 모델 ID로 임시 변경
> 2. 턴 실행 후 응답 확인
> 3. 테스트 후 원래 값으로 복원

1. 서버 시작 후 턴 실행
2. 응답의 `agent_console` 확인

### 예상 결과 (폴백 발생 시)

- `repair_count: 1` 이상
- `model_label: "FAST"` (Flash 모델로 폴백됨)
- 내러티브가 정상적으로 생성됨 (품질은 다소 저하 가능)
- 폴백 불가 시 안전한 텍스트-only 응답 제공

---

## 시나리오 4: Thought Signature 순환 확인

### 목적
Gemini 3의 Thought Signature가 턴 간에 올바르게 순환되어 추론 품질이 유지되는지 확인

### 절차

1. 시나리오 1과 동일하게 3턴 이상 연속 실행
2. 서버 로그에서 `has_thought_signature: True` 확인

### 예상 결과

- 2턴째부터 이전 턴의 Thought Signature가 포함됨
- 추론 품질 유지 (내러티브가 이전 턴과 논리적으로 일관됨)
- Thought Signature는 base64로 인코딩되어 히스토리에 저장됨

---

## 시나리오 5: 슬라이딩 윈도우 — 히스토리 제한 확인

### 목적
대화 히스토리가 N턴(기본 5턴) 또는 토큰 예산을 초과할 때 자동 트리밍되는지 확인

### 절차

1. 6턴 이상 연속 실행 (시나리오 1을 6회 이상 반복)
2. 6턴째에도 정상 응답이 오는지 확인
3. 최근 5턴의 맥락이 유지되되, 1턴의 세부 내용은 잊혀질 수 있음

### 예상 결과

- 6턴 이상에서도 API 에러 없이 정상 동작
- 최근 턴의 맥락은 유지, 매우 오래된 턴은 자연스럽게 잊혀짐
- `repair_count: 0` (또는 경미한 수정)

---

## 시나리오 6: 세션 격리 확인

### 목적
서로 다른 세션의 대화 히스토리가 격리되는지 확인

### 절차

> **참고**: MVP에서는 `session_id`가 `"default"`로 고정됩니다.
> 서버를 재시작하면 히스토리가 초기화됩니다.

1. 서버 시작 후 2턴 실행
2. 서버 재시작 (`Ctrl+C` → 서버 재시작)
3. 다시 1턴 실행

### 예상 결과

- 서버 재시작 후 히스토리가 초기화됨
- 새 1턴은 이전 세션의 내용을 참조하지 않음

---

## 시나리오 7: Mock 모드 동작 확인

### 목적
Mock 모드(`UW_MODE=mock`)에서도 기본 동작이 유지되는지 확인

### 절차

1. `backend/.env`에서 `UW_MODE=mock` 설정
2. 서버 시작 후 1턴 실행

### 예상 결과

- Mock 응답 정상 생성 (히스토리 기능은 비활성)
- `conversation_history`가 None이므로 단일 프롬프트 모드로 동작

---

## 문제 해결

### 모든 턴에서 repair_count: 2 + model_label: "FAST"

1. **포트 충돌 확인**: 이전 서버 프로세스가 남아있는지 확인
   ```bash
   pnpm kill && sleep 5
   # 새 포트로 시작하여 테스트
   cd backend && uv run uvicorn unknown_world.main:app --port 8099
   ```
2. **API 키 확인**: `backend/.env`에 `GOOGLE_API_KEY`가 올바르게 설정되었는지 확인
3. **서버 로그 확인**: `[GenAI] API 키 클라이언트 초기화 완료` 메시지 확인

### 맥락이 유지되지 않음 (각 턴이 독립적)

1. 서버 로그에서 `multiturn: True` 확인
2. `history_turns` 값이 이전 턴 수와 일치하는지 확인
3. `UW_MODE=real`인지 확인 (Mock 모드는 히스토리 비활성)

### TTFB가 너무 느림 (30초+)

1. `thinking_level: "high"`가 Pro 모델의 TTFB를 증가시킬 수 있음
2. 필요 시 `config/models.py`의 `DEFAULT_THINKING_LEVEL`을 `"low"`로 변경
3. 네트워크 지연/API 서버 상태 확인

### Thought Signature 관련 에러

1. `thought_signature`가 base64 문자열로 올바르게 인코딩/디코딩되는지 확인
2. `genai_client.py`에서 `base64.b64encode` / `conversation_history.py`에서 `base64.b64decode` 흐름 확인

---

## 체크리스트

- [ ] 3턴 연속 내러티브 맥락 유지 확인
- [ ] 기본 모델 `QUALITY` (gemini-3-pro-preview) 확인
- [ ] Pro→Flash 폴백 동작 확인 (자연 발생 또는 강제 테스트)
- [ ] Thought Signature 순환 확인 (로그에서 `has_thought_signature: True`)
- [ ] 6턴 이상 슬라이딩 윈도우 정상 동작 확인
- [ ] 서버 재시작 후 히스토리 초기화 확인
- [ ] 모든 응답에서 `schema_ok`, `economy_ok` 배지 확인
- [ ] Economy 잔액 일관성 확인 (잔액 음수 없음)

---

## 관련 파일

**백엔드 (수정)**:
- `backend/src/unknown_world/config/models.py` - `MODEL_DEFAULT`, `MODEL_FALLBACK`, `DEFAULT_THINKING_LEVEL`
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - `_build_contents()`, `_build_system_instruction()`, Thought Signature 추출
- `backend/src/unknown_world/orchestrator/repair_loop.py` - Pro→Flash 폴백 로직
- `backend/src/unknown_world/orchestrator/pipeline.py` - 히스토리 주입 + 턴 완료 후 히스토리 추가
- `backend/src/unknown_world/orchestrator/stages/types.py` - `PipelineContext.conversation_history`, `thought_signature`
- `backend/src/unknown_world/orchestrator/stages/validate.py` - 히스토리 전달

**백엔드 (생성)**:
- `backend/src/unknown_world/orchestrator/conversation_history.py` - `ConversationHistory` 클래스, 슬라이딩 윈도우, Thought Signature 캐싱

**백엔드 (수정)**:
- `backend/src/unknown_world/services/genai_client.py` - `contents`, `system_instruction`, `thinking_config`, `thought_signature` 지원

---

## 환경변수 설정

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `UW_HISTORY_MAX_TURNS` | `5` | 대화 히스토리 최대 턴 수 |
| `UW_HISTORY_TOKEN_BUDGET` | `50000` | 히스토리 토큰 예산 (문자 수 × 3 기준) |
| `DEFAULT_THINKING_LEVEL` | `"high"` | Gemini 3 thinking level (`"high"` / `"low"`) |

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-02-08 | 1.0 | 초기 작성 (U-127 구현) |
