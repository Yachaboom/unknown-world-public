# U-092[Mvp]: 기본 초기 아이템 아이콘 프리셋 이미지 (nanobanana-mcp 활용)

## 메타데이터

| 항목      | 내용                                                    |
| --------- | ------------------------------------------------------- |
| Unit ID   | U-092[Mvp]                                              |
| Phase     | MVP                                                     |
| 예상 소요 | 45분                                                    |
| 의존성    | U-075[Mvp], U-091[Mvp]                                  |
| 우선순위  | High (데모 초기 아이템 시각 품질)                       |

## 작업 목표

데모 프로필의 **기본 초기 아이템들에 미리 생성된 아이콘 이미지**를 사용하여, 게임 시작 시점부터 아이콘이 즉시 표시되도록 한다. nanobanana-mcp로 사전 제작하여 `frontend/public/ui/items/` 경로에 정적 에셋으로 배치한다.

**배경**: U-075에서 아이템 아이콘 동적 생성 기능을 구현했으나, (1) 동적 생성 시 지연/타임아웃 발생(U-093), (2) rembg 런타임 제거(U-091) 후 배경 처리 제약, (3) 게임 시작 시 "아이콘 없음" 상태가 데모 첫 인상을 해침. **초기 아이템만큼은 프리셋 이미지**로 즉시 표시하고, 게임 도중 획득하는 아이템은 기존 동적 생성 파이프라인을 사용한다.

**완료 기준**:

- 데모 프로필 3종의 초기 아이템에 대해 **프리셋 아이콘 이미지** 준비 (각 프로필 3~5개 아이템)
- 아이콘 이미지: 64x64, 픽셀 아트 스타일, 투명 배경 PNG
- `frontend/public/ui/items/` 에 정적 파일로 배치
- 프로필 초기 상태(`demoProfiles`)에서 `icon_url` 필드가 프리셋 이미지 경로를 참조
- 게임 시작 즉시 아이콘이 표시됨 (네트워크 요청/생성 지연 없음)
- 에셋 매니페스트(`frontend/public/ui/manifest.json`)에 등록

## 영향받는 파일

**생성**:

- `frontend/public/ui/items/*.png` - 초기 아이템 아이콘 이미지 (10~15개)
- (nanobanana-mcp로 제작 → 커밋)

**수정**:

- `frontend/src/stores/worldStore.ts` (또는 데모 프로필 정의 파일) - 초기 아이템 `icon_url`에 프리셋 경로 설정
- `backend/src/unknown_world/data/demo_profiles.py` (또는 해당 파일) - 초기 아이템 icon_url 프리셋 경로
- `frontend/public/ui/manifest.json` - 아이템 아이콘 에셋 등록

**참조**:

- `vibe/unit-results/U-075[Mvp].md` - 아이콘 동적 생성 결과 (프리셋과 공존)
- `vibe/unit-plans/U-030[Mvp].md` - 에셋 SSOT (폴더/네이밍 규칙)
- `vibe/unit-plans/U-033[Mvp].md` - 에셋 매니페스트 + QA
- `frontend/public/ui/README.md` - 에셋 관리 가이드

## 구현 흐름

### 1단계: 초기 아이템 목록 확인

- 데모 프로필 3종(Narrator/Explorer/Tech Enthusiast)의 초기 아이템 목록 파악
- 각 아이템의 이름/설명 확인 (아이콘 프롬프트 기반)

### 2단계: nanobanana-mcp로 아이콘 제작

- 각 아이템에 대해 64x64 픽셀 아트 아이콘 생성
- 스타일: CRT 테마 호환, 선명한 실루엣, 순백 배경(→ rembg로 투명 처리)
- 제작 후 rembg로 배경 제거 (Dev-only 처리)
- 결과물: 투명 배경 PNG

### 3단계: 에셋 배치 및 매니페스트 등록

- `frontend/public/ui/items/` 디렉토리에 아이콘 파일 배치
- 네이밍: `item-{아이템id}-64.png` (kebab-case)
- `manifest.json`에 등록

### 4단계: 데모 프로필 icon_url 설정

- 초기 아이템 데이터에 `icon_url: "/ui/items/item-xxx-64.png"` 설정
- 프론트엔드 InventoryPanel에서 icon_url 존재 시 프리셋 이미지 표시

### 5단계: 검증

- 각 데모 프로필 시작 → 아이콘 즉시 표시 확인
- 게임 도중 획득 아이템 → 동적 생성 파이프라인 사용 확인 (공존)
- 에셋 용량 확인 (개당 20KB 이하)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-075[Mvp]](../unit-results/U-075[Mvp].md) - 아이콘 표시 로직 (icon_url 필드)
- **결과물**: [U-091[Mvp]] - rembg 런타임 제거 (프리셋 이미지 필요성 확인)

**다음 작업에 전달할 것**:

- CP-MVP-03: 데모 시작 시 아이콘이 즉시 보이는 깔끔한 첫 인상

## 주의사항

**기술적 고려사항**:

- (RULE-006) 아이콘 이미지에 텍스트를 넣지 않음 (언어 확장/접근성 문제)
- (에셋 SSOT) `frontend/public/ui/` 경로, kebab-case 네이밍, 개당 20KB 이하
- 프리셋 아이콘은 **데모 프로필 초기 아이템 전용** - 게임 중 획득 아이템은 동적 생성
- 아이콘 스타일은 U-075에서 확립한 "pixel art, fantasy RPG" 톤과 일치

**잠재적 리스크**:

- 데모 프로필 아이템이 변경되면 프리셋 이미지도 교체 필요 → 아이템 목록 확정 후 제작
- 프리셋 아이콘과 동적 생성 아이콘의 스타일 차이 → 동일 프롬프트 톤 유지

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 프리셋 아이콘 제작 범위?
  - Option A: 데모 프로필 초기 아이템만 (10~15개)
  - Option B: 자주 등장하는 공통 아이템까지 포함 (20~30개)
  - Option C: 최소한으로 프로필당 3개씩 (9개)

- [ ] **Q2**: 동적 생성과 프리셋의 우선순위?
  - Option A: icon_url이 있으면 항상 프리셋 우선 (동적 생성 건너뛰기)
  - Option B: 프리셋은 초기 표시용, 동적 생성 성공 시 교체
  - Option C: 프리셋만 사용, 동적 생성 비활성화 (MVP 단순화)

## 참고 자료

- `vibe/unit-results/U-075[Mvp].md` - 아이콘 동적 생성 결과
- `vibe/unit-plans/U-030[Mvp].md` - 에셋 SSOT 규칙
- `vibe/unit-plans/U-033[Mvp].md` - 에셋 매니페스트
- `frontend/public/ui/README.md` - 에셋 관리 가이드
- `vibe/prd.md` - 9.7(에셋 파이프라인)
