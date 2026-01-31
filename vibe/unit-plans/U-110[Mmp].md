# U-110[Mmp]: 프론트엔드 디버깅 모드 토글 UI

## 메타데이터

| 항목      | 내용       |
| --------- | ---------- |
| Unit ID   | U-110[Mmp] |
| Phase     | MMP        |
| 예상 소요 | 60분       |
| 의존성    | U-106      |
| 우선순위  | Medium     |

## 작업 목표

프론트엔드에 "개발자/심사자 모드"를 토글할 수 있는 디버깅 UI를 추가하여, 실시간 스트림 이벤트 로그/상태 diff/스토리지 사용량 등을 확인할 수 있게 한다.

**배경**: PRD 10.2에서 Demo Mode의 관측 가능성(Observability)을 UX의 일부로 요구한다. U-106(관측 지표/대시보드)이 제공하는 메트릭을 넘어, 디버깅 및 심사 목적으로 더 상세한 정보를 토글할 수 있는 UI가 필요하다.

**완료 기준**:

- 디버깅 모드 토글 버튼/패널이 UI에 추가되고, 기본은 OFF 상태이다.
- 토글 ON 시 아래 정보가 추가로 노출된다:
  - 스트림 이벤트 raw 로그(타입/타이밍/메타)
  - WorldState 스냅샷 diff(이전 턴 대비 변경사항)
  - 스토리지 사용량(생성 이미지 수, 총 용량 등)
- 프롬프트 원문/CoT/비밀정보는 절대 노출되지 않는다(메타/요약만). (RULE-007/008)
- 토글 상태는 세션 내에서 유지되고, 새로고침 시 OFF로 리셋된다(또는 localStorage 옵션).

## 영향받는 파일

**생성**:

- `frontend/src/components/DebugPanel.tsx` - 디버깅 정보 표시 패널
- `frontend/src/stores/debugStore.ts` - 디버그 모드 상태/이벤트 로그 저장(Zustand)

**수정**:

- `frontend/src/App.tsx` 또는 `frontend/src/components/Layout.tsx` - 디버그 토글 버튼 배치
- `frontend/src/components/AgentConsole.tsx` - (선택) 디버그 모드와의 통합/분리 정리
- `frontend/src/api/turnStream.ts` - 이벤트 수신 시 debugStore에 로그 push
- `frontend/src/stores/worldStore.ts` - (선택) 상태 diff 계산 헬퍼

**참조**:

- `vibe/prd.md` 10.2 - Demo Mode/디버깅 모드 토글 UI 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-007/008(프롬프트/비밀정보 비노출)
- `vibe/unit-plans/U-106[Mmp].md` - 관측 지표/대시보드(기반)

## 구현 흐름

### 1단계: 디버그 상태 스토어 구현

- `debugStore`를 생성하여 `isDebugMode`, `eventLogs[]`, `stateDiffs[]` 등을 관리한다.
- 이벤트 로그는 최근 N개(예: 100개)만 유지하고, 오래된 것은 자동 정리한다.

### 2단계: 스트림 이벤트 로깅 연결

- `turnStream.ts`에서 이벤트 수신 시 `debugStore.addEvent(event)`를 호출한다.
- 이벤트에는 `type`, `timestamp`, `raw_data`(프롬프트/비밀 제외)를 포함한다.

### 3단계: 디버그 패널 UI 구현

- 토글 버튼(예: 우측 하단 floating 버튼, 또는 헤더 아이콘)을 추가한다.
- 토글 ON 시 `DebugPanel`이 오버레이 또는 사이드 패널로 표시된다.
- 패널 내부에는 탭 또는 접기/펼치기로 "이벤트 로그", "상태 Diff", "스토리지" 섹션을 구분한다.

### 4단계: 상태 Diff 계산

- 턴 완료 시 이전 WorldState와 현재 WorldState를 비교하여 diff를 생성한다.
- diff는 JSON 형태로 표시하거나, 간단한 변경 요약(추가/수정/삭제 필드)으로 시각화한다.

### 5단계: 스토리지 사용량 표시

- 백엔드에 `/api/storage/stats` 같은 엔드포인트를 추가하거나, 프론트에서 로컬 저장 정보를 집계한다.
- 생성 이미지 수, 총 용량, TTL/정리 예정 시간(있다면) 등을 표시한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-106[Mmp]](U-106[Mmp].md) - 관측 지표/대시보드(Agent Console 메트릭) 기반

**다음 작업에 전달할 것**:

- CP-MMP-02에서 "디버깅 모드로 시나리오 디버그" 케이스 검증 기반
- 운영/데모에서 실시간 튜닝/문제 진단 도구

## 주의사항

**기술적 고려사항**:

- (RULE-007/008) 프롬프트 원문/CoT/비밀정보는 절대 노출 금지. 이벤트 로그에 `prompt_text` 같은 필드가 있으면 제외하거나 `[REDACTED]`로 표시한다.
- 디버그 모드가 ON이어도 게임 진행/UX를 방해하지 않아야 한다(오버레이는 드래그 가능하거나 최소화 가능).
- 성능: 이벤트 로그가 너무 많으면 메모리/렌더링 부담 → 최대 보관 수 제한 + 가상화 스크롤 적용.

**잠재적 리스크**:

- "개발자 도구"처럼 보여서 일반 사용자에게 혼란을 줄 수 있음 → 기본 OFF + 심사자/개발자 접근용 설명 라벨 제공.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 디버그 모드 활성화 방식은?
  - Option A: UI 토글 버튼만(권장: 단순)
  - Option B: URL 쿼리 파라미터(`?debug=1`) + UI 토글(개발 편의)
- [ ] **Q2**: 이벤트 로그 보관 정책은?
  - Option A: 최근 100개(권장: 메모리 제한)
  - Option B: 세션 전체 보관(무제한, 성능 주의)
- [ ] **Q3**: 스토리지 사용량은 어디서 집계할까?
  - Option A: 프론트에서 로컬 정보만(간단, 제한적)
  - Option B: 백엔드 `/api/storage/stats` 엔드포인트 추가(정확, 구현 부담↑)

## 참고 자료

- `vibe/prd.md` - Demo Mode/디버깅 모드 토글 UI
- `.cursor/rules/00-core-critical.mdc` - RULE-007/008
- `vibe/unit-plans/U-106[Mmp].md` - 관측 지표/대시보드
