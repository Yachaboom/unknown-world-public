# U-089[Mvp]: 핫픽스 - 정밀분석 실행 시 기존 이미지 유지 + 분석 전용 로딩 프로그레스 UX

## 메타데이터

| 항목      | 내용                                                    |
| --------- | ------------------------------------------------------- |
| Unit ID   | U-089[Mvp]                                              |
| Phase     | MVP                                                     |
| 예상 소요 | 45분                                                    |
| 의존성    | U-076[Mvp], U-071[Mvp]                                  |
| 우선순위  | ⚡ Critical (정밀분석 UX 핵심 개선)                     |

## 작업 목표

"정밀분석" 액션 실행 시 **기존 Scene 이미지를 그대로 유지한 상태에서**, 이미지 생성 로딩과는 **별도의 "분석 중" 로딩 프로그레스 오버레이**를 Scene Canvas 위에 표시하여 사용자에게 "기존 장면을 분석하는 중"이라는 명확한 피드백을 제공한다.

**배경**: U-076에서 정밀분석 기능이 구현되었으나, 현재 로딩 상태가 기존 이미지 생성 로딩과 동일하여 "새 이미지를 만드는 건지, 기존 이미지를 분석하는 건지" 구분이 되지 않는다. 정밀분석은 기존 이미지를 대체하지 않으므로, **기존 이미지를 반투명으로 유지하면서 분석 진행 상태를 오버레이로 표시**하는 것이 자연스럽다.

**완료 기준**:

- 정밀분석 실행 시 기존 Scene 이미지가 **사라지지 않고** 화면에 계속 표시된다
- Scene Canvas 위에 **반투명 오버레이 + 분석 프로그레스** 표시 (예: 스캔라인 애니메이션 + "장면 분석 중..." 라벨)
- 기존 이미지 생성 로딩(`processingPhase: image_pending`)과는 **시각적으로 구분**되는 디자인
- 분석 완료 후 오버레이가 자연스럽게 사라지고 핫스팟이 등장
- CRT 테마와 조화되는 디자인 (시안/형광 계열 스캔 효과 권장)

## 영향받는 파일

**생성**:

- (없음 - 기존 컴포넌트 내 수정)

**수정**:

- `frontend/src/components/SceneCanvas.tsx` - 정밀분석 중 processingPhase 분기 추가, 기존 이미지 유지 로직
- `frontend/src/style.css` - `.scene-analyzing` 오버레이 스타일, 스캔라인/프로그레스 애니메이션
- `frontend/src/stores/worldStore.ts` - 정밀분석 상태 플래그(`isAnalyzing`) 추가
- `frontend/src/turn/turnRunner.ts` - 정밀분석 턴 감지 시 `isAnalyzing` 상태 토글

**참조**:

- `vibe/unit-plans/U-076[Mvp].md` - 정밀분석 기능 원본 계획
- `vibe/unit-plans/U-071[Mvp].md` - Scene 로딩 인디케이터 참조
- `vibe/ref/frontend-style-guide.md` - CRT 테마 규칙

## 구현 흐름

### 1단계: 정밀분석 상태 플래그 추가

- `worldStore.ts`에 `isAnalyzing: boolean` 상태 추가
- `turnRunner.ts`에서 정밀분석 트리거(액션 ID/키워드) 감지 시 `isAnalyzing = true` 설정
- 턴 완료 시 `isAnalyzing = false` 리셋

### 2단계: SceneCanvas 분석 모드 분기

- `isAnalyzing === true`일 때:
  - 기존 이미지를 **그대로 표시** (opacity 0.6~0.7로 약간 어둡게)
  - 이미지 위에 **분석 전용 오버레이** 렌더
  - 기존 `processingPhase: image_pending` 로딩은 미표시
- 오버레이 내용: 스캔라인 스윕 애니메이션 + "장면 분석 중..." 라벨 + 프로그레스 인디케이터

### 3단계: CSS 스타일 구현

- `.scene-analyzing-overlay`: 반투명 배경(rgba(0, 255, 255, 0.05)) + 스캔라인 애니메이션
- 스캔라인: 위에서 아래로 반복 스윕하는 시안 라인
- 라벨: CRT 폰트, 시안 글로우 효과
- `prefers-reduced-motion` 존중: 애니메이션 대신 정적 오버레이

### 4단계: 분석 완료 트랜지션

- 분석 완료 시 오버레이 fade-out (0.3s)
- 핫스팟 fade-in과 동기화
- 이미지 opacity 원복 (1.0)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-076[Mvp]](../unit-results/U-076[Mvp].md) - 정밀분석 기능 전체 (트리거, 서비스, 프론트엔드)
- **결과물**: [U-071[Mvp]](../unit-results/U-071[Mvp].md) - Scene 로딩 인디케이터 패턴 참조

**다음 작업에 전달할 것**:

- U-090: 분석 전용 UX가 정립되면, 핫스팟 생성이 정밀분석 전용이라는 정책과 함께 일관된 UX 완성
- CP-MVP-03: "정밀분석 → 분석 UX → 핫스팟 등장" 데모 시나리오

## 주의사항

**기술적 고려사항**:

- (RULE-002) 채팅 UI 회귀 금지 - 분석 오버레이는 "게임 HUD"처럼 보여야 함
- (RULE-008) 프롬프트/내부 추론 노출 금지 - 분석 중 표시는 "장면 분석 중..." 등 사용자 친화적 라벨만
- `prefers-reduced-motion` 미디어 쿼리 존중: 애니메이션 대신 정적 오버레이로 대체
- 분석이 빠르게 완료될 경우(< 1s)에도 오버레이 최소 표시 시간(500ms) 확보하여 깜빡임 방지

**잠재적 리스크**:

- 분석 지연이 10초 이상일 때 오버레이만 계속 보이면 "멈춤"으로 인식 → 경과 시간 표시 또는 단계별 메시지로 보완
- 오버레이 alpha가 과도하면 기존 이미지가 안 보임 → 0.05~0.1 수준으로 경미하게

## 페어링 질문 (결정 필요)

- [x] **Q1**: 분석 오버레이 디자인?
  - ✅ Option A: 스캔라인 스윕(위→아래) + 시안 글로우 라벨
  - Option B: 돋보기 아이콘 + 원형 프로그레스 + 라벨
  - Option C: CRT 글리치 효과 + "SCANNING..." 텍스트

- [x] **Q2**: 기존 이미지 어둡게 처리 정도?
  - Option A: opacity 0.7 (약간 어둡게)
  - ✅ Option B: opacity 0.5 + 시안 틴트
  - Option C: 원본 유지 (opacity 1.0) + 오버레이만

## 참고 자료

- `vibe/unit-results/U-076[Mvp].md` - 정밀분석 구현 결과
- `vibe/unit-results/U-071[Mvp].md` - Scene 로딩 인디케이터 결과
- `vibe/ref/frontend-style-guide.md` - CRT 테마/오버레이 규칙
- `vibe/prd.md` - 6.7(Action Deck), 9.5(CRT 효과)
