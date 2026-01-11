# U-038[Mvp]: 핵심 UI 아이콘 12종 재생성(v2, 퀄리티/용량/사이즈/식별성)

## 메타데이터

| 항목      | 내용                  |
| --------- | --------------------- |
| Unit ID   | U-038[Mvp]            |
| Phase     | MVP                   |
| 예상 소요 | 75분                  |
| 의존성    | U-033,U-034,U-030,U-028 |
| 우선순위  | High                  |

## 작업 목표

Signal/Shard/Risk 등 “한눈에 의미를 전달해야 하는” 핵심 UI 아이콘 12종을 **v2로 재생성**하여, 작은 크기(16px)에서도 식별되는 퀄리티와 파일 용량/배율 규칙을 고정한다.

**배경**: Unknown World는 “채팅 앱이 아닌 게임 UI” 인상이 중요하고(PRD 6.7), 아이콘은 텍스트보다 빠르게 의미를 전달한다. 하지만 아이콘이 흐리거나 구분이 어려우면 오히려 UX를 해치고, 에셋이 커지면 성능 예산을 빠르게 소모한다. 따라서 아이콘은 “형태(식별성) + 예산(용량) + 사이즈(배율)”을 함께 관리해야 한다.

**완료 기준**:

- “핵심 아이콘 12종(SSOT)” 목록을 확정하고, 네이밍/폴백/사용처(usedIn)가 함께 정의된다.
- 각 아이콘은 최소 16/24 2종 사이즈로 제공되며(선택: 32/64), **16px에서도 실루엣이 구분**된다.
- 에셋 예산을 준수한다: 아이콘 1개 20KB 권장(상한 30KB), `ui/` 총합 1MB 권장(상한 1.5MB). 초과 시 압축/리사이즈/형태 단순화로 해결한다.
- `frontend/public/ui/manifest.json`에 교체/추가된 아이콘의 `bytes/usedIn/totalBytes`가 갱신되고, UI에서 아이콘/폴백이 정상 동작한다.

## 영향받는 파일

**생성**:

- `frontend/public/ui/icons/*` - v2 아이콘 PNG(투명)
- (선택) `frontend/public/ui/icons/*@2x.png` - Retina 대응이 필요한 경우

**수정**:

- `frontend/public/ui/manifest.json` - 아이콘 목록/용량/예산/사용처 갱신
- `frontend/public/ui/README.md` - (선택) 핵심 아이콘 12종(SSOT) 목록 명시 및 예산/워크플로우 보강
- `frontend/src/App.tsx` - Signal/Shard/Risk 아이콘 경로/사이즈 연결(필요 시 16/24 사용처 분리)
- `frontend/src/components/AgentConsole.tsx` - Badge 아이콘 경로/사이즈 연결(필요 시)
- `frontend/src/style.css` - 아이콘 크기 토큰/필터(리스크 등급) 및 (선택) Retina `image-set()` 지원

**참조**:

- `vibe/ref/nanobanana-mcp.md` - 아이콘 프롬프트 템플릿/아트 디렉션
- `vibe/ref/rembg-guide.md` - (조건부) 배경 제거(rembg)
- `vibe/ref/imagemagick-guide.md` - trim/resize/extent(배율) 워크플로우
- `frontend/public/ui/manifest.schema.json` - 매니페스트 스키마(SSOT)
- `frontend/public/ui/README.md` - 에셋 예산/폴백/Retina 규칙

## 구현 흐름

### 1단계: “12종 아이콘” 스펙 확정(SSOT)

- PRD의 “핵심 UI 아이콘 12종(SSOT)” 목록을 기준으로, MVP 범위의 아이콘 ID/파일명을 확정한다.
- 현재 `frontend/public/ui/icons/`의 기존 파일(12개)을 “교체 대상(v1→v2)”로 삼고, 누락된 페어(예: `shard-16`, `risk-medium-24`, `badge-fail-16`)는 필요 시 추가한다.
- 각 아이콘에 대해 최소 정보를 정리한다:
  - `id` / `path` / `fallback` / `usedIn` / `requiredSizes(16,24,...)`

### 2단계: nanobanana mcp로 v2 아이콘 생성(마스터)

- 공통 아트 디렉션(SSOT): CRT 레트로/인광 그린 기반, 단순 실루엣, 고대비, **텍스트 렌더링 금지(i18n)**.
- (필수 조건부) 투명 배경이 필요한데 결과에 배경이 섞이면 `rembg` 후처리를 전제하고, 원본 생성 시 **배경을 순백(#FFFFFF) 단색**으로 강제한다.
- 생성은 “마스터(큰 크기)”로 먼저 만들고, 후처리로 16/24/32/64를 파생한다(일관성/품질 유지).

### 3단계: 후처리(rembg + ImageMagick)로 사이즈/배율 확정

- (조건부) `rembg`로 배경 제거(알파 채널 확보) 후, ImageMagick으로 아래 순서를 표준화한다:
  1) `-trim +repage` (여백 제거)
  2) `-resize` (필요 사이즈로 축소/확대)
  3) `-gravity center -background transparent -extent` (캔버스 정렬/통일)
- 픽셀/샤프 엣지를 유지해야 하면 `-filter point` 같은 옵션을 검토한다(아이콘 스타일에 따라 결정).
- 결과물이 예산을 초과하면, 먼저 “색상 수/디테일/글로우”를 줄여 단순화한다.

### 4단계: 반영 + 매니페스트/QA 갱신

- `frontend/public/ui/icons/` 파일 교체/추가 후 `manifest.json`의 `bytes`, `totalBytes`, `usedIn`을 갱신한다.
- 기본/Readable 모드에서 대비와 식별성을 확인한다(특히 16px).
- 로딩 실패 시 텍스트/이모지 폴백이 유지되는지 확인한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-030[Mvp]](U-030[Mvp].md) - 에셋 SSOT(경로/네이밍/예산/폴백)
- **계획서**: [U-033[Mvp]](U-033[Mvp].md) - manifest/QA로 추적하는 운영 방식
- **계획서**: [U-034[Mvp]](U-034[Mvp].md) - 아이콘 프롬프트 템플릿(재현성)
- **계획서**: [U-028[Mvp]](U-028[Mvp].md) - Readable 모드(대비/가독성 기준)

**다음 작업에 전달할 것**:

- U-009(Action Deck), U-014(Economy HUD), U-023(Autopilot UI) 등에서 재사용 가능한 “핵심 아이콘 세트(v2)”
- “아이콘 교체/추가 시 반드시 manifest/QA를 갱신한다”는 운영 규칙

## 주의사항

**기술적 고려사항**:

- 아이콘 이미지 안에 텍스트를 박지 않는다(언어/i18n/리사이즈 문제).
- 외부 로고/상표를 그대로 복제하지 않는다(라이선스/브랜딩 혼동 방지).
- (선택) Retina는 무조건 추가하지 말고, “16px에서 깨짐/뭉개짐”이 확인될 때만 `@2x`를 도입한다(파일 수/관리 비용 증가).

**잠재적 리스크**:

- 스타일 불일치(아이콘마다 톤이 다름) → 공통 템플릿/팔레트(SSOT)를 강제하고, 생성→후처리→QA를 한 루프로 반복한다.
- 파일 비대화 → 디테일/글로우를 줄여 단순화하고, 필요한 사이즈만 제공한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: “12종”의 범위를 어떻게 잡을까?
  - Option A: 현재 `icons/` 폴더의 **12개 파일(v1)** 을 v2로 교체(범위 최소, 권장) ✅
  - Option B: “개념 12종 × (16/24)”로 확장하여 누락 페어까지 모두 채움(품질 ↑, 파일 수 ↑)
- [ ] **Q2**: 아이콘 스타일을 어디에 맞출까?
  - Option A: 픽셀 아트/샤프 엣지(레트로 감성 ↑, 배율/후처리 중요) ✅
  - Option B: 미니멀 라인 아트(가독성 ↑, 작은 크기에서 선 굵기 튜닝 필요)

## 참고 자료

- `vibe/prd.md` - 9.7 UI 이미지 에셋 파이프라인(예산/폴백/SSOT)
- `frontend/public/ui/README.md` - 에셋 예산/Retina/폴백 규칙(SSOT)
- `vibe/ref/nanobanana-mcp.md` - 프롬프트 템플릿/아트 디렉션
- `vibe/ref/imagemagick-guide.md` - 리사이즈/trim/extent 워크플로우
