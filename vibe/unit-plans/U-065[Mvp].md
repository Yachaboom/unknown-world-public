# U-065[Mvp] TurnOutput 스키마 단순화 (Gemini API 제한 대응)

## 개요

- **목표**: Gemini API의 구조화된 출력 제한을 우회하기 위해 TurnOutput 스키마 단순화
- **의존성**: U-064[Mvp]
- **우선순위**: MVP Real 모드 핵심 기능

## 배경

Real 모드에서 턴 생성 시 Gemini API가 400 에러 반환:

```
400 INVALID_ARGUMENT: The specified schema produces a constraint that has too many states for serving.
Typical causes: schemas with lots of text, long array length limits, complex value matchers
```

TurnOutput JSON Schema가 Gemini의 구조화된 출력(Controlled Generation) 제한을 초과.

## 추정 원인

- 스키마의 속성 수가 너무 많음
- 중첩된 배열/객체 구조
- enum 값이 너무 길거나 많음

## 작업 내용

### A. 스키마 분석

- 현재 TurnOutput 스키마의 복잡도 측정
- Gemini API 제한 문서 확인
- 제거/단순화 가능한 필드 식별

### B. 스키마 단순화 옵션

#### Option 1: 필드 축소

- 선택적 필드를 필수에서 제외
- 중첩 깊이 감소

#### Option 2: 단계별 생성

- TurnOutput을 여러 단계로 나누어 생성
- 각 단계별로 간소화된 스키마 사용

#### Option 3: 부분 구조화

- 핵심 필드만 구조화 출력
- 나머지는 텍스트로 받아 후처리

### C. 구현 및 검증

- 선택한 옵션 구현
- Mock/Real 모드 모두 동작 확인
- Hard Gate 통과 여부 검증

## 완료 기준 (DoD)

- [ ] Real 모드에서 TurnOutput 생성 성공 (400 에러 해소)
- [ ] 스키마 변경 후에도 기존 기능 유지
- [ ] Pydantic + Zod 이중 검증 통과
- [ ] debt-log.md에서 해당 이슈 ✅ 표시

## 영향 범위

- `backend/src/unknown_world/models/turn.py`
- `backend/src/unknown_world/orchestrator/generate_turn_output.py`
- `frontend/src/schemas/` (Zod 스키마 동기화)

## 리스크

- 스키마 변경은 프론트엔드/백엔드 동시 수정 필요
- 기존 SaveGame 호환성 확인 필요 (마이그레이션)
