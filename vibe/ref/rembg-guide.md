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
| 애니메이션/일러스트/캐릭터/만화/웹툰/게임 캐릭터 | anime, character, illustration, cartoon, 캐릭터, 일러스트 | `isnet-anime` | |
| 실사 인물/초상화/셀카/프로필 | portrait, photo, selfie, 인물, 사진 | `birefnet-portrait` | `-a` (머리카락) |
| 인물 전신/단체 사진 | human, people, person, 사람 | `u2net_human_seg` | `-a` |
| 의류/패션/옷 | clothing, fashion, 옷, 의류 | `u2net_cloth_seg` | |
| 제품/오브젝트/사물 | product, object, item, 제품, 물건 | `birefnet-general` | |
| 복잡한 배경/고해상도 | complex, detailed, high-res | `birefnet-dis` | |
| 속도 우선/대량 처리 | fast, batch, quick, 빠르게 | `u2netp` | |
| 일반/불명확 | 기타 | `u2net` | |

### 모델 선택 우선순위

1. **사용자가 모델 명시** → 해당 모델 사용
2. **이미지 유형 키워드 감지** → 위 표에 따라 자동 선택
3. **애니메이션/캐릭터 관련** → `isnet-anime`
4. **인물/사진 관련** → `birefnet-portrait` + `-a`
5. **불명확** → `u2net` (기본)

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
