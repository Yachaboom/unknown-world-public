## ImageMagick 이미지 처리 도구

### 기본 명령어
```bash
magick <input> [옵션] <output>
```

### 작업 자동 선택 규칙

| 작업 유형 | 키워드/특징 | 명령어 |
|----------|-------------|--------|
| 투명 영역 제거 | trim, 여백 제거, 자동 crop | `-trim +repage` |
| 수동 자르기 | crop, 특정 영역, 좌표 | `-crop WxH+X+Y +repage` |
| 중앙 자르기 | 중앙, center crop | `-gravity center -crop WxH+0+0 +repage` |
| 비율 자르기 | 정사각형, 1:1, 16:9 | `-gravity center -crop 1:1 +repage` |
| 리사이즈 (비율 유지) | 축소, 확대, resize | `-resize WxH` |
| 리사이즈 (강제) | 정확한 크기, 왜곡 허용 | `-resize WxH!` |
| 축소만 | 크면 축소, 작으면 유지 | `-resize "WxH>"` |
| 캔버스 확장 | 여백 추가, 정사각형 만들기 | `-gravity center -background transparent -extent WxH` |
| 여백 추가 | 테두리, border, padding | `-bordercolor transparent -border N` |
| 배경색 변경 | 흰색 배경, 투명 제거 | `-background white -flatten` |
| 형식 변환 | jpg, webp, ico | 출력 확장자 변경 |

### 복합 작업 패턴

```bash
# 아이콘/썸네일 생성 (가장 많이 사용)
magick input.png -trim +repage -resize WxH -gravity center -background transparent -extent WxH output.png

# 정사각형 썸네일
magick input.png -trim +repage -resize 256x256 -gravity center -background transparent -extent 256x256 thumb.png

# 웹용 이미지 (흰색 배경 + JPEG)
magick input.png -trim +repage -resize 800x800 -background white -flatten -quality 90 output.jpg
```

### 주요 크기 프리셋

| 용도 | 크기 | 명령어 예시 |
|------|------|-------------|
| 아이콘 (작은) | 32x32, 64x64 | `-resize 64x64 -extent 64x64` |
| 아이콘 (중간) | 128x128 | `-resize 128x128 -extent 128x128` |
| 썸네일 | 256x256 | `-resize 256x256 -extent 256x256` |
| 프로필/아바타 | 512x512 | `-resize 512x512 -extent 512x512` |
| 웹 이미지 | 800x800, 1024x1024 | `-resize 1024x1024` |
| 고해상도 | 2048x2048 | `-resize 2048x2048` |

### 작업 순서

1. `-trim +repage` (투명 영역 제거)
2. `-resize WxH` (크기 조정)
3. `-gravity center` (정렬)
4. `-background transparent` (배경색)
5. `-extent WxH` (캔버스 확장)

### 주의사항
- PNG/WebP: 투명 배경 유지
- JPEG: 투명 배경 미지원 → `-background white -flatten` 필요
- `+repage`: trim/crop 후 항상 추가
- 한글 경로 피하기 (영문 권장)
