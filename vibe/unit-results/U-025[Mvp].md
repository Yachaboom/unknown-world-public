# [U-025[Mvp]] 엔딩 리포트 + 리플레이/시나리오 하네스 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-025[Mvp]
- **단계 번호**: 2.5 (MVP 최종 단계 중 하나)
- **작성 일시**: 2026-02-10 07:15
- **담당**: AI Agent

---

## 1. 작업 요약

세션 종료 시 플레이어의 여정을 요약하는 **엔딩 리포트 아티팩트** 생성 시스템과, 시나리오 기반으로 시스템의 안정성(Hard Gates)을 검증하는 **리플레이 하네스**를 구현하였습니다. 이를 통해 게임의 "아티팩트화" 요구사항과 "리플레이 가능성"을 동시에 충족하였습니다.

---

## 2. 작업 범위

- **엔딩 리포트 (Backend)**: 세션 로그(내러티브, 퀘스트, 거래 장부, 룰 변형)를 분석하여 요약 및 결산 데이터를 생성하는 오케스트레이터 구현.
- **엔딩 리포트 (Frontend)**: `artifactsStore`를 통한 리포트 상태 관리 및 CRT 테마 기반의 `EndingReportModal` UI 구현.
- **리플레이 하네스 (Backend)**: `Scenario` 모델 정의 및 `ReplayRunner`를 통한 4대 Hard Gate 자동 검증 엔진 구축.
- **런북 작성**: 엔딩 리포트 생성 및 리플레이 실행을 위한 수동 검증 시나리오 작성.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/artifacts/ending_report.py` | 신규 | 엔딩 리포트 생성 및 데이터 분석 로직 |
| `frontend/src/components/EndingReportModal.tsx` | 신규 | 엔딩 리포트 표시 CRT UI 컴포넌트 |
| `frontend/src/stores/artifactsStore.ts` | 신규 | 아티팩트(리포트) 전용 Zustand 스토어 |
| `backend/src/unknown_world/harness/scenario.py` | 신규 | 시나리오 및 검증 게이트 스키마 정의 |
| `backend/src/unknown_world/harness/replay_runner.py` | 신규 | 시나리오 리플레이 실행 및 게이트 수집 엔진 |
| `vibe/unit-runbooks/U-025-ending-report-runbook.md` | 신규 | 작업 검증 및 실행 가이드 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**엔딩 리포트 파이프라인**:
- **Data Aggregation**: 프론트엔드에서 수집된 세션 전체 데이터(`SessionSummaryRequest`)를 백엔드로 전송하여 중앙 집중식으로 분석합니다.
- **Economy Settlement**: 거래 장부(ledger)를 전수 조사하여 초기/최종 잔액 정합성을 확인하고 `balance_consistent` 플래그를 생성합니다 (RULE-005 준수).
- **Quest Achievement**: 완료된 퀘스트와 진행 중인 퀘스트를 구분하여 달성률을 계산합니다.

**리플레이 하네스 아키텍처**:
- **Direct Pipeline Access**: HTTP 오버헤드 없이 서버 내부에서 `run_pipeline`을 직접 호출하여 고속 리플레이가 가능합니다.
- **Hard Gate Verification**: 각 스텝마다 `Schema`, `Economy`, `Safety`, `Consistency` 4개 게이트를 자동 검증하여 시스템 인바리언트를 체크합니다.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 시나리오는 JSON 포맷으로 저장/로드되며, 리포트는 휘발성 아티팩트로 관리됩니다.
- **UI/UX**: 세션 종료 시(데모 종료 등) 모달이 팝업되어 플레이어의 성과를 CRT 테마로 시각화합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-025-ending-report-runbook.md`
- **실행 결과**: 수동 테스트 시나리오를 통해 리포트 생성, 모달 렌더링, 리플레이 게이트 통과 여부를 확인 완료하였습니다.

---

## 6. 리스크 및 주의사항

- **언어 일관성**: 리포트 생성 시 세션 언어(`language`)를 명시적으로 전달하여 혼합 출력을 방지합니다 (RULE-006).
- **데이터 한도**: 내러티브 히스토리가 과도하게 길어질 경우 리포트 요청 크기가 커질 수 있으므로, MVP 수준에서는 요약본 위주로 처리합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **CP-MVP-03**: 10분 데모 루프에서 엔딩 리포트 최종 시각적 검증 및 시나리오 리플레이 통과 확인.
2. **U-119[Mmp]**: 프론트엔드 레이아웃 다듬기 시 엔딩 리포트 모달의 접근성 보강.

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 경제 결산 로직의 정합성 확인 (RULE-005)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
