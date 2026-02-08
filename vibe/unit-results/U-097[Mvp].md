# U-097[Mvp]: ⚡핫픽스 - SceneCanvas 렌더 중 Zustand setState 호출 분리 (첫 요청 차단 해소) 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-097[Mvp]
- **단계 번호**: 2.3 (MVP 핫픽스)
- **작성 일시**: 2026-02-08 23:15
- **담당**: AI Agent

---

## 1. 작업 요약

`SceneCanvas` 컴포넌트 렌더링 과정에서 발생하던 "Cannot update a component while rendering" 경고와 이로 인한 첫 턴 요청 차단 문제를 해결했습니다. Zustand store 업데이트 로직을 React의 `useEffect`로 분리하여 렌더 사이클의 안정성을 확보했습니다.

---

## 2. 작업 범위

- [x] **ResizeObserver 콜백 정제**: `setCanvasSize`(로컬 상태) 업데이트 시 내부에서 호출되던 `setSceneCanvasSize`(Zustand) 제거.
- [x] **Store 동기화 로직 분리**: 로컬 `canvasSize` 상태 변경을 감지하여 별도의 `useEffect`에서 `setSceneCanvasSize`를 호출하도록 구조 개선.
- [x] **초기 렌더링 안정화**: 컴포넌트 마운트 시의 초기 크기 설정 로직에서도 Zustand 직접 호출을 제거하고 로컬 상태를 통한 순차적 동기화 적용.
- [x] **의존성 무결성 확보**: `useEffect`의 의존성 배열에 `setSceneCanvasSize`를 포함하여 린트 경고 방지 및 참조 안정성 유지.

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/components/SceneCanvas.tsx` | 수정 | 렌더링 중 상태 업데이트 금지 패턴 수정 (Zustand 호출 분리) |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 변경 사항**:

- **기존 문제**: `ResizeObserver` -> `setCanvasSize(prev => { ... setSceneCanvasSize(new); ... })` 형태의 중첩 업데이트가 React 렌더 사이클을 위반함.
- **해결 패턴**: `ResizeObserver` -> `setCanvasSize(new)` -> `useEffect(() => setSceneCanvasSize(canvasSize), [canvasSize])`.

**설계 패턴/원칙**:

- **Unidirectional Data Flow**: 로컬 렌더링 상태와 글로벌 공유 상태(SSOT) 간의 흐름을 단방향으로 명확히 분리.
- **Side-Effect Isolation**: 외부 시스템(Zustand store)에 영향을 주는 행위를 `useEffect`로 격리하여 렌더링 순수성 유지.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 영향 없음.
- **권한/보안**: 영향 없음.
- **빌드/의존성**: 영향 없음.

### 4.3 가정 및 제약사항

- **동기화 지연**: `useEffect` 사용으로 인해 로컬 크기와 스토어 크기 간에 1프레임의 시차가 발생할 수 있으나, 리사이즈 이벤트의 특성상 사용자 경험 및 이미지 생성 요청에는 실질적 영향이 없음을 전제합니다.

---

## 5. 런북(Runbook) 정보

- **참조 계획서**: `vibe/unit-plans/U-097[Mvp].md`
- **검증 절차**:
    1. 브라우저 콘솔의 React 렌더링 경고 미발생 확인.
    2. 프로필 선택 후 첫 번째 액션 요청이 정상적으로 서버에 전달되는지 확인.
    3. 창 크기 조절 시 핫스팟과 이미지가 정상적으로 반응하는지 확인.

---

## 6. 리스크 및 주의사항

- **React 19 엄격 모드**: 향후 React 버전에 따라 렌더링 중 상태 업데이트 시도가 더 강력하게 차단될 수 있으므로, 이 유닛에서 적용한 분리 패턴을 표준으로 유지해야 합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **입력 잠금 안정성 검증 (U-087)**: 렌더링 안정성이 확보된 상태에서 입력 잠금 UI가 정상 동작하는지 확인.
2. **이미지 크기 최적화 (U-084)**: 안정화된 `sceneCanvasSize`를 기반으로 픽셀 스타일 가이드 적용.

### 7.2 의존 단계 확인

- **선행 단계**: U-085[Mvp] (이미지 크기 동기화 기초) 완료.

---

## 8. 자체 점검 결과

- [x] 렌더링 중 상태 업데이트 금지 원칙 준수
- [x] 프로필 선택 후 첫 요청 차단 해소 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
