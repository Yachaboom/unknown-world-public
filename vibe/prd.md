# [Unknown World] PRD

## 1. 제품 개요

### 1.1 한 줄 소개

**Unknown World**는 Gemini 기반의 **에이전트형(Game Master) 세계 엔진**과 멀티모달(텍스트·이미지·비전) 파이프라인을 결합한 **무한 생성 로그라이크 내러티브 웹게임**입니다.

### 1.2 제품 설명

- 정해진 시나리오/스크립트/엔딩이 없고, 플레이어의 **자연어 입력 + 화면 오브젝트 클릭**에 따라 세계관과 규칙이 실시간으로 갱신됩니다.
- 텍스트는 **스트리밍(타자 효과)**로 즉시 반응하고, 이미지는 필요 시점에 **선택적으로 생성/편집**되어 몰입감을 강화합니다.
- AI가 내러티브만 말하는 것이 아니라, **UI(선택지/오브젝트/좌표)**를 구조화하여 “플레이 가능한 화면”을 만듭니다.

### 1.3 목표

- **고충실도(high-fidelity) 멀티모달 앱**: 단순 채팅 래퍼가 아닌, UI·상태·경제·세이브·엔딩까지 갖춘 완성형 경험.
- **에이전트형 오케스트레이션**: 입력 해석 → 상태 갱신 → UI 생성 → (조건부) 이미지 생성/편집 → 검증/복구까지 자동 수행.
- **무한 리플레이성**: 매 세션마다 장르·시대·물리 법칙이 달라지고, 플레이 로그 기반으로 고유 엔딩이 생성됨.

## 2. 프로젝트 방향성 (Standard Guide 반영)

### 2.1 “Prompt-only wrapper / Generic chatbot” 회피 원칙

- **한 번의 프롬프트로 끝나는 앱을 만들지 않는다.**
- 게임은 “대화”가 아니라 **상태를 가진 시스템**이며, 다음 요소가 반드시 존재해야 한다:
  - **상태(state)**: WorldState / Inventory / Rules / Economy / History
  - **오케스트레이터(orchestrator)**: 다단계 생성, 검증, 재시도, 비용 제어
  - **아티팩트(artifacts)**: 저장 파일, 엔딩 리포트, 이미지/로그

### 2.2 ‘Action Era’에 맞는 구현 포인트

- **장시간 세션(마라톤 플레이)**에서도 일관성을 유지하는 **메모리/요약/중요 설정 고정** 체계를 갖춘다.
- 모델 출력은 **구조화(JSON Schema)**하여 UI/상태/비용을 기계적으로 처리한다.
- 실패/불완전 출력에 대비해 **검증 후 자동 복구(repair loop)** 를 설계한다.

### 2.3 Creative Autopilot 방향(이미지 생성 고품질)

- 이미지 생성은 “그냥 한 장 뽑기”가 아니라:
  - **장면 일관성(캐릭터/오브젝트/톤)** 유지
  - **대화형 편집(멀티턴)** 지원
  - 필요 시 **해상도/비율(1K/2K/4K, 16:9 등)**를 선택

## 3. 지원 범위 및 언어 정책

### 3.1 지원 언어 (✅ 세션 SSOT 구현 완료)

- **한국어(ko-KR), 영어(en-US)** 2개 국어 지원.
- UI 텍스트, 시스템 메시지, 게임 내 내러티브/선택지/오브젝트 라벨까지 동일 정책 적용.
- (MVP) **언어 전환 정책**: 기본은 “시작 시 언어 선택”이며, 플레이 중 언어 변경은 기존 월드/로그를 즉시 번역하지 않는다. 혼합 출력 방지를 위해 언어 변경은 **세션 리셋(새 시작)** 으로만 적용한다. ✅ (U-044)

### 3.2 프롬프트/출력 언어 설계 원칙 (✅ 기반 디렉토리 생성 완료)

- 모든 핵심 프롬프트는 **백엔드의 별도 `.md` 파일**로 관리한다.
- 언어별로 프롬프트를 분리하고(권장), 턴 입력에 `language`를 포함하여 응답도 동일 언어로 고정한다(혼합 출력 방지).
- 프롬프트 로더는 `language` 파라미터에 따라 올바른 파일을 로드하며, 개발 모드에서는 **핫리로드**를 지원한다.

예시 디렉토리(개념):

- `backend/prompts/system/game_master.ko.md` - 시스템 프롬프트(한국어)
- `backend/prompts/system/game_master.en.md` - 시스템 프롬프트(영어)
- `backend/prompts/turn/turn_output_instructions.ko.md` - 턴 출력 지시(한국어)
- `backend/prompts/turn/turn_output_instructions.en.md` - 턴 출력 지시(영어)
- `backend/prompts/image/scene_prompt.ko.md` - 이미지 생성 프롬프트(한국어)
- `backend/prompts/image/scene_prompt.en.md` - 이미지 생성 프롬프트(영어)

**프롬프트 관리 원칙**:

- 코드 하드코딩 금지: 모든 핵심 프롬프트는 `.md` 파일에서 로드한다.
- 편집 용이성: 마크다운 형식으로 작성하되, 렌더링 없이 텍스트 그대로 모델에 전달된다.
- 포맷 전환 금지(MVP): 분리 프롬프트 파일을 `.json` 등으로 바꾸지 않으며, 모델 입력은 **텍스트(.md)** 기반으로 유지한다.
- 구조/메타 표준화(MVP): 분리 프롬프트 `.md`는 **XML 태그 기반 블록**으로 메타/섹션 구분을 통일한다. (예: `<prompt_meta>...</prompt_meta>`, `<prompt_body>...</prompt_body>`)
- 버전 관리: `prompt_version`, `policy_preset` 등 메타는 `<prompt_meta>` 내에 기록한다. (레거시: 기존 `- key: value` 스타일은 호환을 위해 유지 가능)
- 핫리로드: 개발 모드에서 서버 재시작 없이 프롬프트 변경이 반영된다.

### 3.3 UI/System i18n 리소스 파일 구조 (JSON, 확장 가능)

- UI 텍스트/시스템 메시지는 **i18next 기반**으로 관리하며, 언어 리소스는 **JSON 파일**로 분리한다.
- 권장 디렉토리(SSOT, 예시):
  - `frontend/src/locales/ko-KR/translation.json`
  - `frontend/src/locales/en-US/translation.json`
- 모든 사용자 노출 문자열은 가능한 범위에서 **키 기반(`t('...')`)** 으로 참조하고, 하드코딩 문자열을 최소화한다. (RULE-006/007 준수)
- 언어 코드는 `TurnInput.language` / `SaveGame.language`와 동일하게 `ko-KR`, `en-US`로 고정하여 UI/내러티브 언어 혼합을 방지한다.
- 금지: 아이콘/이미지에 텍스트를 “박아” 번역을 회피하지 않는다(언어 확장/리사이즈/접근성 문제). 텍스트는 항상 i18n 리소스로 처리한다.

## 4. 사용자 정의

### 4.1 타겟 페르소나

- **The Narrator**: 스토리 참여/몰입 중심
- **The Explorer**: 시스템 실험/창발 플레이 선호
- **The Tech Enthusiast**: 멀티모달·구조화·에이전트 설계에 관심

### 4.2 사용자 니즈

- “내 선택이 세계를 바꾸는” 체감(상태·규칙·시각적 결과로 피드백)
- 엔딩이 요약이 아니라 **플레이 로그 기반 리포트/아트워크**로 남는 경험
- 웹에서 가볍게 시작하되, 깊게 파고들수록 시스템이 열린다(재화/기능 해금)

## 5. 게임 재화(코스트) 시스템 (Frontend 중심)

### 5.1 목적

- **비용(토큰/이미지) 리스크를 게임 메커닉으로 전환**한다.
- 사용자는 “무제한 생성”이 아니라, 재화를 통해 **선택과 전략**을 하게 된다.

### 5.2 재화 정의(예시)

- **Signal(시그널)**: 기본 재화. 텍스트 턴/이미지 생성/고급 기능에 소비.
- **Memory Shard(기억 파편)**: 희귀 재화. “중요 설정 고정”, “룰 고착(고정)”, “고해상도 이미지” 등에 소비.

### 5.3 획득 루프(예시)

- 매 턴 생존/진행/목표 달성으로 Signal 획득
- 엔딩 도달 시 리포트 보상(Signal + Memory Shard)
- 일일 첫 접속 보너스(데모/해커톤 기준 옵션)

### 5.4 소비 정책(예시)

- **텍스트 턴**: 소량(기본)
- **이미지 생성**: 중~대량(장면 생성)
- **이미지 편집(멀티턴 수정)**: 중량(편집 회수/해상도에 비례)
- **Thinking Level High / 장문 요약 / 분석 리포트**: 추가 비용

### 5.5 UX 요구사항

- 행동 전 **예상 비용**(최소/최대)을 보여주고, 부족하면 대체 행동(텍스트만/저해상도)을 제안.
- 재화 소모 로그를 “게임스럽게” 표현(예: “세계 신호가 약해집니다… -12 Signal”).

## 6. 핵심 기능 (MVP)

### 6.1 에이전트형 Game Master 엔진

- 사용자 입력(텍스트/클릭)을 해석해 **WorldState**를 갱신한다.
- 스토리 진행(도입/전개/위기/절정/결말)을 동적으로 관리한다.
- 출력은 “말”이 아니라, **UI/상태/비용을 포함한 구조화 결과**로 반환한다.

### 6.2 구조화 UI 자동 생성(클릭 가능한 세계) (✅ 구현 완료)

- 오브젝트/핫스팟을 좌표로 제공하여, 화면에서 클릭 가능하게 한다. ✅
- 좌표는 **0~1000 정규화 좌표계**를 사용(이미지 이해 bbox 포맷과 호환). ✅

### 6.3 멀티모달 렌더링 파이프라인

- 텍스트 상황 묘사 → (조건부) 이미지 생성/편집 → UI 오버레이(핫스팟) 제공 ✅
- 이미지 생성이 느릴 경우 **텍스트 우선 출력 + Lazy Loading**. ✅ (U-031 Placeholder 적용)
- **오브젝트/아이템 이미지 배경 제거(조건부)**: 투명 합성이 필요한 경우 `rembg`를 사용해 배경을 제거한다. (가이드: `vibe/ref/rembg-guide.md`) ⏸️ (에셋 파이프라인 내 구현됨)
  - (운영/로컬) rembg는 첫 실행 시 모델 다운로드가 발생할 수 있으므로, 서버 부팅 시 **모델 사전 점검/다운로드(preflight)** 로 첫 사용 지연을 턴 경로에서 제거한다.

### 6.4 룰 변형 시스템(Rule Mutation)

- 플레이어 행동/트리거로 장르/물리법칙/메타 룰이 변한다.
- 룰은 WorldState에 명시적으로 기록되어, 다음 턴에 일관되게 적용된다.

### 6.5 동적 엔딩 생성기

- 플레이 로그를 분석해 **요약(텍스트) + 대표 이미지 + 규칙 변화 타임라인**을 생성한다.

### 6.6 세이브/로드

- 세션 상태를 JSON으로 직렬화하여 저장/복원한다.
- 저장에는 WorldState 뿐 아니라 **재화 잔액/소모 로그/언어 설정**을 포함한다.

### 6.7 (데모 표면 핵심) 게임형 조작/피드백 시스템 (✅ UI 스켈레톤 확보)

> 심사자가 UI를 “채팅 앱”으로 오해하지 않도록, 데모에서 아래 조작과 피드백이 **항상 화면에 존재**해야 한다.

- **Action Deck(행동 카드)**: (✅ 레이아웃 확보)
  - 매 턴 AI가 추천 행동을 3~6장 카드로 제시(각 카드에 **Signal/Shard 비용**, 위험/보상 힌트 포함)
  - 사용자는 카드를 클릭해 즉시 실행하거나, 커스텀 입력으로 변형 실행
  - (MMP) **Agentic Vision 기반 행동 근거화(생성 이미지)**:
    - 생성된 Scene Canvas 이미지를 `gemini-3-flash-preview`(Code Execution 활성화)로 “줌/크롭/주석”하며 재검증하여, **장면에 실제로 존재하는 오브젝트/단서/텍스트**를 근거로 행동 카드를 더 구체적/사실적으로 생성한다(환각 감소, 정합성↑).
    - 비전 호출은 비용/지연이 있으므로 Economy HUD에 **예상 비용(최소/최대)** 를 노출하고, 실패/차단 시 기존 텍스트 기반 추천으로 안전 폴백한다. (RULE-004/005)
- **Inventory(인벤토리) + Drag & Drop(드래그 사용)**:
  - 아이템은 슬롯/칩 형태로 상시 표시
  - 아이템을 **장면 오브젝트(핫스팟)**로 드래그해 “사용/조합/해체”를 수행(예: 열쇠 → 자물쇠)
- **Quest/Objective Panel(목표 패널)**:
  - 현재 목표/서브목표를 체크리스트로 표시하고, 완료 시 보상(재화) 즉시 반영
- **Rule Board(룰 보드) & Mutation Timeline(변형 타임라인)**:
  - 현재 적용 중인 규칙/물리 법칙을 “룰 카드”로 노출
  - 룰 변형 이벤트는 타임라인으로 기록되어, “세계가 변했다”가 UI로 체감되게 한다
- **Economy HUD(재화 HUD)**:
  - Signal/Shard 잔액과 이번 행동의 **예상 비용/확정 비용**을 항상 표시(부족 시 대체안 제공)
- **Memory Pin UI(중요 설정 고정)**:
  - “중요 설정 후보”를 칩으로 제시하고, 사용자가 Shard를 소비해 고정(고정된 사실은 상시 HUD에 표시)
- **(멀티모달 데모) Scanner 슬롯(이미지 드랍/업로드)**:
  - 사용자가 이미지를 드래그/업로드하면, 이미지 이해(캡션/오브젝트 감지)를 통해 **아이템/단서**로 변환해 인벤토리에 추가하거나 세계에 배치
  - 예: “현실 사진 → 게임 속 ‘부품’ 아이템화”, “스케치 → 오브젝트 생성”

### 6.8 (데모 표면 핵심) 에이전트 동작 가시화(Autopilot / Action Queue / Self-Repair)

> “에이전트형 시스템”이 채팅처럼 보이지 않게 하려면, **결과만 출력**하는 것이 아니라 “계획·실행·검증·복구”의 흔적이 UI에 보여야 한다.  
> 단, **프롬프트/내부 추론(Chain-of-thought)은 노출하지 않고**, 사용자가 이해할 수 있는 **단계/상태/검증 결과**만 표시한다.

- **Autopilot 모드(필수 토글)**:
  - `Manual`(사용자 주도) / `Assist`(추천+경고) / `Autopilot`(목표 기반 자동 실행)
  - Autopilot에서는 사용자가 “목표”만 제시하면 에이전트가 **다단계 플랜을 생성**하고 작업을 진행한다(사용자는 언제든지 Pause/Cancel).
- **Goal → Plan → Subquests(계획의 시각화)**:
  - 사용자가 입력한 목표를 **플랜 카드**로 구조화해 보여주고,
  - 플랜은 Quest 패널에 **서브퀘스트/체크리스트**로 자동 반영된다(완료 시 보상/상태 변화 즉시 표시).
- **Action Queue(작업 큐) + 진행률 UI**:
  - 한 턴(또는 자동 실행 구간) 안에서 에이전트가 수행하는 단계들을 큐로 표시한다.
  - 예시 단계: `Parse` → `Validate` → `Plan` → `Resolve` → `Render` → `Verify` → `Commit`
  - 각 단계는 소요시간/비용/성공 여부를 배지로 표시(심사자가 “오케스트레이션”을 직관적으로 인지).
- **Self-Repair(자동 복구) 트레이스**:
  - 스키마 검증 실패, 비용 초과, 안전 차단, 이미지 생성 실패 등 발생 시
  - `Auto-repair #1/#2...` 처럼 재시도 횟수/결과를 표시하고, 최종적으로 “안전한 대체 결과”를 제공한다.
- **검증 배지(Proof of System)**:
  - 턴 결과에 대해 최소 다음 배지를 제공: `Schema OK`, `Economy OK`, `Safety OK`, `Consistency OK`
  - 실패 배지는 붉은 경고로 표시하고, 자동 복구/대체안으로 이어지게 한다.
- **모델/품질 선택의 “라벨” 표시(프롬프트 노출 없이)**:
  - 텍스트/이미지 호출 시 “왜 이 선택이었는지”를 사용자 친화 라벨로 표시:
    - 예: `FAST`(저지연), `QUALITY`(고품질), `CHEAP`(저비용), `REF`(참조 이미지 유지)
  - “model id” 자체를 노출해도 되지만, 심사자 관점에서는 “자동 선택/비용 제어”가 더 중요하므로 라벨 우선.
- **Replay & Diff(리플레이/상태 변화 증거)**:
  - 턴 타임라인에서 `WorldState diff`(룰/인벤토리/관계/재화 변화)를 카드로 확인 가능하게 한다.
  - 엔딩 리포트에 “플랜 달성도/서브퀘스트 완료율/룰 변형 타임라인”을 포함한다(아티팩트 강화).

### 6.9 데모 프로필(심사자용 프리셋 유저, 필수)

> 심사자가 “회원가입/설정/대기” 때문에 기능을 못 보거나 이탈하지 않도록, **즉시 플레이 가능한 데모 프로필(프리셋 유저) 형태**를 반드시 제공한다.

- **접근 방식**: 로그인/회원가입 없이 “데모 프로필 선택”만으로 즉시 시작
- **제공 형태**: 페르소나 기반 3종 프리셋(예: Narrator / Explorer / Tech Enthusiast)
- **프리셋 구성**: 초기 재화/세이브/튜토리얼 진행 상태가 서로 달라, 10분 안에 “드래그·클릭·스캐너·룰 변형·Autopilot·엔딩 리포트”를 모두 확인 가능
- **리셋 정책**: 버튼 1번으로 초기 상태로 복구(데모 반복 가능)
- **환경 분리**: 데모 프로필은 데모/스테이징에서만 활성화(운영 환경에는 포함하지 않음)

## 7. 사용자 여정(예시)

1. **Intro**: Start → 언어 선택(ko/en) → **데모 프로필 선택** → 기본 재화 지급
2. **세계 생성**: 시드 생성 → 텍스트 스트리밍으로 첫 장면 → (선택) 첫 배경 이미지 생성
3. **탐험**:
   - 텍스트 입력 또는 오브젝트 클릭
   - 시스템은 비용/위험/대안 제시(예: “이미지 생성 없이 진행 가능”)
   - 인벤토리 아이템을 오브젝트에 **드래그&드롭**하여 사용/조합(예: “열쇠 → 자물쇠”, “붕대 → 부상”)
   - 매 턴 **행동 카드(Action Deck)**로 추천 루트를 제공(채팅 선택지가 아닌 “게임 UI”로 보이게)
   - (선택) Autopilot 토글 → “목표” 지정 → 에이전트가 **플랜/서브퀘스트 생성** 후 작업 큐로 자동 실행(검증 배지/복구 트레이스 표시)
4. **룰 변형 이벤트**: 특정 행동/실패/성공 누적 → 규칙 변화 → UI/이미지 반영
5. **엔딩**: 리포트(요약/이미지/통계/재화 결산) → 재시작

## 8. 기술 설계

### 8.1 기술 스택(포함)

- **Backend**: FastAPI (async), **HTTP Streaming (Fetch + POST)** 기반 스트리밍(필요 시 WebSocket 확장)
- **Frontend**: React 19 + Vite 7
- **상태 관리**: 세션 WorldState + 요약 메모리 + 재화 거래 장부(Resource Log)

### 8.2 인증/런타임: Vertex AI 서비스 계정(✅ .gitignore 보안 설정 완료)

- 백엔드는 **Vertex AI(서비스 계정)** 로 Google 인증을 수행한다.
- 사용자에게 API 키 입력(BYOK)을 요구하지 않는다(필요 시 “추후 옵션”으로만 고려).
- (로컬 개발) `backend/.env`로 `UW_MODE`, `GOOGLE_APPLICATION_CREDENTIALS`, `VERTEX_*` 등을 설정하고, 서버 시작 시 **.env 자동 로딩**으로 쉘 export 없이 실행 가능해야 한다. 단, `.env`/키 파일은 레포에 커밋하지 않고 `.env.example`만 SSOT로 유지한다. (보안: RULE-007)

### 8.3 Gemini 텍스트 생성(Text Generation)

- **스트리밍**: 서버는 `generateContentStream`(SDK)로 모델 청크를 수신하고, 클라이언트에는 `POST /api/turn`의 **HTTP Streaming 응답 스트림**으로 전달해 타자 효과를 구현한다.
- **시스템 인스트럭션**: Game Master 페르소나 + 금칙/안전 + 출력 스키마 규칙을 명시.
- **Thinking 제어**: Gemini 3 계열은 `thinking_level`(low/high)을 상황/재화에 따라 선택.
- **Temperature**: Gemini 3는 기본값(1.0) 유지 권장(안정성/루프 방지).

### 8.4 구조화 출력(Structured Outputs, JSON Schema)

- 응답은 기본적으로 `response_mime_type: application/json` + `response_json_schema`를 사용한다.
- **목적**: 내러티브 텍스트뿐 아니라, UI/상태/비용/이미지 요청을 “파싱 가능한” 결과로 받기 위함.
- **스트리밍 구조화 출력**: 모델이 내보내는 부분 JSON(텍스트 청크)을 서버에서 누적해 최종 TurnOutput JSON을 완성하고, 클라이언트에는 **NDJSON(라인 단위 JSON) 이벤트 스트림**으로 `stage/badges/narrative_delta/final`을 전송한다.
- **Turn Stream Protocol**: 응답은 NDJSON이며, 각 줄은 아래 이벤트 중 하나다.
  - **Protocol Version 1 (v1, 현행 계약)** — MVP 안정화 기준. 현재 백엔드/프론트엔드 구현과 일치하는 실질적 SSOT.
    - `{"type":"stage","name":"parse"|"validate"|"plan"|"resolve"|"render"|"verify"|"commit","status":"start"|"complete"}`
    - `{"type":"badges","badges":["schema_ok"|"schema_fail","economy_ok"|"economy_fail","safety_ok"|"safety_fail","consistency_ok"|"consistency_fail"]}`
    - `{"type":"narrative_delta","text":"..."}` (타자 효과용)
    - `{"type":"final","data":{...}}` (Pydantic 검증 통과한 TurnOutput)
    - `{"type":"error","message":"...","code":"..."}` (에러 발생 시, final 폴백과 함께 전송)
  - **Protocol Version 2 (v2, 목표)** — 품질 개선 단계에서 점진적 마이그레이션 예정.
    - `stage.status`: `"start"|"ok"|"fail"` (완료/실패 구분 명시화)
    - `badges`: `{"schema":"ok"|"fail","economy":"ok"|"fail","safety":"ok"|"fail","consistency":"ok"|"fail"}` (Map 형태로 변경하여 의미론적 접근 용이성 확보)
    - `final`: `{"type":"final","turn_output":{...}}` (키명을 데이터 목적에 맞게 `turn_output`으로 명시적 변경)
  - **하위호환 정책**: 클라이언트는 `final.data` 또는 `final.turn_output` 모두를 수용하도록 별칭(Alias) 지원 로직을 구현하여 프로토콜 전환기에도 중단 없는 서비스를 제공한다.
- **스키마 작성 원칙(요약)**:
  - 지원 타입 중심으로 설계: `string`, `number`, `integer`, `boolean`, `object`, `array`, `null`
  - 예측 가능성을 위해 `required`와 `enum`을 적극 사용하고, 필요 시 `additionalProperties: false`로 엄격화
  - 과도한 중첩/제약을 피하고(스키마 부분집합/복잡도 제한), **짧고 평평한(flat) 스키마**를 우선한다
- **검증/복구**:
  - 스키마 적합성(타입/필수키) 검증
  - 비즈니스 규칙 검증(예: 재화 음수 금지)
  - 실패 시 “repair 프롬프트”로 재요청
- **주의**: 스키마는 JSON Schema의 부분집합만 지원 → 과도한 중첩/제약은 피한다.
- **Structured outputs vs Function calling**:
  - Structured outputs: “최종 응답 포맷”을 강제(본 프로젝트의 기본 방식)
  - Function calling: 대화 중 “외부 행동(툴 호출)”을 위해 사용
  - 참고: Gemini 3는 built-in tools(google_search/url_context/code_execution)와 structured outputs 결합이 가능하지만, **built-in tools와 function calling의 동시 사용은 제한**될 수 있으므로 설계 시 분리한다.

### 8.5 이미지 생성(Image Generation / Editing)

- **모델 선택(고정)**
  - 이미지 생성/편집: `gemini-3-pro-image-preview` (고품질·텍스트 렌더링·멀티턴 편집)
  - 비용/지연은 “선택적 생성/편집 + 해상도/비율 정책 + 재화(경제)”로 제어
- **프롬프트 원칙**
  - 키워드 나열보다 **장면 서술(내러티브)** 중심
  - “부정 프롬프트”는 금지어 나열보다 **원하는 장면을 긍정적으로 서술(semantic negative prompt)** 방식 사용
  - 필요 시 “카메라/구도/조명”을 명시(예: wide shot, low-angle, rim light 등)하여 일관된 시각 언어 유지
- **해상도/비율**
  - 상황(모바일/데스크톱)과 재화에 따라 1K/2K/4K, 16:9 등 선택
- **멀티턴 편집**
  - 대화형 편집은 **Thought Signatures**가 중요(특히 이미지 모델)
  - SDK 사용 시 히스토리 관리로 시그니처가 자동 처리되도록 설계
  - 모든 생성 이미지에는 **SynthID 워터마크**가 포함됨(표기/정책 준수)

### 8.6 이미지 이해(Image Understanding / Reference)

- 사용자 업로드/참조 이미지(캐릭터/아이템/스케치)를 입력으로 받아:
  - 캡셔닝/요약
  - 오브젝트 감지(bbox) 및 (선택) 세그멘테이션(mask)
  - “이 이미지 스타일을 유지해 장면 생성” 같은 참조 흐름을 지원
- **(MMP) Agentic Vision(생성된 장면 이미지 기반 ‘행동/핫스팟 후보’ 추출)**:
  - 목적: “생성된 이미지”를 다시 입력으로 분석하여, Action Deck/Hotspots가 **텍스트 환각**이 아니라 “화면에 실제로 보이는 증거”에 기반하도록 한다.
  - 방식: `gemini-3-flash-preview` + built-in `code_execution`을 활성화해 Think→Act→Observe 루프로 이미지 패치를 반복 검사(zoom/crop/annotate)하고, 최종 결과를 구조화(JSON Schema)로 받는다.
  - 출력(예시): `affordances[] { label, box_2d: [ymin,xmin,ymax,xmax], suggested_actions[], confidence? }` 형태로 반환하고, bbox는 0~1000 정규화 규약을 준수한다. (RULE-009)
  - 적용 정책: Key scene만(예: “장면 생성 직후 1회”), 또는 Assist/Autopilot에서만 실행 등 **비용/지연 제어**를 기본으로 두고, 실패/차단 시 텍스트-only로 폴백한다. (RULE-004/005/008)
- **입력 방식**
  - 작은 파일: inline base64(총 요청 20MB 제한)
  - 재사용/큰 파일: Files API 업로드 후 URI 참조
- **좌표 규약**
  - bbox는 \[ymin, xmin, ymax, xmax] 정규화(0~1000)로 반환/저장
- **품질 팁**
  - 단일 이미지+텍스트 입력 시, `contents` 배열에서 **이미지 파트를 먼저 두고 텍스트 지시를 뒤에 둔다**
  - bbox/segmentation 계열 작업은(특히 Gemini 2.5) **thinking_budget=0** 같은 설정으로 정확도를 높이는 옵션을 제공한다(비용/정책에 따라 선택)
  - 고해상도 텍스트 판독 등은(특히 Gemini 3) `media_resolution`을 상황에 맞게 상향할 수 있다(토큰/지연 증가)

### 8.7 핵심 데이터 모델 & 응답 스키마(초안)

> 실제 구현에서는 JSON Schema로 고정하며, 아래는 PRD 수준의 “필드 설계 방향”입니다.

- **TurnInput (Client → Server)**:
  - `language`: `"ko-KR" | "en-US"`
  - `text`: 사용자 입력(자연어)
  - `click`: `{ object_id, box_2d?: [ymin,xmin,ymax,xmax] }` (선택)
  - `client`: `{ viewport_w, viewport_h, theme: "dark"|"light" }`
  - `economy_snapshot`: `{ signal, memory_shard }`
- **TurnOutput (Server → Client, Structured Output)**:
  - `language`
  - `narrative`: 내러티브 텍스트(표시용)
  - `ui`:
    - `choices[]`: 버튼형 선택지(라벨/비용/예상 결과)
    - `objects[]`: 클릭 가능한 오브젝트(라벨/box_2d/상호작용 힌트)
  - `world`:
    - `delta`: 이번 턴 변경 사항(룰/인벤토리/관계/상태)
    - `memory_pins[]`: “중요 설정 고정” 후보(사용자 확인 후 고정)
  - `render`:
    - `image_job?`: `{ should_generate, model, aspect_ratio, image_size, prompt, reference_images? }`
  - `economy`:
    - `cost`: `{ signal, memory_shard }`
    - `balance_after`: `{ signal, memory_shard }`
  - `safety`: `{ blocked: boolean, message?: string|null }`
- **SaveGame (Local/Server)**:
  - `version`, `seed`, `language`, `theme`, `world_state`, `history`, `economy_ledger`, `assets`
  - (정책) `version` 불일치 또는 WorldState/SaveGame 스키마가 확장/변경된 경우: 가능한 범위에서 **버전별 마이그레이션**을 수행하고, 불가하면 안전 리셋(텍스트-only 등 폴백) + 명시적 안내로 데모 루프를 끊지 않는다.

## 9. 프론트엔드 UX/스타일 (Frontend Style Guide 반영)

### 9.0 데모 표면(UI/동작) 강화: Prompt-only wrapper 오해 방지

- **UI 형태 원칙**:
  - 메신저형 **채팅 버블 UI를 금지**한다(심사자에게 “챗봇 래퍼”로 보이는 지점 제거).
  - 텍스트는 “대화”가 아니라 **게임 로그/내레이션 피드**로 표현한다(시스템 메시지/행동 결과/룰 변화).
  - Action 실행(카드/클릭/드롭)의 “입력 에코”는 `You said ...` / `...라고 말했습니다` 같은 대사 템플릿이 아니라, **행동 로그(예: `행동 실행: 문을 열어본다`)** 로 분리해 표현한다(행동이 ‘말하기’가 아닐 때 어색함 방지).
  - 프롬프트(시스템/개발용)는 UI에 노출하지 않는다(필요 시 개발자 토글로만 접근).
- **고정 레이아웃(게임스러운 첫 인상)**:
    - Header: 타이틀/Seed/언어 토글/테마 토글/재화 HUD/연결 상태(로딩/TTFB)
    - Center: **Scene Canvas(장면 이미지 + 핫스팟 오버레이)** (✅ 구현 완료) + Hover 하이라이트/툴팁
    - Side Panels: Inventory / Quest / Rule Board / **Agent Console(Plan·Queue·Badges)**
      - 최소 2개 패널은 항상 노출하되, 데모에서는 **Agent Console을 상시 노출**하여 “에이전트 동작”이 보이게 한다.
    - Footer: Action Deck + 커맨드 입력(선택)
  
  - **핵심 인터랙션(눈에 띄는 ‘게임 동작’)**:
    - 클릭: 핫스팟 클릭 → 조사/상호작용 → 결과 반영 ✅
    - 드래그: 인벤토리 아이템 → 오브젝트 드랍 → 사용/조합 🚧 (U-011 진행 예정)
  - 업로드: Scanner에 이미지 드랍 → “아이템화/단서화” → 인벤토리/세계에 반영
  - 토글: 언어(ko/en), 테마(dark/light) 즉시 전환(데모에서 “제품” 느낌 강화)
    - (MVP) 언어 전환은 혼합 출력 방지를 위해 **세션 리셋(새 시작)** 으로만 적용(기존 상태 번역 없음)
  - 토글: Autopilot(Manual/Assist/Autopilot) → **계획/작업 큐/검증 배지/자동 복구**가 화면에 표시

### 9.1 디자인 컨셉

- **CRT 터미널 레트로** 미학: 인광 그린, 글로우, 스캔라인, 글리치
- “게임 UI = 세계의 일부”처럼 보이도록 **몰입형 인터페이스** 유지

### 9.2 테마(다크/라이트)

- **기본: 다크 모드**
- 라이트 모드에서도 CRT 정체성을 유지하되, 가독성/피로도를 우선한다.
- 구현 원칙: CSS 변수 기반 테마 토글(`data-theme="dark|light"`)

#### 다크 테마 CSS 변수(기준)

```css
:root {
  --bg-color: #0d0d0d;
  --text-color: #33ff00;
  --text-dim: #1a8000;
  --accent-color: #ff00ff;
  --border-color: #33ff00;

  --crt-scanline: rgba(18, 16, 16, 0.1);
  --crt-flicker: 0.03;

  --font-main: 'NeoDonggeunmo', 'VT323', monospace;
}
```

#### 라이트 테마 CSS 변수(추가)

```css
[data-theme='light'] {
  --bg-color: #f5f7f5;
  --text-color: #0b3d0b;
  --text-dim: #2a6b2a;
  --accent-color: #b000b0;
  --border-color: #0b3d0b;

  --crt-scanline: rgba(0, 0, 0, 0.06);
  --crt-flicker: 0.02;
}
```

#### 폰트 로딩(요약)

- `NeoDunggeunmo`(한글) + `VT323`(영문) 조합을 기본으로 하며, 폰트 로딩 실패 시 시스템 `monospace`로 폴백한다.

### 9.3 레이아웃

- Header(타이틀/상태/재화) + Main(스크롤 터미널) + Footer(입력/실행)
- 모바일 퍼스트(768px 이하 폰트/패딩 조정)
- (MVP) 기본 뷰포트(예: 1366x768)에서 **초기 화면이 불필요한 스크롤을 강제하지 않게** 핵심 HUD/패널의 기본 높이/정보 밀도를 튜닝한다.
- 스크롤은 “컬럼 전체(사이드바)”가 아니라 **패널 콘텐츠 단위**로 한정한다(중첩 스크롤/전체 패널 스크롤 UX 악화 방지).
  - 예: Economy HUD는 잔액/비용은 항상 보이고, 긴 원장(ledger) 목록만 **카드 내부 스크롤**로 처리한다.

### 9.4 접근성/입력

- 키보드: Enter로 실행, Tab 포커스, 스크린리더 고려
- 색상만으로 의미 전달 금지(텍스트/아이콘 병행)
- **가독성(필수)**: 기본 폰트가 “너무 작게” 보이지 않도록 전역 UI 스케일(폰트) 조절을 제공하고, 설정은 로컬에 유지한다.
- **Readable 모드(제거)**: 별도의 “Readable 토글”로 전체 CRT를 약화/제거하는 방식은 채택하지 않는다.
- **정보 계층(필수)**: “식별성이 중요한 영역(critical)”과 “분위기/장식 영역(ambient)”을 구분하여, 중요한 정보(재화/비용/배지/퀘스트/선택지/입력)는 **항상 읽히는 대비/크기/효과 강도**를 유지하고, 분위기 요소는 비중요 영역에 집중 적용한다.
- **접근성(필수)**: OS `prefers-reduced-motion: reduce` 등 접근성 설정을 존중하여 플리커/글리치 같은 반복 애니메이션은 자동으로 완화/비활성화한다.

### 9.5 CRT 효과(요약)

- 화면 오버레이(스캔라인/플리커)는 `pointer-events: none`으로 상호작용을 방해하지 않는다.
- 타이틀에는 글리치 효과를 제한적으로 적용(성능/가독성 우선).
- (보강) “분위기 때문에 읽기 어려움” 또는 “가독성 때문에 CRT가 완전 OFF처럼 보임” 회귀를 방지하기 위해, 효과는 **강도 토큰(변수)** 로 제어하고 적용은 **영역/중요도(critical/ambient) 기준으로 분리**한다.
- 핫스팟/드롭 오버레이의 채도/알파/글로우는 “콘텐츠를 가리는 UI”가 되지 않도록 토큰으로 제어하고, hover/drag 상태에서도 **덮임/쨍함**이 과도해지지 않게 한다(특히 Scene Canvas 위 오버레이).

### 9.6 스타일 관리 원칙

- 프로젝트 규모 기준 **단일 CSS 파일**(예: `frontend/src/style.css`)로 관리
- 색상/테마는 **CSS 변수**로만 제어(컴포넌트별 임의 색상 금지)
- **UI 이미지 에셋(아이콘/프레임/placeholder)** 은 필요한 지점에 한해 사용하며, 폴백(텍스트/이모지)을 유지한다.
- **nanobanana mcp 활용(계획)**: UI 에셋이 필요하거나 적합한 부분은 nanobanana mcp로 제작해 반영하되, 스타일(팔레트/톤)과 파일 크기(성능)를 엄격히 관리한다.

### 9.7 UI 이미지 에셋 파이프라인 (nanobanana mcp, Dev-only)

> 목표: “채팅 앱이 아닌 게임 UI”의 첫 인상을 강화하되, **가독성/성능/보안**을 해치지 않는 범위에서만 에셋을 사용한다.

- **Dev-only 원칙**: `nanobanana mcp`는 개발 중 정적 에셋을 제작하는 도구이며, 제품 런타임(프론트/백엔드)에서 MCP에 의존하지 않는다.
- **SSOT 경로**: 정적 에셋은 `frontend/public/ui/`에 저장한다(정적 서빙/캐싱 단순화).
  - 예: `ui/icons/`, `ui/placeholders/`, `ui/chrome/`
- **네이밍 규칙**: `kebab-case` + 용도 + 크기(예: `signal-24.png`, `badge-ok-16.png`)
- **사이즈/성능 예산(권장)**:
  - 아이콘: 16/24/32/64(최소 2종), 1개 20KB 이하 권장
  - placeholder: 1개 200KB 이하 권장
  - `frontend/public/ui/` 총합 1MB 이하 권장
- **핵심 UI 아이콘 12종(SSOT, MVP)**: Signal/Shard/Risk/Badge 등은 아래 12종을 기준으로 제작/관리한다(각 아이콘 최소 16/24 제공, **기본 CRT 톤(효과 포함)** 에서도 식별 가능해야 함).
  - `signal`, `shard`
  - `risk-low`, `risk-medium`, `risk-high`
  - `badge-ok`, `badge-fail`
  - `status-online`, `status-offline`
  - `autopilot`, `scanner`, `memory-pin`
- **배경 제거(필수 조건부)**: 아이콘/크롬 등 **투명 배경(알파)이 필요한 에셋**은 생성 결과에 배경이 남아 있으면 `rembg`로 배경을 제거해 투명 PNG로 정리한다. (가이드: `vibe/ref/rembg-guide.md`)
- **배경 단순화(필수 조건부)**: 배경 제거(rembg)를 전제하는 에셋은 **생성 단계에서 배경을 순백(#FFFFFF) 단색**으로 만들도록 강하게 지시한다(그라데이션/텍스처/그림자 금지) → 배경 제거 품질/재현성/속도 향상.
- **폴백(필수)**: 에셋 로딩 실패/미지원 시에도 텍스트/이모지 라벨로 기능이 유지되어야 한다.
- **접근성(필수)**: 색상만으로 의미 전달 금지(라벨/텍스트 병행), 장식성 이미지는 `aria-hidden` 등으로 의도 명시.
- **추적/QA(권장)**: 에셋은 `manifest`와 체크리스트로 사용처/규칙 준수 여부를 관리한다(용량/대비/**기본 CRT 톤(효과 포함)**).
- **보안(필수)**: 키/토큰 등 비밀정보를 레포/로그/문서에 남기지 않는다.

## 10. 개발/데모/검증 루프(Playtest-driven Iteration)

> 구현 전반에서 “항상 플레이 가능한 데모”를 유지하고, 실제 플레이를 **지속적으로 리플레이**하면서 UX/프롬프트를 빠르게 다듬는 것을 핵심 개발 방식으로 채택한다.

### 10.1 원칙

- **항상 플레이 가능한 빌드**: 매 PR/스프린트마다 “최소 1개 시나리오를 끝까지 플레이 가능한 데모”를 유지한다.
- **데모 표면 우선**: 내부 설계가 좋아도 UI가 채팅처럼 보이면 실패. UI/동작을 먼저 고정하고, 그 위에 프롬프트/엔진을 반복 개선한다.
- **관측 가능성(Observability) = UX의 일부**: 에이전트 동작(계획/큐/검증/복구)이 Demo Mode에서 항상 보이도록 한다.

### 10.2 Demo Mode(실시간 튜닝을 위한 디버그 UI)

- **Demo Overlay(상시 토글)**:
  - Agent Console(Plan/Queue/Badges)
  - 요청별 지표: TTFB, 전체 응답 시간, 이미지 생성 시간, 재시도 횟수, 스키마 검증 결과
  - 재화 거래 장부(Resource Log)(소모/잔액) + “왜 이 비용인지” 라벨(FAST/QUALITY/CHEAP/REF)
- **Hot controls**:
  - 언어(ko/en), 테마(dark/light), Autopilot 모드 전환
    - (MVP) 언어 전환은 “리셋 동반”으로만 적용하여 한 화면에 ko/en 혼합이 남지 않게 한다.
  - “이미지 생성 빈도/해상도 정책” 프리셋(예: `Story-only`, `Key Scenes`, `Every Turn`)
- **프롬프트 노출 금지**:
  - 프롬프트 원문은 UI에 표시하지 않는다(심사자 오해 방지).
  - 대신 “버전/정책 라벨/검증 배지”로 시스템 동작을 설명한다.

### 10.3 Replay & Scenario Harness(지속적 플레이 리그레션)

- **Scenario Library**:
  - “온보딩”, “퍼즐(아이템 드래그)”, “룰 변형”, “스캐너(이미지→아이템)”, “자동 복구(의도적 스키마 실패)” 등 데모 대표 시나리오를 정의한다.
  - 각 시나리오는 `seed`, 사용자 액션 시퀀스(클릭/드래그/텍스트/업로드), 기대 인바리언트(예: 재화 음수 금지, 스키마 OK)를 포함한다.
- **Replay Runner**:
  - 실제 플레이에서 생성된 세션을 “리플레이 파일”로 저장하고, 동일 액션을 재실행해 회귀(regression)를 탐지한다.
  - LLM의 비결정성은 인정하되, 최소한 아래는 항상 만족해야 한다:
    - Structured Output 스키마 유효
    - Economy 규칙 유효(잔액 음수/비용 불일치 금지)
    - Safety 차단/대체 처리 정상
    - WorldState 일관성 규칙(중요 핀/룰 보드) 위반 없음
- **아티팩트 자동 생성**:
  - 리플레이 결과로 “WorldState diff”, 실패 원인(어느 단계에서 깨졌는지), 자동 복구 시도 기록을 남긴다.

### 10.4 프롬프트 라이프사이클(버저닝/핫리로드/실험)

- 프롬프트는 `.md` 파일로 관리하며, 런타임에서 **핫리로드** 가능하게 설계한다(서버 재시작 없이 튜닝).
- 프롬프트의 버전/정책 메타는 프롬프트 파일 내 `<prompt_meta>`(XML 태그)로 기록하고, 서버는 이를 추출해 로그/응답 메타로 반영한다.
- 모든 응답/로그에는 최소 다음 메타를 포함한다:
  - `prompt_version`, `policy_preset`, `language`, `model_label(FAST/QUALITY/REF/...)`
- **A/B 실험(선택)**:
  - 동일 시나리오에서 프롬프트 버전 A/B를 비교할 수 있도록 “세션 단위 스위치”를 제공한다.

### 10.5 품질 게이트(자동 검증 기준)

- **Hard gate(필수 통과)**:
  - JSON Schema 검증 통과(`Schema OK`)
  - Economy 검증 통과(`Economy OK`)
  - Safety 정책 준수(`Safety OK` 또는 명시적 Block+대체)
  - 언어 및 좌표 일관성 준수(`Consistency OK`) ✅ (U-043/U-044)
- **Soft gate(지표 관측)**:
  - TTFB/지연/재시도 횟수/Autopilot 성공률
  - 사용자 행동량(클릭/드래그/업로드/카드 사용)이 “채팅 입력”보다 충분히 높게 유지되는지

### 10.6 운영 방식(반복 튜닝 루프)

- “데모 10분 플레이 → 리플레이 저장 → 실패/불만 포인트 라벨링 → 프롬프트/UX 조정 → 리플레이로 회귀 확인”을 기본 사이클로 삼는다.
- 모든 변경은 **데모 표면(게임성) 유지**를 전제로 하며, 채팅형 UX로 퇴행하는 변경은 거부한다.

## 11. 위험 요소 및 대응

### 11.1 비용 리스크(토큰/이미지)

- 재화 경제로 사용량을 제어하고, “텍스트만 진행/저해상도” 대안을 제공
- 이미지 생성 빈도를 자동 조절(중요 장면 위주)

### 11.2 일관성(환각/설정 붕괴)

- WorldState를 구조화해 모델 입력에 주입(중요 설정은 별도 고정 메모리)
- 일정 턴마다 요약/정리(요약도 스키마화)

### 11.3 안전/프롬프트 인젝션

- 입력/출력 필터링 + 시스템 인스트럭션 강화
- “사용자 입력은 룰이 아니다” 원칙을 명확히 하고, 모델이 스키마/규칙을 우선하게 설계

### 11.4 실패/불완전 출력

- 스키마 검증 실패 시 자동 복구 루프
- 이미지 생성 실패 시 텍스트 대체 + 재시도 정책

## 12. 성공 지표

- **Engagement**: 평균 세션 지속 시간 15분 이상
- **Retention**: D+1 재방문율 30%
- **Virality**: 엔딩 화면 공유 CTR 10%
- **Performance**: API 오류율 1% 미만, 스트리밍 TTFB 2초 이내 목표

## 13. 범위(Out of Scope)

- 멀티플레이어/협동
- BGM/SFX 생성(초기 제외)
- 복잡한 3D 렌더링(2D 이미지+텍스트 중심)

## 14. 참고 자료

- [Gemini API](https://ai.google.dev/docs)
- [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Image generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
