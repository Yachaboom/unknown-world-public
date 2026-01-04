# CP-MVP-01: 체크포인트 - 스트리밍/스키마/폴백

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | CP-MVP-01   |
| Phase     | MVP         |
| 예상 소요 | 45분        |
| 의존성    | RU-002[Mvp] |
| 우선순위  | ⚡ Critical |

## 작업 목표

초기 MVP 루프가 “항상 플레이 가능한 데모” 조건을 만족하는지, **스트리밍/검증/복구/폴백** 관점에서 수동 검증한다.

**배경**: PRD의 Hard Gate(스키마/경제/안전/일관성)는 “자동 복구 + 안전 폴백”까지 포함하며, 체크포인트로 조기에 깨짐을 잡아야 한다. (RULE-004)

**완료 기준**:

- HTTP Streaming으로 Queue/Badges가 먼저 보이고(TTFB 체감), 최종 TurnOutput이 UI에 반영된다. (RULE-008)
- TurnOutput 스키마 실패를 유도해도(모의 출력) Auto-repair 또는 safe fallback으로 종료되며, UI가 빈 화면이 되지 않는다. (RULE-004)
- 채팅 UI/프롬프트 노출/좌표 규약 위반이 없다. (RULE-002/008/009)

## 영향받는 파일

**생성**:

- (구현 후 기록) `vibe/unit-results/CP-MVP-01.md` - 체크포인트 결과/스크린샷/관측값 기록
- (선택) `vibe/unit-runbooks/CP-MVP-01.md` - 재현 가능한 수동 검증 런북

**수정**:

- 없음(검증 단계)

**참조**:

- `vibe/prd.md` - Hard Gate, TTFB 목표, 데모 표면 요구
- `vibe/roadmap.md` - 백로그/의존성 기준
- `.cursor/rules/00-core-critical.mdc` - RULE-002/003/004/008/009

## 구현 흐름

### 1단계: 기본 데모 시나리오(성공 경로)

- 백엔드/프론트를 로컬에서 실행한다.
- 텍스트 입력으로 1턴 실행 → Agent Console에 단계(Parse→…→Commit) 진행이 보이는지 확인한다.
- 최종 TurnOutput이 Zod 검증을 통과하고, Action Deck/Hotspot 등 최소 UI 데이터가 렌더되는지 확인한다.

### 2단계: 실패/복구 시나리오(스키마/룰 실패)

- 모의 Orchestrator에서 “의도적으로 스키마 실패”가 나오도록 토글/테스트 훅을 사용한다(구현 방식은 팀 합의).
- 실패 시:
  - Auto-repair #n 이벤트가 보이는지(또는 명시적 폴백) 확인
  - 최종적으로 safe fallback TurnOutput이 표시되는지 확인

### 3단계: 금지사항/인바리언트 체크

- 채팅 버블 UI가 없는지 확인한다. (RULE-002)
- 프롬프트 원문/내부 추론이 UI/콘솔에 노출되지 않는지 확인한다. (RULE-008)
- bbox가 0~1000 정규화 + `[ymin,xmin,ymax,xmax]` 순서로 처리되는지 확인한다. (RULE-009)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [RU-002[Mvp]](RU-002[Mvp].md) - 이벤트 계약/폴백 흐름 정리
- **결과물**: (추후) `{vibe/unit-results}/RU-002[Mvp].md`에 이벤트 계약 요약이 있으면 참조

**다음 작업에 전달할 것**:

- U-009~U-012에서 클릭/드래그 같은 상호작용을 얹기 위한 “안정적인 스트리밍 루프”
- 체크포인트 결과(증거/관측값)가 이후 데모 회귀 기준선이 된다

## 주의사항

**기술적 고려사항**:

- “성공 경로”만 보지 말고, 반드시 실패/복구 경로를 확인한다(Repair loop/폴백이 핵심 기능). (RULE-004)

**잠재적 리스크**:

- 실패 경로를 테스트할 훅이 없으면 회귀를 잡기 어려움 → 모의 Orchestrator에 “의도적 실패” 옵션을 넣는 것을 권장한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 체크포인트 런북/결과를 어디에 SSOT로 둘까?
  - Option A: `vibe/unit-runbooks/CP-MVP-01.md`에 재현 절차, `vibe/unit-results/CP-MVP-01.md`에 결과/증거
  - Option B: 결과 문서(unit-results)에 런북까지 포함(파일 수는 줄지만 절차/결과가 섞임)

## 참고 자료

- `vibe/prd.md` - Hard Gate, Demo Mode, TTFB 목표
- `.cursor/rules/00-core-critical.mdc` - RULE-002/003/004/008/009
