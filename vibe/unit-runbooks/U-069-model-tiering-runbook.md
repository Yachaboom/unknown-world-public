# U-069 런북: 텍스트 생성 모델 티어링 검증

## 개요

이 런북은 U-069[Mvp]에서 구현한 모델 티어링 시스템의 수동 검증 시나리오를 제공합니다.

**핵심 기능**:
- 기본 텍스트 생성: FAST 모델 (`gemini-3-flash-preview`)
- 트리거 시 전환: QUALITY 모델 (`gemini-3-pro-preview`)
- Agent Console에서 현재 모델 라벨 표시
- ActionDeck에서 QUALITY 액션 카드 배지 및 2x 비용 표시

---

## 사전 조건

1. 백엔드 서버 실행 중 (`http://localhost:8011`)
2. 프론트엔드 개발 서버 실행 중 (`http://localhost:5173`)
3. 유효한 Gemini API 키가 `.env`에 설정됨

---

## 시나리오 1: FAST 모델 기본 동작 확인

### 목적
일반 텍스트 입력/액션이 FAST 모델로 처리되는지 확인

### 절차

1. 브라우저에서 `http://localhost:5173` 접속
2. 프로필 선택 후 게임 시작
3. 텍스트 입력창에 "주변을 둘러본다" 입력 후 실행
4. Agent Console 확인

### 예상 결과

- Agent Console에 `⚡ 빠름 (FAST)` 라벨 표시
- 정상적인 내러티브 응답 생성
- Economy HUD에 기본 비용 표시 (1x)

---

## 시나리오 2: QUALITY 모델 트리거 - 키워드 매칭

### 목적
"정밀조사", "자세히" 등 키워드 입력 시 QUALITY 모델로 전환되는지 확인

### 절차

1. 시나리오 1 이후 상태에서 진행
2. 텍스트 입력창에 "이것을 **자세히** 살펴본다" 입력 후 실행
3. Agent Console 확인
4. 동일하게 "**정밀조사**한다" 키워드로 테스트

### 예상 결과

- Agent Console에 `★ 고품질 (QUALITY)` 라벨 표시
- 더 상세한 내러티브 응답 생성 (기대)
- Economy HUD에 2x 비용 반영

### 키워드 목록 (테스트용)
```
한글: 정밀조사, 자세히, 깊이, 꼼꼼히, 면밀히, 세밀하게
영어: thoroughly, in detail, closely examine, scrutinize
```

---

## 시나리오 3: QUALITY 모델 트리거 - 액션 ID 매칭

### 목적
QUALITY 트리거 액션 카드 선택 시 모델 전환 확인

### 절차

1. ActionDeck에서 "정밀조사" 또는 "deep_investigate" 카드 확인
   - 해당 카드에 `★ QUALITY` 배지가 표시되어야 함
   - 비용에 `x2` 표시가 있어야 함
2. 해당 카드 클릭하여 실행
3. Agent Console 확인

### 예상 결과

- 카드에 QUALITY 배지 및 2x 비용 표시
- 실행 후 Agent Console에 `★ 고품질 (QUALITY)` 라벨 표시

### QUALITY 트리거 액션 ID 목록
```
deep_investigate, 정밀조사, analyze, examine_closely,
investigate_detail, scrutinize, thorough_search,
use_magnifier, use_magnifying_glass
```

---

## 시나리오 4: 비용 차등 확인

### 목적
FAST vs QUALITY 비용 배수가 정확히 적용되는지 확인

### 절차

1. ActionDeck에서 일반 카드(예: "탐색하기") 호버
   - Economy HUD에 예상 비용 확인 (예: Signal 1)
2. QUALITY 카드(예: "정밀조사") 호버
   - Economy HUD에 예상 비용 확인 (예: Signal 2 = 1 × 2)

### 예상 결과

- QUALITY 액션의 예상 비용이 기본 비용의 2배
- 카드 비용 표시에 `x2` 배수 표기

---

## 시나리오 5: 잔액 부족 시 QUALITY 카드 비활성화

### 목적
잔액이 2x 비용보다 부족할 때 QUALITY 카드가 비활성화되는지 확인

### 절차

1. Signal 잔액이 낮은 상태로 시작 (또는 액션 실행으로 소진)
2. QUALITY 카드의 비용(2x)이 현재 잔액보다 높은 상황 확인
3. 해당 카드 상태 확인

### 예상 결과

- 잔액 < QUALITY 비용일 때 카드 비활성화
- "잔액 부족" 메시지 표시

---

## 시나리오 6: Mock 모드 동작 확인

### 목적
Mock 모드에서도 기본 모델 정보가 표시되는지 확인

### 절차

1. `.env`에서 `MOCK_MODE=true` 설정 (또는 API 키 없이 실행)
2. 게임 시작 후 일반 액션 실행
3. Agent Console 확인

### 예상 결과

- Mock 모드에서도 Agent Console에 `FAST` 라벨 표시 (기본값)
- 정상적인 Mock 응답 생성

---

## 문제 해결

### Agent Console에 모델 라벨이 표시되지 않음

1. 브라우저 캐시 새로고침 (Ctrl+Shift+R)
2. 프론트엔드 서버 재시작
3. `TurnOutput.agent_console.model_label` 필드 확인

### QUALITY 트리거가 작동하지 않음

1. 백엔드 로그에서 `[TurnOutputGenerator] QUALITY 모델 트리거 감지` 메시지 확인
2. 입력 텍스트에 트리거 키워드가 정확히 포함되어 있는지 확인
3. 액션 ID가 `QUALITY_TRIGGER_ACTION_IDS`에 포함되어 있는지 확인

### 비용 배수가 적용되지 않음

1. `TextModelTiering.get_cost_multiplier()` 함수 동작 확인
2. 프론트엔드 `QUALITY_COST_MULTIPLIER` 상수 값 확인

---

## 체크리스트

- [ ] FAST 모델 기본 동작 확인
- [ ] QUALITY 키워드 트리거 확인
- [ ] QUALITY 액션 ID 트리거 확인
- [ ] Agent Console 라벨 표시 확인
- [ ] ActionDeck QUALITY 배지 표시 확인
- [ ] 비용 2x 배수 적용 확인
- [ ] 잔액 부족 시 비활성화 확인

---

## 관련 파일

**백엔드**:
- `backend/src/unknown_world/config/models.py` - TextModelTiering 클래스
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 모델 선택 로직
- `backend/src/unknown_world/models/turn.py` - AgentConsole.model_label

**프론트엔드**:
- `frontend/src/schemas/turn.ts` - AgentConsoleSchema.model_label
- `frontend/src/components/AgentConsole.tsx` - ModelLabelBadge 컴포넌트
- `frontend/src/components/ActionDeck.tsx` - QUALITY 액션 표시

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-02-05 | 1.0 | 초기 작성 (U-069 구현) |
