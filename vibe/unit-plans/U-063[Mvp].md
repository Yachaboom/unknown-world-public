# U-063[Mvp] 프론트엔드 턴 실행 후 재화 잔액 버그 수정

## 개요

- **목표**: 턴 실행 후 재화(Signal/Shard)가 0으로 초기화되는 버그 수정
- **의존성**: U-055[Mvp]
- **우선순위**: MVP Economy 정합성 (RULE-005)

## 배경

프론트엔드에서 턴 실행 후 Signal/Shard가 0으로 표시되고 "잔액이 부족합니다" 경고 발생.

## 재현 방법

1. 프로필 선택 후 게임 시작 (Signal: 150, Shard: 5)
2. 텍스트 입력 후 "실행" 클릭
3. 턴 완료 후 Signal: 0, Shard: 0으로 변경됨

## 추정 원인

- 백엔드 응답의 `economy.balance_after`가 프론트엔드 상태에 제대로 반영되지 않음
- 폴백 응답에서 `balance_after`가 기본값이 아닌 초기값으로 설정됨
- 프론트엔드에서 응답 파싱 시 재화 상태 업데이트 로직 오류

## 작업 내용

### A. 디버깅

- `/api/turn` 응답에서 `economy.balance_after` 값 확인
- 프론트엔드 상태 업데이트 로직 추적
- 폴백 응답의 economy 필드 확인

### B. 수정

- 원인에 따라 백엔드 또는 프론트엔드 로직 수정
- 정상 응답과 폴백 응답 모두에서 재화 정합성 확보

## 완료 기준 (DoD)

- [ ] 턴 실행 후 재화가 올바르게 차감되어 표시됨
- [ ] 폴백 응답에서도 재화가 유지됨
- [ ] 잔액 부족 경고가 실제 부족 시에만 표시됨
- [ ] debt-log.md에서 해당 이슈 ✅ 표시

## 영향 범위

- `frontend/src/App.tsx` 또는 관련 상태 관리
- `frontend/src/stores/` (worldStore 등)
- `backend/src/unknown_world/orchestrator/` (폴백 응답 생성부)
