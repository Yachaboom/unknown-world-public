# U-060[Mvp]: 테스트 코드 정합성 수정

## 메타데이터

| 항목      | 내용                  |
| --------- | --------------------- |
| Unit ID   | U-060[Mvp]            |
| Phase     | MVP                   |
| 예상 소요 | 45분                  |
| 의존성    | U-055[Mvp]            |
| 우선순위  | High (품질 게이트)    |

## 작업 목표

`debt-log.md`에 기록된 **테스트 실패 이슈 4건을 일괄 수정**하여, CI/CD 파이프라인과 로컬 테스트 실행이 모두 통과하도록 한다.

**배경**: U-055(이미지 파이프라인 통합 검증) 이후 일부 테스트 코드가 구현 변경을 반영하지 못해 실패 상태다. MVP 품질 게이트를 통과하려면 모든 테스트가 성공해야 한다. 테스트 실패 원인은 대부분 "기대값 불일치" 또는 "Mock 설정 오류"로, 구현 자체는 정상이다.

**완료 기준**:

- 4개 테스트 케이스(5개 실패 지점)가 모두 통과
- 기존 통과하던 테스트에 회귀 없음
- `debt-log.md`에서 해당 이슈들 ✅ 표시

## 영향받는 파일

**수정**:

- `backend/tests/integration/test_turn_streaming.py` - badges 이벤트 수 기대치 조정
- `backend/tests/unit/services/test_genai_client.py` - Mock 검증 로직 수정 (2곳)
- `frontend/src/App.test.tsx` - 프로필 선택 완료 후 핫스팟 검증
- `frontend/src/components/DndInteraction.test.tsx` - Mock 설정 및 상태 조건 수정 (2곳)

**참조**:

- `vibe/debt-log.md` - 테스트 실패 이슈 목록
- `backend/src/unknown_world/orchestrator/` - 실제 구현 (기대값 확인용)
- `frontend/src/App.tsx` - 프론트엔드 상태 흐름 확인

## 구현 흐름

### 1단계: test_turn_streaming_success - badges 이벤트 수 불일치

**위치**: `backend/tests/integration/test_turn_streaming.py:50`
**현상**: `assert len(badges_events) >= 2` 실패
**원인 분석**:
- 현재 구현에서 badges 이벤트 발생 횟수 확인
- 스트리밍 이벤트 순서 및 조건 검토

**수정 방안**:
- 실제 구현에서 발생하는 badges 이벤트 수에 맞게 기대치 조정
- 또는 테스트 조건을 `>= 1`로 완화 (최소 1회 이상 발생 보장)

### 2단계: test_genai_client Mock 검증 불일치 (2개)

**위치**: `backend/tests/unit/services/test_genai_client.py:122`, `:203`
**현상**: `config` 파라미터가 dict 대신 `GenerateContentConfig` 객체로 전달됨
**원인 분석**:
- 구현이 `GenerateContentConfig` 객체를 사용하도록 변경됨
- Mock의 `assert_called_with`가 dict를 기대

**수정 방안**:
```python
from unittest.mock import ANY

# 또는 타입만 검증
mock.assert_called_once()
call_args = mock.call_args
assert isinstance(call_args.kwargs['config'], GenerateContentConfig)
```

### 3단계: App.test.tsx 핫스팟 검색 실패

**위치**: `frontend/src/App.test.tsx:72`
**현상**: 초기 화면이 `profile_select`이므로 게임 핫스팟 미존재
**원인 분석**:
- 테스트가 게임 화면을 가정하지만, 실제 초기 상태는 프로필 선택
- 핫스팟은 `playing` 상태에서만 렌더링

**수정 방안**:
```tsx
// 1. 프로필 선택 완료 시뮬레이션
fireEvent.click(screen.getByTestId('profile-select-button'));
// 2. playing 상태로 전환 대기
await waitFor(() => {
  expect(screen.getByTestId('scene-canvas')).toBeInTheDocument();
});
// 3. 핫스팟 검증
```

### 4단계: DndInteraction.test.tsx onDragEnd undefined (2개)

**위치**: `frontend/src/components/DndInteraction.test.tsx:97`, `:148`
**현상**: DndContext mock에서 `onDragEnd` 접근 불가
**원인 분석**:
- DndContext의 onDragEnd가 조건부로만 등록됨
- playing 상태가 아니면 DnD 비활성화

**수정 방안**:
- 테스트에서 playing 상태를 명시적으로 설정
- 또는 DndContext mock 설정 재검토하여 onDragEnd 캡처

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-055[Mvp]](U-055[Mvp].md) - 이미지 파이프라인 통합으로 인한 구현 변경사항
- **참조**: `vibe/debt-log.md` - 테스트 실패 상세 기록

**다음 작업에 전달할 것**:

- CP-MVP-03: 데모 전 품질 게이트 통과 확인
- 모든 후속 유닛: 테스트 통과 상태에서 시작

## 주의사항

**기술적 고려사항**:

- 테스트 "수정"은 구현이 아닌 테스트 코드만 변경 (구현 버그 발견 시 별도 이슈화)
- Mock 매처 사용 시 `unittest.mock.ANY` 또는 커스텀 매처로 유연성 확보
- 프론트엔드 테스트에서 비동기 상태 변경은 `waitFor` 사용 필수

**잠재적 리스크**:

- 테스트 기대치를 너무 느슨하게 조정하면 실제 버그를 놓칠 수 있음 → 최소한의 조정으로 의미 있는 검증 유지
- 프론트엔드 테스트의 상태 의존성이 복잡할 경우 → 테스트 헬퍼 함수로 상태 설정 추상화

## 페어링 질문 (결정 필요)

- [x] **Q1**: badges 이벤트 수 기대치 조정 방식?
  - Option A: 현재 구현에 맞춰 정확한 수로 변경 (엄격)
  - Option B: `>= 1`로 완화 (유연)
  **A1**: Option B (badges 발생 여부가 중요, 정확한 수는 구현 세부사항)

- [x] **Q2**: Mock 검증 방식?
  - Option A: `ANY` 매처 사용 (단순)
  - Option B: 타입 + 핵심 속성만 검증 (권장: 의미 있는 검증)
  **A2**: Option B

## 참고 자료

- `vibe/debt-log.md` - 테스트 실패 이슈 상세
- `vibe/commands/test-exec.md` - 테스트 실행 가이드
- `backend/tests/conftest.py` - 백엔드 테스트 픽스처
- `frontend/src/test-utils/` - 프론트엔드 테스트 유틸
