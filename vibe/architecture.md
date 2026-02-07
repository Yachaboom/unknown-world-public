# Unknown World 아키텍처 가이드

## 1. 시스템 개요

Unknown World는 **Gemini 기반의 에이전트형 세계 엔진**과 멀티모달 파이프라인을 결합한 무한 생성 로그라이크 내러티브 웹게임입니다. 시스템은 상태 기반 오케스트레이터와 고수준 게임 UI로 구성됩니다.

## 프로젝트 구조

### 디렉토리 구조

```text
backend/prompts/image/scene_prompt.en.md
backend/prompts/image/scene_prompt.ko.md
backend/prompts/system/game_master.en.md
backend/prompts/system/game_master.ko.md
backend/prompts/turn/turn_output_instructions.en.md
backend/prompts/turn/turn_output_instructions.ko.md
backend/prompts/vision/scene_affordances.en.md
backend/prompts/vision/scene_affordances.ko.md
backend/src/unknown_world/api/image.py
backend/src/unknown_world/api/item_icon.py
backend/src/unknown_world/api/scanner.py
backend/src/unknown_world/api/turn_stream_events.py
backend/src/unknown_world/api/turn_streaming_helpers.py
backend/src/unknown_world/api/turn.py
backend/src/unknown_world/config/economy.py
backend/src/unknown_world/config/models.py
backend/src/unknown_world/main.py
backend/src/unknown_world/models/scanner.py
backend/src/unknown_world/models/turn.py
backend/src/unknown_world/orchestrator/fallback.py
backend/src/unknown_world/orchestrator/generate_turn_output.py
backend/src/unknown_world/orchestrator/mock.py
backend/src/unknown_world/orchestrator/pipeline.py
backend/src/unknown_world/orchestrator/prompt_loader.py
backend/src/unknown_world/orchestrator/repair_loop.py
backend/src/unknown_world/orchestrator/stages/commit.py
backend/src/unknown_world/orchestrator/stages/parse.py
backend/src/unknown_world/orchestrator/stages/plan.py
backend/src/unknown_world/orchestrator/stages/render_helpers.py
backend/src/unknown_world/orchestrator/stages/render.py
backend/src/unknown_world/orchestrator/stages/resolve.py
backend/src/unknown_world/orchestrator/stages/types.py
backend/src/unknown_world/orchestrator/stages/validate.py
backend/src/unknown_world/orchestrator/stages/verify.py
backend/src/unknown_world/services/agentic_vision.py
backend/src/unknown_world/services/genai_client.py
backend/src/unknown_world/services/image_generation.py
backend/src/unknown_world/services/image_understanding.py
backend/src/unknown_world/services/item_icon_generator.py
backend/src/unknown_world/storage/local_storage.py
backend/src/unknown_world/storage/paths.py
backend/src/unknown_world/storage/storage.py
backend/src/unknown_world/storage/validation.py
backend/src/unknown_world/validation/business_rules.py
backend/src/unknown_world/validation/language_gate.py
backend/tests/unit/orchestrator/test_u090_hotspot_restriction.py
frontend/public/ui/items/
frontend/public/ui/manifest.json
frontend/src/App.tsx (사이드바 패널 flex-1 레이아웃 적용)
frontend/src/main.tsx
frontend/src/api/turnStream.ts
frontend/src/components/ActionDeck.tsx
frontend/src/components/AgentConsole.tsx (접힘/펼침 토글 구현)
frontend/src/components/EconomyHud.tsx (재화 잔액/아이콘 확대 반영)
frontend/src/components/InventoryPanel.tsx
frontend/src/components/NarrativeFeed.tsx
frontend/src/components/ObjectiveTracker.tsx
frontend/src/components/QuestPanel.tsx
frontend/src/components/RuleBoard.tsx
frontend/src/components/ScannerSlot.tsx
frontend/src/components/SceneCanvas.tsx
frontend/src/components/SceneImage.tsx
frontend/src/components/Hotspot.tsx
frontend/src/components/InteractionHint.tsx
frontend/src/components/OnboardingGuide.tsx
frontend/src/locales/ko-KR/translation.json
frontend/src/locales/en-US/translation.json
frontend/src/data/demoProfiles.ts
frontend/src/data/itemIconPresets.ts
frontend/src/save/sessionLifecycle.ts
frontend/src/save/saveGame.ts
frontend/src/save/migrations.ts
frontend/src/save/constants.ts
frontend/src/schemas/turn.ts
frontend/src/stores/worldStore.ts
frontend/src/stores/economyStore.ts
frontend/src/stores/agentStore.ts
frontend/src/stores/actionDeckStore.ts
frontend/src/stores/inventoryStore.ts
frontend/src/stores/onboardingStore.ts
frontend/src/turn/turnRunner.ts
shared/schemas/turn/turn_output.schema.json
scripts/process_item_icons.py
vibe/unit-results/U-082.md
vibe/unit-results/U-083[Mvp].md
vibe/unit-results/U-088[Mvp].md
vibe/unit-results/U-094[Mvp].md
vibe/unit-results/U-095[Mvp].md
vibe/unit-results/U-096[Mvp].md
```

### 주요 디렉토리 설명

- `backend/src/unknown_world/orchestrator/`: 게임 마스터의 핵심 추론 및 상태 갱신 로직이 단계별 파이프라인으로 구현되어 있습니다.
- `backend/src/unknown_world/services/`: GenAI 클라이언트, 이미지 생성/편집, 비전 분석(`agentic_vision.py`), 아이콘 생성 등 핵심 외부 연동 서비스들이 위치합니다.
- `backend/prompts/`: XML 규격(`prompt_meta`, `prompt_body`)을 따르는 시스템/내러티브/비전 프롬프트 파일들이 관리됩니다.
- `frontend/src/components/`: RULE-002(채팅 UI 금지)를 준수하는 고정 게임 HUD 컴포넌트(ActionDeck, Inventory, SceneCanvas, Hotspot 등)들이 위치합니다.
- `frontend/src/stores/`: Zustand 기반의 전역 상태 관리 레이어로, 월드 데이터(`world`), 재화(`economy`), 인벤토리(`inventory`), 에이전트 진행(`agent`), 온보딩 및 힌트(`onboarding`) 상태를 도메인별로 격리하여 관리합니다.
- `frontend/public/ui/items/`: nanobanana-mcp로 제작된 초기/공통 아이템 아이콘(64x64 PNG) 에셋들이 위치합니다.
- `shared/schemas/`: 서버와 클라이언트 간의 데이터 계약을 정의하는 JSON Schema가 관리됩니다.

---

## 51. Agent Console 축소 및 재화 현황 확대 (U-082[Mvp])

1. **사이드바 레이아웃 비율 조정 (Flex-based Allocation)**:
    - **UI Hierarchy**: 게임의 핵심 동력인 재화(Economy) 상태를 최상위 정보로 격상함. `App.tsx`에서 `EconomyHud` 컴포넌트에 `flex-1`을 부여하여 사이드바의 남은 공간을 우선적으로 점유하게 함.
    - **Compact Agent Console**: 관측 가능성(Observability) 증거인 Plan/Queue 영역을 기본적으로 접힌(`collapsed`) 상태로 제공하여 화면 복잡도를 낮추고 핵심 게임 UI에 집중할 수 있도록 개선함.
2. **Economy HUD 시인성 강화**:
    - **Large Scale Visuals**: 재화 잔액 숫자를 1.25rem(20px)으로 확대하고, Signal/Shard 아이콘을 28px로 키워 플레이어가 현재 자원을 직관적으로 인지할 수 있도록 함.
    - **Layout Normalization**: 확대된 요소들이 CRT 패널 경계를 벗어나지 않도록 `style.css`에서 여백 및 정렬 로직을 재조정함.
3. **상태 기반 접힘 로직 (Toggleable Console)**:
    - **Persistent Badges**: 콘솔이 접힌 상태에서도 `Schema OK`, `Economy OK` 등의 배지(Badges)는 상시 노출하여 오케스트레이션 투명성을 유지함.
    - **Smooth Transition**: CSS 애니메이션을 통해 접힘/펼침 상태 전환을 자연스럽게 처리하고, `localStorage`를 통해 사용자의 마지막 상태를 선호도에 따라 유지 가능하게 함.

---

## 52. 액션 카드 대안 뱃지 레이아웃 안정화 (U-083[Mvp])

1. **뱃지 레이아웃 구조 개선 (Separate Badge Row)**:
    - **Relocation**: 뱃지들을 기존 `absolute` 위치에서 비용 표시 행 아래의 **독립된 Flex 행**(`.action-card-badges`)으로 이동함.
    - **Overlap Prevention**: 이를 통해 긴 뱃지 이름이 비용 아이콘이나 카드 제목을 가리는 현상을 원천적으로 방지함.
2. **뱃지 노출 정책 및 오버플로 제어 (Overflow Management)**:
    - **MAX_VISIBLE_BADGES**: 카드당 최대 **2개**의 뱃지만 직접 노출하는 정책을 도입함.
    - **+N Badge**: 2개를 초과하는 뱃지는 `+N` 형태의 오버플로 뱃지로 통합 표시하며, 마우스 호버 시 `title` 속성을 통해 전체 목록을 툴팁으로 제공함.
    - **Ellipsis & Tooltip**: 각 뱃지에 `max-width: 90px`와 `text-overflow: ellipsis`를 적용하여 긴 텍스트(예: "저해상도 대안")가 레이아웃을 깨지 않도록 보호함.
3. **카드 높이 불변성 유지 (Fixed Height Invariant)**:
    - **Flex Alignment**: 카드 내 타이틀 영역(`action-card-title`)에 `flex: 1`을 적용하여, 하단 뱃지 행의 존재 유무나 개수(0~2개)와 상관없이 모든 액션 카드의 전체 높이가 일정하게 유지되도록 설계함.
    - **UI Stability**: 3~6장의 카드가 나열되는 Action Deck에서 특정 카드가 튀어 보이거나 레이아웃이 출렁이는 문제를 해결하여 "고정 게임 UI" 사양을 충족함.

    ---

## 46. ImageUnderstanding 응답 파싱 예외 시 자동 재시도 (U-094[Mvp])

1. **비전 파이프라인 Repair Loop**:
    - **Retry Logic**: `ImageUnderstandingService`에서 비전 모델 응답 파싱 실패 시 최대 **2회 자동 재시도**(총 3회 시도)를 수행함.
    - **Exponential Backoff**: 재시도 간 1.0초, 2.0초의 지수 백오프를 적용하여 모델 및 네트워크 일시적 오류에 대응함.
2. **프롬프트 보정 및 강화 (Option B)**:
    - **Reinforcement Prompt**: 재시도 시 "유효한 JSON 형식으로만 응답하라"는 마크다운 제거 지시어(`SCAN_RETRY_REINFORCEMENT`)를 프롬프트에 동적으로 결합하여 모델의 출력 형식을 강제함.
3. **스마트 예외 판별 및 폴백 (RULE-004)**:
    - **Retry Filter**: 안전 차단(Safety Block), 인증 실패(401), 할당량 초과(429) 등 재시도가 불필요한 케이스는 즉시 폴백하여 지연을 최소화함.
    - **Safe Fallback**: 모든 재시도 실패 시 i18n 대응된 에러 메시지와 함께 빈 아이템 목록을 포함한 표준 `ScanResult`를 반환하여 프론트엔드 렌더링 안정성을 확보함.
4. **관측 가능성 및 로깅 (RULE-007)**:
    - **Execution Trace**: 각 시도 횟수와 실패 사유를 서버 로그에 기록하여 비전 파이프라인의 성능과 안정성을 모니터링함.

---

## 47. Scanner 아이템 생성 개수 랜덤화 정책 (U-095[Mvp])

1. **아이템 발견 개수 결정 (서버측 확정 랜덤)**:
    - **Deterministic Count**: `ImageUnderstandingService.analyze()` 호출 시 서버에서 먼저 가중치 랜덤을 통해 발견될 아이템 수(1~3개)를 확정함.
    - **Probability Distribution**: 1개(60%), 2개(30%), 3개(10%)의 가중치를 적용하여 다중 아이템 발견의 희소성을 보장함.
2. **동적 프롬프트 지시 (U-095)**:
    - **Strict Instruction**: 프롬프트의 `{count}` 플레이스홀더를 확정된 숫자로 치환하여 모델이 정확히 지시된 개수의 아이템을 추출하도록 강제함.
3. **결과 보정 및 정제 (Post-processing)**:
    - **Adjust Item Count**: 모델이 지시보다 많은 아이템을 반환할 경우 앞에서부터 슬라이싱하며, 중복된 이름(`label`)을 가진 아이템은 자동 제거하여 결과 품질을 유지함.
4. **발견 개수별 피드백 UX**:
    - **Dynamic Discovery Message**: 발견된 아이템 수에 따라 프론트엔드에서 "아이템을 발견했습니다!", "두 가지를 발견했습니다!", "세 가지를 발견했습니다! 대단한 발견이네요!" 등 차별화된 피드백을 제공하여 게임플레이 재미를 강화함.

---

## 48. 아이템 사용 시 소비(삭제) 로직 (U-096[Mvp])

1. **GM 아이템 소비 판정 규칙**:
    - **소모품 vs 도구**: GM은 아이템의 성격에 따라 `inventory_removed` 포함 여부를 결정함. 열쇠, 포션, 폭탄 등 1회성 아이템은 소모품으로 분류하여 사용 후 삭제함.
    - **수량 기반 소비**: 스택형 아이템의 경우 ID가 포함될 때마다 수량이 1씩 감소하며, 수량이 0이 될 때만 인벤토리에서 완전히 제거됨.
2. **프론트엔드 애니메이션 파이프라인**:
    - **Two-stage Removal**: 시각적 인지 품질을 위해 `markConsuming` 액션으로 Magenta 테마의 fade-out 애니메이션을 먼저 트리거함.
    - **Delayed State Update**: 500ms(CSS Transition) 대기 후 `clearConsuming`을 통해 실제 데이터를 상태에서 제거하여 조작의 연속성과 시각적 피드백을 일치시킴.
3. **턴 결과 동기화 (worldStore)**:
    - **Atomic Application**: `applyTurnOutput` 단계에서 인벤토리 추가(`inventory_added`)와 삭제(`inventory_removed`)를 원자적으로 처리하여 서버와 클라이언트 간의 상태 정합성을 100% 유지함.

---

## 49. 게임 목표 시스템 강화 (U-078[Mvp])

1. **주 목표 및 서브 목표 이원화 (Dual Objective)**:
    - **Main Objective**: `is_main: true` 플래그가 설정된 목표를 주 목표로 정의함. Quest 패널 상단에 강조 표시되며, 전용 진행률 바(0~100%)와 보상 정보를 가시화하여 플레이어의 최종 목적지를 명확히 함.
    - **Sub-objectives**: 부가적인 과업들을 체크리스트 형태로 관리하며, 완료 시 취소선 및 보상 획득 완료 메시지를 통해 중간 성취감을 제공함.
2. **ObjectiveTracker (HUD 미니 트래커)**:
    - **Persistent Visibility**: 화면 상단 중앙(`game-center` 영역)에 고정된 HUD 요소를 통해 주 목표 제목과 서브 목표 달성 카운트(`n/m`)를 상시 노출함.
    - **Auto-Hide Policy**: 목표가 부여되지 않은 "자유 탐색" 상태에서는 UI를 자동으로 숨겨 Scene Canvas의 개방감을 확보함.
3. **보상 피드백 루프 (Reward Notification)**:
    - **System Narrative Integration**: 목표 달성 시 `worldStore`가 이를 감지하여 `🎯 목표 달성! [보상] 시그널 획득` 메시지를 내러티브 피드에 시스템 유형으로 자동 삽입함.
    - **Visual Feedback**: 마젠타 강조색과 L자 브래켓 디자인을 적용하여 CRT 테마의 일관성을 유지하면서도 중요 정보를 효과적으로 전달함.
1. **프리셋 아이콘 레지스트리 (Static Assets)**:
    - **Asset Library**: 데모 프로필 초기 아이템 및 자주 등장하는 공통 아이템 30종에 대해 사전 제작된 64x64 픽셀 아트 아이콘을 `frontend/public/ui/items/`에 배치함.
    - **Registry Mapping**: 아이템 ID와 에셋 경로를 1:1로 매핑하는 `itemIconPresets.ts`를 통해 클라이언트 사이드에서 즉시 조회 가능하도록 함.
2. **프리셋 우선순위 및 동적 생성 회피**:
    - **Bypass Logic**: 아이템이 인벤토리에 추가될 때 프리셋 레지스트리를 먼저 확인하여, 프리셋이 존재하면 동적 생성 API(`requestItemIcon`) 호출을 건너뛰고 정적 에셋을 즉시 사용함.
    - **Immediate Visuals**: 이를 통해 게임 시작 시점(데모 첫 화면)에서 "아이콘 없음" 또는 "placeholder" 상태 없이 완성된 시각적 품질을 보장함 (지연 시간 0ms).
3. **데모 프로필 연동 (SSOT)**:
    - **SaveGame Injection**: `demoProfiles.ts`에서 각 프로필의 초기 아이템 `icon` 필드에 프리셋 경로를 직접 주입하여, 세션 부팅 시점부터 아이콘이 완벽히 정합된 상태로 시작됨.
4. **에셋 후처리 파이프라인 (Dev-only)**:
    - **Batch Processing**: nanobanana-mcp로 제작된 원본 이미지를 `process_item_icons.py` 스크립트를 통해 배경 제거 및 규격화(64x64) 처리하여 배포 용량을 최적화함.

---

## 40. "정밀분석" Agentic Vision 분석 및 핫스팟 추가 (U-076[Mvp])

1. **정밀분석 파이프라인 (Agentic Vision)**:
    - **Trigger**: Scene 이미지가 존재할 때 Action Deck에 표시되는 "정밀분석" 카드 클릭 시 실행됩니다.
    - **Vision Analysis**: `gemini-3-flash-preview` 모델과 `code_execution` 도구를 사용하여 현재 이미지에서 클릭 가능한 오브젝트(affordances)를 분석합니다.
    - **Structured Result**: 분석 결과는 `0~1000` 정규화 좌표(`[ymin, xmin, ymax, xmax]`)를 포함한 JSON 형식으로 추출됩니다.
2. **오케스트레이터 및 UI 통합**:
    - **Resolve Stage Extension**: `ResolveStage`에서 정밀분석 트리거를 감지하고 `AgenticVisionService`를 호출하여 결과를 `TurnOutput.ui.objects`에 병합합니다.
    - **Narrative Enhancement**: 분석 성공 시 "장면을 자세히 살펴보니..."와 같이 발견된 오브젝트를 설명하는 내러티브가 동적으로 추가됩니다.
    - **Vision-specific UI**: Action Deck에서 전용 배지(🔍 VISION), 시안(Cyan) 테두리, 그리고 **1.5x 비용 배수** 표기를 통해 일반 액션과 시각적으로 구분됩니다.
3. **비용 및 정책 (RULE-005, RULE-009)**:
    - **Cost Policy**: 고성능 비전 모델 사용에 따라 일반 턴보다 높은 **1.5x Signal 비용**을 부과합니다.
    - **Fallback Policy**: 분석 실패 또는 이미지 부재 시 안전한 폴백 내러티브를 제공하고 기존 상태를 유지하여 게임 흐름을 보호합니다.

---

## 41. 인벤토리 스크롤 및 사이드바 영역 분배 (U-077[Mvp])

1. **사이드바 레이아웃 전략 (U-081 흡수)**:
    - **Panel Isolation**: 사이드바의 각 패널(Inventory, Quest, Rule Board)을 독립된 flex 자식으로 구성하고, 패널 간의 간섭을 최소화함.
    - **Inventory Protection**: `min-height: 120px`와 `flex-shrink: 0`을 적용하여 대량의 퀘스트나 규칙이 추가되어도 인벤토리 가시성을 절대적으로 보장함.
    - **Quest/Rule Constraint**: `max-height: 200px` 및 내부 스크롤을 적용하여 사이드바가 무한히 확장되는 것을 방지함.
2. **인벤토리 UX 및 스크롤 (U-077)**:
    - **Internal Scroll**: `.inventory-panel-content` 영역에 `overflow-y: auto`를 적용하여 수백 개의 아이템이 있어도 패널 내부에서만 스크롤이 발생하도록 설계함.
    - **Scrollbar Aesthetics (Option C)**: 게임의 몰입감을 위해 스크롤바를 시각적으로 숨기고(scrollbar-width: none), 마우스 휠 및 터치 조작만 허용함.
    - **Dynamic Header**: `inventoryStore`의 `selectItemCount`를 구독하여 헤더 타이틀에 `(n)` 형식의 아이템 개수를 동적으로 표시함.
3. **빈 상태(Empty State) 디자인**:
    - **Semantic Hint**: 아이템이 0개일 때 단순 텍스트가 아닌, 게임 진행을 유도하는 힌트("장면을 탐색하여 아이템을 찾으세요")를 제공하여 UX 연속성을 확보함.

---

## 31. 참조 이미지 기반 연결성 강화 (U-068[Mvp])

1. **시각적 일관성 확보 (Reference Image)**:
    - **Previous Image Mapping**: 이전 턴에서 성공적으로 생성된 이미지 URL을 프론트엔드 `worldStore`에서 `previousImageUrl`로 유지함.
    - **Contextual Injection**: 다음 턴의 이미지 생성 요청(`ImageJob`) 시, 이 URL을 `reference_image_url` 필드에 포함하여 백엔드로 전달함.
2. **백엔드 참조 처리 파이프라인**:
    - **Image Retrieval**: `image_generation.py` 서비스에서 전달받은 URL(로컬 경로 또는 HTTP)을 통해 이미지를 로드하고 Gemini API 호출에 필요한 형식으로 변환함.
    - **API Integration**: Gemini 3 모델의 `image_reference` 매개변수를 사용하여 이전 장면의 스타일, 캐릭터, 조명을 현재 생성할 이미지의 기초로 활용하도록 지시함.
3. **연결성 모니터링 및 로깅**:
    - **has_reference 플래그**: 로그 및 에이전트 콘솔 메타데이터에 참조 이미지 사용 여부(`has_reference=True/False`)를 노출하여 파이프라인 동작을 투명하게 확인 가능하도록 함.

---

## 32. API 키 인증 통합 및 Vertex AI 제거 (U-080[Mvp])

1. **인증 단순화 (API Key First)**:
    - **GOOGLE_API_KEY**: 모든 Gemini 기능(텍스트/이미지)을 단일 API 키로 수행하도록 통합.
    - **Vertex AI Removal**: 서비스 계정 키 파일 및 GCP IAM 권한 관리의 복잡도를 제거하여 데모 온보딩 속도를 최적화함.
2. **서비스 통합 (google-genai)**:
    - **Unified Client**: `genai_client.py`에서 `google.genai.Client(api_key=...)`를 통해 텍스트와 이미지 생성 서비스를 모두 처리함.
    - **Mock Fallback**: 인증 정보 미설정 시에도 `MockGenAIClient`로 자동 전이되어 시스템 기동성을 사수함.
3. **환경 변수 보안 (RULE-007)**:
    - API 키는 `.env` 및 환경 변수로만 관리하며, 코드나 로그에는 절대 노출되지 않도록 마스킹 처리함.

---

## 33. 텍스트 생성 모델 티어링 (U-069[Mvp])

1. **모델 라인업 및 티어링 (Tiering Logic)**:
    - **FAST (Default)**: 빠른 응답을 위해 `gemini-3-flash-preview` 모델을 기본으로 사용함.
    - **QUALITY (Triggered)**: 정밀한 묘사나 조사가 필요할 때 `gemini-3-pro-preview` 모델로 자동 전환함.
2. **모델 전환 트리거 (Trigger Mechanism)**:
    - **Action ID Trigger**: Action Deck에서 `deep_investigate`, `analyze` 등 조사를 암시하는 액션 선택 시 작동.
    - **Keyword Trigger**: 사용자 입력 텍스트에 "정밀조사", "자세히", "thoroughly" 등 트리거 키워드가 포함될 때 작동.
3. **비용 및 UI 정책**:
    - **2x Cost Multiplier**: QUALITY 모델 사용 시 기본 생성 비용의 2배(2x)를 차감하여 경제적 밸런싱 유지.
    - **Visual Evidence**: Agent Console에 현재 사용 중인 모델 라벨(`⚡ FAST` / `★ QUALITY`)을 표시하고, Action Deck의 대상 카드에 `QUALITY` 배지와 `x2` 비용을 명시하여 관측 가능성 확보.

---

## 34. 사용자 행동 로그 시스템 (U-070[Mvp])

1. **즉각적 피드백 루프 (Local Execution)**:
    - **Client-Side Generation**: 서버 응답을 기다리지 않고 조작 직후 클라이언트에서 로그를 생성하여 시스템의 기민함(Snappiness)을 증명함.
    - **Event Integration**: 액션 카드 클릭, 핫스팟 클릭, 아이템 드래그 앤 드롭 등 모든 주요 인터랙션에 대해 로그를 배출함.
2. **행동 로그 규격 (PRD 9.0)**:
    - **Semantic Template**: `"행동 실행: {조작대상}..."` 형식을 고수하여 단순 채팅 대화가 아닌 게임 시스템의 처리 결과임을 명시함.
    - **Visual Hierarchy**: 이탤릭체, 흐린 녹색(dim), `▶` 아이콘을 사용하여 내러티브(GM의 말)와 플레이어의 행동을 명확히 대조함.
3. **상태 영속성 및 i18n**:
    - **Snapshot Preservation**: 생성된 로그는 `NarrativeEntry`의 일부로 저장되어 새로고침 후에도 플레이어의 과거 행동 궤적을 보존함.
    - **Dual-Language Policy**: 세션 언어에 따라 실시간으로 언어를 전환하여 혼합 출력을 방지함.

---

## 35. Scene 처리중 UI 로딩 인디케이터 강화 (U-071[Mvp])

1. **처리 단계별 가시성 확보 (Phase-based UI)**:
    - **processingPhase 인식**: `processing`(장면 생성), `image_pending`(이미지 형성), `rendering` 등 시스템 처리 단계를 Scene Canvas UI에 즉각 반영함.
    - **Option C 정책 (State Transition)**: 처리 중일 때 이전 이미지를 숨기고 placeholder 상태로 전환하여 "현재 세계가 갱신 중임"을 명확히 전달함.
2. **CRT 테마 로딩 오버레이**:
    - **Visual Effects**: 스피너 애니메이션, 글로우 효과, 스캔라인 오버레이를 결합하여 게임의 CRT 미학을 유지하면서도 시스템 활동을 증명함.
    - **Status Messaging**: 다국어 지원(`ko`/`en`)을 통해 "장면 생성 중...", "이미지 형성 중..." 등 구체적인 단계 메시지를 출력함.
3. **접근성 및 안정성**:
    - **Reduced Motion Support**: `prefers-reduced-motion` 감지 시 모든 애니메이션을 정적 상태로 전환하여 가독성을 보호함.
    - **Fail-safe Cleanup**: 에러 발생이나 턴 종료 시 `idle` 상태로 자동 복구되어 인터랙션 차단을 방지함.

---

## 36. Scanner 의미론적 사용 유도 UX (U-072[Mvp])

1. **발견성 강화 (Affordance & Onboarding)**:
    - **Visual Onboarding**: 첫 방문 사용자에게 화살표(▼)와 말풍선 형태의 시각적 가이드를 제공하여 "이미지 드래그" 조작을 유도함.
    - **Persistent State**: `localStorage`(`uw_scanner_onboarding_done`)를 사용하여 온보딩 완료 여부를 영구 저장하고 반복 노출을 방지함.
    - **Idle Affordance**: Scanner가 대기 상태일 때 "이미지 → 아이템" 힌트 텍스트와 글로우 애니메이션을 통해 기능의 시맨틱을 전달함.
2. **상호작용 피드백 (Tooltip & Drag)**:
    - **Contextual Tooltip**: 마우스 호버 시 Scanner의 역할(현실 사진의 아이템 변환)을 구체적으로 설명하는 CRT 테마 툴팁을 표시함.
    - **Dynamic Affordance**: 이미지 드래그 오버 시 텍스트를 "여기에 놓으세요!"로 전환하고 강조색(Accent)을 적용하여 즉각적인 조작 피드백을 제공함.
3. **접근성 및 안정성**:
    - **Layout Stability**: 텍스트 전환 시 `visibility: hidden` 정책을 사용하여 레이아웃 시프트(Layout Shift)를 방지함.
    - **Accessibility First**: 키보드 포커스(Tab) 및 실행(Enter/Space)을 지원하며, `prefers-reduced-motion` 감지 시 모든 UX 애니메이션을 정적 상태로 완화함.

---

## 37. 레이아웃 확장 및 와이드스크린 대응 (U-073[Mvp])

1. **와이드스크린 최적화 (Layout Expansion)**:
    - **Max-Width 1800px**: 게임 컨테이너의 최대 너비를 1800px로 상향하여 대형 모니터에서의 정보 밀도 및 시각적 여유를 확보함.
    - **Flexible Side Panels**: 사이드 패널에 `minmax(280px, 380px~420px)` 기반의 유연한 너비를 적용하여 화면 크기에 따라 패널이 자연스럽게 확장되도록 함.
2. **게임 테마 강화 (CRT Aesthetics)**:
    - **Grid Decoration**: 게임 컨테이너 외부의 좌우 빈공간에 수직/수평 스캔라인 및 미세 도트 패턴을 결합한 CRT 그리드 패턴을 적용하여 프로젝트의 레트로 미학을 게임 영역 밖으로 확장함.
    - **Visual Separation**: 게임 영역과 장식 영역을 배경색(`bg-color`) 및 테두리를 통해 명확히 구분하여 플레이 집중도를 유지함.
3. **Scene Canvas 비율 고정 (Consistency)**:
    - **4:3 Aspect Ratio**: Scene Canvas를 모든 해상도에서 4:3 비율로 고정하여 이미지 왜곡을 방지하고, 하단 내러티브 로그 영역의 공간을 안정적으로 확보함.
4. **반응형 브레이크포인트 최적화**:
    - **Adaptive Layout**: 1920px(Wide), 1366px(Normal), 1024px(Compact), 768px(Mobile) 단계별 미디어 쿼리를 통해 패널 너비, 간격, 노출 여부를 자동 조정함.
    - **Mobile Single Column**: 모바일 환경에서는 모든 사이드바를 숨기고 헤더-센터-푸터의 단일 컬럼 구조로 전환하여 가독성을 극대화함.

## 38. 핫스팟/아이템 인터랙션 안내 UX (U-074[Mvp])

1. **발견성 강화 (Interaction Hints)**:
    - **Contextual Tooltips**: 핫스팟(클릭) 및 인벤토리 아이템(드래그)에 마우스를 올릴 때 조작법을 안내하는 `InteractionHint`를 노출함.
    - **Learning-based Visibility**: 플레이어가 조작법을 익혔다고 가정하는 임계값(Threshold: 3회)을 설정하여, 초기 학습 후에는 힌트가 자동으로 사라져 시각적 노이즈를 최소화함.
2. **온보딩 가이드 시스템**:
    - **Step-by-Step Popups**: 첫 세션 시작 시 화면 우하단에 핫스팟, 인벤토리, 스캐너의 사용법을 순차적으로 안내하는 3단계 가이드를 제공함.
    - **Persistent Knowledge**: 온보딩 완료 상태를 `onboardingStore`와 `localStorage`를 통해 영구 저장하여 재접속 시 중복 노출을 방지함.
3. **접근성 및 디자인**:
    - **SVG Visuals**: 별도의 이미지 에셋 없이 인라인 SVG 아이콘을 사용하여 클릭/드래그 행위를 직관적으로 시각화함.
    - **Keyboard Accessibility**: ESC(스킵), Enter/Space(다음) 단축키를 지원하여 가이드 조작 편의성을 확보함.
    
    ---
    
## 39. 인벤토리 아이템 아이콘 동적 생성 및 안정화 (U-075, U-093)

1. **아이콘 생성 파이프라인 (Backend)**:
    - **Description-based Generation**: 아이템 설명을 기반으로 `IMAGE_FAST` 모델(gemini-2.5-flash-image)을 호출하여 64x64 픽셀 아트 아이콘을 생성함.
    - **Simple Background Policy (U-091)**: 런타임 지연 최소화를 위해 rembg 배경 제거를 생략하며, 대신 프롬프트를 통해 "투명/단색 배경"을 유도하여 시각적 조화를 유지함.
    - **Language Consistency**: 아이템 이름이 세션 언어와 일치하도록 프롬프트를 제어하여 다국어 환경에서의 정합성을 보장함.
2. **타임아웃 상향 및 자동 재시도 (U-093)**:
    - **Timeout Extension**: 네트워크 및 서버 지연에 대응하기 위해 생성 타임아웃을 30초에서 **90초**로 상향 조정함.
    - **Exponential Backoff Retry**: 타임아웃 또는 서버 에러 발생 시 **최대 1회 자동 재시도**(총 2회 시도)를 수행하며, 재시도 간 2초 기반의 지수 백오프를 적용함.
    - **Retry Filter**: Quota 초과, Safety 차단 등 복구 불가능한 에러는 재시도 대상에서 제외하여 불필요한 비용 발생을 방지함.
3. **효율적 캐싱 및 비동기 처리**:
    - **MD5 Hash Caching**: 아이템 설명의 MD5 해시를 캐시 키로 사용하여 동일한 아이템에 대한 중복 생성을 방지하고 응답 속도를 극대화함.
    - **Option B Policy (Background Gen)**: 턴 응답 시에는 placeholder(📦)를 먼저 반환하고, 실제 아이콘은 백그라운드에서 비동기로 생성하여 텍스트 TTFB를 보호함.
4. **인벤토리 UI 동기화 (Frontend)**:
    - **Dynamic Icon URL**: `inventoryStore`에서 아이템별 `icon_url`을 관리하며, 백엔드로부터 생성 완료 신호를 받거나 폴링을 통해 실제 아이콘으로 교체함.
    - **Visual Feedback**: 아이콘 생성 중에는 스캔라인 애니메이션 및 로딩 상태를 표시하여 시스템의 활동성을 체감하게 함.
    
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
    - **Async Data Synchronization (U-053)**: 비동기(`await`) 이미지 생성을 수행하고, 생성된 `image_url` 및 메타데이터를 `TurnOutput` 객체에 직접 주입.
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

## 42. 인벤토리 UI Row 형태 전환 (U-088[Mvp])

1. **Row 기반 리스트 레이아웃 (Q1, Q2)**:
    - **Grid-to-Row**: 인벤토리 아이템을 그리드 형태에서 48px 높이의 Row 형태로 전환하여 좁은 공간에서도 텍스트 정보를 효과적으로 표시함.
    - **Visual Separation**: Row 간 미세한 구분선(border-bottom)과 짝수 행에 적용된 미묘한 배경색 차이(Zebra striping)를 통해 시각적 피로도를 낮추고 아이템 식별성을 높임.
2. **아이콘 전용 드래그 핸들 (Q4 Option B)**:
    - **Interaction Isolation**: 드래그 리스너(`listeners`, `attributes`)를 행 전체가 아닌 좌측의 **32px 아이콘 영역**에만 바인딩함.
    - **Conflict Resolution**: 이를 통해 행 클릭(아이템 선택)과 드래그 조작 간의 충돌을 방지하고, 명확한 조작 핸들을 제공하여 사용자 실수(Fat Finger)를 예방함.
3. **컴팩트 드래그 오버레이**:
    - **Scene Visibility**: 드래그 중인 오버레이는 행 전체가 아닌 아이콘(40px 박스)만 표시하도록 구성하여, 아이템을 핫스팟으로 옮기는 동안 장면(Scene) 이미지를 가리지 않도록 최적화함.
4. **상태 강조 및 가독성 (Q3, U-056)**:
    - **Magenta Selection**: 선택된 아이템 행 좌측에 3px 마젠타 강조선(`box-shadow`)을 적용하여 현재 조작 대상을 명확히 함.
    - **Ellipsis & Tooltip**: 긴 아이템 이름은 `ellipsis`로 처리하되, `title` 속성을 통한 네이티브 툴팁으로 전체 이름과 수량 정보를 보존함.

---

## 17. 런타임 최적화 및 프리플라이트 정책 (U-091[Mvp])

1. **런타임 rembg 제거**: 서버 부팅 지연(100~200MB 모델 체크) 및 런타임 복잡도를 줄이기 위해 배경 제거 파이프라인을 런타임에서 일괄 제거함.
2. **즉시 기동 아키텍처**: 필수적인 GenAI 클라이언트 가용성만 확인하고, 모델 다운로드와 같은 중량 작업을 배제하여 서버 시작 시간을 즉시(1초 이내) 완료 수준으로 단축함.
3. **Dev-only 전처리**: 배경 제거가 필요한 에셋(UI 아이콘, 프레임 등)은 개발 시점(nanobanana-mcp)에 미리 처리하여 정적 파일로 서빙함.

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

## 19. 레이아웃 및 스크롤 정책 (U-049, U-073[Mvp])

1. **컬럼 스크롤 차단 (Isolation)**: `.sidebar-left`, `.sidebar-right` 등 메인 컬럼은 `overflow: hidden`으로 고정하여 "전체 스크롤" 발생을 억제.
2. **패널 내부 스크롤 (Content-first)**: 스크롤은 반드시 `.panel-content` 또는 특정 리스트 영역(`.ledger-list`, `.narrative-list`) 내부에서만 발생하도록 제한.
3. **Flexbox 하위 스크롤 보장**: 컨테이너가 자식의 높이에 맞춰 늘어나지 않도록 `min-height: 0`을 명시적으로 적용하여 내부 스크롤 기반 확보.
4. **와이드스크린 확장 (U-073)**: 최대 너비를 1800px로 상향하고, 사이드 패널에 유연한 너비(`minmax`)를 적용하여 넓은 화면을 효율적으로 활용.
5. **장식용 배경 패턴 (U-073)**: 레이아웃 외부 영역에 CRT 그리드 패턴을 적용하여 게임 HUD로서의 분위기를 강화.
6. **동적 뷰포트 최적화**: `100dvh`를 활용하여 모바일 주소창 등에 의한 불필요한 첫 화면 스크롤 제거.
7. **자동 스크롤 (Auto-focus)**: 거래 장부(Economy HUD) 등 실시간 데이터 누적 영역은 최신 항목이 보이도록 하단 자동 스크롤(`useRef`/`useEffect`) 적용.

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

## 28. Gemini 이미지 생성 API 호출 최적화 (U-064[Mvp])

1. **API 호출 방식 전환 (generate_content)**:
    - **Model Compatibility**: `gemini-3-pro-image-preview` 모델의 특성에 맞춰 `generate_images()` 대신 `generate_content()` 메서드를 사용하도록 파이프라인을 수정함.
    - **Multimodal Configuration**: `GenerateContentConfig`를 통해 `TEXT`와 `IMAGE` 모달리티를 동시에 요청하여 모델의 추론(Thinking) 과정과 결과 이미지를 모두 수신할 수 있도록 구성함.
2. **멀티모달 응답 파싱 및 이미지 추출**:
    - **Part-based Extraction**: 모델의 응답 파트(`candidates[0].content.parts`)를 순회하며 `inline_data`가 포함된 파트를 식별하여 이미지 바이트를 추출하는 방어적 파싱 로직을 구현함.
    - **Base64 Decoding**: API로부터 수신된 base64 인코딩 데이터를 디코딩하여 로컬 파일 시스템에 PNG로 저장함.
3. **타임아웃 및 예외 정책 (RULE-004)**:
    - **Increased Timeout**: 이미지 생성의 높은 연산 비용을 고려하여 API 호출 타임아웃을 **60초**로 상향 조정함.
    - **Graceful Fallback**: 타임아웃 또는 API 에러 발생 시 시스템 중단 없이 안전 폴백(`create_fallback_response`)을 통해 텍스트 전용 모드로 전이되도록 보장함.

## 29. TurnOutput 스키마 단순화 및 Gemini 제한 대응 (U-065[Mvp])

1. **스키마 복잡도 최적화 (Option A - 필드 축소)**:
    - **Controlled Generation 제한 대응**: Gemini API의 "too many states" 400 에러를 해결하기 위해 `ActionCard` 및 `TurnOutput` 스키마에서 중복되거나 후순위인 필드(`description`, `hint`, `cost_estimate` 등)를 제거함.
    - **Narrative 중심 정보 통합**: 제거된 필드의 시맨틱 정보는 `narrative` 필드 내에서 자연어로 표현하도록 유도하여 정보 손실을 최소화함.
2. **배열 크기 및 제약 조건 강화 (Hard Limits)**:
    - **Array Size Reduction**: `ActionCard` 목록을 최대 5개로 제한하고, `objects`, `hotspots`, `inventory_added` 등 모든 리스트 필드에 엄격한 `max_length` (3~5) 제약을 적용함.
    - **String Length Optimization**: `narrative` 및 주요 텍스트 필드의 최대 길이를 조정하여 Gemini API의 상태 머신 복잡도를 Serving 가능한 수준으로 낮춤.
3. **서버-클라이언트 스키마 동기화 (Pydantic & Zod)**:
    - **Double Validation Alignment**: 백엔드의 Pydantic 모델 변경사항을 프론트엔드의 Zod 스키마에 즉시 반영하여 데이터 정합성 유지.
    - **UI Interaction Compatibility**: 제거된 필드(`cost_estimate` 등)를 참조하던 UI 컴포넌트(`ActionDeck.tsx`)와 스토어 로직을 새로운 단일 필드(`cost`) 체계로 전환함.

---

## 30. 이미지 생성 지연 흡수 및 Late-binding 정책 (U-066[Mvp])

1. **지연 시간 흡수 UX (Time-buying Strategy)**:
    - **Variable CPS Typewriter**: 내러티브 텍스트 노출 시 가변 CPS(Characters Per Second) 엔진을 적용함. 스트리밍 중이거나 이미지 로딩 중일 때 속도를 늦춰(최소 CPS 3) 시스템 지연을 내러티브 연출로 승화함.
    - **Fast-forward Mechanism**: 클릭/Enter/Space 입력 시 타이핑을 즉시 중단하고 전체 텍스트를 노출하여 UX 편의성을 보장함.
2. **비동기 Late-binding 파이프라인**:
    - **Non-blocking Response**: 텍스트 턴 응답(`onFinal`) 수신 직후 텍스트를 즉시 렌더링하고, 이미지 생성은 비동기 잡(`image_job`)으로 분리하여 실행함.
    - **Revision Guard**: `turn_id` 기반의 late-binding 가드를 구현하여, 이전 턴의 이미지가 뒤늦게 도착했을 때 현재 장면(Scene)을 덮어쓰지 않도록 원천 차단함.
3. **모델 티어링 (FAST/QUALITY)**:
    - **Tiered Generation**: `model_label` 파라미터를 통해 `gemini-2.5-flash-image`(FAST, 저지연)와 `gemini-3-pro-image-preview`(QUALITY, 고품질) 모델을 선택적으로 호출 가능한 구조 구축.
    - **Fallback Policy**: 로딩 중에는 이전 이미지를 유지(Option A)하고 로딩 인디케이터를 표시하며, 생성 실패 시 안전하게 이전 장면으로 수렴함.

---

## 42. 정밀분석 UX 핫픽스 및 이미지 유지 (U-089[Mvp])



1. **분석 중 이미지 보존 정책 (Persistent Scene)**:

    - **isAnalyzing 상태**: `worldStore`에 도입된 `isAnalyzing` 플래그를 통해 정밀분석 실행 중임을 전역적으로 식별함.

    - **UI 분기 (SceneImage)**: 일반 턴 처리(`processingPhase`)와 달리, `isAnalyzing`이 `true`일 때는 기존 이미지를 숨기지 않고 `0.5 opacity`와 **시안(Cyan) 틴트**를 적용하여 배경으로 유지함.

2. **정밀분석 전용 오버레이 UX**:

    - **Visual Distinction**: 기존의 원형 스피너 로딩(U-071) 대신, 화면 전체를 위에서 아래로 훑는 **스캔라인 스윕(Scanline Sweep)** 애니메이션과 시안색 글로우 라벨을 적용하여 "분석 작업"임을 시각화함.

    - **깜빡임 방지 (Minimum Display)**: 분석이 매우 빠르게 완료되더라도 최소 500ms 동안 오버레이를 유지하여 UX 안정성을 확보함.

3. **트리거 감지 및 수명 주기**:

    - **Trigger Mirroring**: 백엔드의 정밀분석 트리거 로직(Action ID/Keywords)을 프론트엔드 `turnRunner.ts`에 미러링하여 클라이언트 사이드에서 즉시 분석 상태로 진입함.

    - **Auto-Reset**: 턴 완료(`Complete`) 또는 에러(`Error`) 발생 시 `isAnalyzing` 상태를 자동으로 해제하여 인터랙션 잠금을 방지함.



---



## 43. 핫스팟 생성 정밀분석 전용 제한 (U-090[Mvp])



1. **서버 측 생성 제한 및 필터링 (Hard Gate)**:

    - **Resolve Stage Filter**: 정밀분석(`Agentic Vision`) 액션이 아닌 일반 턴에서 GM이 생성한 `ui.objects`를 서버 파이프라인(`resolve.py`)에서 강제로 비움(`[]`).

    - **Verify Stage Guard**: 비즈니스 룰 검증 단계(`verify.py`)에서 핫스팟 누출을 최종 감지하여 제거하는 이중 안전장치를 구축함.

2. **프론트엔드 지능형 상태 관리**:

    - **Auto-Initialization**: 새 이미지가 생성되는 턴(장면 전환)에서 기존 핫스팟을 자동으로 초기화하여 이미지-핫스팟 불일치를 원천 차단함.

    - **Incremental Merge**: 정밀분석 결과 수신 시 기존 핫스팟과 새 결과를 ID 기준으로 병합하여 플레이어의 다단계 탐색을 지원함.

    - **Persistence Policy**: 일반 턴에서는 이전 정밀분석 결과를 그대로 유지하여 연속적인 게임 경험을 제공함.

---

## 44. 런타임 rembg 파이프라인 일괄 제거 (U-091[Mvp])

1. **런타임 의존성 제거**:
    - **rembg Package**: `pyproject.toml`에서 rembg 패키지를 런타임 의존성에서 제외하여 서버 바이너리 크기 및 시작 복잡도를 감소시킴.
    - **Preflight Removal**: 서버 startup 시점에 수행되던 모델 다운로드/점검 로직을 완전히 제거하여 부팅 시간을 획득함.
2. **파이프라인 단순화 (Simplified Pipeline)**:
    - **Image/Icon Workflow**: 이미지 및 아이콘 생성 단계에서 `image_postprocess.py` 호출을 제거하고, 모델이 생성한 원본 바이트를 즉시 저장하도록 경로를 단축함.
    - **Prompt-based Optimization**: 배경 제거 단계가 사라짐에 따라, 아이콘 생성 프롬프트를 "단순 배경" 스타일로 고도화하여 시각적 정합성을 보완함.
3. **스키마 및 가시성 정제**:
    - **Field Pruning**: `TurnOutput` 및 `ImageJob` 등에서 `remove_background`, `background_removed` 등 불필요해진 제어 플래그를 서버/클라이언트 양측에서 제거함.
    - **Health Monitoring**: `/health` 엔드포인트에서 rembg 관련 상태 필드를 제거하여 시스템 헬스 체크의 핵심 가용성 집중도를 높임.

---

## 50. 재화 부족 시 이미지 생성 허용 및 획득 경로 다양화 (U-079[Mvp])

1. **경제 정책 완화 및 FAST 폴백 (Graceful Degradation)**:
    - **Low Balance Detection**: 플레이어의 Signal 잔액이 이미지 생성 비용(10)보다 적을 때 `LOW_BALANCE` 상태로 정의함.
    - **Automatic Fallback**: 잔액 부족 시 이미지 생성을 차단하는 대신, **FAST 모델**(gemini-2.5-flash-image)로 자동 전환하고 생성 비용을 **0 Signal**로 오버라이드하여 게임 연속성을 보장함.
    - **Visual Feedback**: Economy HUD 및 이미지 로딩 오버레이에 "잔액 부족으로 기본 품질(FAST) 이미지를 무료로 생성합니다" 안내를 표시하여 유저 인지 강화.
2. **아이템 판매 시스템 (Currency Recovery)**:
    - **Inventory Liquidation**: 인벤토리의 모든 아이템에 "판매(Sell)" 버튼을 추가하여 즉시 Signal로 환전할 수 있는 기능 구현.
    - **Standard Pricing**: MVP 단계에서는 모든 아이템의 판매 가격을 **5 Signal**로 고정하고, 판매 시 전용 토스트 알림 및 거래 장부 기록을 제공함.
3. **재화 획득 액션 카드 및 GM 지침**:
    - **Earn-prefixed Actions**: GM이 `earn_` 접두사가 붙은 액션 카드(예: `earn_search`, `earn_rest`)를 생성할 경우, Action Deck에서 금색 테두리와 "⚡ Signal 획득" 배지를 적용하여 강조함.
    - **Contextual Hints**: 잔액이 매우 낮을 때 GM이 내러티브를 통해 아이템 판매나 탐색 등 재화 획득 경로를 자연스럽게 힌트로 제공하도록 프롬프트 지침을 강화함.
4. **상태 관리 및 영속성**:
    - **isLowBalance 플래그**: `economyStore`에서 실시간 잔액을 감시하여 UI 경고 상태를 관리하며, 세이브 데이터(`SaveGame`)에 판매 기록 및 잔액 변화를 영속화함.
