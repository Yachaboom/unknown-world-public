# U-018[Mvp]: 비즈니스 룰 검증 + Repair loop + 안전 폴백

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-018[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-017       |
| 우선순위  | ⚡ Critical |

## 작업 목표

스키마 검증 이후에도 남는 “의미적 실패(경제/언어/좌표/안전)”를 서버에서 Hard gate로 검증하고, 실패 시 **Repair loop(재시도 제한)** 와 **안전 폴백**으로 항상 턴을 종료할 수 있게 만든다.

**배경**: PRD의 Hard Gate는 “스키마 OK”만이 아니라 Economy/Safety/Consistency까지 포함하며, 실패는 자동 복구 루프로 처리해야 한다. (RULE-004/005)

**완료 기준**:

- 스키마 통과 후에도 비즈니스 룰 검증이 수행된다(경제/언어/좌표/안전).
- 실패 시 `max_repair_attempts` 내에서 repair 재요청이 수행되고, UI에는 Auto-repair #n 결과만 노출된다. (RULE-004/008)
- 복구 실패 시에도 **스키마를 만족하는 안전 폴백 TurnOutput**으로 종료된다(텍스트-only 포함). (RULE-004)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/validation/business_rules.py` - Economy/Language/Box2D 등 비즈니스 룰 검증
- `backend/src/unknown_world/orchestrator/repair_loop.py` - repair 요청/재시도/종료(폴백) 로직
- `backend/src/unknown_world/orchestrator/fallback.py` - 안전 폴백 TurnOutput 생성기

**수정**:

- `backend/src/unknown_world/api/turn.py` - Auto-repair 스트림 이벤트(NDJSON) 송출/연결(필요 시)
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 실패 정보 전달/repair 입력 구성(필요 시)

**참조**:

- `.cursor/rules/00-core-critical.mdc` - RULE-004/005/006/009/008
- `.gemini/GEMINI.md` (structured-output/economy/safety imports) - 검증/복구 체크리스트
- `vibe/prd.md` 10.5 - Hard gate(스키마/경제/안전) 품질 게이트

## 구현 흐름

### 1단계: 비즈니스 룰 검증기 정의

- Economy: cost/balance_after 일관성, 잔액 음수 금지, 예상 비용 누락 금지
- Language: TurnInput.language와 TurnOutput.language 불일치/혼합 징후 차단
- Box2D: 0~1000 범위 + `[ymin,xmin,ymax,xmax]` 순서 검증
- Safety: blocked 시에도 스키마 준수 + 대체 결과 제공

### 2단계: Repair loop(제한된 재시도) 구현

- 검증 실패 시: 실패 요약(짧게) + “스키마/룰에 맞게 수정하라” 지시로 재요청한다(프롬프트 원문/CoT 노출 금지).
- 재시도 횟수 제한(`max_repair_attempts`)을 두고, 시도마다 스트림(NDJSON)로 `Auto-repair #n` 이벤트를 송출한다. (RULE-008)

### 3단계: Safe fallback TurnOutput 설계

- 최종 실패 시에도 UI가 빈 화면이 되지 않게:
  - narrative: “안전하게 텍스트-only로 진행합니다” 같은 안내(언어 고정)
  - ui: 최소 패널 자리 유지(액션덱에 저비용 대안 포함)
  - render.image_job.should_generate=false
  - economy: 비용 0 또는 보수적 처리(ledger 일관성 유지)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-017[Mvp]](U-017[Mvp].md) - Structured Outputs 호출 + Pydantic 스키마 검증

**다음 작업에 전달할 것**:

- RU-005에서 정리할 “Parse→…→Commit” 파이프라인의 검증/복구 표준
- U-024(Autopilot) 등 고급 흐름에서도 재사용할 repair/fallback 기반

## 주의사항

**기술적 고려사항**:

- (RULE-005) 경제 인바리언트는 서버에서 Hard gate로 보장해야 한다(클라만 믿지 않음).
- (RULE-008) 관측은 “결과/횟수”만: 프롬프트 원문/내부 추론을 이벤트로 보내지 않는다.

**잠재적 리스크**:

- repair가 무한 루프/비용 폭증으로 이어질 수 있음 → 반드시 재시도 횟수 제한 + 최종 폴백으로 종료한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: `max_repair_attempts`는 MVP에서 몇으로 둘까?
  - Option A: 2회(권장: 비용/지연 방지)
  - Option B: 3회(복구 성공률↑, 비용/지연↑)

## 참고 자료

- `vibe/prd.md` - Hard Gate/Repair loop 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-004/005/006/008/009
