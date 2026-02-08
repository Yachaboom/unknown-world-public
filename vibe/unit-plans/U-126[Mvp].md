# U-126[Mvp]: MVP 성능/품질 기본 최적화 (M6 대체)

## 메타데이터

| 항목      | 내용                                        |
| --------- | ------------------------------------------- |
| Unit ID   | U-126[Mvp]                                  |
| Phase     | MVP                                         |
| 예상 소요 | 60분                                        |
| 의존성    | None (기존 완료 유닛 기반)                  |
| 우선순위  | Medium (데모 체감 / 초기 로딩 속도)         |

## 작업 목표

MMP M6(품질 강화/후속) 16개 유닛을 모두 제거(skip)하는 대신, MVP 범위 내에서 **성능 및 품질에 직접 영향을 주는 핵심 최적화**를 1개 유닛으로 집약하여 수행한다. 번들 크기, 초기 로딩 속도, 렌더링 성능, 불필요한 리소스 정리에 집중한다.

**배경**: M6(Post-Submission) 유닛 16개는 해커톤 제출 이후의 장기 개선 계획이었으나, 해커톤 일정상 실행 가능성이 낮고 로드맵을 복잡하게 만든다. 제출 전 MVP에서 달성 가능한 핵심 성능 개선만 1개 유닛으로 압축하여 데모 품질을 높이고, 나머지는 해커톤 이후 별도로 재계획한다.

**완료 기준**:

- 프론트엔드 번들 크기 분석 후 **불필요한 의존성/데드코드 제거** (목표: 초기 JS 번들 500KB 이하)
- **이미지 에셋 최적화**: 미사용 에셋 제거, 과대 에셋 압축 (목표: `public/ui/` 총합 1MB 이하)
- **CSS 미사용 스타일 정리**: 삭제된 컴포넌트/기능(OnboardingGuide, SaveGame UI 등)의 잔여 스타일 제거
- **React 렌더링 최적화**: 불필요한 리렌더링 감지 및 `React.memo`/`useMemo` 적용 (핵심 컴포넌트 위주)
- 초기 로딩(FCP)이 **3초 이내** (로컬 기준, 네트워크 제외)
- 기존 기능에 대한 **동작 회귀 없음**

## 영향받는 파일

**수정**:

- `frontend/package.json` - 미사용 의존성 제거
- `frontend/src/style.css` - 미사용 CSS 규칙 정리 (OnboardingGuide, SaveGame 관련 등)
- `frontend/src/components/*.tsx` - (필요 시) React.memo 적용, 불필요 리렌더링 방지
- `frontend/public/ui/` - 미사용 에셋 제거, 과대 에셋 압축
- `frontend/vite.config.ts` - (필요 시) 빌드 최적화 설정 (treeshake, minify 확인)

**참조**:

- `vibe/prd.md` 12절 - 성공 지표 (Performance)
- `vibe/prd.md` 9.7절 - 에셋 성능 예산
- `vibe/tech-stack.md` - 프론트엔드 빌드 도구 (Vite 7)

## 구현 흐름

### 1단계: 번들 분석

- `vite-bundle-visualizer` 또는 `rollup-plugin-visualizer`로 번들 크기 분석
- 큰 청크/미사용 라이브러리 식별
- 트리셰이킹이 제대로 작동하는지 확인

```bash
pnpm -C frontend build -- --report
```

### 2단계: 미사용 코드/의존성 제거

- 삭제된 기능의 잔여 코드 정리:
  - OnboardingGuide 관련 (U-117에서 제거되었으나 잔여 import/스타일 가능)
  - SaveGame 관련 (U-116에서 제거되었으나 잔여 타입/유틸 가능)
- `package.json`에서 실제로 사용하지 않는 의존성 제거
- 데드 코드(unreachable code) 정리

### 3단계: 에셋 최적화

- `frontend/public/ui/` 내 미사용 에셋 식별 및 제거
- 200KB 초과 에셋 압축 (PNG → 최적화 PNG, 또는 WebP 변환)
- `manifest` 대비 실사용 에셋 교차 검증

### 4단계: CSS 정리

- 미사용 CSS 규칙 제거 (삭제된 컴포넌트의 클래스)
- 중복/겹치는 스타일 통합
- CSS 변수 미사용 항목 정리

### 5단계: React 렌더링 최적화 (핵심만)

- React DevTools Profiler로 불필요 리렌더링 핫스팟 식별
- 핵심 컴포넌트(NarrativeFeed, SceneImage, ActionDeck, InventoryPanel)에 `React.memo` 적용
- 비싼 계산에 `useMemo`/`useCallback` 적용 (과도 적용 금지)

### 6단계: 검증

- `pnpm -C frontend build` 후 번들 크기 확인 (목표: 500KB 이하)
- `pnpm -C frontend dev` 후 초기 로딩 속도 확인 (FCP 3초 이내)
- 전체 데모 시나리오 1회 플레이 → 기능 회귀 없음 확인
- 에셋 총합 확인 (1MB 이하)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- 모든 완료된 MVP 유닛의 산출물 (분석 대상)
- [U-116[Mvp]](../unit-results/U-116[Mvp].md) - SaveGame 제거 (잔여 코드 정리 대상)
- [U-117[Mvp]](../unit-results/U-117[Mvp].md) - 온보딩 제거 (잔여 코드 정리 대상)

**다음 작업에 전달할 것**:

- U-119[Mmp]: WIG 폴리시에서 성능 기준선으로 활용
- U-120[Mmp]: 배포 시 최적화된 번들 사용

## 주의사항

**기술적 고려사항**:

- (PRD 12) TTFB < 2초, API 오류율 < 1% → 프론트 성능 최적화는 FCP/번들 크기에 집중
- (Vite 7) 트리셰이킹/코드 분할이 기본 지원되므로, 설정 확인 위주
- `React.memo` 과도 적용은 오히려 성능을 저하시킬 수 있음 → Profiler로 확인된 핫스팟만 적용
- CSS-in-JS를 사용하지 않으므로(단일 CSS 파일), 미사용 CSS 탐지는 수동 또는 PurgeCSS 활용

**잠재적 리스크**:

- 미사용으로 판단한 코드/에셋이 실제로 사용되는 경우 → 삭제 전 참조 검색 철저히 수행
- 최적화 과정에서 기존 기능이 깨질 수 있음 → 삭제 후 즉시 빌드 + 데모 시나리오 검증
- 번들 분석 도구 설치가 필요할 수 있음 → devDependency로 추가

## 페어링 질문 (결정 필요)

- [ ] **Q1**: React.memo 적용 범위는?
  - Option A: **Profiler 핫스팟만** (보수적, 안전)
  - Option B: 모든 leaf 컴포넌트 (공격적)
  - Option C: 이번에는 skip (CSS/에셋 정리만)

- [ ] **Q2**: 에셋 포맷 변환?
  - Option A: PNG 유지 (호환성 우선)
  - Option B: **WebP 변환** (크기 절감, 모던 브라우저 지원)
  - Option C: 혼합 (아이콘=PNG, 씬=WebP)

## 참고 자료

- `vibe/prd.md` 12절 - 성능 지표
- `vibe/prd.md` 9.7절 - 에셋 성능 예산
- [Vite Build Optimization](https://vite.dev/guide/build.html)
- [React Performance](https://react.dev/learn/render-and-commit)
- `frontend/public/ui/README.md` - 에셋 SSOT
