# U-092 기본 초기 아이템 아이콘 프리셋 이미지 실행 가이드

## 1. 개요

데모 프로필의 초기 아이템 11종과 자주 등장하는 공통 아이템 15종(총 26종)에 대해 nanobanana-mcp로 사전 제작한 64x64 픽셀 아트 아이콘 PNG를 `frontend/public/ui/items/`에 정적 에셋으로 배치했습니다. 게임 시작 시 아이콘이 즉시 표시되며, 동적 생성 지연이 없습니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-075[Mvp] (아이콘 표시 로직, icon_url 필드), U-091[Mvp] (rembg 런타임 제거)
- 선행 완료 필요: 프론트엔드 `pnpm install` 완료

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd d:\Dev\unknown-world\frontend
pnpm install
```

### 2.2 개발 서버 시작

```bash
cd d:\Dev\unknown-world\frontend
pnpm dev
```

### 2.3 프리셋 아이콘 확인

1. 브라우저에서 `http://localhost:8001/` 접속
2. **localStorage 초기화** (기존 세이브 데이터가 있을 경우):
   - DevTools Console → `localStorage.clear()` 실행 → 새로고침
3. 프로필 선택 화면에서 아무 프로필 선택
4. 인벤토리 패널에서 아이콘 이미지가 즉시 표시되는지 확인

---

## 3. 검증 시나리오

### 3.1 시나리오 1: 서사꾼(Narrator) 프로필 아이콘 확인

| 단계 | 동작                         | 예상 결과                                                  |
| ---- | ---------------------------- | ---------------------------------------------------------- |
| 1    | 서사꾼 프로필 선택            | 게임 화면 로딩                                             |
| 2    | 인벤토리 패널 확인            | 3개 아이템 표시: 고대 서책, 깃펜, 기억 조각 x3             |
| 3    | 각 아이템 아이콘 확인         | 이모지 대신 **픽셀 아트 이미지**가 표시됨                   |
| 4    | DevTools Network 탭 확인      | 아이콘 동적 생성 API 호출 없음                              |

**아이콘 파일 경로**:
- 고대 서책: `/ui/items/ancient-tome-64.png`
- 깃펜: `/ui/items/quill-pen-64.png`
- 기억 조각: `/ui/items/memory-fragment-64.png`

### 3.2 시나리오 2: 탐험가(Explorer) 프로필 아이콘 확인

| 단계 | 동작                         | 예상 결과                                                  |
| ---- | ---------------------------- | ---------------------------------------------------------- |
| 1    | 탐험가 프로필 선택            | 게임 화면 로딩                                             |
| 2    | 인벤토리 패널 확인            | 4개 아이템 표시: 나침반, 밧줄 x2, 랜턴, 지도 조각          |
| 3    | 각 아이템 아이콘 확인         | 이모지 대신 **픽셀 아트 이미지**가 표시됨                   |
| 4    | DevTools Console 확인         | 에러/경고 없음                                              |

**아이콘 파일 경로**:
- 나침반: `/ui/items/compass-64.png`
- 밧줄: `/ui/items/rope-64.png`
- 랜턴: `/ui/items/lantern-64.png`
- 지도 조각: `/ui/items/map-fragment-64.png`

### 3.3 시나리오 3: 기술 전문가(Tech Expert) 프로필 아이콘 확인

| 단계 | 동작                         | 예상 결과                                                  |
| ---- | ---------------------------- | ---------------------------------------------------------- |
| 1    | 기술 전문가 프로필 선택       | 게임 화면 로딩                                             |
| 2    | 인벤토리 패널 확인            | 4개 아이템 표시: 데이터 코어, 회로 기판 x2, 에너지 셀 x3, 스캐너 장치 |
| 3    | 각 아이템 아이콘 확인         | 이모지 대신 **픽셀 아트 이미지**가 표시됨                   |

**아이콘 파일 경로**:
- 데이터 코어: `/ui/items/data-core-64.png`
- 회로 기판: `/ui/items/circuit-board-64.png`
- 에너지 셀: `/ui/items/energy-cell-64.png`
- 스캐너 장치: `/ui/items/scanner-device-64.png`

### 3.4 시나리오 4: 프리셋과 동적 생성 공존 확인

| 단계 | 동작                         | 예상 결과                                                  |
| ---- | ---------------------------- | ---------------------------------------------------------- |
| 1    | 아무 프로필 시작              | 초기 아이템 프리셋 아이콘 즉시 표시                        |
| 2    | DevTools에서 `img` 태그 확인  | `src`가 `/ui/items/xxx-64.png` 형식                        |
| 3    | Zustand 상태 확인 (선택)     | `iconStatus: 'completed'` (프리셋 아이템)                  |

**DevTools 검증 스크립트**:
```javascript
// 인벤토리 아이콘 img 태그 확인
document.querySelectorAll('.inventory-item-icon img').forEach(img => {
  console.log(`${img.alt}: ${img.src} (${img.naturalWidth}x${img.naturalHeight}, loaded: ${img.complete})`);
});
```

### 3.5 시나리오 5: 에셋 무결성 확인

```bash
# 에셋 파일 존재 확인
ls -la frontend/public/ui/items/*.png | wc -l
# 예상 결과: 26개 파일

# 각 파일 크기 확인 (20KB 이하)
ls -la frontend/public/ui/items/*.png
# 예상 결과: 모든 파일 20,480 bytes 이하
```

---

## 4. 프리셋 아이콘 전체 목록 (26종)

### 4.1 초기 프로필 아이템 (11종)

| 아이템 ID        | 한국어 이름  | 파일명                    | 프로필            |
| ---------------- | ------------ | ------------------------- | ----------------- |
| ancient-tome     | 고대 서책    | ancient-tome-64.png       | 서사꾼            |
| quill-pen        | 깃펜         | quill-pen-64.png          | 서사꾼            |
| memory-fragment  | 기억 조각    | memory-fragment-64.png    | 서사꾼            |
| compass          | 나침반       | compass-64.png            | 탐험가            |
| rope             | 밧줄         | rope-64.png               | 탐험가            |
| lantern          | 랜턴         | lantern-64.png            | 탐험가            |
| map-fragment     | 지도 조각    | map-fragment-64.png       | 탐험가            |
| data-core        | 데이터 코어  | data-core-64.png          | 기술 전문가       |
| circuit-board    | 회로 기판    | circuit-board-64.png      | 기술 전문가       |
| energy-cell      | 에너지 셀    | energy-cell-64.png        | 기술 전문가       |
| scanner-device   | 스캐너 장치  | scanner-device-64.png     | 기술 전문가       |

### 4.2 공통 아이템 (15종)

| 아이템 ID         | 한국어 이름  | 파일명                     |
| ----------------- | ------------ | -------------------------- |
| rusty-key         | 녹슨 열쇠    | rusty-key-64.png           |
| healing-potion    | 치유 물약    | healing-potion-64.png      |
| torch             | 횃불         | torch-64.png               |
| shield            | 방패         | shield-64.png              |
| sword             | 검           | sword-64.png               |
| bow               | 활           | bow-64.png                 |
| arrow             | 화살         | arrow-64.png               |
| gold-coin         | 금화         | gold-coin-64.png           |
| gem-stone         | 보석         | gem-stone-64.png           |
| scroll            | 두루마리     | scroll-64.png              |
| lockpick          | 자물쇠 따개  | lockpick-64.png            |
| crystal-orb       | 수정 구슬    | crystal-orb-64.png         |
| iron-ingot        | 철 주괴      | iron-ingot-64.png          |
| magic-wand        | 마법 지팡이  | magic-wand-64.png          |
| mysterious-potion | 미지의 물약  | mysterious-potion-64.png   |

---

## 5. 아키텍처

### 5.1 프리셋 우선순위 로직

```
아이템 ID → itemIconPresets.ts에서 프리셋 URL 조회
  ├── 프리셋 존재 → icon = URL 경로, iconStatus = 'completed' (동적 생성 건너뜀)
  └── 프리셋 없음 → 기존 icon_url/이모지 사용, iconStatus = 'pending' (동적 생성 대기)
```

### 5.2 관련 파일

| 파일                                          | 역할                                      |
| --------------------------------------------- | ----------------------------------------- |
| `frontend/src/data/itemIconPresets.ts`         | 아이템 ID → 프리셋 URL 매핑 레지스트리     |
| `frontend/src/data/demoProfiles.ts`            | SaveGame 생성 시 프리셋 URL을 icon에 설정  |
| `frontend/src/stores/inventoryStore.ts`        | 서버 응답 처리 시 프리셋 우선 적용          |
| `frontend/src/components/InventoryPanel.tsx`   | icon이 URL이면 `<img>`, 아니면 이모지 렌더 |
| `frontend/public/ui/items/`                    | 정적 에셋 디렉토리                         |
| `frontend/public/ui/manifest.json`             | 에셋 메타데이터 등록                       |

### 5.3 아이콘 제작 파이프라인 (Dev-only)

```
1. nanobanana-mcp generate_icon (pixel art, 64x64, white background)
2. rembg 배경 제거 (투명 PNG)
3. ImageMagick trim + resize (정확히 64x64)
4. frontend/public/ui/items/ 에 배치
5. manifest.json 등록
6. itemIconPresets.ts에 매핑 추가
```

---

## 6. 트러블슈팅

### 6.1 아이콘이 이모지로 표시되는 경우

**원인**: 이전 세이브 데이터에 프리셋 경로가 포함되지 않음

**해결**:
```javascript
// DevTools Console에서 실행
localStorage.clear();
location.reload();
```

### 6.2 아이콘이 깨져서 표시되는 경우

**원인**: 파일 경로 불일치 또는 파일 누락

**확인**:
```bash
# 에셋 파일 존재 확인
ls frontend/public/ui/items/

# 특정 파일 직접 접근 테스트
curl -I http://localhost:8001/ui/items/compass-64.png
```

### 6.3 동적 생성이 프리셋을 덮어쓰는 경우

**원인**: `inventoryStore.ts`의 프리셋 우선순위 로직 미적용

**확인**: `itemIconPresets.ts`에 해당 아이템 ID가 등록되어 있는지 확인

### 6.4 Windows에서 후처리 스크립트 실행 시 인코딩 오류

**원인**: cp949 콘솔에서 유니코드 문자 출력 시도

**해결**: `scripts/process_item_icons.py`에서 UTF-8 강제 인코딩 적용 완료

---

## 7. 관련 문서

- [U-075 아이콘 동적 생성 런북](U-075-item-icon-dynamic-runbook.md)
- [U-091 rembg 런타임 제거 런북](U-091-rembg-runtime-removal-runbook.md)
- [nanobanana-mcp 가이드](../../vibe/ref/mcp/nanobanana/nanobanana-mcp.md)
- [에셋 관리 가이드](../../frontend/public/ui/README.md)
