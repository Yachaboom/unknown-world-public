# U-069[Mvp]: 텍스트 생성 FAST 모델 기본 + "정밀조사" 트리거 Pro 모델 전환 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-069[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-05 17:30
- **담당**: AI Agent

---

## 1. 작업 요약

일반 텍스트 생성 시에는 저지연/저비용 모델인 `gemini-3-flash-preview`(FAST)를 기본으로 사용하고, 사용자가 "정밀조사"와 같은 고품질 분석을 요구할 때만 `gemini-3-pro-preview`(QUALITY) 모델로 자동 전환하며 비용을 2배로 부과하는 모델 티어링 시스템을 성공적으로 구현하였습니다.

---

## 2. 작업 범위

- **모델 티어링 정책 수립**: FAST(Flash) 모델을 기본으로, 특정 조건 만족 시 QUALITY(Pro) 모델로 전환하는 로직 설계
- **트리거 감지 시스템 구현**: 액션 ID(예: `deep_investigate`) 및 입력 텍스트 내 특정 키워드(예: "정밀조사", "자세히")를 분석하여 모델 티어 결정
- **비용 차등 시스템 연동**: QUALITY 모델 사용 시 `cost_multiplier`(2.0x)를 적용하여 재화 소모 로직 업데이트
- **UI/UX 피드백 강화**: Agent Console에 현재 사용 모델 라벨(`FAST`/`QUALITY`) 표시 및 Action Deck에 고품질 액션 정보(배지, 2x 비용) 노출

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/config/models.py` | 수정 | `TextModelTiering` 클래스 추가 및 티어링 정책(키워드, 비용 배수) 정의 |
| `backend/src/unknown_world/orchestrator/generate_turn_output.py` | 수정 | 턴 생성 시 동적 모델 선택 및 비용 배수 적용 로직 통합 |
| `backend/src/unknown_world/models/turn.py` | 수정 | `AgentConsole` 모델에 `model_label` 필드 추가 |
| `frontend/src/schemas/turn.ts` | 수정 | 프론트엔드 Zod 스키마에 `model_label` 동기화 |
| `frontend/src/components/AgentConsole.tsx` | 수정 | 현재 사용 중인 모델 라벨 배지 UI 구현 |
| `frontend/src/components/ActionDeck.tsx` | 수정 | QUALITY 트리거 액션에 대한 시각적 힌트(x2 비용, 배지) 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**TextModelTiering 정책 (Backend)**:
- **Default**: `ModelLabel.FAST` (`gemini-3-flash-preview`)
- **Quality Trigger**:
    - **Action IDs**: `deep_investigate`, `analyze`, `examine_closely` 등 9종
    - **Keywords**: "정밀조사", "자세히", "깊이", "scrutinize" 등 언어별 주요 분석 키워드
- **Cost Multiplier**: `QUALITY` 모델 적용 시 `2.0` 배수 적용

**데이터 흐름**:
1. `TurnInput` 수신 -> `TextModelTiering`에서 모델 라벨 결정
2. 결정된 라벨에 따라 `Generator` 호출 및 `TurnOutput` 생성
3. `TurnOutput.agent_console.model_label`에 사용된 티어 정보 기록
4. 프론트엔드에서 라벨을 읽어 `Agent Console`에 배지 표시

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `TurnOutput` JSON 구조에 `model_label` 필드가 추가되었습니다.
- **권한/보안**: API 키 인증(U-080)을 기반으로 Pro 모델 접근 권한이 확보되었습니다.
- **빌드/의존성**: 변경 사항 없음.

### 4.3 가정 및 제약사항

- QUALITY 모델은 FAST 모델보다 응답 지연이 발생할 수 있으며, 이는 "정밀조사 중..."과 같은 내러티브 연출로 보완됩니다.
- 비용 배수는 현재 `2.0`으로 고정되어 있으며, 향후 정책에 따라 `config`에서 조정 가능합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-069-model-tiering-runbook.md`
- **실행 결과**: 시나리오 1~6(FAST 기본, 키워드 트리거, 액션 ID 트리거, 비용 차등, 잔액 부족 처리) 전수 검증 통과
- **참조**: 상세 테스트 결과는 위 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **트리거 오탐**: 일반 대화 중 키워드가 포함될 경우 의도치 않게 Pro 모델이 사용되어 비용이 더 발생할 수 있으나, 이는 게임적 허용 범위 내로 판단됩니다.
- **언어 혼합**: ko/en 키워드를 동시에 지원하도록 설계되었으나, 새로운 언어 추가 시 키워드 업데이트가 필요합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. `U-070`: 아이템-핫스팟 사용 시 액션 로그 출력 연동
2. `U-071`: QUALITY 모델 전환 시의 지연을 흡수할 수 있는 로딩 UI 강화

### 7.2 의존 단계 확인

- **선행 단계**: U-080[Mvp] (API 키 인증) 완료
- **후속 단계**: U-070 (액션 로그)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._