# RU-007[Mvp]: 리팩토링 - artifacts 버전/경로/링크 정리

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | RU-007[Mvp]                       |
| Phase     | MVP                               |
| 예상 소요 | 60분                              |
| 의존성    | U-026                             |
| 우선순위  | High                              |

## 작업 목표

SaveGame/엔딩 리포트/리플레이 결과/이미지 등 아티팩트가 늘어나는 시점에서, **버전/경로/링크 규칙**을 정리해 추적 가능성과 데모 반복성을 강화한다(동작 보존).

**배경**: PRD는 “Artifacts(저장 파일, 엔딩 리포트, 로그/이미지)”를 시스템의 필수 요소로 요구하며, 관측 가능성도 UX의 일부다. (RULE-001/008)

**완료 기준**:

- 아티팩트의 저장 경로 규칙이 정리되어(세션/턴/타입 기반) 충돌/덮어쓰기 위험이 줄어든다.
- `version` 필드/마이그레이션 훅이 최소한 준비되어 이후 형식 변경에 대비한다.
- UI/로그에는 프롬프트 원문/내부 추론/비밀정보가 포함되지 않는다(메타만). (RULE-007/008)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/artifacts/registry.py` - 아티팩트 메타/경로 레지스트리(선택)
- `backend/src/unknown_world/artifacts/types.py` - 아티팩트 타입/버전 정의(선택)

**수정**:

- `frontend/src/save/saveGame.ts` - (필요 시) artifacts 링크/메타 저장 구조 정리
- `backend/src/unknown_world/artifacts/ending_report.py` - 파일명/버전/링크 정리(필요 시)
- `backend/src/unknown_world/replay/runner.py` - 결과 저장 경로 정리(필요 시)
- `backend/src/unknown_world/storage/*` - 저장 경로 규칙 적용(필요 시)

**참조**:

- `.cursor/rules/00-core-critical.mdc` - RULE-001/007/008/010
- `vibe/prd.md` 6.6/6.5/10.3 - Save/Ending/Replay 요구

## 구현 흐름

### 1단계: 아티팩트 타입/경로 규칙 정의

- 타입 예: `save_game`, `ending_report`, `replay_result`, `scene_image`, `upload_image`
- 경로 규칙 예: `{session_id}/{turn_id}/{artifact_type}/{timestamp}.{ext}`

### 2단계: 버전/마이그레이션 최소 훅 준비

- SaveGame/EndingReport/ReplayResult에 `version` 필드를 포함하고, 파싱 시 기본값/누락 보정을 한다.
- “MVP에서의 버전 고정”과 “MMP에서의 확장”을 구분한다.

### 3단계: 링크/표시 정합

- 프론트가 아티팩트(엔딩 리포트/리플레이 결과)를 링크로 열람할 때, 깨진 링크가 발생하지 않도록 규칙을 통일한다.
- Demo Mode UI에는 메타(버전/라벨/단계)만 노출한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-025[Mvp]](U-025[Mvp].md) - 엔딩 리포트 아티팩트
- **계획서**: [U-026[Mvp]](U-026[Mvp].md) - 리플레이 결과 아티팩트
- **계획서**: [RU-006[Mvp]](RU-006[Mvp].md) - media/storage 추상화

**다음 작업에 전달할 것**:

- CP-MVP-03에서 “데모 종료 → 결과물(리포트/리플레이)”이 안정적으로 남는 기준선
- MMP의 U-102(GCS), U-105(자동 리플레이) 확장 시 경로/버전 SSOT로 사용

## 주의사항

**기술적 고려사항**:

- (RULE-010) 문서 합의 없이 DB/ORM으로 아티팩트 문제를 해결하려 하지 않는다.
- (RULE-007) 업로드/생성 파일은 보안/PII를 고려해 로그에 내용/원본을 남기지 않는다.

**잠재적 리스크**:

- 경로 규칙이 잦게 바뀌면 기존 세이브/리플레이가 깨짐 → 버전 필드와 마이그레이션 훅을 반드시 둔다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 아티팩트 레지스트리를 어디를 SSOT로 둘까?
  - Option A: 백엔드 registry(권장: 저장/서빙 정합성)
  - Option B: 프론트에서만 링크 구성(초기 단순, 서버/클라 드리프트 위험)

## 참고 자료

- `vibe/prd.md` - Artifacts/Replay/Ending 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-001/007/008/010

