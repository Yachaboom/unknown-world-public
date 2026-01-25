# U-043[Mvp]: ko/en 혼합 출력 게이트(언어 검증+Repair)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-043[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-018,U-036 |
| 우선순위  | High        |

## 작업 목표

한 화면에서 한글/영어가 섞여 나오는 상황(예: `vibe/ref/en-ko-issue.png`)을 재발 방지하기 위해, 백엔드 Hard Gate에 **언어 일관성(콘텐츠) 검증**을 추가하고 위반 시 **Repair loop**로 자동 복구한다.

**배경**: 현재 Hard Gate는 `TurnOutput.language`의 enum/정합(BCP-47) 중심이며, 실제 사용자 노출 문자열(내러티브/퀘스트/룰/오브젝트 라벨 등)이 ko/en이 섞여도 “스키마만 맞으면” 통과할 수 있다. 이는 RULE-006/007(ko/en 혼합 금지)과 CP-MVP-05(언어 혼합 금지 검증)를 직접 위협한다.

**완료 기준**:

- `TurnInput.language`에 대해 `TurnOutput`의 **사용자 노출 텍스트 필드**가 동일 언어로 수렴한다(허용 예외/화이트리스트 포함).
- 혼합(또는 반대 언어 과다) 감지 시 `consistency_fail`로 판정되고, repair loop가 “언어만” 교정한 TurnOutput을 재생성한다(최대 N회).
- repair가 실패하더라도 **안전 폴백**이 선택 언어(ko-KR/en-US)로만 노출된다(프롬프트 원문/내부 추론/민감정보 노출 없음).
- 유닛 테스트 1개 이상에서 “혼합 출력 → repair → 단일 언어 수렴” 흐름이 검증된다.

## 영향받는 파일

**생성**:

- (권장) `backend/src/unknown_world/validation/language_gate.py` - 언어 감지(휴리스틱) + 검사 대상 텍스트 추출 유틸

**수정**:

- `backend/src/unknown_world/validation/business_rules.py` - 언어(콘텐츠) 규칙 추가 및 위반 시 Consistency fail 매핑
- `backend/src/unknown_world/orchestrator/repair_loop.py` - “언어 혼합” 전용 repair 피드백(언어별) 추가
- `backend/src/unknown_world/orchestrator/stages/validate.py` - 새 규칙이 validate stage에서 일관되게 처리/배지화되도록 연결 확인
- (테스트) `backend/tests/unit/test_orchestrator_repair.py` - 혼합 출력 케이스 추가(또는 전용 테스트 파일 생성)

**참조**:

- `vibe/ref/en-ko-issue.png` - 혼합 출력 사례(Quest/Rule/로그/시스템 메시지)
- `vibe/prd.md` - 3.1~3.3(언어 정책), 10.5(Hard gate), 9.0/10.2(언어 토글/운영)
- `.cursor/rules/00-core-critical.mdc` - RULE-006/007(ko/en 혼합 금지), RULE-004(복구/폴백)
- `vibe/refactors/RU-005-S2.md` - i18n 메시지 맵/언어 분기 설계 근거(기존 패턴 재사용)

## 구현 흐름

### 1단계: “혼합” 판정 기준(휴리스틱) 확정

- 검사 대상 언어는 `TurnInput.language`를 SSOT로 삼는다.
- 문자열에서 한글/라틴 비율을 측정하는 경량 휴리스틱을 정의한다(예: `hangul_ratio`, `latin_ratio`).
- 허용 예외를 정의한다:
  - 숫자/기호/공백/이모지
  - 도메인 고유명(예: `Signal`, `Shard`, `FAST`, `QUALITY`, `REF`)은 whitelist로 허용(단, 화면 전체를 영어로 만드는 구실이 되지 않도록 최소화)
- 결과는 “언어가 섞였다”가 아니라, **어떤 필드에서 어떤 토큰이 문제인지**를 반환하도록 한다(Repair 프롬프트의 근거로 사용).

### 2단계: TurnOutput에서 “사용자 노출 텍스트”를 수집해 전수 검사

- 검사 범위를 명시적으로 확정한다(권장 우선순위):
  - `narrative`
  - `ui.action_deck.cards[].label`
  - `ui.objects[].label`
  - `world.quests_updated[].title`/`description`
  - `world.rules_changed[].title`/`description`
  - `world.memory_pins[].title`/`reason`
- 검사 결과가 실패이면 business rule violation으로 누적하고 `consistency_fail`로 귀결되게 한다.

### 3단계: Repair loop에 “언어 교정” 전용 피드백 추가

- 스키마는 유지하고 “텍스트 값만” 목표 언어로 재작성하도록 지시한다.
- ko-KR/en-US 각각에 대해 시스템 피드백 템플릿을 분리한다(혼합 출력 방지).
- 로그/스트림에는 “문제 요약(필드 경로/토큰 샘플)”만 남기고, 전체 텍스트 덤프는 금지한다(프롬프트/개인정보 노출 방지).

### 4단계: 테스트로 재발 방지

- 혼합 TurnOutput(의도적으로 일부 필드에 반대 언어 토큰 포함)을 주입해:
  - validate 단계에서 `consistency_fail`로 판정되는지
  - repair 시도 후 최종 출력이 선택 언어로 수렴하는지
  - 실패 시에도 최종 폴백이 선택 언어로만 노출되는지
  를 검증한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-018[Mvp]](U-018[Mvp].md) - 비즈니스 룰 검증 + Repair loop + 안전 폴백(인바리언트/패턴)
- **계획서**: [U-036[Mvp]](U-036[Mvp].md) - 프롬프트 ko/en 분리(언어 고정의 기반)
- **결과물**: `backend/src/unknown_world/validation/business_rules.py`의 기존 Consistency 규칙(언어 enum/좌표 등)

**다음 작업에 전달할 것**:

- CP-MVP-05/CP-MVP-03에서 “언어 혼합 없음”을 안정적으로 통과할 수 있는 Hard Gate 기준선
- 프론트(U-044)에서 TurnInput.language SSOT를 고정했을 때, 서버가 동일 언어로 강제 수렴하는 보증(서버 측 게이트)

## 주의사항

**기술적 고려사항**:

- 휴리스틱은 완벽한 언어 감지가 아니라 “혼합/드리프트를 잡는 가드레일”이다. false positive를 최소화하기 위해 whitelist/임계값을 보수적으로 시작하고, CP에서 튜닝한다.
- 모델 출력 텍스트를 로그로 대량 남기지 않는다(프롬프트/내부 추론/민감정보 노출 금지).
- repair loop는 비용/지연을 유발할 수 있으므로, “혼합” 판정은 최대한 신뢰도 있게(과민하지 않게) 설계한다.

**잠재적 리스크**:

- 정상적인 고유명/약어까지 혼합으로 오탐 → whitelist/임계값 조정 + “문제 토큰 샘플” 기반 디버그
- 혼합이 반복되는 경우 repair 루프 비용 증가 → 최대 재시도 제한 + 실패 시 안전 폴백으로 즉시 수렴

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 혼합 판정 임계값을 어떻게 시작할까?
  - Option A: 보수적(오탐 최소) — CP에서 튜닝(권장)
  - Option B: 공격적(혼합 강제 차단) — repair 증가/비용↑
- [ ] **Q2**: 허용 whitelist는 어디까지 인정할까?
  - Option A: 고유명(재화/모델 라벨) 최소치만 허용(권장)
  - Option B: 게임 세계의 고유명/지명까지 허용(오탐↓, 하지만 혼합이 남을 수 있음)

## 참고 자료

- `vibe/ref/en-ko-issue.png` - 혼합 출력 사례
- `vibe/prd.md` - 언어 정책/Hard Gate/데모 표면
- `backend/src/unknown_world/validation/business_rules.py` - Hard Gate 비즈니스 룰 SSOT
- `vibe/refactors/RU-005-S2.md` - 언어별 메시지 맵/분기 패턴

