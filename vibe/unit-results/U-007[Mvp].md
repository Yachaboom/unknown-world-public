# [U-007[Mvp]: 모의 Orchestrator + /api/turn HTTP Streaming(POST)] 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-007[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-04 15:30
- **담당**: AI Agent

---

## 1. 작업 요약

실모델(Gemini) 없이도 프론트엔드 개발 및 데모가 가능하도록, 결정적 시드 기반의 **모의 Orchestrator**와 NDJSON 스트리밍을 지원하는 **`/api/turn` 엔드포인트**를 구현했습니다. 이를 통해 사용자 입력부터 최종 UI 업데이트까지의 전체 루프를 시뮬레이션할 수 있습니다.

---

## 2. 작업 범위

- **모의 Orchestrator 구현**: `seed` 기반으로 재현 가능한 `TurnOutput` 생성 로직 구현 (다국어, 좌표 규약, 경제 인바리언트 준수)
- **HTTP Streaming 엔드포인트 구현**: `/api/turn` (POST)에서 NDJSON 방식으로 단계별 이벤트 스트리밍 구현
- **이벤트 계약 확정**: `stage`, `badges`, `narrative_delta`, `final`, `error` 타입의 이벤트 구조 정의
- **안전 장치 구현**: Pydantic 검증 실패 시 Safe Fallback 반환 및 내부 오류 은닉 (RULE-004, RULE-007)

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `backend/src/unknown_world/api/turn.py` | 신규 | `/api/turn` 스트리밍 라우트 및 NDJSON 로직 |
| `backend/src/unknown_world/orchestrator/mock.py` | 신규 | 모의 데이터 생성기 및 스트림 이벤트 모델 |
| `backend/src/unknown_world/main.py` | 수정 | `turn_router` 등록 및 CORS 설정 확인 |
| `backend/src/unknown_world/api/__init__.py` | 수정 | 라우터 익스포트 설정 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 엔드포인트**:
- `POST /api/turn`: `TurnInput`을 받아 NDJSON 스트림 반환.
  - `TTFB`: 요청 수신 즉시 첫 `stage` 이벤트 전송으로 응답성 확보.
  - `NDJSON`: 라인 단위 JSON 직렬화로 스트리밍 처리.

**모의 오케스트레이션 단계**:
1. `Parse` → `Validate` → `Plan` → `Resolve` → `Render` → `Verify` → `Commit` 순서로 진행.
2. `Validate`, `Verify` 단계에서 `ValidationBadge` 이벤트 송출.
3. `narrative_delta`를 통한 타자 효과(Typewriter Effect) 시뮬레이션.

**좌표 규약 (RULE-009)**:
- 모든 `SceneObject`의 `box_2d`는 `[ymin, xmin, ymax, xmax]` 포맷의 0~1000 정규화 좌표 사용.

### 4.2 외부 영향 분석

- **API**: 신규 스트리밍 API 추가로 프론트엔드의 `fetch` 스트림 처리 로직 필요.
- **경제 시스템**: 모의 데이터 생성 시 입력된 `economy_snapshot`을 바탕으로 비용 차감 후 `balance_after` 계산 (음수 방지 로직 포함).

### 4.3 가정 및 제약사항

- 현재는 모의 데이터이므로 실제 Gemini 모델의 추론 결과와는 차이가 있을 수 있음.
- `seed` 파라미터를 통해 동일한 입력에 대해 항상 동일한 결과를 얻을 수 있도록 설계됨.

---

## 5. 런북(Runbook) 정보

- **테스트 방법**: `curl` 또는 `Postman`을 사용하여 `/api/turn`에 POST 요청을 보내고 스트리밍 응답 확인.
- **예시 명령어**:
  ```bash
  curl -X POST http://localhost:8011/api/turn \
    -H "Content-Type: application/json" \
    -d '{"language":"ko-KR","text":"안녕","client":{"viewport_w":1920,"viewport_h":1080},"economy_snapshot":{"signal":100,"memory_shard":5}}'
  ```

---

## 6. 리스크 및 주의사항

- **스트림 파싱**: 클라이언트에서 NDJSON 파싱 중 partial JSON chunk 처리에 주의해야 함.
- **보안**: 에러 발생 시 내부 스택트레이스나 프롬프트 정보가 유출되지 않도록 `ErrorEvent`로 캡슐화함.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **프론트엔드 연동 (U-008)**: 백엔드 스트림을 소비하여 UI(Agent Console, 내러티브 피드)를 업데이트하는 로직 구현.
2. **실모델 통합 (RU-003)**: 모의 오케스트레이터를 실제 Gemini API 호출 로직으로 교체.

### 7.2 의존 단계 확인

- **선행 단계**: U-005(스키마), U-003(FastAPI 기반) 완료
- **후속 단계**: U-008, RU-003

---

## 8. 자체 점검 결과

- [x] NDJSON 스트리밍 및 단계별 이벤트 송출 확인
- [x] Pydantic 기반 입력 검증 및 출력 모델링 적용
- [x] 좌표 규약(0~1000, ymin/xmin/ymax/xmax) 준수
- [x] 경제 인바리언트 및 다국어(KO/EN) 처리 반영

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._