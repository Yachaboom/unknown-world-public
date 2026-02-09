# U-130[Mvp]: 429 Rate Limit 에러 시 프론트엔드 재시도 안내 UI 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-130[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-09 17:50
- **담당**: AI Agent

---

## 1. 작업 요약

백엔드 모델(Pro/Flash) 호출 중 429 Rate Limit 발생 시, 프론트엔드에서 상황을 인지하고 대응할 수 있도록 60초 카운트다운 타이머와 재시도 버튼이 포함된 안내 패널 UI를 구현하였습니다.

---

## 2. 작업 범위

- **백엔드 에러 전파**: `repair_loop.py`에서 Pro 및 Flash 모델 모두 API 에러 시 `is_rate_limited` 상태를 감지하고, `RATE_LIMITED` 에러 코드를 스트림으로 전송.
- **스트리밍 최적화**: Rate limit 발생 시 `final` 이벤트를 보내지 않고 `error` 이벤트만 전송하여 프론트엔드에서 재시도 UI를 띄울 수 있도록 구성.
- **프론트엔드 상태 관리**: `agentStore`에 `isRateLimited` 상태를 추가하고, `handleError`에서 에러 코드를 감지하여 상태 전환.
- **재시도 안내 UI**: 60초 카운트다운 타이머, 안내 메시지, 재시도 버튼을 포함한 `RateLimitPanel` 컴포넌트 구현 및 `App.tsx` 연동.
- **입력 잠금 연계**: Rate limit 상태에서도 일반 입력은 잠그되, 재시도 버튼은 활성화하여 사용자 조작을 유도.
- **i18n 및 스타일**: 한국어/영어 번역 키 추가 및 CRT 테마 경고 스타일 적용.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/orchestrator/repair_loop.py` | 수정 | API 에러 추적 및 rate limit 상태 판정 로직 추가 |
| `backend/src/unknown_world/api/turn.py` | 수정 | `is_rate_limited` 상태 시 `RATE_LIMITED` 에러 이벤트 송출 로직 추가 |
| `backend/src/unknown_world/api/turn_streaming_helpers.py` | 수정 | `emit_rate_limited_error` 헬퍼 함수 추가 |
| `frontend/src/stores/agentStore.ts` | 수정 | `isRateLimited` 상태 필드 및 핸들러 추가 |
| `frontend/src/components/RateLimitPanel.tsx` | 신규 | 재시도 안내 패널 컴포넌트 구현 |
| `frontend/src/components/AgentConsole.tsx` | 수정 | `ErrorDisplay`에서 `RATE_LIMITED` 전용 스타일 적용 |
| `frontend/src/App.tsx` | 수정 | `RateLimitPanel` 렌더링 및 `handleRetry` 로직 추가 |
| `frontend/src/style.css` | 수정 | 안내 패널 및 타이머 애니메이션 스타일 추가 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | 에러 안내 번역 키 추가 |
| `frontend/src/locales/en-US/translation.json` | 수정 | 에러 안내 번역 키 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 인터페이스**:

- `RepairLoopResult.is_rate_limited`: 최종 실패가 429 에러로 인한 것인지 여부.
- `emit_rate_limited_error(language)`: `final` 이벤트 없이 에러만 보내는 특수 스트리밍 헬퍼.
- `RateLimitPanelProps.onRetry`: 재시도 실행 콜백.

**설계 패턴/원칙**:

- **RULE-004 (검증/복구)**: 일시적 할당량 초과 시 폴백 대신 재시도를 유도하여 사용자 경험 개선.
- **RULE-008 (관측 가능성)**: "왜 안 되는지"와 "언제 다시 할 수 있는지"를 명확히 제시.
- **입력 잠금 연계**: `isInputLocked` 조건에 `isRateLimited`를 포함하여 재시도 중 중복 요청 방지.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 변경 없음.
- **권한/보안**: 모델 호출 실패 정보 노출 최소화 (사용자 친화적 메시지 위주).
- **빌드/의존성**: 변경 없음.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-130[Mvp]-runbook.md` (작업 계획서 기반 시나리오 준수)
- **실행 결과**:
    - 429 에러 강제 발생 시 안내 패널 정상 노출 확인.
    - 60초 카운트다운 후 재시도 버튼 활성화 확인.
    - 재시도 클릭 시 마지막 입력으로 정상 턴 재실행 확인.

---

## 6. 리스크 및 주의사항

- **타이머 불일치**: 60초는 가이드일 뿐이며 실제 서버 상태와 완벽히 동기화되지는 않음 (재시도 클릭 가능 시점으로 완화).
- **연속 실패**: 재시도 후에도 계속 실패할 경우 "잠시 후 다시 시도" 메시지로 강도를 높이는 로직은 향후 고도화 필요.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1.  **실제 할당량 환경 테스트**: 스테이징 환경에서 실제 429 상황 시나리오 테스트.
2.  **U-127 연계**: 모델 폴백 순서(Pro → Flash)와 rate limit 감지 로직의 정교한 연계 검증.

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
