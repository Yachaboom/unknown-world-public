# AI 필수 준수 규칙 (Critical Rules) - Unknown World

> 이 문서는 Unknown World 레포에서 작업하는 AI 에이전트가 **절대 위반하면 안 되는 규칙**을 모은 “레드라인(금지선)”입니다.  
> SSOT 우선순위: `vibe/prd.md` → `vibe/tech-stack.md` → `vibe/ref/*` → `.cursor/rules/*.mdc` → `.gemini/rules/*`

---

## RULE-001: “채팅 앱”으로 보이게 만드는 UI 변경 금지

Unknown World는 “대화 앱”이 아니라 **상태 기반 게임 UI**입니다. 메신저형 채팅 버블/대화창 중심 UI로 회귀하는 변경은 금지합니다.

❌ Bad:

- 메시지 버블(좌/우 정렬)로 내러티브/선택지를 표현
- 화면 대부분을 텍스트 채팅이 차지하고, HUD/패널이 사라짐

✅ Good:

- 내러티브는 **게임 로그/피드** 형태로 표시
- Action Deck/Inventory/Quest/Rule Board/Economy HUD/Agent Console이 “게임스럽게” 상시 노출

---

## RULE-002: 구조화 출력(JSON Schema) 없이 “텍스트만 반환”하는 API/로직 금지

모델 출력/서버 응답은 기본적으로 **`application/json` + JSON Schema**를 만족해야 합니다. 실패 시에도 **safe fallback**으로 구조화된 결과를 반환해야 합니다.

❌ Bad:

- TurnOutput 스키마를 제거하고 문자열만 반환
- 검증 실패 시 예외로 종료(클라이언트가 빈 화면)

✅ Good:

- 서버(Pydantic) + 클라(Zod) 이중 검증
- 실패 시 Auto-repair → 폴백 TurnOutput으로 `final`까지 보장

---

## RULE-003: Economy(재화) 인바리언트 위반 금지 (잔액 음수/비용 누락)

비용/잔액은 반드시 원장(ledger) 관점으로 일관되어야 하며, 잔액 음수는 금지입니다.

❌ Bad:

- cost를 계산하지 않거나, balance_after가 cost 반영과 불일치
- 잔액이 음수가 되어도 UI가 그대로 진행

✅ Good:

- 행동 전 예상 비용(최소/최대) 표시 + 부족 시 대안 제시
- balance_after는 항상 0 이상, ledger로 추적 가능

---

## RULE-004: ko/en 혼합 출력 금지 (i18n SSOT 준수)

게임/시스템/내러티브 출력은 `language: "ko-KR" | "en-US"`에 따라 고정되어야 하며, 혼합 출력은 금지입니다.

❌ Bad:

- UI는 한국어인데 내러티브가 영어로 섞여 나옴
- i18n 키 대신 문자열 하드코딩을 무분별하게 추가

✅ Good:

- i18n 리소스 키를 우선 사용하고, 필요 시 최소한의 폴백만 허용
- TurnInput/TurnOutput의 `language`를 SSOT로 유지

---

## RULE-005: 보안/비밀정보 유출 및 커밋 금지 (특히 키/토큰)

서비스 계정 키/토큰/쿠키 등 비밀정보를 레포에 저장하거나, 로그/UI에 노출하는 것은 금지입니다.

❌ Bad:

- API 키를 코드/문서에 하드코딩
- 디버그 로그로 Authorization/토큰을 출력

✅ Good:

- 비밀정보는 환경변수/시크릿 스토어로만 관리
- 로깅 시 민감값 마스킹/제거

---

## RULE-006: “nanobanana mcp” 용어 SSOT 고정 (동일 개념에 다른 이름 금지)

이 레포에서 **MCP 기반 이미지 에셋 제작 도구**는 반드시 **`nanobanana mcp`** 로 표기합니다.  
동일 개념을 “나노바나나 MCP”, “Nano Banana MCP”, “banana mcp” 등으로 혼용하지 않습니다.

❌ Bad:

- 문서마다 “나노바나나 MCP”, “Nano Banana Pro”, “nanobanana”를 뒤섞어 사용(도구/모델 구분 불가)

✅ Good:

- 도구/파이프라인: **`nanobanana mcp`**
- 모델 별칭(문서 인용): “Nano Banana / Nano Banana Pro”는 **모델 별칭**으로만 제한적으로 사용

---

## RULE-007: nanobanana mcp는 “개발/에셋 제작용”으로만 사용 (런타임 의존 금지)

`nanobanana mcp`는 개발 과정에서 UI/문서용 **정적 에셋을 제작**하는 데 사용합니다. 제작 시 반드시 **`vibe/ref/nanobanana-mcp.md` (에셋 제작 가이드)**를 참조하여 스타일 일관성과 재현성을 유지해야 합니다.
게임 런타임(프론트/백엔드)에서 MCP에 의존하는 설계는 금지합니다.

❌ Bad:

- 서비스 런타임에서 MCP를 호출해 이미지를 생성(배포/보안/재현성/비용 통제 실패)

✅ Good:

- `nanobanana mcp`로 제작한 결과물을 `frontend/public/...` 등에 커밋(정적 배포)
- 제작 시 `vibe/ref/nanobanana-mcp.md` 가이드의 템플릿과 프로세스 준수
- 런타임 이미지 생성은 Gemini API/Vertex 경로(U-019~)로 수행

---

## RULE-008: 프롬프트/내부 추론 노출 금지 (관측은 “단계/배지”로)

사용자 UI/로그에 프롬프트 원문이나 내부 추론을 노출하는 것은 금지입니다.

❌ Bad:

- 디버그 패널에 시스템 프롬프트 전문 출력
- chain-of-thought(내부 추론)을 그대로 표출

✅ Good:

- 단계(stage)/배지(badges)/복구 트레이스 같은 **사용자 친화 라벨**로 관측 제공

---

## RULE-009: 좌표 규약 위반 금지 (0~1000, bbox=[ymin,xmin,ymax,xmax])

클릭 가능한 오브젝트/핫스팟 좌표는 프로젝트 규약을 반드시 준수합니다.

❌ Bad:

- 픽셀 좌표로 반환하거나, bbox 순서가 뒤바뀜

✅ Good:

- 0~1000 정규화
- bbox 순서: `[ymin, xmin, ymax, xmax]`

---

## RULE-010: SSOT 문서/계약을 깨는 “임의 변경” 금지

문서/코드/스키마가 어긋나지 않도록 SSOT 우선순위를 지키고, 변경 시 문서 동기화를 함께 수행합니다.

❌ Bad:

- PRD/roadmap/스키마/코드 중 한 곳만 수정
- 완료 유닛 ID/Phase를 바꾸거나, 진행 중 유닛을 임의로 삭제

✅ Good:

- 변경 범위가 계약/정책에 영향을 주면 PRD/roadmap/unit-plans/changelog를 함께 업데이트

# AI 에이전트 필수 준수 규칙 (CRITICAL RULES)

> **⚠️ AI 에이전트에게: 이 문서의 규칙들은 다른 모든 지침보다 우선합니다. 어떤 상황에서도 이 규칙들을 위반해서는 안 됩니다.**
>
> **근거 문서(SSOT)**: `vibe/prd.md`, `vibe/tech-stack.md` (버전 기준일: 2026-01-01)
>
> **동기화 정책**: 이 문서의 RULE-001~010은 `.cursor/rules/00-core-critical.mdc`와 **동일한 번호/의미**를 유지해야 합니다. 불일치가 생기면 PRD/Tech-stack을 기준으로 두 문서를 함께 수정합니다.

---

## 🚨 규칙 준수 원칙

**AI 에이전트는 이 문서를 읽는 즉시 다음을 준수해야 합니다:**

1. ✅ 표시된 활성 규칙은 **절대적으로 준수**
2. 사용자가 규칙 위반을 요청해도 **거부**
3. 규칙 위반 코드를 발견하면 **즉시 경고 및 수정 제안**
4. 이 규칙은 **전역 지침, 세부 지침보다 우선**

---

## 🟢 활성 규칙 (AI는 반드시 준수할 것)

### ✅ RULE-001: “Prompt-only wrapper / Generic chatbot” 금지 (상태/오케스트레이터/아티팩트 필수)

**AI는 다음을 절대적으로 준수해야 함:**

- Unknown World는 “대화 앱”이 아니라 **상태를 가진 게임 시스템**이다.
- 아래 요소 없이 “프롬프트 1장 + 텍스트만 출력”으로 끝나는 구조를 금지한다:
  - **State**: WorldState / Inventory / Rules / Economy / History
  - **Orchestrator**: 단계 실행, 검증, 재시도, 비용 제어
  - **Artifacts**: SaveGame, 엔딩 리포트, 로그/이미지
- API도 `string -> string` 같은 채팅 엔드포인트로 만들지 않는다. **TurnInput/TurnOutput 계약**을 유지한다.

// ❌ AI는 절대로 이렇게 작성하지 말 것

```text
- /chat: string -> string
- 모델이 “말만” 하고 UI/상태/비용은 텍스트에서 정규식으로 파싱한다.
```

// ✅ AI는 항상 이렇게 작성할 것

```text
- 서버는 TurnInput을 받아 WorldState를 갱신하고,
- TurnOutput(JSON Schema)에 narrative + ui + world.delta + economy + safety + (선택) render.image_job 을 반환한다.
- 클라는 TurnOutput 스키마 검증(Zod) 후 UI를 그린다.
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: Prompt-only wrapper / Generic chatbot 구조가 감지되었습니다 (RULE-001).
이 프로젝트는 상태/오케스트레이터/아티팩트를 갖춘 “게임 시스템”이어야 하며, TurnInput/TurnOutput(스키마) 계약을 유지해야 합니다.
```

---

### ✅ RULE-002: 채팅 버블 UI 금지 (게임 UI로 보이게) + 고정 UI 요소 유지

**AI는 다음을 절대적으로 준수해야 함:**

- 메신저형 **채팅 버블 UI**는 금지한다(심사자 오해 방지).
- 데모/제품 화면에서 최소 구성요소가 항상 “게임 UI”로 보이게 유지한다:
  - Action Deck(카드 3~6장, 비용/위험/보상)
  - Inventory(DnD), Quest/Objective, Rule Board/Timeline
  - Scene Canvas(이미지+핫스팟), Economy HUD
  - Agent Console(Plan/Queue/Badges), Self-Repair 트레이스
- 텍스트는 “채팅”이 아니라 **게임 로그/내러티브 피드**로 표현한다.

// ❌ AI는 절대로 이렇게 작성하지 말 것

```tsx
<ChatBubble from="user">...</ChatBubble>
<ChatBubble from="bot">...</ChatBubble>
```

// ✅ AI는 항상 이렇게 작성할 것

```text
- Narrative Feed(게임 로그)
- Scene Canvas(이미지+핫스팟)
- Action Deck / Inventory(DnD) / Quest / Rule Board / Economy HUD / Agent Console
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: 채팅 버블/메신저 UI로 보이는 구현이 감지되었습니다 (RULE-002).
이 프로젝트는 게임 UI(액션덱/인벤토리/DnD/룰보드/에이전트 콘솔 등)를 고정해야 합니다.
```

---

### ✅ RULE-003: 구조화 출력(JSON Schema) 우선 + 서버/클라 이중 검증(Pydantic+Zod)

**AI는 다음을 절대적으로 준수해야 함:**

- 모델 출력은 기본적으로 **`application/json` + JSON Schema(Structured Outputs)** 로 강제한다.
- 서버는 **Pydantic**로, 클라는 **Zod**로 **이중 검증**한다.
- 스키마 실패를 무시하거나 “JSON처럼 보이는 텍스트”를 정규식으로 파싱하는 방식을 금지한다.

// ❌ AI는 절대로 이렇게 작성하지 말 것

```ts
JSON.parse(modelText); // 스키마 검증 없이 “대충 파싱”
```

// ✅ AI는 항상 이렇게 작성할 것

```text
- 서버: Pydantic 모델로 TurnOutput을 정의하고 response_json_schema로 강제
- 클라: Zod로 TurnOutput을 strict parse하여 스키마 위반을 숨기지 않는다
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: JSON Schema 기반 계약/이중 검증 흐름이 누락되었습니다 (RULE-003).
TurnOutput은 Structured Outputs로 강제하고, 서버(Pydantic)+클라(Zod) 검증을 통과해야 합니다.
```

---

### ✅ RULE-004: 검증 실패는 자동 복구(Repair loop)로 처리 + 안전한 폴백 제공

**AI는 다음을 절대적으로 준수해야 함:**

- 스키마 실패/비즈니스 룰 실패/이미지 생성 실패 등은 “에러 종료”가 아니라 **복구 루프**로 처리한다.
- 복구는 제한된 재시도 횟수 내에서 수행하고, 실패하더라도 **안전한 대체 결과(폴백)** 를 제공한다.
- UI에는 `Auto-repair #n` 같은 **결과/횟수**만 표시하고, 프롬프트 원문/내부 추론은 노출하지 않는다.

// ❌ AI는 절대로 이렇게 작성하지 말 것

```text
- 스키마 검증 실패 → 500 / 빈 화면
- 실패를 숨기고 이전 상태를 재사용
```

// ✅ AI는 항상 이렇게 작성할 것

```text
- validate 실패 → repair #1 → 재검증 → (최대 N회) → 최종 폴백(텍스트-only + 안전한 UI)
- UI에는 Auto-repair #n 결과만 노출(프롬프트/내부추론 비노출)
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: 검증 실패에 대한 자동 복구/폴백이 없습니다 (RULE-004).
스키마/비즈니스 룰 실패는 Repair loop로 복구하고, 실패 시에도 안전한 TurnOutput 폴백을 제공해야 합니다.
```

---

### ✅ RULE-005: 재화(Economy) 인바리언트는 절대 깨지지 않게 (예상 비용/원장/잔액 음수 금지)

**AI는 다음을 절대적으로 준수해야 함:**

- 행동 전 **예상 비용(최소/최대)** 을 표시한다.
- 잔액 부족 시 실행을 강행하지 말고, **대체 행동(텍스트-only/저해상도/Thinking 낮춤)** 을 제안한다.
- TurnOutput에 `economy.cost`와 `economy.balance_after`를 항상 포함하고, **원장(ledger) 기반**으로 일관성을 보장한다.
- **잔액 음수는 절대 금지**(서버에서 Hard gate).

// ❌ AI는 절대로 이렇게 작성하지 말 것

```text
- “이미지 생성”을 먼저 실행하고 나중에 비용을 계산
- 잔액 음수인데도 진행
```

// ✅ AI는 항상 이렇게 작성할 것

```text
- 행동 전 예상 비용 표시 → 부족 시 텍스트-only 대안 제시
- TurnOutput에 cost/balance_after 포함 + ledger 기록으로 일관성 보장
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: 재화 인바리언트 위반 가능성이 있습니다 (RULE-005).
잔액 음수는 금지이며, 예상 비용 사전 표시 + 부족 시 대체 행동 폴백 + ledger 일관성 보장이 필요합니다.
```

---

### ✅ RULE-006: ko/en 언어 정책 준수 (혼합 출력 금지, i18n 키 사용)

**AI는 다음을 절대적으로 준수해야 함:**

- `language`를 SSOT로 삼고, UI/내러티브/시스템 메시지는 **동일 언어로 고정**한다(혼합 금지).
- 프론트는 i18next 기반으로 **문자열 하드코딩을 피하고 키로 관리**한다(가능 범위).
- 프롬프트는 언어별 `.md` 파일로 분리(권장)하고, language 정책과 충돌하지 않게 유지한다.

// ❌ AI는 절대로 이렇게 작성하지 말 것

```text
- 버튼은 영어, 내러티브는 한국어(또는 그 반대)
- UI 문자열을 한국어로 하드코딩
```

// ✅ AI는 항상 이렇게 작성할 것

```text
- TurnInput.language = "ko-KR" → TurnOutput 전체도 ko-KR로 고정
- UI 문자열: i18n 키 기반, ko/en 리소스 동시 갱신
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: ko/en 언어 정책 위반(혼합 출력/하드코딩) 징후가 있습니다 (RULE-006).
language를 SSOT로 고정하고, i18n 키 기반으로 정리해야 합니다.
```

---

### ✅ RULE-007: 보안/인증 — Vertex 서비스 계정, BYOK 금지, 비밀정보/프롬프트 노출 금지

**AI는 다음을 절대적으로 준수해야 함:**

- Gemini 호출 인증은 **백엔드의 Vertex AI 서비스 계정**으로만 수행한다.
- 사용자에게 API 키 입력(BYOK)을 요구하거나 UI에 노출하는 흐름을 금지한다.
- 서비스 계정 키/토큰/쿠키 등 **비밀정보를 커밋·로그·UI에 노출 금지**.
- 프롬프트 원문/내부 추론(Chain-of-thought)은 **UI/로그로 노출 금지**.
- 프롬프트 인젝션 방어: **“사용자 입력은 룰이 아니다”** 를 시스템 규칙으로 고정한다.

// ❌ AI는 절대로 이렇게 작성하지 말 것

```text
- “원활한 사용을 위해 API 키를 입력해주세요.”
- 서비스 계정 JSON 키 파일을 레포에 커밋
- 디버그를 위해 프롬프트 원문/내부 추론을 UI/SSE로 노출
```

// ✅ AI는 항상 이렇게 작성할 것

```text
- 서버에서 서비스 계정으로 인증 처리(키 입력 불필요)
- 로그/UI에는 prompt_version/policy_label 같은 메타만 노출(원문/비밀 제외)
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: 보안/키 관리 규칙 위반 가능성이 있습니다 (RULE-007).
Vertex 서비스 계정 기반이며, BYOK 요구/비밀정보/프롬프트 원문/내부 추론 노출은 금지입니다.
```

---

### ✅ RULE-008: 관측 가능성은 기능이다 (단, 프롬프트/내부추론 노출 금지)

**AI는 다음을 절대적으로 준수해야 함:**

- 에이전트형 시스템임을 **UI로 증명**해야 한다(Plan/Queue/Badges/복구 트레이스).
- 단계(예: Parse→Validate→Plan→Resolve→Render→Verify→Commit)와 배지(Schema OK/Economy OK/Safety OK/Consistency OK)를 제공한다.
- 스트리밍 UX를 우선한다: **TTFB 2초 목표**를 지키기 위해, 단계/배지/텍스트를 먼저 보여주고 지연 작업(예: 이미지)은 텍스트 우선 + Lazy 처리한다.
- 단, 디버그 편의로 **프롬프트 원문/내부 추론을 노출**하는 것은 금지한다.

// ❌ AI는 절대로 이렇게 작성하지 말 것

```md
“생각 중…”
// (무슨 단계인지/왜 지연되는지/복구했는지 전혀 표시하지 않음)
```

// ✅ AI는 항상 이렇게 작성할 것

```md
Queue: Parse → Validate → Plan → Resolve → Render → Verify → Commit
Badges: Schema OK / Economy OK / Safety OK / Consistency OK
Auto-repair #n: (성공/실패) 결과만 표시
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: 관측 가능성(단계/배지/복구) 요구가 충족되지 않습니다 (RULE-008).
다만 프롬프트 원문/내부 추론을 노출하지 않는 형태로 UI/로그를 구성해야 합니다.
```

---

### ✅ RULE-009: 핫스팟 좌표 규약 고정 (0~1000, bbox [ymin,xmin,ymax,xmax])

**AI는 다음을 절대적으로 준수해야 함:**

- 클릭 가능한 오브젝트/핫스팟 좌표는 **정규화 0~1000** 규약을 사용한다.
- bbox 형식은 반드시 **`[ymin, xmin, ymax, xmax]`** 순서다.
- 0~1 좌표계, 로컬 픽셀 좌표, `[x,y,w,h]`/`[x1,y1,x2,y2]` 혼용을 금지한다.

// ❌ AI는 절대로 이렇게 작성하지 말 것

```json
{ "box_2d": [0.12, 0.34, 0.56, 0.78] }              // 0~1
{ "box": [x, y, w, h] }                              // 포맷 불명확/픽셀 기반
```

// ✅ AI는 항상 이렇게 작성할 것

```json
{
  "box_2d": [120, 240, 460, 610]
}
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: 핫스팟 좌표 규약(0~1000, [ymin,xmin,ymax,xmax]) 위반이 있습니다 (RULE-009).
클릭/비전/핫스팟 호환성을 위해 좌표계를 통일해야 합니다.
```

---

### ✅ RULE-010: 버전/스택 고정 — 임의 업그레이드 금지 (추가: 이미지 모델 고정/DB 도입은 문서 합의 전 금지)

**AI는 다음을 절대적으로 준수해야 함:**

- 기술/버전은 `vibe/tech-stack.md`를 SSOT로 고정한다. **“latest라서”** 같은 이유로 업그레이드/교체하지 않는다.
- 스택 교체(예: Vite→Next.js, SSE→WebSocket 강제)나 대규모 의존성 추가는 **근거/영향/롤백**과 함께 문서 업데이트가 선행되어야 한다.
- 이미지 생성/편집 모델 ID는 **`gemini-3-pro-image-preview`로 고정**한다(혼용 금지).
- PRD/Tech-stack에 DB가 명시되지 않은 상태에서 **DB/ORM/SQL 도입은 금지**하며, 저장은 우선 **SaveGame(JSON 직렬화)** 기반으로 한다. (필요 시 먼저 합의/문서 갱신)

// ❌ AI는 절대로 이렇게 작성하지 말 것

```text
- “최신이니까”라는 이유로 버전을 대거 올리거나 프레임워크를 교체
- 이미지 모델을 요청마다 임의 변경
- 문서 합의 없이 DB/ORM/마이그레이션을 도입
```

// ✅ AI는 항상 이렇게 작성할 것

```text
- React/Vite/TS, FastAPI/Pydantic, google-genai 등은 tech-stack 버전으로 고정
- 이미지(생성/편집): gemini-3-pro-image-preview 고정
- 저장/로드: SaveGame(JSON) + version 필드 + 스키마 검증(Pydantic/Zod)
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: 버전/스택 고정 규칙 위반(RULE-010) 가능성이 있습니다.
tech-stack SSOT를 유지하고, 모델 ID/저장 방식/대규모 의존성 변경은 근거와 문서 업데이트를 동반해야 합니다.
```

---

### ✅ RULE-011: 개발 서버 포트 정책 (프론트 8001~8010, 백엔드 8011~8020)

**AI는 다음을 절대적으로 준수해야 함:**

- **프론트엔드(Vite/React)** 개발 서버는 **포트 8001~8010** 범위만 사용한다.
  - 기본 포트: `8001`
  - 충돌 시 8002, 8003, ... 8010까지 사용 가능
- **백엔드(FastAPI/Uvicorn)** 개발 서버는 **포트 8011~8020** 범위만 사용한다.
  - 기본 포트: `8011`
  - 충돌 시 8012, 8013, ... 8020까지 사용 가능
- **금지 포트**: 5173(Vite 기본), 8000(시스템 충돌 잦음), 3000(다른 도구와 충돌)
- CORS 설정, 런북, 문서에서 모두 이 정책을 일관되게 반영해야 한다.

// ❌ AI는 절대로 이렇게 작성하지 말 것

```text
- uvicorn ... --port 8000
- vite dev --port 5173
- 프론트/백엔드가 같은 포트 대역을 사용
```

// ✅ AI는 항상 이렇게 작성할 것

```text
- 프론트엔드: vite dev --port 8001 (또는 8002~8010)
- 백엔드: uvicorn ... --port 8011 (또는 8012~8020)
- CORS 허용 오리진: http://localhost:8001 ~ http://localhost:8010
```

**위반 코드 발견 시 AI의 응답:**

```
⚠️ 경고: 개발 서버 포트 정책 위반이 있습니다 (RULE-011).
프론트엔드는 8001~8010, 백엔드는 8011~8020 포트만 사용해야 합니다.
```

---

## 🔴 비활성화된 규칙 (AI는 무시할 것)

<!--
### ⏸️ RULE-900: (예시) WebSocket만 사용

**AI는 이 규칙을 무시해야 함** (현재 비활성)
- SSE 금지
- 모든 스트리밍은 WebSocket만 허용
-->

---

## ⚙️ AI 동작 방식

### 코드 작성/제안 시

1. **활성 규칙 먼저 확인**
2. **규칙 위반 여부 검증**
3. **위반 시 코드 작성 거부**
4. **대안 제시**

### 기존 코드 분석 시

1. **활성 규칙과 비교**
2. **위반 사항 발견 시 즉시 경고**
3. **수정 방법 제안**
4. **자동 수정 가능 시 수정된 코드 제공**

### 사용자 요청 처리 시

1. **요청이 규칙 위반인지 확인**
2. **위반 시 정중히 거부**
3. **규칙과 이유 설명**
4. **규칙 내에서 가능한 대안 제시**

---

## 🎯 AI 응답 예시

### 규칙 위반 요청 시

**사용자:** Next.js로 바꾸고 React를 최신으로 올려줘

**AI 응답:**

```
죄송하지만 이 프로젝트는 Vite 7 + React 19.2.3으로 버전/스택이 고정되어 있어 임의 전환/업그레이드는 불가합니다 (RULE-010).
원하시는 목표(라우팅/SSR/SEO/성능)를 알려주시면, 현 스택(Vite) 내에서 가능한 대안을 제시하겠습니다.
```

### 위반 코드 발견 시

**AI 응답:**

```
⚠️ Critical Rule 위반 발견

규칙: RULE-005 (잔액 음수 금지 / 원장 일관성)

문제:
- 잔액 체크 없이 Signal을 차감하고 있어 음수로 내려갈 수 있습니다.
- cost/balance_after가 ledger와 일관되지 않을 가능성이 있습니다.

수정 권장:
- 실행 전 예상 비용 제시 + 잔액 부족 시 텍스트-only 폴백
- 커밋 시점 차감 + ledger 기록으로 일관성 보장
```

---

## 🔒 우선순위

```
Critical Rules (이 문서)
    ↓ 최우선
전역 지침
    ↓
세부 지침
    ↓
사용자 요청
```

**충돌 시:**

- Critical Rules이 항상 최우선
- 사용자가 규칙 위반 요청해도 거부
- 명시적 설명과 대안 제시

---

**AI는 매 응답 전 이 문서를 참조하여 규칙 준수 여부를 확인해야 합니다.**

---
