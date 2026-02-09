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
- 이미지 크기: **1024x576** (Gemini 1K + 16:9 출력 매칭)
- 프로필 시작 시 Scene Canvas에 **사전 생성 이미지가 즉시 표시**됨 (placeholder 대신)
- 이미지 파일 크기: 각 200KB 이하 권장 (PRD 9.7 성능 예산)
- Scene Canvas에 이미지가 자연스럽게 표시됨

## 영향받는 파일

**생성**:

- `frontend/public/ui/scenes/scene-narrator-start.webp` - Narrator 첫 씬 (서재/도서관), 1024x576 WebP Q80, 55KB
- `frontend/public/ui/scenes/scene-explorer-start.webp` - Explorer 첫 씬 (동굴 입구), 1024x576 WebP Q80, 43KB
- `frontend/public/ui/scenes/scene-tech-start.webp` - Tech 첫 씬 (실험실), 1024x576 WebP Q80, 58KB
- `backend/src/unknown_world/storage/seed.py` - 백엔드 시작 시 WebP→PNG 자동 시드
- `scripts/seed-scene-images.sh` - 수동 시드 스크립트 (ImageMagick)

**수정**:

- `frontend/src/data/demoProfiles.ts` - 각 프로필에 `initialSceneImageUrl` 필드 추가
- `frontend/src/save/sessionLifecycle.ts` - 프로필 시작 시 `sceneState` 전체 필드 설정 (processingPhase/imageLoading 포함)
- `frontend/src/turn/turnRunner.ts` - `toBackendReferenceUrl()` 변환 함수 추가 (4곳 적용)
- `backend/src/unknown_world/main.py` - lifespan에 `seed_scene_images()` 호출 추가
- `frontend/public/ui/manifest.json` - 씬 이미지 에셋 등록

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

- ImageMagick으로 **1024x576** (Gemini 1K + 16:9 출력 매칭)으로 리사이즈
- WebP Q80 변환으로 파일 크기 200KB 이하 달성 (실측: 43~58KB)
- `frontend/public/ui/scenes/` 디렉토리에 저장
- `frontend/public/ui/manifest.json`에 에셋 등록

### 3단계: 프로필 데이터에 초기 이미지 연결

- `demoProfiles.ts`에 `initialSceneImageUrl` 필드 추가:

```typescript
// demoProfiles.ts
export interface DemoProfileInitialState {
  // ... 기존 필드
  initialSceneImageUrl?: string;  // 사전 생성 첫 씬 이미지 경로 (U-124)
}

const PROFILE_NARRATOR: DemoProfile = {
  // ...
  initialState: {
    // ...
    initialSceneImageUrl: '/ui/scenes/scene-narrator-start.webp',
  },
};
```

### 4단계: Scene Canvas 초기 이미지 적용

- `sessionLifecycle.ts`의 `startSessionFromProfile()`에서 `sceneState` 전체를 설정
  - `imageUrl`: 사전 생성 이미지 경로 (`/ui/scenes/scene-{profile}-start.webp`)
  - `status: 'scene'`, `processingPhase: 'idle'`, `imageLoading: false` 등 필수 필드 명시
  - **주의**: Zustand `setState()`는 shallow merge이므로 중첩 객체(`sceneState`)는 전체 교체됨 → 필수 필드 누락 시 영구 입력 잠금 발생
- `SceneImage.tsx`에서 `imageUrl`이 있으면 placeholder 대신 해당 이미지 표시 (기존 로직 활용)

### 5단계: 참조 이미지 파이프라인 연결 (시각적 연속성)

사전 생성 이미지가 첫 턴의 Gemini 참조 이미지로 사용되어 **시각적 연속성을 유지**해야 한다.

- **문제**: 백엔드 `_load_reference_image()`는 `/api/image/file/{id}` 또는 `http(s)://` URL만 처리하므로, 프론트엔드 정적 URL(`/ui/scenes/...`)은 인식 불가
- **해결**:
  1. `backend/storage/seed.py` — 백엔드 시작 시(lifespan) 프론트엔드 WebP → 백엔드 `.data/images/generated/` PNG 자동 변환 (Pillow)
  2. `frontend/turn/turnRunner.ts` — `toBackendReferenceUrl()` 함수로 표시용 URL → 백엔드 참조 URL 변환:
     - `/ui/scenes/scene-narrator-start.webp` → `/api/image/file/scene-narrator-start`
  3. 4곳의 `previousImageUrl` 취득 로직에 모두 적용 (createTurnRunner 2곳 + useTurnRunner 2곳)
- **결과**: 프론트엔드 표시는 WebP 정적 에셋, Gemini 참조는 백엔드 PNG — 역할 분리

### 6단계: 검증

- 각 프로필 시작 → Scene Canvas에 사전 이미지 즉시 표시 확인
- 첫 턴 진행 → `reference_image_url: "/api/image/file/scene-{profile}-start"` 전송 확인
- 백엔드에서 참조 이미지 로드 → Gemini 멀티모달 입력으로 전달 확인
- 새 이미지로 자연스럽게 교체 확인 (기존 late-binding 로직)
- 이미지 로딩 실패 시 기존 placeholder로 폴백 확인

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-116[Mvp]](../unit-results/U-116[Mvp].md) - 프로필 초기 상태 정리 (sceneObjectDefs=[] 등)

**다음 작업에 전달할 것**:

- CP-MVP-03: 프로필 시작 즉시 "게임 화면" 표시 → 첫인상 데모 검증
- U-119[Mmp]: WIG 폴리시에서 사전 이미지 품질/스타일 최종 점검

## 주의사항

**기술적 고려사항**:

- (PRD 9.7) `frontend/public/ui/` SSOT 경로에 저장하여 정적 서빙/캐싱 단순화
- (PRD 9.7) 에셋 네이밍 규칙: `kebab-case` + 용도 (예: `scene-narrator-start.webp`)
- (PRD 9.7) 전체 에셋 예산 1MB 이하 → 3개 이미지 합산 156KB (예산 대비 15.6%)
- 이미지 해상도 **1024x576** → Gemini `1K` + `16:9` 런타임 출력과 동일하여 첫 턴 전환 시 해상도 차이 없음
- Gemini 기본 아트 스타일(다크 판타지)과 일관성 유지 → nanobanana-mcp `oil-painting` 스타일 사용
- nanobanana-mcp는 Dev-only 도구 → 런타임 의존 없음
- `backend/.data/` 는 `.gitignore` → lifespan 시드가 매 서버 시작마다 멱등하게 복사
- Zustand `setState()` shallow merge 주의 → `sceneState` 설정 시 `processingPhase`/`imageLoading` 필수 포함

**잠재적 리스크**:

- nanobanana-mcp 생성 이미지가 Gemini 생성 이미지와 스타일이 다를 수 있음 → scene_prompt 기준으로 프롬프트 통일, 첫 턴에 참조 이미지로 전달하여 연속성 확보
- ~~이미지 크기가 예산을 초과할 수 있음~~ → WebP Q80 변환으로 해결 (43~58KB/개)

## 페어링 질문 (결정 필요)

- [x] **Q1**: 이미지 크기/비율은?
  - Option A: **1024x1024** (1:1, 안정적)
  - Option B: **1280x768** (16:9, Scene Canvas 매칭)
  - ✅ Option C: **1024x576** (Gemini 1K + 16:9 런타임 출력 매칭) — 구현 중 B에서 C로 변경

- [x] **Q2**: 각 프로필의 첫 씬 테마는?
  - ✅ Option A: 위 제안 (서재/동굴/실험실)
  - Option B: 프로필 환영 메시지에 맞춘 커스텀 테마
  - Option C: 공통 테마 1개 + 색조/분위기만 프로필별 변형

## 구현 결과 요약

| 항목 | 값 |
|------|-----|
| 이미지 포맷 (프론트엔드) | WebP Q80 |
| 이미지 포맷 (백엔드 참조) | PNG (Pillow 자동 변환) |
| 해상도 | 1024x576 (Gemini 1K 16:9 매칭) |
| Narrator 파일 크기 | 55KB |
| Explorer 파일 크기 | 43KB |
| Tech 파일 크기 | 58KB |
| 합산 | 156KB (예산 1MB 대비 15.6%) |
| 참조 이미지 경로 | `/api/image/file/scene-{profile}-start` |
| 자동 시드 | FastAPI lifespan (Pillow WebP→PNG) |
| 생성 도구 | nanobanana-mcp (oil-painting 스타일) |

## 참고 자료

- `vibe/unit-results/U-116[Mvp].md` - 프로필 초기 상태
- `vibe/unit-results/U-092[Mvp].md` - 초기 아이템 프리셋 아이콘 (nanobanana-mcp 활용 사례)
- `vibe/prd.md` 9.7절 - UI 이미지 에셋 파이프라인
- `frontend/public/ui/README.md` - 에셋 SSOT
