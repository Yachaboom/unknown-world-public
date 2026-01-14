# U-038[Mvp]: 핵심 UI 아이콘 12종 재생성 완료 보고서

## 메타데이터

- **작업 ID**: U-038[Mvp]
- **단계 번호**: 4.4 (에셋 고도화)
- **작성 일시**: 2026-01-14 23:58
- **담당**: AI Agent

---

## 1. 작업 요약

핵심 UI 아이콘 12종(Signal, Shard, Risk 등)을 픽셀 아트 스타일의 v2로 재생성하여 식별성과 퀄리티를 대폭 개선했습니다. `nanobanana mcp`를 통한 생성부터 `rembg` 배경 제거, `ImageMagick`을 활용한 16/24px 최적화 파이프라인을 적용했습니다.

---

## 2. 작업 범위

- **아이콘 v2 재생성**: Signal(16/24), Shard(16/24), Badge(ok/fail, 16/24), Risk(low/medium/high, 16/24), Status-online(16) 등 총 14개 에셋 교체/추가.
- **최적화 파이프라인 적용**:
  - `nanobanana mcp`: 픽셀 아트/레트로 터미널 스타일 가이드 준수 생성.
  - `rembg (birefnet-general)`: 정교한 배경 제거로 알파 채널 확보.
  - `ImageMagick`: Trim, Resize, Center-gravity Extent를 통한 규격화 및 용량 최적화.
- **매니페스트 갱신**: `frontend/public/ui/manifest.json`의 버전(v1.4.0), 용량(bytes), 사용처(usedIn), 노트 업데이트.
- **UI 연동**: 16px과 24px 사용처를 분리하여 `ActionDeck`(16px), `EconomyHUD`(24px), `AgentConsole`(24px)에 최적화된 사이즈 연결.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/public/ui/icons/*.png` | 신규/교체 | v2 아이콘 에셋 (14종) |
| `frontend/public/ui/manifest.json` | 수정 | 에셋 SSOT 정보 갱신 (v1.4.0) |
| `frontend/src/style.css` | 수정 | 아이콘 크기 변수 및 식별성 향상을 위한 필터링 추가 |
| `frontend/src/App.tsx` | 수정 | Signal/Shard 아이콘 경로를 매니페스트 기반으로 최적화 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**에셋 SSOT 관리**:
- `manifest.json`을 통해 아이콘의 경로, 사이즈, 폴백 문자열, 실제 용량을 관리합니다.
- `usedIn` 필드를 명시하여 해당 아이콘이 영향을 주는 컴포넌트를 추적 가능하게 했습니다.

**사이즈 전략**:
- **16px**: `ActionDeck` 등 밀도가 높은 영역에서 실루엣 위주 식별성 확보.
- **24px**: `EconomyHUD`, `AgentConsole` 등 주요 상태 표시 영역에서 상세 디테일 노출.

### 4.2 외부 영향 분석

- **성능**: 아이콘당 평균 1.5KB 내외로 최적화하여 총 `ui/` 예산(1.5MB) 대비 매우 낮은 점유율을 유지합니다.
- **일관성**: 모든 아이콘에 동일한 픽셀 아트 프롬프트 템플릿과 후처리 과정을 적용하여 시각적 통일성을 확보했습니다.

---

## 5. 런북(Runbook) 정보

- **검증 절차**:
  1. `pnpm dev` 실행 후 UI의 `EconomyHUD`(상단), `ActionDeck`(하단) 아이콘 확인.
  2. 브라우저 개발자 도구에서 16px/24px 아이콘이 목적에 맞게 로드되는지 확인.
  3. `manifest.json`의 `totalBytes`가 실제 파일 크기 합계와 일치하는지 검증.

---

## 6. 리스크 및 주의사항

- **픽셀 앨리어싱**: 16px로 강제 축소 시 일부 디테일이 뭉개질 수 있으나, 이번 v2에서는 픽셀 아트 스타일을 채택하여 가독성을 극대화했습니다.
- **캐싱**: 에셋 교체 후 브라우저 캐시로 인해 v1이 보일 수 있으므로 서비스 워커나 쿼리 스트링(v=1.4.0) 적용을 권장합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **Retina 대응**: 고해상도 디스플레이에서 흐릿함이 감지될 경우 `@2x` 에셋 생성 검토.
2. **테마 필터링**: `style.css`에서 `drop-shadow`나 `filter: drop-shadow(...)`를 통해 CRT 인광 효과 강화.

### 7.2 의존 단계 확인

- **선행 단계**: U-030(에셋 SSOT), U-033(매니페스트 운영)
- **후속 단계**: U-009(Action Deck 고도화), U-014(Economy HUD 완성)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
