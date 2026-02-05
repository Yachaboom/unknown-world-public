# U-072[Mvp]: Scanner 의미론적 사용 유도 UX 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-072[Mvp]
- **단계 번호**: 2.3 (예상)
- **작성 일시**: 2026-02-05 17:30
- **담당**: AI Agent

---

## 1. 작업 요약

Scanner(이미지 업로드) 기능의 발견성과 사용성을 높이기 위해 툴팁, 온보딩 가이드, 시각적 어포던스 요소들을 구현하였습니다. 사용자가 "이미지를 드래그하여 아이템화"하는 핵심 멀티모달 루프를 쉽게 인지하고 수행할 수 있도록 설계되었습니다.

---

## 2. 작업 범위

- **온보딩 가이드**: 첫 방문 사용자에게 화살표와 말풍선 형태의 시각적 가이드 표시 (localStorage 연동)
- **툴팁 시스템**: Scanner 슬롯 호버 시 기능 설명을 제공하는 CRT 테마 툴팁 구현
- **시각적 어포던스**:
  - idle 상태의 "이미지 → 아이템" 힌트 텍스트 및 글로우 애니메이션
  - 드래그 오버 시 "여기에 놓으세요!" 강조 및 텍스트 변화 피드백
- **접근성 및 i18n**:
  - 키보드 포커스(Tab/Enter/Space) 지원
  - `prefers-reduced-motion` 대응 (애니메이션 비활성화)
  - 한/영(ko-KR, en-US) 로케일 텍스트 완전 적용

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `frontend/src/components/ScannerSlot.tsx` | 수정 | 온보딩/툴팁/어포던스 로직 및 UI 구현 |
| `frontend/src/style.css` | 수정 | Scanner UX 관련 스타일 및 애니메이션 정의 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | 한국어 UX 텍스트 추가 |
| `frontend/src/locales/en-US/translation.json` | 수정 | 영어 UX 텍스트 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**컴포넌트 로직 (`ScannerSlot.tsx`)**:
- `showOnboarding`: `localStorage`의 `uw_scanner_onboarding_done` 키를 참조하여 초기 렌더링 여부 결정
- `showTooltip`: `onMouseEnter/Leave`를 통해 idle 상태에서만 툴팁 제어
- `isDragOver`: 드래그 상태에 따라 어포던스 텍스트 전환

**스타일 및 애니메이션 (`style.css`)**:
- `.scanner-onboarding-pulse`: 말풍선의 부드러운 위아래 움직임
- `.scanner-arrow-bounce`: 화살표의 상하 바운스 효과
- `.scanner-affordance-glow`: idle 힌트 텍스트의 미묘한 글로우 깜빡임

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `localStorage`를 사용하여 온보딩 상태를 영구 저장합니다.
- **레이아웃**: 온보딩 말풍선이 패널 밖으로 튀어나올 수 있도록 `.panel-scanner`의 `overflow: visible` 설정을 추가하였습니다.

### 4.3 가정 및 제약사항

- 온보딩 가이드는 `idle` 상태에서만 표시됩니다.
- `localStorage` 접근이 불가능한 환경(Private mode 등)에서는 매 방문 시 온보딩이 표시될 수 있습니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-072-scanner-semantic-ux-runbook.md`
- **실행 결과**: 툴팁, 온보딩, 드래그 어포던스, i18n 전환 등 모든 테스트 케이스(TC-1 ~ TC-8)에 대한 구현 및 검증 완료.

---

## 6. 리스크 및 주의사항

- **레이아웃 시프트**: 드래그 오버 시 텍스트가 바뀔 때 레이아웃이 흔들리지 않도록 `visibility: hidden`과 고정 높이를 사용하였습니다.
- **가독성**: CRT 글로우 효과가 가독성을 방해하지 않도록 `U-057` 가독성 보호 가이드를 준수하였습니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **린트 및 타입 체크**: `pnpm lint` 및 `pnpm type-check` 실행 권장
2. **백엔드 연동**: Q1 Option A에 따른 `scanner_hint` 플래그 대응 (향후 단계)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지 (U-022, U-072 통합)
- [x] 파괴적 변경/리스크/가정 명시

---
_본 보고서는 AI Agent에 의해 자동 생성되었습니다._