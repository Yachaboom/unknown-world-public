# U-069[Mvp]: 텍스트 생성 FAST 모델 기본 + "정밀조사" 트리거 Pro 모델 전환 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-069[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-05 15:40
- **담당**: AI Agent

---

## 1. 작업 요약

텍스트 생성 시 비용과 품질의 균형을 맞추기 위해 모델 티어링 시스템을 구현했습니다. 기본적으로 빠른 응답의 FAST 모델(`gemini-3-flash-preview`)을 사용하며, 특정 키워드나 정밀조사 액션이 감지될 경우 고품질의 QUALITY 모델(`gemini-3-pro-preview`)로 자동 전환하고 2배의 비용을 부과합니다.

---

## 2. 작업 범위

- **백엔드 모델 티어링 로직 구현**: 입력 텍스트 키워드 매칭 및 액션 ID 매칭을 통한 모델 선택 트리거 구현
- **비용 배수 시스템 구현**: QUALITY 모델 사용 시 기본 비용의 2배를 차감하고 원장에 기록하는 로직 추가
- **프론트엔드 모델 표시**: Agent Console에 현재 사용 중인 모델 라벨(FAST/QUALITY) 표시 기능 추가
- **Action Deck QUALITY 배지 및 비용 표시**: 정밀조사 액션 카드에 QUALITY 배지 및 x2 비용 가시화

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/config/models.py` | 수정 | 모델 ID 상수 정의 및 `TextModelTiering` 클래스 추가 |
| `backend/src/unknown_world/orchestrator/generate_turn_output.py` | 수정 | 모델 선택 로직(`_select_text_model`) 및 비용 배수 적용 로직 추가 |
| `backend/src/unknown_world/models/turn.py` | 수정 | `AgentConsole` 모델에 `model_label` 필드 추가 |
| `frontend/src/schemas/turn.ts` | 수정 | `AgentConsoleSchema`에 `model_label` 필드 추가 |
| `frontend/src/components/AgentConsole.tsx` | 수정 | 현재 사용 중인 모델 라벨(FAST/QUALITY) 배지 표시 |
| `frontend/src/components/ActionDeck.tsx` | 수정 | QUALITY 트리거 액션에 배지 및 x2 비용 표시 로직 추가 |
| `vibe/unit-runbooks/U-069-model-tiering-runbook.md` | 신규 | 모델 티어링 수동 검증 런북 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**텍스트 모델 티어링 트리거**:
- **키워드 트리거**: "정밀조사", "자세히", "thoroughly" 등 상세 조사를 암시하는 키워드 포함 시 작동
- **액션 ID 트리거**: `deep_investigate`, `scrutinize` 등 명시적인 조사 액션 선택 시 작동

**비용 정책 (Q2 결정)**:
- FAST 모델: 기본 비용 (1.0x)
- QUALITY 모델: 기본 비용의 2배 (2.0x)

**UI 표시 (RULE-008)**:
- Agent Console: `⚡ 빠름 (FAST)` 또는 `★ 고품질 (QUALITY)` 라벨 표시
- Action Deck: 대상 카드에 `★ QUALITY` 배지 및 `x2` 배수 표기

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `TurnOutput` JSON 스키마에 `agent_console.model_label` 필드 추가
- **빌드/의존성**: 변경 없음 (Gemini API 키 기반 인증 유지)

### 4.3 가정 및 제약사항

- QUALITY 모델의 품질 우위는 Gemini 모델 성능에 의존함
- 비용 배수는 현재 2.0배로 고정되어 있으며, 추후 정책에 따라 변경 가능

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-069-model-tiering-runbook.md`
- **실행 결과**: 런북의 6개 시나리오(FAST 동작, 키워드 트리거, 액션 ID 트리거, 비용 차등, 잔액 부족 비활성화, Mock 모드)에 대한 구현 및 검증 구조 완료

---

## 6. 리스크 및 주의사항

- **비용 폭발 방지**: 사용자가 무의식적으로 QUALITY 모델을 반복 사용하여 재화가 급격히 소모될 수 있으므로 UI에서 `x2` 배수를 명확히 표시함
- **언어 일관성**: 트리거 키워드는 한국어와 영어 모두 지원하도록 구성됨

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **실제 환경 테스트**: 다양한 문장 입력 시 의도대로 모델 전환이 일어나는지 정교화
2. **비용 밸런싱**: 실제 플레이 데이터를 바탕으로 2배 비용이 적절한지 검토

### 7.2 의존 단계 확인

- **선행 단계**: U-080[Mvp] (API 키 인증 전용)
- **후속 단계**: 로드맵 참조

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
