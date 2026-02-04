# U-084[Mvp]: 이미지 생성 최적화 - 픽셀 스타일 + 사이즈 축소 + Scene 영역 높이 조정

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-084[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 60분                              |
| 의존성    | U-066[Mvp], U-049[Mvp]            |
| 우선순위  | High (이미지 생성 속도 + UI 개선) |

## 작업 목표

이미지 생성 프롬프트에 **픽셀 아트 스타일**을 적용하고 **출력 사이즈를 축소**하여 생성 속도를 높이며, **Scene Canvas 영역 높이를 줄이고 턴 로그(NarrativeFeed) 높이를 늘려** 텍스트 가독성을 향상시킨다.

**배경**: 현재 이미지 생성은 높은 해상도와 일반적인 일러스트 스타일로 10-20초가 소요된다. 픽셀 아트 스타일로 전환하면 (1) 레트로 게임 분위기와 CRT 테마에 부합하고, (2) 낮은 해상도에서도 품질이 유지되어 생성 속도가 빨라진다. 또한 Scene 영역이 너무 크면 내러티브 텍스트가 스크롤 없이 보이지 않아 게임 흐름을 따라가기 어렵다.

**완료 기준**:

- 이미지 생성 프롬프트에 **픽셀 아트 스타일 지시**가 포함됨
- 이미지 출력 사이즈가 **기존 대비 축소**됨 (예: 1024x1024 → 512x512)
- Scene Canvas 영역 **높이가 줄어들고** NarrativeFeed 영역이 확대됨
- 이미지 생성 시간이 **체감상 빨라짐** (목표: 평균 8초 이내)
- 픽셀 아트 스타일이 CRT 테마와 조화를 이룸

## 영향받는 파일

**수정**:

- `backend/prompts/image/scene_prompt.ko.md` - 픽셀 아트 스타일 지시 추가
- `backend/prompts/image/scene_prompt.en.md` - 픽셀 아트 스타일 지시 추가
- `backend/src/unknown_world/services/image_generation.py` - 출력 사이즈 조정
- `backend/src/unknown_world/config/models.py` - 이미지 사이즈 상수 추가
- `frontend/src/components/SceneImage.tsx` - Scene 영역 높이 조정
- `frontend/src/components/NarrativeFeed.tsx` - 높이 확대 적용
- `frontend/src/style.css` - Scene/NarrativeFeed 레이아웃 CSS

**참조**:

- `vibe/unit-plans/U-066[Mvp].md` - 이미지 생성 지연 흡수 플로우
- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계 원칙
- `vibe/ref/image-generate-guide.md` - 이미지 생성 가이드

## 구현 흐름

### 1단계: 이미지 프롬프트 픽셀 스타일 적용

- `scene_prompt.ko.md` / `scene_prompt.en.md`에 픽셀 아트 스타일 지시 추가

```markdown
<!-- backend/prompts/image/scene_prompt.ko.md -->
<prompt_body>
**스타일 지시**:
- 16비트 픽셀 아트 스타일로 장면을 묘사합니다
- 제한된 컬러 팔레트 (32색 이내)
- 도트 그래픽 특유의 선명한 외곽선
- 레트로 게임 분위기 (90년대 RPG 스타일)
- 디더링 효과 최소화

**장면 묘사**:
{scene_description}
</prompt_body>
```

```markdown
<!-- backend/prompts/image/scene_prompt.en.md -->
<prompt_body>
**Style Instructions**:
- Render the scene in 16-bit pixel art style
- Limited color palette (32 colors or less)
- Sharp pixel outlines characteristic of dot graphics
- Retro game atmosphere (90s RPG style)
- Minimal dithering effects

**Scene Description**:
{scene_description}
</prompt_body>
```

### 2단계: 이미지 출력 사이즈 축소

- `image_generation.py`에서 기본 출력 사이즈 변경
- 사이즈 옵션 상수화

```python
# backend/src/unknown_world/config/models.py
IMAGE_SIZE_FAST = "512x512"      # 픽셀 아트용 (빠른 생성)
IMAGE_SIZE_STANDARD = "768x768"  # 표준
IMAGE_SIZE_QUALITY = "1024x1024" # 고품질

DEFAULT_IMAGE_SIZE = IMAGE_SIZE_FAST  # 기본값 변경
```

```python
# backend/src/unknown_world/services/image_generation.py
async def generate_image(
    prompt: str,
    size: str = DEFAULT_IMAGE_SIZE,  # 512x512 기본
    ...
):
    ...
```

### 3단계: Scene Canvas 높이 축소

- Scene 영역의 max-height 줄이기
- 이미지가 작아져도 핫스팟 좌표는 0~1000 정규화이므로 영향 없음

```css
/* frontend/src/style.css */
.scene-canvas {
  max-height: 280px;  /* 기존 400px → 280px */
  overflow: hidden;
}

.scene-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;  /* 픽셀 아트 선명하게 */
}
```

### 4단계: NarrativeFeed 높이 확대

- Scene 영역이 줄어든 만큼 NarrativeFeed 영역 확대
- 스크롤 없이 더 많은 텍스트가 보이도록

```css
/* frontend/src/style.css */
.narrative-feed {
  min-height: 200px;  /* 기존 120px → 200px */
  max-height: 320px;  /* 기존 240px → 320px */
  flex-grow: 1;
}
```

### 5단계: 레이아웃 비율 조정

- 메인 영역의 Scene / NarrativeFeed 비율 재조정
- 권장: Scene 40% / NarrativeFeed 60% (기존 60/40)

```css
.main-content {
  display: flex;
  flex-direction: column;
}

.scene-area {
  flex: 0 0 40%;
  max-height: 280px;
}

.narrative-area {
  flex: 1 1 60%;
  min-height: 200px;
}
```

### 6단계: 픽셀 이미지 렌더링 최적화

- `image-rendering: pixelated` CSS 속성으로 확대 시 픽셀이 선명하게 보이도록
- 작은 이미지를 확대해도 흐릿해지지 않음

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-066[Mvp]](U-066[Mvp].md) - 이미지 생성 지연 흡수 플로우, 모델 티어링
- **계획서**: [U-049[Mvp]](U-049[Mvp].md) - 레이아웃/스크롤 설계 원칙

**다음 작업에 전달할 것**:

- CP-MVP-03: 빠른 이미지 생성 + 픽셀 스타일의 데모 루프 검증
- U-068: 이미지 연결성에서 픽셀 스타일 일관성 유지

## 주의사항

**기술적 고려사항**:

- (RULE-009) 핫스팟 좌표는 0~1000 정규화이므로 이미지 사이즈 변경에 영향 없음
- (RULE-006) 프롬프트 스타일 지시도 언어별로 분리 (ko/en)
- 픽셀 아트 스타일이 모든 장면에 적합한지 검토 (복잡한 장면에서는 디테일 손실 가능)
- `image-rendering: pixelated`는 일부 브라우저에서 `crisp-edges`로 대체 필요

**잠재적 리스크**:

- 픽셀 아트 스타일이 모델에 따라 품질 편차가 있을 수 있음 → FAST/QUALITY 모델별 테스트
- 너무 작은 이미지(256x256 이하)는 핫스팟 클릭 영역이 좁아질 수 있음 → 최소 512x512 유지
- Scene 영역이 너무 작으면 핫스팟 식별이 어려울 수 있음 → min-height 보장

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 기본 이미지 사이즈는?
  - Option A: **512x512** (빠른 생성 + 픽셀 아트 최적)
  - Option B: 768x768 (밸런스)
  - Option C: 재화/정책에 따라 동적 선택

- [ ] **Q2**: 픽셀 아트 스타일 강도는?
  - Option A: **16비트 스타일** (선명한 픽셀, 제한된 팔레트)
  - Option B: 32비트 스타일 (더 부드러운 그라데이션)
  - Option C: 사용자 선택 가능 (설정 메뉴)

- [ ] **Q3**: Scene/NarrativeFeed 비율?
  - Option A: **Scene 40% / NarrativeFeed 60%**
  - Option B: Scene 50% / NarrativeFeed 50%
  - Option C: 반응형 (뷰포트 높이에 따라 동적)

- [ ] **Q4**: 기존 고해상도 옵션 유지?
  - Option A: 제거 (모두 픽셀 스타일로 통일)
  - Option B: QUALITY 옵션으로 유지 (재화 소모 증가)
  - Option C: MMP에서 재검토

## 참고 자료

- `vibe/unit-plans/U-066[Mvp].md` - 이미지 생성 지연 흡수 플로우
- `vibe/unit-plans/U-049[Mvp].md` - 레이아웃/스크롤 설계
- `vibe/ref/image-generate-guide.md` - 이미지 생성 가이드
- `vibe/prd.md` 9.1절 - CRT 터미널 레트로 미학
- [CSS image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering)
