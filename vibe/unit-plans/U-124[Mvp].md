# U-124[Mvp]: 프로필별 첫 번째 씬 이미지 사전 생성 (nanobanana-mcp 활용)

## 메타데이터

| 항목      | 내용                                           |
| --------- | ---------------------------------------------- |
| Unit ID   | U-124[Mvp]                                     |
| Phase     | MVP                                            |
| 예상 소요 | 45분                                           |
| 의존성    | U-116[Mvp]                                     |
| 우선순위  | Medium (데모 첫인상 / 이미지 로딩 대기 제거)   |

## 작업 목표

데모 프로필 3종(Narrator, Explorer, Tech)의 **첫 번째 씬 이미지를 nanobanana-mcp로 사전 생성**하여, 프로필 시작 직후 Scene Canvas에 **즉시 표시**되도록 한다. Gemini 이미지 생성의 **기본 아트 스타일**(다크 판타지/로그라이크 분위기)과 CRT 테마에 조화를 이룬다.

**배경**: 현재 프로필 시작 시 Scene Canvas는 placeholder(기본) 상태로 시작하고, 첫 턴을 진행해야 이미지가 생성된다. 이 과정에서 10~20초의 대기가 발생하여 첫인상이 약해진다. 사전 생성 이미지를 프로필에 포함하면 (1) 시작 즉시 "게임 화면"이 보이고, (2) 심사자에게 "채팅 앱이 아닌 게임"이라는 첫인상을 강화하며, (3) 첫 턴 이미지 생성 지연을 완전히 흡수할 수 있다.

**완료 기준**:

- 3종 프로필 각각에 **고유한 첫 번째 씬 이미지**가 `frontend/public/ui/scenes/` 에 저장됨
- 이미지 스타일: Gemini 기본 아트 스타일 (다크 판타지, 로그라이크 분위기, CRT 테마 조화)
- 이미지 크기: Scene Canvas에 맞는 프리셋 (예: 1024x1024 또는 1280x768)
- 프로필 시작 시 Scene Canvas에 **사전 생성 이미지가 즉시 표시**됨 (placeholder 대신)
- 이미지 파일 크기: 각 200KB 이하 권장 (PRD 9.7 성능 예산)
- Scene Canvas에 이미지가 자연스럽게 표시됨

## 영향받는 파일

**생성**:

- `frontend/public/ui/scenes/scene-narrator-start.png` - Narrator 프로필 첫 씬 (예: 서재/도서관, 고서와 촛불)
- `frontend/public/ui/scenes/scene-explorer-start.png` - Explorer 프로필 첫 씬 (예: 미지의 동굴 입구, 횃불과 안개)
- `frontend/public/ui/scenes/scene-tech-start.png` - Tech 프로필 첫 씬 (예: 실험실/연구소, 기계와 회로)

**수정**:

- `frontend/src/data/demoProfiles.ts` - 각 프로필에 `initialSceneImageUrl` 필드 추가
- `frontend/src/components/SceneImage.tsx` - 초기 이미지 URL이 있으면 placeholder 대신 해당 이미지 표시
- `frontend/src/save/sessionLifecycle.ts` - 프로필 시작 시 `sceneState.imageUrl`에 사전 생성 이미지 URL 설정

**참조**:

- `vibe/unit-plans/U-116[Mvp].md` - 프로필 초기 상태 정리
- `vibe/prd.md` 9.7절 - UI 이미지 에셋 파이프라인
- `frontend/public/ui/README.md` - 에셋 SSOT (네이밍/크기/예산)

## 구현 흐름

### 1단계: 씬 이미지 사전 생성 (nanobanana-mcp)

- 각 프로필의 세계관/분위기에 맞는 첫 장면을 nanobanana-mcp로 생성
- 스타일 지시: 다크 판타지/로그라이크 분위기, CRT 테마와 조화

```
// Narrator 프로필: 고풍스러운 서재
"A mysterious old study room with ancient books, flickering candles,
a large wooden desk with scrolls, gothic window with moonlight,
dark fantasy style, atmospheric lighting, cinematic composition."

// Explorer 프로필: 미지의 동굴 입구
"Entrance of an unknown cave with torchlight, mist flowing out,
stone pillars with mysterious symbols, adventurer's equipment nearby,
dark fantasy style, dramatic lighting, wide shot."

// Tech 프로필: 미래 실험실
"A high-tech laboratory with holographic displays, circuit boards,
glowing tubes and machines, a futuristic control panel,
dark sci-fi style, neon cyan accents, atmospheric fog."
```

### 2단계: 이미지 최적화 및 저장

- 생성된 이미지를 Scene Canvas 프리셋에 맞게 리사이즈 (필요 시)
- PNG 최적화로 파일 크기 200KB 이하 달성
- `frontend/public/ui/scenes/` 디렉토리에 저장

### 3단계: 프로필 데이터에 초기 이미지 연결

- `demoProfiles.ts`에 `initialSceneImageUrl` 필드 추가:

```typescript
// demoProfiles.ts
export interface DemoProfileInitialState {
  // ... 기존 필드
  initialSceneImageUrl?: string;  // 사전 생성 첫 씬 이미지 경로
}

const PROFILE_NARRATOR: DemoProfile = {
  // ...
  initialState: {
    // ...
    initialSceneImageUrl: '/ui/scenes/scene-narrator-start.png',
  },
};
```

### 4단계: Scene Canvas 초기 이미지 적용

- `sessionLifecycle.ts`의 `startSessionFromProfile()`에서 프로필의 `initialSceneImageUrl`을 `worldStore.sceneState.imageUrl`에 설정
- `SceneImage.tsx`에서 `imageUrl`이 있으면 placeholder 대신 해당 이미지 표시 (기존 로직 활용)
- 이미지 스타일이 CRT 테마와 조화 확인

### 5단계: 검증

- 각 프로필 시작 → Scene Canvas에 사전 이미지 즉시 표시 확인
- 첫 턴 진행 → 새 이미지로 자연스럽게 교체 확인 (기존 late-binding 로직)
- 이미지 로딩 실패 시 기존 placeholder로 폴백 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-116[Mvp]](../unit-results/U-116[Mvp].md) - 프로필 초기 상태 정리 (sceneObjectDefs=[] 등)
- ~~**계획서**: [U-084[Mvp]](U-084[Mvp].md) - 픽셀 아트 스타일~~ (취소됨, Gemini 기본 스타일 사용)

**다음 작업에 전달할 것**:

- CP-MVP-03: 프로필 시작 즉시 "게임 화면" 표시 → 첫인상 데모 검증
- U-119[Mmp]: WIG 폴리시에서 사전 이미지 품질/스타일 최종 점검

## 주의사항

**기술적 고려사항**:

- (PRD 9.7) `frontend/public/ui/` SSOT 경로에 저장하여 정적 서빙/캐싱 단순화
- (PRD 9.7) 에셋 네이밍 규칙: `kebab-case` + 용도 (예: `scene-narrator-start.png`)
- (PRD 9.7) 전체 에셋 예산 1MB 이하 → 3개 이미지 합산 600KB 이하 목표
- Gemini 기본 아트 스타일(다크 판타지)과 일관성 유지 → scene_prompt 기준 적용
- nanobanana-mcp는 Dev-only 도구 → 런타임 의존 없음

**잠재적 리스크**:

- nanobanana-mcp 생성 이미지가 Gemini 생성 이미지와 스타일이 다를 수 있음 → scene_prompt 기준으로 프롬프트 통일, 여러 번 생성 후 최적 결과 선택
- 이미지 크기가 예산을 초과할 수 있음 → PNG 최적화 도구 또는 WebP 변환 고려

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 이미지 크기/비율은?
  - Option A: **1024x1024** (1:1, 안정적)
  - Option B: **1280x768** (16:9, Scene Canvas 매칭)
  - Option C: U-085의 최종 프리셋에 맞춤

- [ ] **Q2**: 각 프로필의 첫 씬 테마는?
  - Option A: 위 제안 (서재/동굴/실험실)
  - Option B: 프로필 환영 메시지에 맞춘 커스텀 테마
  - Option C: 공통 테마 1개 + 색조/분위기만 프로필별 변형

## 참고 자료

- `vibe/unit-results/U-116[Mvp].md` - 프로필 초기 상태
- `vibe/unit-results/U-092[Mvp].md` - 초기 아이템 프리셋 아이콘 (nanobanana-mcp 활용 사례)
- `vibe/prd.md` 9.7절 - UI 이미지 에셋 파이프라인
- `frontend/public/ui/README.md` - 에셋 SSOT
