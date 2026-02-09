# U-126[Mvp]: MVP 성능/품질 최적화 + 기술 부채 해소

## 메타데이터

| 항목      | 내용                                                           |
| --------- | -------------------------------------------------------------- |
| Unit ID   | U-126[Mvp]                                                     |
| Phase     | MVP                                                            |
| 예상 소요 | 90분                                                           |
| 의존성    | None (기존 완료 유닛 기반, U-136/U-127 결과물 참조)            |
| 우선순위  | High (데모 품질 + 테스트 안정성 + 빌드 건강도)                 |

## 작업 목표

MVP 범위 내에서 **성능 최적화**(번들/에셋/CSS/렌더링)와 **기술 부채 해소**(테스트 실패/타입 에러/스키마 불일치)를 함께 수행한다. `vibe/debt-log.md`에 기록된 미해결 기술 부채 중 MVP 단계에서 해결해야 할 항목들을 통합하여, 데모 품질과 코드 건강도를 동시에 높인다.

**배경**: MMP M6(품질 강화/후속) 16개 유닛 전체 skip에 따라 MVP에서 달성 가능한 핵심 최적화를 1개 유닛으로 집약한다. 동시에 debt-log.md에 누적된 12건의 미해결 기술 부채(테스트 mock 누락, 기대값 불일치, 타입 에러, 스키마 불일치 등) 중 **데모 안정성·빌드 품질에 직결되는 8건**을 본 유닛에서 해소하고, **대규모 작업이 필요한 3건**은 MMP 이후로 보류한다.

**완료 기준**:

**[성능 최적화]**

- 프론트엔드 번들 크기 분석 후 **불필요한 의존성/데드코드 제거** (목표: 초기 JS 번들 500KB 이하)
- **이미지 에셋 최적화**: 미사용 에셋 제거, 과대 에셋 압축 (목표: `public/ui/` 총합 1MB 이하)
- **CSS 미사용 스타일 정리**: 삭제된 컴포넌트/기능(OnboardingGuide, SaveGame UI 등)의 잔여 스타일 제거
- **React 렌더링 최적화**: 불필요한 리렌더링 감지 및 `React.memo`/`useMemo` 적용 (핵심 컴포넌트 위주)
- 초기 로딩(FCP)이 **3초 이내** (로컬 기준, 네트워크 제외)

**[기술 부채 해소]**

- `window.matchMedia` mock 추가 → NarrativeFeed/App/DndInteraction **4개 테스트 통과**
- `initReactI18next` mock 보강 → InventoryPanel **테스트 스위트 통과**
- `previous_image_url` 필드 추가 → **3개 테스트 파일 타입 에러 해소**
- `iconStatus` 기대값 수정 → inventoryStore **테스트 통과**
- `ModelLabel.QUALITY` 기대값 수정 → test_u069_model_tiering **테스트 통과**
- 자산 매니페스트 스키마에 `'scene'` type 추가 → **스키마 검증 통과**
- render_stage 이미지 생성 테스트 **격리**(skip + reason 명시) → CI 무중단
- flaky test 안정화 또는 **격리** → CI 무중단

**[공통]**

- 기존 기능에 대한 **동작 회귀 없음**

## 영향받는 파일

**수정 (성능 최적화)**:

- `frontend/package.json` — 미사용 의존성 제거
- `frontend/src/style.css` — 미사용 CSS 규칙 정리 (OnboardingGuide, SaveGame 관련 등)
- `frontend/src/components/*.tsx` — (필요 시) React.memo 적용, 불필요 리렌더링 방지
- `frontend/public/ui/` — 미사용 에셋 제거, 과대 에셋 압축
- `frontend/vite.config.ts` — (필요 시) 빌드 최적화 설정 (treeshake, minify 확인)

**수정 (기술 부채 — 프론트엔드)**:

- `frontend/src/test/setup.ts` — `window.matchMedia` 전역 mock 추가 (debt: 2026-02-03)
- `frontend/src/components/InventoryPanel.test.tsx` — `initReactI18next` mock export 보강 (debt: 2026-02-08)
- `frontend/src/api/turnStream.economy.test.ts` — TurnInput 모의 데이터에 `previous_image_url: null` 추가 (debt: 2026-02-05)
- `frontend/src/api/turnStream.test.ts` — 동일 `previous_image_url: null` 추가 (debt: 2026-02-05)
- `frontend/src/i18n-scenario.test.ts` — 동일 `previous_image_url: null` 추가 (debt: 2026-02-05)
- `frontend/src/stores/inventoryStore.test.ts` — `iconStatus` 기대값 `"ready"` → `"completed"` 수정 (debt: 2026-02-08)

**수정 (기술 부채 — 백엔드)**:

- `backend/tests/unit/orchestrator/test_u069_model_tiering.py` — 기대값 `ModelLabel.FAST` → `ModelLabel.QUALITY` 수정 (debt: 2026-02-09)
- `backend/tests/unit/orchestrator/test_u053_render_async.py` — `@pytest.mark.skip(reason="...")` 격리 (debt: 2026-02-09)
- `backend/tests/unit/orchestrator/test_u054_image_fallback.py` — `@pytest.mark.skip(reason="...")` 격리 (debt: 2026-02-09)
- `backend/tests/qa/test_asset_manifest.py` 또는 스키마 파일 — 에셋 유형 enum에 `'scene'` 추가 (debt: 2026-02-09)
- `backend/tests/integration/test_real_mode_gate.py` — flaky test 안정화 또는 skip 격리 (debt: 2026-02-10)

**참조**:

- `vibe/prd.md` 12절 — 성공 지표 (Performance)
- `vibe/prd.md` 9.7절 — 에셋 성능 예산
- `vibe/tech-stack.md` — 프론트엔드 빌드 도구 (Vite 7)
- `vibe/debt-log.md` — 기술 부채 SSOT (미해결 12건 중 8건 해소 목표)

## 구현 흐름

### Phase A: 기술 부채 해소 (우선 수행, ~30분)

#### A1단계: 프론트엔드 테스트 환경 수정

- `frontend/src/test/setup.ts`에 `window.matchMedia` 전역 mock 추가:

```typescript
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

- 영향: NarrativeFeed.test.tsx(1개), App.test.tsx(1개), DndInteraction.test.tsx(2개) → **4개 테스트 복구**
- 주의: 개별 테스트 파일에 이미 matchMedia mock이 있다면 충돌 여부 확인

#### A2단계: 프론트엔드 테스트 Mock/기대값 수정

- `InventoryPanel.test.tsx`의 `vi.mock('react-i18next')` 설정에 `initReactI18next` export 추가:
  - 패턴 참조: `EconomyHud.test.tsx`의 mock 설정
  ```typescript
  initReactI18next: { type: '3rdParty', init: () => {} }
  ```
- `turnStream.economy.test.ts`, `turnStream.test.ts`, `i18n-scenario.test.ts`:
  - TurnInput 모의 데이터에 `previous_image_url: null` 추가
  - mock factory를 사용 중이라면 factory에서 한 번만 수정
- `inventoryStore.test.ts`:
  - `parseInventoryAdded` 테스트 기대값 `iconStatus: "ready"` → `"completed"` 수정

#### A3단계: 백엔드 테스트 기대값 수정

- `test_u069_model_tiering.py`:
  - `test_select_text_model_default` 기대값: `ModelLabel.FAST` → `ModelLabel.QUALITY`
  - 배경: U-127에서 기본 텍스트 모델을 QUALITY로 변경했으나 테스트 미동기화
- `tests/qa/test_asset_manifest.py` 또는 스키마 파일:
  - 에셋 유형 enum에 `'scene'` 추가 (현재: `['icon', 'placeholder', 'chrome', 'item-icon']`)
  - ui-asset-manifest.json 스키마의 `type` enum을 수정하거나, 매니페스트 데이터 자체를 수정

#### A4단계: 아키텍처 변경 미반영 테스트 격리

- `test_u053_render_async.py`, `test_u054_image_fallback.py`:
  - 파일 상단 또는 클래스/함수에 skip 마커 추가:
  ```python
  @pytest.mark.skip(
      reason="U-097 render_stage 아키텍처 변경(프론트엔드 이미지 위임) 미반영 — MMP에서 테스트 전면 재작성 예정"
  )
  ```
  - 배경: U-097에서 이미지 생성을 프론트엔드로 위임하도록 render_stage가 변경됨. 기존 테스트는 백엔드 `generate` 메서드 호출을 검증하나, 현재 구현에서는 호출되지 않음
- `test_real_mode_gate.py::test_schema_ok_in_successful_turn`:
  - 단독 실행 시 통과하므로 `@pytest.mark.flaky(reruns=2)` 적용 (pytest-rerunfailures 필요 시)
  - 또는 `@pytest.mark.skip(reason="간헐적 실패 — render_stage 이미지 판정 타이밍, MMP에서 안정화 예정")`

#### A5단계: 부채 해소 검증

- `pnpm -C frontend run typecheck` → 타입 에러 0 확인
- `pnpm -C frontend test` → 수정한 테스트 전체 통과 확인
- `cd backend && uv run pytest tests/ -x --timeout=30` → skip된 테스트 외 전체 통과 확인
- `vibe/debt-log.md`에 해결 완료(✅) 마킹

### Phase B: 성능/품질 최적화 (~60분)

#### B1단계: 번들 분석

- `rollup-plugin-visualizer` 또는 `vite-bundle-visualizer`로 번들 크기 분석
- 큰 청크/미사용 라이브러리 식별
- 트리셰이킹이 제대로 작동하는지 확인

```bash
pnpm -C frontend build -- --report
```

#### B2단계: 미사용 코드/의존성 제거

- 삭제된 기능의 잔여 코드 정리:
  - OnboardingGuide 관련 (U-117에서 제거되었으나 잔여 import/스타일 가능)
  - SaveGame 관련 (U-116에서 제거되었으나 잔여 타입/유틸 가능)
- `package.json`에서 실제로 사용하지 않는 의존성 제거
- 데드 코드(unreachable code) 정리

#### B3단계: 에셋 최적화

- `frontend/public/ui/` 내 미사용 에셋 식별 및 제거
- 200KB 초과 에셋 압축 (PNG → 최적화 PNG, 또는 WebP 변환)
- `manifest` 대비 실사용 에셋 교차 검증

#### B4단계: CSS 정리

- 미사용 CSS 규칙 제거 (삭제된 컴포넌트의 클래스)
- 중복/겹치는 스타일 통합
- CSS 변수 미사용 항목 정리

#### B5단계: React 렌더링 최적화 (핵심만)

- React DevTools Profiler로 불필요 리렌더링 핫스팟 식별
- 핵심 컴포넌트(NarrativeFeed, SceneImage, ActionDeck, InventoryPanel)에 `React.memo` 적용
- 비싼 계산에 `useMemo`/`useCallback` 적용 (과도 적용 금지)

#### B6단계: 최종 검증

- `pnpm -C frontend build` 후 번들 크기 확인 (목표: 500KB 이하)
- `pnpm -C frontend dev` 후 초기 로딩 속도 확인 (FCP 3초 이내)
- 전체 데모 시나리오 1회 플레이 → 기능 회귀 없음 확인
- 에셋 총합 확인 (1MB 이하)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- 모든 완료된 MVP 유닛의 산출물 (분석 대상)
- [U-116[Mvp]](../unit-results/U-116[Mvp].md) — SaveGame 제거 (잔여 코드 정리 대상)
- [U-117[Mvp]](../unit-results/U-117[Mvp].md) — 온보딩 제거 (잔여 코드 정리 대상)
- [U-127[Mvp]](../unit-results/U-127[Mvp].md) — 기본 모델 QUALITY 전환 (테스트 기대값 수정 근거)
- [U-097[Mvp]](../unit-results/U-097[Mvp].md) — render_stage 아키텍처 변경 (테스트 격리 근거)
- [U-136[Mvp]](../unit-results/U-136[Mvp].md) — ModelLabel enum 통합 (테스트 기대값 수정 근거)

**다음 작업에 전달할 것**:

- CP-MVP-03: 10분 데모 루프에서 성능 기준선 및 테스트 안정성 확인
- U-119[Mmp]: WIG 폴리시에서 성능 기준선으로 활용
- U-120[Mmp]: 배포 시 최적화된 번들 사용

## 주의사항

**기술적 고려사항**:

- (PRD 12) TTFB < 2초, API 오류율 < 1% → 프론트 성능 최적화는 FCP/번들 크기에 집중
- (Vite 7) 트리셰이킹/코드 분할이 기본 지원되므로, 설정 확인 위주
- `React.memo` 과도 적용은 오히려 성능을 저하시킬 수 있음 → Profiler로 확인된 핫스팟만 적용
- CSS-in-JS를 사용하지 않으므로(단일 CSS 파일), 미사용 CSS 탐지는 수동 또는 PurgeCSS 활용
- 테스트 격리(`skip`)는 **임시 조치**이며, MMP에서 테스트 전면 재작성 필요 — skip 사유를 반드시 명시하여 추적 가능하도록 함
- `window.matchMedia` mock은 전역 setup에 추가하므로 개별 테스트 파일의 기존 mock과 충돌 여부 확인 필요
- `initReactI18next` mock 패턴은 `EconomyHud.test.tsx`를 참조하여 일관성 유지
- `previous_image_url` 추가 시 mock factory 또는 공통 fixture를 사용 중이면 한 곳에서 수정하여 전파 가능

**잠재적 리스크**:

- 미사용으로 판단한 코드/에셋이 실제로 사용되는 경우 → 삭제 전 참조 검색 철저히 수행
- 최적화 과정에서 기존 기능이 깨질 수 있음 → 삭제 후 즉시 빌드 + 데모 시나리오 검증
- 번들 분석 도구 설치가 필요할 수 있음 → devDependency로 추가
- `pytest.mark.skip`으로 격리한 테스트가 MMP에서 잊힐 수 있음 → debt-log.md에 MMP 작업으로 명시 기록
- `previous_image_url` 필드 추가 범위가 3개 파일 이상일 수 있음 → 전체 테스트 파일 grep 후 누락 확인

## MMP 이후 보류 부채 (본 유닛 범위 외)

다음 기술 부채는 작업량/영향도를 고려하여 MMP 이후로 보류한다:

| 부채 (debt-log 날짜)                              | 사유                                         | 보류 근거                                          |
| ------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| backend/tests Pyright 326개 (2026-01-28)          | 테스트 코드 전체에 타입 어노테이션 추가 필요 | 프로덕션 코드 0 에러 확보됨, 대규모 작업(~4h 이상) |
| test_real_generator_rembg_integration (2026-02-03) | CI/CD 환경 서비스 계정 설정 필요             | 로컬 환경 인증 이슈, 기능 동작과 무관              |
| U-066 타자기 효과 속도 불완전 (2026-02-05)        | TYPING_TICK_MS/MAX_CPS 동적 조절 필요        | 현재 속도로 데모 가능, 체감 미세 조정              |

## 통합 대상 기술 부채 매핑 (debt-log.md → 구현 단계)

| # | debt-log 이슈 (날짜)                                  | 구현 단계 | 수정 파일                                   | 예상 소요 |
|---|-------------------------------------------------------|-----------|---------------------------------------------|-----------|
| 1 | window.matchMedia mock 누락 (2026-02-03)              | A1        | `frontend/src/test/setup.ts`                | 5분       |
| 2 | initReactI18next mock 누락 (2026-02-08)               | A2        | `InventoryPanel.test.tsx`                   | 5분       |
| 3 | previous_image_url 타입 에러 (2026-02-05)             | A2        | `turnStream.*.test.ts`, `i18n-scenario.test.ts` | 5분   |
| 4 | iconStatus 기대값 불일치 (2026-02-08)                 | A2        | `inventoryStore.test.ts`                    | 3분       |
| 5 | test_u069_model_tiering 기대값 (2026-02-09)           | A3        | `test_u069_model_tiering.py`                | 3분       |
| 6 | 자산 매니페스트 'scene' 누락 (2026-02-09)             | A3        | `test_asset_manifest.py` 또는 스키마        | 5분       |
| 7 | render_stage/이미지 생성 테스트 실패 (2026-02-09)     | A4        | `test_u053_*.py`, `test_u054_*.py`          | 5분       |
| 8 | test_schema_ok flaky (2026-02-10)                     | A4        | `test_real_mode_gate.py`                    | 3분       |

## 페어링 질문 (결정 필요)

- [ ] **Q1**: React.memo 적용 범위는?
  - Option A: **Profiler 핫스팟만** (보수적, 안전)
  - Option B: 모든 leaf 컴포넌트 (공격적)
  - Option C: 이번에는 skip (CSS/에셋 정리만)

- [ ] **Q2**: 에셋 포맷 변환?
  - Option A: PNG 유지 (호환성 우선)
  - Option B: **WebP 변환** (크기 절감, 모던 브라우저 지원)
  - Option C: 혼합 (아이콘=PNG, 씬=WebP)

- [ ] **Q3**: render_stage 테스트 격리 방식?
  - Option A: **`@pytest.mark.skip`** (명확한 skip, CI에서 표시)
  - Option B: `@pytest.mark.xfail(strict=False)` (실패 허용, 성공 시 알림)
  - Option C: 테스트 파일 자체를 `tests/quarantine/`으로 이동

## 참고 자료

- `vibe/prd.md` 12절 — 성능 지표
- `vibe/prd.md` 9.7절 — 에셋 성능 예산
- `vibe/debt-log.md` — 기술 부채 SSOT (미해결 12건 중 8건 해소 목표)
- [Vite Build Optimization](https://vite.dev/guide/build.html)
- [React Performance](https://react.dev/learn/render-and-commit)
- `frontend/public/ui/README.md` — 에셋 SSOT
- `frontend/src/test/setup.ts` — 테스트 환경 글로벌 설정
- `frontend/src/components/EconomyHud.test.tsx` — initReactI18next mock 패턴 참조
- `vibe/unit-results/U-097[Mvp].md` — render_stage 아키텍처 변경 이력
- `vibe/unit-results/U-127[Mvp].md` — 기본 모델 QUALITY 전환 이력
