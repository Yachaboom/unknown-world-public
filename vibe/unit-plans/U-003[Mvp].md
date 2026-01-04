# U-003[Mvp]: 백엔드 FastAPI 초기화 (/backend)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-003[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-001       |
| 우선순위  | ⚡ Critical |

## 작업 목표

FastAPI 기반 오케스트레이터 백엔드의 “실행 가능한 최소 뼈대”를 만들고, 이후 유닛에서 TurnInput/TurnOutput 계약과 HTTP Streaming(POST) 기반 스트리밍을 얹을 수 있는 기반을 마련한다.

**배경**: Unknown World는 “string→string 채팅 API”가 아니라 Turn 계약 기반의 시스템이므로, 백엔드 골격부터 이를 전제로 잡아야 한다. (RULE-001)

**완료 기준**:

- `backend/`에서 FastAPI 앱이 기동되고 `/health` 같은 최소 엔드포인트로 헬스 체크가 가능하다.
- 로컬 개발에서 프론트와 통신할 수 있도록 CORS 기본 정책이 준비된다(엄격 모드는 MMP에서).
- 의존성 버전이 `vibe/tech-stack.md`를 SSOT로 고정한다. (RULE-010)

## 영향받는 파일

**생성**:

- `backend/requirements.txt` - FastAPI/Uvicorn/Pydantic 등 버전 고정(tech-stack 기준)
- `backend/src/unknown_world/main.py` - FastAPI 앱 엔트리 + 최소 라우트
- `backend/src/unknown_world/__init__.py` - 패키지 루트(구조 선택은 U-001 Q1 기반)

**수정**:

- 없음

**참조**:

- `vibe/tech-stack.md` - Python/FastAPI/Uvicorn/Pydantic 버전 SSOT
- `.cursor/rules/20-backend-orchestrator.mdc` - HTTP Streaming/Vertex/검증/복구 가이드
- `.cursor/rules/00-core-critical.mdc` - RULE-001/003/004/007/010

## 구현 흐름

### 1단계: 백엔드 패키지/엔트리 구성

- `backend/src/unknown_world/`를 애플리케이션 패키지 루트로 구성한다(Option A 기준).
- `main.py`에 FastAPI 앱 생성 및 최소 라우트(`/health`)를 추가한다.

### 2단계: 의존성 고정 및 실행 명령 합의

- `requirements.txt`에 FastAPI/Uvicorn/Pydantic 버전을 tech-stack 기준으로 고정한다. (RULE-010)
- 로컬 실행 커맨드(예: `uvicorn unknown_world.main:app --reload`)를 문서/런북에 일관되게 반영한다.

### 3단계: 프론트 연동을 위한 최소 CORS 준비

- 개발 환경에서만 허용하는 CORS(예: localhost) 기본 정책을 설정한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-001[Mvp]](U-001[Mvp].md) - `backend/` 디렉토리 스캐폴딩

**다음 작업에 전달할 것**:

- U-005에서 TurnInput/TurnOutput(Pydantic) 모델을 추가할 수 있는 패키지 구조
- U-007에서 `/api/turn` HTTP Streaming(POST) 라우트를 추가할 수 있는 FastAPI 앱 엔트리

## 주의사항

**기술적 고려사항**:

- (RULE-007) 인증은 Vertex 서비스 계정이며, 사용자 키 입력(BYOK) 흐름을 만들지 않는다.
- (RULE-010) 문서 합의 없이 DB/ORM 도입 금지: 저장은 SaveGame(JSON) 중심으로 설계한다.

**잠재적 리스크**:

- 초기 패키지 구조를 잘못 잡으면 이후 임포트/배포 정리가 반복됨 → U-001 Q1 결정을 선행하고, RU-001에서 정리한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 파이썬 의존성 관리는 무엇으로 고정할까?
  - Option A: `requirements.txt`(권장: 단순/명확, CI도 쉬움)
  - Option B: `pyproject.toml` 기반(추가 도구/합의 필요)

## 참고 자료

- `vibe/tech-stack.md` - 백엔드 버전 SSOT
- `.cursor/rules/20-backend-orchestrator.mdc` - HTTP Streaming/검증/복구 기준
