# 리팩토링 - 디렉토리/설정 정리 개발 완료 보고서

## 메타데이터

- **작업 ID**: RU-001[Mvp]
- **단계 번호**: 1.2
- **작성 일시**: 2026-01-04 19:15
- **담당**: AI Agent

---

## 1. 작업 요약

스캐폴딩 초기 단계의 불일치를 제거하고, `shared/` 기반의 SSOT(JSON Schema) 체계를 도입하여 향후 유닛들이 일관된 규칙(RULE-001~011) 하에 개발될 수 있도록 프로젝트 전반의 구조와 설정을 리팩토링함.

---

## 2. 작업 범위

- **디렉토리 구조 확정**: `frontend/`, `backend/`, `shared/` 삼분할 구조 및 명명 규칙 통일
- **JSON Schema SSOT 도입**: `shared/schemas/turn/` 내 `TurnInput`, `TurnOutput` 스키마 구축
- **버전 및 환경 제어**: 루트 `package.json`에 Node/pnpm 버전 명시 및 백엔드 의존성 고정(uv sync 기준)
- **포트 정책 강제**: RULE-011 준수(프론트 8001, 백엔드 8011) 및 `strictPort`를 통한 충돌 방지
- **실행 스크립트 단일화**: 루트 `package.json`의 `dev:front`, `dev:back`을 통한 일관된 실행 환경 보장
- **보안 및 무시 정책**: `.gitignore` 리팩토링을 통해 스키마 파일 추적 및 보안 민감 파일(service-account 등) 차단 강화

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `package.json` | 수정 | 루트 실행 스크립트 단일화 및 도구 버전(Node/pnpm) 명시 |
| `shared/schemas/turn/*.json` | 신규 | 클라이언트-서버 간 계약을 위한 JSON Schema SSOT |
| `shared/README.md` | 신규 | 공유 스키마 운영 전략(Option B) 명시 |
| `backend/pyproject.toml` | 수정 | 의존성 고정(==) 및 Pyright 설정 단일화 |
| `backend/src/unknown_world/main.py` | 수정 | RULE-011 기반 CORS 허용 범위 및 docstring 업데이트 |
| `frontend/vite.config.ts` | 수정 | RULE-011 포트 지정 및 `strictPort: true` 설정 |
| `.gitignore` | 수정 | JSON 정책 리팩토링 및 `shared/` 추적 허용 |
| `vibe/roadmap.md` | 수정 | 실행 가이드 및 포트 정책 정합성 동기화 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약 (JSON Schema SSOT)**:
- `TurnInput`: 언어, 텍스트, 클릭 좌표(0~1000), 뷰포트 정보, 재화 스냅샷 포함
- `TurnOutput`: 내러티브, UI(선택지/오브젝트), 월드 상태(델타), 렌더 잡, 경제(비용/잔액), 안전 상태 포함

**설계 패턴/원칙**:
- **Option B (JSON Schema SSOT)**: 서버와 클라이언트가 `shared/` 내의 동일한 JSON 스키마 파일을 참조하여 각각 Pydantic과 Zod 모델을 생성/검증하도록 함.
- **Fail-fast (strictPort)**: 포트 충돌 시 임의의 포트로 변경되지 않도록 강제하여 CORS 불일치 문제를 예방함.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `shared/` 디렉토리가 새롭게 추가되었으며, 향후 모든 스키마의 중심점이 됨.
- **권한/보안**: 서비스 계정 키 파일에 대한 ignore 정책이 강화되었으며, `secrets/` 디렉토리가 표준 보안 저장소로 명시됨.
- **빌드/의존성**: `uv.lock` 및 `pnpm-lock.yaml`과 `pyproject.toml` 간의 버전 정합성이 확보됨.

### 4.3 가정 및 제약사항

- 모든 개발자는 Node.js `24.12.0` 및 pnpm `10.27.0` 환경을 사용하는 것을 전제로 함.
- 포트 8001~8020 대역은 이 프로젝트 전용으로 예약된 것으로 간주함.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/RU-001[Mvp]-runbook.md` (참조: `RU-001-S1`~`Q5` 세부 런북)
- **실행 결과**: 루트 스크립트를 통한 프론트/백엔드 동시 실행 및 포트 정책 준수 확인 완료
- **참조**: `pnpm dev:front` (8001), `pnpm dev:back` (8011)

---

## 6. 리스크 및 주의사항

- **스키마 변경**: `shared/` 내부의 스키마 변경 시 반드시 서버와 클라이언트 양쪽의 검증 로직 업데이트가 수반되어야 함.
- **포트 충돌**: 타 프로세스가 8001/8011을 점유 중일 경우 `strictPort`에 의해 실행이 실패하므로 `pnpm kill:port`를 선행해야 함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-005[Mvp]**: `shared/` 스키마를 상속받은 백엔드 Pydantic 모델 구현
2. **U-006[Mvp]**: `shared/` 스키마를 상속받은 프론트엔드 Zod 모델 구현

### 7.2 의존 단계 확인

- **선행 단계**: U-003, U-004 완료 확인됨
- **후속 단계**: M1 마일스톤의 Turn 계약 단계 진입

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
