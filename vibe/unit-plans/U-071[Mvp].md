# U-071[Mvp]: Scene 처리중 UI 로딩 인디케이터 강화

## 메타데이터

| 항목      | 내용                                  |
| --------- | ------------------------------------- |
| Unit ID   | U-071[Mvp]                            |
| Phase     | MVP                                   |
| 예상 소요 | 45분                                  |
| 의존성    | U-066[Mvp]                            |
| 우선순위  | High (처리 상태 가시성 강화)          |

## 작업 목표

턴 처리 중일 때 **Scene Canvas에 명확한 로딩 인디케이터/상태 UI를 추가**하여, 플레이어가 현재 시스템이 무엇을 하고 있는지 인지할 수 있도록 한다.

**배경**: U-066에서 `imageLoading` 플래그와 "형성 중" 상태를 구현했지만, Scene Canvas 자체의 로딩/처리 중 상태가 시각적으로 충분히 전달되지 않을 수 있다. 텍스트 스트리밍 중, 이미지 생성 대기 중, 결과 렌더링 중 등 각 상태에 맞는 UI 피드백이 필요하다.

**완료 기준**:

- 턴 처리 중일 때 Scene Canvas에 로딩 오버레이/인디케이터가 표시됨
- 상태별 메시지: "장면 생성 중...", "이미지 형성 중...", "결과 적용 중..." 등
- 로딩 인디케이터가 CRT 테마와 조화됨 (글로우 스피너, 스캔라인 애니메이션 등)
- `prefers-reduced-motion` 설정 시 애니메이션 완화

## 영향받는 파일

**수정**:

- `frontend/src/components/SceneImage.tsx` - 처리 중 오버레이/인디케이터 추가
- `frontend/src/stores/worldStore.ts` - `sceneState.processingPhase` 상태 추가
- `frontend/src/turn/turnRunner.ts` - 각 처리 단계에서 `processingPhase` 업데이트
- `frontend/src/style.css` - 로딩 인디케이터 스타일(CRT 테마)
- `frontend/src/locales/ko-KR/translation.json` - 처리 상태 메시지 키 추가
- `frontend/src/locales/en-US/translation.json` - 영문 처리 상태 메시지

**참조**:

- `vibe/unit-plans/U-066[Mvp].md` - 이미지 지연 흡수 플로우(imageLoading 상태)
- `vibe/ref/frontend-style-guide.md` - CRT 효과 가이드

## 구현 흐름

### 1단계: 처리 단계(Phase) 상태 정의

- Scene 관련 처리 단계를 명시적으로 정의
- `sceneState`에 `processingPhase` 추가

```typescript
// frontend/src/types/scene.ts
type SceneProcessingPhase = 
  | "idle"           // 유휴 상태
  | "processing"     // 턴 처리 중 (텍스트 스트리밍)
  | "image_pending"  // 이미지 생성 대기/진행 중
  | "rendering";     // 결과 렌더링 중

interface SceneCanvasState {
  // ... 기존 필드
  processingPhase: SceneProcessingPhase;
}
```

### 2단계: i18n 메시지 추가

```json
// frontend/src/locales/ko-KR/translation.json
{
  "scene": {
    "processing": "장면 생성 중...",
    "image_pending": "이미지 형성 중...",
    "rendering": "결과 적용 중...",
    "ready": "준비 완료"
  }
}
```

### 3단계: turnRunner에서 단계 업데이트

- 각 처리 단계에서 `processingPhase` 상태 업데이트

```typescript
// frontend/src/turn/turnRunner.ts
const executeTurn = async (...) => {
  // 처리 시작
  worldStore.getState().setProcessingPhase("processing");
  
  try {
    // 스트리밍 처리...
    
    // 이미지 생성 시작 시
    if (imageJob?.should_generate) {
      worldStore.getState().setProcessingPhase("image_pending");
      // 이미지 생성 요청...
    }
    
    // 결과 렌더링
    worldStore.getState().setProcessingPhase("rendering");
    // 상태 적용...
    
  } finally {
    // 완료
    worldStore.getState().setProcessingPhase("idle");
  }
};
```

### 4단계: SceneImage 로딩 오버레이 구현

- 처리 중일 때 오버레이 표시
- CRT 테마에 맞는 스타일 적용

```tsx
// frontend/src/components/SceneImage.tsx
const SceneImage: React.FC = () => {
  const { processingPhase, imageLoading } = useWorldStore(s => s.sceneState);
  const { t } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const isProcessing = processingPhase !== "idle" || imageLoading;
  
  return (
    <SceneContainer>
      {/* 이미지 또는 placeholder */}
      <ImageLayer src={imageUrl} />
      
      {/* 처리 중 오버레이 */}
      {isProcessing && (
        <ProcessingOverlay>
          <Spinner animate={!prefersReducedMotion} />
          <ProcessingMessage>
            {t(`scene.${processingPhase}`)}
          </ProcessingMessage>
        </ProcessingOverlay>
      )}
    </SceneContainer>
  );
};
```

### 5단계: CRT 테마 로딩 스타일

- 글로우 효과가 있는 스피너
- 스캔라인/글리치 애니메이션 (옵션)

```css
/* frontend/src/style.css */
.processing-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.crt-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--text-dim);
  border-top-color: var(--text-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 10px var(--text-color);
}

@media (prefers-reduced-motion: reduce) {
  .crt-spinner {
    animation: none;
    opacity: 0.7;
  }
}

.processing-message {
  color: var(--text-color);
  font-family: var(--font-main);
  text-shadow: 0 0 5px var(--text-color);
}
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-066[Mvp]](U-066[Mvp].md) - imageLoading 상태 및 late-binding 플로우
- **참조**: `frontend/src/components/SceneImage.tsx` - 현재 Scene 이미지 구현

**다음 작업에 전달할 것**:

- CP-MVP-03: 처리 상태가 명확히 표시되는 데모 시나리오
- MMP: 더 정교한 로딩 애니메이션/연출

## 주의사항

**기술적 고려사항**:

- (접근성) `prefers-reduced-motion` 설정 존중 필수
- (RULE-006) 로딩 메시지도 i18n 키 기반
- (성능) 로딩 오버레이 렌더링이 Scene 성능에 영향 주지 않도록 주의

**잠재적 리스크**:

- 오버레이가 너무 어두우면 이전 이미지가 안 보임 → 적절한 투명도 조절
- 처리 단계 전환이 너무 빠르면 깜빡임 → 최소 표시 시간 또는 디바운스

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 로딩 인디케이터 위치?
  - Option A: Scene Canvas 중앙에 오버레이
  - Option B: Scene Canvas 하단에 슬림 프로그레스 바
  - Option C: Scene Canvas 코너에 작은 스피너 + 라벨

- [ ] **Q2**: 이전 이미지 처리?
  - Option A: 이전 이미지 위에 반투명 오버레이 (이미지 유지)
  - Option B: 이전 이미지에 블러 효과 + 로딩 인디케이터
  - Option C: placeholder로 교체 후 로딩 인디케이터

## 참고 자료

- `vibe/unit-plans/U-066[Mvp].md` - 이미지 지연 흡수 플로우
- `vibe/ref/frontend-style-guide.md` - CRT 효과 가이드
- `vibe/prd.md` 9.5절 - CRT 효과(요약)
