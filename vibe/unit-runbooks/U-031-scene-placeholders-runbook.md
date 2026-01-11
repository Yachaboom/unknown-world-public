# U-031[Mvp] Scene Canvas Placeholder Pack 실행 가이드

## 1. 개요

nanobanana mcp를 사용하여 Scene Canvas 및 주요 시스템 상태에 대한 게임스러운 placeholder 에셋을 제작하고 UI에 적용한 유닛입니다.

**구현 항목**:
- 4종 상태 placeholder 에셋: `loading`, `offline`, `blocked`, `low-signal`
- SceneCanvas 컴포넌트 (상태별 분기 렌더링)
- 텍스트 폴백 및 이미지 로드 실패 대응

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-030 (에셋 SSOT), U-004 (Scene Canvas/UI 골격)
- 선행 완료 필요: 백엔드 실행 필요 (오프라인 상태 제외)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 개발 서버 실행

```bash
pnpm run dev
```

### 2.3 브라우저 접속

- URL: http://localhost:8001/
- Scene Canvas에 기본 placeholder가 표시되어야 합니다

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 기본(DEFAULT) 상태

**목적**: 초기 로딩 시 기본 placeholder 표시 확인

**실행**:
1. 브라우저에서 http://localhost:8001/ 접속

**기대 결과**:
- Scene Canvas에 CRT 스타일 풍경 placeholder 표시
- "📡 전역 데이터 동기화 대기 중..." 텍스트 오버레이

**확인 포인트**:
- ✅ placeholder 이미지가 로드됨 (`/ui/placeholders/scene-placeholder-default.png`)
- ✅ 텍스트 오버레이가 이미지 위에 표시됨
- ✅ CRT 테마 (인광 녹색, 스캔라인) 유지

---

### 시나리오 B: 로딩(LOADING) 상태

**목적**: 액션 실행 중 로딩 placeholder 표시 확인

**실행**:
1. 백엔드 서버 실행 (`cd backend && uv run uvicorn unknown_world.main:app --port 8000`)
2. 액션 카드(탐색하기 등) 클릭

**기대 결과**:
- Scene Canvas가 로딩 placeholder로 전환
- "⏳ 데이터 로딩 중..." 텍스트 표시
- Agent Console에 PROCESSING 상태 표시

**확인 포인트**:
- ✅ `/ui/placeholders/scene-loading.webp` 이미지 표시
- ✅ 스트리밍 완료 후 기본 상태로 복귀

---

### 시나리오 C: 오프라인(OFFLINE) 상태

**목적**: 백엔드 연결 실패 시 오프라인 placeholder 표시 확인

**전제 조건**:
- 백엔드 서버가 실행되지 않은 상태

**실행**:
1. 백엔드 서버 중지
2. 액션 카드 클릭 또는 페이지 새로고침

**기대 결과**:
- Scene Canvas에 오프라인 placeholder 표시
- "🔌 연결 끊김" 텍스트 표시
- HUD에 "OFFLINE" 상태 표시

**확인 포인트**:
- ✅ `/ui/placeholders/scene-offline.webp` 이미지 표시
- ✅ isConnected가 false로 전환됨

---

### 시나리오 D: 이미지 로드 실패 폴백

**목적**: placeholder 이미지 로드 실패 시 텍스트 폴백 표시 확인

**실행**:
1. 개발자 도구(F12) > Network 탭
2. WebP 파일 요청 차단
3. 페이지 새로고침

**기대 결과**:
- 이미지가 숨겨지고 텍스트만 표시
- 폴백 이모지 + 라벨 텍스트 유지

**확인 포인트**:
- ✅ `.scene-placeholder-img` 요소에 `hidden` 클래스 추가됨
- ✅ 텍스트 폴백이 가독성 있게 표시됨

---

### 시나리오 E: Readable 모드

**목적**: Readable 모드에서 placeholder 투명도 감소 확인

**실행**:
1. 헤더의 "◉ READ" 버튼 클릭하여 Readable 모드 토글

**기대 결과**:
- placeholder 이미지 투명도가 0.3으로 감소
- 텍스트 가독성 향상

**확인 포인트**:
- ✅ `html[data-readable='true']` 적용됨
- ✅ 이미지가 희미해지고 텍스트가 더 잘 보임

---

## 4. 에셋 파일 확인

### 4.1 생성된 에셋

| 파일명 | 크기 | 용도 |
|--------|------|------|
| `scene-loading.webp` | ~24KB | 로딩 상태 |
| `scene-offline.webp` | ~30KB | 오프라인 상태 |
| `scene-blocked.webp` | ~31KB | 차단 상태 |
| `scene-low-signal.webp` | ~10KB | 저신호 상태 |

### 4.2 에셋 검증

```bash
# 파일 크기 확인 (200KB 이하)
ls -lh frontend/public/ui/placeholders/scene-*.webp

# manifest.json 검증
cat frontend/public/ui/manifest.json | jq '.assets[] | select(.id | startswith("scene-"))'
```

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: placeholder 이미지가 표시되지 않음
- **원인**: 파일 경로 불일치 또는 파일 누락
- **해결**: `frontend/public/ui/placeholders/` 디렉토리 확인

**오류**: 스타일이 적용되지 않음
- **원인**: CSS 캐시 문제
- **해결**: 브라우저 강력 새로고침 (Ctrl+Shift+R)

**오류**: 상태 전환이 작동하지 않음
- **원인**: zustand 스토어 상태 불일치
- **해결**: React DevTools로 상태 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 `/` 사용 필수 (URL 경로)
- **macOS/Linux**: 특이사항 없음

---

## 6. 코드 구조

### 6.1 주요 파일

- `frontend/src/App.tsx`:
  - `SceneCanvasStatus` enum 정의
  - `SCENE_PLACEHOLDERS` 매핑 객체
  - `SceneCanvas` 컴포넌트

- `frontend/src/style.css`:
  - `.scene-canvas` 스타일
  - `.scene-placeholder-img` / `.scene-placeholder-text` 스타일
  - 상태별 CSS 클래스

- `frontend/public/ui/manifest.json`:
  - 4종 placeholder 에셋 등록

### 6.2 상태 전환 로직

```
isStreaming=true  →  SceneCanvasStatus.LOADING
isConnected=false →  SceneCanvasStatus.OFFLINE
(기본)           →  SceneCanvasStatus.DEFAULT
```

> BLOCKED, LOW_SIGNAL 상태는 향후 에러 처리/API 응답에 따라 확장 예정
