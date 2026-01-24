# RU-005 리팩토링 제안 요약 보고서 (Orchestrator Pipeline Stages 정리)

## 분석 계획

- 아키텍처/SSOT 확인: `vibe/prd.md`(RULE-003/004/005/008), `vibe/tech-stack.md`, `vibe/architecture.md`(스트리밍 종료 인바리언트/단계 정책)
- 의존 유닛(U-018) 맥락 확인: `vibe/unit-results/U-018[Mvp].md`, U-018 커밋(`229e3ee...`)의 변경 범위/의도
- Repomix 스냅샷 확인: `code-base.xml`(대용량이므로 orchestrator/streaming 관련 경로 중심으로만 교차 확인)
- 실제 코드 교차 검증(백엔드 중심):
  - `/api/turn` 스트리밍: `backend/src/unknown_world/api/turn.py`, `backend/src/unknown_world/api/turn_stream_events.py`
  - 오케스트레이터 핵심: `backend/src/unknown_world/orchestrator/repair_loop.py`, `fallback.py`, `generate_turn_output.py`, `mock.py`
  - 계약/룰: `backend/src/unknown_world/models/turn.py`(AgentPhase/ValidationBadge), `backend/src/unknown_world/validation/business_rules.py`
- “단계(Stages) 기반 구조” 관점에서 개선 기회 도출:
  - Q: 중복/복잡도/모듈 경계(SSOT)
  - S: 배지/이벤트 인바리언트, 예외/폴백/모드 간 일관성
  - S3: Behavior Preservation을 위한 수동 검증 시나리오

---

## Executive Summary

U-018로 **비즈니스 룰 검증 + Repair loop + 안전 폴백**이 도입되면서, “실모드(Real)” 경로의 안정성(RULE-004/005)이 크게 개선되었습니다.  
하지만 RU-005 관점에서는 현재 파이프라인이 `api/turn.py`에 **(1) stage 스트리밍(관측), (2) mock/real 분기, (3) repair/fallback 제어**까지 함께 섞여 있어 “단계 기반 시스템”이 코드 구조로는 드러나지 않습니다.

결과적으로 다음 문제가 누적됩니다:

- **Mock/Real 경로 간 동작/관측(배지, repair 이벤트) 불일치 위험**
- 단계(Plan/Resolve/Render/Verify/Commit)가 **실제 처리와 분리된 “시뮬레이션”**으로 남아 확장 시 드리프트 발생
- 배지(특히 `consistency_fail`)가 실제 위반을 충분히 표현하지 못해 **UI 증거(Agent Console)의 신뢰도 저하**

RU-005의 핵심은 새 기능 추가가 아니라 **동작 보존(Behavior Preservation)**을 전제로,
오케스트레이터를 **stage 단위 모듈 + pipeline 실행기**로 정리해 유지보수성과 관측 가능성을 높이는 것입니다.

---

## 페어링 질문(결정) 확인

- [x] **Q1: pipeline 실행 형태는 무엇이 좋을까?**
  - 결정: **Option A: `pipeline(ctx): ctx` 함수 체인**
  - 확인: 본 제안서 세트(RU-005-Q4/Q3)는 이 결정을 전제로, “클래스 도입 없이” stage 함수 조합 + 실행기를 권장합니다.

---

## 핵심 발견사항 (강점 / 개선 필요 / 기술 부채)

### 강점

- **단계/배지 계약이 이미 존재**: `models/turn.py`의 `AgentPhase/ValidationBadge`, `api/turn_stream_events.py`의 `StageEvent/BadgesEvent`로 기본 계약이 깔려 있음(RULE-008)
- **Repair loop 및 안전 폴백의 기반 확보**: `orchestrator/repair_loop.py`, `orchestrator/fallback.py`로 “최종적으로는 반드시 폴백으로 수렴”하는 가드가 존재(RULE-004)

### 개선 필요

- **책임 경계 붕괴**: `api/turn.py`가 API/스트리밍/오케스트레이션을 모두 담당하여 변경 반경이 과도함
- **중복/드리프트 위험**: mock 경로가 별도의 “미니 repair loop”를 가지며, stage/배지 송출이 real 경로와 다르게 유지될 수 있음
- **배지 의미론 불완전**: `language_mismatch`, `box2d_*` 등 “Consistency 계열” 실패가 `consistency_fail`로 잘 표기되지 않을 가능성이 큼

---

## 제안 통계

- **총 제안 수**: 6
- **심각도 분포**
  - High: 3 (RU-005-Q4, RU-005-Q3, RU-005-S1)
  - Medium: 3 (RU-005-Q1, RU-005-S2, RU-005-S3)
  - Critical/Low: 0

---

## 우선순위 목록 (ID / 심각도 / 기대효과 요약)

1. **RU-005-Q4 (High)**: stage 모듈 + pipeline 실행기 SSOT화 → “단계 기반 시스템”이 코드 구조로 고정
2. **RU-005-Q3 (High)**: `api/turn.py` 복잡도/중복 축소 → mock/real 드리프트 위험 감소 + 유지보수성 상승
3. **RU-005-S1 (High)**: 배지/단계 이벤트 인바리언트 정리(`consistency_fail` 포함) → Agent Console “증거” 신뢰도 확보
4. **RU-005-Q1 (Medium)**: fallback/phase/repair 중복 제거 → 장기 드리프트 방지
5. **RU-005-S2 (Medium)**: 예외/폴백/취소(서버 Cancel) 경로의 stage/final 보장 강화 → 스트리밍 안정성 상승
6. **RU-005-S3 (Medium)**: RU-005 수동 검증 시나리오 패키지 → Behavior Preservation 확인 루프 확보

---

## 비유닛 작업 커밋 메시지 추천 (docs)

> 아래는 “리팩토링 제안서 생성/문서 추가” 성격의 커밋 메시지 예시입니다. (진행률 수치는 임의 작성하지 않음)

```text
docs(vibe): RU-005[Mvp] orchestrator pipeline stages 리팩토링 제안서 추가

- /api/turn 스트리밍(stage/badges/repair/final)과 오케스트레이터(stage 실행) 경계 정리 제안 포함
- mock/real 경로의 중복 제거 및 배지/단계 이벤트 인바리언트 정합성 개선 제안 포함

**Progress:**
- (수치 작성 보류)
```

---

## 진행 순서 (Execution Order / File-based)

아래 순서는 “실제 구현 시” 추천 순서입니다.

1. `vibe/refactors/RU-005-Q4.md`  
   - **선행 의존성**: 없음  
   - **이유**: stage 경계/컨텍스트/실행기를 먼저 고정해야 나머지 정리가 흔들리지 않음
2. `vibe/refactors/RU-005-Q3.md`  
   - **선행 의존성**: Q4 권장  
   - **이유**: API 파일의 복잡도를 낮춰 변경 반경을 축소하고 mock/real 드리프트 위험을 줄임
3. `vibe/refactors/RU-005-S1.md`  
   - **선행 의존성**: Q4/Q3 적용 후가 구현 난이도 감소  
   - **이유**: 배지/단계 이벤트가 “증거”로 신뢰 가능해야 데모(Agent Console) 설득력이 생김
4. `vibe/refactors/RU-005-Q1.md`  
   - **선행 의존성**: Q4와 병행 가능  
   - **이유**: fallback/phase/repair 중복을 제거해 이후 수정 시 드리프트를 차단
5. `vibe/refactors/RU-005-S2.md`  
   - **선행 의존성**: Q4 권장  
   - **이유**: 예외/폴백/Cancel 시에도 stage/final 인바리언트를 일관되게 보장
6. `vibe/refactors/RU-005-S3.md`  
   - **선행 의존성**: 위 변경 적용 후 수행  
   - **이유**: Behavior Preservation을 수동 시나리오로 확인

---

## 생성된 파일 목록

### 코드 품질 개선(Q)

- `vibe/refactors/RU-005-Q4.md`
- `vibe/refactors/RU-005-Q3.md`
- `vibe/refactors/RU-005-Q1.md`

### 안정성 확보(S)

- `vibe/refactors/RU-005-S1.md`
- `vibe/refactors/RU-005-S2.md`
- `vibe/refactors/RU-005-S3.md`

### 기술 부채 해결(T)

- (없음)

---

## 카테고리별 분포

- 코드 중복(Q1): 1
- 네이밍(Q2): 0
- 복잡도(Q3): 1
- 모듈 설계(Q4): 1
- 하드코딩(Q5): 0
- 잠재적 오류(S1): 1
- 엣지 케이스(S2): 1
- 수동 검증 시나리오(S3): 1
- 회기 기록 부채(T1): 0

