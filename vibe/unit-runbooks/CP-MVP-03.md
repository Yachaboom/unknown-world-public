# CP-MVP-03: 10분 데모 루프 실행 가이드

## 1. 개요

"10분 데모 루프" 체크포인트로, 심사자/사용자가 **데모 프로필 선택 → 핵심 조작(클릭/드래그/업로드) → 엔딩 리포트 → 리셋**의 전체 루프를 10분 안에 체험할 수 있는지 수동 검증합니다.

**예상 소요 시간**: 10~15분

**의존성**:

- 의존 유닛: U-015[Mvp], U-012[Mvp], U-022[Mvp], U-025[Mvp]
- 선행 완료 필요: 모든 MVP 유닛 완료

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# Frontend (RULE-011: 포트 8001~8010)
cd frontend
pnpm install
pnpm dev
# → http://localhost:8001

# Backend (RULE-011: 포트 8011~8020)
cd backend
cp .env.example .env   # GEMINI_API_KEY 설정 필수
uv sync
uv run uvicorn unknown_world.main:app --reload --port 8011
# → http://localhost:8011/health
```

### 2.2 첫 화면 확인

- 브라우저에서 `http://localhost:8001` 접속
- "UNKNOWN WORLD" 타이틀 + 3종 프로필 선택 화면(Narrator/Explorer/Tech Expert) 표시
- 로그인/가입 없이 즉시 플레이 가능 확인

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 즉시 시작 + 리셋

**목적**: 데모 프로필 선택만으로 즉시 플레이가 시작되고, Reset 1회로 반복 가능함을 검증

**실행**:

1. 프로필 선택 화면에서 "Explorer" 클릭
2. 게임 UI가 즉시 로드되는지 확인
3. 상단 `Reset` 버튼 클릭
4. 초기 상태로 돌아오는지 확인 (Signal, 인벤토리, 턴 0 등)

**확인 포인트**:

- ✅ 프로필 3종(Narrator/Explorer/Tech Expert) 표시
- ✅ 클릭 즉시 게임 시작 (로그인 없음)
- ✅ 게임 UI 요소 표시: Inventory, Quest, Action Deck, Economy HUD, Agent Console, Scanner
- ✅ Reset 후 초기 상태 복원 (재화/인벤토리/턴/내러티브)

---

### 시나리오 B: Action Deck 클릭

**목적**: 액션 카드 클릭으로 턴이 실행되고 결과가 반영되는지 검증

**실행**:

1. 하단 Action Deck에서 "EXPLORE" 카드 클릭
2. Agent Console에서 파이프라인 진행 확인 (Parse→Validate→Plan→Resolve→Render→Verify→Commit)
3. 내러티브 텍스트 타이핑 효과 확인
4. 경제 변동 확인 (Signal 감소 + 보상)

**확인 포인트**:

- ✅ 카드에 비용(Signal cost)과 위험도(Risk level) 표시
- ✅ 클릭 후 Agent Console 배지: Schema OK, Economy OK, Safety OK, Consistency OK
- ✅ 내러티브가 타이핑 효과로 표시
- ✅ 새 Action Card가 생성
- ✅ Resource Log에 거래 기록 추가

---

### 시나리오 C: Scanner 업로드→아이템화

**목적**: 이미지 업로드로 아이템이 생성되어 인벤토리에 반영되는지 검증

**실행**:

1. 우측 하단 SCANNER 패널에서 "Drop image or click to upload" 클릭
2. 임의 이미지(JPEG/PNG) 선택
3. 분석 완료 후 아이템 후보 목록 확인
4. "ADD" 버튼 클릭하여 인벤토리에 추가

**확인 포인트**:

- ✅ 이미지 업로드 후 분석 진행 (uploading → analyzing → result)
- ✅ 아이템 후보 선택 UI 표시
- ✅ ADD 후 인벤토리에 새 아이템 반영
- ✅ 에러 시 에러 메시지 표시 (빈 화면 아님)

---

### 시나리오 D: 엔딩 리포트

**목적**: 세션 종료 시 엔딩 리포트가 생성되는지 검증

**실행**:

1. 상단 "END SESSION" 버튼 클릭
2. 확인 다이얼로그에서 "확인" 선택
3. 엔딩 리포트 모달 확인

**확인 포인트**:

- ✅ SESSION REPORT 모달 표시
- ✅ Narrative Summary 섹션
- ✅ Quest Achievement (완료/진행 퀘스트 표시)
- ✅ Economy Settlement (초기/최종 잔액, 지출/수입, ✅ Ledger Consistent)
- ✅ Rule Mutations
- ✅ Play Statistics (턴 수, 아이템 수, 활성 규칙 수, 프로필)

---

### 시나리오 E: 리플레이 하네스 (Hard Gate 검증)

**목적**: Mock 파이프라인으로 시스템 인바리언트를 자동 검증

**실행**:

```bash
cd backend
uv run python -c "
import asyncio, json
from unknown_world.harness.replay_runner import run_replay
from unknown_world.harness.scenario import Scenario, ScenarioStep

scenario = Scenario(
    name='cp_mvp03_demo_loop',
    description='10-minute demo loop verification',
    language='en-US',
    profile_id='explorer',
    seed=42,
    steps=[
        ScenarioStep(text='Look around the cave entrance', action_id='explore'),
        ScenarioStep(text='Pick up the glowing crystal', action_id='interact'),
        ScenarioStep(text='Enter the cave', action_id='explore'),
    ]
)

result = asyncio.run(run_replay(scenario))
print(result.summary)
for sr in result.step_results:
    gates = ', '.join(f'{g.name}={g.status.value}' for g in sr.gates)
    print(f'  Step {sr.step_index}: all_passed={sr.all_passed}, {gates}')
"
```

**기대 결과**:

```
Replay 'cp_mvp03_demo_loop': 3/3 steps passed
  Step 0: all_passed=True, schema=pass, economy=pass, safety=pass, consistency=pass
  Step 1: all_passed=True, schema=pass, economy=pass, safety=pass, consistency=pass
  Step 2: all_passed=True, schema=pass, economy=pass, safety=pass, consistency=pass
```

**확인 포인트**:

- ✅ 모든 스텝 passed
- ✅ 4대 Hard Gate (Schema, Economy, Safety, Consistency) 모두 pass

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:

- ✅ 데모 프로필 선택만으로 즉시 시작, Reset 1회로 반복 가능
- ✅ Action Deck 클릭 → 턴 실행 + 결과 반영
- ✅ Scanner 업로드 → 아이템 생성 → 인벤토리 반영
- ✅ 엔딩 리포트 생성 (텍스트-only 포함)
- ✅ 리플레이 하네스 Hard Gate 4종 모두 pass
- ✅ 프롬프트 원문/내부 추론 UI 미노출

**실패 시 확인**:

- ❌ 프로필 선택 후 빈 화면 → 백엔드 서버 상태 확인, .env 설정 확인
- ❌ 턴 실행 후 에러 → 브라우저 콘솔에서 Zod 파싱 에러 확인
- ❌ 경제 인바리언트 위반 → Resource Log에서 음수 잔액 확인
- ❌ 스캐너 실패 → 백엔드 /api/scan 에러 로그 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 프론트엔드 로딩되지 않음

- **원인**: Vite 서버 미기동 또는 포트 충돌
- **해결**: `pnpm kill` 후 재시작, 포트 8001 확인

**오류**: 턴 실행 시 504 Gateway Timeout

- **원인**: Gemini API 지연 또는 rate limit
- **해결**: 브라우저에 429 재시도 안내 UI 표시 확인, 잠시 후 재시도

**오류**: 엔딩 리포트 모달 미표시

- **원인**: `/api/ending-report` 엔드포인트 에러
- **해결**: 백엔드 로그에서 에러 메시지 확인, 브라우저 콘솔 확인

### 5.2 환경별 주의사항

- **Windows**: Shell 조합 연산자(`&&`, `||`, `;`, `|`) 사용 금지 (RULE-000)
- **GEMINI_API_KEY**: `.env` 파일에 유효한 키가 설정되어야 실모델 작동

---

## 6. 다음 단계

이 유닛을 기반으로 MMP 단계에서 배포(U-120), 폴리시(U-119), 제출 문서(U-121), 데모 영상(U-122)을 진행합니다.
