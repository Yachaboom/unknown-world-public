# U-106[Mmp]: 관측 지표/대시보드(Agent Console 메트릭) 고도화

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-106[Mmp]                        |
| Phase     | MMP                               |
| 예상 소요 | 75분                              |
| 의존성    | CP-MMP-01                         |
| 우선순위  | High                              |

## 작업 목표

Agent Console을 “과정 가시화”를 넘어, TTFB/단계 소요시간/재시도 횟수/이미지 시간/비용 라벨 등을 포함한 **관측 대시보드**로 고도화한다(프롬프트 원문/CoT 비노출).

**배경**: PRD는 관측 가능성(Observability)을 UX의 일부로 요구하며, Demo Mode에서 실시간 지표를 보여야 한다. (PRD 10.2, RULE-008)

**완료 기준**:

- 최소 지표가 UI에 표시된다: TTFB, 총 응답 시간, 단계별 소요, Auto-repair 횟수, 모델 라벨(FAST/QUALITY/REF).
- 지표는 “사용자 친화 라벨”로만 표시되고, 프롬프트/내부 추론은 노출되지 않는다. (RULE-008)
- 지표 수집/표시가 게임 진행을 방해하지 않는다(성능/가독성).

## 영향받는 파일

**생성**:

- `frontend/src/components/ObservabilityPanel.tsx` - 지표 카드/그래프(간단)
- `frontend/src/stores/metricsStore.ts` - 지표 수집 상태(Zustand)

**수정**:

- `frontend/src/components/AgentConsole.tsx` - 지표 표시 통합/정리
- `backend/src/unknown_world/api/turn.py` - (선택) SSE 이벤트에 timing 메타 추가
- `frontend/src/api/turnStream.ts` - timing/메타 파싱(필요 시)

**참조**:

- `vibe/prd.md` 10.2 - Demo Mode 지표
- `.cursor/rules/00-core-critical.mdc` - RULE-008

## 구현 흐름

### 1단계: 지표 목록/수집 지점 정의

- 클라 측정: 요청 시작~첫 이벤트(TTFB), 종료까지 총 시간
- 서버 제공(선택): stage별 시간/모델 라벨/재시도 횟수

### 2단계: UI 표시(가독성 우선)

- 숫자/라벨 중심으로 간단히 표시하고, 과도한 그래프/로그 노출은 피한다.
- 실패/복구 케이스에서 지표가 어떻게 보이는지(재시도 횟수 등) 포함한다.

### 3단계: 개인정보/보안/프롬프트 비노출 확인

- 이벤트/로그에 프롬프트 원문/내부 추론/민감값이 포함되지 않는지 점검한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **체크포인트**: [CP-MMP-01](CP-MMP-01.md) - 배포/관측 게이트 기준선

**다음 작업에 전달할 것**:

- U-107(접근성/모바일)에서 지표 UI를 가독성 있게 다듬을 기반
- 운영/데모에서 튜닝 루프(리플레이→개선) 지표 근거

## 주의사항

**기술적 고려사항**:

- (RULE-008) 관측은 메타만: 프롬프트/CoT 비노출.
- 지표는 UX를 해치지 않아야 하며, 기본 UI는 게임 HUD를 유지한다.

**잠재적 리스크**:

- 지표 표시가 과도하면 “개발자 도구”처럼 보일 수 있음 → Demo Overlay 토글로 제어하고, 기본은 간결하게 유지한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: Demo Overlay는 기본 ON일까?
  - Option A: 기본 ON(심사자 설득력↑)
  - Option B: 기본 OFF + 토글(권장: UX 깔끔, 필요 시 노출)

## 참고 자료

- `vibe/prd.md` - Demo Mode/관측 지표
- `.cursor/rules/00-core-critical.mdc` - RULE-008


