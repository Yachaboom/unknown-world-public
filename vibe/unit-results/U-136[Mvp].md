# [U-136[Mvp]: Economy 검증 보상 시나리오 수정 + ModelLabel enum 통합] 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-136[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-10 11:45
- **담당**: AI Agent

---

## 1. 작업 요약

경제 검증 로직이 보상(reward/gains) 시나리오를 올바르게 처리하도록 수정하고, 두 개의 `ModelLabel` enum 불일치로 인한 Pydantic 직렬화 경고를 해소했습니다. 이를 통해 퀘스트 완료 보상 등이 지급될 때 발생하던 잔액 불일치 에러 및 폴백 전환 문제를 해결했습니다.

---

## 2. 작업 범위

- **경제 시스템 보상 로직 도입**: `EconomyOutput`에 `gains` 필드를 추가하고, 검증 공식에 이를 반영하여 보상 시나리오 지원.
- **ModelLabel enum SSOT 통합**: `config/models.py`로 `ModelLabel` 정의를 통합하여 중복 정의 및 직렬화 경고 제거.
- **프롬프트 및 스키마 동기화**: LLM 지시문(en/ko)에 `gains` 사용 규칙을 추가하고, 프론트엔드 Zod 스키마와 UI 컴포넌트를 업데이트.
- **안정성 확보**: 단일 턴 보상 상한(Signal 30, Shard 10)을 설정하여 경제 인플레이션 방지 로직 추가.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/models/turn.py` | 수정 | `EconomyOutput` 모델에 `gains` 추가, `ModelLabel` 통합 import |
| `backend/src/unknown_world/config/models.py` | 수정 | `ModelLabel`에 `CHEAP`, `REF` 등 UI 라벨 통합 (SSOT) |
| `backend/src/unknown_world/config/economy.py` | 수정 | `MAX_SINGLE_TURN_REWARD` 상수 정의 |
| `backend/src/unknown_world/validation/business_rules.py` | 수정 | `gains` 반영된 경제 검증 공식 및 상한 검증 로직 구현 |
| `backend/prompts/turn/turn_output_instructions.en.md` | 수정 | LLM용 `economy.gains` 필드 가이드 추가 (영어) |
| `backend/prompts/turn/turn_output_instructions.ko.md` | 수정 | LLM용 `economy.gains` 필드 가이드 추가 (한국어) |
| `backend/tests/unit/test_u136_economy_gains_modellabel.py` | 신규 | 유닛 테스트 코드 구현 |
| `frontend/src/schemas/turn.ts` | 수정 | Zod 스키마에 `gains` 필드 및 `ModelLabel` 확장 반영 |
| `frontend/src/stores/worldStore.ts` | 수정 | 보상 획득 시 토스트 알림 로직 추가 |
| `frontend/src/components/AgentConsole.tsx` | 수정 | 통합된 `ModelLabel`에 따른 아이콘 및 색상 맵 업데이트 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**경제 검증 공식 (Business Rules)**:
- `expected_signal = max(0, snapshot.signal - cost.signal + gains.signal)`
- `expected_credit = max(0, cost.signal - snapshot.signal - gains.signal)`
- 보상(`gains`)이 비용(`cost`)을 먼저 상쇄하고, 남은 차액이 잔액에 반영되거나 빚(`credit`)을 줄이는 구조로 설계되었습니다.

**ModelLabel 통합 (SSOT)**:
- `config/models.py`의 `StrEnum` 기반 `ModelLabel`을 단일 출처로 확정.
- 프론트엔드 `ModelLabelSchema`와 1:1 대응되도록 `IMAGE`, `IMAGE_FAST`, `VISION` 값을 포함.

### 4.2 외부 영향 분석

- **데이터 모델**: `TurnOutput` JSON 구조에 `economy.gains` 필드가 추가되었습니다. (기본값 제공으로 하위 호환성 유지)
- **UI/UX**: 보상 획득 시 시스템 토스트 메시지가 출력되며, 에이전트 콘솔에 사용된 모델 정보가 더 정확하게 표시됩니다.

### 4.3 가정 및 제약사항

- 단일 턴 최대 보상은 Signal 30, Memory Shard 10으로 제한됩니다. 이를 초과할 경우 경제 검증 실패(`economy_cost_mismatch`)로 간주됩니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-136-economy-gains-modellabel-runbook.md`
- **실행 결과**: 보상만 있는 경우, 비용+보상 혼합, 상한 초과 등 5가지 핵심 시나리오에 대해 백엔드 검증 테스트 통과 확인.

---

## 6. 리스크 및 주의사항

- GM(LLM)이 `gains` 필드와 `balance_after`의 계산을 실수할 가능성이 있으나, 프롬프트 지시문 강화와 서버 사이드 Repair Loop를 통해 완화하도록 설계되었습니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. `U-137[Mvp]`: Signal 획득-소비 밸런스 조정 및 보상 시스템 고도화.
2. 전체 시스템 통합 테스트를 통한 경제 안정성 재검증.

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
