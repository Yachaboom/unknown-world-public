# RU-010[Mmp]: 리팩토링 - 스키마/상수 SSOT 강화 + 파일 분리

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | RU-010[Mmp] |
| Phase     | MMP         |
| 예상 소요 | 60분        |
| 의존성    | U-105       |
| 우선순위  | High        |

## 작업 목표

Turn 스키마/모델 ID/배지/스테이지 목록 같은 핵심 상수를 SSOT로 강화하고, 파일이 커지기 시작한 모듈을 분리해 유지보수성을 높인다(동작 보존).

**배경**: 서버/클라 스키마 드리프트는 repair 비용과 회귀 실패를 폭증시킨다. MMP에서는 “문서/코드/런북” 정합성이 더 중요하다. (RULE-003/010)

**완료 기준**:

- 서버(Pydantic)와 클라(Zod)의 스키마/상수 정합성이 개선되고, 드리프트 위험이 줄어든다.
- 모델 라벨/ID, stage 목록, badge 키가 중앙 상수로 정리된다.
- 리팩토링은 Behavior Preservation을 지키며, 기존 시나리오(U-105)가 모두 통과한다.

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/constants/stages.py` - stage 목록 SSOT(서버)
- `backend/src/unknown_world/constants/badges.py` - badge 키 SSOT
- `frontend/src/constants/stages.ts` - stage 목록 SSOT(클라, 또는 서버에서 주입)
- `frontend/src/constants/badges.ts` - badge 키 SSOT

**수정**:

- `backend/src/unknown_world/models/turn.py` - 스키마 파일 분리/정리(필요 시)
- `frontend/src/schemas/turn.ts` - 스키마 정합성 정리(필요 시)

**참조**:

- `.cursor/rules/00-core-critical.mdc` - RULE-003/010/008
- `vibe/tech-stack.md` - 모델 ID 고정

## 구현 흐름

### 1단계: SSOT 대상 목록 확정

- stage 이름/순서
- badge 키/표시 라벨
- 모델 라벨/ID(FAST/QUALITY/IMAGE)
- (선택) schema_version

### 2단계: 상수 모듈화/중앙화

- 서버/클라 각각 상수 파일을 두고, 동기화 방식(수동/생성/서버 주입)을 정한다.

### 3단계: 시나리오 기반 회귀 확인

- U-105 자동 러너로 기존 시나리오가 통과하는지 확인한다(필요 시 결과 문서화).

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-105[Mmp]](U-105[Mmp].md) - 시나리오 회귀(통과 기준)

**다음 작업에 전달할 것**:

- CP-MMP-01에서 “배포/관측 게이트”를 안정적으로 유지할 SSOT 기반
- 이후 기능 추가 시 스키마/상수 드리프트를 예방하는 기준선

## 주의사항

**기술적 고려사항**:

- (RULE-010) 모델 ID/버전은 tech-stack SSOT로 고정하며, 리팩토링 중에 임의 변경하지 않는다.
- (RULE-008) 관측 정보는 메타만(프롬프트 원문/내부 추론 금지).

**잠재적 리스크**:

- “SSOT 강화”가 과도한 자동화로 번질 수 있음 → MMP에서는 최소 중앙화/동기화만 수행하고, 생성 자동화는 후순위로 둔다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: stage/badge SSOT를 어디에 둘까?
  - Option A: 서버 SSOT + 클라가 서버에서 수신(권장: 드리프트 최소)
  - Option B: 서버/클라 각각 고정(초기 단순, 동기화 부담)

## 참고 자료

- `.cursor/rules/00-core-critical.mdc` - RULE-003/008/010
- `vibe/tech-stack.md` - 모델/버전 SSOT
