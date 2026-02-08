# U-097[Mvp]: ⚡핫픽스 - SceneCanvas 렌더 중 Zustand setState 호출 분리 (첫 요청 차단 해소)

## 메타데이터

| 항목      | 내용                                                              |
| --------- | ----------------------------------------------------------------- |
| Unit ID   | U-097[Mvp]                                                        |
| Phase     | MVP                                                               |
| 예상 소요 | 20분                                                              |
| 의존성    | U-085[Mvp]                                                        |
| 우선순위  | Critical (첫 요청 진행 불가 차단)                                 |

## 작업 목표

프로필 선택 후 첫 요청 시 **게임 진행이 완전히 차단되는 React 렌더링 오류를 수정**한다. `SceneCanvas` 컴포넌트의 ResizeObserver 콜백 내부에서 `setCanvasSize`(React useState 업데이터) 실행 중에 `setSceneCanvasSize`(Zustand store `set()`)를 호출하여, React가 **"Cannot update a component (`App`) while rendering a different component (`SceneCanvas`)"** 경고를 발생시키고 상태 불일치로 이어진다.

**배경**: U-085에서 이미지 생성 시 Scene Canvas 크기를 SSOT로 참조하기 위해 `setSceneCanvasSize`를 도입했다. 이 함수가 `setCanvasSize` 상태 업데이터 함수 내부에서 호출되면서, React 렌더 사이클 도중 다른 컴포넌트(`App`)의 상태를 갱신하는 금지 패턴이 발생했다. 이로 인해 프로필 시작 후 첫 턴 요청이 진행되지 않는 치명적 버그가 발생한다.

**완료 기준**:

- `setSceneCanvasSize`(Zustand store 갱신)가 React `useState` 업데이터 함수 내부에서 호출되지 않는다.
- Zustand store 갱신은 별도 `useEffect`로 분리되어, `canvasSize` 로컬 상태 변경 후 다음 렌더 사이클에서 store에 반영된다.
- 콘솔에 "Cannot update a component while rendering" 경고가 발생하지 않는다.
- 프로필 선택 후 첫 턴 요청이 정상 진행된다.
- 기존 ResizeObserver 디바운스/5px 임계값 동작이 유지된다.

## 영향받는 파일

**수정**:

- `frontend/src/components/SceneCanvas.tsx` - `setCanvasSize` 업데이터 내부의 `setSceneCanvasSize` 호출을 제거하고, 별도 `useEffect`로 canvasSize → store 동기화 분리

**참조**:

- `frontend/src/stores/worldStore.ts` - `setSceneCanvasSize` 함수 정의 (변경 불필요)
- `vibe/unit-plans/U-085[Mvp].md` - `setSceneCanvasSize` 도입 배경

## 구현 흐름

### 1단계: ResizeObserver 콜백에서 Zustand 호출 제거

- `SceneCanvas.tsx` 111행: `setCanvasSize` 업데이터 함수 내부의 `setSceneCanvasSize(newSize)` 호출을 **제거**한다.
- 127행: 초기 크기 설정의 `setSceneCanvasSize(initialSize)` 호출도 제거한다.
- ResizeObserver는 `setCanvasSize`(로컬 상태)만 갱신한다.

### 2단계: useEffect로 store 동기화 분리

- 새로운 `useEffect`를 추가하여 `canvasSize` 변경 시 `setSceneCanvasSize`를 호출한다:
  ```tsx
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      setSceneCanvasSize(canvasSize);
    }
  }, [canvasSize, setSceneCanvasSize]);
  ```
- 이로써 로컬 상태 업데이트와 store 업데이트가 별도 렌더 사이클에서 수행된다.

### 3단계: 검증

- 프로필 선택 → 첫 턴 요청 → 정상 진행 확인
- 콘솔에 "Cannot update a component" 경고 미발생 확인
- 브라우저 리사이즈 시 `sceneCanvasSize` store 값이 정상 갱신되는지 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-085[Mvp]](../unit-results/U-085[Mvp].md) - `setSceneCanvasSize` 도입 및 ResizeObserver 연동

**다음 작업에 전달할 것**:

- U-084: 이미지 사이즈 최적화에서 `sceneCanvasSize` store 값을 안전하게 참조 가능
- U-087: 입력 잠금 유닛에서 SceneCanvas 렌더 안정성 전제

## 주의사항

**기술적 고려사항**:

- (RULE-002) SceneCanvas는 게임 UI의 핵심 컴포넌트이며, 렌더링 안정성이 전체 앱 동작에 직접 영향을 미친다.
- `useEffect` 분리로 store 갱신이 1프레임 지연될 수 있으나, ResizeObserver 자체에 100ms 디바운스가 있으므로 실질적 영향 없음.
- React 19의 Strict Mode에서 더 엄격하게 감지되는 패턴이므로, 향후에도 useState 업데이터 내부에서 외부 store를 갱신하는 패턴을 금지한다.

**잠재적 리스크**:

- useEffect 분리로 인한 1프레임 지연이 이미지 생성 요청의 크기 참조에 영향을 줄 수 있음 → ResizeObserver 디바운스(100ms)가 이미 존재하므로 추가 지연은 무시 가능 수준.

## 페어링 질문 (결정 필요)

- [x] **Q1**: store 동기화를 useEffect로 분리할 때 의존성 배열에 `setSceneCanvasSize`를 포함할까?
  - ✅Option A: 포함한다 (Zustand의 `set`은 안정 참조이므로 실질적 재실행 없음, lint 경고 방지)
  - Option B: 제외한다 (ESLint exhaustive-deps 경고 억제 필요)

## 참고 자료

- `vibe/unit-plans/U-085[Mvp].md` - setSceneCanvasSize 도입 계획
- [React 공식 문서: setState during render](https://react.dev/link/setstate-in-render)
