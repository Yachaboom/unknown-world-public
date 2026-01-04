# CP-MMP-01: 체크포인트 - 배포/관측 게이트

## 메타데이터

| 항목      | 내용              |
| --------- | ----------------- |
| Unit ID   | CP-MMP-01         |
| Phase     | MMP               |
| 예상 소요 | 60분              |
| 의존성    | U-101,RU-010[Mmp] |
| 우선순위  | ⚡ Critical       |

## 작업 목표

Cloud Run 배포 환경에서 “관측 가능성(Queue/Badges/Auto-repair) + Hard Gate(스키마/경제/안전/일관성)”가 실제로 유지되는지 검증하고, 런북/증거를 남긴다.

**배경**: MMP는 데모가 “운영 가능한 품질”로 보이기 위해 배포/관측이 안정적으로 작동해야 한다. (PRD 10장, RULE-008)

**완료 기준**:

- 배포 환경에서 `/api/turn` HTTP Streaming(POST) 스트리밍이 동작하고, TTFB 체감이 유지된다(<2s 목표).
- Agent Console에서 Queue/Badges/Auto-repair 트레이스가 보인다(프롬프트 원문/CoT는 비노출). (RULE-008)
- 최소 1개 시나리오(U-105) 실행이 배포 환경에서 통과한다.

## 영향받는 파일

**생성**:

- `vibe/unit-runbooks/CP-MMP-01.md` - 배포/관측 체크 런북
- `vibe/unit-results/CP-MMP-01.md` - 결과/관측값/증거

**수정**:

- 없음(검증 단계)

**참조**:

- `vibe/prd.md` - Demo Mode/관측/TTFB 목표
- `vibe/tech-stack.md` - Cloud Run/Vertex 인증
- `.cursor/rules/00-core-critical.mdc` - RULE-007/008/003/004

## 구현 흐름

### 1단계: 배포 런북대로 실행/헬스 확인

- Cloud Run 배포 후 헬스 체크/기본 turn 실행 확인

### 2단계: 관측 UI/스트리밍 검증

- 단계(Queue)가 스트리밍으로 업데이트되는지 확인
- Badges(Schema/Economy/Safety/Consistency)가 표시되는지 확인
- Auto-repair가 발생하는 케이스에서 트레이스가 노출되는지 확인(메타만)

### 3단계: 시나리오 회귀(대표 1개 이상)

- U-105 시나리오 1개를 실행해 pass/fail를 기록한다.
- 실패 시 원인(턴/인바리언트)만 기록하고 프롬프트 원문은 남기지 않는다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-101[Mmp]](U-101[Mmp].md) - Cloud Run 배포/secret 가이드
- **계획서**: [RU-010[Mmp]](RU-010[Mmp].md) - SSOT 강화(스테이지/배지 정합)

**다음 작업에 전달할 것**:

- U-106(관측 고도화)와 U-108(보안 하드닝)에서 사용할 배포/관측 기준선

## 주의사항

**기술적 고려사항**:

- (RULE-007) 배포 로그/문서에 키/토큰/민감값을 남기지 않는다.
- (RULE-008) 관측은 메타만: 프롬프트/CoT 비노출.

**잠재적 리스크**:

- 배포 환경 CORS/네트워크로 프론트 연동이 깨질 수 있음 → 런북에 체크리스트/진단 절차 포함.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: CP 결과물은 어느 수준으로 남길까?
  - Option A: 스크린샷 + 측정값(TTFB/응답시간) + pass/fail(권장)
  - Option B: 영상/라이브 링크까지(신뢰도↑, 비용↑)

## 참고 자료

- `vibe/prd.md` - 관측/TTFB/데모 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-007/008/003/004
