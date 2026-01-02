# RU-011[Mmp]: 리팩토링 - Autopilot/Replay 모듈 정리

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | RU-011[Mmp] |
| Phase     | MMP         |
| 예상 소요 | 60분        |
| 의존성    | U-108       |
| 우선순위  | High        |

## 작업 목표

Autopilot/Replay 관련 코드가 커지기 전에 모듈 경계를 정리하고, 공통 정책(보안/검증/관측)을 일관되게 적용한다(동작 보존).

**배경**: Autopilot/Replay는 “장시간 실행 + 회귀 검증”의 핵심인데, 경계가 흐리면 보안/관측/복구 정책이 드리프트하기 쉽다. (RULE-004/007/008)

**완료 기준**:

- Autopilot 실행기/Replay 러너/Scenario library가 명확한 디렉토리/모듈로 정리된다.
- 공통 정책(프롬프트 비노출, secret 마스킹, repair 제한, hard gate 체크)이 공통 유틸로 적용된다.
- U-105 시나리오 러너가 기존과 동일하게 통과한다(Behavior Preservation).

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/autopilot/` - (선택) autopilot 모듈 디렉토리
- `backend/src/unknown_world/replay/` - (기존 유지) 하위 모듈 정리(선택)

**수정**:

- `backend/src/unknown_world/orchestrator/autopilot.py` - 위치/인터페이스 정리(필요 시)
- `backend/src/unknown_world/replay/*` - runner/auto_runner/report 구조 정리(필요 시)
- `backend/src/unknown_world/security/*` - 공통 정책 적용(필요 시)

**참조**:

- `.cursor/rules/00-core-critical.mdc` - RULE-004/007/008
- `vibe/prd.md` 10장 - 리플레이 기반 개발 방식

## 구현 흐름

### 1단계: 모듈 경계 정의

- Autopilot: goal/plan/step loop + 제한 정책
- Replay: scenario types/library/runner + invariants 체크
- 공통: policy(redaction, prompt non-exposure), validation(hard gate)

### 2단계: 파일 이동/인터페이스 고정(동작 보존)

- 퍼블릭 인터페이스(함수/클래스) 최소화
- import 경계/의존성 순환 제거

### 3단계: 시나리오 회귀로 확인

- U-105 자동 러너로 주요 시나리오가 동일하게 통과하는지 확인한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-024[Mvp]](U-024[Mvp].md) - Autopilot 백엔드 기반
- **계획서**: [U-105[Mmp]](U-105[Mmp].md) - 자동 리플레이 기반
- **계획서**: [U-108[Mmp]](U-108[Mmp].md) - 보안 하드닝/인젝션 시나리오

**다음 작업에 전달할 것**:

- CP-MMP-02에서 “시나리오 회귀 100%”를 통과할 안정 구조

## 주의사항

**기술적 고려사항**:

- 리팩토링 유닛에서는 새 기능 추가 금지(동작 보존).
- (RULE-008) 프롬프트/CoT 비노출은 모듈 어디에서도 예외가 없어야 한다.

**잠재적 리스크**:

- 리팩토링 중 import 경계가 깨져 배포/실행이 실패할 수 있음 → 작은 단위로 이동하고 런북 기반으로 점검한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: Replay 러너의 실행 위치는 어디가 적절할까?
  - Option A: 백엔드 CLI/스크립트(권장: 자동화 용이)
  - Option B: 프론트 Demo Mode 버튼(체감/데모에 좋지만 운영 분리 필요)

## 참고 자료

- `vibe/prd.md` - Replay 기반 개발
- `.cursor/rules/00-core-critical.mdc` - RULE-004/007/008
