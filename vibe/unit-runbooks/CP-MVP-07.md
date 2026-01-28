# CP-MVP-07: real 모드 로컬 실행 게이트 검증 런북

> **목표**: 로컬 개발 환경에서 실모델(Vertex AI) 연동 상태를 확인하고, Hard Gate 및 안전 폴백 메커니즘을 검증한다.

---

## 1. 사전 준비 (Pre-requisites)

- [ ] `backend/.env` 파일 존재 확인
- [ ] GCP 서비스 계정 키 파일(`.json`) 발급 및 로컬 경로 확보
- [ ] `UW_MODE=real` 설정 확인

---

## 2. 환경 구성 (.env)

`backend/.env` 파일을 다음과 같이 설정합니다.

```env
# 실행 모드 (mock | real)
UW_MODE=real

# 인증 (절대 경로 권장)
GOOGLE_APPLICATION_CREDENTIALS="C:/path/to/your/service-account-key.json"

# 프로젝트 설정
VERTEX_PROJECT="your-project-id"
VERTEX_LOCATION="us-central1"

# 기타
ENVIRONMENT=development
```

---

## 3. 검증 시나리오

### 시나리오 A: 서버 기동 및 헬스체크
1. 서버 실행: `uv run uvicorn unknown_world.main:app --reload --port 8011`
2. 헬스체크 호출: `curl http://localhost:8011/health`
3. **체크포인트**:
    - `status`가 `"ok"` 또는 `"degraded"`인지 확인
    - `rembg` 정보가 포함되어 있는지 확인
    - 로그에 키 경로 등 민감 정보가 출력되지 않는지 확인 (RULE-007)

### 시나리오 B: real 모드 턴 스트리밍 (Happy Path)
1. 턴 요청 (Action Deck 클릭 또는 curl):
   ```bash
   curl -X POST http://localhost:8011/api/turn \
     -H "Content-Type: application/json" \
     -d '{"language":"ko-KR","text":"방 안을 둘러본다","client":{"viewport_w":1920,"viewport_h":1080},"economy_snapshot":{"signal":100,"memory_shard":5}}'
   ```
2. **체크포인트**:
    - `type: stage` 이벤트가 7단계(Parse~Commit) 순서대로 오는지 확인
    - `type: final` 이벤트가 도착하고 `schema_ok`, `economy_ok` 배지가 포함되어 있는지 확인
    - 한국어 요청에 한국어 응답이 오는지 확인 (RULE-006)

### 시나리오 C: 안전 폴백 (인증 실패 유도)
1. `.env`에서 `GOOGLE_APPLICATION_CREDENTIALS` 경로를 의도적으로 틀리게 수정 후 서버 재시작
2. 턴 요청 수행
3. **체크포인트**:
    - 서버가 크래시되지 않고 `type: error` 이벤트(AUTH_ERROR 등)를 송출하는지 확인
    - 최종적으로 `type: final`이 오며, `narrative`에 폴백 메시지가 포함되어 있는지 확인
    - 폴백 응답의 비용(`cost`)이 0인지 확인 (RULE-005)

---

## 4. 자동화 테스트 실행

수동 검증 외에 다음 통합 테스트를 수행하여 인바리언트를 재확인합니다.

```bash
cd backend
uv run pytest tests/integration/test_real_mode_gate.py
```

---

## 5. 문제 해결 (Troubleshooting)

- **401 Unauthorized**: 서비스 계정 권한(Vertex AI User) 확인 및 키 파일 경로 확인
- **TTFB 지연**: real 모드 첫 호출 시 모델 콜드 스타트 또는 네트워크 지연 발생 가능
- **Schema Mismatch**: `shared/schemas`와 백엔드 Pydantic 모델 간의 싱크 확인

---

_본 런북은 CP-MVP-07 유닛 검증을 위해 자동 생성되었습니다._