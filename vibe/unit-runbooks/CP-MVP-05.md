# CP-MVP-05: 멀티모달 이미지 게이트 검증 런북

## 1. 개요

멀티모달 이미지 생성/편집 파이프라인이 "텍스트 우선 + 조건부 이미지"로 안정적으로 동작하는지 검증합니다. 실패 시에도 폴백/복구로 플레이가 이어지도록 보장하며, 언어 일관성과 비용 제어를 점검합니다.

**예상 소요 시간**: 20분

**의존성**:

- U-035: rembg 배경 제거 통합(조건부)
- U-036: 프롬프트 파일 분리(ko/en) + 핫리로드
- U-043: 언어 혼합 게이트(서버 검증+Repair)
- U-044: 세션 언어 SSOT(토글=리셋)
- U-045: rembg/모델 preflight(부팅 시 사전 점검)
- U-020: 프론트 이미지 Lazy Render/placeholder/폴백

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 (포트 8011)
cd backend
uv sync
uv run uvicorn unknown_world.main:app --reload --port 8011

# 프론트엔드 (포트 8001)
cd frontend
pnpm install
pnpm dev
```

### 2.2 서버 상태 확인

```bash
# 백엔드 헬스 + rembg 상태
curl http://localhost:8011/health

# 이미지 서비스 헬스
curl http://localhost:8011/api/image/health
```

**기대 결과**:

```json
{
  "status": "ok",
  "rembg": {
    "status": "ready",
    "installed": true,
    "preloaded_models": ["birefnet-general"],
    "missing_models": []
  }
}
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 텍스트 우선 경로 (이미지 미생성)

**목적**: 이미지 생성 없이 텍스트 턴이 정상 동작하는지 확인

**실행**:

1. 브라우저에서 `http://localhost:8001` 접속
2. 데모 프로필 선택 후 게임 시작
3. Action Deck에서 "Explore" (또는 "탐색하기") 클릭
4. 턴 완료 대기

**확인 포인트**:

- ✅ Agent Console이 "PROCESSING" → "IDLE" 전이
- ✅ Queue 단계가 Parse → ... → Commit까지 완료 (●)
- ✅ 배지: Schema OK, Economy OK, Safety OK, Consistency OK
- ✅ 내러티브 텍스트 갱신
- ✅ Economy HUD에 비용 차감 표시 (예: Signal 150 → 149)
- ✅ Ledger 이력 기록

---

### 시나리오 B: 이미지 생성 경로 (성공/실패/폴백)

**목적**: 이미지 생성 트리거 시 placeholder → 이미지/폴백 전이 확인

**B-1: 이미지 생성 API 직접 테스트**

```bash
curl -X POST "http://localhost:8011/api/image/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A mysterious dungeon scene"}'
```

**기대 결과 (Mock 모드)**:

```json
{
  "success": true,
  "status": "completed",
  "image_id": "img_xxxx",
  "image_url": "/static/images/img_xxxx.png"
}
```

**기대 결과 (실제 모드, 인증 실패 시)**:

```json
{
  "success": false,
  "status": "failed",
  "message": "이미지 생성 중 오류가 발생했습니다: ClientError"
}
```

- ✅ 실패해도 500 에러가 아닌 200 OK + 폴백 응답 반환 (RULE-004)
- ✅ skip_on_failure=true가 기본값으로 텍스트-only 진행 가능

**B-2: 프론트엔드 이미지 표시 확인**

- Scene Canvas에서 "📡 NO SIGNAL DATA" 또는 "⏳ SYNCHRONIZING..." 표시
- 이미지 생성 성공 시: 이미지 → 핫스팟 오버레이 유지
- 이미지 생성 실패 시: 텍스트 폴백, UI 멈춤 없음

---

### 시나리오 C: 언어 일관성 검증

**목적**: ko/en 혼합 출력 없이 세션 언어가 일관되게 유지되는지 확인

**실행**:

1. 브라우저에서 "Change Profile" 클릭
2. "🌐 English" → "🌐 한국어" 클릭 (언어 전환)
3. 한국어 프로필("서사꾼") 선택
4. "탐색하기" 카드 클릭하여 한국어 턴 실행
5. 결과 확인

**확인 포인트**:

- ✅ 모든 UI 요소가 한국어로 표시 ("리셋", "프로필 변경", "재화 현황" 등)
- ✅ 내러티브가 한국어로 출력
- ✅ 퀘스트/룰/핫스팟/액션카드 모두 한국어
- ✅ Consistency 배지: **OK**
- ✅ 기술 용어(Signal, Shard, Queue 단계)는 영어 허용 (화이트리스트)
- ✅ 한 화면에 ko/en 혼합 없음

---

### 시나리오 D: 비용/Economy 인바리언트

**목적**: 예상 비용 표시, 원장 일관성, 잔액 음수 금지 확인

**확인 포인트**:

- ✅ 행동 전 "예상 비용" (Est. Cost) 표시
- ✅ Economy Status에 "확정 비용" (Confirmed) 표시
- ✅ 원장 이력 (Recent Ledger)에 턴별 비용 기록
- ✅ 잔액이 음수가 되지 않음

---

### 시나리오 E: rembg Preflight 확인

**목적**: 서버 부팅 시 rembg 모델이 사전 점검/다운로드되는지 확인

**실행**:

```bash
curl http://localhost:8011/health | jq '.rembg'
```

**확인 포인트**:

- ✅ `status`: "ready" (또는 "degraded" with 원본 유지)
- ✅ `installed`: true
- ✅ `preloaded_models`: ["birefnet-general"]
- ✅ 첫 이미지 처리 시 다운로드 지연 없음

---

### 시나리오 F: 보안/프롬프트 노출 금지

**목적**: 프롬프트 원문/내부 추론이 UI에 노출되지 않는지 확인

**확인 포인트**:

- ✅ 내러티브에 시스템 프롬프트 원문 노출 없음
- ✅ Agent Console에는 단계(Queue)/배지(Badges)만 표시
- ✅ 콘솔/네트워크에 프롬프트 텍스트 로깅 없음

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:

- ✅ 텍스트 우선 경로: UI/상태/배지 정상 갱신
- ✅ 이미지 실패 시: 안전한 폴백 제공 (에러 종료 아님)
- ✅ 언어 일관성: ko/en 혼합 없음, Consistency OK
- ✅ Economy: 예상 비용 표시, 원장 일관성, 잔액 ≥ 0
- ✅ rembg: ready 또는 degraded (원본 유지)
- ✅ 보안: 프롬프트 원문 노출 없음

**실패 시 확인**:

- ❌ 빈 화면/UI 멈춤 → 스트리밍/폴백 로직 점검
- ❌ ko/en 혼합 → U-043/U-044 언어 게이트 점검
- ❌ 잔액 음수 → Economy 검증 로직 점검
- ❌ rembg 오류 → preflight 로그 및 모델 캐시 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 이미지 생성 ClientError

- **원인**: Vertex AI 인증 미설정 (Mock 모드가 아닌 경우)
- **해결**: `UW_MODE=mock` 환경변수 설정 또는 서비스 계정 설정

**오류**: rembg status "unavailable"

- **원인**: rembg 미설치 또는 모델 다운로드 실패
- **해결**: `pip install rembg` 및 네트워크 연결 확인

**오류**: Consistency 배지 FAIL

- **원인**: 내러티브에 ko/en 혼합 출력
- **해결**: U-043 언어 게이트 로직 및 화이트리스트 확인

---

## 6. 참고 자료

- `vibe/prd.md` - 6.3(멀티모달), 8.5(이미지), 10장(Replay/게이트)
- `vibe/tech-stack.md` - 이미지 모델 정책
- `.cursor/rules/00-core-critical.mdc` - RULE-004/005/006/008
- `vibe/unit-results/U-035[Mvp].md` - rembg 통합 보고서
- `vibe/unit-results/U-044[Mvp].md` - 세션 언어 SSOT 보고서
