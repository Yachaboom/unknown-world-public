# U-085 이미지 크기를 UI 레이아웃에 맞춤 생성 - 실행 가이드

## 1. 개요

Scene Canvas의 실제 렌더링 크기(px)를 기반으로 이미지 생성 시 최적의 `aspect_ratio`와 `image_size`를 자동 선택하여, 생성된 이미지가 UI에 최대한 맞게(레터박싱 최소화) 표시되도록 합니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-066[Mvp] (이미지 지연 흡수), U-049[Mvp] (레이아웃/스크롤 원칙)
- 참조: `vibe/ref/image-generate-guide.md` (SDK `image_config` SSOT)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd d:\Dev\unknown-world\backend
uv sync
```

```bash
cd d:\Dev\unknown-world\frontend
pnpm install
```

### 2.2 핵심 변경 파일

| 파일 | 변경 유형 | 역할 |
|------|-----------|------|
| `frontend/src/utils/imageSizing.ts` | **신규** | Canvas px → aspect_ratio/image_size 선택 유틸 |
| `frontend/src/stores/worldStore.ts` | 수정 | `sceneCanvasSize` 상태 추가 (SSOT) |
| `frontend/src/components/SceneCanvas.tsx` | 수정 | ResizeObserver → Store 반영 |
| `frontend/src/turn/turnRunner.ts` | 수정 | selectImageSizing 호출 후 startImageGeneration에 전달 |
| `frontend/src/api/image.ts` | 수정 | API 기본값 정합 (1K, 16:9) |
| `backend/src/unknown_world/storage/validation.py` | 수정 | SUPPORTED_IMAGE_SIZES SDK 값 마이그레이션 |
| `backend/src/unknown_world/services/image_generation.py` | 수정 | ImageConfig 적용 |
| `backend/src/unknown_world/api/image.py` | 수정 | API 스키마 + 정규화 |

---

## 3. 수동 테스트 시나리오

### 3.1 백엔드 API 테스트 (curl)

#### 테스트 환경 시작

```bash
# 백엔드 서버 (포트 8011)
cd d:\Dev\unknown-world\backend
uv run uvicorn unknown_world.main:app --port 8011
```

#### TC-1: SDK 이미지 크기 "1K" 정상 수용

```bash
curl -s -X POST http://127.0.0.1:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A dark mysterious cave entrance with glowing crystals","aspect_ratio":"16:9","image_size":"1K","skip_on_failure":true}' \
  | python -m json.tool
```

**기대 결과**: `"success": true`, `"status": "completed"`

#### TC-2: 레거시 픽셀 크기 자동 정규화

```bash
curl -s -X POST http://127.0.0.1:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A glowing forest path at dusk","aspect_ratio":"1:1","image_size":"1024x1024","skip_on_failure":true}' \
  | python -m json.tool
```

**기대 결과**: `"success": true` (레거시 "1024x1024" → "1K"로 정규화)

#### TC-3: 세로 비율 (3:4)

```bash
curl -s -X POST http://127.0.0.1:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A tall ancient tower reaching into the clouds","aspect_ratio":"3:4","image_size":"1K","skip_on_failure":true}' \
  | python -m json.tool
```

**기대 결과**: `"success": true`, `"status": "completed"`

#### TC-4: 잘못된 크기 안전 폴백

```bash
curl -s -X POST http://127.0.0.1:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A mystical waterfall","aspect_ratio":"16:9","image_size":"INVALID","skip_on_failure":true}' \
  | python -m json.tool
```

**기대 결과**: `"success": true` (INVALID → 기본값 "1K"로 폴백)

#### TC-5: 울트라와이드 (21:9)

```bash
curl -s -X POST http://127.0.0.1:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A vast alien desert landscape stretching to the horizon","aspect_ratio":"21:9","image_size":"1K","skip_on_failure":true}' \
  | python -m json.tool
```

**기대 결과**: `"success": true`, `"status": "completed"`

#### TC-6: 세로 극단 (9:16)

```bash
curl -s -X POST http://127.0.0.1:8011/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A towering lighthouse in a storm","aspect_ratio":"9:16","image_size":"1K","skip_on_failure":true}' \
  | python -m json.tool
```

**기대 결과**: `"success": true`, `"status": "completed"`

### 3.2 프론트엔드 유틸 테스트 (Node.js)

```bash
cd d:\Dev\unknown-world\frontend
node -e "
const ASPECT_RATIO_MAP = [
  { ratio: '21:9', value: 21/9 },
  { ratio: '16:9', value: 16/9 },
  { ratio: '3:2', value: 3/2 },
  { ratio: '4:3', value: 4/3 },
  { ratio: '5:4', value: 5/4 },
  { ratio: '1:1', value: 1/1 },
  { ratio: '4:5', value: 4/5 },
  { ratio: '3:4', value: 3/4 },
  { ratio: '2:3', value: 2/3 },
  { ratio: '9:16', value: 9/16 },
];
function selectImageSizing(w, h) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 50 || h < 50) {
    return { aspectRatio: '16:9', imageSize: '1K' };
  }
  const target = w / h;
  let best = ASPECT_RATIO_MAP[0], bestDiff = Math.abs(target - best.value);
  for (let i = 1; i < ASPECT_RATIO_MAP.length; i++) {
    const diff = Math.abs(target - ASPECT_RATIO_MAP[i].value);
    if (diff < bestDiff) { bestDiff = diff; best = ASPECT_RATIO_MAP[i]; }
  }
  return { aspectRatio: best.ratio, imageSize: '1K' };
}
const cases = [
  { w: 800, h: 450, exp: '16:9' },
  { w: 1200, h: 500, exp: '21:9' },
  { w: 600, h: 800, exp: '3:4' },
  { w: 500, h: 500, exp: '1:1' },
  { w: 400, h: 600, exp: '2:3' },
  { w: 0, h: 0, exp: '16:9' },
  { w: NaN, h: 100, exp: '16:9' },
  { w: 1920, h: 1080, exp: '16:9' },
  { w: 768, h: 1024, exp: '3:4' },
];
let p = 0, f = 0;
cases.forEach(c => {
  const r = selectImageSizing(c.w, c.h);
  const ok = r.aspectRatio === c.exp;
  console.log(ok ? 'PASS' : 'FAIL', c.w+'x'+c.h, '->', r.aspectRatio, '(exp:', c.exp+')');
  ok ? p++ : f++;
});
console.log('Total:', p, 'passed,', f, 'failed');
"
```

**기대 결과**: 9/9 PASS

### 3.3 브라우저 통합 테스트 (DevTools Console)

프론트엔드(`localhost:8001`) + 백엔드(`localhost:8011`) 실행 상태에서:

1. **Chrome DevTools 열기** (F12)
2. **Console에서 Scene Canvas 크기 확인:**

```js
// Zustand store에서 sceneCanvasSize 확인
document.querySelector('.scene-canvas')?.getBoundingClientRect()
```

3. **게임 플레이 후 Network 탭 확인:**
   - `/api/image/generate` 요청의 Request Body에서:
     - `aspect_ratio` 값이 UI 비율에 맞는지 확인 (예: 가로 레이아웃 → "16:9")
     - `image_size` 값이 "1K"인지 확인

4. **브라우저 리사이즈 후 재생성:**
   - 브라우저 창 크기 변경 후 새 턴 실행
   - Network 탭에서 `aspect_ratio`가 변경된 비율에 맞게 갱신되었는지 확인

---

## 4. 검증 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| 1 | `selectImageSizing(800, 450)` → `16:9` | ✅ |
| 2 | `selectImageSizing(600, 800)` → `3:4` | ✅ |
| 3 | `selectImageSizing(0, 0)` → 기본값 `16:9` (폴백) | ✅ |
| 4 | 백엔드 `image_size: "1K"` 정상 수용 | ✅ |
| 5 | 레거시 `"1024x1024"` → `"1K"` 자동 정규화 | ✅ |
| 6 | `aspect_ratio: "21:9"/"9:16"/"1:1"/"3:4"` 모두 정상 생성 | ✅ |
| 7 | 잘못된 `image_size` → 기본값 `"1K"` 폴백 | ✅ |
| 8 | `ImageConfig(aspect_ratio, image_size)` 적용 (generate_content 호출) | ✅ |
| 9 | SceneCanvas ResizeObserver → worldStore 반영 | ✅ |
| 10 | turnRunner에서 `selectImageSizing` 호출 후 API 전달 | ✅ |

---

## 5. 트러블슈팅

### 5.1 "지원하지 않는 이미지 크기" 에러

- **원인**: 서버가 이전 코드 캐시를 사용 중
- **해결**: `__pycache__` 삭제 후 서버 재시작

```bash
cd d:\Dev\unknown-world\backend
find . -type d -name "__pycache__" -exec rm -rf {} +
uv run uvicorn unknown_world.main:app --port 8011
```

### 5.2 포트 충돌 (`[Errno 10048]`)

- **원인**: 이전 서버 프로세스가 포트를 점유 중
- **해결**:

```bash
npx --yes kill-port 8011
# 3초 대기 후 서버 재시작
sleep 3 && uv run uvicorn unknown_world.main:app --port 8011
```

### 5.3 Scene Canvas 크기가 0x0

- **원인**: 컴포넌트가 아직 마운트되지 않았거나 CSS 레이아웃 완료 전
- **해결**: `selectImageSizing`에서 `MIN_VALID_DIMENSION(50px)` 미만이면 기본값(16:9@1K) 폴백

---

## 6. 설계 결정 요약

| 질문 | 결정 | 근거 |
|------|------|------|
| Q1: aspect_ratio 충돌 시 우선순위 | **UI 레이아웃 우선** | 레터박싱 최소화, UX 체감 향상 |
| Q2: image_size 스키마 | **SDK 값 (1K/2K/4K)** | Gemini SDK SSOT, 레거시 자동 매핑 |
| MVP image_size 고정 | **1K** | 비용 효율 + 데모 체감 충분 |
| 폴백 전략 | **16:9 + 1K** | 게임 UI 기본 가로 레이아웃 |

---

## 7. 향후 개선 (MMP)

- `image_size` 자동 선택 (Canvas 크기 기반 1K/2K/4K 결정)
- 이미지 프리페치 (다음 턴 예상 비율로 미리 생성)
- 이미지 크롭/리사이즈 후처리 (완벽한 레터박싱 제거)
