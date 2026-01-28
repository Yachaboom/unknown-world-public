# U-047[Mvp]: Backend `.env` 자동 로딩(로컬) + 모드/ENV 가드(프롬프트/Vertex) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-047[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-28 23:45
- **담당**: AI Agent

---

## 1. 작업 요약

로컬 개발 편의성을 위해 `backend/.env` 파일을 자동 로딩하는 기능을 구현하였습니다. 이를 통해 쉘에서 직접 `export` 명령어를 수행하지 않고도 `UW_MODE`(mock/real) 및 `ENVIRONMENT` 설정을 일관되게 유지할 수 있으며, 운영 환경의 설정(SSOT)을 덮어쓰지 않도록 안전 가드를 적용하였습니다.

---

## 2. 작업 범위

- **`.env` 자동 로딩 로직 통합**: FastAPI 엔트리포인트(`main.py`) 상단에 `python-dotenv` 로딩 가드 추가.
- **보안 로깅 적용**: 서버 부팅 시 환경 변수 로드 상태를 출력하되, RULE-007에 따라 민감 정보(경로, 키 등)를 제외한 핵심 모드 정보만 노출.
- **단위 테스트 및 정책 검증**: 파일 존재/부재 시나리오, `override=False` 정책, 보안 가드 작동 여부를 검증하는 테스트 코드 구현.
- **실행 런북 작성**: 로컬 개발자를 위한 단계별 환경 설정 및 검증 가이드 작성.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `backend/src/unknown_world/main.py` | 수정 | 서버 시작 시 `.env` 자동 로드 및 상태 로깅 |
| `backend/tests/unit/test_dotenv_autoload.py` | 신규 | `.env` 로딩 정책 및 보안 규칙 검증 테스트 |
| `vibe/unit-runbooks/U-047-dotenv-autoload-runbook.md` | 신규 | 유닛 실행 및 수동 검증 가이드 |
| `vibe/debt-log.md` | 수정 | 테스트 코드 Pyright strict 모드 관련 기술 부채 기록 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**`.env` 로딩 엔진**:
- `load_dotenv(dotenv_path=_DOTENV_PATH, override=False)`: 프로젝트 루트의 `.env`를 탐색하며, 이미 설정된 시스템 환경 변수가 있을 경우 덮어쓰지 않음으로써 운영 환경의 설정 우선순위를 보장합니다.

**보안 로깅 (RULE-007/008)**:
- 로깅 시 `os.environ.get`을 통해 `UW_MODE`와 `ENVIRONMENT` 값만 추출하여 기록합니다. API 키 경로인 `GOOGLE_APPLICATION_CREDENTIALS` 등은 로그에 노출되지 않도록 설계되었습니다.

### 4.2 외부 영향 분석

- **환경 설정**: 이제 로컬 개발 시 `backend/.env` 파일만 생성하면 별도의 쉘 설정 없이 `real` 모드 테스트가 가능합니다.
- **운영 안정성**: `override=False` 정책 덕분에 Cloud Run 등 운영 환경에서 설정된 환경 변수가 로컬 `.env` 파일(실수로 포함된 경우)에 의해 오염되는 것을 방지합니다.

### 4.3 가정 및 제약사항

- `.env` 파일은 `backend/` 디렉토리에 위치해야 하며, 프로젝트 루트 레벨에서 관리됩니다.
- `python-dotenv` 라이브러리가 설치되어 있어야 합니다 (이미 `pyproject.toml`에 포함됨).

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-047-dotenv-autoload-runbook.md`
- **실행 결과**: 파일 존재/부재, `export` 우선순위 등 모든 수동 검증 시나리오가 런북 절차에 따라 정상 동작함을 확인하였습니다.

---

## 6. 리스크 및 주의사항

- **기술 부채**: 테스트 코드에 대해 `pyright` strict 모드 검사를 수행할 경우 fixture 및 mocking 관련 타입 어노테이션 미비로 인해 다수의 에러가 발생할 수 있습니다 (`vibe/debt-log.md` 참고).

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **CP-MVP-07**: `real` 모드 로컬 실행 게이트 검증 (실제 Vertex 호출 및 스트리밍 확인).
2. **U-048**: MockOrchestrator의 내러티브 템플릿 개선.

### 7.2 의존 단계 확인

- **선행 단계**: U-003[Mvp], U-016[Mvp] (완료)
- **후속 단계**: CP-MVP-07, U-048 (로드맵 참조)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] `override=False` 정책으로 운영 SSOT 보호 확인
- [x] RULE-007에 따른 민감 정보 로그 노출 차단 확인
- [x] 단위 테스트(`test_dotenv_autoload.py`) 통과 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
