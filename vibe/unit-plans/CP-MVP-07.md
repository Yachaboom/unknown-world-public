# CP-MVP-07: 체크포인트 - real 모드 로컬 실행 게이트(.env/Vertex/스트리밍)

## 메타데이터

| 항목      | 내용             |
| --------- | ---------------- |
| Unit ID   | CP-MVP-07        |
| Phase     | MVP              |
| 예상 소요 | 60분             |
| 의존성    | U-047[Mvp],CP-MVP-04 |
| 우선순위  | ⚡ Critical      |

## 작업 목표

로컬 개발 환경에서 `.env` 기반 설정으로 **real 모드(실모델) 실행**이 안정적으로 재현되고, 스트리밍/검증/폴백이 “데모 품질” 기준으로 동작하는지 수동 검증한다.

**배경**: 실모델 경로는 인증/환경변수/네트워크에 의해 실패하기 쉬우며, 실패 시 “그냥 멈춤”이 되면 데모 루프가 깨진다. `.env` 자동 로딩(U-047) 이후에는 “export 없이도 real 모드 실행”이 가능해야 하고, 인증 실패 시에도 RULE-004(안전 폴백)로 종료되어야 한다. (PRD 8.2/10장, CP-MVP-04)

**완료 기준**:

- `.env`가 로드된 상태에서 서버가 real 모드로 실행되며, `/health`가 정상 응답한다.
- 프론트(UI) 또는 간단한 요청으로 턴 1회를 실행했을 때, NDJSON 스트림이 정상적으로 흐르고 최종 `final`이 스키마/비즈니스 룰을 통과한다. (Schema/Economy/Safety/Consistency)
- 인증/환경변수 누락 케이스에서도 서버가 크래시하지 않고, 안전 폴백(텍스트-only 포함)으로 종료한다. (RULE-004)
- “mock 고정 내러티브(…라고 말했습니다 + 발걸음 소리…)”가 real 모드 스모크 경로에서 반복 노출되지 않는다(모드 드리프트 방지).
- 발견된 결함/임시 대응은 `vibe/debt-log.md`에 기록된다.

## 영향받는 파일

**생성**:

- `vibe/unit-runbooks/CP-MVP-07.md` - real 모드 로컬 실행 검증 런북(시나리오/체크리스트)
- `vibe/unit-results/CP-MVP-07.md` - 실행 결과/관측값/증거(로그 요약/스크린샷/재현 정보)

**수정**:

- 없음(검증 단계)

**참조**:

- `vibe/prd.md` - 8.2(Vertex 인증), 10장(게이트/리플레이/폴백)
- `vibe/tech-stack.md` - 모델/인증/버전 SSOT
- `backend/.env.example` - 로컬 env 키 목록(SSOT)
- `backend/src/unknown_world/api/turn.py` - `/api/turn` 스트리밍 경로(관측 포인트)
- `.cursor/rules/00-core-critical.mdc` - RULE-004/005/007/008

## 구현 흐름

### 1단계: 로컬 환경 구성(.env)

- `cd backend`
- `.env.example`을 `.env`로 복사하고, 최소 다음을 채운다:
  - `UW_MODE=real`
  - `GOOGLE_APPLICATION_CREDENTIALS=...` (서비스 계정 키 파일 경로)
  - (선택) `VERTEX_PROJECT`, `VERTEX_LOCATION`
  - `ENVIRONMENT=development`

### 2단계: 서버 기동 및 상태 확인

- `uv sync`
- `uv run uvicorn unknown_world.main:app --reload --port 8011`
- `GET /health`로 서버가 정상 상태인지 확인한다(필요 시 degraded 허용 범위 확인).

### 3단계: real 모드 턴 스모크 테스트(스트리밍/배지/폴백)

- 프론트에서 Action Deck 카드 1개를 실행하거나, 동일한 TurnInput을 직접 호출하여:
  - `stage` 이벤트가 순서대로 온다(Parse→Validate→Plan→Resolve→Render→Verify→Commit).
  - `badges`가 OK로 수렴한다(실패 시 auto-repair/폴백 동작 확인).
  - 최종 `final`이 도착하고 UI/상태가 갱신된다.
- 실패 케이스(의도적):
  - `GOOGLE_APPLICATION_CREDENTIALS`를 잘못된 경로로 설정하거나 제거한 뒤 재실행
  - 크래시 없이 “안전 폴백”으로 종료되는지 확인한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-047[Mvp]](U-047[Mvp].md) - `.env` 자동 로딩(로컬) + 모드/ENV 가드
- **계획서/결과**: [CP-MVP-04](CP-MVP-04.md) - 실모델 Hard Gate 기준선(스키마/경제/복구)

**다음 작업에 전달할 것**:

- CP-MVP-06/CP-MVP-03(데모 루프) 수행 시 “real 모드 기동/인증/폴백”이 흔들리지 않는 운영 기준선
- 실모델 관련 결함/부채(debt-log) 목록

## 주의사항

**기술적 고려사항**:

- real 모드는 비용/지연 리스크가 있으므로, 스모크 테스트는 최소 1~2회로 제한하고 필요 시 저비용 정책(FAST)으로 수행한다. (RULE-005)
- 서비스 계정 키 파일 경로/내용은 절대 레포/로그/스크린샷에 남기지 않는다. (RULE-007)

**잠재적 리스크**:

- 로컬 머신/권한/네트워크에 따라 재현성이 떨어질 수 있음 → 런북에 “최소 환경/필수 변수/실패 시 체크리스트”를 포함한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: real 모드 스모크를 어디에서 트리거할까?
  - Option A: 프론트 UI에서 1회 실행(데모 관점, 권장)
  - Option B: `curl`/스크립트로 직접 `/api/turn` 호출(자동화 쉬움, UI 증거는 약함)
  **A1**: Option A

## 참고 자료

- `backend/.env.example` - 로컬 env 키/설명(SSOT)
- `vibe/prd.md` - Hard Gate/Repair loop/폴백, 인증 정책
- `.cursor/rules/00-core-critical.mdc` - RULE-004/005/007/008
