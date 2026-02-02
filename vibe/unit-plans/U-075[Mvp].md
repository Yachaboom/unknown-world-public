# U-075[Mvp]: 인벤토리 아이템 아이콘 동적 생성 및 이름 정합성

## 메타데이터

| 항목      | 내용                                      |
| --------- | ----------------------------------------- |
| Unit ID   | U-075[Mvp]                                |
| Phase     | MVP                                       |
| 예상 소요 | 90분                                      |
| 의존성    | U-011[Mvp], U-035[Mvp]                    |
| 우선순위  | ⚡ Critical (아이템 시각화/정합성 핵심)    |

## 작업 목표

새 아이템 획득 시 **아이템 설명을 기반으로 아이콘 이미지를 동적 생성**하고, **배경 투명 처리(rembg)**, **캐싱(동일 아이템 재생성 방지)**, **현재 언어에 따른 아이템 이름 정합성**을 보장한다.

**배경**: 현재 인벤토리 아이템은 placeholder 아이콘 또는 고정 아이콘을 사용하여, 아이템의 실제 모습을 시각적으로 파악하기 어렵다. 아이템 설명 기반으로 아이콘을 동적 생성하면 몰입감이 크게 향상된다. 또한 아이템 이름이 세션 언어와 일치해야 ko/en 혼합 문제가 없다.

**완료 기준**:

- 새 아이템 획득 시 아이템 설명 기반 아이콘 이미지 자동 생성
- 아이콘 사이즈: 64x64 또는 128x128 (설정 가능)
- 배경 투명 처리 (rembg 연동)
- 캐싱: 동일 아이템(동일 설명 해시)은 재생성하지 않음
- 아이템 이름이 현재 세션 언어와 일치 (ko/en 혼합 방지)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/services/item_icon_generator.py` - 아이템 아이콘 생성 서비스
- `backend/src/unknown_world/api/item_icon.py` - 아이콘 생성 API 엔드포인트

**수정**:

- `backend/src/unknown_world/models/turn.py` - `InventoryItem`에 `icon_url` 필드 추가
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 새 아이템 획득 시 아이콘 생성 트리거
- `backend/src/unknown_world/services/image_generation.py` - 아이콘용 이미지 생성 로직 추가
- `frontend/src/components/InventoryPanel.tsx` - 동적 아이콘 URL 반영
- `frontend/src/stores/worldStore.ts` - 아이템 아이콘 URL 관리

**참조**:

- `vibe/unit-plans/U-011[Mvp].md` - Inventory 패널(DnD) 기본
- `vibe/unit-plans/U-035[Mvp].md` - rembg 배경 제거 통합
- `vibe/ref/rembg-guide.md` - rembg 사용 가이드

## 구현 흐름

### 1단계: 아이템 아이콘 생성 서비스 설계

- 아이템 설명을 기반으로 아이콘 프롬프트 생성
- 64x64 또는 128x128 정사각형 이미지 생성
- rembg로 배경 투명 처리

```python
# backend/src/unknown_world/services/item_icon_generator.py
class ItemIconGenerator:
    def __init__(self, image_service: ImageGenerationService):
        self.image_service = image_service
        self.cache: dict[str, str] = {}  # hash -> icon_url
    
    async def generate_icon(
        self, 
        item_description: str,
        size: int = 64
    ) -> str:
        """아이템 설명 기반 아이콘 생성. 캐싱 적용."""
        # 캐시 키 생성
        cache_key = hashlib.md5(item_description.encode()).hexdigest()
        
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # 아이콘 프롬프트 생성
        prompt = self._build_icon_prompt(item_description, size)
        
        # 이미지 생성
        result = await self.image_service.generate(
            prompt=prompt,
            model_label="FAST",  # 아이콘은 저지연 모델 사용
            size=f"{size}x{size}",
        )
        
        # 배경 제거
        transparent_image = await self._remove_background(result.image_data)
        
        # 저장 및 URL 생성
        icon_url = await self._save_icon(transparent_image, cache_key)
        
        # 캐시 저장
        self.cache[cache_key] = icon_url
        
        return icon_url
    
    def _build_icon_prompt(self, description: str, size: int) -> str:
        return f"""
        Create a game item icon for: {description}
        Style: pixel art, fantasy RPG style
        Background: pure white (#FFFFFF)
        Size: {size}x{size} pixels
        Centered, clear silhouette
        """
```

### 2단계: 캐싱 전략 구현

- 아이템 설명의 해시를 캐시 키로 사용
- 메모리 캐시 + 파일 시스템 캐시 (영구 저장)
- 동일 아이템은 재생성하지 않음

```python
class IconCache:
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.memory_cache: dict[str, str] = {}
    
    async def get(self, cache_key: str) -> str | None:
        # 메모리 캐시 확인
        if cache_key in self.memory_cache:
            return self.memory_cache[cache_key]
        
        # 파일 캐시 확인
        cache_path = self.cache_dir / f"{cache_key}.png"
        if cache_path.exists():
            url = self._path_to_url(cache_path)
            self.memory_cache[cache_key] = url
            return url
        
        return None
    
    async def set(self, cache_key: str, image_data: bytes) -> str:
        cache_path = self.cache_dir / f"{cache_key}.png"
        cache_path.write_bytes(image_data)
        url = self._path_to_url(cache_path)
        self.memory_cache[cache_key] = url
        return url
```

### 3단계: 배경 제거 (rembg) 연동

- U-035에서 구현한 rembg 서비스 재사용
- 아이콘 생성 후 배경 제거 적용

```python
async def _remove_background(self, image_data: bytes) -> bytes:
    """rembg를 사용한 배경 제거"""
    from rembg import remove
    
    # 아이콘/일러스트용 모델 사용
    return remove(
        image_data,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
    )
```

### 4단계: 아이템 이름 언어 정합성

- TurnOutput의 새 아이템은 세션 언어와 일치하는 이름 사용
- 아이템 모델에 `name_ko`, `name_en` 필드 또는 현재 언어 기반 `label` 사용

```python
# backend/src/unknown_world/models/turn.py
class InventoryItem(BaseModel):
    id: str
    label: str  # 현재 세션 언어에 맞는 이름
    description: str
    icon_url: str | None = None  # 동적 생성된 아이콘 URL
    
# 프롬프트에서 언어 지정
def _build_item_prompt(item_description: str, language: str) -> str:
    lang_instruction = "Korean" if language == "ko-KR" else "English"
    return f"Item name should be in {lang_instruction}. Description: {item_description}"
```

### 5단계: 프론트엔드 아이콘 표시

- `InventoryItem.icon_url`이 있으면 해당 URL 표시
- 없으면 placeholder 아이콘 사용

```tsx
// frontend/src/components/InventoryPanel.tsx
const InventoryItem: React.FC<{ item: Item }> = ({ item }) => (
  <ItemContainer>
    {item.icon_url ? (
      <ItemIcon src={item.icon_url} alt={item.label} />
    ) : (
      <PlaceholderIcon />
    )}
    <ItemLabel>{item.label}</ItemLabel>
  </ItemContainer>
);
```

### 6단계: API 엔드포인트 (선택적 직접 호출용)

```python
# backend/src/unknown_world/api/item_icon.py
@router.post("/api/item/icon")
async def generate_item_icon(
    description: str,
    size: int = 64,
    language: str = "ko-KR",
) -> IconResponse:
    """아이템 아이콘 직접 생성 API"""
    icon_url = await icon_generator.generate_icon(description, size)
    return IconResponse(icon_url=icon_url)
```

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-011[Mvp]](../unit-results/U-011[Mvp].md) - Inventory 패널 기본 구현
- **결과물**: [U-035[Mvp]](../unit-results/U-035[Mvp].md) - rembg 배경 제거 통합

**다음 작업에 전달할 것**:

- CP-MVP-03: 동적 아이콘이 표시되는 데모 시나리오
- MMP: 아이콘 스타일 커스터마이징, 고해상도 아이콘

## 주의사항

**기술적 고려사항**:

- (RULE-006) 아이템 이름은 세션 언어와 일치 (ko/en 혼합 금지)
- (비용) 아이콘 생성도 이미지 모델 호출이므로 비용 발생 → FAST 모델 사용, 캐싱 필수
- (성능) 새 아이템마다 이미지 생성은 지연 유발 → 비동기 생성 + placeholder 먼저 표시
- (rembg) 첫 실행 시 모델 다운로드 발생 → U-045의 preflight로 해결됨

**잠재적 리스크**:

- 아이콘 생성 실패 시 placeholder 표시 → 폴백 필수
- 캐시 무효화 필요 시 (설명 변경 등) 재생성 트리거 필요
- 아이콘 스타일이 게임 테마와 불일치할 수 있음 → 프롬프트 튜닝

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 아이콘 생성 타이밍?
  - Option A: 새 아이템 획득 즉시 생성 (지연 발생, 완성된 아이콘 표시)
  - Option B: placeholder 먼저 표시 후 백그라운드 생성 (빠른 응답, 나중에 교체)
  - Option C: 사용자가 아이템 상세보기 시에만 생성 (지연 생성)

- [ ] **Q2**: 아이콘 사이즈?
  - Option A: 64x64 (작고 가벼움, 인벤토리 슬롯에 적합)
  - Option B: 128x128 (더 상세, 확대/상세보기에도 사용 가능)
  - Option C: 두 사이즈 모두 생성 (용도별 사용)

- [ ] **Q3**: 아이콘 스타일?
  - Option A: 픽셀 아트 (CRT 테마와 어울림)
  - Option B: 일러스트/카툰 (디테일 표현 용이)
  - Option C: 프롬프트에서 "현재 장면 스타일과 일관되게" 지시

## 참고 자료

- `vibe/unit-results/U-011[Mvp].md` - Inventory 패널 구현
- `vibe/unit-results/U-035[Mvp].md` - rembg 배경 제거 구현
- `vibe/ref/rembg-guide.md` - rembg 사용 가이드
- `vibe/tech-stack.md` - 이미지 모델 라인업 (FAST: gemini-2.5-flash-image)
