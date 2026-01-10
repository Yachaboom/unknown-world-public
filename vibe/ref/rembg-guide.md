## rembg 배경 제거 도구

### 기본 명령어
```bash
rembg i [옵션] <input> <o>              # 단일 이미지
rembg p [옵션] <input_dir> <output_dir>  # 폴더 일괄
rembg d <model>                           # 모델 다운로드
```

### 모델 자동 선택 규칙

이미지 유형을 분석하여 최적의 모델을 자동 선택하세요:

| 이미지 유형 | 키워드/특징 | 모델 | 추가 옵션 |
|------------|-------------|------|-----------|
| 애니메이션/일러스트/캐릭터/만화/웹툰/게임 캐릭터 | anime, character, illustration, cartoon, 캐릭터, 일러스트, 만화 | `isnet-anime` | |
| 실사 인물 초상화/셀카/프로필/증명사진 | portrait, selfie, headshot, 초상화, 셀카, 프로필 | `birefnet-portrait` | `-a` |
| 인물 전신/단체 사진/사람 | human, people, person, full body, 사람, 전신 | `u2net_human_seg` | `-a` |
| 의류/패션/옷/코디 | clothing, fashion, outfit, apparel, 옷, 의류, 패션 | `u2net_cloth_seg` | |
| 제품/오브젝트/사물/상품 | product, object, item, 제품, 물건, 상품 | `birefnet-general` | |
| 복잡한 배경/고해상도/디테일 | complex, detailed, high-res, intricate, 복잡한, 고해상도 | `birefnet-dis` | |
| 최고 품질 필요/중요한 작업 | best quality, important, professional, 최고품질, 중요 | `birefnet-massive` | |
| 속도 우선/대량 처리/빠르게 | fast, batch, quick, speed, 빠르게, 대량 | `u2netp` | |
| 경량/저사양/메모리 절약 | lightweight, low memory, 경량, 저사양 | `silueta` | |
| 범용/신형/개선된 품질 | general, improved, better, 범용, 개선 | `isnet-general-use` | |
| 상용급 품질/BRIA | commercial, bria, professional grade | `bria-rmbg` | |
| 복잡한 객체/프롬프트 기반/고급 | segment anything, complex object, advanced | `sam` | |
| 일반/불명확/기본 | 기타 | `u2net` | |

### 모델 선택 우선순위

1. **사용자가 모델 명시** → 해당 모델 사용
2. **이미지 유형 키워드 감지** → 위 표에 따라 자동 선택
3. **애니메이션/캐릭터 관련** → `isnet-anime`
4. **인물/사진 관련** → `birefnet-portrait` + `-a`
5. **제품/오브젝트** → `birefnet-general`
6. **속도 우선** → `u2netp`
7. **불명확** → `u2net` (기본)

### 모델 선택 플로우차트

```
이미지 유형 판단
    │
    ├─ 애니/캐릭터/일러스트? ──→ isnet-anime
    │
    ├─ 실사 인물?
    │      ├─ 얼굴/초상화 ──→ birefnet-portrait + -a
    │      ├─ 전신/단체 ──→ u2net_human_seg + -a
    │      └─ 의류 중심 ──→ u2net_cloth_seg
    │
    ├─ 제품/오브젝트?
    │      ├─ 일반 ──→ birefnet-general
    │      ├─ 복잡한 배경 ──→ birefnet-dis
    │      └─ 최고 품질 ──→ birefnet-massive
    │
    ├─ 속도 우선? ──→ u2netp 또는 silueta
    │
    └─ 불명확 ──→ u2net (기본)
```

### Alpha Matting (-a 옵션) 사용 기준

다음 경우 `-a` 옵션 추가:
- 인물 사진 (머리카락 경계)
- 동물 사진 (털 경계)
- 복잡한 경계가 있는 이미지

다음 경우 `-a` 옵션 제외:
- 애니메이션/일러스트 (이미 선명한 경계)
- 단순한 오브젝트
- 속도가 중요한 경우

### 출력 파일명 규칙
- 원본: `image.png`
- 출력: `image_transparent.png` 또는 `image_nobg.png`
- 폴더: 원본과 다른 폴더에 저장 권장

### 사용 예시

```bash
# 애니메이션 캐릭터
rembg i -m isnet-anime character.png character_transparent.png

# 인물 사진 (alpha matting)
rembg i -a -m birefnet-portrait photo.jpg photo_transparent.png

# 제품 사진
rembg i -m birefnet-general product.jpg product_transparent.png

# 빠른 처리
rembg i -m u2netp input.png output.png

# 폴더 일괄 처리
rembg p -m isnet-anime ./characters/ ./transparent/
```

### 주의사항
- 한글 경로 피하기 (영문 경로 권장)
- 지원 형식: PNG, JPG, JPEG, WEBP
- 첫 실행 시 모델 자동 다운로드 (100~200MB)
- 모델 다운로드 실패 시: `rembg d <model>`로 수동 다운로드
