# U-090[Mvp]: 핫스팟 생성을 정밀분석 전용으로 제한 (기본 턴 핫스팟 생성 금지)

## 메타데이터

| 항목      | 내용                                                  |
| --------- | ----------------------------------------------------- |
| Unit ID   | U-090[Mvp]                                            |
| Phase     | MVP                                                   |
| 예상 소요 | 45분                                                  |
| 의존성    | U-076[Mvp], U-010[Mvp]                                |
| 우선순위  | ⚡ Critical (핫스팟 정합성 핵심 정책)                 |

## 작업 목표

**핫스팟(SceneObject/ui.objects[])은 오직 "정밀분석" 액션을 통해서만 생성**되도록 제한하고, 일반 턴에서 GM이 핫스팟을 임의로 생성하는 것을 금지한다. 이로써 핫스팟이 항상 실제 이미지 분석 결과에 기반하여 정합성을 보장한다.

**배경**: 현재 GM은 일반 턴에서도 `ui.objects[]`에 핫스팟을 "상상"하여 생성할 수 있다. 그러나 이렇게 생성된 핫스팟의 좌표(bbox)는 실제 이미지와 맞지 않는 경우가 많아 UX를 해치고 있다. U-076(정밀분석)의 Agentic Vision을 통해서만 핫스팟을 생성하면, **이미지-핫스팟 정합성**이 보장된다.

**완료 기준**:

- 일반 턴(정밀분석이 아닌 턴)의 TurnOutput에서 `ui.objects[]`가 **비어있거나 기존 핫스팟만 유지**
- GM 프롬프트에 "핫스팟은 정밀분석을 통해서만 생성한다" 규칙이 명시됨
- 서버 검증(Pydantic): 정밀분석 턴이 아닌데 새 핫스팟이 생성되면 경고/제거
- 정밀분석 턴에서는 기존처럼 Agentic Vision 결과를 핫스팟으로 추가
- 기존 핫스팟(이전 정밀분석에서 생성된 것)은 **장면이 바뀌기 전까지 유지**

## 영향받는 파일

**수정**:

- `backend/prompts/turn/turn_output_instructions.ko.md` - "핫스팟은 정밀분석 전용" 규칙 추가, 일반 턴에서 objects[] 생성 금지 지시
- `backend/prompts/turn/turn_output_instructions.en.md` - 동일 (영문)
- `backend/src/unknown_world/orchestrator/stages/resolve.py` - 정밀분석이 아닌 턴에서 새 핫스팟 생성 시 필터링/경고 로직
- `backend/src/unknown_world/orchestrator/stages/verify.py` - (선택) 비즈니스 룰 검증에 "비정밀분석 턴 핫스팟 생성 금지" 추가
- `frontend/src/stores/worldStore.ts` - 핫스팟 상태 관리: 장면 전환 시 초기화, 정밀분석 결과만 추가

**참조**:

- `vibe/unit-plans/U-076[Mvp].md` - 정밀분석 기능 계획
- `vibe/unit-plans/U-010[Mvp].md` - Scene Canvas + Hotspot Overlay
- `vibe/prd.md` - 6.2(구조화 UI), 8.6(이미지 이해)

## 구현 흐름

### 1단계: GM 프롬프트 수정

- `turn_output_instructions.*.md`에 다음 규칙 추가:
  - "일반 턴에서는 `ui.objects` 배열에 **새로운 오브젝트를 추가하지 않는다**."
  - "핫스팟/클릭 가능 오브젝트는 **정밀분석 액션을 통해서만** 생성된다."
  - "이전 정밀분석에서 추가된 오브젝트는 장면이 완전히 바뀌지 않는 한 유지한다."

### 2단계: 서버 검증 로직 추가

- `resolve.py`에서 정밀분석 턴이 **아닌** 경우:
  - TurnOutput의 `ui.objects[]`에 새 항목이 있으면 제거(또는 이전 상태의 objects로 덮어쓰기)
  - 로그에 "비정밀분석 턴에서 핫스팟 생성 시도 차단됨" 경고 기록
- 정밀분석 턴인 경우: 기존 로직대로 Agentic Vision 결과를 objects[]에 추가

### 3단계: 프론트엔드 핫스팟 상태 정책

- `worldStore.ts`에서 핫스팟 상태 관리 정책 명확화:
  - 정밀분석 결과: 기존 핫스팟에 **병합(추가)**
  - 장면 전환(새 이미지 생성) 시: 핫스팟 **초기화** (새 장면에서는 정밀분석을 다시 해야 함)
  - 일반 턴: 핫스팟 **변경 없음** (기존 유지)

### 4단계: 검증

- 일반 턴에서 핫스팟이 생성되지 않는지 확인
- 정밀분석 후 핫스팟이 정상 추가되는지 확인
- 장면 전환 시 핫스팟이 초기화되는지 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-076[Mvp]](../unit-results/U-076[Mvp].md) - 정밀분석 → 핫스팟 추가 전체 파이프라인
- **결과물**: [U-010[Mvp]](../unit-results/U-010[Mvp].md) - Scene Canvas + Hotspot Overlay

**다음 작업에 전달할 것**:

- U-089: 정밀분석 전용 UX와 함께 일관된 핫스팟 정책 완성
- CP-MVP-03: "핫스팟은 정밀분석에서만" 데모 시나리오

## 주의사항

**기술적 고려사항**:

- (RULE-009) bbox 0~1000 정규화 규약은 변경 없음 - 정밀분석 결과만 적용
- GM이 프롬프트 지시를 무시할 수 있으므로 **서버 검증(필터링)이 필수** 안전장치
- 장면 전환 판정: "새 이미지가 생성된 턴"을 기준으로 핫스팟 초기화 (render.image_job.should_generate=true)
- 기존에 핫스팟이 있는 상태에서 추가 정밀분석 시 **병합** (중복 라벨 시 bbox만 업데이트)

**잠재적 리스크**:

- GM이 프롬프트 지시를 무시하고 핫스팟을 생성하는 빈도 → 서버 필터링으로 보완
- 장면이 "약간 변한" 경우 핫스팟 유지/초기화 판단이 모호 → 새 이미지 생성 여부(should_generate)로 단순화

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 장면 전환 시 핫스팟 초기화 정책?
  - Option A: 새 이미지가 생성된 턴(should_generate=true)에서 무조건 초기화
  - Option B: GM이 "장면 전환"을 명시할 때만 초기화
  - Option C: 모든 턴마다 초기화 (정밀분석 결과만 그 턴에서 유효)

- [ ] **Q2**: 비정밀분석 턴에서 GM이 핫스팟을 생성했을 때 처리?
  - Option A: 조용히 제거 (사용자에게 알리지 않음)
  - Option B: 로그에만 경고 기록 + 제거
  - Option C: 제거하지 않고 경고만 (점진적 적용)

## 참고 자료

- `vibe/unit-results/U-076[Mvp].md` - 정밀분석 구현 결과
- `vibe/unit-results/U-010[Mvp].md` - Scene Canvas + Hotspot Overlay
- `vibe/prd.md` - 6.2(구조화 UI), 6.7(Action Deck), 8.6(이미지 이해)
- `vibe/tech-stack.md` - 비전 모델(gemini-3-flash-preview)
