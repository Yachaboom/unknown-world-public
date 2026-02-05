# U-071[Mvp] 런북: Scene 처리중 UI 로딩 인디케이터 강화

## 개요

Scene Canvas에서 턴 처리 중 명확한 로딩 인디케이터와 상태 UI를 표시하여
플레이어에게 현재 시스템 활동을 알립니다.

## 사전 조건

- 프론트엔드 개발 서버 실행: `cd frontend && npm run dev`
- 백엔드 서버 실행: `cd backend && python -m uvicorn main:app --reload`

## 테스트 시나리오

### 시나리오 1: 턴 처리 중 로딩 인디케이터 표시

**목적**: 턴 실행 시 Scene Canvas에 처리 중 오버레이가 표시되는지 확인

**절차**:
1. 게임을 시작하고 프로필을 선택합니다.
2. 액션 카드를 클릭하거나 명령어를 입력합니다.
3. Scene Canvas를 관찰합니다.

**예상 결과**:
- Scene Canvas 중앙에 CRT 테마 스피너가 표시됩니다.
- "장면 생성 중..." 메시지가 표시됩니다 (한국어).
- 이전 이미지는 placeholder로 대체됩니다.
- 스캔라인 효과가 오버레이에 적용됩니다.

### 시나리오 2: 이미지 생성 대기 단계 메시지

**목적**: 이미지 생성 대기 시 "이미지 형성 중..." 메시지가 표시되는지 확인

**절차**:
1. 게임을 시작합니다.
2. 이미지 생성이 포함된 액션을 실행합니다.
3. 텍스트 스트리밍 완료 후 이미지 생성 단계를 관찰합니다.

**예상 결과**:
- 초기: "장면 생성 중..." (processing)
- 이미지 생성 시작: "이미지 형성 중..." (image_pending)
- 이미지 생성 완료: 오버레이 사라지고 새 이미지 표시

### 시나리오 3: 영어 언어 설정

**목적**: 영어 설정 시 올바른 메시지가 표시되는지 확인

**절차**:
1. 언어를 English로 변경합니다.
2. 새 게임을 시작합니다.
3. 액션을 실행하여 처리 중 상태를 확인합니다.

**예상 결과**:
- "Generating scene..." (processing)
- "Forming image..." (image_pending)

### 시나리오 4: prefers-reduced-motion 접근성

**목적**: 모션 감소 설정 시 애니메이션이 완화되는지 확인

**절차**:
1. 브라우저/OS에서 `prefers-reduced-motion: reduce` 설정을 활성화합니다.
2. 게임을 시작하고 액션을 실행합니다.
3. 로딩 인디케이터를 관찰합니다.

**예상 결과**:
- 스피너 회전 애니메이션이 비활성화됩니다.
- 스캔라인 스크롤 애니메이션이 비활성화됩니다.
- 텍스트 깜빡임이 비활성화됩니다.
- 오버레이는 정적으로 표시됩니다.

### 시나리오 5: 에러 발생 시 idle 전환

**목적**: 에러 발생 시 처리 상태가 올바르게 초기화되는지 확인

**절차**:
1. 네트워크를 일시적으로 차단하거나 백엔드를 중지합니다.
2. 액션을 실행합니다.
3. Scene Canvas 상태를 관찰합니다.

**예상 결과**:
- 처리 중 오버레이가 사라집니다.
- Scene Canvas가 오프라인/에러 상태로 전환됩니다.
- processingPhase가 'idle'로 초기화됩니다.

## DevTools 디버깅

### processingPhase 상태 확인

브라우저 콘솔에서 다음 명령으로 현재 처리 단계를 확인할 수 있습니다:

```javascript
// worldStore 상태 확인
window.__ZUSTAND_DEVTOOLS__?.getState()?.sceneState?.processingPhase

// 또는 React DevTools에서 worldStore 구독 컴포넌트 확인
```

### 스타일 검증

1. DevTools Elements 패널에서 `.scene-processing-overlay` 요소 확인
2. Computed 탭에서 애니메이션 속성 확인
3. prefers-reduced-motion 시뮬레이션: DevTools > Rendering > Emulate CSS media feature

## 알려진 제한사항

1. 이미지 생성이 매우 빠른 경우 "이미지 형성 중..." 메시지가 짧게 표시될 수 있습니다.
2. 네트워크 지연이 심한 경우 처리 단계 전환이 지연될 수 있습니다.

## 관련 파일

- `frontend/src/components/SceneImage.tsx` - 오버레이 렌더링
- `frontend/src/components/SceneCanvas.tsx` - processingPhase prop 전달
- `frontend/src/stores/worldStore.ts` - processingPhase 상태 관리
- `frontend/src/turn/turnRunner.ts` - 처리 단계 업데이트 로직
- `frontend/src/types/scene.ts` - SceneProcessingPhase 타입 정의
- `frontend/src/locales/ko-KR/translation.json` - 한국어 메시지
- `frontend/src/locales/en-US/translation.json` - 영어 메시지
- `frontend/src/style.css` - CRT 테마 스타일
