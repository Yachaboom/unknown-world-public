# U-102[Mmp]: GCS 스토리지 어댑터(이미지/아티팩트)

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-102[Mmp]                        |
| Phase     | MMP                               |
| 예상 소요 | 75분                              |
| 의존성    | U-100                             |
| 우선순위  | ⚡ Critical                        |

## 작업 목표

로컬 스토리지(MVP)를 GCS로 확장해, 이미지/아티팩트(엔딩 리포트/리플레이 결과)를 안정적으로 저장/서빙할 수 있게 한다.

**배경**: 운영/배포 환경에서는 로컬 디스크가 휘발될 수 있으므로, Cloud Storage 기반이 필요하다. (tech-stack, RULE-010)

**완료 기준**:

- 스토리지 추상화(RU-006/RU-007)를 GCS 구현으로 확장할 수 있다.
- 이미지/아티팩트가 GCS에 저장되고, 프론트가 접근 가능한 URL/서빙 방식이 정해진다.
- 접근 제어/권한이 최소 권한으로 구성되고, 민감값이 로그/레포에 남지 않는다. (RULE-007)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/storage/gcs_storage.py` - GCS 스토리지 구현
- (선택) `backend/src/unknown_world/config/storage.py` - 버킷/경로 설정

**수정**:

- `backend/requirements.txt` - `google-cloud-storage==3.7.0` 추가(tech-stack 기준)
- `backend/src/unknown_world/storage/storage.py` - 스토리지 선택(로컬/GCS) 분기(필요 시)

**참조**:

- `vibe/tech-stack.md` - google-cloud-storage 버전/Cloud Run 배포
- `.cursor/rules/00-core-critical.mdc` - RULE-007/010

## 구현 흐름

### 1단계: 버킷/경로/권한 정책 확정

- 버킷 이름/폴더 구조(세션/턴/타입)를 확정한다.
- Cloud Run 서비스 계정에 버킷 접근 권한을 부여한다(키 파일 커밋 금지).

### 2단계: GCS 스토리지 구현

- put/get(또는 signed URL) 기반으로 업로드/다운로드를 구현한다.
- 반환 값은 URL/핸들 중심으로 하고, 내부 경로/민감 메타를 노출하지 않는다.

### 3단계: 기존 기능(이미지/아티팩트) 연결

- 이미지 생성/스캐너/리포트/리플레이 결과 저장 경로를 GCS로 전환한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [RU-006[Mvp]](RU-006[Mvp].md) - storage 추상화(로컬)
- **계획서**: [RU-007[Mvp]](RU-007[Mvp].md) - artifacts 경로/버전 규칙

**다음 작업에 전달할 것**:

- U-103(이미지 편집), U-105(자동 리플레이)에서 필요한 안정적 에셋 저장 기반

## 주의사항

**기술적 고려사항**:

- (RULE-007) bucket/URL 설계에서 공개 범위를 최소화하고, 필요 시 signed URL을 고려한다.
- (RULE-010) 저장 방식을 DB로 바꾸는 방향 전환 금지: 파일/아티팩트 저장으로 유지.

**잠재적 리스크**:

- URL/권한 설계가 미흡하면 데모에서 이미지가 안 보일 수 있음 → 런북에 권한/접근 체크리스트 포함.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: GCS 서빙 방식은?
  - Option A: 공개 read(데모 단순, 보안↓)
  - Option B: signed URL(권장: 보안↑, 구현/만료 관리 필요)

## 참고 자료

- `vibe/tech-stack.md` - GCS/Cloud Run
- `.cursor/rules/00-core-critical.mdc` - RULE-007/010


