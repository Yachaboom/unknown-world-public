# RU-003 리팩토링 제안 요약 보고서 (UI 상태 슬라이스/경계 정리)

## Executive Summary

U-009~U-012로 Action Deck/Hotspot/DnD가 빠르게 붙으면서, 현재 프론트는 “게임 UI 고정(RULE-002)”의 데모 표면은 잘 갖추었지만 **세션 월드/UI 상태의 SSOT가 App.tsx에 집중**되어 있습니다.  
RU-003의 핵심은 기능 추가가 아니라 **TurnOutput 반영 경로 단일화 + 상태 경계(world/agent/ui) 재정의**로, 이후 Quest/Rule/SaveGame/데모프로필이 들어와도 “채팅 UI로 퇴행”하지 않게 구조를 잡는 것입니다.

---

## 페어링 질문(결정) 확인

- [x] **Q1: Zustand 구성 방식을 어떻게 고정할까?**
  - 결정: **Option A(도메인별 store 파일 분리)**  
  - 본 제안서도 `worldStore` 신설 + `agentStore/uiPrefsStore/actionDeckStore/inventoryStore`의 역할 경계를 분리하는 방향을 권장합니다.

---

## 핵심 발견사항 (강점 / 개선 필요 / 부채)

### 강점

- **게임 UI 고정 레이아웃**이 App.tsx에서 명확히 유지되고 있으며(RULE-002), Action Deck/Hotspot/DnD가 데모 표면에 잘 배치됨
- 스트리밍 이벤트 계약/검증이 `turnStream.ts`와 `agentStore`를 통해 이미 일정 수준 정리되어 있음(RULE-003/004/008)

### 개선 필요

- `App.tsx`가 레이아웃뿐 아니라 **world 상태 + TurnOutput 반영 + 스트리밍 오케스트레이션**까지 들고 있어 확장 시 변경 반경이 과도하게 커짐
- DEV 목 데이터(인벤토리/오브젝트 라벨)가 App에 인라인으로 남아 **i18n 혼합 출력(RULE-006) 위험**이 존재

### 기술 부채

- SceneCanvas의 `scene(imageUrl)` 전이 SSOT가 미정이며 TODO로 남아 있음(`App.tsx` 440)

---

## 제안 통계

- **총 제안 수**: 8
- **심각도 분포**
  - High: 4 (RU-003-Q4, RU-003-Q3, RU-003-Q5, RU-003-S1)
  - Medium: 4 (RU-003-Q1, RU-003-S2, RU-003-S3, RU-003-T1)
  - Critical/Low: 0

---

## 우선순위 목록 (ID / 심각도 / 기대효과 요약)

1. **RU-003-Q4 (High)**: worldStore 신설 + TurnOutput 반영 SSOT화로 App.tsx 결합 축소
2. **RU-003-Q3 (High)**: Turn Runner로 스트리밍/입력 조합 분리 → App 복잡도 감소
3. **RU-003-S1 (High)**: 연결 상태/Scene 상태 전이/Abort 전파 정책 정리(사용자 체감 버그 방지)
4. **RU-003-Q5 (High)**: DEV 하드코딩 격리 + i18n 혼합 출력 방지(데모 신뢰도)
5. **RU-003-Q1 (Medium)**: DnD 계약(타입/데이터) 상수화로 드리프트 방지
6. **RU-003-S2 (Medium)**: 겹침/리사이즈/disabled 일관성 등 엣지 케이스 정책 고정
7. **RU-003-T1 (Medium)**: Scene `scene(imageUrl)` 전이 SSOT 확정(TODO 정리)
8. **RU-003-S3 (Medium)**: 수동 검증 시나리오로 회귀 방지(실행 후 수행)

---

## 비유닛 작업 커밋 메시지 추천 (docs)

> 아래는 “리팩토링 제안서 생성/문서 추가” 성격의 커밋 메시지 예시입니다. (진행률 수치는 임의 작성하지 않음)

```text
docs(vibe): RU-003[Mvp] UI 상태 경계 리팩토링 제안서 추가

- App.tsx의 world/ui 상태 및 TurnOutput 반영 경계 정리 제안 포함
- DnD 계약 상수화, DEV 하드코딩 격리(i18n 혼합 방지), 수동 검증 시나리오 포함

**Progress:**
- (roadmap 연동 항목이 없어 수치 작성 보류)
```

---

## 진행 순서 (Execution Order / File-based)

아래 순서는 “실제 구현 시” 추천 순서입니다.

1. `vibe/refactors/RU-003-Q4.md`  
   - **선행 의존성**: 없음  
   - **이유**: 경계/SSOT를 먼저 고정해야 나머지 작업이 흔들리지 않음
2. `vibe/refactors/RU-003-Q3.md`  
   - **선행 의존성**: Q4 권장(함께 하면 효과 최대)  
   - **이유**: App 오케스트레이션을 분리해 이후 변경 반경 축소
3. `vibe/refactors/RU-003-S1.md`  
   - **선행 의존성**: Q4/Q3 중 하나라도 적용되면 구현 난이도 감소  
   - **이유**: 연결/씬 상태 버그성 전이를 조기에 제거해 데모 안정성 확보
4. `vibe/refactors/RU-003-Q5.md`  
   - **선행 의존성**: Q4와 병행 권장  
   - **이유**: i18n 혼합 위험 제거 및 데모 초기 상태 경계 확보
5. `vibe/refactors/RU-003-Q1.md`  
   - **선행 의존성**: 없음(단, Q4 이후가 충돌 적음)  
   - **이유**: DnD 계약 드리프트 위험을 저비용으로 제거
6. `vibe/refactors/RU-003-S2.md`  
   - **선행 의존성**: Q1 권장  
   - **이유**: 엣지 케이스 정책을 명시해 무반응/혼란 UX를 예방
7. `vibe/refactors/RU-003-T1.md`  
   - **선행 의존성**: Q4 권장(전이 위치 고정)  
   - **이유**: Scene 전이 SSOT를 합의하고 TODO를 부채로 남기지 않음
8. `vibe/refactors/RU-003-S3.md`  
   - **선행 의존성**: 위 변경 적용 후 수행  
   - **이유**: Behavior Preservation 확인(카드/클릭/드롭/스트리밍/에러)

---

## 생성된 파일 목록

### 코드 품질 개선(Q)

- `vibe/refactors/RU-003-Q4.md`
- `vibe/refactors/RU-003-Q3.md`
- `vibe/refactors/RU-003-Q1.md`
- `vibe/refactors/RU-003-Q5.md`

### 안정성 확보(S)

- `vibe/refactors/RU-003-S1.md`
- `vibe/refactors/RU-003-S2.md`
- `vibe/refactors/RU-003-S3.md`

### 기술 부채 해결(T)

- `vibe/refactors/RU-003-T1.md`

---

## 카테고리별 분포

- 코드 중복(Q1): 1
- 네이밍(Q2): 0
- 복잡도(Q3): 1
- 모듈 설계(Q4): 1
- 하드코딩(Q5): 1
- 잠재적 오류(S1): 1
- 엣지 케이스(S2): 1
- 수동 검증 시나리오(S3): 1
- 회기 기록 부채(T1): 1

