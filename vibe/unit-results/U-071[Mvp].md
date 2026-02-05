# U-071[Mvp]: Scene 처리중 UI 로딩 인디케이터 강화 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-071[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-02-05 15:40
- **담당**: AI Agent

---

## 1. 작업 요약

Scene Canvas에서 턴 처리 단계(`processingPhase`)에 따라 명확한 로딩 인디케이터와 상태 UI를 제공하여 사용자 경험을 강화했습니다. 특히 CRT 테마의 애니메이션 오버레이를 통해 시스템 활동(장면 생성, 이미지 형성 등)을 시각적으로 명확히 전달합니다.

---

## 2. 작업 범위

- **처리 단계별 UI 강화**: `processingPhase` 상태(`processing`, `image_pending`, `rendering`)를 인식하여 Scene Canvas에 오버레이 표시
- **CRT 테마 로딩 인디케이터**: 스피너 애니메이션, 글로우 효과, 스캔라인이 포함된 전용 로딩 UI 구현
- **다국어 메시지 대응**: 단계별 상태 메시지(장면 생성 중, 이미지 형성 중 등)를 한국어 및 영어로 제공
- **조건부 렌더링 최적화**: 처리 중일 때는 이전 이미지를 숨기고 placeholder 상태로 전환하여 시각적 혼동 방지 (Option C 적용)
- **접근성 지원**: `prefers-reduced-motion` 대응 스타일링 및 ARIA 역할(`status`, `polite`) 적용

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| :--- | :--- | :--- |
| `frontend/src/components/SceneImage.tsx` | 수정 | `processingPhase` 기반 오버레이 렌더링 로직 추가 |
| `frontend/src/style.css` | 수정 | CRT 테마 스피너 및 오버레이 스타일 정의 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | 한국어 상태 메시지 추가 |
| `frontend/src/locales/en-US/translation.json` | 수정 | 영어 상태 메시지 추가 |
| `frontend/src/types/scene.ts` | 확인 | `SceneProcessingPhase` 타입 정의 호환 확인 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**컴포넌트 인터페이스**:
- `SceneImage({ processingPhase, ... })`: 외부에서 전달받은 처리 단계에 따라 내부 `isProcessing` 상태 결정

**상태 메시지 매핑**:
- `processing`: "장면 생성 중..." / "Generating scene..."
- `image_pending`: "이미지 형성 중..." / "Forming image..."
- `rendering`: "렌더링 중..." / "Rendering..."

**UI 구성 (Option C)**:
1. `isProcessing` 활성 시 `scene-active` 클래스 제거 및 `scene-processing` 클래스 추가
2. 기존 `<img>` 태그 렌더링 중단 (깜빡임 방지 및 placeholder 노출)
3. `.scene-processing-overlay` 레이어 활성화 (스피너 + 텍스트 + 스캔라인)

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `worldStore`의 `sceneState.processingPhase` 상태를 구독하여 동작
- **성능**: CSS 애니메이션을 활용하여 메인 스레드 부하 최소화
- **접근성**: `prefers-reduced-motion: reduce` 시 애니메이션이 정지되도록 설정

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-071-scene-processing-indicator-runbook.md`
- **실행 결과**: 시나리오 1~5(로딩 표시, 메시지 전환, i18n, 접근성, 에러 처리)에 대한 설계 반영 완료
- **참조**: 실제 동작 확인을 위한 테스트 절차는 위 런북 참조

---

## 6. 리스크 및 주의사항

- **레이아웃**: 오버레이가 `absolute` 포지셔닝이므로 컨테이너 크기에 의존함
- **애니메이션**: 저사양 기기에서 다수의 애니메이션이 겹칠 경우 성능 저하 우려 (스캔라인은 `pointer-events: none` 처리됨)

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **런북 실행**: 실제 환경에서 단계별 메시지 전환 타이밍 검증
2. **U-072 개발**: 강화된 로딩 인디케이터와 연동되는 에러 핸들링 UI 개선

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] CRT 테마 스타일 가이드 준수
- [x] 다국어(ko/en) 지원 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
