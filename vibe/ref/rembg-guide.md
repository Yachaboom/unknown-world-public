## rembg 배경 제거 도구

> **[중요: 런타임 제거 알림]** (U-091)
> Unknown World 서버 런타임에서 `rembg` 파이프라인이 완전히 제거되었습니다.
> 이제 배경 제거 작업은 **개발 시점(Dev-only)**에 에셋을 제작할 때만 수행하며, 서버 실행 중에는 호출되지 않습니다.
> 실시간 생성 이미지(아이콘 등)는 프롬프트 튜닝이나 프리셋 이미지를 활용하세요.

### 기본 명령어
```bash
rembg i [옵션] <input> <output>          # 단일 이미지
rembg p [옵션] <input_dir> <output_dir>  # 폴더 일괄
rembg d <model>                           # 모델 다운로드
```

---

### 모델 자동 선택 규칙

이미지 유형을 분석하여 최적의 모델을 선택하세요:

| 이미지 유형 | 키워드/특징 | 모델 | 추가 옵션 |
|------------|-------------|------|-----------|
| **UI 아이콘/픽셀 아트/로고/에셋** | icon, pixel art, logo, asset, UI, 아이콘, 로고 | `birefnet-general` | |
| **제품/오브젝트/사물/상품** | product, object, item, 제품, 물건, 상품 | `birefnet-general` | |
| **일본 애니메이션 캐릭터** (명확한 경우만) | anime character, 애니메이션 캐릭터 (셀 애니 스타일) | `isnet-anime` | |
| **게임 캐릭터/일러스트** (애니 스타일) | illustration, cartoon character, 일러스트 | `isnet-anime` | |
| **실사 인물 초상화/셀카/프로필** | portrait, selfie, headshot, 초상화, 셀카 | `birefnet-portrait` | `-a` |
| **인물 전신/단체 사진** | human, people, full body, 사람, 전신 | `u2net_human_seg` | `-a` |
| **의류/패션/옷** | clothing, fashion, outfit, 옷, 의류 | `u2net_cloth_seg` | |
| **복잡한 배경/고해상도** | complex, detailed, high-res, 복잡한, 고해상도 | `birefnet-dis` | |
| **최고 품질 필요** | best quality, professional, 최고품질 | `birefnet-massive` | |
| **속도 우선/대량 처리** | fast, batch, quick, 빠르게, 대량 | `u2netp` | |
| **경량/저사양** | lightweight, low memory, 경량 | `silueta` | |
| **범용/개선된 품질** | general, improved, 범용 | `isnet-general-use` | |
| **일반/불명확** | 기타 | `birefnet-general` | |

---

### 모델 선택 우선순위

1. **사용자가 모델 명시** → 해당 모델 사용
2. **UI 아이콘/로고/픽셀 아트** → `birefnet-general`
3. **제품/오브젝트/일반 사물** → `birefnet-general`
4. **실사 인물/사진** → `birefnet-portrait` + `-a`
5. **일본 애니메이션 스타일 캐릭터** (명확한 경우만) → `isnet-anime`
6. **속도 우선** → `u2netp`
7. **불명확** → `birefnet-general` (기본값)

> **핵심**: 기본값은 `birefnet-general`입니다. `isnet-anime`는 일본 애니메이션 스타일 캐릭터에만 사용하세요.

---

### 모델 선택 플로우차트

```
이미지 유형 판단
    │
    ├─ UI 아이콘/픽셀 아트/로고? ──→ birefnet-general
    │
    ├─ 제품/오브젝트/사물? ──→ birefnet-general
    │      ├─ 복잡한 배경 ──→ birefnet-dis
    │      └─ 최고 품질 ──→ birefnet-massive
    │
    ├─ 실사 인물?
    │      ├─ 얼굴/초상화 ──→ birefnet-portrait + -a
    │      ├─ 전신/단체 ──→ u2net_human_seg + -a
    │      └─ 의류 중심 ──→ u2net_cloth_seg
    │
    ├─ 일본 애니메이션 캐릭터? (셀 애니 스타일)
    │      └─ 명확한 경우만 ──→ isnet-anime
    │
    ├─ 속도 우선? ──→ u2netp 또는 silueta
    │
    └─ 불명확 ──→ birefnet-general (기본값)
```

---

### isnet-anime vs birefnet-general 비교

| 특성 | isnet-anime | birefnet-general |
|------|-------------|------------------|
| **용도** | 일본 애니메이션 캐릭터 | 제품/오브젝트/UI/일반 |
| **특징** | 셀 애니 스타일에 최적화 | 범용적, 안정적 |
| **경계 처리** | 부드러운 경계 보존 | 선명한 경계 유지 |
| **픽셀 아트** | 과도한 투명화 발생 | 적합 |
| **UI 아이콘** | 부적합 | 권장 |
| **기본값** | 아님 | 기본값 |

---

### Alpha Matting (-a 옵션) 사용 기준

다음 경우 `-a` 옵션 추가:
- 인물 사진 (머리카락 경계)
- 동물 사진 (털 경계)
- 복잡한 경계가 있는 이미지

다음 경우 `-a` 옵션 제외:
- 픽셀 아트 / UI 아이콘 (선명한 경계)
- 단순한 오브젝트
- 속도가 중요한 경우

---

### 출력 파일명 규칙

- 원본: `image.png`
- 출력: `image_transparent.png` 또는 `image_nobg.png`
- 폴더: 원본과 다른 폴더에 저장 권장

---

### 사용 예시

```bash
# UI 아이콘
rembg i -m birefnet-general icon.png icon_transparent.png

# 제품 사진
rembg i -m birefnet-general product.jpg product_transparent.png

# 인물 사진 (alpha matting)
rembg i -a -m birefnet-portrait photo.jpg photo_transparent.png

# 일본 애니메이션 캐릭터 (명확한 경우만)
rembg i -m isnet-anime anime_character.png character_transparent.png

# 빠른 처리
rembg i -m u2netp input.png output.png

# 폴더 일괄 처리
rembg p -m birefnet-general ./icons/ ./transparent/
```

---

### 주의사항

- 한글 경로 피하기 (영문 경로 권장)
- 지원 형식: PNG, JPG, JPEG, WEBP
- 첫 실행 시 모델 자동 다운로드 (100~200MB)
- 모델 다운로드 실패 시: `rembg d <model>`로 수동 다운로드
- 픽셀 아트/UI 아이콘에 `isnet-anime` 사용 시 과도한 투명화 발생 가능
