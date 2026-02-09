# U-124 프로필별 첫 씬 이미지 사전 생성 실행 가이드

## 1. 개요

데모 프로필 3종(서사꾼, 탐험가, 기술 전문가)의 **첫 번째 씬 이미지를 nanobanana mcp로 사전 생성**하여, 프로필 시작 직후 Scene Canvas에 **즉시 표시**되도록 구현했습니다. 기존 placeholder(기본 상태) 대신 각 프로필의 세계관에 맞는 다크 판타지/로그라이크 분위기의 이미지가 바로 보입니다.

**예상 소요 시간**: 3분

**의존성**:
- 의존 유닛: U-116[Mvp] (SaveGame 제거 + 프로필 초기 상태 정리)
- 선행 완료 필요: 프론트엔드 서버 구동

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
pnpm -C frontend install
```

### 2.2 서버 시작

```bash
pnpm run dev:front
```

### 2.3 접근

브라우저에서 `http://localhost:8001` 접속

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 서사꾼(Narrator) 프로필 첫 씬 이미지

**목적**: 프로필 시작 시 서재/도서관 씬 이미지 즉시 표시 확인

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | `http://localhost:8001` 접속 | 프로필 선택 화면 표시 |
| 2 | "서사꾼" 버튼 클릭 | 게임 화면 전환 |
| 3 | Scene Canvas 확인 | 서재/도서관 이미지 **즉시** 표시 (placeholder 아님) |
| 4 | 이미지 URL 확인 (DevTools) | `/ui/scenes/scene-narrator-start.webp` |

**확인 포인트**:
- ✅ 이미지가 placeholder 없이 즉시 표시됨
- ✅ 다크 판타지 분위기의 서재 이미지
- ✅ CRT 테마와 자연스러운 조화

---

### 시나리오 B: 탐험가(Explorer) 프로필 첫 씬 이미지

**목적**: 프로필 시작 시 동굴 입구 씬 이미지 즉시 표시 확인

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | 새로고침 (F5) | 프로필 선택 화면 복귀 |
| 2 | "탐험가" 버튼 클릭 | 게임 화면 전환 |
| 3 | Scene Canvas 확인 | 동굴 입구 이미지 **즉시** 표시 |
| 4 | 이미지 URL 확인 (DevTools) | `/ui/scenes/scene-explorer-start.webp` |

**확인 포인트**:
- ✅ 동굴 입구 + 횃불 + 안개 분위기
- ✅ 서사꾼 이미지와 다른 고유한 장면

---

### 시나리오 C: 기술 전문가(Tech) 프로필 첫 씬 이미지

**목적**: 프로필 시작 시 실험실 씬 이미지 즉시 표시 확인

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | 새로고침 (F5) | 프로필 선택 화면 복귀 |
| 2 | "기술 전문가" 버튼 클릭 | 게임 화면 전환 |
| 3 | Scene Canvas 확인 | 실험실 이미지 **즉시** 표시 |
| 4 | 이미지 URL 확인 (DevTools) | `/ui/scenes/scene-tech-start.webp` |

**확인 포인트**:
- ✅ 다크 사이파이 실험실 분위기 (홀로그램, 네온)
- ✅ 다른 프로필 이미지와 구별되는 고유 장면

---

### 시나리오 D: 이미지 파일 크기 검증

**목적**: PRD 9.7 에셋 예산 준수 확인

```bash
# 각 이미지 파일 크기 확인
magick identify frontend/public/ui/scenes/scene-narrator-start.webp
magick identify frontend/public/ui/scenes/scene-explorer-start.webp
magick identify frontend/public/ui/scenes/scene-tech-start.webp
```

**기대 결과**:
| 이미지 | 크기 | 파일 용량 | 예산 |
|--------|------|-----------|------|
| scene-narrator-start.webp | 1280x768 | ~72KB | < 200KB ✅ |
| scene-explorer-start.webp | 1280x768 | ~57KB | < 200KB ✅ |
| scene-tech-start.webp | 1280x768 | ~78KB | < 200KB ✅ |
| **합계** | - | **~207KB** | < 600KB ✅ |

---

### 시나리오 E: 리셋 후 이미지 복원

**목적**: 리셋 시 사전 이미지가 다시 표시되는지 확인

| 단계 | 행동 | 기대 결과 |
|------|------|-----------|
| 1 | 프로필 선택 → 게임 시작 | 첫 씬 이미지 표시 |
| 2 | (게임 플레이 후) 리셋 버튼 클릭 | "다시 클릭하여 확인" |
| 3 | 리셋 확인 클릭 | 프로필 초기 상태로 복원 |
| 4 | Scene Canvas 확인 | 해당 프로필의 사전 이미지 다시 표시 |

---

## 4. 실행 결과 확인

### 4.1 에셋 파일 존재 확인

- `frontend/public/ui/scenes/scene-narrator-start.webp` — 서사꾼 첫 씬
- `frontend/public/ui/scenes/scene-explorer-start.webp` — 탐험가 첫 씬
- `frontend/public/ui/scenes/scene-tech-start.webp` — 기술 전문가 첫 씬

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ 3종 프로필 각각에 고유한 첫 씬 이미지 즉시 표시
- ✅ 각 이미지 200KB 이하, 합산 600KB 이하
- ✅ CRT 테마와 조화로운 다크 판타지/로그라이크 스타일
- ✅ 리셋 시 사전 이미지 복원

**실패 시 확인**:
- ❌ placeholder(기본 상태) 표시됨 → `demoProfiles.ts`의 `initialSceneImageUrl` 확인
- ❌ 이미지 깨짐 → `frontend/public/ui/scenes/` 디렉토리 파일 존재 확인
- ❌ 콘솔 에러 → `sessionLifecycle.ts`의 sceneState 설정 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 이미지가 표시되지 않는 경우

**오류**: Scene Canvas에 placeholder가 표시됨

- **원인**: `initialSceneImageUrl` 필드 누락 또는 경로 오류
- **해결**:
  1. `frontend/src/data/demoProfiles.ts`에서 해당 프로필의 `initialSceneImageUrl` 확인
  2. `frontend/public/ui/scenes/` 디렉토리에 파일 존재 확인
  3. 브라우저 네트워크 탭에서 이미지 요청 상태 확인 (404 등)

### 5.2 이미지 로딩이 느린 경우

**오류**: 이미지 표시까지 지연 발생

- **원인**: 로컬 정적 파일이므로 일반적으로 즉시 로딩됨. 네트워크 환경 확인.
- **해결**: 브라우저 캐시 확인, 파일 크기 확인 (200KB 이하여야 함)

---

## 6. 변경 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/public/ui/scenes/scene-narrator-start.webp` | **신규** — 서사꾼 첫 씬 이미지 |
| `frontend/public/ui/scenes/scene-explorer-start.webp` | **신규** — 탐험가 첫 씬 이미지 |
| `frontend/public/ui/scenes/scene-tech-start.webp` | **신규** — 기술 전문가 첫 씬 이미지 |
| `frontend/src/data/demoProfiles.ts` | `DemoProfileInitialState`에 `initialSceneImageUrl` 필드 추가 |
| `frontend/src/save/sessionLifecycle.ts` | `startSessionFromProfile()`에서 sceneState에 이미지 URL 설정 |
| `frontend/public/ui/manifest.json` | 3종 씬 에셋 등록 |
