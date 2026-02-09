# [이전턴 텍스트 주목성 제거] 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-125[Mvp]
- **단계 번호**: MVP
- **작성 일시**: 2026-02-09 19:45
- **담당**: AI Agent

---

## 1. 작업 요약

NarrativeFeed에서 이전 턴의 내러티브와 액션 로그를 시각적으로 약화하여, 현재 진행 중인 턴(스트리밍/타이핑)에 대한 사용자 주목성을 극대화했습니다. 약화된 텍스트는 마우스 hover 시 원래의 밝기로 복원되어 가독성을 보장합니다.

---

## 2. 작업 범위

- **CSS 클래스 기반 시각적 계층 설계**: `.past-entry`와 `.narrative-active-text` 클래스 도입
- **이전 턴 3중 약화 적용**: 색상(dim), 폰트 크기(0.85em), 불투명도(0.75) 동시 적용
- **현재 턴 강조 및 구분**: 밝은 색상 유지 및 상단 구분선(`border-top`) 추가
- **사용자 편의 기능**: 이전 턴 엔트리 hover 시 시각적 복원 효과 추가
- **테마 대응**: 다크/라이트 테마 각각에 최적화된 dim/muted 색상 변수 정의
- **검증**: Vitest를 이용한 클래스 적용 로직 유닛 테스트 작성 및 통과

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/style.css` | 수정 | 이전/현재 턴 시각적 계층 스타일 및 라이트 테마 변수 추가 |
| `frontend/src/components/NarrativeFeed.tsx` | 수정 | 조건부 클래스(`past-entry`, `narrative-active-text`) 적용 로직 구현 |
| `frontend/src/components/NarrativeFeed.U-125.test.tsx` | 신규 | 시각적 계층 분리 로직 검증을 위한 유닛 테스트 |
| `vibe/unit-runbooks/U-125-past-turn-dim-runbook.md` | 신규 | 구현 기능 검증 및 테스트를 위한 런북 |
| `vibe/unit-plans/U-125[Mvp].md` | 수정 | 의사결정 사항(Q1, Q2) 반영 및 완료 표시 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 스타일 사양**:

- **`.past-entry`**: `font-size: 0.85em`, `opacity: 0.75`, `color: var(--text-dim)`
- **`.narrative-active-text`**: `font-size: 1em`, `opacity: 1`, `border-top: 1px solid var(--border-dim)`
- **Hover 효과**: `.past-entry:hover { opacity: 1; }` 및 내부 텍스트 색상 복원

**로직 제어 (`NarrativeFeed.tsx`)**:
- `showActiveTextArea` 상태와 `isLastEntry` 조건을 조합하여 엔트리별 클래스 할당
- `isCurrentIdleTurn = isLastEntry && !showActiveTextArea`를 통해 대기 중인 마지막 턴도 강조 유지

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 영향 없음
- **권한/보안**: 영향 없음
- **빌드/의존성**: Vitest 환경에서 테스트 코드 실행 필요

### 4.3 가정 및 제약사항

- 이전 턴의 약화 수치(0.85em, 0.75 opacity)는 CRT 테마의 가독성을 해치지 않는 선에서 결정됨
- 시스템 메시지(`.system-entry`)는 중요도를 고려하여 폰트 크기 축소를 최소화함

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-125-past-turn-dim-runbook.md`
- **실행 결과**: 런북에 명시된 시나리오 A~D(약화, 강조, hover, 시스템 메시지)에 대해 수동 및 자동 테스트 검증 완료

---

## 6. 리스크 및 주의사항

- **가독성**: 라이트 테마에서 `--text-dim` 색상이 배경색과 대비가 낮아질 경우 가독성이 저하될 수 있으므로, 스타일 가이드에 따른 색상 조정을 유지해야 함
- **테스트**: 비동기 타이핑 효과(`U-086`)와 결합되어 있으므로, 테스트 시 `vi.useFakeTimers()` 활용 필수

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. `npm run lint` 및 `npm run test` 실행을 통한 최종 코드 품질 확인
2. CP-MVP-03 데모를 통한 실제 체감 성능 및 시각적 피로도 점검

### 7.2 의존 단계 확인

- **선행 단계**: U-086[Mvp] (완료), U-049[Mvp] (완료)
- **후속 단계**: U-119[Mmp] (WIG 폴리시 최종 점검)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항(색상, 폰트, 구분선) 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 라이트 테마 및 다크 테마 가독성 확보 확인
- [x] 시스템 메시지 스타일 보존 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
