# U-093[Mvp]: ItemIconGenerator 아이콘 생성 타임아웃 수정

## 메타데이터

| 항목      | 내용                                            |
| --------- | ----------------------------------------------- |
| Unit ID   | U-093[Mvp]                                      |
| Phase     | MVP                                             |
| 예상 소요 | 30분                                            |
| 의존성    | U-075[Mvp]                                      |
| 우선순위  | ⚡ Critical (아이콘 생성 실패 빈번 → UX 저하)  |

## 작업 목표

`ItemIconGenerator`에서 아이콘 이미지 생성 요청 시 발생하는 **타임아웃 에러를 수정**하여 아이콘 생성 성공률을 높인다. 타임아웃 설정 조정, 재시도 로직 추가, 실패 시 안전한 폴백을 보장한다.

**배경**: U-075에서 아이콘 동적 생성 파이프라인을 구현했으나, 실제 운영에서 Gemini 이미지 생성 API 호출이 타임아웃(기본 30초)에 걸리는 경우가 빈번하다. 특히 FAST 모델(`gemini-2.5-flash-image`)도 네트워크/서버 상태에 따라 응답이 늦을 수 있다. 타임아웃을 완화하고 재시도 로직을 추가하여 성공률을 높인다.

**완료 기준**:

- 아이콘 생성 요청 타임아웃이 **60초**로 상향 (기존 30초에서)
- 타임아웃 발생 시 **최대 2회 자동 재시도** (총 3회 시도)
- 재시도 간 지수 백오프(2초, 4초) 적용
- 모든 재시도 실패 시 **placeholder 아이콘 유지** (에러 로그 기록)
- 아이콘 생성 중 다른 턴 처리가 블록되지 않음 (비동기 유지)

## 영향받는 파일

**수정**:

- `backend/src/unknown_world/services/item_icon_generator.py` - 타임아웃 설정 상향, 재시도 로직 추가
- `backend/src/unknown_world/services/image_generation.py` - (선택) 이미지 생성 공통 타임아웃 설정 조정
- `backend/src/unknown_world/config/settings.py` - (선택) `icon_generation_timeout`, `icon_max_retries` 설정 추가

**참조**:

- `vibe/unit-results/U-075[Mvp].md` - 아이콘 생성 구현 결과
- `vibe/tech-stack.md` - 이미지 모델(FAST: gemini-2.5-flash-image)

## 구현 흐름

### 1단계: 타임아웃 설정 상향

- `ItemIconGenerator`의 API 호출 타임아웃을 30초 → 60초로 상향
- 설정값을 `settings.py` 또는 상수로 관리

### 2단계: 재시도 로직 추가

- `generate_icon()` 메서드에 재시도 래퍼 추가:
  - 최대 재시도: 2회 (총 3회 시도)
  - 백오프: 2초, 4초 (지수 백오프)
  - 재시도 대상: 타임아웃, 네트워크 에러, 5xx 응답
  - 재시도 제외: 4xx(클라이언트 에러), quota 초과

### 3단계: 에러 핸들링 보강

- 모든 재시도 실패 시:
  - placeholder 아이콘 URL 반환 (기존 폴백 유지)
  - 에러 로그에 "아이콘 생성 실패 (3/3 시도)" + 아이템 설명 해시 기록
  - 캐시에 "실패" 마커 저장 → 다음 턴에서 재시도 가능하도록 (영구 실패 캐시 방지)

### 4단계: 검증

- 정상 생성: 아이콘이 성공적으로 생성되는지 확인
- 타임아웃 시뮬레이션: 네트워크 지연 시 재시도 동작 확인
- 완전 실패: placeholder 표시 및 에러 로그 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-075[Mvp]](../unit-results/U-075[Mvp].md) - ItemIconGenerator 구현

**다음 작업에 전달할 것**:

- U-092: 프리셋 아이콘과 함께 안정적인 아이콘 표시 파이프라인 완성

## 주의사항

**기술적 고려사항**:

- (비동기) 아이콘 생성은 턴 처리를 블록하지 않아야 함 → `asyncio.create_task()` 또는 백그라운드 큐
- 재시도 시 동일 프롬프트로 재요청 (랜덤 시드 차이로 결과가 달라질 수 있음)
- 캐시 키는 아이템 설명 해시 → 동일 아이템은 재생성 방지

**잠재적 리스크**:

- 재시도 3회 모두 실패하면 아이콘 없이 진행 → placeholder로 충분히 커버
- 재시도로 인한 추가 API 비용 → FAST 모델 사용으로 비용 최소화

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 재시도 횟수?
  - Option A: 최대 2회 재시도 (총 3회)
  - Option B: 최대 1회 재시도 (총 2회)
  - Option C: 재시도 없이 타임아웃만 상향

## 참고 자료

- `vibe/unit-results/U-075[Mvp].md` - 아이콘 생성 구현
- `vibe/tech-stack.md` - 이미지 모델 라인업
- [google-generativeai Python SDK Timeout](https://ai.google.dev/gemini-api/docs/get-started/python)
