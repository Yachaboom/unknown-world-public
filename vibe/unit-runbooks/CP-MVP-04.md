# CP-MVP-04 체크포인트 - 실모델 Hard Gate 검증 런북

## 1. 개요

실모델(Vertex 서비스 계정 + google-genai)로 전환한 뒤에도 **Hard Gate(스키마/경제/안전/일관성)**가 정상 동작하는지 수동 검증합니다.

**예상 소요 시간**: 15분

**의존성**:
- 의존 유닛: RU-005[Mvp], U-016[Mvp], U-017[Mvp], U-018[Mvp]
- 선행 완료 필요: 백엔드/프론트엔드 서버 실행 가능 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 환경 변수 확인
cat backend/.env | grep UW_MODE
# 출력: UW_MODE=real (실모델) 또는 UW_MODE=mock (모의)

# 의존성 설치 (필요시)
cd backend && uv sync
cd ../frontend && pnpm install
```

### 2.2 서버 실행

```bash
# 터미널 1: 백엔드 (포트 8011)
cd backend && uv run uvicorn unknown_world.main:app --host 0.0.0.0 --port 8011 --reload

# 터미널 2: 프론트엔드 (포트 8001)
cd frontend && pnpm dev --port 8001
```

### 2.3 서버 상태 확인

```bash
# 백엔드 헬스체크
curl -s http://localhost:8011/docs -o /dev/null -w "%{http_code}"
# 기대: 200

# 프론트엔드 헬스체크
curl -s http://localhost:8001 -o /dev/null -w "%{http_code}"
# 기대: 200
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 실모델 성공 경로 (기본 턴)

**목적**: 실모델에서 7단계 스트리밍 + 4배지 Hard Gate가 정상 통과하는지 검증

**실행**:

```bash
# 테스트 입력 파일 생성
cat > test_turn_input.json << 'EOF'
{
  "language": "ko-KR",
  "text": "문을 열어본다",
  "client": {
    "viewport_w": 1920,
    "viewport_h": 1080,
    "theme": "dark"
  },
  "economy_snapshot": {
    "signal": 100,
    "memory_shard": 5
  }
}
EOF

# API 호출
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d @test_turn_input.json
```

**기대 결과**:

1. **단계 스트리밍**: Parse → Validate → Plan → Resolve → Render → Verify → Commit 순서
2. **배지 이벤트**: `["schema_ok", "economy_ok", "safety_ok", "consistency_ok"]`
3. **내러티브 델타**: 타자 효과용 텍스트 조각들
4. **final 이벤트**: 완전한 TurnOutput JSON

**확인 포인트**:
- ✅ 모든 stage 이벤트가 start → complete 순서로 도착
- ✅ badges 이벤트에 4개 배지 모두 `*_ok`
- ✅ final.data.economy.balance_after가 입력 - cost와 일치
- ✅ final.data.economy.balance_after 음수 없음
- ✅ TTFB 2초 이내

---

### 시나리오 B: Repair loop + Safe Fallback (잔액 부족)

**목적**: 잔액 부족 시 Repair loop 발동 및 Safe Fallback 제공 확인

**실행**:

```bash
# 잔액 부족 테스트 입력
cat > test_low_balance.json << 'EOF'
{
  "language": "ko-KR",
  "text": "마법 폭발을 시전한다",
  "client": {
    "viewport_w": 1920,
    "viewport_h": 1080,
    "theme": "dark"
  },
  "economy_snapshot": {
    "signal": 0,
    "memory_shard": 0
  }
}
EOF

# API 호출
curl -X POST http://localhost:8011/api/turn \
  -H "Content-Type: application/json" \
  -d @test_low_balance.json
```

**기대 결과**:

1. **repair 이벤트**: `{"type": "repair", "attempt": 1, ...}`, `{"type": "repair", "attempt": 2, ...}`
2. **배지 이벤트**: `economy_fail` 포함 가능
3. **final 이벤트**: Safe Fallback TurnOutput

**확인 포인트**:
- ✅ repair 이벤트 2회 송출 (최대 재시도)
- ✅ final.data.economy.cost = {signal: 0, memory_shard: 0} (비용 0)
- ✅ final.data.economy.balance_after 음수 없음 (0, 0)
- ✅ final.data.ui.action_deck.cards에 대체 행동 (`fallback_text_only`) 포함
- ✅ repair_count > 0

---

### 시나리오 C: 브라우저 UI 통합 테스트

**목적**: 프론트엔드에서 실모델 턴 실행 시 UI 업데이트 확인

**실행**:

1. 브라우저에서 http://localhost:8001 접속
2. Action Deck에서 카드 클릭

**기대 결과**:

1. **처리 중 상태**:
   - 모든 카드/입력창 disabled
   - Agent Console: "처리 중" 표시
   - 헤더: 예상 비용 표시 (→ -N)

2. **완료 후 상태**:
   - Agent Console: 7단계 모두 ● (완료)
   - 검증 배지: Schema/Economy/Safety/Consistency OK
   - 재화 HUD: 잔액 업데이트
   - 원장 이력: 새 턴 기록 추가
   - Narrative Feed: 새 턴 내러티브 추가
   - Action Deck: 새 카드들로 교체

**확인 포인트**:
- ✅ 빈 화면/무한 대기 없음
- ✅ 모든 UI 요소 정상 업데이트
- ✅ 재화 잔액이 비용만큼 정확히 차감
- ✅ 원장에 비용 기록됨

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 백엔드 콘솔에서 오류 없음 확인
- 프롬프트 원문/내부 추론이 로그에 노출되지 않음 (RULE-007/008)

### 4.2 성공/실패 판단 기준

**Hard Gate 성공 기준** (모두 충족 필수):
- ✅ Schema OK: TurnOutput이 Pydantic + Zod 스키마 통과
- ✅ Economy OK: 비용/잔액 일관성, 잔액 음수 없음
- ✅ Safety OK: 차단 시 명시적 메시지 + 대체 결과
- ✅ Consistency OK: 언어/좌표 규약 일관성

**Soft Gate 관측값** (필수는 아님):
- TTFB: 2초 이내 권장 (체감 품질)
- 이미지 생성: 지연 허용 (Lazy loading)

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `Failed to parse request body`
- **원인**: Windows curl에서 JSON 이스케이프 문제
- **해결**: JSON 파일로 저장 후 `-d @파일명.json` 사용

**오류**: `Connection refused`
- **원인**: 서버 미실행 또는 포트 충돌
- **해결**: 서버 상태 확인, 포트 8011/8001 사용 확인

**오류**: `economy_fail` 배지
- **원인**: 잔액 부족 또는 비용 계산 오류
- **해결**: 정상 동작 (Repair → Fallback 수렴 확인)

### 5.2 환경별 주의사항

- **Windows**: curl JSON 따옴표 문제 → 파일 사용 권장
- **Real 모드**: Vertex AI 서비스 계정 키 필요 (`GOOGLE_APPLICATION_CREDENTIALS`)

---

## 6. 다음 단계

이 체크포인트 통과 후:
- CP-MVP-05/06: 멀티모달/Scanner 기능 추가
- 발견된 기술 부채는 `vibe/debt-log.md`에 기록
