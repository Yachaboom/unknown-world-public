# U-054[Mvp]: 이미지 생성 폴백 및 실패 복구 체계 강화

## 메타데이터

| 항목      | 내용                  |
| --------- | --------------------- |
| Unit ID   | U-054[Mvp]            |
| Phase     | MVP                   |
| 예상 소요 | 45분                  |
| 의존성    | U-053[Mvp],U-018[Mvp] |
| 우선순위  | High                  |

## 작업 목표

이미지 생성 중 오류가 발생하거나 안전 정책에 의해 차단될 경우, **RULE-004에 따라 즉시 생성을 중단하고 "텍스트 전용 모드"로 안전하게 전환**하여 플레이 흐름을 유지하는 예외 처리 로직을 강화한다.

**배경**: PRD와 RULE-004는 "검증 실패는 자동 복구(Repair loop)로 처리 + 안전한 폴백 제공"을 요구한다. 이미지 생성은 외부 API 호출이므로 다양한 실패 시나리오(네트워크 오류, 안전 차단, 타임아웃 등)가 있다. 이 모든 경우에도 턴 자체는 성공해야 한다.

**완료 기준**:

- 이미지 생성 실패 시 TurnOutput은 유효하게 유지되고, `render.image_url`은 None/placeholder로 설정된다
- 안전 정책 차단 시 적절한 메시지가 TurnOutput.safety에 기록된다
- 재시도 횟수는 제한되며(예: 1회), 재시도 후에도 실패하면 텍스트-only로 진행한다
- Stage 이벤트/배지에 "이미지 생성 건너뜀" 또는 "폴백" 상태가 반영된다

## 영향받는 파일

**생성**:

- 없음

**수정**:

- `backend/src/unknown_world/orchestrator/stages/render.py` - try-except 및 폴백 로직 강화
- `backend/src/unknown_world/orchestrator/stages/render_helpers.py` - 폴백 응답 생성 헬퍼 추가

**참조**:

- `backend/src/unknown_world/orchestrator/fallback.py` - 기존 안전 폴백 생성 로직
- `backend/src/unknown_world/services/image_generation.py` - `create_fallback_response`, `ImageGenerationStatus`

## 구현 흐름

### 1단계: 예외 처리 구조 정의

- `render_stage`의 이미지 생성 호출을 try-except로 감싸기
- 예외 타입별 처리:
  - `TimeoutError`: 타임아웃 메시지, 텍스트-only 진행
  - `ValueError`/`ValidationError`: 잘못된 요청, 스킵
  - 기타 Exception: 일반 오류, 폴백

### 2단계: 안전 정책 차단 처리

- `ImageGenerationResponse.status == FAILED`이고 message에 "safety" 또는 "blocked" 포함 시
- `TurnOutput.safety.blocked = True`, `safety.message`에 사유 기록
- 이미지 생성은 스킵하고 텍스트-only 진행

### 3단계: 재시도 로직 (선택적)

- MVP에서는 재시도 1회로 제한
- 재시도 후에도 실패하면 최종 폴백
- `ctx.repair_attempts` 또는 별도 카운터로 추적

### 4단계: 배지/이벤트 반영

- 이미지 생성 성공: 기존 로직 유지
- 이미지 생성 실패/스킵: 배지에 "image_skipped" 또는 유사 상태 추가 고려
- Stage complete 이벤트는 정상 발행 (stage 자체는 성공)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-053[Mvp]](U-053[Mvp].md) - 이미지 생성 호출 및 결과 동기화
- **계획서**: [U-018[Mvp]](U-018[Mvp].md) - 비즈니스 룰 검증 + Repair loop + 안전 폴백 패턴

**다음 작업에 전달할 것**:

- U-055: Mock/Real 모드에서 폴백 시나리오 통합 검증
- 프론트엔드: image_url이 None일 때 placeholder 표시 (U-020에서 이미 구현됨)

## 주의사항

**기술적 고려사항**:

- (RULE-004) 어떤 실패 상황에서도 TurnOutput은 유효해야 한다
- (RULE-007) 오류 메시지에 프롬프트 원문 포함 금지
- (RULE-008) 폴백 시에도 stage 이벤트는 일관되게 발행

**잠재적 리스크**:

- 안전 차단 메시지가 너무 기술적이면 사용자 혼란 → 사용자 친화 메시지로 래핑

## 페어링 질문 (결정 필요)

- [x] **Q1**: 이미지 생성 실패 시 재시도 횟수는?
  - Option A: 0회 (즉시 폴백, 권장: 지연 최소화)
  - Option B: 1회 재시도 후 폴백
  **A1**: Option A

## 참고 자료

- `backend/src/unknown_world/orchestrator/fallback.py` - create_safe_fallback
- `vibe/unit-results/U-018[Mvp].md` - Repair loop 구현 결과
- `.cursor/rules/00-core-critical.mdc` - RULE-004
