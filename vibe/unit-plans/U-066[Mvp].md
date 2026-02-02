# U-066[Mvp]: 이미지 생성 지연 흡수 플로우(연출/late binding) + 모델 티어링(FAST/QUALITY) + 타이핑 효과

## 메타데이터

| 항목      | 내용                                  |
| --------- | ------------------------------------- |
| Unit ID   | U-066[Mvp]                            |
| Phase     | MVP                                   |
| 예상 소요 | 90분                                  |
| 의존성    | U-065[Mvp], U-055[Mvp], U-020[Mvp]    |
| 우선순위  | ⚡ Critical (멀티모달 데모 체감/지연 UX) |

## 작업 목표

이미지 생성이 **10~20초 이상 지연**되더라도 "멈춤/실패"로 느껴지지 않게, **텍스트는 계속 진행되고(Scene은 late-binding), 이미지는 적절한 타이밍에 자연스럽게 도착**하는 UX 플로우를 구현한다. 상황에 따라 **`gemini-2.5-flash-image`(FAST)** 를 사용해 지연을 줄일 수 있는 모델 티어링을 추가한다.

또한 **내러티브 텍스트에 타이핑(Typewriter) 효과**를 적용하여, 텍스트가 한 글자씩 천천히 표시되며 이미지 생성 시간을 자연스럽게 흡수한다. 스트리밍/이미지 로딩 중에는 타이핑 속도를 **느리게**(목표 12초), 유휴 상태에서는 **빠르게**(목표 2.5초) 조절하여 지연을 체감상 최소화한다.

**배경**: 현재는 (1) 텍스트 우선 스트리밍 + (2) Lazy Render(placeholder/이전 이미지 유지) + (3) 이미지 실패 시 텍스트-only 폴백이 존재한다(U-020/U-054). 하지만 "지연이 길다"는 케이스에서 **폴백을 최소화**하려면, 실패로 수렴시키기보다 **진행 연출(loading/queue)** 과 **늦게 도착하는 이미지의 안전한 결합(턴/씬 버전 일치)** 이 필요하다. 추가로, **텍스트가 즉시 표시되면 "이미지만 안 나옴"이 부각**되므로, 타이핑 연출로 시간을 벌어 이미지 도착 타이밍과 맞추는 것이 자연스럽다.

**완료 기준**:

- TurnOutput에 `render.image_job.should_generate=true`가 포함되어도 **턴 완료(텍스트/패널/핫스팟 갱신)는 즉시 가능**하고, Scene Canvas는 "형성 중" 상태로 자연스럽게 유지된다(이전 이미지 유지 + 로딩 인디케이터/라벨).
- 이미지가 늦게 도착해도 **해당 턴/씬에만 반영**된다(늦게 끝난 이전 요청이 새 장면을 덮어쓰지 않음: turn_id/scene_revision 가드).
- 상황별 모델 티어링이 동작한다:
  - `model_label=FAST` 또는 time budget이 작은 경우 → `gemini-2.5-flash-image`
  - 기본/최종 품질 → `gemini-3-pro-image-preview`
- 프롬프트 원문은 **로그/클라 UI에 노출되지 않으며**(RULE-007), 이미지 생성 지연/완료는 Agent Console/SceneCanvas 라벨로만 가시화된다(RULE-008).
- 실패 시에도 "즉시 텍스트-only로 포기"가 아니라, UX 상 **진행은 유지**되고(placeholder/이전 이미지), 필요 시 **사용자 액션으로 재시도**할 수 있다(폴백은 최후 수단, RULE-004는 유지).
- **타이핑 효과**가 NarrativeFeed에 적용되어, 텍스트가 한 글자씩 출력되며 체감 지연을 흡수한다:
  - 스트리밍/이미지 로딩 중: 느린 타이핑 속도(TARGET_DURATION ~12초)
  - 유휴 상태: 빠른 타이핑 속도(TARGET_DURATION ~2.5초)
  - 클릭/Enter/Space로 즉시 전체 표시(Fast-forward)
  - `prefers-reduced-motion` 설정 시 타이핑 효과 비활성화(접근성)

## 영향받는 파일

**생성**:

- `frontend/src/api/image.ts` - `/api/image/generate` 호출 클라이언트(요청/응답 타입, Abort 지원)
- (선택) `frontend/src/turn/imageJobRunner.ts` - 이미지 잡 실행/취소/late-binding 가드 유틸(턴 러너에서 분리)

**수정**:

- `frontend/src/turn/turnRunner.ts` - `onFinal`에서 `render.image_job` 감지 → 비동기 이미지 생성 시작 + 씬 상태(imageLoading) 토글
- `frontend/src/stores/worldStore.ts` - `sceneState.imageLoading`/`previousImageUrl`을 SSOT로 갱신("형성 중" 상태), late-binding용 `sceneRevision`(또는 turnCount 기반 토큰) 적용
- `frontend/src/components/SceneImage.tsx` - `imageLoading` 플래그 기반 로딩 인디케이터 표시("새 URL이 없어도" 로딩 연출 가능), 전환 시 페이드 인(선택)
- `frontend/src/types/scene.ts` - `SceneCanvasState`의 `imageLoading`/`previousImageUrl` 사용 방식 정리(필요 시 확장)
- `backend/src/unknown_world/api/image.py` - (선택) `model_label`/`turn_id` 파라미터 추가(클라이언트 티어링/late-binding 지원)
- `backend/src/unknown_world/services/image_generation.py` - `model_label`에 따른 이미지 모델 선택(FAST=2.5 Flash Image, QUALITY=3 Pro Image Preview)
- `backend/src/unknown_world/config/models.py` - 이미지 모델 ID 매핑 확장(IMAGE_FAST 추가 등)
- `frontend/src/components/NarrativeFeed.tsx` - **타이핑(Typewriter) 효과 구현**: character-by-character 텍스트 출력, 동적 속도 조절, fast-forward, 접근성 지원
- `frontend/src/locales/ko-KR/translation.json` - `narrative.fast_forward_title`, `narrative.fast_forward_aria` 키 추가
- `frontend/src/locales/en-US/translation.json` - `narrative.fast_forward_title`, `narrative.fast_forward_aria` 키 추가

**참조**:

- `vibe/unit-plans/U-020[Mvp].md` - Lazy Render(placeholder/이전 이미지 유지)
- `vibe/unit-plans/U-053[Mvp].md` - 이미지 결과 동기화 패턴(프롬프트 로그 금지 포함)
- `vibe/unit-plans/U-054[Mvp].md` - 실패/차단 폴백(RULE-004)
- `vibe/ref/image-generate-guide.md` - `gemini-2.5-flash-image`/`gemini-3-pro-image-preview` 모델 선택 가이드
- `backend/src/unknown_world/api/image.py` - "턴 TTFB 비블로킹" 설계 의도 주석
- `frontend/src/stores/agentStore.ts` - `isStreaming` 상태(타이핑 속도 결정에 사용)
- `frontend/src/stores/worldStore.ts` - `sceneState.imageLoading` 상태(타이핑 속도 결정에 사용)

## 구현 흐름

### 1단계: "지연 흡수" 상태/가드 계약 확정 (프론트 SSOT)

- `sceneState`에 **late-binding 토큰**을 도입한다.
  - 예: `sceneRevision = turnCount` (턴 완료 시점의 값) 또는 UUID
  - 이미지 요청/응답이 이 토큰을 들고 다니며, 불일치 시 UI 반영 금지
- "형성 중" 연출을 위해, **새 imageUrl이 아직 없어도** 로딩 인디케이터가 보이도록 `sceneState.imageLoading`을 SSOT로 사용한다.

### 2단계: 프론트에서 이미지 생성 비동기 실행(턴과 분리)

- `onFinal`에서 `TurnOutput.render.image_job`을 검사한다.
- `should_generate=true`인 경우:
  - `sceneState.imageLoading=true`로 전환(이전 이미지가 있으면 유지)
  - `/api/image/generate`를 **별도 fetch**로 호출(AbortController로 취소 지원)
  - 성공 시: `sceneRevision` 일치할 때만 `sceneState.status='scene'`, `imageUrl` 갱신 + `imageLoading=false`
  - 실패 시: `imageLoading=false` + placeholder/이전 이미지 유지(게임 진행은 계속)

### 3단계: 모델 티어링(FAST/QUALITY) 적용

- 기본 정책:
  - `image_job.model_label=FAST` → `gemini-2.5-flash-image`
  - 그 외(기본) → `gemini-3-pro-image-preview`
- (옵션) "프리뷰→최종" 업그레이드:
  - 먼저 FAST(저해상도)로 빠른 프리뷰를 생성해 표시
  - 이후 QUALITY(표준/고해상도)로 재생성하여 교체
  - 비용/지연/재화 정책(예상 비용, 추가 비용)과 함께 Economy HUD에 라벨로 노출

### 4단계: 내러티브 타이핑(Typewriter) 효과 구현

- `NarrativeFeed.tsx`에 character-by-character 타이핑 효과를 추가한다:
  - **상수 정의**:
    - `TYPING_TICK_MS = 32` (ms 단위 타이핑 인터벌, ~30fps)
    - `TARGET_DURATION_MS_WHILE_STREAMING = 12000` (스트리밍/로딩 중 느린 모드)
    - `TARGET_DURATION_MS_IDLE = 2500` (유휴 상태 빠른 모드)
    - `MIN_CPS = 10`, `MAX_CPS = 400` (characters per second 범위 제한)
  - **상태 관리**:
    - `prefersReducedMotion`: `window.matchMedia('(prefers-reduced-motion: reduce)')` 감지
    - `targetText`: 현재 타이핑 대상 텍스트(스트리밍 텍스트 또는 마지막 entries)
    - `typedLen`: 현재까지 표시된 글자 수
    - `fastForward`: 사용자가 빠르게 넘기기를 요청했는지
  - **동적 속도 계산**:
    - `shouldBuyTime = isStreaming || sceneState.status === 'loading' || sceneState.imageLoading === true`
    - `cps = clamp(targetText.length / (durationMs / 1000), MIN_CPS, MAX_CPS)`
  - **타이핑 루프**: `setInterval`로 `typedLen`을 증가시키며 `visibleStreamingText = targetText.slice(0, typedLen)` 계산
  - **Fast-forward**: 클릭/Enter/Space 시 `fastForward=true`로 즉시 전체 표시
  - **커서 표시**: 타이핑 진행 중(`typedLen < targetText.length && !fastForward`)일 때만 `▌` 커서 표시
- 중복 표시 방지: `shouldHideLastEntryWhileTyping` 로직으로 `entries` 마지막 항목과 타이핑 중 텍스트가 겹치면 entries 쪽을 숨김

### 5단계: 관측 가능성(에이전트/UX) 보강

- Agent Console에 "Render=완료" 이후에도 Scene Canvas에서 "이미지 형성 중"이 보이도록, UI 라벨/배지(예: `IMAGE_PENDING`, `IMAGE_READY`)를 추가하는 방안을 검토한다.
- 로그에는 모델 라벨/소요시간만 기록하고(prompt 원문 금지), 데모 오버레이(10.2) 지표에 `image_generation_time_ms`를 남긴다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-065[Mvp]](U-065[Mvp].md) - TurnOutput 스키마 단순화(추가 필드 확장 최소화 전제)
- **계획서**: [U-020[Mvp]](U-020[Mvp].md) - 이전 이미지 유지/placeholder/폴백 UX 패턴
- **계획서**: [U-055[Mvp]](U-055[Mvp].md) - Mock/Real 이미지 파이프라인 통합 검증 기반

**다음 작업에 전달할 것**:

- CP-MVP-03: "텍스트는 즉시 진행 + 이미지 늦게 도착해도 자연스러움" 데모 시나리오/런북에 포함
- (MMP) Agentic Vision(U-109) 같은 이미지 기반 고급 기능에서 "late-binding 이미지"를 안정적으로 참조 가능

## 주의사항

**기술적 고려사항**:

- (RULE-007) 프롬프트 원문/비밀정보를 로그/프론트 UI에 노출하지 않는다. 이미지 요청은 메타(해시/라벨)만 로깅한다.
- (RULE-006) 상태 라벨/에러 메시지는 i18n 키 기반으로 제공한다(ko/en 혼합 금지).
- `gemini-2.5-flash-image`는 입력 참조 이미지 수 제한이 더 엄격할 수 있으므로(가이드 참고), 참조 이미지가 많은 편집/REF 시나리오는 QUALITY로 강제한다.
- 타이핑 효과는 `prefers-reduced-motion` 설정을 존중해야 한다(접근성).
- Fast-forward UI는 `role="button"`, `tabIndex={0}`, `aria-label` 등 접근성 속성을 포함해야 한다.

**잠재적 리스크**:

- 프리뷰→최종 업그레이드는 비용이 2회 발생할 수 있음 → Economy HUD에 "예상 비용(최소/최대)" 및 대안(프리뷰만/텍스트만)을 반드시 제시.
- 늦게 도착한 이미지가 새 장면을 덮는 버그가 데모 신뢰도를 크게 훼손 → turn_id/sceneRevision 가드를 필수로 두고, 새 턴 시작 시 이전 이미지 요청은 Abort한다.
- 타이핑 효과가 너무 느리면 사용자 불편 → MIN_CPS 하한(10 CPS) 설정으로 최소 속도 보장 + fast-forward 제공.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 이미지 생성 실행 위치(기본 정책)는?
  - Option A: **프론트에서 `/api/image/generate` 호출(턴과 분리, 권장)** — 텍스트 턴 완료를 블로킹하지 않음
  - Option B: 서버 render_stage에서 await(현재 구조 유지) — 구현 단순하지만 턴 tail latency 증가
- [ ] **Q2**: 모델 티어링 정책은?
  - Option A: `model_label` 기반(FAST/QUALITY)만 적용(단순)
  - Option B: time budget 기반 + 자동 프리뷰→최종 업그레이드(체감 최적)
- [ ] **Q3**: 프리뷰→최종 업그레이드를 MVP에 포함할까?
  - Option A: 포함하지 않음(FAST 또는 QUALITY 단일 생성)
  - Option B: Key scene에만 제한적으로 포함(추가 비용/지연 명시)
- [ ] **Q4**: 타이핑 효과의 기본 속도 정책은?
  - Option A: 현재 설정 유지(느린 모드 12초, 빠른 모드 2.5초)
  - Option B: 더 빠르게 조정(느린 모드 8초, 빠른 모드 1.5초)

## 참고 자료

- `vibe/prd.md` - 6.3(멀티모달), 10.2(관측/메트릭), 8.5(이미지 모델)
- `vibe/tech-stack.md` - 모델 라인업(모델 ID 고정/티어링)
- `vibe/ref/image-generate-guide.md` - 이미지 모델 선택/제약
- `backend/src/unknown_world/api/image.py` - 이미지 생성 API(분리 경로)
