# U-078[Mvp]: 게임 목표 시스템 강화 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-078[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-08 17:30
- **담당**: AI Agent

---

## 1. 작업 요약

기존 Quest 패널을 **주 목표(Main Objective) + 서브 목표(Sub-objectives)** 구조로 강화하고, 화면 상단에 항상 현재 목표를 확인할 수 있는 **ObjectiveTracker(미니 트래커)**를 구현하였습니다. 이를 통해 플레이어에게 명확한 목표 의식과 진행 피드백을 제공하며, 목표 달성 시 보상 시스템을 가시화하였습니다.

---

## 2. 작업 범위

- **데이터 스키마 확장**: `Quest` 모델에 주 목표 여부(`is_main`), 진행률(`progress`), 보상(`reward_signal`), 상세 설명(`description`) 필드 활용 강화.
- **QuestPanel 전면 개편**: 주 목표 카드 강조, 진행률 바, 보상 미리보기, 완료된 목표 리스트 분리 표시.
- **ObjectiveTracker 신규 개발**: 화면 상단 고정 HUD 요소로 주 목표와 서브 목표 카운트를 상시 노출.
- **Zustand 스토어 로직 보강**: 주 목표/서브 목표 분리 셀렉터 구현 및 목표 달성 시 시스템 내러티브(보상 획득) 자동 생성.
- **데모 데이터 업데이트**: 3종 데모 프로필(탐험가, 서사꾼, 기술 전문가)에 강화된 목표 데이터 적용.
- **i18n 적용**: 목표 관련 UI 문자열(주 목표, 서브 목표, 보상 등) 다국어 처리.

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/components/QuestPanel.tsx` | 수정 | 주 목표/서브 목표 분리 렌더링 및 UI 강화 |
| `frontend/src/components/ObjectiveTracker.tsx` | 신규 | 화면 상단 고정 미니 목표 트래커 |
| `frontend/src/stores/worldStore.ts` | 수정 | 목표 분리 셀렉터 및 완료 보상 피드백 로직 추가 |
| `frontend/src/schemas/turn.ts` | 수정 | Quest Zod 스키마 필드 설명 보강 |
| `backend/src/unknown_world/models/turn.py` | 수정 | Quest Pydantic 모델 필드 설명 보강 |
| `frontend/src/data/demoProfiles.ts` | 수정 | 데모 프로필별 강화된 목표 데이터(is_main, reward 등) 적용 |
| `frontend/src/style.css` | 수정 | 퀘스트 패널 및 트래커 CRT 스타일(L-bracket, Glow) 추가 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | 목표 관련 한국어 문자열 추가 |
| `frontend/src/locales/en-US/translation.json` | 수정 | 목표 관련 영어 문자열 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주 목표 (Main Objective)**:
- `is_main: true`인 퀘스트를 주 목표로 간주 (세션당 1개 권장).
- 전용 진행률 바(`objective-progress-bar`)를 통해 달성률 시각화.
- 달성 시 획득할 `Signal` 보상을 미리 표시하여 동기 부여.

**서브 목표 (Sub-objectives)**:
- 체크리스트 형태로 표시되며, 완료 시 취소선 및 보상 획득 완료 텍스트 표시.
- 진행 중인 목표와 완료된 목표를 섹션으로 분리하여 가독성 확보.

**ObjectiveTracker (HUD)**:
- 화면 중앙 상단(`game-center` 영역)에 배치.
- 주 목표 제목 + 서브 목표 완료 카운트(`1/3`) + 미니 진행률 바 제공.
- 목표가 없는 "자유 탐색" 상태에서는 자동으로 숨김 처리.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `SaveGame` 스키마 하위 호환성 유지 (기존 필드 옵셔널 처리).
- **UI/UX**: 채팅 앱 느낌을 완전히 배제한 게임 HUD 요소(트래커, 강화된 패널) 도입으로 몰입감 향수.
- **i18n**: 모든 UI 텍스트를 `i18next` 키 기반으로 관리하여 즉시 토글 지원.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-078-objective-system-runbook.md`
- **실행 결과**: 런북의 시나리오(주 목표 표시, 서브 목표 완료, 빈 상태, i18n 전환)를 기반으로 구현 검증 완료.

---

## 6. 리스크 및 주의사항

- **무한 리렌더 방지**: `subObjectives` 필터링 시 `useShallow` 셀렉터를 사용하여 참조 불일치로 인한 불필요한 리렌더 방지.
- **데모 데이터 의존성**: GM(백엔드)이 동적으로 목표를 생성할 때 `is_main` 플래그를 정확히 설정하도록 프롬프트 지침 준수 필요.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1.  **U-079[Mvp]**: 재화 부족 시 이미지 생성 허용 및 보상 획득 경로(목표 달성 연동) 고도화.
2.  **MMP U-113**: 세션 상태 영속성 강화 (새로고침 시 목표 진행률 보존).

### 7.2 의존 단계 확인

- **선행 단계**: U-013 (Quest 패널 기본), U-015 (데모 프로필)
- **후속 단계**: U-079 (재화 정책), MMP 마일스톤

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지 (Zustand 셀렉터 패턴 등)
- [x] 파괴적 변경/리스크/가정 명시 (기존 세이브 데이터 호환 등)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
