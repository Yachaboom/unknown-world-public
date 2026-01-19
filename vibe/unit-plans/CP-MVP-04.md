# CP-MVP-04: 체크포인트 - 실모델 Hard Gate(스키마/경제/복구)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | CP-MVP-04   |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | RU-005[Mvp] |
| 우선순위  | ⚡ Critical |

## 작업 목표

Mock(모의) 기반 턴 실행을 “실모델( Vertex 서비스 계정 + google-genai )”로 전환한 뒤에도, **Hard Gate(스키마/경제/안전/일관성)** 가 깨지지 않음을 수동 검증하고, 깨짐이 발견되면 즉시 기술 부채로 기록한다.

**배경**: M3 구간은 실모델/구조화 출력/복구 루프가 한 번에 통합되며, 체크포인트 없이 다음 기능(멀티모달/Autopilot)을 얹으면 기술 부채가 급격히 누적될 위험이 크다. (PRD Hard Gate, RULE-004)

**완료 기준**:

- 실모델 턴 실행에서 **HTTP Streaming 단계(Queue/Badges) 스트림**이 정상 출력되고, UI가 최종 TurnOutput을 반영한다. (RULE-008)
- 최종 TurnOutput이 **서버(Pydantic) + 클라(Zod)** 검증을 통과한다. 실패 시 Auto-repair 또는 safe fallback으로 **항상 종료**한다(빈 화면/무한 대기 금지). (RULE-004)
- Economy 인바리언트가 유지된다: 비용/잔액이 일관되고, **잔액 음수**가 발생하지 않는다. 부족 시 대체 행동(텍스트-only 등)이 제안된다. (RULE-005)
- Safety 차단 또는 오류 발생 시에도 **명시적 메시지 + 안전한 대체 결과**가 제공되며, 프롬프트 원문/내부 추론이 노출되지 않는다. (RULE-004/008)
- 이 체크포인트에서 발견된 결함/우회/임시 코드가 있다면 `vibe/debt-log.md`에 **미해결 기술 부채로 기록**한다(“나중에”로 방치 금지).

## 영향받는 파일

**생성**:

- `vibe/unit-runbooks/CP-MVP-04.md` - 재현 가능한 수동 검증 런북(명령어/시나리오/체크리스트)
- `vibe/unit-results/CP-MVP-04.md` - 체크포인트 결과/관측값/증거(스크린샷/로그 요약)

**수정**:

- 없음(검증 단계, 단 발견된 결함은 별도 유닛/부채로 추적)

**참조**:

- `vibe/prd.md` - Hard Gate, Economy, Demo Mode, Safety/Repair 요구
- `vibe/tech-stack.md` - Vertex 서비스 계정, 모델 라벨(FAST/QUALITY) 고정
- `vibe/unit-results/test_streaming_manual_v2.py` - (있는 경우) 수동 스트리밍 테스트 스크립트
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/005/008/009
- `.cursor/rules/20-backend-orchestrator.mdc` - 오케스트레이터/스트리밍/복구 표준

## 구현 흐름

### 1단계: 실모델 성공 경로(기본 턴)

- 로컬에서 프론트/백엔드를 실행한다.
- 데모 프로필로 시작 → 텍스트 입력(또는 카드 클릭)으로 1턴 실행한다.
- Agent Console에서 `stage`/`badges`/`final`이 순서대로 도착하는지 확인한다.
- 최종 TurnOutput이 UI(로그/패널/Action Deck 등)에 반영되는지 확인한다.

### 2단계: 실패/복구 경로(스키마/비즈니스 룰/안전)

- 스키마 실패 또는 비즈니스 룰 실패(예: 잔액 부족)를 유도한다.
- 실패 시에도 다음을 확인한다:
  - Auto-repair가 수행되거나, safe fallback TurnOutput이 제공된다.
  - UI가 “멈춤/빈 화면” 상태가 되지 않는다.
  - Safety 차단은 사용자에게 명시되고, 대체 결과가 제공된다.

### 3단계: 기술 부채 기록(필수)

- 위 단계에서 발견된 임시 대응/우회/깨짐이 있으면 `vibe/debt-log.md`에 “미해결”로 기록한다.
- 체크포인트 결과(`unit-results`)에는 “무엇이 깨졌고/왜 위험하며/다음에 어떤 유닛으로 해결할지”를 짧게 남긴다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [RU-005[Mvp]](RU-005[Mvp].md) - 오케스트레이터 stage/검증/복구 흐름 정리
- **계획서**: [U-016[Mvp]](U-016[Mvp].md) - Vertex 인증 + 클라이언트/모델 라벨 고정
- **계획서**: [U-017[Mvp]](U-017[Mvp].md) - Structured Output + Pydantic 검증
- **계획서**: [U-018[Mvp]](U-018[Mvp].md) - 비즈니스 룰 검증 + Repair loop + 안전 폴백

**다음 작업에 전달할 것**:

- CP-MVP-05/06에서 멀티모달/Scanner를 얹기 전에, “실모델 Hard Gate” 기준선(증거/런북)
- 발견된 기술 부채 목록(SSOT: `vibe/debt-log.md`)

## 주의사항

**기술적 고려사항**:

- 비밀정보(서비스 계정 키/토큰)는 레포/로그/문서에 남기지 않는다. (RULE-007)
- “프롬프트 원문/내부 추론”은 어떤 UI/로그/문서에도 노출하지 않는다(메타/라벨만). (RULE-008)

**잠재적 리스크**:

- 실모델 전환 시 비용/지연이 급증할 수 있음 → Economy 정책(예상 비용/대안)과 텍스트 우선 스트리밍(TTFB)을 반드시 함께 확인한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 실모델 Hard Gate에서 “실패로 간주할 기준선”은 어디까지 둘까?
  - Option A: `Schema/Economy/Safety/Consistency` 배지 실패는 즉시 fail(필수), TTFB는 관측만(권장)
  - Option B: TTFB(예: 2s)도 Hard Gate로 포함(체감 품질은 좋아지나 개발 속도 저하)

## 참고 자료

- `vibe/prd.md` - Hard Gate(스키마/경제/안전/일관성), Demo Mode
- `vibe/tech-stack.md` - Vertex 서비스 계정, 모델 티어링(FAST/QUALITY)
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/005/008/009
