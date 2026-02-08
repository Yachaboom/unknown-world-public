# U-127[Mvp] 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-127[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-08 23:25
- **담당**: AI Agent

---

## 1. 작업 요약

멀티턴 대화의 맥락 유지를 위한 `ConversationHistory` 시스템을 구현하고, 기본 텍스트 모델을 `gemini-3-pro-preview`로 전환하여 내러티브 품질을 향상시켰습니다. 또한 Pro 모델 실패 시 Flash 모델로 자동 전환되는 폴백 메커니즘을 적용했습니다.

---

## 2. 작업 범위

- **멀티턴 히스토리 관리**: `ConversationHistory` 클래스를 통해 최근 N턴(기본 5턴)의 대화 내용을 관리하고, 토큰 제한에 따른 슬라이딩 윈도우를 구현했습니다.
- **모델 전환**: 기본 텍스트 생성 모델을 `gemini-3-flash-preview`에서 `gemini-3-pro-preview` (QUALITY 티어)로 변경했습니다.
- **시스템 프롬프트 분리**: `GenerateTurnOutput` 스테이지에서 시스템 프롬프트를 `system_instruction` 파라미터로 분리하여 전송하도록 개선했습니다.
- **Thought Signature 순환**: Gemini 3 모델의 추론 맥락(`thought_signature`)을 턴 간에 전달하여 논리적 일관성을 유지하도록 했습니다.
- **자동 폴백(Fallback)**: Pro 모델 호출 실패 시 Flash 모델로 재시도하는 로직을 `RepairLoop`에 통합했습니다.

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/orchestrator/conversation_history.py` | **신규** | 대화 히스토리 저장, 슬라이딩 윈도우, 토큰 관리, Thought Signature 캐싱 담당 |
| `backend/src/unknown_world/orchestrator/generate_turn_output.py` | **수정** | 히스토리(`contents`) 주입 및 `system_instruction` 분리 적용 |
| `backend/src/unknown_world/services/genai_client.py` | **수정** | Gemini API 호출 시 `contents` 및 `thought_signature` 파라미터 지원 추가 |
| `backend/src/unknown_world/config/models.py` | **수정** | 기본 모델을 Pro로 변경, 폴백 모델 설정 추가 |
| `backend/src/unknown_world/orchestrator/pipeline.py` | **수정** | 턴 완료 후 `ConversationHistory` 업데이트 로직 추가 |
| `backend/src/unknown_world/orchestrator/repair_loop.py` | **수정** | API 오류 시 모델 폴백(QUALITY → FAST) 로직 강화 |
| `backend/tests/integration/test_multiturn_history.py` | **신규** | 멀티턴 맥락 유지 및 모델 폴백 통합 테스트 |
| `backend/tests/unit/orchestrator/test_conversation_history.py` | **신규** | 히스토리 관리 로직 단위 테스트 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**ConversationHistory 클래스**:
- `add_turn(user_input, model_response, thought_signature)`: 턴 데이터 추가 및 오래된 턴 트리밍.
- `get_history(token_limit)`: 현재 컨텍스트에 맞는 히스토리를 Gemini `Content` 객체 리스트로 반환.
- **Thought Signature**: 모델의 추론 과정을 담은 서명을 base64로 저장하여 다음 턴 `add_turn` 시 함께 저장하고, 다음 요청 시 전달.

**모델 티어링 및 폴백**:
- 기본: `MODEL_QUALITY_ID` (`gemini-3-pro-preview`)
- 폴백: `MODEL_FALLBACK_ID` (`gemini-3-flash-preview`)
- `RepairLoop`에서 예외 발생 시 `use_fallback_model=True` 플래그를 설정하여 재시도.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 메모리 내에서 히스토리를 관리하므로 별도 DB 변경 없음 (MVP 기준). 세션 재시작 시 초기화됨.
- **API 비용**: Pro 모델 사용으로 턴당 비용 증가 예상 (Flash 대비).
- **성능**: 히스토리 토큰 증가로 인한 입력 토큰 비용 증가 및 처리 시간 소폭 증가 가능성.

### 4.3 가정 및 제약사항

- **세션**: 단일 사용자(`"default"`) 세션만 지원하며, 서버 재시작 시 히스토리는 소멸됩니다 (In-Memory).
- **토큰 계산**: 정확한 토크나이저 대신 문자 수 기반 근사치(Char count / 3)를 사용합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-127-multiturn-history-runbook.md`
- **실행 결과**:
  - 시나리오 1 (맥락 유지): 3턴 연속 실행 시 이전 턴의 장소/사물 참조 확인 완료.
  - 시나리오 2 (Pro 모델): `model_label="QUALITY"` 확인 완료.
  - 시나리오 3 (폴백): 강제 모델 ID 변경 테스트를 통해 Flash 폴백 확인 완료.
  - 시나리오 4 (Thought Signature): 로그 상 서명 전달 확인 완료.

---

## 6. 리스크 및 주의사항

- **비용 관리**: Pro 모델 사용량이 많아지면 비용이 급증할 수 있으므로, 향후 사용자별 쿼터나 비용 모니터링이 중요합니다.
- **Thinking Latency**: Pro 모델의 Thinking 기능 활성화 시(`high`) TTFB가 길어질 수 있습니다. (`low` 옵션 고려)

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-078 (게임 목표 시스템 강화)**: 맥락이 유지되므로 장기적인 목표 달성 흐름 구현 가능.
2. **비용 최적화**: 히스토리 압축(Summarization) 도입 검토 (추후 고도화).

### 7.2 의존 단계 확인

- **선행 단계**: U-069[Mvp] (텍스트 모델 티어링) - 완료
- **후속 단계**: U-130[Mvp] (엔딩 조건 및 게임 오버 처리)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
