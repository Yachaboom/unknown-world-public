# U-060[Mvp] 테스트 코드 정합성 수정

## 개요

- **목표**: debt-log에 기록된 테스트 실패 이슈들을 일괄 수정
- **의존성**: U-055[Mvp]
- **우선순위**: MVP 품질 게이트

## 대상 이슈

### 1. test_turn_streaming_success - badges 이벤트 수 불일치

- **위치**: `backend/tests/integration/test_turn_streaming.py:50`
- **현상**: `assert len(badges_events) >= 2` 실패
- **조치**: 테스트 기대치를 현재 구현에 맞게 조정

### 2. test_genai_client Mock 검증 불일치 (2개)

- **위치**: `backend/tests/unit/services/test_genai_client.py:122`, `:203`
- **현상**: `config` 파라미터가 dict 대신 `GenerateContentConfig` 객체
- **조치**: Mock 검증을 `ANY` 매처 또는 타입 검증으로 수정

### 3. App.test.tsx 핫스팟 검색 실패

- **위치**: `frontend/src/App.test.tsx:72`
- **현상**: 초기 화면이 `profile_select`이므로 게임 핫스팟 미존재
- **조치**: 테스트에서 프로필 선택 완료 후 검증하도록 수정

### 4. DndInteraction.test.tsx onDragEnd undefined (2개)

- **위치**: `frontend/src/components/DndInteraction.test.tsx:97`, `:148`
- **현상**: DndContext mock에서 `onDragEnd` 접근 불가
- **조치**: Mock 설정 재검토 및 playing 상태 조건 확인

## 완료 기준 (DoD)

- [ ] 위 4개 테스트 케이스가 모두 통과
- [ ] 기존 통과하던 테스트에 회귀 없음
- [ ] debt-log.md에서 해당 이슈들 ✅ 표시

## 영향 범위

- `backend/tests/integration/test_turn_streaming.py`
- `backend/tests/unit/services/test_genai_client.py`
- `frontend/src/App.test.tsx`
- `frontend/src/components/DndInteraction.test.tsx`
