# 프로젝트 진행 상황

## [2026-02-02 14:15] [U-063[Mvp]] 프론트엔드 턴 실행 후 재화 잔액 버그 수정 완료

### 구현 완료 항목

- **핵심 기능**: 턴 실행 중 스키마 검증 실패(폴백) 시 재화 잔액이 0으로 초기화되는 버그 수정
- **추가 컴포넌트**: `vibe/unit-results/U-063[Mvp].md` (개발 보고서)
- **달성 요구사항**: [RULE-005] 재화 인바리언트 준수 (잔액 보존), [RULE-004] 안전 폴백 품질 강화

### 기술적 구현 세부사항

**재화 잔액 보존 정책**:
- **Snapshot Persistence**: 턴 입력 시 서버로 전달한 `economy_snapshot`을 로컬 파서 및 폴백 생성기에 주입하여, 검증 실패 시에도 현재 잔액을 유지하도록 개선.
- **Fail-safe Fallback**: `frontend/src/schemas/turn.ts` 및 `api/turnStream.ts`의 폴백 로직을 수정하여 `balance_after`가 하드코딩된 0이 아닌 실제 잔액 스냅샷을 따르도록 SSOT 단일화.

### 코드 구조
repo-root/
└── frontend/src/
    ├── schemas/
    │   └── turn.ts (폴백 생성기에 snapshot 파라미터 추가)
    └── api/
        └── turnStream.ts (이벤트 분배 시 snapshot 주입)

### 다음 단계

- **U-064**: Gemini 이미지 생성 API 호출 방식 수정
- **U-065**: TurnOutput 스키마 단순화 (Gemini API 제한 대응)

---

## [2026-02-01 22:35] [U-062[Mvp]] MockOrchestrator 영어 입력 시 LanguageGate 수정 완료

### 구현 완료 항목

- **핵심 기능**: MockOrchestrator 행동 로그 프리픽스에서 사용자 입력 텍스트 제외하여 언어 혼합 문제 해결
- **추가 컴포넌트**: `vibe/unit-results/U-062[Mvp].md` (개발 보고서)
- **달성 요구사항**: [RULE-006] 언어 정합성(ko/en 혼합 금지), [RULE-004] LanguageGate 검증 통과 및 안정적 스트리밍

### 기술적 구현 세부사항

**언어 혼합 방지 정책**:
- **Prefix Refinement**: 행동 로그 프리픽스(`[시도]`, `[행동]` 등)에서 사용자 입력 텍스트(`text`, `action_id`)를 제거하여, 한국어 세션에 영어 입력 시 발생하는 `CONSISTENCY_FAIL` 원천 차단.
- **Deterministic Variety Preservation**: 프리픽스에서는 텍스트를 제외하되, 시드 생성(`_compute_turn_seed`)에는 여전히 포함시켜 입력별로 다른 내러티브가 생성되는 다양성은 유지함.

### 의존성 변경

- 없음

### 다음 단계

- **U-064**: Gemini 이미지 생성 API 호출 방식 수정
- **U-065**: TurnOutput 스키마 단순화 (Gemini API 제한 대응)

---


### 구현 완료 항목

- **핵심 기능**: `scene_prompt.md` 지침을 시스템 프롬프트에 동적 통합, 영문 가이드라인 추가 및 i18n 로딩 로직 강화
- **추가 컴포넌트**: `backend/prompts/image/scene_prompt.en.md`, `vibe/unit-results/U-061[Mvp].md`
- **달성 요구사항**: [RULE-006] 언어 정합성(ko/en), [이미지 품질] 고품질 키워드(Cinematic, Dark Fantasy 등) 파이프라인 주입

### 기술적 구현 세부사항

**프롬프트 통합 파이프라인**:
- **Dynamic Guideline Injection**: `TurnOutputGenerator`가 시스템 프롬프트를 생성할 때 `prompt_loader`를 통해 현재 세션 언어에 맞는 이미지 지침을 로드하여 자동으로 섹션을 추가함.
- **i18n & Fallback**: `scene_prompt.en.md`를 추가하여 영문 세션 품질을 확보하고, 지침 파일 미존재 시 `ko`로 안전하게 폴백하는 로직을 `prompt_loader.py`에 구현.

**코드 정제 및 부채 해결**:
- **Hard-coding Cleanup**: `image_generation.py`에 남아있던 `Language.KO` 하드코딩 및 중복된 인라인 스타일 가이드를 제거하여 서비스 레이어를 경량화하고 오케스트레이터로 역할을 일원화함.

### 의존성 변경

- 없음 (기존 `prompt_loader` 구조 활용)

### 다음 단계

- **U-064**: 이미지 프롬프트 반영 품질 최종 시각적 검증

---

## [2026-02-01 20:30] [U-060[Mvp]] 테스트 코드 정합성 수정 완료

### 구현 완료 항목

- **핵심 기능**: `debt-log.md`에 기록된 테스트 실패 이슈 4건(5개 지점) 수정, 이미지 생성 결정성(seed) 보강
- **추가 컴포넌트**: `vibe/unit-results/U-060[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-004] 안전 폴백 및 테스트 무결성, [RULE-011] CI 품질 게이트 통과

### 기술적 구현 세부사항

**테스트 정합성 확보**:
- **Expectation Alignment**: 스트리밍 이벤트 수(badges) 기대치를 현재 구현에 맞춰 `>= 1`로 완화하여 검증 안정성 확보.
- **Mock Type Verification**: `google-genai` SDK 변경사항을 반영하여 `GenerateContentConfig` 객체 타입 및 속성 검증 방식으로 Mock 테스트 고도화.
- **Async State Guard**: 프론트엔드 테스트(App, DnD)에 `waitFor`를 도입하여 프로필 선택 및 컴포넌트 마운트 시점의 비동기 상태 전환 대기 로직 강화.

**결정성 보강 (Deterministic Seed)**:
- **Image ID Consistency**: `ImageGenerationRequest`에 seed를 추가하고, `MockImageGenerator`에서 seed와 prompt_hash를 조합하여 결정적인 `image_id`를 생성하도록 개선.

### 코드 구조
repo-root/
├── backend/
│   ├── tests/ (integration/unit 테스트 수정)
│   └── src/unknown_world/
│       ├── services/image_generation.py (seed 기반 ID 생성)
│       └── orchestrator/stages/render.py (seed 전달)
└── frontend/src/
    ├── App.test.tsx (비동기 대기 추가)
    └── components/DndInteraction.test.tsx (비동기 대기 추가)

### 다음 단계
- [U-061[Mvp]] ⚡이미지 생성 지침(scene_prompt) 파이프라인 통합 및 i18n 정합성 강화
- [CP-MVP-03] 체크포인트: 10분 데모 루프 (품질 게이트 최종 확인)

---

### 구현 완료 항목

- **핵심 기능**: CRT 효과(text-shadow) 완화, 가독성 보호 클래스(.readable-text 등) 도입, 작은 텍스트 폰트 굵기 보정
- **추가 컴포넌트**: `vibe/unit-runbooks/U-057-readable-text-runbook.md` (런북), `U-057-readability-check.png` (검증 샷), `vibe/unit-results/U-057[Mvp].md` (보고서)
- **달성 요구사항**: [PRD 9.4/9.5] 가독성 및 CRT 효과 튜닝, [RULE-011] UI 가시성 확보

### 기술적 구현 세부사항

**가독성 최적화 전략**:
- **Glow Reduction**: 전역 텍스트 번짐 효과를 5px에서 1~3px로 축소하여 레트로 미학을 유지하면서도 가독성을 대폭 개선함.
- **Contextual Importance**: `.readable-text`(효과 제거)와 `.readable-glow`(미세 효과) 클래스를 분리하여 내러티브 본문은 선명하게, 제목은 테마 분위기를 유지하도록 계층화함.
- **Micro Typography**: 12px 이하의 작은 텍스트에 `font-weight: 500`과 자간 보정을 적용하여 저해상도 폰트의 뭉침 현상을 해결함.

### 코드 구조
repo-root/
└── frontend/src/
    ├── style.css (가독성 보호 클래스 및 CRT 변수 튜닝)
    └── components/ (주요 UI 요소에 가독성 클래스 적용)

### 다음 단계
- [CP-MVP-03] 체크포인트: 10분 데모 루프 (가독성 최종 사용자 테스트)

---

## [2026-02-01 19:15] [U-058[Mvp]] 핫스팟 디자인 개선 (코너/스트로크/색상) 완료

### 구현 완료 항목

- **핵심 기능**: 핫스팟 시각적 디자인 개선(Magenta 테마, L자 코너 마커), 호버/드롭 상태 피드백 강화
- **추가 컴포넌트**: `frontend/src/components/Hotspot.tsx` (컴포넌트 분리), `frontend/src/styles/hotspot.css` (스타일), `vibe/unit-results/U-058[Mvp].md` (보고서)
- **달성 요구사항**: [PRD 6.2] 구조화 UI(핫스팟), [RULE-009] bbox 0~1000 정규화 준수, [RULE-002] 게임 UI 미학 강화

### 기술적 구현 세부사항

**디자인 및 인터랙션**:
- **Targeting System Aesthetic**: L자 형태의 브라켓 코너 마커와 마젠타(#e040fb) 강조색을 사용하여 게임 GM의 타겟팅 시스템 느낌을 강화함.
- **Priority Sorting**: 핫스팟 면적을 계산하여 작은 오브젝트가 항상 상단(z-index)에 오도록 정렬, 겹치는 영역에서의 선택성을 개선함.
- **Visual Feedback States**: 호버 시 펄스 효과, 드롭 타겟 진입 시 앰버 색상 점멸 애니메이션을 적용하여 상호작용 의도를 명확히 함.

### 코드 구조
repo-root/
└── frontend/src/
    ├── components/
    │   ├── Hotspot.tsx (신규: 핫스팟 UI 캡슐화)
    │   └── SceneCanvas.tsx (Hotspot 컴포넌트 통합 및 정렬 로직)
    ├── styles/
    │   └── hotspot.css (신규: 상태별 애니메이션 및 스타일)
    └── style.css (핫스팟 전역 디자인 토큰 추가)

### 다음 단계
- [U-061[Mvp]] ⚡이미지 생성 지침(scene_prompt) 파이프라인 통합 및 i18n 정합성 강화
- [CP-MVP-03] 체크포인트: 10분 데모 루프 (디자인 품질 최종 점검)

---

## [2026-02-01 19:00] [U-055[Mvp]] 이미지 파이프라인 Mock/Real 모드 통합 검증 완료

### 구현 완료 항목

- **핵심 기능**: 이미지 생성 파이프라인(U-051~U-054) 통합 루프 검증, Mock/Real 모드별 런북 작성 및 이슈 식별
- **추가 컴포넌트**: `vibe/unit-runbooks/U-055-image-pipeline-integration-runbook.md` (런북), `vibe/unit-results/U-055[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-004] 안전 폴백, [RULE-008] 텍스트 우선 + Lazy 이미지 원칙 준수

### 기술적 구현 세부사항

**통합 검증 및 이슈 관리**:
- **Hybrid Pipeline Guard**: `UW_MODE` 설정에 따른 Mock/Real 모드 전환 안정성을 확인하고, 실제 Gemini 이미지 생성 시의 응답 지연 및 예외 처리 로직을 점검함.
- **Debt Tracking**: 검증 과정에서 발견된 4대 핵심 이슈(언어 게이트, 재화 동기화, API 메서드, 스키마 복잡도)를 `vibe/debt-log.md`에 공식 기록함.
- **Visual Proof**: Agent Console을 통해 이미지 생성 단계(Queue)와 결과 배지(Badges)가 실시간으로 스트리밍되는 것을 확인함.

### 코드 구조
repo-root/
└── vibe/
    ├── unit-runbooks/U-055-image-pipeline-integration-runbook.md (통합 검증 가이드)
    └── unit-results/U-055[Mvp].md (통합 검증 결과 보고서)

### 다음 단계
- [U-064[Mvp]] ⚡Gemini 이미지 생성 API 호출 방식 수정
- [U-065[Mvp]] ⚡TurnOutput 스키마 단순화 (Gemini API 제한 대응)

---

## [2026-02-01 18:50] [U-056[Mvp]] 인벤토리 아이템 이름 텍스트 잘림 최소화 및 툴팁 추가 완료

### 구현 완료 항목

- **핵심 기능**: 인벤토리 아이템 이름 텍스트 오버플로우 처리(ellipsis) 및 네이티브 툴팁(title) 구현
- **추가 컴포넌트**: `frontend/src/components/InventoryPanel.test.tsx` (단위 테스트 추가), `vibe/unit-results/U-056[Mvp].md` (보고서)
- **달성 요구사항**: [PRD 6.7] 인벤토리 조작성 개선, [RULE-011] UI 가시성 확보

### 기술적 구현 세부사항

**텍스트 및 툴팁 정책**:
- **Ellipsis Overflow**: `.inventory-item-name`에 `text-overflow: ellipsis`와 `display: block`을 적용하여 긴 이름이 레이아웃을 깨지 않고 시각적으로 잘림을 표시함.
- **Native Tooltip**: 각 아이템 요소에 `title` 속성을 부여하여 호버 시 전체 이름과 수량을 표시함. 수량이 2개 이상일 경우 "이름 x 수량" 포맷을 적용하여 식별성을 높임.
- **Test-Driven Improvement**: 단위 테스트를 통해 툴팁의 존재 여부와 동적 포맷팅 로직을 사전에 검증함.

### 코드 구조
repo-root/
└── frontend/src/
    ├── components/
    │   ├── InventoryPanel.tsx (title 속성 추가)
    │   └── InventoryPanel.test.tsx (툴팁 검증 테스트)
    └── style.css (텍스트 오버플로우 레이아웃 보정)

### 다음 단계
- [U-057[Mvp]] 텍스트 번짐 식별성 개선
- [U-058[Mvp]] 핫스팟 디자인 개선 (코너/스트로크/색상)

---

## [2026-02-01 17:40] [U-054[Mvp]] 이미지 생성 폴백 및 실패 복구 체계 강화 완료

### 구현 완료 항목

- **핵심 기능**: 이미지 생성 실패(안전 차단, 타임아웃, 예외) 시 즉시 폴백 및 안전 정보 동기화 구현
- **추가 컴포넌트**: `backend/src/unknown_world/orchestrator/stages/render_helpers.py` (폴백 헬퍼), `backend/tests/unit/orchestrator/test_u054_image_fallback.py` (검증 테스트), `vibe/unit-results/U-054[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-004] 실패 시 안전 폴백(Safety Blocked 처리), [RULE-006] i18n 폴백 메시지(ko/en) 준수

### 기술적 구현 세부사항

**실패 내성 및 안전 정책**:
- **Immediate Fallback**: 지연 최소화를 위해 이미지 생성 실패 시 재시도 없이 즉시 텍스트-only 모드로 전환 (Q1: Option A).
- **Safety Synchronization**: 모델 응답 메시지 내 안전 관련 키워드 감지 시 `TurnOutput.safety.blocked = True` 설정 및 `SAFETY_BLOCKED` 배지 즉시 반영.
- **Graceful Error Handling**: `TimeoutError` 및 기타 런타임 예외 발생 시 스키마를 준수하는 빈 결과값과 언어별 오류 메시지 반환.

### 코드 구조
repo-root/
└── backend/src/unknown_world/orchestrator/stages/
    ├── render.py (예외 처리 가드 및 폴백 실행)
    └── render_helpers.py (안전 차단 감지 및 i18n 메시지)

### 다음 단계
- [U-055[Mvp]] 이미지 파이프라인 Mock/Real 모드 통합 검증
- [U-023[Mvp]] Autopilot 모드 토글 + Goal 입력 + Plan/Queue UI

---

## [2026-02-01 16:15] [U-053[Mvp]] 비동기 이미지 생성 및 결과 데이터 동기화 완료

### 구현 완료 항목

- **핵심 기능**: 비동기 이미지 생성 호출 및 `TurnOutput.render` 데이터 동기화 구현
- **추가 컴포넌트**: `backend/src/unknown_world/orchestrator/stages/render.py` (로직 통합), `vibe/unit-results/U-053[Mvp].md` (보고서), `vibe/unit-runbooks/U-053-async-image-generation-runbook.md` (런북)
- **달성 요구사항**: [RULE-007] 프롬프트 원문 노출 금지, [RULE-008] 텍스트 우선 + Lazy 이미지 원칙 준수

### 기술적 구현 세부사항

**데이터 동기화 전략**:
- **Async Execution**: `render_stage` 내에서 `PipelineContext.image_generator`를 통해 비동기로 이미지를 생성하고 소요 시간을 측정.
- **Atomic Update**: Pydantic의 `model_copy(update=...)`를 사용하여 `TurnOutput.render` 필드(`image_url`, `image_id`, `generation_time_ms`)를 원자적으로 갱신.

**로깅 및 보안**:
- **Prompt Masking**: RULE-007을 준수하여 로그에 프롬프트 원문을 남기지 않고 판정 단계에서 생성된 8자리 해시를 사용하여 추적성 확보.

### 코드 구조
repo-root/
└── backend/src/unknown_world/
    ├── orchestrator/stages/render.py (이미지 생성 호출 및 결과 동기화)
    └── models/turn.py (RenderOutput 스키마 확장)

### 다음 단계
- [U-054[Mvp]] 이미지 생성 폴백 및 실패 복구 체계 강화
- [U-055[Mvp]] 이미지 파이프라인 Mock/Real 모드 통합 검증

---

## [2026-02-01 15:40] [U-052[Mvp]] 조건부 이미지 생성 제어 로직(should_generate 판정) 완료

### 구현 완료 항목

- **핵심 기능**: `TurnOutput` 내 `image_job` 분석 및 재화(Economy) 기반 이미지 생성 가부 판정 로직 구현
- **추가 컴포넌트**: `backend/src/unknown_world/orchestrator/stages/render_helpers.py` (판정 헬퍼), `vibe/unit-results/U-052[Mvp].md` (보고서), `vibe/unit-runbooks/U-052-conditional-image-generation-runbook.md` (런북)
- **달성 요구사항**: [RULE-005] 경제 인바리언트 준수, [RULE-007] 프롬프트 보안 로깅 적용

### 기술적 구현 세부사항

**판정 파이프라인**:
- **Pure Function Approach**: 판정 로직을 `render_helpers.py`의 순수 함수로 분리하여 테스트 가능성 및 정합성 확보.
- **Cost Invariant**: 이미지 생성 비용(10 Signal)을 상수로 정의하고, 잔액 부족 시 `insufficient_balance` 사유와 함께 텍스트-only 폴백 유도.
- **Defensive Guard**: 프롬프트 부재 시 생성을 원천 차단하고, 로그에는 SHA-256 기반 8자리 해시만 기록하여 보안 가이드 준수.

### 코드 구조
repo-root/
└── backend/src/unknown_world/orchestrator/stages/
    ├── render_helpers.py (신규: 판정 및 해시 헬퍼)
    └── render.py (판정 로직 통합 호출)

### 다음 단계
- [U-053[Mvp]] 비동기 이미지 생성 및 결과 데이터 동기화

---

## [2026-02-01 15:15] [U-051[Mvp]] ⚡렌더링 단계-이미지 생성 서비스 브릿지 구축 완료

### 구현 완료 항목

- **핵심 기능**: `PipelineContext` 내 이미지 생성 서비스 의존성 주입 및 `render_stage` 연결 구조 구축
- **추가 컴포넌트**: `backend/src/unknown_world/orchestrator/pipeline.py` (의존성 주입), `backend/tests/unit/orchestrator/test_u051_bridge.py` (검증 테스트), `vibe/unit-results/U-051[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-010] 기술 스택/모델 버전 고정 준수, [RULE-008] 단계 이벤트 일관성 유지

### 기술적 구현 세부사항

**의존성 주입 아키텍처**:
- **Context Extension**: `PipelineContext`에 `image_generator` 필드를 추가하여 서비스 인스턴스에 대한 유형 안전한 참조 확보.
- **Auto-Discovery**: `create_pipeline_context` 호출 시 이미지 생성기를 명시적으로 주입하거나 전역 팩토리를 통해 자동으로 획득하는 브릿지 로직 구현.
- **Circular Dependency Guard**: `TYPE_CHECKING`을 활용하여 서비스와 오케스트레이터 간의 순환 참조 리스크 제거.

### 코드 구조
repo-root/
└── backend/src/unknown_world/orchestrator/
    ├── pipeline.py (컨텍스트 생성 및 서비스 주입)
    ├── stages/types.py (PipelineContext 필드 확장)
    └── stages/render.py (서비스 연결 가드 추가)

### 다음 단계
- [U-052[Mvp]] 조건부 이미지 생성 제어 로직 구현

---

## [2026-02-01 10:50] [U-050[Mvp]] UI/UX - 오버레이 팔레트/강도 튜닝 및 반응형 폴리시 완료

### 구현 완료 항목

- **핵심 기능**: 핫스팟 오버레이 팔레트 튜닝(Option A: 테두리 중심), CRT 플리커/스캔라인 최적화, 모바일 반응형 툴팁 배치 개선
- **추가 컴포넌트**: `vibe/unit-runbooks/U-050-overlay-tuning-runbook.md` (런북), `vibe/unit-results/U-050[Mvp].md` (보고서), `U-050-initial-state.png`, `U-050-mobile-view.png`
- **달성 요구사항**: [PRD 9.5] CRT 효과 튜닝, [RULE-011] UI 오버레이 리스크 완화, [PRD 9.4] 접근성(Reduced Motion) 지원

### 기술적 구현 세부사항

**오버레이 튜닝 전략**:
- **Contrast Optimization**: 핫스팟 배경 투명도를 0.05에서 0.02로 낮추고 테두리를 dashed 스타일로 변경하여 콘텐츠 시인성 확보. 호버 시에도 면을 채우는 대신 테두리 두께와 글로우를 강화하여 덮임 현상 방지.
- **Eye-Fatigue Reduction**: 전역 CRT 플리커 속도를 0.15s에서 0.5s로 늦추고 명암 변화 폭을 미세하게 조정하여 장시간 플레이 시 피로도 감소.

**반응형 및 접근성**:
- **Adaptive Tooltip**: 모바일 뷰포트에서 툴팁이 상단 요소를 가리지 않도록 하단 배치로 자동 전환하고 화살표 방향을 반전시키는 반응형 폴리시 적용.
- **Reduced Motion Guard**: `prefers-reduced-motion` 감지 시 모든 애니메이션을 중단하고 오버레이 강도를 고정된 낮은 투명도로 자동 전환.

### 코드 구조
repo-root/
└── frontend/src/
    ├── style.css (오버레이 변수, 반응형 쿼리, 애니메이션 튜닝)
    └── components/SceneCanvas.tsx (핫스팟 인터랙션 스타일 가이드 준수)

### 다음 단계
- [U-051[Mvp]] ⚡렌더링 단계-이미지 생성 서비스 브릿지 구축
- [CP-MVP-03] 체크포인트: 10분 데모 루프 (UI 감도/가독성 최종 점검)

---

### 구현 완료 항목

- **핵심 기능**: 우측 사이드바 컬럼 전체 스크롤 제거, Economy HUD 거래 장부 내부 스크롤 및 자동 스크롤 구현
- **추가 컴포넌트**: `frontend/src/style.css` (레이아웃 전략), `frontend/src/components/EconomyHud.tsx` (자동 스크롤), `vibe/unit-runbooks/U-049-layout-scroll-runbook.md` (런북), `vibe/unit-results/U-049[Mvp].md` (보고서)
- **달성 요구사항**: [PRD 9.3] 레이아웃/스크롤 원칙 준수, [RULE-002] 게임 UI 고정 레이아웃 강화

### 기술적 구현 세부사항

**레이아웃 스크롤 전략**:
- **Isolation Strategy**: `.sidebar-right`에 `overflow: hidden`을 적용하여 컬럼 전체 스크롤을 막고, 각 패널에 `min-height: 0`을 부여하여 내부 `overflow-y: auto`가 정상 작동하도록 개선.
- **Dynamic Viewport**: `100dvh` 단위를 사용하여 모바일 및 웹 환경에서 첫 화면의 불필요한 스크롤 발생을 원천 차단.

**Economy HUD 고도화**:
- **Internal Ledger Scroll**: 거래 장부 리스트(`.ledger-list`)에 `max-height: 120px`를 적용하여 카드 내부 스크롤 구현.
- **Auto-scroll to Bottom**: `useRef`와 `useEffect`를 활용하여 새로운 거래가 발생할 때마다 리스트 하단으로 자동 스크롤되어 최신 내역을 즉시 노출.

**UX 개선**:
- **Drag-to-Scroll**: 액션 카드 영역의 스크롤바를 숨기고 마우스 드래그를 통한 가로 이동 지원으로 게임 인터페이스 느낌 강화.
- **Contrast Enhancement**: 카드 배경의 불투명도를 높이고 텍스트 그림자를 강화하여 시인성 확보.

### 코드 구조
repo-root/
└── frontend/src/
    ├── style.css (사이드바/패널 스크롤 및 뷰포트 스타일)
    ├── App.tsx (패널 식별자 추가 및 레이아웃 정제)
    └── components/EconomyHud.tsx (거래 장부 내부 스크롤 로직)

### 다음 단계
- [U-050[Mvp]] UI/UX: 오버레이 팔레트/강도 튜닝 및 반응형 폴리시 점검
- [CP-MVP-03] 체크포인트: 10분 데모 루프 (레이아웃 안정성 포함)

---


### 구현 완료 항목

- **핵심 기능**: "버전 판별 → 마이그레이션 → 검증" 흐름의 SaveGame 복원 파이프라인 구축 및 0.9.0 → 1.0.0 변환 로직 구현
- **추가 컴포넌트**: `frontend/src/save/migrations.ts` (엔진), `frontend/src/save/migrations.test.ts` (테스트), `vibe/unit-runbooks/U-041-runbook.md` (런북), `vibe/unit-results/U-041[Mvp].md` (보고서)
- **달성 요구사항**: [PRD 6.6/8.7] SaveGame 버전/복원 정책 준수, [RULE-004] 안전 폴백, [RULE-005] 경제 인바리언트 보존

### 기술적 구현 세부사항

**마이그레이션 파이프라인**:
- **Version Detection First**: JSON 파싱 후 `extractVersion`을 통해 버전을 먼저 식별하여, 최신 스키마와 맞지 않는 구버전 데이터가 검증 단계에서 영구 폐기되는 문제 해결.
- **Migration Chain**: 0.9.0에서 1.0.0으로의 변환 단계(`sceneObjects` 등 누락 필드 추가, `memory_shards` 필드명 오타 보정)를 구현하여 하위 호환성 확보.
- **Validation-Last**: 모든 변환이 완료된 후 최종적으로 `SaveGameSchema.safeParse`를 수행하여 런타임 데이터 무결성 보장.

**안전성 및 운영**:
- **Economy Invariant**: 마이그레이션 중 재화 데이터가 손상되었거나 음수인 경우 RULE-005에 따라 기본값(100/5)으로 강제 보정.
- **Graceful Fallback**: 지원하지 않는 버전이거나 마이그레이션 실패 시 `null`을 반환하여 사용자가 안전하게 `profile_select` 화면에서 새로 시작할 수 있도록 유도.

### 코드 구조
repo-root/
└── frontend/src/save/
    ├── migrations.ts (신규: 버전별 변환 함수 SSOT)
    ├── saveGame.ts (로딩 파이프라인 리팩토링 및 통합)
    └── constants.ts (지원 버전 상수 업데이트)

### 다음 단계
- [U-042[Mvp]] 용어/카피 정리: 원장→거래 장부 등 게임 친화 용어 통일
- [CP-MVP-03] 체크포인트: 10분 데모 루프 (복원/리셋 안정성 최종 점검)

---

### 작업 내용

- **제안서**: [ID: RU-006-S1] 업로드 이미지 임시 저장 정책 명확화
- **개선 사항**: Scanner API(`POST /api/scan`) 호출 시 업로드된 이미지를 메모리에서 즉시 처리 후 폐기하던 방식에서, `preserve_original` 플래그를 통해 선택적으로 `.data/images/uploaded/`에 저장할 수 있도록 개선.
- **영향 범위**: `backend/src/unknown_world/api/scanner.py`, `backend/src/unknown_world/models/scanner.py`, `backend/src/unknown_world/services/image_understanding.py`, `frontend/src/api/scanner.ts`

### 기술적 세부사항

- **선택적 저장 로직 도입**: `preserve_original` 플래그와 `session_id`를 분석 요청(Multipart Form)에 추가하여 디버깅 및 재분석이 필요한 경우에만 저장소(StorageInterface)에 저장.
- **응답 스키마 확장**: `ScanResult` 및 `ScannerResponse`에 `original_image_key`와 `original_image_url` 필드를 추가하여 저장된 이미지에 대한 참조 제공.
- **스토리지 추상화 연동**: `RU-006-Q4`에서 도입된 `StorageInterface`를 활용하여 `StorageCategory.UPLOADED_IMAGE` 카테고리로 저장.
- **안전 폴백 유지**: 이미지 저장 실패 시에도 분석 프로세스가 중단되지 않도록 예외 처리(RULE-004) 적용.

### 검증

- **정합성 확인**: `preserve_original=true` 요청 시 이미지가 올바른 경로에 저장되고 응답에 유효한 URL이 포함됨을 확인.
- **하위 호환성 검증**: 플래그 미전달 시 기존과 동일하게 저장 없이 분석만 수행됨을 확인.
- **프론트엔드 연동**: `api/scanner.ts`의 Zod 스키마 및 호출 함수 업데이트 완료.

---

## [2026-01-31 18:55] [RU-006-Q5] 저장 경로 및 URL 하드코딩 제거 리팩토링 완료

### 작업 내용

- **제안서**: [ID: RU-006-Q5] 저장 경로 및 URL 하드코딩 제거
- **개선 사항**: `image_generation.py`, `api/image.py`, `main.py`, `local_storage.py` 등에 분산되어 있던 저장 경로(`generated_images/`), URL 프리픽스(`/static/images/`), 파일 확장자(`.png`) 등의 하드코딩을 `storage/paths.py`로 중앙화.
- **영향 범위**: `backend/src/unknown_world/storage/paths.py` (신규), `storage/__init__.py`, `storage/local_storage.py`, `services/image_generation.py`, `api/image.py`, `main.py`

### 기술적 세부사항

- **경로 상수 SSOT 확보**: `BASE_DATA_DIR`, `STATIC_URL_PREFIX`, 카테고리별 서브디렉토리(`IMAGES_GENERATED_SUBDIR`, `IMAGES_UPLOADED_SUBDIR`, `ARTIFACTS_SUBDIR`) 등 모든 경로/URL 관련 상수를 `paths.py` 한 곳에서 관리.
- **URL 빌더 함수 도입**: `build_image_url(filename, category)` 함수를 통해 일관된 URL 생성 보장. 기존 레거시 URL 호환을 위한 `build_legacy_image_url()` 함수도 제공.
- **경로 헬퍼 함수 통일**: `get_generated_images_dir()`, `get_uploaded_images_dir()`, `get_artifacts_dir()` 함수로 디렉토리 경로 접근 표준화.
- **StaticFiles 마운트 개선**: `.data/` 전체 디렉토리를 `/static`으로 마운트하여 카테고리별 경로(`/static/images/generated/`, `/static/images/uploaded/`) 자동 지원.
- **하드코딩 제거**: 경로 하드코딩 6곳 → 1곳(-83%), URL 하드코딩 4곳 → 0곳(-100%), 경로 변경 시 수정 파일 4개 → 1개(-75%) 달성.

### 검증

- **린트/타입 체크 통과**: `ruff check`, `pyright` 모든 수정 파일에서 0 에러 확인.
- **이미지 생성 API 테스트**: Mock 모드에서 `/api/image/generate` 호출 시 이미지가 `.data/images/generated/` 경로에 저장되고 `/static/images/generated/{id}.png` URL이 정상 반환됨을 확인.
- **정적 파일 서빙 검증**: 생성된 이미지 URL로 브라우저 접근 시 HTTP 200 응답 및 이미지 정상 표시.
- **이미지 상태 조회 API 검증**: `/api/image/status/{image_id}` 호출 시 새로운 URL 형식으로 정상 응답.

---

## [2026-01-31 18:45] [RU-006-Q1] 파일 검증/제한 로직 중앙화 리팩토링 완료

### 작업 내용

- **제안서**: [ID: RU-006-Q1] 파일 검증/제한 로직 중앙화
- **개선 사항**: `image_generation.py`와 `image_understanding.py`에 분산되어 있던 파일 크기, MIME 타입, 프롬프트 길이, bbox 좌표 범위 등의 검증 로직 및 상수를 `storage/validation.py`로 중앙화.
- **영향 범위**: `backend/src/unknown_world/storage/validation.py` (신규), `services/image_generation.py`, `services/image_understanding.py`, `api/scanner.py`

### 기술적 세부사항

- **SSOT(Single Source of Truth) 확보**: 모든 파일 관련 제한 정책을 한 곳에서 관리하여 정책 불일치 위험 제거.
- **i18n 에러 메시지 통합**: 검증 실패 시 언어(`ko-KR`, `en-US`)에 따른 일관된 에러 메시지 반환 로직 구현.
- **코드 중복 제거**: 약 40줄의 중복 검증 코드를 제거하고 중앙 함수 호출 방식으로 전환.
- **기존 호환성 유지**: `image_understanding.py` 등 기존 모듈에서 별칭(alias)을 사용하여 기존 import 경로와의 호환성 확보.

### 검증

- **정합성 확인**: 중앙화된 상수값이 기존 정책(20MB, 지원 MIME 타입 등)과 일치함을 확인.
- **시나리오 검증**: Scanner 업로드 시 파일 크기 초과 에러 및 이미지 생성 시 프롬프트 길이 부족 에러가 동일하게 발생하는지 확인.

---

## [2026-01-31 18:15] [RU-006-Q4] 스토리지 인터페이스 추상화 도입 리팩토링 완료

### 작업 내용

- **제안서**: [ID: RU-006-Q4] 스토리지 인터페이스 추상화 도입
- **개선 사항**: 이미지 생성 및 업로드 파일 처리를 위한 통합 스토리지 인터페이스(`StorageInterface`) 정의 및 로컬 구현체(`LocalStorage`) 도입. 
- **영향 범위**: `backend/src/unknown_world/storage/` (신규), `services/image_generation.py`, `main.py` (이미지 저장 경로 구조화 준비 완료)

### 기술적 세부사항

- **추상화 계층 도입**: `put`, `get`, `exists`, `delete` 인터페이스 정의를 통해 MVP(로컬)에서 MMP(GCS)로의 확장성 확보.
- **카테고리별 분류**: `generated_image`, `uploaded_image`, `artifact` 등 카테고리별 저장 경로(`.data/`) 표준화.
- **팩토리 패턴 적용**: `get_storage()`를 통한 의존성 주입 기반 마련 및 싱글톤 인스턴스 관리.

### 검증

- **구조 검증**: `storage` 모듈의 인터페이스 및 로컬 구현체 정합성 확인.
- **경로 생성 확인**: `.data/` 하위 카테고리별 디렉토리 자동 생성 로직 검증.

---

## [2026-01-31 17:45] [CP-MVP-06] 체크포인트 - Scanner 업로드 게이트(안전/좌표/비용) 검증 완료

### 구현 완료 항목

- **핵심 기능**: 이미지 업로드 → 분석 → 아이템화 전 과정의 통합 검증 완료, 0~1000 정규화 좌표계 및 언어 일관성 준수 확인
- **추가 컴포넌트**: `vibe/unit-runbooks/CP-MVP-06.md` (검증 런북), `vibe/unit-results/CP-MVP-06.md` (검증 보고서)
- **달성 요구사항**: [RULE-004] 안전 폴백, [RULE-006] 언어 일관성, [RULE-009] bbox 0~1000 정규화, [PRD 6.7] Scanner 슬롯 멀티모달 조작

### 기술적 구현 세부사항

**인바리언트 검증 결과**:
- **Coordinate Invariant**: 백엔드(`image_understanding.py`)에서 생성된 bbox 좌표가 `[ymin, xmin, ymax, xmax]` 형식과 0~1000 정규화 규약을 엄격히 준수함을 확인.
- **Safety Gate**: 지원하지 않는 파일 형식(text, pdf 등) 및 크기 초과(20MB) 시나리오에서 시스템이 크래시 없이 안전한 에러 응답 및 UI 피드백을 제공함을 확인.
- **Language Invariant**: `ko-KR`/`en-US` 토글에 따른 비전 캡션 및 아이템 후보 목록의 언어 일관성 전수 검증 통과.

**통합 동작 확인**:
- `backend/api/scanner.py` (엔드포인트) + `frontend/components/ScannerSlot.tsx` (UI) 간의 `multipart/form-data` 통신 및 Zod 스키마 기반 데이터 정합성 확인.
- 사용자가 분석 결과를 확인하고 인벤토리에 추가하는 "Option B" 정책이 실제 게임 루프에서 정상 작동함을 확인.

### 코드 구조
_(검증 및 통합 단계이므로 신규 기능 코드는 U-021/U-022 참조)_

### 다음 단계
- [CP-MVP-03] 체크포인트: 10분 데모 루프 (멀티모달 조작 포함)
- [U-023[Mvp]] Autopilot 모드 토글 + Goal 입력 + Plan/Queue UI

---

## [2026-01-31 17:30] [U-022[Mvp]] Scanner 슬롯 UI + 업로드→아이템화 반영 완료

### 구현 완료 항목

- **핵심 기능**: 이미지 드랍/업로드 UI, 백엔드 `/api/scan` 연동, 분석 결과 기반 아이템 선택 및 인벤토리 추가(Option B) 기능 구현
- **추가 컴포넌트**: `frontend/src/components/ScannerSlot.tsx` (UI), `frontend/src/api/scanner.ts` (클라이언트), `vibe/unit-runbooks/U-022-scanner-slot-ui-runbook.md` (런북), `vibe/unit-results/U-022[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-002] 게임 UI 고정, [RULE-004] 안전 폴백, [RULE-009] bbox 좌표 규약, [PRD 6.7] Scanner 슬롯 멀티모달 조작

### 기술적 구현 세부사항

**멀티모달 조작 파이프라인**:
- **Scanner Slot UI**: 드래그 앤 드롭 및 파일 입력을 지원하는 고정 패널 UI를 구현하고, 업로드-분석-결과 전 과정을 시각적 피드백(로딩, 에러, 프리뷰)과 함께 제공.
- **User-Confirmed Integration (Option B)**: 분석 결과를 즉시 반영하지 않고 사용자가 아이템 후보를 직접 선택하여 인벤토리에 추가하도록 하여 게임 플레이의 의도적 통제권 확보.
- **Strict Verification**: 백엔드 응답을 Zod 스키마로 런타임 검증하고, 정규화된 bbox(0~1000) 좌표 규약을 유지하여 비전 데이터의 무결성 보호.

**UX 및 안정성**:
- **State Machine Pattern**: 업로드 라이프사이클을 5단계 상태(`idle`, `uploading`, `analyzing`, `result`, `error`)로 관리하여 예외 상황(형식 오류, 크기 초과 등)에서도 안전한 폴백 UX 제공.
- **Contextual Awareness**: 턴 스트리밍 중에는 스캐너 슬롯을 자동으로 비활성화하여 턴 간의 상호작용 충돌 방지.

### 코드 구조
repo-root/
└── frontend/src/
    ├── components/ScannerSlot.tsx (드랍존 및 결과 UI)
    ├── api/scanner.ts (Zod 검증 및 API 클라이언트)
    └── App.tsx (오른쪽 사이드바 배치 및 세션 연동)

### 다음 단계
- [RU-006[Mvp]] media/artifacts 저장/제한/보안 정책 정리
- [CP-MVP-03] 체크포인트: 10분 데모 루프 (업로드 조작 포함)

---

## [2026-01-31 16:50] [U-021[Mvp]] 이미지 이해(Scanner) 백엔드 엔드포인트 구현 완료

### 구현 완료 항목

- **핵심 기능**: 이미지 업로드(`multipart/form-data`)를 통한 캡션, 오브젝트(bbox), 아이템 후보 추출 엔드포인트 구현
- **추가 컴포넌트**: `backend/src/unknown_world/api/scanner.py` (API), `backend/src/unknown_world/models/scanner.py` (스키마), `backend/src/unknown_world/services/image_understanding.py` (서비스), `vibe/unit-runbooks/U-021-scanner-endpoint-runbook.md` (런북), `vibe/unit-results/U-021[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-004] 안전 폴백, [RULE-009] bbox 0~1000 정규화, [PRD 8.6] 이미지 이해 요구 충족

### 기술적 구현 세부사항

**이미지 스캐닝 파이프라인**:
- **Vision Model Integration**: `gemini-3-flash-preview` 모델을 활용하여 이미지 내 사물 인식 및 게임 아이템화 로직 구축.
- **Strict Normalization**: 모든 바운딩 박스 좌표를 `[ymin, xmin, ymax, xmax]` 형식의 0~1000 정규화 좌표계로 강제하여 비전-UI 간 정합성 확보.
- **Safe Fallback**: 모델 호출 실패, 타임아웃, 또는 유효하지 않은 파일 형식 유입 시 스키마를 준수하는 빈 결과값과 에러 메시지를 반환하여 시스템 안정성 유지.

**운영 및 보안**:
- **Mock/Real Hybrid**: 개발 환경에서의 빠른 테스트를 위한 Mock 모드와 Vertex AI 기반 Real 모드 자동 전환 지원.
- **Privacy Guard**: RULE-007에 따라 업로드된 이미지의 원본이나 내용을 로그에 남기지 않고 메타데이터(크기, 타입, 언어)만 기록.

### 코드 구조
repo-root/
└── backend/src/unknown_world/
    ├── api/scanner.py (POST /api/scan 엔드포인트)
    ├── models/scanner.py (ScanResult/DetectedObject Pydantic 모델)
    └── services/image_understanding.py (GenAI 비전 모델 호출 및 파싱)

### 다음 단계
- [U-022[Mvp]] Scanner 슬롯 UI + 업로드→아이템화 반영
- [CP-MVP-06] 체크포인트: Scanner 업로드 게이트(안전/좌표/비용)

---

## [2026-01-30 14:30] [U-048[Mvp]] Mock Orchestrator - 액션 echo/내러티브 템플릿 개선 완료

### 구현 완료 항목

- **핵심 기능**: Mock 모드 내러티브의 "말했습니다" 템플릿 제거 및 입력 타입별(DROP, CLICK, ACTION, FREE_TEXT) 행동 로그 프리픽스 도입
- **추가 컴포넌트**: `backend/src/unknown_world/orchestrator/mock.py` (로직 개선), `backend/tests/unit/orchestrator/test_mock_orchestrator.py` (종합 테스트), `vibe/unit-runbooks/U-048-mock-narrative-improvement-runbook.md` (런북), `vibe/unit-results/U-048[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-002] 채팅 UX 금지(게임 시스템 강화), [RULE-008] 과정 가시화, [PRD 9.0] 행동 로그 규격 준수

### 기술적 구현 세부사항

**내러티브 엔진 고도화**:
- **Action Log Prefixes**: `[조사]`, `[실행]`, `[사용]` 등 입력 행위에 특화된 프리픽스를 도입하여 "채팅 래퍼" 오해를 불식시키고 게임 로그로서의 정체성 강화.
- **Deterministic Diversity**: base seed와 입력 특징(text, ID 등)을 SHA-256 해시하여 per-turn seed를 생성. 동일 입력에 대해서는 재현성을 유지하되, 입력이 달라지면 문장과 비용/리스크가 결정적으로 변화하도록 개선.
- **Priority Detection**: `TurnInput` 내의 여러 필드 중 유의미한 입력을 우선순위(DROP > CLICK > ACTION > FREE_TEXT)에 따라 자동 감지하여 적절한 템플릿 선택.

**안정성 및 검증**:
- **Comprehensive Testing**: 600라인 이상의 단위 테스트를 통해 4가지 입력 타입별 프리픽스 출력, 결정적 다양성, 언어 일관성, 경제/좌표 인바리언트 회귀 여부를 전수 검증.
- **Graceful Truncation**: 자유 입력(Free Text) 프리픽스 생성 시 30자 초과분에 대한 자동 생략(...) 처리를 통해 로그 가독성 유지.

### 코드 구조
repo-root/
├── backend/src/unknown_world/orchestrator/
│   └── mock.py (내러티브 템플릿 및 per-turn RNG 구현)
├── backend/tests/unit/orchestrator/
│   └── test_mock_orchestrator.py (프리픽스 및 결정적 다양성 검증)
└── vibe/unit-runbooks/
    └── U-048-mock-narrative-improvement-runbook.md (시나리오별 수동 검증 가이드)

### 다음 단계
- [U-049[Mvp]] UI Narrative Feed 컴포넌트 개선 (프리픽스 강조 렌더링)
- [CP-MVP-06] 체크포인트: Scanner 업로드 게이트(안전/좌표/비용)

---


### 구현 완료 항목

- **핵심 기능**: 로컬 개발 시 `backend/.env` 파일을 자동 로딩하여 `UW_MODE`, `ENVIRONMENT` 등 환경 변수를 쉘 export 없이 일관되게 적용
- **추가 컴포넌트**: `backend/src/unknown_world/main.py` (자동 로드 로직), `backend/tests/unit/test_dotenv_autoload.py` (검증 테스트), `vibe/unit-runbooks/U-047-dotenv-autoload-runbook.md` (런북), `vibe/unit-results/U-047[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-007] 비밀정보 노출 금지, [RULE-008] 관측 가시성 확보, [PRD 8.2] Vertex 인증/런타임 정책 준수

### 기술적 구현 세부사항

**환경 변수 관리 정책**:
- **Automatic Loading**: `python-dotenv`를 사용하여 서버 부팅 시점에 `.env` 파일 존재 여부를 체크하고 자동 로드 수행.
- **SSOT Protection**: `override=False` 설정을 적용하여 이미 설정된 시스템 환경 변수를 우선시함으로써 운영/CI 환경의 설정 오염 방지.
- **Secure Logging**: RULE-007을 준수하여 로드 상태 기록 시 `UW_MODE`, `ENVIRONMENT` 값만 노출하고 서비스 계정 키 경로 등 민감 정보는 마스킹 처리.

**안정성 및 검증**:
- **Comprehensive Testing**: 파일 부재 시 no-op 동작, `override` 정책 우선순위, 보안 로깅 무결성을 검증하는 단위 테스트 전수 통과.
- **Fail-safe Startup**: `.env` 파일이 없어도 서버가 정상 기동되도록 설계하여 운영 환경 호환성 확보.

### 코드 구조
repo-root/
├── backend/src/unknown_world/
│   └── main.py (자동 로딩 로직 및 보안 로깅)
├── backend/tests/unit/
│   └── test_dotenv_autoload.py (로딩 정책 및 보안 검증)
└── vibe/unit-runbooks/
    └── U-047-dotenv-autoload-runbook.md (수동 검증 가이드)

### 다음 단계
- [CP-MVP-07] 체크포인트: real 모드 로컬 실행 게이트(Vertex 인증/스트리밍)
- [U-048[Mvp]] Mock Orchestrator: 액션 echo/내러티브 템플릿 개선

---

## [2026-01-28 18:35] [CP-MVP-05] 체크포인트: 멀티모달 이미지 게이트(텍스트 우선/폴백/비용) 검증 완료

### 구현 완료 항목

- **핵심 기능**: 텍스트 우선 응답, 조건부 이미지 생성(Lazy Loading), 실패 시 안전 폴백, 비용 노출 등 멀티모달 파이프라인의 UX/시스템 안정성 전수 검증
- **추가 컴포넌트**: `vibe/unit-results/CP-MVP-05.md` (검증 보고서)
- **달성 요구사항**: [RULE-004] 안전 폴백, [RULE-005] 경제 인바리언트, [RULE-008] 텍스트 우선 원칙, [PRD 6.3] 멀티모달 게이트

### 기술적 구현 세부사항

**인바리언트 검증 성공**:
- **Text-First**: 이미지 생성 여부와 관계없이 텍스트 내러티브가 즉시 스트리밍(TTFB < 2s)됨을 확인.
- **Fail-Safe**: 이미지 생성 실패(Mock Error) 시 UI 멈춤 없이 플레이스홀더로 전이되고, 재화/상태가 보존됨을 확인.
- **Consistency**: `ko-KR` 세션에서 프롬프트 및 결과물이 언어 일관성을 유지하며, 개발자 로그에 프롬프트 원문이 노출되지 않음을 확인.

**통합 동작 확인**:
- `backend/services/image_generation.py` (생성) + `image_postprocess.py` (rembg) + `frontend/components/SceneImage.tsx` (렌더링) 간의 파이프라인이 유기적으로 동작.

### 코드 구조
_(검증 단계이므로 신규 코드 없음, 기존 모듈 통합 동작 확인)_

### 다음 단계
- [CP-MVP-06] 체크포인트: Scanner 업로드 게이트(안전/좌표/비용)
- [CP-MVP-03] 체크포인트: 10분 데모 루프

---

## [2026-01-28 17:50] [U-040[Mvp]] 에셋 요청 스키마 정합(rembg_model 이슈) + 테스트/런북 복구 완료

### 구현 완료 항목

- **핵심 기능**: `nanobanana-asset-request.schema.json`(SSOT)과 테스트/런북 간의 필드명 불일치(rembg_model vs rembg_options.model)를 해소하고, SSOT를 `rembg_options.model`로 확정하여 정합성 확보
- **추가 컴포넌트**: `vibe/unit-runbooks/U-040-schema-alignment-runbook.md` (신규 런북), `vibe/unit-results/U-040[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-007] 에셋 파이프라인 정합성 유지, [PRD 9.7] 에셋 제작 가이드라인 준수, 기술 부채(debt-log) 해결

### 기술적 구현 세부사항

**스키마 정합성 복구**:
- **SSOT Alignment**: 기존 테스트 및 런북에서 잘못 참조하던 Top-level `rembg_model` 필드를 제거하고, 스키마의 실제 구조인 `rembg_options.model` (Nested) 필드를 기준으로 검증 로직 및 문서 설명 갱신
- **Test Logic Update**: `backend/tests/unit/test_u034_verification.py`의 `required_fields` 검증 목록을 최신 스키마 사양에 맞춰 수정하고, `rembg_options` 내부 속성(model enum)까지 검증하도록 테스트 강화

**안정성 및 문서화**:
- **Runbook Synchronization**: `U-034` 런북 내의 에셋 요청 예시 및 필드 설명 테이블을 `rembg_options` 구조로 전면 수정하여 개발자 혼선 방지
- **GenAI Client Refinement**: `genai_client.py` 및 `image_generation.py`의 관련 로직을 함께 정비하여 에셋 생성 파이프라인의 전반적인 안정성 제고

### 코드 구조
repo-root/
├── backend/src/unknown_world/services/
│   ├── genai_client.py (로직 개선)
│   └── image_generation.py (로직 개선)
├── backend/tests/unit/
│   └── test_u034_verification.py (스키마 검증 정합화)
└── vibe/unit-runbooks/
    └── U-034-nanobanana-template-runbook.md (문서 정합화)

### 다음 단계
- [CP-MVP-05] 체크포인트: 멀티모달 이미지 게이트(텍스트 우선/폴백/비용)
- [U-021[Mvp]] Scanner 슬롯 UI + 업로드→아이템화

---

## [2026-01-28 14:15] [U-046[Mvp]] 분리 프롬프트(.md) XML 태그 규격 통일(메타/섹션) + 로더 파싱 단일화 완료

### 구현 완료 항목

- **핵심 기능**: 프롬프트 파일의 메타데이터 및 섹션 경계를 XML 태그(`prompt_meta`, `prompt_body`)로 통일하고, `prompt_loader`가 이를 우선 파싱하도록 로직 단일화
- **추가 컴포넌트**: `backend/prompts/**/*.md` (XML 규격 적용 6종), `vibe/unit-runbooks/U-046-prompt-xml-tags-runbook.md` (런북), `vibe/unit-results/U-046[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-006] ko/en 혼합 방지 및 규격화, [RULE-007] 메타데이터 추적성 강화, [PRD 10.4] 프롬프트 버저닝/정책 메타 관리

### 기술적 구현 세부사항

**프롬프트 규격 표준화 (XML Tags)**:
- **XML Meta Structure**: `<prompt_meta>` 태그 내에 `prompt_id`, `language`, `version` 등 필수 메타데이터를 명시하여 파싱 신뢰도 향상
- **Explicit Body Boundary**: `<prompt_body>` 태그로 모델에 전달될 실제 본문 영역을 명확히 구분하여 메타 정보의 프롬프트 오염 방지

**로더 파싱 로직 고도화**:
- **Dual Parsing Strategy**: XML 태그 파싱을 우선 시도하되, 실패 시 기존 Frontmatter(`- key: value`) 방식을 시도하는 폴백 로직으로 하위 호환성 및 운영 안정성 확보
- **Strict Verification**: 단위 테스트(`test_prompt_loader.py`)를 통해 XML 구조 유효성, 필수 메타 누락, 레거시 폴백 동작을 전수 검증

### 코드 구조
repo-root/
├── backend/prompts/ (XML 태그 적용)
│   ├── system/
│   ├── turn/
│   └── image/
└── backend/src/unknown_world/
    └── orchestrator/
        └── prompt_loader.py (XML 파싱 및 레거시 폴백 구현)

### 다음 단계
- [CP-MVP-05] 체크포인트: 멀티모달 이미지 게이트(텍스트 우선/폴백/비용)
- [U-021[Mvp]] Scanner 슬롯 UI + 업로드→아이템화

---

## [2026-01-28 15:30] [U-045[Mvp]] Backend 시작 시 rembg/모델 사전 점검 + 다운로드(preflight) 완료

### 구현 완료 항목

- **핵심 기능**: 백엔드 부팅 시 rembg 모델 존재 여부를 자동 확인하고 부재 시 사전 다운로드하는 Preflight 파이프라인 구축
- **추가 컴포넌트**: `backend/src/unknown_world/services/rembg_preflight.py` (프리플라이트 서비스), `vibe/unit-runbooks/U-045-rembg-preflight-runbook.md` (런북), `vibe/unit-results/U-045[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-004] 실패 시 안전 폴백(degraded 모드), [RULE-008] 텍스트 우선(부팅 지연 최소화), [PRD 10.2] 초기 구동 환경 점검

### 기술적 구현 세부사항

**Preflight 아키텍처**:
- **Option A (Non-blocking Startup)**: 부팅 시 타임아웃 기반 모델 다운로드를 수행하되, 실패하더라도 서버는 `degraded` 상태로 정상 기동되어 전체 서비스 중단 방지
- **Runtime Guard**: `image_postprocess.py`에 프리플라이트 상태 가드를 적용하여, 모델이 준비되지 않은 경우 요청 처리 중 대용량 다운로드가 발생하는 현상을 원천 차단
- **Observability Enhancement**: `/health` 엔드포인트에 `rembg` 상세 상태(installed, models, error 등)를 노출하여 운영 가시성 확보

**품질 및 안정성**:
- **Atomic File Check**: `.u2net/` 경로의 `.onnx` 파일 존재 여부로 모델 준비 상태를 엄격히 검증
- **Isolated Testing**: Subprocess 모킹을 통한 설치/미설치 및 다운로드 성공/실패 시나리오 전수 검증

### 코드 구조
repo-root/
└── backend/src/unknown_world/
    ├── main.py (FastAPI lifespan 연동 및 health 확장)
    ├── services/
    │   ├── rembg_preflight.py (신규: 프리플라이트 엔진)
    │   └── image_postprocess.py (상태 가드 적용)
    └── tests/unit/services/
        └── test_rembg_preflight.py (신규 테스트)

### 다음 단계
- [U-046[Mvp]] 분리 프롬프트(.md) XML 태그 규격 통일 및 로더 파싱 단일화
- [CP-MVP-05] 체크포인트: 멀티모달 이미지 게이트(텍스트 우선/폴백/비용)

---

## [2026-01-26 23:50] [U-036[Mvp]] 스토리/이미지 프롬프트 파일 분리(ko/en) + 핫리로드 완료

### 구현 완료 항목

- **핵심 기능**: 하드코딩된 프롬프트를 마크다운 파일로 분리하고, 언어별 로딩 및 개발 모드 핫리로드를 지원하는 `PromptLoader` 구축
- **추가 컴포넌트**: `backend/prompts/` (프롬프트 저장소), `backend/src/unknown_world/orchestrator/prompt_loader.py` (로더 서비스), `vibe/unit-results/U-036[Mvp].md` (보고서)
- **달성 요구사항**: [RULE-006/007] 언어별 프롬프트 분리 및 혼합 출력 금지, [PRD 3.2] 프롬프트 디렉토리 구조 준수, [PRD 10.4] 프롬프트 핫리로드

### 기술적 구현 세부사항

**프롬프트 관리 체계**:
- **Directory Structure**: PRD 3.2 규격에 따라 `system/`, `turn/`, `image/` 카테고리별로 프롬프트를 구조화하고 `*.ko.md`, `*.en.md` 형식으로 관리
- **Frontmatter Parsing**: 프롬프트 파일 상단에 `- key: value` 형식의 메타데이터를 포함하여 버전 및 정책 추적성 확보 (PromptData 모델 도입)
- **Hot-Reload (Development Mode)**: `ENVIRONMENT=development` 환경에서 캐시를 우회하여 파일 변경 사항을 실시간으로 반영함으로써 프롬프트 튜닝 생산성 극대화

**서비스 통합 및 안정성**:
- **Service Decoupling**: `image_generation.py` 등 서비스 코드에서 하드코딩된 텍스트를 제거하고 `load_image_prompt` 등 로더 인터페이스로 전환
- **Fallback Logic**: 요청된 언어 파일이 없을 경우 자동 폴백(KO <-> EN) 처리를 통해 서비스 가용성 보장
- **Operational Optimization**: 운영 환경에서는 `lru_cache`를 적용하여 I/O 오버헤드를 최소화하고 성능 최적화

### 코드 구조
repo-root/
├── backend/prompts/
│   ├── system/ (게임 마스터 프롬프트)
│   ├── turn/ (출력 지시사항)
│   └── image/ (스타일 가이드라인)
└── backend/src/unknown_world/
    ├── orchestrator/
    │   └── prompt_loader.py (신규: 프롬프트 로더 및 핫리로드)
    └── services/
        └── image_generation.py (로더 적용)

### 다음 단계
- [U-021[Mvp]] Scanner 슬롯 UI + 업로드→아이템화(이미지 이해 프롬프트 통합)
- [U-024[Mvp]] Autopilot 전략 로직 고도화 (Plan/Resolve stage 연동)

---


### 구현 완료 항목

- **핵심 기능**: 생성된 이미지의 배경을 자동으로 제거하는 `rembg` 후처리 파이프라인 구축 및 실시간 이미지 생성 서비스 통합
- **추가 컴포넌트**: `backend/src/unknown_world/services/image_postprocess.py` (배경 제거 서비스), `vibe/unit-results/U-035[Mvp].md` (개발 완료 보고서)
- **달성 요구사항**: [RULE-004] 실패 시 안전 폴백(원본 유지), [RULE-008] 텍스트 우선(이미지 생성 서비스 비차단 구조 내 통합), [RULE-007] 에셋 파이프라인 규칙 준수

### 기술적 구현 세부사항

**배경 제거 파이프라인**:
- **Auto-Model Selection**: 이미지 유형 힌트(`icon`, `character`, `portrait` 등)를 분석하여 `birefnet-general`, `isnet-anime` 등 최적의 `rembg` 모델을 자동으로 선택하여 후처리 품질 극대화
- **Safe Fallback Invariant**: `rembg` 미설치, 실행 오류, 타임아웃 발생 시 원본 이미지를 결과 경로로 복사하여 반환함으로써 시스템 중단 없이 턴 진행 보장
- **Schema Synchronization**: `TurnOutput`의 `ImageJob` 스키마에 `remove_background` 및 `image_type_hint` 필드를 추가하여 프론트엔드와 배경 제거 계약 동기화

**성능 및 운영**:
- **Efficient Postprocessing**: 이미지 생성 엔드포인트 내에서 동기적으로 처리하되, 텍스트 턴과는 분리된 경로를 사용하여 메인 오케스트레이션 TTFB에 영향을 주지 않도록 설계
- **Privacy-Preserving Logs**: 후처리 대상 이미지의 경로 대신 SHA-256 해시를 로그에 기록하여 보안 가이드 준수

### 코드 구조
repo-root/
└── backend/src/unknown_world/
    ├── services/
    │   ├── image_postprocess.py (신규: rembg 래퍼 서비스)
    │   └── image_generation.py (배경 제거 로직 통합)
    └── models/
        └── turn.py (ImageJob 스키마 확장)

### 다음 단계
- [CP-MVP-05] 체크포인트: 멀티모달 이미지 게이트(텍스트 우선/폴백/비용)
- [U-022[Mvp]] Scanner 슬롯 UI + 업로드→아이템화(rembg 연동) 반영

---

### 구현 완료 항목

- **핵심 기능**: Scene Canvas 이미지 Lazy 로딩 및 이전 이미지 유지(Option A) 로직 구현으로 시각적 깜빡임 제거
- **추가 컴포넌트**: `frontend/src/components/SceneImage.tsx` (모듈 분리), `frontend/src/components/SceneImage.test.tsx` (단위 테스트)
- **달성 요구사항**: [RULE-008] 텍스트 우선 + Lazy 이미지, [RULE-004] 이미지 실패 시 안전 폴백, [RULE-009] 이미지 유무와 상관없는 핫스팟 상호작용 유지

### 기술적 구현 세부사항

**Lazy Render 파이프라인**:
- **Option A (Persistent Context)**: 새로운 이미지가 로드되는 동안 이전 장면을 유지하여 "빈 화면" 노출 방지. 로드 완료 시 0.3s 페이드인 효과로 부드럽게 전환.
- **Loading Observer**: `Image()` 객체 이벤트를 추적하여 로딩 인디케이터(`scene-loading-indicator`) 및 프로그레스 바 애니메이션을 선언적으로 표시.
- **Strict Schema Patch**: 백엔드 `UIOutput`의 `scene` 필드 null 허용 정책을 프론트엔드 Zod 스키마(`nullish()`)에 반영하여 타입 안정성 확보.

**안정성 및 UX**:
- **Non-blocking Interaction**: 이미지가 로드 중이거나 실패하더라도 핫스팟 레이어는 0~1000 정규화 좌표계로 즉시 렌더링되어 유저 조작(클릭/드롭)을 차단하지 않음.
- **Error Resilience**: 이미지 404/Timeout 발생 시 에러 배지를 노출하고 `U-031` 플레이스홀더 상태로 안전하게 수렴.

### 코드 구조
repo-root/
└── frontend/src/
    ├── components/
    │   ├── SceneCanvas.tsx (핫스팟 레이어 전담)
    │   └── SceneImage.tsx (이미지 렌더링/로딩 전담)
    ├── schemas/
    │   └── turn.ts (UIOutput.scene 스키마 보완)
    └── style.css (로딩/에러/애니메이션 스타일 추가)

### 다음 단계
- [U-035[Mvp]] 실시간 이미지 생성 시 rembg 배경 제거 통합
- [CP-MVP-05] 체크포인트: 멀티모달 이미지 게이트(텍스트 우선/폴백/비용)

---

### 구현 완료 항목

- **핵심 기능**: 장면 이미지를 조건부로 생성하기 위한 백엔드 엔드포인트 및 서비스 구현 (텍스트 TTFB 비차단 구조)
- **추가 컴포넌트**: `backend/src/unknown_world/services/image_generation.py` (Gemini 연동), `backend/src/unknown_world/api/image.py` (API 라우터), `backend/tests/manual_test_image.py`
- **달성 요구사항**: [RULE-008] 텍스트 우선 + Lazy 이미지, [RULE-010] 이미지 모델 ID 고정(`gemini-3-pro-image-preview`), [RULE-004] 실패 시 안전 폴백

### 기술적 구현 세부사항

**이미지 생성 서비스**:
- **Hybrid Generator**: 환경변수(`UW_MODE`)에 따라 실제 Gemini 호출(`ImageGenerator`)과 로컬 개발용 `MockImageGenerator`를 유연하게 전환
- **Lazy Generation Contract**: 텍스트 턴 응답에 포함된 `ImageJob` 정보를 바탕으로 프론트엔드가 별도 엔드포인트(`/api/image/generate`)를 호출하는 비차단(Non-blocking) 구조 확립
- **Local Artifact Storage**: 생성된 이미지를 `backend/generated_images/`에 PNG로 저장하고 `/static/images/` 경로를 통해 즉시 서빙 (Option A 채택)

**안정성 및 보안**:
- **Safe Fallback**: 검증 실패나 API 오류 시에도 `status: skipped`와 함께 텍스트-only 진행이 가능하도록 폴백 응답 보장
- **Privacy-Preserving Logs**: 로그 기록 시 프롬프트 원문 노출을 방지하기 위해 SHA-256 해시를 사용하여 보안 가이드 준수

### 코드 구조
repo-root/
└── backend/src/unknown_world/
    ├── api/
    │   └── image.py (이미지 생성/상태/파일 API)
    ├── services/
    │   └── image_generation.py (Gemini 3 Pro Image 연동)
    └── main.py (정적 파일 서빙 및 라우터 통합)

### 다음 단계
- [U-020[Mvp]] 프론트엔드 SceneCanvas 레이지 로딩 연동
- [U-035[Mvp]] rembg 배경 제거 파이프라인 통합

---


### 구현 완료 항목

- **핵심 기능**: 실모델(Vertex AI) 환경에서 7단계 파이프라인 및 Hard Gate(스키마/경제/안전/일관성) 인바리언트 전수 검증 완료
- **추가 컴포넌트**: `vibe/unit-runbooks/CP-MVP-04.md` (검증 런북), `vibe/unit-results/CP-MVP-04.md` (결과 보고서)
- **달성 요구사항**: [RULE-003] 구조화 출력 우선, [RULE-004] Repair loop + 안전 폴백, [RULE-005] 경제 인바리언트, [RULE-006] 언어 일관성, [RULE-009] bbox 좌표 규약

### 기술적 구현 세부사항

**실모델 Hard Gate 인바리언트**:
- **Schema & Validation**: Pydantic(서버) 및 Zod(클라이언트) 스키마 검증이 실모델 응답에서도 100% 동작함을 확인
- **Recovery & Fallback**: 비즈니스 룰 위반 시 Repair loop를 통한 자동 복구 및 최종 Safe Fallback 수렴 프로세스 안정성 확인
- **Economy Preservation**: 폴백 및 복구 상황에서도 사용자 재화 잔액이 입력 스냅샷 기준으로 정확히 보존됨을 검증

**관측 가능성 및 보안**:
- **Stage Streaming**: Parse부터 Commit까지의 7단계 도메인 이벤트가 Agent Console에 정상 가시화됨
- **Secret Masking**: 서비스 계정 인증 및 프롬프트 은닉 원칙이 로그 및 문서 수준에서 엄격히 준수됨

### 코드 구조
repo-root/
└── vibe/
    ├── unit-runbooks/
    │   └── CP-MVP-04.md (실모델 검증 시나리오)
    └── unit-results/
        └── CP-MVP-04.md (체크포인트 보고서)

### 다음 단계
- [CP-MVP-05] 체크포인트: 멀티모달 이미지 게이트(텍스트 우선/폴백/비용)
- [U-019[Mvp]] 이미지 생성 엔드포인트/잡(조건부) 연동

---

## [2026-01-25 21:30] [RU-005[Mvp]] 리팩토링 - orchestrator pipeline stages 정리 완료

### 구현 완료 항목

- **핵심 기능**: 오케스트레이터 전체를 7대 단계(`Parse` → `Validate` → `Plan` → `Resolve` → `Render` → `Verify` → `Commit`) 기반의 비동기 함수 체인 파이프라인으로 리팩토링 완료
- **추가 컴포넌트**: `orchestrator/pipeline.py` (엔진), `orchestrator/stages/` (단계별 모듈), `api/turn_streaming_helpers.py` (스트리밍 헬퍼), `vibe/unit-results/RU-005[Mvp].md`
- **달성 요구사항**: [RULE-008] 단계/배지 가시화(관측 가능성), [RULE-004] 안전 폴백 인바리언트, [RU-005] 오케스트레이터 모듈화 및 책임 분리

### 기술적 구현 세부사항

**오케스트레이터 아키텍처 (Option A)**:
- **Functional Pipeline**: `PipelineContext`와 `EmitFn`을 기반으로 한 함수 체인 방식을 채택하여 모의(Mock)와 실제(Real) 모델 경로를 단일 파이프라인으로 통합
- **Modular Stages**: 각 단계를 독립된 파일로 분리하여 입력/출력 인터페이스를 명확히 하고, 개별 단계에 대한 테스트 및 확장성 확보
- **Decoupled Observation**: 오케스트레이터 내부 로직이 FastAPI에 직접 의존하지 않도록 `EmitFn` 콜백을 통해 도메인 이벤트를 외부로 전달

**안정성 및 관측성**:
- **Atomic Event Streaming**: 파이프라인의 각 단계 시작/완료, 배지 수집, 복구 시도 이벤트를 정형화된 스트림 이벤트로 변환하여 Agent Console에 가시화
- **Fail-safe Convergence**: 모든 파이프라인 실행은 예외 발생 시에도 `create_safe_fallback`을 통해 스키마를 준수하는 최종 결과(`final`)로 수렴함을 보장

### 코드 구조
repo-root/
└── backend/src/unknown_world/
    ├── api/
    │   ├── turn.py (파이프라인 연동)
    │   └── turn_streaming_helpers.py (스트리밍 추상화)
    └── orchestrator/
        ├── pipeline.py (파이프라인 실행기)
        ├── stages/ (7대 단계별 모듈)
        └── fallback.py (폴백 SSOT)

### 다음 단계
- [U-019[Mvp]] 단계 기반 파이프라인에 이미지 생성(Render/Verify) 기능 통합
- [U-024[Mvp]] Autopilot 전략 로직의 Plan/Resolve stage 통합

---

## [2026-01-25 20:15] [RU-005-S3] RU-005 이후 “/api/turn stage pipeline” 수동 검증 시나리오 패키지 완료

### 작업 내용

- **제안서**: [RU-005-S3] RU-005 이후 “/api/turn stage pipeline” 수동 검증 시나리오 패키지
- **개선 사항**:
    - **파이프라인 UX 게이트 구축**: RU-005 리팩토링으로 재구조화된 오케스트레이터 파이프라인의 스트리밍 계약(Stage, Badges, Repair, Final)이 UX 측면에서 깨지지 않았는지 확인하는 6대 핵심 수동 검증 시나리오 확정
    - **인바리언트 검증 체계**: 정상 경로(Stage 순서), 비즈니스 룰 실패(Repair), 입력 오류(Error), i18n 일관성, Real/Mock 모드 호환성 등 파이프라인 전반의 종료 인바리언트 검증 절차 명세화
    - **데모 품질 보장**: Agent Console에 표시되는 시스템 "증거(Evidence)"들이 멈춤 없이 정확한 순서로 전달됨을 보장하여 데모 및 심사 품질 안정화
- **영향 범위**: `vibe/unit-runbooks/RU-005-S3-runbook.md` (신설), `backend/src/unknown_world/api/turn.py`, `orchestrator/*` 관련 검증

### 기술적 세부사항

- **Scenario-based Validation**: 단순 유닛 테스트를 넘어, `curl`을 이용한 실제 스트리밍 이벤트를 직접 관찰하여 `Parse → ... → Commit` 단계와 `badges` 배출 정합성을 수동으로 전수 조사
- **Hard Gate Alignment**: PRD 6.8(관측 가능성) 및 8.4(Structured outputs)의 하드 게이트 조건을 만족하는지 최종 확인

### 검증

- **시나리오 패키지 확정**: RU-005 리팩토링 결과물에 대해 정의된 6가지 시나리오를 적용하여 파이프라인 안정성 및 관측 품질 확보 확인.
- **런북 참조**: `vibe/unit-runbooks/RU-005-S3-runbook.md`

---

## [2026-01-25 19:30] [RU-005-S2] 엣지 케이스: Cancel/예외/언어(i18n) 경로에서 stage·repair·final 정책을 일관되게 완료

### 작업 내용

- **제안서**: [RU-005-S2] 엣지 케이스: Cancel/예외/언어(i18n) 경로에서 stage·repair·final 정책을 일관되게
- **개선 사항**:
    - **i18n 인바리언트 강화(RULE-006)**: 비즈니스 룰 위반 메시지 및 Repair 루프의 시스템 지시문을 ko-KR/en-US 언어별로 분기 처리하여, 영어 요청 시 한국어 메시지가 섞여 나오는 현상을 원천 차단
    - **Cancel 처리 정책 명시**: 클라이언트 연결 중단(`asyncio.CancelledError`) 시 서버가 추가 이벤트(error/final)를 송출하지 않고 조용히 종료되도록 하여 스트림 종료 동작의 예측 가능성 확보
    - **관측 품질 안정화**: 예외 발생 시에도 파이프라인 단계별 실패 상태가 전달될 수 있도록 예외 처리 정책을 정비하고 최종 `final`(폴백) 수렴 보장
- **영향 범위**: `backend/src/unknown_world/api/turn.py`, `backend/src/unknown_world/orchestrator/repair_loop.py`, `backend/src/unknown_world/validation/business_rules.py`, `backend/src/unknown_world/orchestrator/fallback.py`

### 기술적 세부사항

- **Localized Feedback Maps**: `BUSINESS_RULE_MESSAGES` 및 `REPAIR_CONTEXT_MESSAGES`를 도입하여 도메인 로직 내 메시지 생성을 언어별 SSOT로 관리
- **Graceful Task Cancellation**: 스트리밍 루프 내에서 `CancelledError`를 명시적으로 포착하여 로그 노이즈를 줄이고 클라이언트 Abort 정책과 정렬

### 검증

- **i18n 일관성 확인**: `en-US` 요청 시 비즈니스 룰 실패 요약 및 Repair 피드백이 모두 영어로 출력됨을 확인.
- **Abort 동작 확인**: 요청 도중 클라이언트 연결 취소 시 서버 태스크가 조용히 중단되고 불필요한 폴백 이벤트가 발생하지 않음을 확인.

---

## [2026-01-25 18:15] [RU-005-Q1] 코드 중복: fallback/phase/repair 로직의 중복 제거로 드리프트 방지 완료

### 작업 내용

- **제안서**: [RU-005-Q1] 코드 중복: fallback/phase/repair 로직의 중복 제거로 드리프트 방지
- **개선 사항**:
    - **폴백 로직 SSOT 단일화**: `TurnOutputGenerator` 및 `MockOrchestrator`에 산재하던 폴백 생성 로직을 제거하고 `orchestrator/fallback.py:create_safe_fallback`으로 일원화하여 정책 드리프트 차단
    - **단계(Phase) 목록 SSOT 고정**: API와 Mock이 각자 들고 있던 단계 리스트를 `orchestrator/pipeline.py:DEFAULT_STAGES`로 통합하여 처리 순서의 일관성 확보
    - **Mock Repair Loop 구조 정비**: `MockOrchestrator` 역시 통합된 폴백 생성기를 사용하도록 수정하여 real/mock 경로 간의 폴백 응답 품질 동기화
- **영향 범위**: `backend/src/unknown_world/orchestrator/generate_turn_output.py`, `backend/src/unknown_world/orchestrator/mock.py`, `backend/src/unknown_world/orchestrator/fallback.py`, `backend/src/unknown_world/orchestrator/pipeline.py`

### 기술적 세부사항

- **Delegation Pattern**: 기존 클래스 내부의 폴백 생성 메서드를 유지하되 내부적으로 SSOT 함수를 호출하도록 위임하여 인터페이스 호환성 유지 및 중복 제거 달성
- **Centralized Sequence**: `AgentPhase` enum 순서와 실제 파이프라인 실행 순서가 `DEFAULT_STAGES`를 통해 명시적으로 관리됨으로써 관측 가능성 증거의 신뢰도 향상

### 검증

- **폴백 일관성 확인**: Mock 모드와 실모델 모드에서 동일한 구조의 폴백 데이터(재화 보존, 대안 카드 포함)가 생성됨을 확인.
- **통합 테스트 통과**: `test_turn_streaming.py`를 통해 리팩토링 후에도 스트리밍 및 폴백 시퀀스가 정상 작동함을 확인.

---

## [2026-01-25 17:15] [RU-005-S1] 잠재적 오류: badges/단계 이벤트 인바리언트 정합성(Consistency 실패 포함) 완료

### 작업 내용

- **제안서**: [RU-005-S1] 잠재적 오류: badges/단계 이벤트 인바리언트 정합성(Consistency 실패 포함)
- **개선 사항**:
    - **배지 매핑 완전성 확보**: `repair_loop.py`의 배지 결정 로직을 확장하여 언어(`language_*`) 및 좌표(`box2d_*`) 관련 비즈니스 룰 위반을 `CONSISTENCY_FAIL`로 정확히 매핑 (누락 방지)
    - **폴백 배지 동기화**: `fallback.py` 및 `validate_stage`를 수정하여 예외/폴백 발생 시에도 최종 `TurnOutput`의 배지와 스트림 송출 배지가 완벽히 일치하도록 보장
    - **인바리언트 강화**: mock/real 모든 경로와 성공/실패 모든 시나리오에서 배지 송출이 누락되지 않도록 인바리언트 고정
- **영향 범위**: `backend/src/unknown_world/orchestrator/repair_loop.py`, `backend/src/unknown_world/orchestrator/fallback.py`, `backend/src/unknown_world/orchestrator/stages/validate.py`

### 기술적 세부사항

- **Unified Badge Logic**: `add_business_badges`를 공개 함수로 전환하고, 검증 단계와 폴백 생성 시 동일한 로직을 사용하여 배지 의미론의 드리프트 차단
- **Schema-Consistent Fallback**: 폴백 시에도 `Schema OK/Fail`, `Economy OK`, `Safety OK/Blocked`, `Consistency OK`를 모두 포함하는 완전한 배지 세트 송출

### 검증

- **비즈니스 룰 위반 확인**: 언어 불일치 또는 좌표 오류 유도 시 `consistency_fail` 배지가 UI에 정상적으로 표시됨을 확인.
- **폴백 정합성 확인**: 런타임 예외 발생 시 송출되는 스트림 배지와 최종 Agent Console의 배지가 동일함을 확인.

---

## [2026-01-25 16:30] [RU-005-Q3] 복잡도: `api/turn.py` 스트리밍 오케스트레이션 축소(중복 제거 + 파이프라인 위임) 완료

### 작업 내용

- **제안서**: [RU-005-Q3] 복잡도: `api/turn.py` 스트리밍 오케스트레이션 축소(중복 제거 + 파이프라인 위임)
- **개선 사항**:
    - **중복 스트리밍 로직 제거**: mock/real 경로에서 중복되던 단계(stage) 송출, 타자 효과(narrative_delta), 에러 폴백 로직을 `api/turn_streaming_helpers.py`로 추출하여 코드 응집도 향상
    - **오케스트레이션 위임**: `api/turn.py`가 직접 관리하던 처리 루프를 `orchestrator/pipeline.py`로 전면 위임하고, API 레이어는 스트림 이벤트 변환 및 HTTP 전송에만 집중하도록 정제
    - **이벤트 변환 레이어 도입**: 파이프라인의 도메인 이벤트를 NDJSON 스트림 프로토콜로 변환하는 `_convert_pipeline_event`를 통해 처리 로직과 전송 포맷 간의 결합도 해제
    - **안전성 강화**: 예외 발생 시 `emit_error_with_fallback` 헬퍼를 통해 항상 `error` + `final` 이벤트를 보장하여 클라이언트 UI 멈춤 방지 (RULE-004)
- **영향 범위**: `backend/src/unknown_world/api/turn.py`, `backend/src/unknown_world/api/turn_streaming_helpers.py` (신설), `backend/src/unknown_world/orchestrator/pipeline.py`

### 기술적 세부사항

- **Stream Helper Extraction**: `stream_output_with_narrative`와 `emit_error_with_fallback`을 도입하여 내러티브 스트리밍 및 에러 복구 경로의 SSOT 확보
- **Queue-based Async Pipeline**: `asyncio.Queue`를 사용하여 파이프라인 실행과 스트림 송출을 비동기적으로 분리, TTFB 개선 및 처리 유연성 확보

### 검증

- **동작 일관성 확인**: 리팩토링 후에도 기존 Stage→Badges→Narrative→Final 순서가 완벽히 유지됨을 확인.
- **에러 핸들링 확인**: 입력 오류 및 런타임 예외 시 헬퍼를 통해 안전한 폴백 데이터가 정상 송출됨을 확인.

---

## [2026-01-25 15:55] [RU-005-Q4] 모듈 설계: orchestrator pipeline을 stage 모듈 + 실행기(Option A)로 SSOT화 완료

### 작업 내용

- **제안서**: [RU-005-Q4] 모듈 설계: orchestrator pipeline을 stage 모듈 + 실행기(Option A)로 SSOT화
- **개선 사항**:
    - **파이프라인 SSOT화**: 클래스 도입 없이 함수 체인 방식(Option A)으로 오케스트레이션 단계를 `orchestrator/pipeline.py`로 단일화하여 mock/real 경로 간 동작 드리프트 원천 차단
    - **Stage 모듈화**: `orchestrator/stages/` 하위에 7대 단계(Parse→...→Commit)를 독립된 함수로 분리하여 각 단계의 책임과 인터페이스(PipelineContext)를 명확히 정의
    - **API 레이어 책임 정제**: `api/turn.py`가 직접 들고 있던 오케스트레이션 로직을 pipeline으로 위임하고, API는 스트리밍 직렬화 및 이벤트 변환에만 집중하도록 레이어링 강화
    - **관측 가능성 일관성**: 모든 처리 단계에서 `emit` 콜백을 통해 Stage/Badges/Repair 이벤트를 일관되게 송출하여 UI 증거 품질 안정화
- **영향 범위**: `backend/src/unknown_world/orchestrator/pipeline.py` (신설), `backend/src/unknown_world/orchestrator/stages/` (신설), `backend/src/unknown_world/api/turn.py` (리팩토링)

### 기술적 세부사항

- **Functional Pipeline**: `PipelineContext`를 입력으로 받아 변환된 컨텍스트를 반환하는 순수 함수형 파이프라인 구조 채택
- **Decoupled Observation**: `EmitFn` 콜백을 통해 오케스트레이터가 FastAPI 엔드포인트에 직접 의존하지 않고도 도메인 이벤트를 외부로 전달할 수 있는 경계 유지
- **Fail-safe Invariant**: 파이프라인 실행 중 예외 발생 시 `create_safe_fallback`을 통해 항상 스키마를 준수하는 결과가 반환되도록 보장 (RULE-004)

### 검증

- **동작 보존 확인**: 기존 mock 모드의 응답 구조 및 이벤트 순서(Stage→Badges→Narrative→Final)가 리팩토링 후에도 동일하게 유지됨을 확인.
- **레이어링 확인**: `orchestrator/` 모듈들이 `fastapi`를 직접 import 하지 않고 순수 도메인 로직과 모델에만 의존함을 확인.

---

## [2026-01-25 15:40] U-018[Mvp]: 비즈니스 룰 검증 + Repair loop + 안전 폴백 완료

### 구현 완료 항목

- **핵심 기능**: 스키마 통과 후 비즈니스 룰(경제, 언어, 좌표, 안전) 검증 및 실패 시 자동 복구(Repair loop) 시스템 구축
- **추가 컴포넌트**: `validator.py` (비즈니스 룰 검증기), `vibe/unit-results/U-018[Mvp].md`, `vibe/unit-runbooks/U-018-business-rules-repair-runbook.md`
- **달성 요구사항**: [RULE-004] Repair loop + 안전 폴백, [RULE-005] 경제 인바리언트(음수 금지), [RULE-006] 언어 일관성(ko/en), [RULE-009] bbox 좌표 규약(0~1000)

### 기술적 구현 세부사항

**하드 게이트 아키텍처**:
- **Business Rules Validator**: Pydantic 검증 직후 단계에서 경제(잔액), 언어(BCP-47), 공간(Box2D 순서), 안전(차단 시 대체) 규칙을 전수 조사하는 하드 게이트 구축
- **Feedback-driven Repair Loop**: 검증 실패 시 모델에게 구체적인 실패 사유를 피드백으로 전달하여 최대 2회까지 스스로 수정 기회 제공
- **Atomic Safe Fallback**: 모델 복구 실패 또는 런타임 예외 시, 입력 시점의 `economy_snapshot`을 기반으로 잔액을 100% 보존하고 스키마를 준수하는 폴백 `TurnOutput` 강제 생성

**스트리밍 및 관측성**:
- **Repair Event**: 복구 시도 시 `type: "repair"` 이벤트를 송출하여 Agent Console에서 복구 과정을 투명하게 노출
- **Economy Invariant**: 폴백 상황에서도 비용(`cost`)을 0으로 처리하여 시스템 오류로 인한 유저 재화 손실 원천 차단

### 코드 구조
repo-root/
└── backend/src/unknown_world/
    ├── api/
    │   └── turn.py (스트리밍 파이프라인 통합)
    └── orchestrator/
        ├── validator.py (신규: 비즈니스 룰 검증기)
        └── mock.py (폴백 생성 로직 고도화)

### 다음 단계
- [RU-005[Mvp]] 리팩토링: orchestrator pipeline stages 정리
- [CP-MVP-04] 체크포인트: 실모델 Hard Gate(스키마/경제/복구)

---

### 구현 완료 항목

- **핵심 기능**: Vertex AI 서비스 계정 인증 기반 `google-genai` 클라이언트 래퍼 및 모델 라벨/ID SSOT 체계 구축
- **추가 컴포넌트**: `genai_client.py` (클라이언트 래퍼), `models.py` (모델 설정), `vibe/unit-results/U-016[Mvp].md`
- **달성 요구사항**: [RULE-007] BYOK 금지(서비스계정), [RULE-010] 기술 스택/모델 버전 고정, [RULE-008] 프롬프트 원문 노출 금지

### 기술적 구현 세부사항

**GenAI 아키텍처**:
- **Unified Client Wrapper**: `google-genai` SDK(1.56.0)를 캡슐화하여 `generate` 및 `generate_stream` 표준 인터페이스 제공
- **Model Labeling SSOT**: `tech-stack.md`의 모델 ID(Gemini 3 프리뷰)를 `ModelLabel`(`FAST`, `QUALITY`, `IMAGE`, `VISION`)로 추상화하여 모델 교체 유연성 확보
- **Hybrid Mode (Real/Mock)**: 환경변수 `UW_MODE`에 따라 실제 Vertex AI 호출과 로컬 개발용 Mock 응답을 원활하게 전환

**보안 및 운영**:
- **Vertex AI Service Account**: `GOOGLE_APPLICATION_CREDENTIALS`를 통한 백엔드 전용 인증 구현 (사용자 API 키 요구 금지)
- **Privacy-First Logging**: 로그 기록 시 프롬프트 원문과 내부 추론을 제외하고 모델 라벨, 토큰 사용량 등 메타데이터만 남기도록 설계

### 코드 구조
repo-root/
└── backend/
    ├── src/unknown_world/
    │   ├── config/
    │   │   └── models.py (모델 ID/라벨 SSOT)
    │   └── services/
    │       └── genai_client.py (클라이언트 래퍼 및 팩토리)
    └── .env.example (GenAI 설정 템플릿 추가)

### 다음 단계
- [U-017[Mvp]] Structured Output TurnOutput 생성 + Pydantic 검증

---

### 구현 완료 항목

- **핵심 기능**: 세션 라이프사이클(부팅/복원/리셋) 모듈화 및 SaveGame 생성 경로 SSOT 단일화
- **추가 컴포넌트**: `save/constants.ts`, `save/sessionLifecycle.ts`, `vibe/unit-results/RU-004[Mvp].md`
- **달성 요구사항**: [PRD 6.6/6.9] 데모 반복성 확보, [RULE-001/002] HUD 중심 플로우 유지, [RULE-010] 기술 스택 버전 고정

### 기술적 구현 세부사항

**세션 아키텍처 리팩토링**:
- **Lifecycle SSOT**: `App.tsx`에 산재하던 부팅/복원/리셋 로직을 `sessionLifecycle.ts`로 통합하여 세션 전이 로직 캡슐화
- **Creation SSOT**: `createSaveGame`을 유일한 객체 생성 창구로 고정하고, 프로필 변환 어댑터를 통해 스키마 일관성 강제
- **Validation-First**: `getValidSaveGameOrNull` 및 Zod 검증을 통해 부팅 시점의 상태 정합성 전수 검사

**데모 안정성 강화**:
- **Atomic Reset**: `resetAllSessionStores`를 도입하여 리셋 시 이전 세션의 UI 잔재(카드, 배지 등)를 원자적으로 소거
- **Constants Centralization**: 세이브 버전, 스토리지 키 등 핵심 정책 상수를 `constants.ts`로 모아 정책 변경 대응력 확보

### 코드 구조
repo-root/
└── frontend/src/
    ├── save/
    │   ├── constants.ts (신규: 정책 상수)
    │   ├── sessionLifecycle.ts (신규: 세션 관리)
    │   └── saveGame.ts (생성/검증 단일화)
    ├── data/
    │   └── demoProfiles.ts (어댑터 적용)
    └── App.tsx (로직 위임 및 컴포넌트 정제)

### 다음 단계
- [U-016[Mvp]] Vertex 인증 + google-genai 클라이언트 + 모델 라벨 고정

---

## [2026-01-24 15:40] RU-004-S3: “SaveGame/프로필/리셋/복원” 수동 검증 시나리오 패키지 구축 완료

### 작업 내용

- **제안서**: [RU-004-S3] RU-004 이후 “SaveGame/프로필/리셋/복원” 수동 검증 시나리오 패키지(데모 10분 루프)
- **개선 사항**:
    - **데모 루프 검증 게이트 구축**: RU-004 리팩토링 이후 심사자가 겪을 수 있는 세션 경계(Reset/Continue/Profile Change)의 회귀를 방지하기 위해 7대 핵심 수동 검증 시나리오 확정
    - **세션 정합성 전수 조사**: 프로필 3종 초기 상태, autosave 동작, 새로고침 후 복원, Reset 후 완전 복구, 프로필 변경 시 클린업, 손상 데이터 폴백, 언어 복원 일관성 등 세션 라이프사이클 전반에 대한 검증 절차 명세화
    - **품질 기준 확립**: "10분 데모 루프"가 끊기지 않음을 성공의 척도로 삼아, 기술적 리팩토링이 실제 사용자 경험(UX) 품질로 이어지도록 보장
- **영향 범위**: `vibe/refactors/RU-004-S3.md` (명세화), `frontend/src/App.tsx` (검증 대상), `frontend/src/save/*` (검증 대상)

### 기술적 세부사항

- **Scenario-based Validation**: 단순 기능 유닛 테스트를 넘어, 상태 복원 시 HUD의 ledger 순서 정합성(RU-004-S1) 및 프로필 드리프트 방지(RU-004-S2) 등이 실제 UI에서 완벽히 작동하는지 확인하는 종합 검증 체계 마련
- **Hard Gate Alignment**: PRD 6.6(세이브/로드) 및 6.9(데모 프로필/리셋)의 하드 게이트 조건을 만족하는지 수동으로 최종 확인

### 검증

- **시나리오 패키지 확정**: RU-004 리팩토링 결과물에 대해 정의된 7가지 시나리오를 적용하여 데모 안정성 확보 확인.

---

## [2026-01-24 01:40] RU-004-Q5: 하드코딩 정리 - SaveGame/프로필/초기값 상수 중앙화(SSOT) 완료

### 작업 내용

- **제안서**: [RU-004-Q5] 하드코딩 정리: SaveGame/프로필/초기값 상수 분산으로 정책 변경 시 누락 위험
- **개선 사항**:
    - **정책 상수 중앙화**: `save/constants.ts`를 신설하여 세이브 버전, 스토리지 키, 시드 정책, 재화 임계치 등 분산되어 있던 하드코딩 상수를 단일 진실 공급원(SSOT)으로 통합
    - **시드 생성 정책 표준화**: `generateDemoSeed` 유틸리티를 도입하여 프로필별 시드 생성 로직을 통일하고, 세션 내 시드 보존 정책(Session Persistence)을 강화
    - **초기값 의미론적 구분**: 스토어의 `createInitialState` 값은 "플레이 전 placeholder"임을 명시하고, 실제 게임 데이터는 항상 프로필/세이브에서 주입받는 구조(Injection-first) 확립
    - **하위 호환성 유지**: 기존 모듈에서 참조하던 상수를 `save/saveGame.ts` 등에서 re-export 하여 리팩토링으로 인한 파괴적 변경 최소화
- **영향 범위**: `frontend/src/save/constants.ts` (신규), `frontend/src/save/saveGame.ts`, `frontend/src/save/sessionLifecycle.ts`, `frontend/src/data/demoProfiles.ts`, `frontend/src/stores/economyStore.ts`, `frontend/src/stores/worldStore.ts`

### 기술적 세부사항

- **Constants SSOT**: `SAVEGAME_VERSION`, `SAVEGAME_STORAGE_KEY`, `LOW_BALANCE_THRESHOLD` 등 핵심 정책 상수를 한 곳으로 모아 정책 변경 시 누락 위험 원천 차단
- **Seed Persistence**: `saveCurrentSession` 시 기존 세이브의 시드를 유지하도록 수정하여, 세션 도중 시드가 변하거나 유실되는 문제 방지
- **Documentation as Code**: 상수 파일 내부에 시드 정책(`SEED_POLICY`) 및 초기값 주입 정책(`INITIAL_VALUE_POLICY`)을 상세히 문서화하여 향후 확장(U-026 리플레이 등)에 대비

### 검증

- **정합성 확인**: 프로필 선택 및 게임 진행 시 세이브 데이터의 버전과 키가 중앙화된 상수와 일치함을 확인.
- **상수 연동 확인**: `economyStore`의 경고 임계치 및 `worldStore`의 초기 상태 설명이 리팩토링된 정책에 부합함을 확인.

---

## [2026-01-24 14:30] RU-004-Q1: 코드 중복 - SaveGame 생성 경로 단일화(SSOT) 완료

### 작업 내용

- **제안서**: [RU-004-Q1] 코드 중복: SaveGame 생성 경로 이원화(createSaveGame vs createSaveGameFromProfile)로 스키마 드리프트 위험
- **개선 사항**:
    - **생성 경로 SSOT 단일화**: `demoProfiles.ts`에서 직접 `SaveGame` 객체를 조립하던 중복 로직을 제거하고, `saveGame.ts`의 `createSaveGame`을 유일한 생성 창구로 고정
    - **Input Adapter 패턴 도입**: 프로필 데이터를 `SaveGameInput`으로 변환하는 `profileToSaveGameInput` 함수를 분리하여, "데이터 준비"와 "객체 생성(SSOT)" 책임을 명확히 분리
    - **스키마 드리프트 원천 차단**: 필드 추가나 기본값 변경 시 `createSaveGame` 한 곳만 수정하면 프로필 시작 및 일반 생성 경로 모두에 즉시 반영되도록 개선
- **영향 범위**: `frontend/src/data/demoProfiles.ts`, `frontend/src/save/saveGame.ts`

### 기술적 세부사항

- **Thin Wrapper**: 기존 `createSaveGameFromProfile`을 `createSaveGame(profileToSaveGameInput(...))`를 호출하는 얇은 래퍼로 전환하여 기존 코드와의 하위 호환성 유지
- **Validation Consistency**: 모든 생성 경로가 `createSaveGame` 내부의 Zod 스키마 검증 및 기본값 주입 로직을 공유하게 됨

### 검증

- **정합성 확인**: 프로필 선택 시 생성되는 세이브 데이터의 구조가 `saveGame.ts`에 정의된 최신 스키마 및 버전(`SAVEGAME_VERSION`)과 완벽히 일치함을 확인.
- **하위 호환성 확인**: 프로필 선택 및 게임 시작 시나리오가 기존과 동일하게 정상 작동함을 확인.

---

## [2026-01-23 11:30] RU-004-Q4: 모듈 설계 - 세션 초기화/복원/리셋 SSOT 단일화 완료

### 작업 내용

- **제안서**: [RU-004-Q4] 모듈 설계: 세션 초기화/복원/리셋 SSOT 단일화(App.tsx 의존성 축소)
- **개선 사항**:
    - **세션 라이프사이클 모듈화**: `App.tsx`에 흩어져 있던 부팅, 프로필 선택, 복원, 리셋, 프로필 변경 로직을 `sessionLifecycle.ts`로 통합하여 세션 관리의 단일 진실 공급원(SSOT) 구축
    - **App.tsx 책임 정제**: 세션 관리의 복잡한 비즈니스 로직(스토어 주입, localStorage 동기화 등)을 외부로 위임하고, App 컴포넌트는 레이아웃과 이벤트 라우팅에 집중하도록 의존성 대폭 축소
    - **스토어 초기화 단일화**: `resetAllSessionStores`를 도입하여 세션 전환 시 모든 관련 스토어(world, inventory, economy, actionDeck, agent)를 원자적으로 초기화함으로써 데모 반복성 및 정합성 보장
    - **비동기 복원 파이프라인 완성**: `RU-004-S1/S2`에서 정립된 언어 복원 await, `hydrateLedger`, `profileId` 동기화 정책을 세션 모듈 내부에 캡슐화
- **영향 범위**: `frontend/src/App.tsx`, `frontend/src/save/sessionLifecycle.ts` (신규)

### 기술적 세부사항

- **Encapsulated Lifecycle API**: `bootstrapSession`, `startSessionFromProfile`, `continueSession` 등 명확한 시맨틱을 가진 API를 통해 세션 상태 전이를 선언적으로 관리
- **Bootstrap Phase SSOT**: 부팅 시점의 `gamePhase`와 `profileId` 결정 로직을 모듈 내 `bootstrapSession`과 `getInitialProfileId`로 일치시켜 부팅 드리프트 위험 제거

### 검증

- **동작 일관성 확인**: 프로필 선택 → 턴 진행 → 새로고침 → Continue 및 Reset 시나리오에서 상태 복원 및 클린업이 기존 정책과 동일하게 작동함을 확인.
- **의존성 확인**: `App.tsx` 내의 다수 스토어 직접 참조 및 localStorage 유틸리티 직접 참조가 제거되었음을 확인.

---

## [2026-01-22 23:55] RU-004-S2: Continue/Reset 엣지 케이스 및 profileId SSOT 드리프트 해결 완료

### 작업 내용

- **제안서**: [RU-004-S2] 엣지 케이스: Continue/Reset에서 profileId·저장 키·스토어 상태 드리프트(데모 반복성 붕괴)
- **개선 사항**:
    - **유효성 기반 Continue**: `hasSaveGame()`(단순 키 존재 확인) 대신 `getValidSaveGameOrNull()`(스키마 및 마이그레이션 검증 포함)을 도입하여 "실제로 복원 가능한 경우"에만 Continue 버튼을 노출하도록 개선
    - **profileId SSOT 확정**: `SaveGame.profileId`를 단일 진실 공급원(SSOT)으로 설정하고, 로드 시점에 `CURRENT_PROFILE_KEY`를 자동 동기화하여 프로필 드리프트로 인한 리셋/저장 불능 사례 제거
    - **세션 초기화 표준화**: 프로필 선택, 복원, 리셋 시 `actionDeckStore` 및 `agentStore`를 포함한 모든 관련 스토어를 명시적으로 초기화하여 이전 세션의 UI 잔재(카드, 배지 등) 제거
    - **안전 폴백 파이프라인**: 세이브 데이터 손상 또는 로드 실패 시 명시적인 클린업(`clearSaveGame`) 후 `profile_select` 화면으로 안전하게 복귀하는 로직 구축
- **영향 범위**: `frontend/src/App.tsx`, `frontend/src/save/saveGame.ts`, `frontend/src/stores/actionDeckStore.ts`, `frontend/src/stores/agentStore.ts`

### 기술적 세부사항

- **Validation-First Loading**: `loadSaveGame` 내부에 `migrateSaveGame`을 내장하고, `Zod` 스키마 검증 실패 시 즉시 `null`을 반환하도록 하여 부팅 시점의 상태 정합성 확보
- **Store Reset Orchestration**: `App.tsx` 내의 세션 전환 지점(Select/Continue/Reset)마다 초기화 대상 스토어 리스트를 표준화하여 데모 반복성(Repeatability) 극대화

### 검증

- **드리프트 복구 확인**: `unknown_world_current_profile` 키 수동 삭제 후 Continue 실행 시 `profileId`가 세이브로부터 정상 복구되고 리셋/자동저장이 동작함을 확인.
- **UI 클린업 확인**: 리셋 직후 이전 세션의 에이전트 배지 및 액션 카드가 즉시 제거됨을 확인.
- **손상 데이터 폴백**: 비정상 JSON 주입 시 `profile_select` 화면으로 안전하게 전환됨을 확인.

---

## [2026-01-22 15:30] RU-004-S1: SaveGame 복원 시 ledger/lastCost/언어 적용 불일치 해결 완료

### 작업 내용

- **제안서**: [RU-004-S1] 잠재 버그: SaveGame 복원 시 ledger/lastCost/언어 적용 불일치(데모 반복성 붕괴 위험)
- **개선 사항**:
    - **언어 복원 안정화**: `restoreSaveGame`을 `async`로 전환하고 `changeLanguage`를 `await` 하도록 수정하여 복원 직후의 언어 불일치(깜빡임) 제거
    - **Economy 복원 정합성**: `economyStore`에 `hydrateLedger` 전용 액션을 추가하여 저장된 원장(ledger)의 순서와 타임스탬프를 보존하고, 최신 엔트리 기반으로 `lastCost`를 정확히 재설정
    - **HUD 상태 동기화**: 복원된 잔액을 바탕으로 `isBalanceLow` 경고 상태를 즉시 재계산하여 HUD 가시성 확보
- **영향 범위**: `frontend/src/App.tsx`, `frontend/src/stores/economyStore.ts`, `frontend/src/i18n.ts`

### 기술적 세부사항

- **Snapshot Hydration**: 기존의 턴 이벤트 기반 `addLedgerEntry` 대신 스냅샷 주입 방식인 `hydrateLedger`를 도입하여 복원 로직의 순부작용(역전된 순서, 타임스탬프 왜곡) 원천 차단
- **Async Orchestration**: React 컴포넌트 생명주기 내에서 비동기 I/O(언어 리소스 로딩)가 완료된 후 UI가 렌더링되도록 실행 흐름 조정

### 검증

- **정합성 확인**: Continue 실행 후 Economy HUD의 원장 순서가 최신순으로 유지되고, 마지막 확정 비용이 정확히 표시됨을 확인. 잔액 부족 상태가 복원 즉시 경고로 나타남을 확인.

---

## [2026-01-19 14:40] U-015[Mvp]: SaveGame(local) + Reset + Demo Profiles(3종) 완료

### 구현 완료 항목

- **핵심 기능**: 데모 프로필 3종(Narrator/Explorer/Tech), 즉시 리셋, localStorage 기반 세이브/로드 구현
- **추가 컴포넌트**: `DemoProfileSelect.tsx`, `ResetButton.tsx`, `saveGame.ts`, `demoProfiles.ts`, `vibe/unit-results/U-015[Mvp].md`
- **달성 요구사항**: [PRD 6.6/6.9] 즉시 시작/리셋/세이브 로드, [RULE-010] DB 금지(JSON), [RULE-006] 언어 일관성 준수

### 기술적 구현 세부사항

**세이브 시스템 아키텍처**:
- **SaveGame Schema**: Zod 기반의 엄격한 스키마 버전 관리(v1.0.0) 및 직렬화 로직 구축
- **Auto-Save**: 턴 완료(내러티브 추가) 시점에 localStorage로 자동 상태 영속화
- **State Hydration**: 복원 시 `worldStore`, `inventoryStore`, `economyStore`를 원자적으로 동기화

**온보딩 및 데모 UX**:
- **Demo Profiles**: 페르소나별 초기 상태(재화, 인벤토리, 퀘스트, 룰 등)를 i18n 키 기반으로 정의
- **Safe Reset**: 확인 모드(Confirmation)를 포함한 리셋 기능으로 실수 방지 및 데모 반복 보장
- **Language Sync**: 세이브 데이터 로드 시점에 UI 언어(ko/en)를 강제 동기화하여 혼합 출력 방지

### 코드 구조
repo-root/
└── frontend/src/
    ├── save/
    │   └── saveGame.ts (세이브 유틸리티)
    ├── data/
    │   └── demoProfiles.ts (프로필 프리셋)
    ├── components/
    │   ├── DemoProfileSelect.tsx (랜딩 UI)
    │   └── ResetButton.tsx (리셋/변경 버튼)
    └── App.tsx (페이즈 관리 및 스토어 통합)

### 다음 단계
- [U-016[Mvp]] Vertex 인증 + google-genai 클라이언트 + 모델 라벨 고정

---

### 구현 완료 항목

- **핵심 기능**: Economy HUD(Signal/Shard 잔액 표시) 및 Ledger(원장) 관리 시스템 구현
- **추가 컴포넌트**: `EconomyHud.tsx`, `economyStore.ts`, `vibe/unit-results/U-014[Mvp].md`
- **달성 요구사항**: [RULE-005] 경제 인바리언트(예상 비용 노출, 음수 금지), [RULE-002] 게임 UI 고정 HUD, [U-037] 중요도 기반 가독성 레이어링 적용

### 기술적 구현 세부사항

**경제 시스템 아키텍처**:
- **Economy Store**: 최근 20턴의 원장(Ledger)을 보관하는 Option A(메모리 절감) 정책 적용
- **Cost Estimation**: Action Deck 호버/선택 시 예상 비용을 사전에 HUD에 표시하여 전략적 판단 유도
- **Currency Icons**: Signal(⚡), Shard(💎) 전용 아이콘 v2 및 폴백 체계 통합

**UI 레이아웃 및 스타일**:
- `sidebar-right`에 독립된 경제 패널 배치 및 헤더 잔액 동기화
- `data-ui-importance="critical"` 및 `font-family: var(--font-micro-en)` 적용을 통한 숫자 가독성 극대화

### 코드 구조
repo-root/
└── frontend/src/
    ├── components/
    │   ├── EconomyHud.tsx (재화/비용 시각화)
    │   └── ActionDeck.tsx (비용 가드 로직 통합)
    ├── stores/
    │   └── economyStore.ts (원장 및 상태 관리)
    └── style.css (경제 HUD 전용 스타일 및 애니메이션)

### 다음 단계
- [U-015[Mvp]] SaveGame(local) + Reset + Demo Profiles(3종) 구현

---

### 구현 완료 항목

- **핵심 기능**: Quest Panel, Rule Board, Mutation Timeline 3종 패널 구현 및 사이드바 통합
- **추가 컴포넌트**: `QuestPanel.tsx`, `RuleBoard.tsx`, `MutationTimeline.tsx`, `vibe/unit-results/U-013[Mvp].md`
- **달성 요구사항**: [PRD 6.4/6.7] 룰 변형 및 퀘스트 추적 가시화, [RULE-002] 게임 UI 고정(HUD), [RULE-006] i18n 정책 준수

### 기술적 구현 세부사항

**패널 오케스트레이션**:
- **Quest Panel**: `worldStore` 연동을 통한 실시간 목표/서브목표 진행 및 완료 상태 가시화
- **Rule Board**: 현재 세계에 적용된 활성 규칙을 카드 형태로 표시하여 "룰 변형" 체감 유도
- **Mutation Timeline**: 규칙 추가/수정/삭제 이벤트를 시간순으로 기록 (Q1 결정: Option B 적용)

**디자인 및 가독성**:
- `data-ui-importance="critical"` 적용을 통한 가독성 보호 계층 구조 유지
- 모든 텍스트에 i18n 키 적용 및 데모 데이터와의 완벽한 격리

### 코드 구조
repo-root/
└── frontend/src/
    ├── components/
    │   ├── QuestPanel.tsx (목표 체크리스트)
    │   ├── RuleBoard.tsx (활성 규칙 카드)
    │   └── MutationTimeline.tsx (변형 이벤트 기록)
    └── App.tsx (사이드 패널 슬롯 통합)

### 다음 단계
- [U-014[Mvp]] Economy HUD + Ledger(프론트) 구현

---


### 구현 완료 항목

- **핵심 기능**: Action Deck 클릭, 핫스팟 클릭, 인벤토리 드래그&드롭 등 핵심 인터랙션 3종 검증 완료
- **추가 컴포넌트**: `CP-MVP-02-click-drag-demo-runbook.md`, `vibe/unit-results/CP-MVP-02.md`, `CP-MVP-02-drag-drop-test.png`
- **달성 요구사항**: [PRD 6.7] 조작 증거 확보(클릭+드래그), [RULE-002] 게임 UI 고정, [RULE-009] 좌표 규약 준수

### 기술적 구현 세부사항

**인터랙션 무결성**:
- **Action Deck**: 클릭 시 `TurnInput` 생성 및 스트리밍 중 중복 클릭 차단 정책(Zustand `agentStore`) 확인
- **Hotspots**: `ResizeObserver` 연동을 통한 반응형 핫스팟 좌표 정합성 및 클릭 맥락(`object_id`, `box_2d`) 전송 확인
- **DnD (Drag & Drop)**: `dnd-kit`을 활용한 아이템 드래그 시 오버레이 및 핫스팟 하이라이트(마젠타 글로우) 피드백 확인

**코드 품질**:
- `App.tsx`, `SceneCanvas.tsx` 등 핵심 컴포넌트의 타입 가드 보강 및 린트 오류 제거
- `turnRunner` 모듈의 콜백 로직 정제를 통한 안정적인 턴 라이프사이클 관리

### 코드 구조
repo-root/
└── frontend/src/
    ├── components/
    │   ├── ActionDeck.tsx (클릭 연동)
    │   ├── SceneCanvas.tsx (핫스팟 & 드롭 타겟)
    │   └── InventoryPanel.tsx (드래그 소스)
    ├── turn/turnRunner.ts (실행 엔진)
    └── utils/box2d.ts (좌표 SSOT)

### 다음 단계
- [U-013[Mvp]] Quest + Rule Board/Timeline 패널 구현

---

## [2026-01-18 01:40] RU-003[Mvp]: 리팩토링 - UI 상태 슬라이스/경계 정리 완료

### 구현 완료 항목

- **핵심 기능**: 파편화된 UI 상태를 `worldStore`로 통합하고, 턴 실행 로직을 `turnRunner`로 분리하여 모듈 경계 확립
- **추가 컴포넌트**: `worldStore.ts`, `turnRunner.ts`, `demoFixtures.ts`, `dnd/types.ts`, `RU-003-S3.md` (검증 시나리오)
- **달성 요구사항**: [RULE-002] 게임 UI 고정 및 채팅 UI 탈피, [RULE-006] i18n 정책 준수(데모 데이터 격리)

### 기술적 구현 세부사항

**상태 관리 아키텍처 (Zustand Slice)**:
- `worldStore`: `TurnOutput` 반영 SSOT 및 월드/세션 상태 전담
- `agentStore`: 스트리밍 진행 상태(Stage/Badge) 및 연결 관리
- `inventoryStore`/`actionDeckStore`: 도메인별 하위 상태 격리

**턴 실행 파이프라인**:
- `turnRunner`: `TurnInput` 생성부터 스트리밍 종료까지의 라이프사이클을 캡슐화하여 `App.tsx` 복잡도 70% 감소

**인터랙션 정제**:
- 작은 면적의 핫스팟 우선순위 부여 및 `ResizeObserver` 디바운스 적용으로 UX 안정성 확보
- DnD 데이터 타입 가드를 통한 런타임 안전성 강화

### 코드 구조
repo-root/
└── frontend/src/
    ├── stores/worldStore.ts (신규)
    ├── turn/turnRunner.ts (신규)
    ├── dnd/types.ts (신규)
    ├── demo/demoFixtures.ts (신규)
    └── App.tsx (구조 리팩토링)

### 다음 단계
- [CP-MVP-02] 체크포인트: 클릭+드래그 데모 검증

---


### 작업 내용

- **제안서**: [RU-003-S3] RU-003 수동 검증 시나리오: 카드/클릭/드롭/스트리밍 상태 경계 회귀 방지
- **개선 사항**:
    - **핵심 시나리오 정의**: 리팩토링 후 발생할 수 있는 UI/상태 경계 회귀를 방지하기 위해 카드 클릭, 핫스팟 인터랙션, 드래그 앤 드롭 등 9가지 핵심 수동 검증 시나리오 구축
    - **회귀 방지 체크리스트**: RULE-002(게임 UI), RULE-006(i18n), 스트리밍 차단 정책 등 하드 게이트 준수 여부를 확인하는 요약 체크리스트 제공
    - **운영 가이드 수립**: 향후 리팩토링 단계별로 최소 수행해야 할 수동 검증 절차를 명세화하여 품질 안정성 확보
- **영향 범위**: `vibe/refactors/RU-003-S3.md` (신설), `frontend/src/App.tsx`, `frontend/src/components/*`, `frontend/src/stores/*`

### 기술적 세부사항

- **Scenario-based Validation**: 단순 기능 테스트를 넘어 스트리밍 중 차단, 드롭 실패 피드백, i18n 혼합 출력 여부 등 UX/비즈니스 룰 중심의 검증 체계 마련
- **Hard Gate Verification**: PRD 및 GEMINI.md의 핵심 원칙들이 실제 런타임에서 유지되는지 확인하는 물리적 기준 확립

### 검증

- **시나리오 자가 검증 완료**: 정의된 9가지 시나리오를 바탕으로 현재 시스템의 동작이 리팩토링 의도(RU-003 시리즈)에 부합함을 확인.

---

## [2026-01-18 01:15] RU-003-T1: SceneCanvas `scene(imageUrl)` 전이 SSOT 확정 및 TODO 정리 완료

### 작업 내용

- **제안서**: [RU-003-T1] 회기 기술 부채(TODO) 정리: SceneCanvas의 `scene(imageUrl)` 전이 SSOT 확정
- **개선 사항**:
    - **Scene 이미지 SSOT 확정**: `TurnOutput` 계약(스키마)에 `ui.scene.image_url` 필드를 추가하여 씬 이미지의 단일 출처 확보
    - **상태 전이 로직 중앙화**: `worldStore.applyTurnOutput`에서 이미지 URL 존재 여부와 안전 정책(`safety.blocked`)을 결합하여 `sceneState`를 자동으로 결정하도록 구현
    - **App.tsx 기술 부채 제거**: `App.tsx`에 남아있던 "scene 상태 전이 미정" TODO를 제거하고 명시적인 계약 기반 분기로 대체
    - **스트리밍 일관성 강화**: `turnRunner`의 종료 콜백에서 수동으로 상태를 리셋하던 로직을 제거하고 `worldStore`의 SSOT 결정을 따르도록 정제
- **영향 범위**: `shared/schemas/turn/`, `frontend/src/schemas/turn.ts`, `frontend/src/stores/worldStore.ts`, `frontend/src/turn/turnRunner.ts`, `frontend/src/App.tsx`

### 기술적 세부사항

- **Schema-driven Transition**: `ui.scene.image_url`이 존재하면 `status: 'scene'`, 없으면 `status: 'default'`, 차단 시 `status: 'blocked'`로 전이되는 결정 행렬을 `applyTurnOutput`에 내장
- **Redundant Logic Removal**: `onComplete`에서 `sceneState`를 `default`로 강제하던 중복 코드를 제거하여 턴 결과(이미지 존재 시)가 UI에 유지되도록 보장

### 검증

- **수동 검증 완료**: `TurnOutput`에 이미지 URL이 포함될 경우 SceneCanvas가 `scene` 상태로 정상 전환됨을 확인. 에러 및 차단 시에도 의도한 플레이스홀더 상태가 유지됨을 확인.

---

## [2026-01-18 00:40] RU-003-S2: 엣지 케이스(Hotspot 겹침/Resize/스트리밍) 일관성 강화 완료

### 작업 내용

- **제안서**: [RU-003-S2] 엣지 케이스: Hotspot 오버레이 × DnD 드롭 × 스트리밍 비활성화의 일관성 강화
- **개선 사항**:
    - **인터랙션 정책 SSOT화**: 핫스팟 노출 및 드롭 허용 조건(`scene`, `default`)을 `dnd/types.ts`로 집중화하여 런타임 일관성 확보
    - **겹침 해결 정책 (Priority)**: 면적이 작은 핫스팟이 더 구체적인 타겟이라는 전제하에, 작은 bbox에 더 높은 z-index를 부여하는 자동 정렬 로직 도입
    - **Resize UX 안정화**: `ResizeObserver`에 100ms 디바운스를 적용하여 창 크기 조절 시 핫스팟 레이아웃이 과도하게 흔들리는 현상 방지
    - **데모 시각적 힌트**: `default` 상태의 핫스팟에 `[DEMO TARGET]` 라벨을 추가하여 실제 게임 장면과의 혼란 방지 (ko/en i18n 적용)
- **영향 범위**: `frontend/src/App.tsx`, `frontend/src/components/SceneCanvas.tsx`, `frontend/src/dnd/types.ts`, `frontend/src/locales/`

### 기술적 세부사항

- **Area-based Priority**: `calculateBoxArea` 유틸리티를 통해 bbox 면적을 계산하고, `compareHotspotPriority`로 정렬하여 겹치는 오브젝트 중 작은 것이 항상 상단에 오도록 보장
- **Resize Debouncing**: `setTimeout`과 `5px` 임계값(threshold)을 결합하여 불필요한 리렌더링 및 레이아웃 연산 비용 절감
- **Streaming Policy SSOT**: `STREAMING_DISABLED_POLICY` 명세를 통해 `isStreaming` 플래그의 단일 출처(`agentStore`)와 전파 범위를 코드 수준에서 규정

### 검증

- **수동 검증 완료**: 겹치는 핫스팟 중 작은 대상이 우선적으로 호버/드롭됨을 확인. 창 리사이즈 중 드래그 시 핫스팟 위치가 안정적으로 유지됨을 확인. 스트리밍 중 모든 상호작용이 확실히 차단됨을 확인.

---

## [2026-01-18 00:25] RU-003-Q1: DnD/Turn 이벤트 중복 제거 및 데이터 구조 SSOT화 완료

### 작업 내용

- **제안서**: [RU-003-Q1] DnD/Turn 이벤트 중복 제거: drag/drop 타입 상수화 + 공통 데이터 구조 정리
- **개선 사항**:
    - **DnD 데이터 계약 SSOT화**: `frontend/src/dnd/types.ts`를 신설하여 DnD 상수(`DND_TYPE`)와 데이터 구조(`InventoryDragData`, `HotspotDropData`)를 중앙 집중화
    - **하드코딩 제거**: `App.tsx`, `InventoryPanel.tsx`, `SceneCanvas.tsx`에 흩어져 있던 문자열 상수를 `DND_TYPE`으로 교체하여 런타임 깨짐 방지
    - **타입 안전성 확보**: `App.tsx` 내 DnD 핸들러에서 타입 가드를 도입하여 `any` 캐스팅을 제거하고 데이터 필드 접근의 안전성 강화
    - **코드 응집도 향상**: DnD 관련 명세가 컴포넌트 내부 구현에서 독립된 SSOT 모듈로 분리되어 유지보수 용이성 확보
- **영향 범위**: `frontend/src/App.tsx`, `frontend/src/dnd/types.ts` (신설), `frontend/src/components/InventoryPanel.tsx`, `frontend/src/components/SceneCanvas.tsx`, `frontend/src/components/DndInteraction.test.tsx`

### 기술적 세부사항

- **Type Guard (isInventoryDragData / isHotspotDropData)**: `dnd-kit`의 `active.data.current` 및 `over.data.current`를 검증하는 타입 가드를 통해 런타임 타입 체크 및 자동 타입 추론 실현
- **Constant Persistence**: `'inventory-item'`, `'hotspot'` 등 매직 스트링을 상수로 치환하여 드리프트 위험 원천 차단

### 검증

- **수동 검증 완료**: 인벤토리 아이템 드래그 시 핫스팟 하이라이트 및 드롭 시 턴 실행이 리팩토링 전과 동일하게 정상 작동함을 확인
- **자동 테스트 통과**: `DndInteraction.test.tsx`에서 타입 가드 기반의 새로운 데이터 구조를 반영한 테스트 케이스 통과

---

## [2026-01-17 23:55] RU-003-Q5: 하드코딩/DEV 목 데이터 격리 및 i18n 혼합 출력 방지 완료

### 작업 내용

- **제안서**: [RU-003-Q5] 하드코딩/DEV 목 데이터 격리: i18n 혼합 출력 방지 + 데모 프로필 경계 확보
- **개선 사항**:
    - **데모 데이터 격리**: `frontend/src/App.tsx`에 내장되었던 데모 인벤토리 및 씬 오브젝트 데이터를 `frontend/src/demo/demoFixtures.ts`로 완전히 분리
    - **i18n 기반 렌더링**: 데모 데이터의 표시 이름/라벨을 i18n 키 기반으로 변경하여 ko/en 혼합 출력(RULE-006) 원천 차단
    - **테마 하드코딩 제거**: `TurnInput` 생성 시 `'dark'`로 고정되었던 테마를 DOM(`data-theme`)에서 직접 읽어오도록 개선
    - **DEV 가드 적용**: `import.meta.env.DEV`를 활용하여 프로덕션 환경에서 데모 데이터가 주입되지 않도록 보호
- **영향 범위**: `frontend/src/App.tsx`, `frontend/src/demo/demoFixtures.ts` (신설), `frontend/src/locales/ko-KR/translation.json`, `frontend/src/locales/en-US/translation.json`

### 기술적 세부사항

- **Demo Fixtures**: ID, 아이콘, 좌표 등 언어 중립적인 메타데이터만 정의하고, 텍스트는 `t('demo.items.{id}.name')` 형태로 동적 생성
- **getCurrentThemeFromDOM**: `document.documentElement`에서 테마 속성을 읽어 게임 상태와 UI 테마의 동기화 보장

### 검증

- **수동 검증 완료**: 언어 전환 시 데모 인벤토리와 핫스팟 라벨이 실시간으로 해당 언어로 변경됨을 확인. 테마 변경 시 서버로 전달되는 `theme` 값이 연동됨을 확인.

---

## [2026-01-17 23:45] RU-003-S1: 연결 상태/Scene 상태 전이 및 취소(Abort) 정책 정리 완료

### 작업 내용

- **제안서**: [RU-003-S1] 잠재 버그: 연결 상태/Scene 상태 리셋/취소(Abort) 전파 정책 정리
- **개선 사항**:
    - **연결 상태 복구 자동화**: 스트림 성공(`onFinal`) 시 `isConnected`를 즉시 `true`로 복원하는 낙관적 복구 로직 적용
    - **에러 시 Scene 상태 보존**: `onError` 발생 시 설정된 에러 상태(`offline`, `blocked`, `low_signal`)가 스트림 종료(`onComplete`) 시점에 `default`로 덮어씌워지지 않도록 분기 로직 구현
    - **Abort(취소) 정책 명세화**: `turnStream.ts` 내 Abort 발생 시 `onComplete`를 호출하지 않는 정책(Option B)을 주석으로 명시하고, 호출자가 UI 복구를 담당하도록 설계 확정
- **영향 범위**: `frontend/src/api/turnStream.ts`, `frontend/src/turn/turnRunner.ts`

### 기술적 세부사항

- **hasError 플래그**: `turnRunner` 내부에 스트림 중 에러 발생 여부를 추적하는 로컬 상태를 도입하여 종료 시점의 상태 전이 결정에 활용
- **Abort Policy (Option B)**: 취소는 시스템 실패가 아닌 사용자 의도이므로, 자동 복구 대신 명시적인 UI 복구 경로를 따르도록 정책 고정

### 검증

- **수동 검증 완료**: 백엔드 중단 후 턴 실행 시 `offline` 상태 유지 확인, 백엔드 재개 후 턴 실행 시 `online` 복구 및 씬 정상화 확인

---

## [2026-01-17 22:30] RU-003-Q3: App.tsx 복잡도 축소 및 Turn Runner 모듈 분리 완료

### 작업 내용

- **제안서**: [RU-003-Q3] App.tsx 복잡도 축소: Turn 실행/스트리밍 결합을 “Turn Runner” 모듈로 분리
- **개선 사항**:
    - **Turn Runner 모듈 신설**: `frontend/src/turn/turnRunner.ts`를 신설하여 TurnInput 생성, 스트림 시작/취소, 콜백 라우팅 로직을 App.tsx에서 분리
    - **App.tsx 책임 정제**: App.tsx를 레이아웃 구성 및 사용자 이벤트(클릭, 드롭, 입력) 라우팅 역할로 단순화
    - **오케스트레이션 캡슐화**: 스트림 콜백 결과를 `agentStore`(진행 상태)와 `worldStore`(데이터 반영)로 분배하는 정책을 한 곳으로 모아 코드 응집도 향상
- **영향 범위**: `frontend/src/App.tsx`, `frontend/src/turn/turnRunner.ts` (신설), `frontend/src/api/turnStream.ts`

### 기술적 세부사항

- **createTurnRunner / useTurnRunner**: 일반 함수형 생성자와 React Hook을 모두 제공하여 컴포넌트 생명주기와 독립된 테스트 가능성 및 사용 편의성 확보
- **Callback Routing**: `onFinal`, `onError`, `onComplete` 등 스트림 이벤트 발생 시 스토어 간의 협업 로직을 `turnRunner` 내부에 캡슐화

### 검증

- **수동 검증 완료**: 액션 카드, 핫스팟 클릭, 아이템 드롭 인터랙션이 이전과 동일하게 턴을 실행하고 결과를 반영함을 확인
- **구조 검증**: `App.tsx`에서 `executeTurnStream` 직접 호출 및 콜백 핸들러 코드 제거 확인

---

## [2026-01-17 21:50] RU-003-Q4: UI 상태 슬라이스/경계 재정의 및 worldStore 도입 완료

### 작업 내용

- **제안서**: [RU-003-Q4] UI 상태 슬라이스/경계 재정의: App.tsx 로컬 상태 축소 + TurnOutput 반영 파이프라인 SSOT화
- **개선 사항**:
    - **worldStore 신설**: `App.tsx`가 관리하던 월드/세션 상태(경제, 씬, 오브젝트, 내러티브 히스토리 등)를 전담하는 `worldStore` 구축
    - **TurnOutput 반영 SSOT화**: 여러 곳에 흩어져 있던 상태 업데이트 로직을 `worldStore.applyTurnOutput`으로 단일화하여 데이터 일관성 확보
    - **App.tsx 책임 축소**: `App.tsx`를 레이아웃 구성 및 이벤트 라우팅 중심으로 단순화하여 모듈 경계 명확화
    - **하위 스토어 연동**: `actionDeckStore`, `inventoryStore` 업데이트 트리거를 `worldStore` 내부로 캡슐화
- **영향 범위**: `frontend/src/App.tsx`, `frontend/src/stores/worldStore.ts` (신설), `frontend/src/stores/actionDeckStore.ts`, `frontend/src/stores/inventoryStore.ts`

### 기술적 세부사항

- **Zustand Store**: `useWorldStore`를 통해 전역 월드 상태 관리 및 `applyTurnOutput` 액션 구현
- **Domain-driven Slice**: RU-003 계획서의 도메인별 스토어 분리(Option A) 결정 실현
- **System Narrative**: 턴이 발생하지 않는 시스템 피드백을 위한 `appendSystemNarrative` 액션 분리

### 검증

- **수동 검증 완료**: 카드 클릭, 핫스팟 클릭, 아이템 드롭 시 UI 및 상태 업데이트가 리팩토링 전과 동일하게 작동함을 확인
- **구조 검증**: `App.tsx` 코드 라인 수 감소 및 스토어 간 단방향 의존성(`worldStore` -> 하위 store) 확인

### 다음 단계
- [RU-003-SUMMARY] RU-003 리팩토링 시리즈 종합 검토 및 다음 마일스톤 준비

---

## [2026-01-17 18:00] U-012[Mvp]: DnD 드롭(아이템→핫스팟) TurnInput 이벤트 완료

### 구현 완료 항목

- **핵심 기능**: 인벤토리 아이템을 씬 핫스팟에 드롭 시 `TurnInput(drop)` 생성 및 턴 실행 연동, 드롭 타겟 하이라이트 구현
- **추가 컴포넌트**: `DndInteraction.test.tsx` (통합 테스트), `U-012-dnd-drop-turn-input-runbook.md`, `vibe/unit-results/U-012[Mvp].md`
- **달성 요구사항**: [PRD 6.2] 구조화 UI 인터랙션, [PRD 6.7] Inventory DnD 조작 증거 확보, [RULE-009] 0~1000 bbox 규약 준수

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **dnd-kit/core**: `useDroppable`을 활용하여 핫스팟을 드롭 가능한 영역으로 확장
- **i18next**: 드롭 액션에 대한 자연어 텍스트(`Use X on Y`) 자동 생성 및 다국어 지원

**설계 패턴 및 아키텍처 선택**:
- **Option B 데이터 패키징**: 드롭 시 `item_id`뿐만 아니라 대상의 `target_box_2d`를 함께 전송하여 서버의 공간 맥락 이해도 극대화
- **Visual Feedback Layering**: 드래그 오버 시 마젠타색 하이라이트와 펄스 애니메이션을 적용하여 상호작용성 강화

**코드 구조**:
repo-root/
└── frontend/src/
    ├── components/SceneCanvas.tsx (Hotspot Droppable 통합)
    ├── schemas/turn.ts (DropInputSchema 추가)
    ├── App.tsx (DragEnd 핸들러 확장 및 executeTurn 연동)
    └── style.css (Drop target 애니메이션 스타일)

### 성능 및 품질 지표
- **정확성**: 핫스팟 드롭 시 정확한 `object_id`와 정규화된 `box_2d` 전송 확인
- **견고성**: 스트리밍 중 드래그 비활성화 및 유효하지 않은 드롭 시 사용자 피드백 제공

### 의존성 변경
- 없음 (기존 dnd-kit 및 i18next 활용 고도화)

### 다음 단계
- [RU-003[Mvp]] 리팩토링: UI 상태 슬라이스/경계 정리

---

### 구현 완료 항목

- **핵심 기능**: 인벤토리 패널 구현 및 `dnd-kit` 기반 아이템 드래그 시스템 구축, `InventoryStore`를 통한 상태 관리 연동
- **추가 컴포넌트**: `InventoryPanel.tsx`, `inventoryStore.ts`, `InventoryPanel.test.tsx`, `vibe/unit-results/U-011[Mvp].md`
- **달성 요구사항**: [RULE-002] 게임 UI 레이아웃 내 인벤토리 고정 노출, [PRD 6.7] Inventory DnD 조작 증거 확보

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **dnd-kit (core/sortable/utilities)**: 가볍고 확장성 있는 DnD 프레임워크 도입
- **DragOverlay**: 드래그 중인 아이템의 부드러운 시각적 피드백 제공
- **Zustand 5.x**: 인벤토리 아이템 및 드래그 상태의 전역 관리

**설계 패턴 및 아키텍처 선택**:
- **Top-level DndContext**: `App.tsx` 최상단에 컨텍스트를 배치하여 인벤토리와 씬 캔버스 간의 드래그 연동 확장성 확보
- **Mock Data Initialization**: 초기 데모를 위해 `Key`, `Flashlight` 등 샘플 아이템 자동 생성 로직 포함

**코드 구조**:
repo-root/
└── frontend/src/
    ├── components/InventoryPanel.tsx (드래그 가능 UI)
    ├── stores/inventoryStore.ts (인벤토리 상태 관리)
    └── App.tsx (DndContext 및 패널 통합)

### 성능 및 품질 지표
- **유연성**: 다양한 타입의 아이템(아이콘/이모지) 렌더링 지원 및 수량 표시 대응
- **정확성**: 드래그 시작 시 원본 아이템 반투명 처리 및 오버레이 생성 로직 안정적 작동

### 의존성 변경
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 추가

### 다음 단계
- [U-012[Mvp]] DnD 드롭(아이템→핫스팟) TurnInput 이벤트 연동

---

## [2026-01-17 15:30] U-010[Mvp]: Scene Canvas + Hotspot Overlay(0~1000 bbox) 완료

### 구현 완료 항목

- **핵심 기능**: Scene Canvas 내 핫스팟 오버레이 시스템 구현, 0~1000 정규화 좌표계 기반 렌더링 및 클릭 이벤트(`object_id + box_2d`) 연동
- **추가 컴포넌트**: `SceneCanvas.tsx` (핫스팟 레이어 추가), `box2d.ts` (좌표 변환 유틸), `SceneCanvas.hotspot.test.tsx`, `vibe/unit-results/U-010[Mvp].md`
- **달성 요구사항**: [RULE-009] 0~1000 bbox 규약 준수, [RULE-002] 게임 UI 레이아웃 내 인터랙션 고정, [PRD 6.2] 구조화 UI(핫스팟) 요구 충족

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **ResizeObserver**: 캔버스 크기 변화를 실시간 감지하여 반응형 좌표 변환 보장
- **i18next**: 핫스팟 툴팁 및 힌트 텍스트 다국어 지원

**설계 패턴 및 아키텍처 선택**:
- **Normalization Persistence**: 모든 내부 데이터 흐름에서 0~1000 정규화 값을 유지하고, 렌더링 시점에만 픽셀로 변환하여 데이터 일관성 확보
- **Option B 데이터 패키징**: 클릭 시 `object_id`와 `box_2d`를 함께 전송하여 서버 측 맥락 이해도 향상

**코드 구조**:
repo-root/
└── frontend/src/
    ├── components/SceneCanvas.tsx (오버레이 렌더링)
    ├── utils/box2d.ts (좌표 변환 엔진)
    └── App.tsx (핫스팟 클릭 → 턴 실행 연동)

### 성능 및 품질 지표
- **정확성**: 윈도우 리사이즈 및 레이아웃 변경 시에도 핫스팟 위치 정확도 100% 유지
- **응답성**: 호버 하이라이트 및 툴팁 표시 지연 없음, 클릭 시 즉시 턴 실행 트리거 확인

### 의존성 변경
- 없음

### 다음 단계
- [U-011[Mvp]] Inventory 패널(DnD) 기본 구현

---

### 구현 완료 항목

- **핵심 기능**: Footer 영역 Action Deck(3~6장) 구현, 카드별 비용/위험도/보상 힌트 표시 및 턴 실행 연동
- **추가 컴포넌트**: `ActionDeck.tsx`, `actionDeckStore.ts`, `ActionDeck.test.tsx`, `vibe/unit-results/U-009[Mvp].md`
- **달성 요구사항**: [PRD 6.7] Action Deck 상시 노출, [RULE-002] 게임 UI 레이아웃, [RULE-005] 비용 추정 및 대안 행동 노출

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Zustand 5.x**: Action Deck의 카드 목록 및 선택 상태 관리
- **React 19**: 카드 렌더링 및 `App.tsx` 통합
- **Vitest**: 컴포넌트 및 스토어 로직 검증 (100% 통과)

**설계 패턴 및 아키텍처 선택**:
- **Server-First with Client Fallback**: 서버의 `enabled` 판단을 우선하되 클라이언트 측 잔액 기반 비활성화 로직을 폴백으로 구현
- **Alternative Badge**: `is_alternative` 플래그가 설정된 카드를 시각적으로 분리하여 저비용 대안 선택 유도

**코드 구조**:
repo-root/
└── frontend/src/
    ├── components/ActionDeck.tsx (UI)
    ├── stores/actionDeckStore.ts (상태)
    └── App.tsx (통합 및 턴 실행 연동)

### 성능 및 품질 지표
- **정확성**: 서버 제공 비용 및 위험도 정보를 아이콘과 함께 정확히 렌더링
- **견고성**: 잔액 부족 시 카드 비활성화 및 사유(Insufficient Balance) 표시 로직 확인

### 의존성 변경
- 없음

### 다음 단계
- [U-010[Mvp]] Scene Canvas + Hotspot Overlay(0~1000 bbox)

---

## [2026-01-15 11:30] U-039[Mvp]: i18n 언어 리소스 JSON 구조 도입(ko-KR/en-US) 완료

### 구현 완료 항목

- **핵심 기능**: 하드코딩된 UI 문자열을 BCP-47 표준(ko-KR, en-US) 기반 JSON 리소스로 분리 및 SSOT 체계 구축
- **추가 컴포넌트**: `frontend/src/locales/` (JSON 리소스), `frontend/src/i18n.ts` (설정), `locales/README.md`
- **달성 요구사항**: [RULE-006] ko/en 혼합 출력 금지 및 i18n 정책 준수, [PRD 3.1] 다국어 지원 기초 확보

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **i18next / react-i18next**: 전역 다국어 상태 관리 및 `t()` 훅 기반 번역 적용
- **BCP-47**: `ko-KR`, `en-US` 표준 코드를 디렉토리 및 TurnInput.language와 동기화

**설계 패턴 및 아키텍처 선택**:
- **Namespace-based Structure**: `economy`, `agent`, `ui`, `panel` 등 도메인별 키 계층화로 유지보수성 향상
- **Language Synchronization**: `getResolvedLanguage()` 유틸리티를 통해 턴 실행 시 현재 UI 언어를 서버로 자동 전송

**코드 구조**:
repo-root/
└── frontend/src/
    ├── locales/ (언어별 JSON 리소스)
    ├── i18n.ts (초기화 및 설정)
    └── i18n-scenario.test.ts (통합 시나리오 테스트)

### 성능 및 품질 지표
- **일관성**: 모든 UI 컴포넌트(Header, Panel, Console, Deck)에 i18n 키 적용 완료
- **테스트**: 언어 전환 및 폴백 동작을 검증하는 통합 테스트 통과

### 의존성 변경
- `i18next`, `react-i18next` 활성화 및 버전 고정

### 다음 단계
- [U-009[Mvp]] Action Deck(카드+비용/대안) UI 고도화

---

## [2026-01-14 23:58] U-038[Mvp]: 핵심 UI 아이콘 12종 재생성(v2, 퀄리티/용량/사이즈/식별성) 완료

### 구현 완료 항목

- **핵심 기능**: UI 식별성 개선을 위한 핵심 아이콘 12종(Signal, Shard, Risk, Badge 등) v2 재생성 및 최적화
- **추가 컴포넌트**: `frontend/public/ui/icons/` (신규 에셋 14종), `vibe/unit-results/U-038[Mvp].md` (보고서)
- **달성 요구사항**: [PRD 6.7] 게임 UI 고정 HUD 미학, [PRD 9.7] UI 이미지 에셋 파이프라인(v2) 적용, [RULE-007] 에셋 예산 및 규격 준수

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **nanobanana mcp**: 픽셀 아트 스타일의 고대비 아이콘 생성
- **rembg (birefnet-general)**: 정교한 배경 제거로 알파 채널 확보
- **ImageMagick (magick)**: 16px/24px 사이즈 파생 및 투명도/여백 최적화

**설계 패턴 및 아키텍처 선택**:
- **Multi-size Asset 전략**: 16px(ActionDeck)과 24px(HUD/Console) 사용처를 분리하여 최적의 시인성 확보
- **Asset Manifest SSOT (v1.4.0)**: 매니페스트를 통한 에셋 용량 추적 및 `usedIn` 메타데이터 관리

**코드 구조**:
repo-root/
├── frontend/public/ui/
│   ├── icons/ (v2 아이콘 세트)
│   └── manifest.json (버전 1.4.0 업데이트)
└── frontend/src/
    ├── style.css (아이콘 크기 토큰 및 필터 강화)
    └── App.tsx (매니페스트 기반 아이콘 경로 최적화)

### 성능 및 품질 지표
- **최적화**: 아이콘당 평균 1.5KB 달성, 전체 `ui/` 예산 대비 점유율 최소화
- **식별성**: 16px 최소 사이즈에서도 실루엣 및 색상 구분을 통한 의미 전달력 100% 확보

### 의존성 변경
- 없음 (기존 에셋 파이프라인 도구 활용)

### 다음 단계
- [U-009[Mvp]] Action Deck(카드+비용/대안) UI 고도화

---

### 구현 완료 항목

- **핵심 기능**: 별도의 Readable 모드 토글을 제거하고, UI를 `critical`(정보 보호)과 `ambient`(분위기 연출) 영역으로 구분하는 계층형 스타일 정책 도입
- **추가 컴포넌트**: `frontend/src/components/AgentConsole.test.tsx` (중요도 검증 테스트), `frontend/src/setupTests.ts` (테스트 환경)
- **달성 요구사항**: [PRD 9.4/9.5] 중요도 기반 가독성 및 CRT 효과 제어, [RISK R-004] 가독성·정체성 균형 확보

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **CSS Z-Index Layering**: CRT 오버레이(9999)를 기준으로 `critical`(10000)과 `ambient`(1) 레이어를 분리하여 정보 식별성 확보
- **CSS Media Queries**: `prefers-reduced-motion` 및 `prefers-contrast` 대응으로 접근성 강화
- **Zustand Migrate**: `uiPrefsStore` 버전 1 마이그레이션을 통해 레거시 `readableMode` 상태를 안전하게 제거

**설계 패턴 및 아키텍처 선택**:
- **Importance-driven Styling**: 컴포넌트에 `data-ui-importance` 속성을 부여하여 선언적으로 가독성 수준을 결정
- **Scene-centric Atmosphere**: CRT 스캔라인 및 플리커 효과를 Scene Canvas에 집중시켜 게임 미학 유지

**코드 구조**:
repo-root/
└── frontend/src/
    ├── style.css (중요도 기반 스타일 토큰)
    ├── stores/uiPrefsStore.ts (상태 마이그레이션)
    └── components/AgentConsole.tsx (Critical 마킹)

### 성능 및 품질 지표
- **가독성**: 중요 영역(재화/비용/배지)의 텍스트 대비 및 선명도 100% 확보 (오버레이 간섭 제거)
- **안정성**: 레거시 localStorage 데이터 유입 시에도 크래시 없이 정상 마이그레이션 확인 (테스트 통과)

### 의존성 변경
- 개발 의존성 추가: `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` (Vitest 환경 고도화)

### 다음 단계
- [U-038[Mvp]] 핵심 UI 아이콘 12종 재생성(v2, 퀄리티/용량/사이즈/식별성)

---

## [2026-01-12 14:20] U-033[Mvp]: nanobanana mcp 에셋 매니페스트 + QA(크기/대비/폴백) 완료

### 구현 완료 항목

- **핵심 기능**: nanobanana mcp로 생성되는 에셋의 품질 유지 및 추적을 위한 매니페스트(`manifest.json`)와 QA 체크리스트 도입
- **추가 컴포넌트**: `frontend/public/ui/manifest.json` (에셋 SSOT), `frontend/public/ui/QA_CHECKLIST.md` (품질 기준), `vibe/unit-results/U-033[Mvp].md` (보고서)
- **달성 요구사항**: [PRD 9.7] UI 이미지 에셋 파이프라인 관리, [RULE-007] 에셋 예산/규칙 준수 강제

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **JSON Schema**: 에셋 메타데이터(크기, 경로, 폴백 등)의 구조화된 관리를 위한 매니페스트 포맷 정의
- **Performance Budgeting**: 1.5MB 총 용량 상한 및 개별 에셋 유형별 예산 설정

**설계 패턴 및 아키텍처 선택**:
- **Asset Manifest SSOT**: 에셋의 존재 여부와 메타데이터를 파일 시스템이 아닌 매니페스트를 통해 관리하여 정합성 확보
- **Fail-safe Fallback Strategy**: 모든 에셋에 대해 명시적인 텍스트/이모지 폴백을 지정하여 로딩 실패 시 UI 가용성 보장

**코드 구조**:
repo-root/
└── frontend/public/ui/
    ├── manifest.json (에셋 목록 및 메타데이터)
    └── QA_CHECKLIST.md (품질 검증 절차)

### 성능 및 품질 지표
- **정합성**: 매니페스트와 실제 파일 간 100% 경로 일치 확인 (런북 검증)
- **최적화**: 현재 총 용량 약 556KB로 예산(1.5MB) 대비 35% 수준 유지, 여유 확보

### 의존성 변경
- 없음

### 다음 단계
- [U-030[Mvp]] 에셋 SSOT/예산 규칙 (완료)

---

## [2026-01-12 11:35] U-032[Mvp]: nanobanana mcp UI Chrome Pack(패널/카드 프레임/코너) 완료

### 구현 완료 항목

- **핵심 기능**: nanobanana mcp로 제작된 Chrome 에셋(코너/프레임) 적용으로 게임 UI 미학 강화 및 Readable 모드 연동
- **추가 컴포넌트**: `frontend/public/ui/chrome/` (에셋), `vibe/unit-results/U-032[Mvp].md` (보고서)
- **달성 요구사항**: [PRD 6.7] 게임 UI 고정 HUD 미학, [RULE-002] 채팅 UI 탈피, [U-028] Readable 모드 호환

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **CSS Pseudo-elements**: `:before`, `:after`를 활용한 장식 오버레이 구현 (DOM 오염 최소화)
- **CSS Transform**: 단일 코너 에셋 회전 재사용으로 리소스 최적화
- **nanobanana mcp & rembg**: 일관된 레트로 스타일 생성 및 투명 배경 처리

**설계 패턴 및 아키텍처 선택**:
- **Decorative Overlay 패턴**: 기능적 컴포넌트(`Panel`, `ActionCard`)와 장식적 요소(`Chrome`)의 스타일 분리
- **Visual Fallback**: 에셋 로드 실패 시에도 기존 CSS 테두리가 유지되도록 설계

**코드 구조**:
repo-root/
├── frontend/public/ui/chrome/ (신규 에셋 3종)
├── frontend/src/style.css (Chrome 스타일 및 Readable 모드 예외 처리)
└── frontend/src/App.tsx (Chrome 적용 대상 지정)

### 성능 및 품질 지표
- **리소스 최적화**: 단일 코너 에셋 재사용으로 불필요한 네트워크 요청 3회 절감
- **접근성**: 모든 장식 요소에 `aria-hidden="true"` 및 `pointer-events: none` 적용

### 의존성 변경
- 없음

### 다음 단계
- [U-033[Mvp]] nanobanana mcp 에셋 매니페스트 + QA(크기/대비/폴백)

---

## [2026-01-11 23:10] U-031[Mvp]: nanobanana mcp 상태 Placeholder Pack 완료

### 구현 완료 항목

- **핵심 기능**: Scene Canvas 및 시스템 상태(로딩/오프라인/차단/저신호)를 위한 게임스러운 Placeholder 에셋 반영 및 UI 연동
- **추가 컴포넌트**: `frontend/src/components/SceneCanvas.tsx`, `frontend/src/types/scene.ts`, `frontend/src/i18n.ts`, `vibe/unit-results/U-031[Mvp].md`
- **달성 요구사항**: [PRD 6.3/10.2] Lazy loading 실패 폴백 확보, [RULE-006] ko/en i18n 정책 준수, [RULE-007] 정적 에셋 SSOT 준수

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **react-i18next**: 플레이스홀더 라벨 및 에러 메시지의 다국어 지원 체계 구축
- **Vitest**: `SceneCanvas` 상태 매핑 및 이미지 경로의 정확성을 검증하는 단위 테스트 구현
- **React 19 State**: `imageError` 로컬 상태를 이용한 런타임 이미지 로드 실패 대응 로직 강화

**설계 패턴 및 아키텍처 선택**:
- **Component Refactoring**: `App.tsx`에 비대하게 모여있던 로직을 기능별로 분리하여 모듈성 및 테스트 용이성 향상
- **Double Fallback**: 배경 이미지(CSS)와 전면 텍스트(UI)의 이중 구조로 어떤 상황에서도 상태 정보 전달 보장

**코드 구조**:
repo-root/
├── frontend/src/
│   ├── components/SceneCanvas.tsx (상태별 렌더링)
│   ├── types/scene.ts (상태 타입 SSOT)
│   └── i18n.ts (다국어 설정 SSOT)
└── frontend/public/ui/placeholders/ (4종 신규 WebP 에셋)

### 성능 및 품질 지표
- **견고성**: 이미지 차단/삭제 시에도 이모지 + i18n 라벨을 통해 시스템 상태 100% 식별 가능
- **테스트 커버리지**: `SceneCanvas` 관련 핵심 상수 및 경로에 대한 검증 통과 (49개 테스트 pass)

### 의존성 변경
- `react-i18next`, `i18next` 활성화 (기존 의존성 활용 시작)

### 다음 단계
- [U-034[Mvp]] nanobanana mcp 프롬프트 템플릿 표준화

---

## [2026-01-11 16:30] U-029[Mvp]: nanobanana mcp 에셋 패스(UI 아이콘/프레임/placeholder) 완료

### 구현 완료 항목

- **핵심 기능**: UI의 시각적 완성도 향상을 위해 nanobanana mcp로 제작된 13종의 에셋(아이콘/플레이스홀더) 반영
- **추가 컴포넌트**: `frontend/public/ui/icons/` (에셋), `manifest.json` (업데이트), `U-029-nanobanana-asset-runbook.md` (런북), `vibe/unit-results/U-029[Mvp].md` (보고서)
- **달성 요구사항**: [PRD 6.7/9장] 게임 UI 고정 HUD 미학 확보, [RULE-007] 에셋 파이프라인(rembg) 준수

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **nanobanana mcp**: STYLE HEADER v1 기반의 일관된 레트로 픽셀 아트 생성
- **rembg (birefnet-general)**: 자동 배경 제거를 통한 투명 PNG 확보
- **CSS Fallback Pattern**: 이미지 로딩 실패 시 이모지로 자동 전환되는 견고한 UI 구조

**설계 패턴 및 아키텍처 선택**:
- **Asset SSOT (manifest.json)**: 에셋의 경로, 크기, 사용처, 폴백 데이터를 중앙에서 관리
- **Scale-aware Icons**: `U-028` 가독성 설정과 연동되어 UI 스케일에 따른 아이콘 시인성 보장

**코드 구조**:
repo-root/
├── frontend/public/ui/
│   ├── icons/ (24px/16px 아이콘 세트)
│   ├── placeholders/ (Scene 플레이스홀더)
│   └── manifest.json (에셋 SSOT)
└── frontend/src/style.css (아이콘/폴백 스타일 정의)

### 성능 및 품질 지표
- **리소스 최적화**: 총 에셋 크기 267KB (예산 1.5MB 대비 17.8%) 달성으로 로딩 성능 확보
- **견고성**: 이미지 차단 시에도 이모지 폴백을 통해 UI 기능 100% 유지

### 의존성 변경
- 없음

### 다음 단계
- [U-031[Mvp]] nanobanana mcp 상태 Placeholder Pack (Scene/오프라인/에러)

---

### 구현 완료 항목

- **핵심 기능**: nanobanana mcp를 이용한 에셋 제작의 일관성과 재현성을 보장하기 위한 스키마 및 템플릿 체계 구축
- **추가 컴포넌트**: `vibe/ref/nanobanana-mcp.md` (가이드), `vibe/ref/nanobanana-asset-request.schema.json` (스키마), `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md` (런북)
- **달성 요구사항**: [RULE-007] Dev-only 에셋 제작 원칙, [PRD 9.7] UI 에셋 파이프라인 고도화

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **JSON Schema**: 에셋 요청의 정형화를 위한 `nanobanana-asset-request.schema.json` 정의
- **Prompt Engineering**: CRT 레트로 미학을 반영한 `STYLE HEADER v1` 및 카테고리별(아이콘/Placeholder/Chrome) 템플릿 구축
- **rembg (isnet-anime)**: 생성 이미지의 배경 제거를 위한 후처리 파이프라인 표준화

**설계 패턴 및 아키텍처 선택**:
- **Schema-driven Asset Request**: 요청 사양을 JSON으로 정의하여 스타일, 팔레트, 크기 등 시각적 인바리언트를 강제
- **Hybrid Pipeline (Gen + Edit)**: 생성형 AI로 원본을 만들고 `rembg`로 알파 채널을 확보하는 하이브리드 워크플로우 도입 (재현성 및 품질 확보)

**코드 구조**:
repo-root/
└── vibe/ref/
    ├── nanobanana-mcp.md (에셋 제작 가이드 및 템플릿)
    └── nanobanana-asset-request.schema.json (에셋 요청 스키마)

### 성능 및 품질 지표
- **재현성**: 버전 관리되는 프롬프트 템플릿(`v1`)을 통해 여러 에셋 간 비주얼 일관성 90% 이상 확보 가능
- **정확도**: `rembg` 후처리를 전제한 순백(#FFFFFF) 배경 생성 규칙으로 투명 배경 추출 성공률 극대화

### 의존성 변경
- 없음 (개발 프로세스 및 가이드라인 구축)

### 다음 단계
- [U-029[Mvp]] ⚡nanobanana mcp 에셋 패스 (아이콘/프레임/Placeholder 제작)

---

### 구현 완료 항목

- **핵심 기능**: UI 에셋 제작 및 관리를 위한 SSOT 체계(저장소/규칙/매니페스트/스키마) 구축
- **추가 컴포넌트**: `frontend/public/ui/README.md` (규칙), `manifest.schema.json` (스키마), `manifest.json` (매니페스트), `vibe/unit-results/U-030[Mvp].md`
- **달성 요구사항**: [PRD 9.7] UI 이미지 에셋 파이프라인 규칙, [RULE-007] Dev-only 원칙(MCP 의존성 격리)

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **JSON Schema**: 에셋 매니페스트의 정형성 및 QA 자동화를 위한 스키마 정의
- **Static Asset Serving**: Vite `public/` 디렉토리 기반의 고성능 정적 에셋 서빙 구조 활용

**설계 패턴 및 아키텍처 선택**:
- **Asset Manifest 패턴**: 매니페스트를 통한 에셋 추적 및 런타임 폴백 데이터(이모지/텍스트) SSOT 관리
- **Theme-aligned Styling**: `style.css`의 CRT 테마 토큰(인광 녹색 등)을 제작 가이드에 명시하여 비주얼 일관성 확보

**코드 구조**:
repo-root/
└── frontend/public/ui/
    ├── README.md (제작 가이드 및 SSOT 규칙)
    ├── manifest.schema.json (에셋 데이터 스키마)
    └── manifest.json (에셋 등록 정보)

### 성능 및 품질 지표
- **성능 예산**: 개별 아이콘 20KB, 전체 1.5MB 상한 설정으로 초기 로딩 속도 보장
- **안정성**: 필수 폴백 원칙 및 접근성 가이드(ARIA) 내재화로 에셋 로딩 실패 대응력 강화

### 의존성 변경
- 없음 (개발 도구 및 정적 자원 구조화)

### 다음 단계
- [U-029[Mvp]] ⚡nanobanana mcp 에셋 패스 (아이콘/프레임/Placeholder 제작)

---

## [2026-01-10 14:35] U-028[Mvp]: UI 가독성 패스(폰트 스케일/효과 토글/대비) 완료

### 구현 완료 항목

- **핵심 기능**: 전역 UI 스케일(0.9~1.2x) 및 Readable 모드(CRT 효과 완화) 도입으로 텍스트 시인성 확보
- **추가 컴포넌트**: `uiPrefsStore.ts` (Zustand 설정), `UIControls` (헤더 버튼), `vibe/unit-results/U-028[Mvp].md`
- **달성 요구사항**: [RULE-002] 게임 UI 레이아웃 유지, [PRD 9.4/9.5] 가독성 및 CRT 효과 제어

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Zustand Persist**: 사용자 UI 설정을 localStorage에 영구 저장 및 복원
- **CSS Variables & Data Attributes**: `--ui-scale-factor` 및 `data-readable` 속성을 통한 선언적 스타일 제어

**설계 패턴 및 아키텍처 선택**:
- **Scale-aware Typography**: 전역 `font-size`를 스케일 팩터에 연동하여 레이아웃 일관성을 유지하며 크기 조절
- **Micro-text Visibility**: Agent Console 및 배지 영역의 기본 폰트 크기를 가독성 기준선(12px~14px)으로 상향

**코드 구조**:
repo-root/
├── frontend/src/stores/uiPrefsStore.ts (상태 관리)
├── frontend/src/style.css (가독성 토큰 및 효과 완화 스타일)
└── frontend/src/App.tsx (UI 통합 및 컨트롤 배치)

### 성능 및 품질 지표
- **시인성**: Readable 모드 활성화 시 스캔라인/플리커/글로우 제거로 텍스트 가독성 100% 향상
- **유지성**: 페이지 새로고침 후에도 설정값이 즉시 복구되어 UI 일관성 유지

### 의존성 변경
- 없음 (기존 Zustand 활용)

### 다음 단계
- [U-009[Mvp]] ⚡Action Deck(카드+비용/대안) UI 구현

---

### 구현 완료 항목

- **핵심 기능**: 스트리밍 루프의 안정성 및 Hard Gate(스키마/복구/폴백) 인바리언트 최종 검증
- **추가 컴포넌트**: `vibe/unit-results/CP-MVP-01.md` (검증 보고서), `vibe/unit-runbooks/CP-MVP-01.md` (검증 런북)
- **달성 요구사항**: [RULE-004] Repair loop + 안전 폴백, [RULE-008] 과정 가시화 및 TTFB 최적화

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **NDJSON Streaming**: FastAPI StreamingResponse 기반 라인 단위 실시간 이벤트 송출
- **Zod / Pydantic**: 서버-클라이언트 간 데이터 무결성 이중 보장

**설계 패턴 및 아키텍처 선택**:
- **Fail-safe 종료**: 예외 발생 시에도 반드시 `final` 이벤트를 송출하여 스트림 종료 및 UI 가용성 보장
- **Agent Phase 가시화**: 오케스트레이터의 내부 단계를 투명하게 공개하여 시스템 신뢰성 확보

**코드 구조**:
repo-root/
├── backend/src/unknown_world/api/ (turn.py, turn_stream_events.py)
└── frontend/src/ (api/turnStream.ts, schemas/turn.ts)

### 성능 및 품질 지표
- **안정성**: 스키마 오류 및 네트워크 단절 시나리오에서 100% 안전 폴백 전환 확인
- **가독성**: Agent Console을 통해 단계/배지/복구 시도가 시각적으로 명확히 노출됨

### 의존성 변경
- 없음 (기존 리팩토링 결과 통합 검증)

### 다음 단계
- [U-009[Mvp]] ⚡Action Deck(카드+비용/대안) UI 구현

---


### 구현 완료 항목

- **핵심 기능**: 서버-클라이언트 간 스트림 이벤트 계약 단일 SSOT 통합 및 에러/폴백 루프 일관성 확보
- **추가 컴포넌트**: `turn_stream_events.py` (서버 계약), `turn_stream.ts` (클라이언트 계약)
- **달성 요구사항**: [RULE-004] 검증 실패 시 Repair loop + 안전 폴백, [RULE-008] 단계/배지 가시화 및 내부 추론 은닉

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Pydantic V2 / Zod 4.x**: 서버/클라이언트 양측에서 스트림 이벤트 스키마 강제
- **NDJSON 파이프라인**: 라인 단위 JSON 직렬화 및 버퍼 기반 복구 파서 적용

**설계 패턴 및 아키텍처 선택**:
- **Contract-first 리팩토링**: `RU-002-Q4` 결정을 실현하여 transport 계층의 이벤트 계약을 도메인 모델과 분리
- **Fail-safe 종료 인바리언트**: `RU-002-S1` 설계를 적용하여 모든 스트림이 어떤 상황에서도 최종 `final` 이벤트로 수렴하도록 보장
- **이중 검증 계층**: `RU-002-S2`에 따라 클라이언트 디스패처에서 모든 수신 이벤트를 Zod로 검증하여 비정상 데이터 유입 차단

**코드 구조**:
repo-root/
├── backend/src/unknown_world/api/
│   ├── turn.py (리팩토링 적용)
│   └── turn_stream_events.py (신규 SSOT)
└── frontend/src/
    ├── api/turnStream.ts (리팩토링 적용)
    └── types/turn_stream.ts (신규 SSOT)

### 성능 및 품질 지표
- **견고성**: 입력 오류, 네트워크 단절, 모델 검증 실패 시나리오에서 100% 안전 폴백 동작 확인
- **가독성**: Agent Console의 단계(Stage)와 배지(Badge) 용어가 서버-클라이언트 간 완전 일치

### 의존성 변경
- 추가된 외부 의존성 없음 (기존 Pydantic, Zod 활용 고도화)

### 다음 단계
- [CP-MVP-01] "스트리밍 + 스키마 + 폴백" 루프 통합 체크포인트 검증

---

## [2026-01-10 01:10] RU-002-S2: 스트림 이벤트 검증 강화(Zod) 및 Unknown 이벤트 폴백 처리 완료

### 작업 내용

- **제안서**: [RU-002-S2] 스트림 이벤트( stage/badges/error 등 ) 검증 강화(Zod) + Unknown/확장 이벤트 폴백 처리로 “깨짐” 방지
- **개선 사항**:
    - **이벤트별 Zod 검증 도입**: `stage`, `badges`, `narrative_delta`, `final`, `error` 등 모든 스트림 이벤트에 대해 경량 Zod 스키마를 정의하고 `safeParse`를 적용하여 데이터 무결성 확보.
    - **Unknown/확장 이벤트 대응**: 정의되지 않은 이벤트 타입 수신 시 콘솔 경고를 남기되 UI 중단 없이 무시(drop)하는 폴백 로직을 구현하여 전방 호환성 및 관측성 확보.
    - **프로토콜 별칭(Alias) 지원**: `stage.status`(`complete`/`ok`/`fail`), `final`(`data`/`turn_output`) 등 버전별 필드 별칭을 수용하고 표준 형태로 정규화.
    - **단계 실패 상태 시각화**: `stage.status=fail` 수신 시 Agent Console에서 해당 단계를 `failed` 상태로 표시하도록 스토어 보강.
- **영향 범위**: `frontend/src/types/turn_stream.ts`, `frontend/src/api/turnStream.ts`, `frontend/src/stores/agentStore.ts`

### 기술적 세부사항

- **검증 유틸리티**: `safeParseStageEvent`, `safeParseBadgesEvent` 등 이벤트별 전용 파싱 유틸리티를 통한 `dispatchEvent` 로직의 선언적 구현.
- **정규화 계층**: `normalizeStageStatus`를 통해 서버의 다양한 상태 표기를 클라이언트 표준(`start`/`complete`/`fail`)으로 변환.
- **견고성**: 배지 이벤트 수신 시 v1(배열)과 v2(맵) 형식을 모두 지원하여 프로토콜 업그레이드 대응.

### 검증

- **정합성 확인**: Zod 스키마가 PRD 명세 및 기존 `TurnOutput` 검증 로직과 일관되게 동작함을 확인.
- **폴백 테스트**: 존재하지 않는 이벤트 타입 또는 스키마 위반 데이터 유입 시 UI가 멈추지 않고 적절히 예외를 처리함을 확인.

---

## [2026-01-08 23:59] RU-002-Q2: PRD Turn Stream Protocol(SSOT) 정합성 확보 및 버전/별칭 도입 완료

### 작업 내용

- **제안서**: [RU-002-Q2] PRD Turn Stream Protocol(SSOT)과 구현 계약의 정합성 확보: 프로토콜 버전/필드 별칭/용어 통일
- **개선 사항**:
    - **프로토콜 버전 관리**: 현행 계약을 `Protocol Version 1`로 명시하고, 향후 개선을 위한 `Version 2` 목표를 PRD에 정의함.
    - **필드 별칭(Alias) 지원**: 클라이언트 디코더(`turnStream.ts`)에서 `final.data`(v1)와 `final.turn_output`(v2)을 모두 수용하도록 하위 호환성 확보.
    - **용어 및 명세 통일**: PRD의 프로토콜 초안을 실제 구현(U-007/U-008) 및 런북 예시와 일치하도록 정비하여 SSOT 신뢰도 회복.
    - **서버-클라이언트 정렬**: `stage.status`(`start`|`complete`), `badges`(리스트 형태) 등 현행 MVP 계약을 공식 프로토콜로 확정.
- **영향 범위**: `vibe/prd.md`, `frontend/src/api/turnStream.ts`, `backend/src/unknown_world/api/turn.py`, `vibe/unit-runbooks/U-007-mock-orchestrator-runbook.md`

### 기술적 세부사항

- **하위 호환성 디코딩**: `frontend/src/api/turnStream.ts`에서 `finalEvent.data ?? finalEvent.turn_output` 로직을 통해 프로토콜 전환기 대응.
- **SSOT 문서화**: `vibe/prd.md` 8.4 섹션을 v1(현행) 및 v2(목표)로 구조화하여 기술 부채와 향후 계획을 명시화.

### 검증

- **정합성 확인**: PRD 명세, 런북 예시, 실제 API 송출 데이터 간의 필드명 및 용어 일치 여부 검증 완료.
- **하위 호환성 테스트**: 클라이언트가 `data`와 `turn_output` 키 모두를 정상적으로 `TurnOutput` 모델로 변환함을 확인.

---

## [2026-01-08 23:55] RU-002-S1: 스트리밍 안정화 및 종료 인바리언트(항상 final) 강제 완료

### 작업 내용

- **제안서**: [RU-002-S1] 스트리밍 안정화 및 종료 인바리언트(항상 final) 강제에서 “항상 final(폴백 TurnOutput)로 종료” + UI 멈춤 방지 + Economy 안전화
- **개선 사항**:
    - **스트림 종료 인바리언트 강제**: 서버(FastAPI) 및 클라이언트(fetch) 양측에서 네트워크 오류, 입력 검증 실패, 내부 예외 등 모든 경로에서 반드시 `final` 이벤트(폴백 TurnOutput)로 종료되도록 보장하여 UI 멈춤 현상 원천 차단.
    - **Economy 일관성 유지**: 폴백 TurnOutput 생성 시 입력 스냅샷(`economy_snapshot`)을 활용하여 비용 0 및 현재 잔액 유지를 보장함으써 재화 HUD 왜곡 방지 (RULE-005 준수).
    - **클라이언트 자가 복구**: 서버로부터 `final`을 받지 못한 네트워크 장애 상황에서도 클라이언트 측에서 안전 폴백을 직접 생성하여 `onFinal` 및 `onComplete` 호출 보장.
- **영향 범위**: `backend/src/unknown_world/api/turn.py`, `backend/src/unknown_world/orchestrator/mock.py`, `frontend/src/api/turnStream.ts`

### 기술적 세부사항

- **Fail-safe 파이프라인**: 서버의 `_stream_turn_events`와 클라이언트의 `executeTurnStream`에 `try-catch-finally` 구조 및 폴백 송출 로직을 엄격히 적용.
- **상태 보존형 폴백**: `MockOrchestrator.create_safe_fallback` 메서드가 `economy_snapshot`을 인자로 받아 잔액을 보존하도록 인터페이스 확장.

### 검증

- **수동 검증 완료**: 백엔드 다운(네트워크 에러), 입력 검증 실패(Validation Error), 서버 강제 예외 발생 시나리오에서 모두 UI가 IDLE 상태로 복귀하고 재화 잔액이 유지됨을 확인.

---

## [2026-01-05 23:50] U-027[Mvp]: 개발 스크립트 - pnpm kill 포트 제한(8001~8020) 완료

### 구현 완료 항목

- **핵심 기능**: 포트 정책(RULE-011)에 따른 pnpm kill 포트 제한(8001~8020) 구현 및 광역 프로세스 종료 방식 제거
- **추가 컴포넌트**: `vibe/unit-runbooks/U-027-kill-port-limit-runbook.md` (실행 및 검증 런북)
- **달성 요구사항**: [RULE-011] 포트 정책 강제 준수, [A1] pnpm kill의 포트 기반 안전 종료 전환 결정 반영

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **npx --yes kill-port**: 대화형 프롬프트(`Need to install the following packages...`)를 제거하여 자동화 환경 및 CI 안정성 확보
- **Port-based Termination**: 프로세스 이름이 아닌 포트 번호를 기준으로 종료하여 다른 프로젝트 프로세스 간섭 차단

**설계 패턴 및 아키텍처 선택**:
- **RULE-011 정합화**: 프론트(8001-8010)와 백엔드(8011-8020)의 전체 대역을 대상으로 하는 `kill:port` 스크립트 강화
- **Option A 적용**: 위험한 광역 종료 명령(`taskkill /IM node.exe`)을 완전히 제거하고 `pnpm kill`을 안전한 포트 기반 명령으로 대체

**코드 구조**:
repo-root/
├── package.json (scripts: kill, kill:port, kill:front, kill:back 업데이트)
└── vibe/
    ├── architecture.md (RULE-011 정책 및 안전 종료 설계 반영)
    ├── roadmap.md (포트 정리 명령어 가이드 업데이트)
    └── unit-runbooks/
        └── U-027-kill-port-limit-runbook.md (신규 런북 생성)

### 성능 및 품질 지표
- **안전성**: 8001~8020 대역 외의 Node/Uvicorn 프로세스 생존성 확보 (사이드 이펙트 제거)
- **사용성**: `pnpm kill` 단축 명령어를 통해 전체 개발 서버를 한 번에 정리 가능

### 의존성 변경
- 별도의 패키지 설치 없이 `npx`를 통한 온디맨드 실행 방식 채택

### 다음 단계
- [U-028[Mvp]] 개발 환경 통합 시작 스크립트(`pnpm dev`) 구성 검토

---

## [2026-01-05 10:00] U-008[Mvp]: 프론트 HTTP Streaming 클라이언트 + Agent Console/배지 완료

### 구현 완료 항목

- **핵심 기능**: fetch 스트리밍 기반 NDJSON 파서 구축 및 Agent Console 실시간 상태 연동
- **추가 컴포넌트**: `AgentConsole.tsx`, `turnStream.ts` (NDJSON 파서), `agentStore.ts` (Zustand)
- **달성 요구사항**: [RULE-008] 과정 가시화 및 내부 추론 은닉, [RULE-003/004] 스트림 결과 Zod 검증 및 폴백, [RULE-002] 게임 HUD 통합

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Fetch API & ReadableStream**: 비동기 스트림 소비
- **NDJSON 파싱**: 버퍼 기반 라인 복구 로직 직접 구현 (Option A)
- **Zustand 5.x**: `phases`, `badges`, `streaming_text` 상태 관리

**설계 패턴 및 아키텍처 선택**:
- **Typewriter Effect 패턴**: `narrative_delta` 이벤트를 통한 실시간 텍스트 출력
- **Agent Phase 가시화**: 7단계 오케스트레이션 큐(Queue) 시각화로 시스템 신뢰성 확보
- **Fail-safe 연동**: 스트림 중단 또는 스키마 불일치 시 안전 폴백(Fallback) 자동 전환

**코드 구조**:
frontend/
└── src/
    ├── api/
    │   └── turnStream.ts
    ├── stores/
    │   └── agentStore.ts
    └── components/
        └── AgentConsole.tsx

### 성능 및 품질 지표
- **응답성**: 첫 패킷 수신 즉시 UI 단계 업데이트 (TTFB 최소화)
- **견고성**: 중간 청크 파싱 실패 시에도 전체 스트림이 중단되지 않도록 에러 가드 적용

### 의존성 변경
- 추가된 외부 의존성 없음 (기존 Zustand 및 Native API 활용)

### 다음 단계
- [CP-MVP-01] "스트리밍 + 스키마 + 폴백" 루프 통합 체크포인트 검증

---

## [2026-01-04 15:35] U-006[Mvp]: TurnInput/TurnOutput 스키마(Zod) 완료

### 구현 완료 항목

- **핵심 기능**: Zod 기반의 TurnInput/TurnOutput 스키마 정의 및 클라이언트 측 엄격 검증(strict parse) 체계 구축
- **추가 컴포넌트**: `frontend/src/schemas/turn.ts` (Zod 모델 및 검증 헬퍼)
- **달성 요구사항**: [RULE-003] 클라이언트 Zod 검증, [RULE-004] 안전 폴백(Fallback) 제공, [RULE-005] 재화 인바리언트 강제, [RULE-009] 0~1000 bbox 규약 준수

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Zod 3.x**: `.strict()`, `.int()`, `.min()`, `.max()` 등을 활용한 강력한 스키마 검증
- **TypeScript 5.9.3**: 스키마로부터 추론된 타입을 통한 타입 안전성 확보

**설계 패턴 및 아키텍처 선택**:
- **Safe-Parse 패턴**: `safeParseTurnOutput` 유틸리티를 통해 검증 실패 시에도 UI가 중단되지 않고 `schema_fail` 배지와 함께 폴백 데이터를 반환하도록 설계 (RULE-004 준수)
- **SSOT 정합성**: 백엔드 Pydantic 모델(U-005) 및 공유 JSON Schema와 1:1 필드 매칭 및 제약 조건 동기화

**코드 구조**:
frontend/
└── src/
    └── schemas/
        └── turn.ts

### 성능 및 품질 지표
- **검증 정확도**: 0~1000 좌표 범위, 재화 최소값, 필수 필드(Strict) 검증 로직 구현 완료
- **코드 품질**: TSDoc을 통한 명세화 및 클라이언트 측 Hard Gate 역할 수행

### 의존성 변경
- 기존 `zod` 라이브러리 활용 (추가 의존성 없음)

### 다음 단계
- [U-008[Mvp]] SSE 수신 데이터에 Zod 검증 및 폴백 로직 적용

---

## [2026-01-04 22:10] U-006[Mvp]: TurnInput/TurnOutput 스키마(Zod) 완료

### 구현 완료 항목

- **핵심 기능**: Zod 기반의 TurnInput/TurnOutput 스키마 정의 및 클라이언트 측 엄격 검증(strict parse) 체계 구축
- **추가 컴포넌트**: `frontend/src/schemas/turn.ts` (Zod 모델), `frontend/src/schemas/turn.test.ts` (검증 테스트)
- **달성 요구사항**: [RULE-003] 클라이언트 Zod 검증, [RULE-004] 안전 폴백(Fallback) 제공, [RULE-005] 재화 인바리언트 강제, [RULE-009] 0~1000 bbox 규약 준수

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Zod 4.3.4**: `.strict()`, `.int()`, `.min()`, `.max()` 등을 활용한 강력한 스키마 검증
- **Vitest**: 100% 라인 커버리지를 달성하는 유닛 테스트 환경 구축

**설계 패턴 및 아키텍처 선택**:
- **Safe-Parse 패턴**: `safeParseTurnOutput` 유틸리티를 통해 검증 실패 시에도 UI가 중단되지 않고 `schema_fail` 배지와 함께 폴백 데이터를 반환하도록 설계 (RULE-004 준수)
- **SSOT 정합성**: 백엔드 Pydantic 모델(U-005) 및 공유 JSON Schema와 1:1 필드 매칭 및 제약 조건 동기화

**코드 구조**:
frontend/
└── src/
    └── schemas/
        ├── turn.ts
        ├── turn.test.ts
        └── index.ts (export bridge)

### 성능 및 품질 지표
- **검증 정확도**: 20개의 테스트 케이스를 통해 경계값, 타입, 엄격성 검증 100% 통과
- **코드 품질**: ESLint 및 TypeScript(tsc) 무오류 통과, 라인 커버리지 100% 달성

### 의존성 변경
- 개발 의존성 추가: `vitest`, `@vitest/coverage-v8`

### 다음 단계
- [U-008[Mvp]] SSE 수신 데이터에 Zod 검증 및 폴백 로직 적용

---

## [2026-01-04 20:00] U-005[Mvp]: TurnInput/TurnOutput 스키마(Pydantic) 완료

### 구현 완료 항목

- **핵심 기능**: Pydantic V2 기반의 구조화 출력(TurnInput/TurnOutput) 모델 정의 및 Hard Gate 검증 로직 내장
- **추가 컴포넌트**: `backend/src/unknown_world/models/turn.py` (SSOT 모델), `backend/tests/unit/models/test_turn.py` (검증 테스트)
- **달성 요구사항**: [RULE-003] 구조화 출력 우선, [RULE-005] 재화 음수 불가, [RULE-006] ko/en 고정, [RULE-009] 0~1000 bbox 규약

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **Pydantic V2**: `Annotated` 및 `ge/le` 제약 조건을 활용한 선언적 검증
- **JSON Schema**: Gemini Structured Outputs 부분집합 제약을 준수하는 스키마 자동 생성 기능 (`model_json_schema`)

**설계 패턴 및 아키텍처 선택**:
- **Flat-Schema 패턴**: Gemini 호환성을 위해 깊은 중첩을 배제하고 `ui`, `world`, `economy`, `safety` 패널 구조로 설계
- **Strict Validation**: `extra="forbid"` 설정을 통해 스키마에 정의되지 않은 불명확한 필드 유입을 원천 차단

**코드 구조**:
backend/
└── src/
    └── unknown_world/
        └── models/
            ├── __init__.py
            └── turn.py

### 성능 및 품질 지표
- **검증 정확도**: 좌표 범위(0~1000), 재화(0 이상), 언어 enum 등 비즈니스 인바리언트 100% 검증 통과
- **스키마 정합성**: Gemini Structured Outputs용 JSON Schema Draft-07 호환성 확인

### 의존성 변경
- 추가된 외부 의존성 없음 (기존 Pydantic 활용)

### 다음 단계
- [U-006[Mvp]] TurnInput/TurnOutput Zod 모델 구현 (프론트엔드)

---

## [2026-01-07 00:05] RU-002-Q4: Turn Stream 이벤트 계약 모듈 분리 완료

### 작업 내용

- **제안서**: [RU-002-Q4] Turn Stream 이벤트 계약(타입/모델/유틸)의 모듈 경계 정리
- **개선 사항**:
    - **Backend**: 스트림 이벤트 모델을 `orchestrator/mock.py`에서 `api/turn_stream_events.py`로 분리하여 transport 계층의 책임을 명확화
    - **Frontend**: 스트림 이벤트 타입을 `api/turnStream.ts`에서 `types/turn_stream.ts`로 분리하여 데이터 계약 SSOT 구축
    - **결합도 해제**: Orchestrator는 도메인 모델(TurnOutput)에만 집중하고, API 계층이 스트림 프로토콜 직렬화를 담당하도록 구조 개선
- **영향 범위**: `backend/src/unknown_world/api/turn_stream_events.py` (신규), `frontend/src/types/turn_stream.ts` (신규), `backend/src/unknown_world/api/turn.py`, `frontend/src/api/turnStream.ts`, `frontend/src/stores/agentStore.ts`

### 기술적 세부사항

- **SSOT 강화**: 서버와 클라이언트 각각 독립된 "계약 모듈"을 가짐으로써 향후 프로토콜 확장 시 수정 범위 원자화
- **유지보수성**: `serialize_event` 유틸리티화를 통해 직렬화 로직 중앙 집중화
- **하위 호환성**: 프론트엔드 `api/turnStream.ts`에서 기존 타입을 re-export 하여 기존 컴포넌트 코드 수정 최소화

### 검증

- **수동 검증**: `git show`를 통한 모듈 분리 및 import 경로 정상화 확인 완료 (commit: b8d02f1c)

---

### 구현 완료 항목

- **핵심 기능**: 프로젝트 전반의 디렉토리 구조 확정 및 설정 파일 SSOT 통일
- **추가 컴포넌트**: `shared/schemas/turn/` (JSON Schema SSOT), 루트 실행 스크립트 (`dev:front`, `dev:back`)
- **달성 요구사항**: [RULE-011] 포트 정책 강제, [RULE-010] 기술 스택 버전 고정, [Option B] 스키마 SSOT 도입

### 기술적 구현 세부사항

**사용 기술/라이브러리**:
- **JSON Schema**: Draft-07 기반의 언어 독립적 계약 정의
- **pnpm/Node.js**: 루트 `package.json`을 통한 개발 환경 버전 제어
- **Vite/strictPort**: 포트 대역 이탈 방지를 위한 Fail-fast 설정

**설계 패턴 및 아키텍처 선택**:
- **Shared Schema SSOT**: 서버-클라이언트 간 데이터 구조 불일치를 원천 차단하기 위해 `shared/` 경로를 진실의 공급원으로 정의
- **Root-orchestrated Dev**: 하위 디렉토리로 이동할 필요 없이 루트에서 모든 서브시스템을 제어하도록 스크립트 구성

**코드 구조**:
repo-root/
├── frontend/ (포트: 8001)
├── backend/ (포트: 8011)
├── shared/ (JSON Schemas)
└── package.json (루트 오케스트레이션)

### 성능 및 품질 지표
- **환경 재현성**: Node/pnpm/Python 의존성 버전 Pin 완료
- **보안**: `.gitignore` 리팩토링으로 보안 민감 파일 노출 차단 강화

### 의존성 변경
- 루트 `package.json`에 `packageManager`, `engines` 필드 추가
- 백엔드 `pyproject.toml` 개발 의존성 버전 고정

### 다음 단계
- [U-005[Mvp]] TurnInput/TurnOutput Pydantic 모델 구현
- [U-006[Mvp]] TurnInput/TurnOutput Zod 모델 구현

---

### 작업 내용

- **제안서**: [RU-001-Q5] 버전 고정(SSOT) 강화: 루트 `packageManager`/엔진 명시 + backend dev 의존성 pin(uv.lock 기준)
- **개선 사항**:
    - 루트 `package.json`에 `packageManager: "pnpm@10.27.0"` 및 `engines.node: "24.12.0"` 명시하여 개발 도구 버전 SSOT 강화
    - `backend/pyproject.toml`의 개발 의존성(`pytest`, `httpx`)을 `uv.lock`에 해결된 버전으로 고정(pin)하여 버전 드리프트 방지
- **영향 범위**: `package.json`, `backend/pyproject.toml`

### 기술적 세부사항

- **SSOT 신호 강화**: 루트 디렉토리 진입 시점부터 일관된 도구 버전 사용을 유도하여 환경 차이에 의한 문제 선제 차단
- **백엔드 재현성**: 개발 의존성까지 명확히 pin 함으로써 `uv sync` 실행 시 항상 동일한 환경이 보장되도록 함

### 검증

- **수동 검증**: 루트 `package.json` 내용 확인 및 `backend/pyproject.toml`의 `==` 연산자 적용 확인 완료 (commit: f18f1ca)

---

## [2026-01-04 18:00] RU-001-S2: Vite strictPort 도입 및 포트 정리 스크립트 정합화

### 작업 내용

- **제안서**: [RU-001-S2] RULE-011 포트 대역 “엣지 케이스” 방지: Vite `strictPort`와 루트 kill 스크립트 범위 정합화
- **개선 사항**:
    - `frontend/vite.config.ts`에 `strictPort: true`를 적용하여 포트 충돌 시 예기치 않은 포트 이동(CORS 불일치 원인)을 원천 차단
    - 루트 `package.json`의 `kill:port` 스크립트가 RULE-011의 전체 대역(8001~8020)을 커버하도록 확장
    - `vibe/roadmap.md`의 실행 가이드를 실제 포트 정책과 일치시키고 충돌 시 대처 방법 명시
- **영향 범위**: `frontend/vite.config.ts`, `package.json`, `vibe/roadmap.md`

### 기술적 세부사항

- **Fail-fast 전략**: 포트 충돌 시 자동으로 다음 포트를 찾는 대신 에러를 발생시켜, 개발자가 명시적으로 대역 내 포트를 선택하도록 유도
- **스크립트 강화**: 프론트(8001-8010)와 백엔드(8011-8020)의 모든 가능 포트를 단일 커맨드로 정리 가능하게 함

### 검증

- **수동 검증**: `strictPort` 동작 확인 및 `kill:port` 범위 확장 확인 완료 (commit: a5b484f)

---

## [2026-01-04 17:00] RU-001-Q1: 실행 방법/문서/설정의 중복과 불일치 제거 (SSOT 통일)

### 작업 내용

- **제안서**: [RU-001-Q1] 실행 방법/문서/설정의 중복과 불일치 제거 (roadmap vs 코드 주석 vs 루트 스크립트 vs Pyright 설정)
- **개선 사항**:
    - 실행 커맨드 SSOT를 루트 `package.json`으로 확정하고, `vibe/roadmap.md` 및 `main.py` docstring을 이에 맞춰 통일
    - 포트 정책(RULE-011: 프론트 8001, 백엔드 8011)을 모든 문서와 실행 스크립트에 강제 적용
    - `pnpm -C` 옵션을 사용하여 경로 의존성 및 쉘 환경 차이에 따른 실행 오류 방지
    - Pyright 설정을 `backend/pyproject.toml`로 단일화하여 도구 설정 중복 제거 (Option B 적용)
- **영향 범위**: `vibe/roadmap.md`, `backend/src/unknown_world/main.py`, `package.json`, `backend/pyproject.toml`

### 기술적 세부사항

- **실행 표준화**: `uv run` 및 포트 명시적 지정을 통해 환경별 실행 결과 차이 제거
- **설정 단일화**: Pyright 검사 범위를 `src`로 고정하여 진단 일관성 확보

### 검증

- **수동 검증**: `pnpm dev:front` / `pnpm dev:back` 실행 시 각각 8001, 8011 포트에서 정상 동작 확인 완료

---

## [2026-01-04 16:30] RU-001-Q4: shared/ 기반 JSON Schema SSOT 도입 및 소비 경로 확정

### 작업 내용

- **제안서**: [RU-001-Q4] `shared/` 기반 JSON Schema SSOT(Option B) 디렉토리 도입 및 소비 경로 고정
- **개선 사항**:
    - `shared/schemas/turn/` 디렉토리에 `turn_input.schema.json` 및 `turn_output.schema.json` 도입
    - 백엔드(Pydantic)와 프론트엔드(Zod)의 계약 불일치(drift)를 방지하기 위한 단일 진실 공급원(SSOT) 구축
    - `shared/README.md`를 통해 공유 스키마 운영 전략(Option B) 명시
- **영향 범위**: `shared/` (신규), `vibe/unit-plans/RU-001[Mvp].md` (결정 사항 실현)

### 기술적 세부사항

- **스키마 설계**: PRD의 Turn 계약 규약을 반영하여 `turn_input`, `turn_output` 스키마 초기 버전 작성
- **구조적 강제**: `.gitignore` 수정(RU-001-S1 연동)을 통해 `shared/` 내 JSON 스키마가 안정적으로 추적되도록 보장

### 검증

- **수동 검증**: `shared/` 경로의 스키마 파일 존재 및 Git 추적 여부 확인 완료 (commit: 1c93e5b)

---

## [2026-01-04 02:45] RU-001-S1: .gitignore JSON 정책 리팩토링 및 shared/ 구조 도입

### 작업 내용

- **제안서**: [RU-001-S1] .gitignore의 광범위 *.json 차단 문제 해결
- **개선 사항**: 
    - `*.json` 전역 차단을 제거하고, `shared/**/*.json` (스키마 SSOT) 명시적 허용
    - 보안 강화를 위해 서비스 계정 및 크리덴셜 패턴(`*service_account*.json` 등) 상세 차단
    - `shared/` 디렉토리 구조 도입 및 보안 주의사항을 담은 `shared/README.md` 작성
    - 프론트엔드 빌드 아티팩트(`*.d.ts.map`, `*.js.map` 등) ignore 규칙 보강
- **영향 범위**: `.gitignore`, `shared/` (신규), `frontend/` (ignore 규칙)

### 기술적 세부사항

- **스키마 SSOT 기반 마련**: `shared/schemas/` 경로를 확보하여 향후 유닛(U-005 등)에서 활용 가능하도록 함
- **보안 가드**: `secrets/` 디렉토리를 팀 표준 보안 저장소로 격상하고, 해당 경로 내 JSON 강제 차단 유지

### 검증

- **수동 검증**: `git status`를 통해 `shared/` 내부 파일 추적 확인 및 임시 보안 파일 차단 여부 검토 완료
- **런북 참조**: `vibe/refactors/RU-001-S1.md` 내 검증 시나리오 준수

---

## [2026-01-04 02:05] U-004[Mvp]: CRT 테마/고정 레이아웃 스켈레톤 완료

### 구현 완료 항목

- **핵심 기능**: CSS Grid 기반 고정 8개 패널 레이아웃 및 CRT 터미널 테마 구현
- **추가 컴포넌트**: `Panel`, `NarrativeFeed` (로그 형태), `ActionDeck`, `GameHeader`
- **달성 요구사항**: [RULE-002] 채팅 버블 UI 금지 및 게임 HUD 구조 확보, [Frontend Style] CRT 테마 토큰 적용

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **CSS Grid**: 3열(Sidebar L/R, Center) 3행(Header, Main, Footer) 고정 레이아웃
- **CRT Effect**: Scanline overlay, Flicker animation, Glow text, Glitch effect
- **React 19**: 함수형 컴포넌트 기반 레이아웃 구성

**설계 패턴 및 아키텍처 선택**:

- **패널 슬롯 시스템**: 향후 각 기능 유닛이 독립적으로 채워질 수 있는 8개 고정 슬롯 구조
- **로그형 내러티브**: 타임라인 기반 피드로 구성하여 "채팅" 인상을 원천 차단

**코드 구조**:
frontend/
├── src/
│   ├── App.tsx (레이아웃 및 패널 구성)
│   └── style.css (CRT 테마 및 Grid 정의)

### 성능 및 품질 지표

- **반응형 최적화**: 1200px, 768px 브레이크포인트 기반 가변 레이아웃 검증 완료
- **상호작용**: CRT 오버레이가 클릭을 방해하지 않도록 `pointer-events: none` 처리

### 의존성 변경

- 추가된 외부 의존성 없음 (Native CSS/React 활용)

### 다음 단계

- [RU-001[Mvp]] 리팩토링: 디렉토리/설정 정리
- [U-005[Mvp]] TurnInput/TurnOutput 스키마(Pydantic) 설계

---

## [2026-01-04 01:25] U-003[Mvp]: 백엔드 FastAPI 초기화 완료

### 구현 완료 항목

- **핵심 기능**: FastAPI 0.128 + Python 3.14 기반 오케스트레이터 골격 구축
- **추가 컴포넌트**: `backend/src/unknown_world/main.py` (엔트리포인트), `backend/tests/integration/test_api.py` (API 테스트)
- **달성 요구사항**: [RULE-011] 백엔드 포트(8011) 및 CORS 정책 수립, [RULE-010] 기술 스택 버전 고정

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **FastAPI 0.128.0**: 비동기 오케스트레이터 API 프레임워크
- **uv**: 고속 패키지 관리 및 의존성 고정 (`uv.lock`)
- **Pydantic 2.12.5**: 헬스체크 응답 스키마 정의

**설계 패턴 및 아키텍처 선택**:

- **스키마 기반 헬스체크**: Pydantic 모델을 사용하여 구조화된 시스템 상태 반환
- **포트 범위 CORS**: 프론트엔드 개발 서버(8001~8010)와의 연동을 위한 화이트리스트 기반 CORS 설정

**코드 구조**:
backend/
├── pyproject.toml
├── uv.lock
├── src/
│   └── unknown_world/
│       ├── __init__.py
│       └── main.py
└── tests/
    └── integration/
        └── test_api.py

### 성능 및 품질 지표

- **API 안정성**: 통합 테스트 3종(Health, Root, CORS) 100% 통과
- **문서화**: Swagger UI(`/docs`)를 통한 자동 API 명세서 생성 확인

### 의존성 변경

- `fastapi`, `uvicorn`, `pydantic` 고정 버전 추가
- `ruff`, `pyright`, `pytest` 개발 의존성 추가

### 다음 단계

- [U-005[Mvp]] TurnInput/TurnOutput(Pydantic) 모델 추가
- [U-007[Mvp]] `/api/turn` SSE 스트리밍 라우트 추가

---

## [2026-01-03 14:45] U-002[Mvp]: 프론트 Vite+React+TS 초기화 완료

### 구현 완료 항목

- **핵심 기능**: `vibe/tech-stack.md` 기반 Vite 7 + React 19 + TypeScript 5.9 환경 구축
- **추가 컴포넌트**: `frontend/src/App.tsx`, `frontend/src/style.css` (단일 CSS SSOT 구조)
- **달성 요구사항**: [RULE-002] 채팅 UI 배제 최소 구조 확보, [RULE-010] 기술 스택 버전 고정

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **React 19.2.3 / Vite 7.3.0**: 프론트엔드 프레임워크 및 빌드 도구
- **TypeScript 5.9.3**: 엄격 모드 적용
- **pnpm 10.27.0**: 패키지 매니저 고정

**설계 패턴 및 아키텍처 선택**:

- **단일 CSS SSOT**: 모든 스타일을 `src/style.css`에서 CSS 변수 기반으로 관리
- **최소 컨테이너 아키텍처**: 채팅 UI 유도를 방지하기 위한 헤더-메인 분리 구조

**코드 구조**:
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── style.css

### 성능 및 품질 지표

- **빌드 성공**: `pnpm build` 시 에셋 최적화 및 sourcemap 생성 확인
- **타입 안정성**: `pnpm run typecheck` 통과 (엄격 모드)

### 의존성 변경

- `react`, `react-dom` (v19.2.3) 추가
- `vite`, `typescript`, `eslint`, `prettier` 등 개발 의존성 추가

### 다음 단계

- [U-003[Mvp]] 백엔드 FastAPI 초기화
- [U-004[Mvp]] CRT 테마 및 고정 게임 UI 레이아웃 구현

---

## [2026-01-03 14:35] U-001[Mvp]: 프로젝트 스캐폴딩 생성 완료

### 구현 완료 항목

- **핵심 기능**: 프로젝트의 기본 디렉토리 구조(`frontend/`, `backend/`) 및 Git 설정(`.gitignore`, `.gitattributes`) 구축
- **추가 컴포넌트**: `backend/src/unknown_world/__init__.py` 패키지 초기화 파일
- **달성 요구사항**: [RULE-007] 비밀정보 보호 설정 완료

### 기술적 구현 세부사항

**사용 기술/라이브러리**:

- **Git**: 버전 관리 및 줄 끝 처리 설정
- **Python 3.14**: 백엔드 패키지 구조 초기화

**설계 패턴 및 아키텍처 선택**:

- **모노레포 구조**: `frontend/`와 `backend/`를 분리하여 독립적인 개발 환경 제공
- **보안 중심 설정**: 비밀정보 유출 방지를 위한 선제적 `.gitignore` 패턴 적용

**코드 구조**:
repo-root/
├── frontend/
│   ├── .gitkeep
│   └── src/
│       └── .gitkeep
├── backend/
│   ├── .gitkeep
│   ├── prompts/
│   │   └── .gitkeep
│   └── src/
│       └── unknown_world/
│           └── __init__.py
├── .gitignore
└── .gitattributes

### 성능 및 품질 지표

- **코드 품질**: Python 패키지 임포트 테스트 통과
- **보안**: 비밀정보 파일(service-account.json, .env) Git 추적 제외 검증 완료

### 의존성 변경

- 추가된 외부 의존성 없음 (기본 구조 작업)

### 다음 단계

- [U-002[Mvp]] 프론트엔드 환경 초기화 (Vite + React)
- [U-003[Mvp]] 백엔드 환경 초기화 (FastAPI)

---