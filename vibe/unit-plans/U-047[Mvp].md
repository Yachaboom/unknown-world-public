# U-047[Mvp]: Backend `.env` 자동 로딩(로컬) + 모드/ENV 가드(프롬프트/Vertex)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-047[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 45분        |
| 의존성    | U-003[Mvp],U-016[Mvp] |
| 우선순위  | High        |

## 작업 목표

로컬 개발에서 `backend/.env`를 **자동 로딩**하여 `UW_MODE`/`ENVIRONMENT`/Vertex 인증 관련 환경변수가 쉘 export 없이도 일관되게 적용되도록 만든다.

**배경**: 현재 `.env.example`에는 `UW_MODE=real`, `ENVIRONMENT=development` 등이 정의되어 있으나, 서버 시작 시 `.env`가 자동 로딩되지 않으면 `UW_MODE` 기본값(mock)으로 인해 MockOrchestrator 템플릿(“...라고 말했습니다” + 고정 내러티브)이 반복 노출되거나, 프롬프트/핫리로드 정책이 의도와 다르게 동작할 수 있다. (PRD 8.2, 기술스택: python-dotenv)

**완료 기준**:

- 로컬에서 `cd backend && cp .env.example .env` 후 `uv run uvicorn unknown_world.main:app ...` 실행 시 `.env`가 자동 로딩된다(추가 export 불필요).
- `UW_MODE`/`ENVIRONMENT`가 `.env` 기준으로 반영되어, 의도한 모드(mock/real)로 동작한다(모드 불일치로 인한 “고정 내러티브” 반복이 발생하지 않음).
- `.env`는 존재하지 않아도 서버가 정상적으로 시작한다(운영/CI에서 파일 미존재를 기본으로 허용).
- 민감 정보(서비스 계정 키/토큰/프롬프트 원문)는 로그/스트림/레포에 노출되지 않는다. (`.env`/키 파일 커밋 금지, RULE-007)

## 영향받는 파일

**생성**:

- 없음(기본은 기존 엔트리포인트에서 처리)

**수정**:

- `backend/src/unknown_world/main.py` - 앱 import 시점(또는 lifespan 시작 시점)에 `python-dotenv`로 `.env` 로딩(override 정책 포함)
- (필요 시) `backend/.env.example` - 주석/키 목록을 현재 코드/정책과 정합화(SSOT 유지)

**참조**:

- `vibe/prd.md` - 8.2(Vertex 인증/런타임), 10장(데모/검증 루프)
- `vibe/tech-stack.md` - `python-dotenv` 및 모델/인증 SSOT
- `backend/src/unknown_world/orchestrator/pipeline.py` - `UW_MODE` 기본값/모드 분기
- `backend/src/unknown_world/orchestrator/prompt_loader.py` - `ENVIRONMENT`(dev/prod) 분기
- `.cursor/rules/00-core-critical.mdc` - RULE-007(비밀정보), RULE-008(관측/노출)

## 구현 흐름

### 1단계: 로딩 정책 확정(override/스코프)

- `.env` 로딩 위치를 결정한다:
  - (권장) `unknown_world/main.py` 상단에서 `load_dotenv(override=False)`로 “존재하면 로드, 이미 설정된 env는 덮어쓰지 않음”.
- 로컬/운영 모두에서 안전한 정책을 유지한다:
  - `.env`가 없으면 no-op(정상 시작)
  - 운영(Cloud Run 등)은 런타임 env를 SSOT로 사용(override 금지)

### 2단계: `.env` 자동 로딩 구현 + 안전한 로그

- `python-dotenv`를 사용해 `.env`를 자동 로딩한다(의존성은 이미 `pyproject.toml`에 존재).
- 보안/UX를 위해, 로깅은 “모드/환경” 정도만 남기고 민감 값은 출력하지 않는다:
  - 예: `ENVIRONMENT=development`, `UW_MODE=real|mock` 정도만(경로/키/토큰은 금지).

### 3단계: 수동 검증(로컬)

- `.env`가 없는 상태에서 시작 → 기본 동작(기존 정책) 유지
- `.env`가 있는 상태에서 시작 → `UW_MODE`/`ENVIRONMENT`가 반영되는지 확인
- 이후 체크포인트(CP-MVP-07)에서 real 모드 스모크 테스트로 “실제 호출/스트리밍/폴백”까지 검증한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-003[Mvp]](U-003[Mvp].md) - FastAPI 엔트리포인트/실행 구조
- **계획서**: [U-016[Mvp]](U-016[Mvp].md) - Vertex 인증 및 모드 개념(UW_MODE)

**다음 작업에 전달할 것**:

- [CP-MVP-07](CP-MVP-07.md)에서 “real 모드 로컬 실행”을 안정적으로 재현할 수 있는 전제(환경변수 자동 로딩)
- MockOrchestrator 개선(U-048)과 함께, 로컬 데모에서 “고정 내러티브 반복” 체감을 제거

## 주의사항

**기술적 고려사항**:

- `.env` 로딩은 “개발 편의”이며, 운영에서는 런타임 환경변수가 SSOT여야 한다(override 금지).
- `.env`/서비스 계정 키 파일은 레포에 커밋하지 않는다(보안 레드라인).

**잠재적 리스크**:

- `.env`가 의도치 않게 운영/CI에 포함되면 설정 드리프트가 생길 수 있음 → override 금지 + 파일 미존재를 기본으로 가정하고 설계한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: `.env` 로딩을 언제/어디서 수행할까?
  - Option A: `unknown_world/main.py` import 시점에 `load_dotenv()` (권장: 단순/명확)
  - Option B: FastAPI lifespan 시작 시점에 로드(부팅 단계로 분리, 대신 일부 import-time env 사용 코드와 순서 이슈 가능)
  **A1**: Option A

## 참고 자료

- `backend/.env.example` - 로컬 개발 환경변수 예시(SSOT)
- `vibe/prd.md` - 8.2(Vertex 인증/런타임), 9장(UI/데모 표면)
- `vibe/tech-stack.md` - python-dotenv 포함 스택 SSOT
