# U-111[Mmp]: 스토리지 TTL/정리 정책 정의

## 메타데이터

| 항목      | 내용       |
| --------- | ---------- |
| Unit ID   | U-111[Mmp] |
| Phase     | MMP        |
| 예상 소요 | 60분       |
| 의존성    | U-102      |
| 우선순위  | Medium     |

## 작업 목표

생성 이미지/업로드 이미지/아티팩트(엔딩 리포트 등)의 **TTL(Time-To-Live) 및 자동 정리 정책**을 정의하고, 로컬 개발 환경과 클라우드(GCS) 환경에서 일관되게 적용되도록 구현한다.

**배경**: PRD 6.6에서 스토리지 TTL/정리 정책을 MMP 요구사항으로 명시했다. 생성 이미지/업로드 이미지가 무한히 누적되면 디스크 용량 문제와 민감 데이터 잔류 리스크가 발생한다. 스토리지 추상화(U-102)를 기반으로 TTL/정리 정책을 SSOT로 정의하고 자동화한다.

**완료 기준**:

- TTL/정리 정책이 문서화되고, 로컬/GCS 환경별 적용 방법이 명확하다.
- 로컬 환경: 백그라운드 태스크 또는 시작 시 정리 스크립트로 만료 파일을 자동 삭제한다.
- GCS 환경: Lifecycle 정책(JSON/YAML)이 정의되고, 적용 가이드가 포함된다.
- Scanner 업로드 이미지는 세션 범위 임시 저장 후 정리된다(민감 데이터 잔류 방지).
- 정리 정책 적용 시 게임 진행 중인 이미지가 삭제되지 않도록 보호 로직이 포함된다.

## 영향받는 파일

**생성**:

- `docs/storage-ttl-policy.md` - TTL/정리 정책 SSOT 문서
- `backend/scripts/cleanup_storage.py` - 로컬 스토리지 정리 스크립트(CLI)
- (선택) `infra/gcs-lifecycle.json` - GCS Lifecycle 정책 파일

**수정**:

- `backend/src/unknown_world/services/storage.py` (또는 `storage/interface.py`) - TTL 메타데이터 기록/조회 헬퍼
- `backend/src/unknown_world/main.py` - (선택) 시작 시 정리 태스크 등록
- `backend/src/unknown_world/api/scanner.py` - 업로드 이미지에 TTL 메타 추가

**참조**:

- `vibe/prd.md` 6.6 - 스토리지 TTL/정리 정책 요구
- `vibe/unit-plans/U-102[Mmp].md` - GCS 스토리지 어댑터(기반)
- `vibe/refactors/RU-006-S1.md` - 업로드 이미지 임시 저장 정책

## 구현 흐름

### 1단계: TTL 정책 설계/문서화

- 파일 유형별 TTL 정의:
  - 생성 이미지(Scene/Object): 24h~7d(설정 가능)
  - 업로드 이미지(Scanner): 세션 종료 또는 1h~24h
  - 아티팩트(엔딩 리포트): 7d~30d(사용자 다운로드 유도)
- 정책 문서(`docs/storage-ttl-policy.md`)를 작성하여 SSOT로 유지한다.

### 2단계: 로컬 환경 정리 스크립트 구현

- `cleanup_storage.py` 스크립트를 작성하여 `generated_images/`, `uploads/` 등을 순회하며 TTL 초과 파일을 삭제한다.
- TTL 기준: 파일 mtime 또는 메타데이터 파일(`.meta.json`)의 `created_at` + TTL
- (선택) 백엔드 시작 시 백그라운드 태스크로 주기적 실행(예: 1시간마다)

### 3단계: GCS Lifecycle 정책 정의

- `infra/gcs-lifecycle.json`에 버킷별 Lifecycle 규칙을 정의한다:
  - `generated-images/` 프리픽스: 7일 후 삭제
  - `uploads/` 프리픽스: 1일 후 삭제
  - `artifacts/` 프리픽스: 30일 후 삭제 또는 아카이브
- 적용 방법(`gsutil lifecycle set ...`) 가이드를 문서에 포함한다.

### 4단계: 세션 활성 파일 보호 로직

- 현재 진행 중인 세션의 이미지는 삭제하지 않도록 보호한다.
- 보호 방법:
  - Option A: 세션 ID별 폴더 + 세션 종료 시 정리 마킹
  - Option B: 활성 세션 목록 조회 + 참조 이미지 제외
- 삭제 전 로그를 남기고, dry-run 모드를 지원한다.

### 5단계: Scanner 업로드 이미지 TTL 적용

- `scanner.py`에서 업로드 시 `.meta.json`에 `ttl_hours`, `created_at`을 기록한다.
- 정리 스크립트에서 해당 메타를 읽어 TTL 초과 파일을 삭제한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-102[Mmp]](U-102[Mmp].md) - GCS 스토리지 어댑터(스토리지 추상화 기반)
- **결과물**: [RU-006-S1](../refactors/RU-006-S1.md) - 업로드 이미지 임시 저장 정책

**다음 작업에 전달할 것**:

- CP-MMP-02에서 "스토리지 정리 후에도 진행 중 세션 영향 없음" 시나리오 검증 기반
- 운영 배포 시 GCS Lifecycle 정책 적용 가이드

## 주의사항

**기술적 고려사항**:

- (보안) 업로드 이미지는 사용자 민감 데이터일 수 있음 → 세션 범위로 빠르게 정리하고, 로그에 파일명/경로만 남긴다(내용 노출 금지).
- (안정성) 정리 스크립트 실행 중 파일 접근 충돌 방지 → 파일 잠금 또는 atomic 삭제 패턴 사용.
- (가시성) 삭제 예정 파일 목록을 dry-run으로 미리 확인할 수 있게 한다.

**잠재적 리스크**:

- 잘못된 TTL 설정으로 진행 중 세션 이미지가 삭제될 수 있음 → 보호 로직 필수 + dry-run 검증 후 적용.
- GCS Lifecycle 정책 적용 실수로 전체 버킷 데이터 손실 가능 → 정책 적용 전 테스트 버킷에서 검증.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 로컬 정리 실행 시점은?
  - Option A: 서버 시작 시 1회 + 백그라운드 주기(권장: 자동화)
  - Option B: 수동 CLI 실행만(간단, 자동화 없음)
- [ ] **Q2**: GCS Lifecycle 정책 적용 범위는?
  - Option A: 전체 버킷에 프리픽스별 규칙(권장: 단순)
  - Option B: 버킷 분리(uploads/images/artifacts 각각)
- [ ] **Q3**: 세션 활성 파일 보호 방식은?
  - Option A: 세션 ID별 폴더 + 세션 종료 마킹(권장: 명확)
  - Option B: 활성 세션 조회 + 참조 파일 제외(복잡, 실시간)

## 참고 자료

- `vibe/prd.md` - 스토리지 TTL/정리 정책 요구
- `vibe/unit-plans/U-102[Mmp].md` - GCS 스토리지 어댑터
- `vibe/refactors/RU-006-S1.md` - 업로드 이미지 임시 저장 정책
- [GCS Object Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle) - GCS Lifecycle 공식 문서
