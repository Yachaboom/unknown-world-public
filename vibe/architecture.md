# Unknown World 아키텍처 가이드

## 1. 시스템 개요

Unknown World는 **Gemini 기반의 에이전트형 세계 엔진**과 멀티모달 파이프라인을 결합한 무한 생성 로그라이크 내러티브 웹게임입니다. 시스템은 상태 기반 오케스트레이터와 고수준 게임 UI로 구성됩니다.

## 프로젝트 구조

### 디렉토리 구조

```text
backend/
├── prompts/
│   ├── image/ (이미지 생성 가이드라인: scene_prompt.ko.md, scene_prompt.en.md)
│   ├── system/ (Game Master 시스템 프롬프트)
│   └── turn/ (턴 출력 제어 지침)
├── src/unknown_world/
│   ├── api/ (엔드포인트 및 스트리밍 헬퍼)
│   ├── config/ (모델 ID/라벨 SSOT)
│   ├── models/ (Pydantic 스키마: turn.py 등)
│   ├── orchestrator/ (7대 단계 파이프라인 및 복구 루프)
│   │   ├── prompt_loader.py (프롬프트 로딩 및 i18n 폴백)
│   │   ├── generate_turn_output.py (시스템 프롬프트 구성 및 통합)
│   │   └── stages/ (Parse, Validate, Plan, Resolve, Render, Verify, Commit)
│   ├── services/ (GenAI 클라이언트, 이미지 생성/후처리)
│   ├── storage/ (로컬/GCS 스토리지 추상화)
│   └── validation/ (비즈니스 룰 및 언어 게이트)
├── tests/ (유닛, 통합, QA 테스트)
├── generated_images/ (생성된 이미지 로컬 저장소)
└── pyproject.toml
frontend/
├── src/
│   ├── api/ (API 클라이언트 및 스트리밍 인터페이스)
│   ├── components/ (게임 UI: ActionDeck, SceneCanvas, Hotspot, AgentConsole 등)
│   ├── data/ (데모 프로필 프리셋)
│   ├── demo/ (테스트용 목 데이터)
│   ├── dnd/ (인벤토리 DnD 타입 및 상수)
│   ├── locales/ (i18n JSON 리소스)
│   ├── save/ (세이브 시스템 및 세션 라이프사이클)
│   ├── schemas/ (Zod 검증 스키마)
│   ├── stores/ (Zustand 상태 관리 슬라이스)
│   ├── styles/ (컴포넌트별 스타일: hotspot.css 등)
│   ├── turn/ (턴 실행 엔진)
│   ├── types/ (공통 타입 정의)
│   └── utils/ (좌표 변환 등 유틸리티)
├── public/ui/ (에셋 매니페스트 및 이미지 리소스)
└── style.css (전역 스타일 및 디자인 토큰)
shared/
└── schemas/turn/ (JSON Schema SSOT)
vibe/
├── unit-plans/ (개발 계획서)
├── unit-results/ (완료 보고서)
├── unit-runbooks/ (실행 가이드 및 런북)
└── ref/ (기술 가이드 및 레퍼런스)
```

### 주요 디렉토리 설명

- `backend/src/unknown_world/orchestrator/`: 게임 마스터의 핵심 추론 및 상태 갱신 로직이 단계별 파이프라인으로 구현되어 있습니다.
- `frontend/src/components/`: RULE-002(채팅 UI 금지)를 준수하는 고정 게임 HUD 컴포넌트(ActionDeck, Inventory, SceneCanvas, Hotspot 등)들이 위치합니다.
- `frontend/src/styles/`: 컴포넌트의 시각적 품질과 테마를 담당하는 CSS 모듈들이 관리됩니다 (U-058 핫스팟 디자인 등).
- `shared/schemas/`: 서버와 클라이언트 간의 데이터 계약을 정의하는 JSON Schema가 관리됩니다.
- `vibe/`: 프로젝트의 비전, 로드맵, 설계 가이드 및 작업 이력을 담은 문서 저장소입니다.
---

## 25. 이미지 생성 지침 통합 및 i18n 정책 (U-061[Mvp])

1. **지침 통합 방식 (Option A)**:
    - **System Prompt Fusion**: `scene_prompt.md`의 가이드라인을 별도 턴 단계로 분리하지 않고, Game Master의 시스템 프롬프트 하단에 `## 이미지 생성 지침` 섹션으로 직접 주입함.
    - **LLM Context Alignment**: LLM이 내러티브 생성 시점부터 이미지 생성에 최적화된 키워드(Cinematic, Dark Fantasy, 16:9 등)를 문맥에 포함하도록 유도하여 `image_job.prompt` 품질을 상향 평준화함.
2. **언어 정합성 및 폴백 (RULE-006)**:
    - **Language Synchronization**: 세션 언어(`ko-KR`, `en-US`)에 따라 자동으로 해당 언어의 지침 파일(`scene_prompt.{lang}.md`)을 로드함.
    - **Safe Fallback**: 특정 언어의 지침 파일이 부재할 경우 기본값인 `ko`(한국어) 지침으로 폴백하여 파이프라인 중단을 방지함.
3. **서비스 레이어 경량화**:
    - **Role Consolidation**: 이미지 프롬프트 생성에 관한 스타일 지침을 오케스트레이터(프롬프트 계층)로 일원화하고, `image_generation.py` 등 서비스 레이어의 하드코딩된 스타일 가이드라인을 제거하여 역할 책임을 분리함.


1. **디자인 테마 (Option C - Magenta)**:
    - **Primary Accent**: 터미널 녹색과 대비되는 `#e040fb` (Magenta) 계열을 강조색으로 사용하여 상호작용 지점을 명확히 함.
    - **Visual Hierarchy**: 중요 정보(핫스팟, 재화)에 마젠타 글로우 효과를 적용하여 가시성 보호 계층 구조를 완성함.
2. **SF UI 디자인 요소 (Option A - Corners)**:
    - **L자 브라켓**: 4개 모서리에 L자형 코너 마커를 배치하여 "GM 타겟팅 시스템"의 미학적 감성을 전달.
    - **Dynamic Feedback**: 호버 시 펄스 애니메이션, 드롭 타겟 진입 시 앰버 색상 점멸 효과를 통해 조작 상태를 직관적으로 피드백함.
3. **렌더링 성능 및 가동성**:
    - **GPU 가속**: `will-change: transform, box-shadow`를 적용하여 다수의 핫스팟이 동시에 애니메이션되어도 프레임 드롭을 최소화함.
    - **Priority Sorting**: 핫스팟 면적 기반 정렬 로직을 통해 작은 오브젝트가 항상 상위에 렌더링되도록 보장하여 클릭 정합성 확보.
4. **모바일 및 접근성 (RULE-011)**:
    - **Touch Target**: 모바일 뷰포트에서 최소 44px의 터치 영역을 보장하고 툴팁 위치를 자동으로 최적화함.
    - **Reduced Motion**: 사용자의 OS 설정에 따라 과도한 점멸 및 이동 애니메이션을 자동으로 비활성화함.

---

## 3. 실행 및 도구 설정 (SSOT)

Unknown World는 환경에 따른 동작 차이를 최소화하기 위해 다음 SSOT 정책을 따릅니다.

1. **실행 커맨드 SSOT**: 루트 `package.json`의 `scripts`.
2. **도구 및 의존성 고정 (Pinning)**: 루트 `package.json` 및 `vibe/tech-stack.md` 기준.
3. **포트 정책 (RULE-011)**: 프론트 8001, 백엔드 8011 기본. `pnpm kill`을 통한 안전한 포트 기반 프로세스 종료.

---

## 4. 핵심 아키텍처 원칙

1. **Stateful Orchestrator**: 월드 상태(WorldState)를 유지하고 갱신하는 시스템.
2. **Structured Turn Contract**: 엄격한 JSON Schema 기반 통신.
3. **Resilient Pipeline (RU-005 / Repair Loop / U-051)**: 
    - **Pipeline SSOT**: 모든 턴 처리는 `orchestrator/pipeline.py`에 정의된 7대 단계를 따름.
    - **Stage Modularity**: 각 단계는 독립된 함수로 모듈화되어 있으며, `PipelineContext`를 통해 상태 전이.
    - **Service Injection (U-051)**: `PipelineContext` 생성 시 `image_generator` 등 핵심 서비스를 주입하거나 자동으로 획득하여 단계 간 서비스 공유.
    - **Conditional Image Generation (U-052)**: 모델의 `image_job` 요청을 경제 잔액, 프롬프트 유효성, `should_generate` 플래그를 기반으로 종합 판정하여 불필요한 비용 및 지연 방지.
    - **Async Data Synchronization (U-053)**: 비동기(`await`) 이미지 생성을 수행하고, 생성된 `image_url` 및 메타데이터를 `TurnOutput` 응답에 원자적으로 동기화하여 프론트엔드에 전달.
    - **Mock/Real Integrated Validation (U-055)**: 개발 모드(Mock)와 실모델 모드(Real) 간의 이미지 파이프라인 동작 일관성을 통합 검증함.
    - **Image Prompt Integration (U-061)**: 시스템 프롬프트에 이미지 가이드라인을 동적으로 삽입하여 LLM의 이미지 프롬프트 생성 품질을 상향 평준화하고 i18n 정합성을 확보함.
    - **Deterministic Diversity (U-048[Mvp])**: Mock 모드에서도 per-turn RNG를 통해 결정적 다양성 확보.
4. **Guaranteed Safe Fallback**: 모든 오류 상황에서 입력 시점의 재화를 보존하는 **안전 폴백 TurnOutput** 생성 보장.
5. **이중 검증**: 서버(Pydantic) 및 클라이언트(Zod)에서 모든 데이터를 전수 검증함.

---

## 9. Economy/재화 관리 정책 (U-014, U-042[Mvp])

1. **거래 장부(Ledger) 시스템 (U-042)**:
    - 모든 재화 변동은 **거래 장부(ko-KR: 거래 장부, en-US: Resource Log)**에 기록됨.
    - 내부 구현 용어는 `ledger`를 유지하되, UI 카피는 게임 친화적인 용어로 통일하여 몰입도 향상.
    - **Option A 정책**: 최근 20개 엔트리만 보관하며, 세션 내에서만 유지됨.
2. **비용 인바리언트 (RULE-005)**:
    - **사전 비용 노출**: 액션 실행 전 예상 비용(`min`, `max`)을 HUD에 표시.
    - **잔액 음수 금지**: 잔액 초과 액션 차단 및 저비용 대안(Alternative) 제안.
3. **가시성 및 식별성 (U-037)**:
    - 재화 데이터는 `critical` 중요도를 부여하여 가독성 보호.

---

## 10. 스트리밍 및 에러 핸들링 정책

- **종료 인바리언트**: 모든 스트림은 정확히 1개의 `final` 이벤트로 종료.
- **연결 상태 복구 (RU-003-S1)**: 스트림 결과에 따른 `connected` 상태 자동 관리.
- **Scene 상태 전이 (RU-003-T1)**: `image_url` 존재 여부에 따른 `sceneState` 자동 결정 (SSOT).
- **Abort(취소) 정책**: 사용자에 의한 중단 시 UI를 안전하게 스트리밍 종료 상태로 복구.

---

## 17. Preflight 및 모델 관리 정책 (U-045[Mvp])

1. **서버 시작 시 프리플라이트**: `rembg` 및 필수 모델 상태 자동 점검 및 부재 시 다운로드 시도.
2. **Degraded 모드**: 모델 다운로드 실패 시에도 서버 가용성을 유지하며 후처리 기능만 비활성화.
3. **런타임 가드**: 대용량 다운로드에 의한 런타임 지연 원천 차단.

---

## 18. Scanner 및 멀티모달 조작 정책 (U-022[Mvp])

1. **Scanner 슬롯 아키텍처**: 이미지 업로드 → 비전 분석 → 상태 머신(`uploading`~`result`) 관리.
2. **아이템화 정책 (Option B)**: 분석 결과를 사용자가 선택하여 인벤토리에 추가 (의도적 통제권).
3. **이미지 임시 저장 (RU-006-S1)**: 디버깅 목적으로 `.data/images/uploaded/`에 선택적 저장 지원.
4. **좌표 규약 준수**: 모든 분석 결과의 `box_2d`는 0~1000 정규화 좌표계 유지.

---

## 11. 세션 및 세이브 관리 정책 (U-015, U-041[Mvp])

1. **SaveGame 마이그레이션 (U-041)**:
    - **Version-First**: 버전 식별 후 순차적 마이그레이션 체인 실행.
    - **데이터 보정**: 필드 오타 수정 및 누락 필드 기본값 주입으로 무결성 보장.
2. **복원 정합성 (RU-004)**: 비동기 언어 로딩 대기 및 거래 장부 스냅샷 주입을 통한 완벽한 상태 복구.

---

## 15. 프롬프트 관리 및 i18n 정책 (U-036, U-046[Mvp])

1. **프롬프트 외부화**: 핵심 프롬프트를 `.md` 파일로 분리 관리 (SSOT).
2. **XML 태그 규격 (U-046)**: `<prompt_meta>` 및 `<prompt_body>` 태그 도입으로 구조화 및 오염 방지.
3. **개발 모드 핫리로드**: 파일 수정 시 서버 재시작 없이 즉시 반영.

---

## 16. 세션 언어 SSOT 및 i18n 정책 (U-044[Mvp])

1. **세션 언어 SSOT**: `SaveGame.language`를 유일한 권위자로 설정.
2. **언어 전환 정책 (토글 = 리셋)**: 혼합 출력 방지를 위해 플레이 중 언어 변경 시 세션 리셋 강제.
3. **클라이언트 에러 i18n**: 하드코딩된 영문 에러 메시지를 완전히 제거하고 i18n 엔진에 통합.

---

## 19. 레이아웃 및 스크롤 정책 (U-049[Mvp])

1. **컬럼 스크롤 차단 (Isolation)**: `.sidebar-left`, `.sidebar-right` 등 메인 컬럼은 `overflow: hidden`으로 고정하여 "전체 스크롤" 발생을 억제.
2. **패널 내부 스크롤 (Content-first)**: 스크롤은 반드시 `.panel-content` 또는 특정 리스트 영역(`.ledger-list`, `.narrative-list`) 내부에서만 발생하도록 제한.
3. **Flexbox 하위 스크롤 보장**: 컨테이너가 자식의 높이에 맞춰 늘어나지 않도록 `min-height: 0`을 명시적으로 적용하여 내부 스크롤 기반 확보.
4. **동적 뷰포트 최적화**: `100dvh`를 활용하여 모바일 주소창 등에 의한 불필요한 첫 화면 스크롤 제거.
5. **자동 스크롤 (Auto-focus)**: 거래 장부(Economy HUD) 등 실시간 데이터 누적 영역은 최신 항목이 보이도록 하단 자동 스크롤(`useRef`/`useEffect`) 적용.

---

## 20. 이미지 파이프라인 및 조건부 생성 정책 (U-052[Mvp])

1. **조건부 생성 판정 (Conditional Logic)**:
    - **플래그 검증**: `image_job.should_generate`가 `true`일 때만 생성 프로세스 진입.
    - **프롬프트 가드**: 모델이 플래그를 `true`로 주더라도 프롬프트가 비어있거나 공백만 있는 경우 생성을 차단하여 API 오류 방지.
2. **이미지 생성 비용 정책 (RULE-005)**:
    - **고정 비용**: MVP 기준 이미지 생성 1회당 **10 Signal** 고정 비용 부과 (Option A).
    - **잔액 검증**: 현재 잔액(`economy_snapshot.signal`)이 생성 비용보다 적을 경우 생성을 거부하고 텍스트-only 폴백으로 전환.
3. **프롬프트 보안 및 로깅 (RULE-007)**:
    - **해시 로깅**: 프롬프트 원문을 로그에 남기지 않으며, SHA-256 해시의 앞 8자리를 사용하여 추적성 확보.
4. **언어별 폴백 메시지 (RULE-006)**:
    - 잔액 부족으로 생성 실패 시 세션 언어(`ko-KR`/`en-US`)에 맞는 안내 메시지를 제공.

---

## 21. 비동기 이미지 생성 및 데이터 동기화 정책 (U-053[Mvp])

1. **비동기 생성 파이프라인**:
    - **Non-blocking Flow**: 내러티브 결정 후 `render_stage`에서 비동기(`await`)로 이미지 생성을 수행하여 텍스트 스트리밍 품질 유지.
    - **Service Integration**: 주입된 `ImageGenerator` 인터페이스를 통해 실제/모의 이미지 생성 요청을 처리.
2. **응답 데이터 동기화 (Option A)**:
    - **Atomic Schema Update**: Pydantic의 `model_copy(update=...)`를 활용하여 생성된 `image_url`, `image_id`, `generation_time_ms` 등의 메타데이터를 `TurnOutput` 객체에 직접 주입.
    - **Frontend Connection**: 프론트엔드의 `SceneCanvas`가 즉시 소비할 수 있도록 서빙 가능한 정적 URL(`STATIC_URL_PREFIX`) 형식으로 제공.
3. **로깅 및 가시성 (RULE-007, RULE-008)**:
    - **보안 로깅**: 프롬프트 원문 대신 해시를 로그에 남기고, 생성 소요 시간 및 성공 여부를 기록하여 운영 가시성 확보.
---

## 22. 이미지 생성 폴백 및 실패 복구 정책 (U-054[Mvp])

1. **실패 내성 구조 (Fault Tolerance)**:
    - **RULE-004 준수**: 이미지 생성 중 발생하는 모든 예외(`TimeoutError`, `ValueError`, `API Error` 등)를 포착하여 시스템 중단 없이 텍스트-only 모드로 즉시 전이.
    - **재시도 최소화 (Option A)**: 지연 시간 단축을 위해 이미지 실패 시 재시도 없이 즉시 폴백 수행 (Retry Count: 0).
2. **안전 차단(Safety Blocked) 대응**:
    - **키워드 기반 감지**: 응답 메시지 내 "safety", "blocked", "policy" 등 키워드 포함 여부로 차단 여부 판별.
    - **상태 동기화**: 차단 감지 시 `TurnOutput.safety.blocked`를 `true`로 설정하고, 언어별 안전 안내 메시지 제공.
3. **배지 및 가시성 연동**:
    - **Badges SSOT**: 안전 차단 시 기존 `SAFETY_OK` 배지를 제거하고 `SAFETY_BLOCKED` 배지를 즉시 반영하여 Agent Console에 시스템 증거 노출.
4. **다국어 폴백 메시지 (RULE-006)**:
    - 실패 유형(일반 실패, 안전 차단, 잔액 부족)에 따라 `ko-KR`/`en-US` 언어 정책에 정렬된 전용 메시지 템플릿 사용.

---

## 23. 이미지 파이프라인 통합 및 검증 정책 (U-055[Mvp])

1. **모드별 동작 일관성 (Mock/Real SSOT)**:
    - **Mock 모드**: 개발 생산성을 위해 로컬 플레이스홀더 이미지를 생성하며, 30% 확률로 생성 판정을 시뮬레이션하여 프론트엔드 렌더링 루프를 검증함.
    - **Real 모드**: Vertex AI 기반 실제 Gemini 이미지 생성을 수행하며, TTFB(2s 이내) 및 전체 생성 시간(15s 이내) 지표를 관리함.
2. **통합 검증 가드레일**:
    - **UW_MODE 환경변수**: 백엔드 시작 시 `UW_MODE` 값을 통해 오케스트레이터 및 이미지 생성기 구현체를 원자적으로 교체함.
    - **End-to-End 가시성**: 턴 요청부터 이미지 렌더링까지의 전 과정을 Agent Console의 단계(Queue) 및 배지(Badges) 시스템을 통해 관측 가능하게 유지함.
3. **폴백 및 예외 통합**:
    - 이미지 생성 성공 여부와 관계없이 턴 자체는 항상 성공적으로 완료되어야 하며, 실패 시 UI는 즉시 텍스트 전용 모드로 전이되어야 함.
