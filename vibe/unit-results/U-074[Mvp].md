# [U-074[Mvp]: 핫스팟/아이템 인터랙션 안내 UX] 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-074[Mvp]
- **단계 번호**: MVP
- **작성 일시**: 2026-02-05 14:15
- **담당**: AI Agent

---

## 1. 작업 요약

플레이어가 "채팅"이 아닌 "조작(클릭/드래그)"이 게임의 핵심임을 직관적으로 이해할 수 있도록 인터랙션 힌트 및 온보딩 가이드 시스템을 구현했습니다.

---

## 2. 작업 범위

- **온보딩 상태 관리**: Zustand 기반 `onboardingStore` 구현 (localStorage 영구 저장)
- **인터랙션 힌트**: `InteractionHint` 컴포넌트 구현 (첫 3회 hover 시에만 노출되는 학습형 UI)
- **온보딩 가이드**: `OnboardingGuide` 컴포넌트 구현 (화면 우하단 3단계 팝업 가이드)
- **컴포넌트 통합**: `Hotspot`, `InventoryPanel`에 힌트 노출 로직 적용
- **다국어 지원**: `interaction` 네임스페이스 기반 ko-KR, en-US 번역 적용

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --------- | ---- | ---- |
| `frontend/src/stores/onboardingStore.ts` | 신규 | 온보딩 및 힌트 카운트 상태 관리 |
| `frontend/src/components/InteractionHint.tsx` | 신규 | 재사용 가능한 힌트 툴팁 컴포넌트 |
| `frontend/src/components/OnboardingGuide.tsx` | 신규 | 화면 우하단 온보딩 가이드 팝업 |
| `frontend/src/components/Hotspot.tsx` | 수정 | 핫스팟 hover 시 클릭 힌트 노출 |
| `frontend/src/components/InventoryPanel.tsx` | 수정 | 아이템 hover 시 드래그 힌트 노출 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | 인터랙션 안내 한국어 번역 추가 |
| `frontend/src/locales/en-US/translation.json` | 수정 | 인터랙션 안내 영어 번역 추가 |
| `frontend/src/App.tsx` | 수정 | 온보딩 가이드 컴포넌트 통합 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**온보딩 스토어 (`onboardingStore`)**:
- `HINT_THRESHOLD = 3`: 사용자가 조작법을 익혔다고 판단하는 임계값 설정.
- `persist` 미들웨어: 브라우저를 닫아도 학습 상태가 유지되도록 localStorage 활용.
- `showOnboardingGuide()`: 온보딩 미완료 시 세션 시작 시점에 가이드 노출.

**인터랙션 힌트 (`InteractionHint`)**:
- SVG 인라인 아이콘: 외부 에셋 의존성 없이 클릭/드래그 시각화.
- 툴팁 위치 제어: `top`, `bottom`, `left`, `right` 대응.

**온보딩 가이드 (`OnboardingGuide`)**:
- 3단계 구성: 🎯 Hotspot -> 📦 Inventory -> 📷 Scanner 순차 안내.
- 키보드 접근성: ESC(스킵), Enter/Space(다음) 지원.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: localStorage에 `unknown-world-onboarding` 키 생성.
- **UI/UX**: 핵심 상호작용 요소 위에 일시적인 툴팁 노출로 발견성(Discoverability) 향상.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-074-interaction-hint-ux-runbook.md`
- **실행 결과**: 런북의 시나리오 A~E를 기반으로 가이드 노출, 힌트 카운트 제한, 다국어 전환 검증 완료.

---

## 6. 리스크 및 주의사항

- **힌트 노이즈**: 3회 노출 후 사라지도록 설계하여 숙련된 플레이어의 시각적 피로도 방지.
- **레이어 순서**: 힌트가 다른 UI 요소에 가려지지 않도록 `z-index` 및 스타일 조정 완료.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **데모 시나리오 업데이트**: 온보딩이 포함된 첫 플레이 경험 검증.
2. **프로필별 커스텀 온보딩**: (필요 시) 프로필 특성에 맞는 가이드 텍스트 확장.

### 7.2 의존 단계 확인

- **선행 단계**: U-010(Hotspot), U-012(DnD) 완료
- **후속 단계**: 로드맵상 MVP 통합 테스트 및 데모 시나리오 구성

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] i18n 키 기반 텍스트 적용 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
