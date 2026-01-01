# AI 에이전트 프로젝트 지침: Unknown World

## 0. 상위 컨텍스트 인지

> **[중요]** 이 지침은 사용자의 전역 지침(`~/.gemini/GEMINI.md`)을 상속받아 이 프로젝트에 맞게 확장(override)합니다.
>
> **[Windows 주의]** 본 레포는 Windows 환경을 포함합니다. 문서에서 `.gemini/rules/*.md` 표기는 “글롭(glob) 표기”로만 사용하고, 실제 파일 경로는 `.gemini/rules/<file>.md`를 사용합니다. (Windows 파일/폴더명에 `*` 사용 불가)

## 1. 프로젝트 개요

Unknown World는 Gemini 기반의 **에이전트형(Game Master) 세계 엔진**과 멀티모달(텍스트·이미지·비전) 파이프라인을 결합한 **무한 생성 로그라이크 내러티브 웹게임**입니다.  
“대화 앱”이 아니라 **상태를 가진 시스템**이며, 출력은 내러티브 텍스트뿐 아니라 **UI/상태 변화/비용/이미지 작업**까지 포함한 **구조화 결과(JSON Schema)** 여야 합니다.

## 2. 핵심 원칙 (Core Principles)

<core_principles>
- **원칙 1 — Prompt-only wrapper 금지**: 프롬프트 1장 + 채팅 UI로 끝내지 말고, 반드시 State/Orchestrator/Artifacts를 갖춘다.
- **원칙 2 — 채팅 UX 금지, 게임 UI 고정**: 채팅 버블/메신저 UI로 보이게 만들지 않는다. Action Deck/Inventory(DnD)/Quest/Rule Board/Economy HUD/Memory Pin/Scene Canvas/Agent Console이 “항상 화면에 존재”해야 한다.
- **원칙 3 — 구조화 출력(JSON Schema) 우선**: 서버는 `application/json` + JSON Schema(부분집합)로 TurnOutput을 강제하고, 클라이언트(Zod) + 서버(Pydantic) 이중 검증을 기본으로 한다.
- **원칙 4 — 검증/복구(Repair loop) 필수**: 스키마 불일치/비용 초과/안전 차단/이미지 실패는 자동 복구 루프로 처리하고, 복구 실패 시에도 안전한 폴백을 제공한다.
- **원칙 5 — 비용/지연은 게임 메커닉으로 제어**: 행동 전에 예상 비용(최소/최대)을 노출하고, 부족 시 대체 행동(텍스트-only/저해상도/Thinking 낮춤)을 제공한다. 잔액 음수는 금지.
- **원칙 6 — ko/en i18n 정책 준수**: `language: "ko-KR" | "en-US"`를 기준으로 턴 입력/출력을 고정하고 혼합 출력 금지. UI 문자열은 i18n 키를 사용한다.
- **원칙 7 — 보안/운영**: Vertex AI 서비스 계정 기반 인증(백엔드 전용). 비밀정보(키/토큰) 커밋·노출 금지. BYOK(사용자 API 키 입력) 요구 금지.
- **원칙 8 — 관측 가능성(Observability) = UX**: Plan/Queue/Badges/Auto-repair 트레이스를 “사용자 친화 라벨”로 보여주되, 프롬프트 원문/내부 추론(CoT)은 노출하지 않는다.
</core_principles>

## 3. 일반 규칙 (General Rules)

<general_rules>
- **SSOT 우선순위**: `vibe/prd.md` > `vibe/tech-stack.md` > `vibe/ref/*` > (그 외 문서/규칙). 충돌 시 추측하지 말고 상위 문서 기준으로 정리한다.
- **모델/버전 고정**: 모델 ID/의존성 버전은 `vibe/tech-stack.md` 기준으로 고정한다(변경 필요 시 문서도 동기화).
- **하드 게이트 불변조건 유지**: `Schema OK`, `Economy OK`, `Safety OK`, `Consistency OK`를 항상 만족하도록 설계한다.
- **좌표 규약 고정**: bbox/핫스팟은 `0~1000` 정규화 + `[ymin,xmin,ymax,xmax]` 포맷을 유지한다.
- **프롬프트는 파일로 관리**: 프롬프트 원문은 백엔드 `.md` 파일로 관리하고(언어별 분리 권장), UI/로그에는 원문을 노출하지 않는다.
</general_rules>

## 4. 금지사항 (Prohibitions)

<prohibitions>
- ❌ **채팅 버블/메신저 UX**로 회귀시키는 변경
- ❌ **구조화 출력 없이 텍스트만** 반환하는 핵심 API/로직(특수한 폴백을 제외하고도 “스키마 준수”가 기본)
- ❌ **프롬프트 원문/내부 추론/비밀정보**를 UI 또는 로그로 노출
- ❌ **BYOK(사용자 API 키 입력)** 요구
- ❌ 재화 잔액 **음수** / 비용 누락 / 예상 비용 미표기
- ❌ **ko/en 혼합 출력**
- ❌ 좌표 규약(0~1000, bbox `[ymin,xmin,ymax,xmax]`) 위반
</prohibitions>

## 5. 모듈별 세부 규칙 (Contextual Imports)

> **[중요]** 아래 키워드가 작업 요청(프롬프트)에 포함되면, 해당 모듈 규칙을 적용합니다.  
> 각 섹션의 키워드 리스트는 임포트되는 파일 상단의 **[적용 컨텍스트]**와 1:1로 일치합니다.

### 프론트엔드(Game UI) 작업 시 [frontend, ui, react, vite, typescript, zustand, dnd, hotspot, canvas, inventory, action-deck, quest, rule-board, agent-console, crt, css, *.ts, *.tsx, *.css]
<!-- Imported from: .gemini/rules/frontend-ui-rules.md -->
# 프론트엔드(Game UI) 세부 지침

> **[적용 컨텍스트]**: frontend, ui, react, vite, typescript, zustand, dnd, hotspot, canvas, inventory, action-deck, quest, rule-board, agent-console, crt, css, *.ts, *.tsx, *.css
> 
> **[설명]**: 채팅 앱으로 보이지 않게 “게임 UI + 상호작용(핫스팟/드래그/덱/콘솔)”을 고정하고, TurnOutput(JSON) 기반으로 렌더링한다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “프론트엔드(Game UI)” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 채팅 버블 UI 금지, 고정 레이아웃(게임 HUD) 유지

**설명**: PRD의 하드 게이트는 “챗봇 래퍼가 아닌 게임 시스템”이다. 텍스트는 채팅이 아니라 게임 로그/내레이션 피드로 보이게 한다.

**올바른 예시 (Do ✅)**:
```
- Header: Seed / Language Toggle / Theme Toggle / Economy HUD / 연결상태(로딩/TTFB)
- Center: Scene Canvas(이미지) + Hotspot Overlay + Hover tooltip
- Side: Inventory(DnD) / Quest / Rule Board / Memory Pin / Scanner Slot(이미지 드랍) / Agent Console(Plan·Queue·Badges)
- Footer: Action Deck(3~6 cards, cost/risks/rewards) + (선택) 커스텀 커맨드 입력
```

**잘못된 예시 (Don't ❌)**:
```
- 대화 말풍선(assistant/user) 타임라인이 화면의 핵심 UI
- 선택지를 채팅 메시지 버튼으로만 표시
```

### 규칙 2: 상호작용은 "클릭 + 드래그 + 업로드"가 눈에 보이게

**설명**: 심사자가 “대화”가 아니라 “조작”을 보도록, 클릭/드래그/스캐너 슬롯이 항상 동작해야 한다.

**올바른 예시 (Do ✅)**:
```
- Hotspot 클릭: object_id + box_2d(0~1000) 기반으로 상호작용 트리거
- Inventory DnD: 아이템을 Scene 오브젝트 위로 드랍하여 사용/조합
- Scanner Dropzone: 이미지 드랍/업로드 → 단서/아이템화 결과를 인벤토리에 반영
```

**잘못된 예시 (Don't ❌)**:
```
- "드래그해서 사용"은 텍스트로만 안내하고 실제 UI는 없음
- Hotspot이 DOM에서 보이지 않거나 클릭 불가능
```

### 규칙 3: 좌표/핫스팟은 0~1000 정규화 좌표계를 끝까지 유지

**설명**: PRD는 bbox 포맷과의 호환을 요구한다. 프론트는 렌더링 시점에만 실제 픽셀로 변환한다.

**올바른 예시 (Do ✅)**:
```
- 서버/세이브: box_2d = [ymin, xmin, ymax, xmax] (0~1000)
- 렌더: viewport_w/h에 맞춰 box_2d를 px로 변환 후 overlay 그리기
```

**잘못된 예시 (Don't ❌)**:
```
- 서버가 px 좌표(예: 142, 87, 220, 160)를 직접 반환
- bbox 순서를 [xmin,ymin,xmax,ymax]로 바꿔버림
```

### 규칙 4: CRT 테마는 CSS 변수 기반(단일 CSS)으로 유지

**설명**: 색/테마는 컴포넌트별 임의 설정 금지. scanline/overlay는 상호작용을 방해하지 않게 한다.

**올바른 예시 (Do ✅)**:
```
- data-theme="dark|light" 토글 + CSS 변수로만 색상 제어
- CRT overlay는 pointer-events: none
- 텍스트는 text-shadow로 글로우 적용
```

**잘못된 예시 (Don't ❌)**:
```
- 컴포넌트별로 임의의 HEX 컬러 하드코딩
- scanline overlay가 클릭/드래그를 가로챔
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 접근성(가독성) 문제**: CRT 효과(글로우/스캔라인)를 약화할 수 있으나, 레이아웃/채팅 금지 원칙은 유지한다.
</exceptions>

## 3. 체크리스트

- [ ] 화면에 Action Deck / Inventory(DnD) / Quest / Rule Board / Economy HUD / Memory Pin / Scanner Slot / Agent Console이 존재한다
- [ ] Scene Canvas + Hotspot Overlay가 존재한다
- [ ] 채팅 버블 UI가 없다 (내레이션은 로그 피드)
- [ ] Hotspot box_2d는 [ymin,xmin,ymax,xmax] + 0~1000 정규화 규약을 지킨다
- [ ] 테마는 CSS 변수 기반이며, overlay는 pointer-events: none이다
<!-- End of import from: .gemini/rules/frontend-ui-rules.md -->

### 백엔드(오케스트레이터) 작업 시 [backend, fastapi, python, sse, streaming, orchestrator, uvicorn, pydantic, vertex, service-account, *.py]
<!-- Imported from: .gemini/rules/backend-orchestrator-rules.md -->
# 백엔드(오케스트레이터) 세부 지침

> **[적용 컨텍스트]**: backend, fastapi, python, sse, streaming, orchestrator, uvicorn, pydantic, vertex, service-account, *.py
> 
> **[설명]**: FastAPI(async) + SSE 스트리밍으로 TurnOutput(JSON Schema) 생성 파이프라인과 검증/복구/비용 제어를 구현한다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “백엔드(오케스트레이터)” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: SSE는 "타자 효과 + 단계(Queue/Badges)"를 모두 스트리밍한다

**설명**: PRD는 내러티브 스트리밍뿐 아니라 Parse→Validate→…→Commit의 진행 상황을 UI에 보여 “오케스트레이션”을 증명해야 한다.

**올바른 예시 (Do ✅)**:
```
event: stage
data: {"name":"Parse","status":"start"}

event: stage
data: {"name":"Validate","status":"ok","badges":{"schema":"ok","economy":"ok","safety":"ok","consistency":"ok"}}

event: final
data: { ... TurnOutput JSON ... }
```

**잘못된 예시 (Don't ❌)**:
```
- 모든 응답을 마지막에만 한번에 반환(스트리밍/단계 이벤트 없음)
- 검증/복구 흔적이 UI로 전달되지 않음
```

### 규칙 2: 출력은 항상 Structured Output(JSON Schema) 기반 + 서버(Pydantic) 검증

**설명**: 프론트가 파싱 가능한 TurnOutput을 받도록 `application/json` + schema 강제와 이중 검증을 기본값으로 한다.

**올바른 예시 (Do ✅)**:
```
- model 호출 시 response_mime_type=application/json + response_json_schema
- 최종 텍스트를 Pydantic으로 model_validate_json
- 실패 시 repair loop로 재요청(최대 N회)
```

**잘못된 예시 (Don't ❌)**:
```
- free-form 텍스트를 프론트에서 regex로 파싱
- 스키마 실패 시 예외로 SSE 연결을 끊어버림
```

### 규칙 3: Repair loop는 "스키마 + 비즈니스 룰(재화/언어/좌표)" 모두를 복구 대상에 포함

**설명**: “JSON은 맞는데 재화가 음수” 같은 경우도 실패로 보고 복구/폴백이 필요하다.

**올바른 예시 (Do ✅)**:
```
- 스키마 검증 → 비즈니스 룰 검증(잔액 음수 금지, 언어 혼합 금지, bbox 규약 등)
- 실패 시 Auto-repair #n 이벤트 송출 + 재요청
- 복구 실패 시 안전한 폴백 TurnOutput(스키마 준수) 반환
```

**잘못된 예시 (Don't ❌)**:
```
- 스키마만 맞으면 그대로 커밋
- 실패 시 "500 Internal Server Error"로 끝냄
```

### 규칙 4: 인증은 Vertex 서비스 계정(백엔드 전용), 비밀정보/키 노출 금지

**올바른 예시 (Do ✅)**:
```
- Vertex AI 서비스 계정으로 인증(백엔드 런타임에서만)
- 키/토큰/쿠키를 레포에 커밋하지 않음
- 로그에 credential 값을 출력하지 않음
```

**잘못된 예시 (Don't ❌)**:
```
- 사용자에게 API 키 입력(BYOK) 요구
- 프론트에 키를 전달/저장
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 이미지 생성 실패**: 텍스트 우선 결과를 유지하고, `render.image_job.should_generate=false`로 폴백하거나, 경제/정책이 허용하면 재시도한다.
</exceptions>

## 3. 체크리스트

- [ ] SSE로 stage/queue/badges를 스트리밍한다
- [ ] TurnOutput은 JSON Schema 기반이며 Pydantic 검증을 통과한다
- [ ] schema 실패뿐 아니라 economy/safety/consistency 실패도 repair loop로 처리한다
- [ ] Vertex 서비스 계정 인증이며 BYOK/비밀정보 노출이 없다
<!-- End of import from: .gemini/rules/backend-orchestrator-rules.md -->

### 구조화 출력/스키마 작업 시 [structured-output, structured-outputs, json-schema, schema, zod, pydantic, validation, parsing]
<!-- Imported from: .gemini/rules/structured-output-rules.md -->
# 구조화 출력(Structured Outputs) 세부 지침

> **[적용 컨텍스트]**: structured-output, structured-outputs, json-schema, schema, zod, pydantic, validation, parsing
> 
> **[설명]**: TurnOutput을 JSON Schema(지원되는 부분집합)로 강제하고, 스트리밍/검증/호환성을 안정적으로 운영한다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “구조화 출력/스키마” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 스키마는 "짧고 평평하게(flat)" + required/enum 적극 활용

**설명**: Gemini structured outputs는 JSON Schema의 부분집합만 지원하며, 과도한 중첩/제약은 실패율을 높인다.

**올바른 예시 (Do ✅)**:
```
- required 키를 명확히 지정
- 분기 값은 enum으로 제한
- 필요 시 additionalProperties: false로 엄격화
```

**잘못된 예시 (Don't ❌)**:
```
- 깊은 중첩(3~4단 이상) + 복잡한 anyOf/oneOf 남발
- 필수 키가 없거나 의미가 불명확한 옵션 필드만 가득
```

### 규칙 2: 서버(Pydantic) + 클라이언트(Zod) 이중 검증을 기본으로 설계

**올바른 예시 (Do ✅)**:
```
- 서버: Pydantic model_validate_json로 최종 JSON 검증
- 클라: Zod parse로 렌더 전 검증
- 실패 시: repair loop 또는 safe fallback
```

**잘못된 예시 (Don't ❌)**:
```
- "모델이 맞게 주겠지" 가정하고 검증 생략
```

### 규칙 3: 스트리밍 structured output은 "partial JSON 문자열 누적" 기반으로 처리

**설명**: 스트리밍 청크는 “유효한 partial JSON 문자열”이므로, 누적 후 최종 파싱을 수행한다.

**올바른 예시 (Do ✅)**:
```
- chunk.text를 순서대로 누적
- 최종 완성 시점에만 JSON 파싱/검증
- 누적 중에는 UI에 stage/토큰(내러티브)만 업데이트(선택)
```

**잘못된 예시 (Don't ❌)**:
```
- 매 chunk마다 JSON.parse를 시도하여 오류 스팸/지연 유발
```

### 규칙 4: 스키마 준수 + 의미 준수는 다르다 → 비즈니스 룰 검증을 별도로 둔다

**올바른 예시 (Do ✅)**:
```
- schema OK 이후: economy(잔액 음수 금지), i18n(언어 혼합 금지), bbox(0~1000/순서) 검증
```

**잘못된 예시 (Don't ❌)**:
```
- JSON만 맞으면 커밋(경제/안전/일관성 붕괴)
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 긴 컨텐츠 필요**: 스키마를 크게 만들기보다, `narrative`는 길어져도 되게 두고(스트리밍), 구조 필드는 평평하게 유지한다.
</exceptions>

## 3. 체크리스트

- [ ] 스키마는 JSON Schema 부분집합에서 동작하도록 단순화되어 있다
- [ ] 서버(Pydantic) + 클라(Zod) 이중 검증이 있다
- [ ] 스트리밍은 partial JSON 누적 후 최종 파싱한다
- [ ] 스키마 통과 후 비즈니스 룰 검증/복구 루프가 있다
<!-- End of import from: .gemini/rules/structured-output-rules.md -->

### 재화/비용/원장(Economy) 작업 시 [economy, cost, ledger, signal, memory-shard, budget, pricing, balance]
<!-- Imported from: .gemini/rules/economy-rules.md -->
# 재화/비용/원장(Economy) 세부 지침

> **[적용 컨텍스트]**: economy, cost, ledger, signal, memory-shard, budget, pricing, balance
> 
> **[설명]**: Signal/Memory Shard 재화로 비용과 지연을 제어하고, 원장(ledger)으로 추적 가능하게 만든다. 잔액 음수는 금지다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “재화/비용/원장” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 모든 행동에는 "예상 비용(최소/최대) + 확정 비용 + balance_after"가 있어야 한다

**설명**: 비용/지연을 UX/게임 메커닉으로 전환하는 것이 핵심이다.

**올바른 예시 (Do ✅)**:
```
- action_card: { cost_estimate: {signal_min, signal_max, shard_min, shard_max}, ... }
- turn_output.economy: { cost: {...}, balance_after: {...} }
```

**잘못된 예시 (Don't ❌)**:
```
- 비용 표기 없이 이미지 생성/Thinking High 실행
- balance_after 없이 "차감됨" 텍스트만 출력
```

### 규칙 2: 원장(ledger)은 "이유/근거"까지 남기되, 잔액 음수는 절대 허용하지 않는다

**올바른 예시 (Do ✅)**:
```
ledger_entry = {
  turn_id, action_id,
  cost: {signal, memory_shard},
  balance_before, balance_after,
  reason: "image_generation_2k" | "text_turn" | "repair_retry",
  model_label: "FAST" | "QUALITY" | "REF"
}
```

**잘못된 예시 (Don't ❌)**:
```
- ledger 없이 현재 잔액만 갱신
- 부족한데도 실행하고 음수로 내려감
```

### 규칙 3: 잔액 부족 시 "대체 행동"을 반드시 제공한다

**설명**: 부족하면 막는 게 아니라 “텍스트-only/저해상도/이미지 생략/Thinking 낮춤” 등 대안을 제안해야 한다.

**올바른 예시 (Do ✅)**:
```
- "이미지 생성 없이 진행" 카드 제공
- "1K로 낮춰 생성" / "편집 1회로 제한" 같은 정책 기반 대안
```

**잘못된 예시 (Don't ❌)**:
```
- "재화가 부족합니다"로 끝(플레이 중단)
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 비용 추정 불가**: 최소한 상한(최대) 기준으로 보수적으로 안내하고, 실행 전 확인/대안을 제공한다.
</exceptions>

## 3. 체크리스트

- [ ] 행동 전 cost_estimate(최소/최대)가 노출된다
- [ ] turn_output에 cost + balance_after가 포함된다
- [ ] ledger가 남고 잔액 음수는 불가능하다
- [ ] 부족 시 대체 행동이 항상 제공된다
<!-- End of import from: .gemini/rules/economy-rules.md -->

### 이미지/비전/멀티모달 작업 시 [image, image-generation, image-edit, multimodal, vision, bbox, segmentation, files-api, reference-image, gemini-3-pro-image-preview]
<!-- Imported from: .gemini/rules/image-rules.md -->
# 이미지/비전(멀티모달) 세부 지침

> **[적용 컨텍스트]**: image, image-generation, image-edit, multimodal, vision, bbox, segmentation, files-api, reference-image, gemini-3-pro-image-preview
> 
> **[설명]**: 텍스트 우선 + (조건부) 이미지 생성/편집 + bbox 규약을 결합해 “클릭 가능한 장면”을 만든다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “이미지/비전/멀티모달” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 이미지는 선택적(conditional)이며, 텍스트는 항상 먼저(스트리밍) 제공한다

**설명**: 이미지 생성 지연이 UX를 망치지 않도록 텍스트 우선 + Lazy loading을 기본값으로 둔다.

**올바른 예시 (Do ✅)**:
```
- narrative는 즉시 스트리밍
- render.image_job.should_generate는 정책/재화/중요 장면에서만 true
- 이미지 실패 시 텍스트-only 폴백 + (선택) 재시도
```

**잘못된 예시 (Don't ❌)**:
```
- 매 턴 이미지 생성이 기본값
- 이미지가 끝날 때까지 텍스트도 대기
```

### 규칙 2: 이미지 모델/ID는 고정한다

**설명**: PRD/tech-stack은 이미지 생성/편집 모델을 고정한다.

**올바른 예시 (Do ✅)**:
```
- image generation/edit: gemini-3-pro-image-preview
```

**잘못된 예시 (Don't ❌)**:
```
- 모델 ID를 임의로 변경하거나 프롬프트로만 "고품질"을 해결하려 함
```

### 규칙 3: bbox/핫스팟 좌표는 0~1000 정규화 + [ymin,xmin,ymax,xmax] 고정

**올바른 예시 (Do ✅)**:
```
box_2d: [120, 80, 260, 210]  // 0~1000
```

**잘못된 예시 (Don't ❌)**:
```
box_2d: [80, 120, 210, 260]   // 순서 바뀜
box_2d: [12, 8, 26, 21]       // 0~1000 아닌 0~100처럼 축소
```

### 규칙 4: 프롬프트는 "키워드 나열" 대신 장면 서술(semantic negative prompt) 중심

**올바른 예시 (Do ✅)**:
```
- 원하는 장면을 긍정적으로 서술(구도/조명/시점 포함)
- "하지 마" 나열 대신, "무엇을 보여줄지"를 구체화
```

**잘못된 예시 (Don't ❌)**:
```
- 금지어/부정 프롬프트만 길게 나열
- 장면 정보 없이 스타일 단어만 나열
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 큰 파일/재사용**: 20MB 제한을 넘거나 재사용이 필요하면 Files API 업로드 + URI 참조를 사용한다.
</exceptions>

## 3. 체크리스트

- [ ] 텍스트는 항상 먼저(스트리밍) 나온다
- [ ] image_job은 정책/재화 조건에서만 생성되며, 실패 시 폴백이 있다
- [ ] bbox 규약(0~1000, [ymin,xmin,ymax,xmax])을 지킨다
- [ ] 이미지 모델 ID는 `gemini-3-pro-image-preview`로 고정한다
<!-- End of import from: .gemini/rules/image-rules.md -->

### i18n/프롬프트 작업 시 [i18n, ko-KR, en-US, localization, prompt, prompts, prompt-version, policy-preset, react-i18next, i18next]
<!-- Imported from: .gemini/rules/i18n-prompt-rules.md -->
# i18n/프롬프트 세부 지침

> **[적용 컨텍스트]**: i18n, ko-KR, en-US, localization, prompt, prompts, prompt-version, policy-preset, react-i18next, i18next
> 
> **[설명]**: ko/en 혼합 출력 금지, 프롬프트 파일 분리/버저닝, UI 문자열 i18n 키 사용을 강제한다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “i18n/프롬프트” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 언어는 TurnInput.language를 따르고, 턴 출력도 동일 언어로 고정한다

**올바른 예시 (Do ✅)**:
```
TurnInput.language = "ko-KR"  -> TurnOutput.language = "ko-KR"
TurnInput.language = "en-US"  -> TurnOutput.language = "en-US"
```

**잘못된 예시 (Don't ❌)**:
```
- 한 턴 안에서 ko/en 문장이 섞임
- UI는 ko인데 내러티브는 en(또는 반대)
```

### 규칙 2: 프롬프트 원문은 백엔드 `.md` 파일로 관리하고(언어별 분리 권장), UI에 노출하지 않는다

**올바른 예시 (Do ✅)**:
```
backend/prompts/system/game_master.ko.md
backend/prompts/system/game_master.en.md
backend/prompts/turn/turn_output_instructions.ko.md
backend/prompts/turn/turn_output_instructions.en.md
```

**잘못된 예시 (Don't ❌)**:
```
- 프롬프트를 코드 문자열로 하드코딩
- UI/로그에 프롬프트 전문을 출력
```

### 규칙 3: 프롬프트/정책은 버저닝하고 메타를 응답/로그에 남긴다(원문은 제외)

**올바른 예시 (Do ✅)**:
```
- prompt_version, policy_preset, model_label(FAST/QUALITY/REF) 메타를 기록
```

**잘못된 예시 (Don't ❌)**:
```
- 어떤 프롬프트/정책으로 생성했는지 추적 불가
```

### 규칙 4: 프론트 UI 문자열은 i18n 키 사용(하드코딩 금지)

**올바른 예시 (Do ✅)**:
```
t("hud.signal") / t("actionDeck.execute") 처럼 키 기반
```

**잘못된 예시 (Don't ❌)**:
```
"실행" / "Signal" 같은 문자열을 컴포넌트에 직접 작성
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 프로토타입/스파이크**: 임시로 하드코딩이 필요해도, PR로 병합하기 전 i18n 키로 정리한다.
</exceptions>

## 3. 체크리스트

- [ ] TurnInput.language와 TurnOutput.language가 항상 일치한다
- [ ] ko/en 혼합 출력이 없다
- [ ] 프롬프트는 `.md` 파일로 관리되고 원문이 UI에 노출되지 않는다
- [ ] UI 문자열은 i18n 키로 렌더링한다
<!-- End of import from: .gemini/rules/i18n-prompt-rules.md -->

### 관측/리플레이/오토파일럿 작업 시 [observability, agent-console, autopilot, action-queue, badges, ttfb, metrics, replay, scenario, demo-mode, demo-profile, preset]
<!-- Imported from: .gemini/rules/observability-replay-rules.md -->
# 관측(Observability) / 리플레이(Replay) 세부 지침

> **[적용 컨텍스트]**: observability, agent-console, autopilot, action-queue, badges, ttfb, metrics, replay, scenario, demo-mode, demo-profile, preset
> 
> **[설명]**: “에이전트형 시스템”임을 증명하기 위해 Plan/Queue/Badges/Auto-repair 트레이스를 UI/아티팩트로 남긴다(프롬프트/CoT는 제외).
>
> **[참조]**: `.gemini/GEMINI.md`의 “관측/리플레이/오토파일럿” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: Agent Console은 결과가 아니라 "과정(단계/큐/배지)"를 보여준다

**올바른 예시 (Do ✅)**:
```
Queue: Parse → Validate → Plan → Resolve → Render → Verify → Commit
Badges: Schema OK / Economy OK / Safety OK / Consistency OK
Auto-repair: #1/#2... (시도/결과)
```

**잘못된 예시 (Don't ❌)**:
```
- 내러티브만 보여주고 시스템 단계/검증은 숨김
```

### 규칙 2: Demo Mode에서 “프롬프트 원문”은 숨기고, 사용자 친화 라벨만 노출한다

**올바른 예시 (Do ✅)**:
```
- FAST / QUALITY / CHEAP / REF 같은 라벨로 선택 이유를 표시
- prompt_version/policy_preset 같은 메타는 숫자/코드로만 노출
```

**잘못된 예시 (Don't ❌)**:
```
- 시스템 프롬프트 전문을 디버그 패널에 표시
```

### 규칙 3: 리플레이/시나리오 하네스는 "액션 시퀀스 + 인바리언트" 중심

**올바른 예시 (Do ✅)**:
```
scenario = {
  seed,
  actions: [text|click|drag|upload ...],
  invariants: ["schema_valid", "economy_non_negative", "safety_fallback_present"]
}
```

**잘못된 예시 (Don't ❌)**:
```
- 리플레이가 없어서 회귀(regression)를 감지할 수 없음
```

### 규칙 4: 심사자용 데모 프로필(프리셋 유저) 3종 + 즉시 리셋을 제공한다

**설명**: PRD는 “회원가입/설정/대기” 없이 10분 안에 핵심 기능을 보여주기 위해 데모 프로필을 필수로 요구한다.

**올바른 예시 (Do ✅)**:
```
- 첫 화면: Demo Profile 선택 (Narrator / Explorer / Tech Enthusiast)
- 로그인/가입 없이 즉시 시작
- Reset 버튼 1회로 초기 상태 복구(데모 반복 가능)
- 데모 프로필은 demo/staging에서만 활성화(운영 비활성)
```

**잘못된 예시 (Don't ❌)**:
```
- 회원가입/로그인/설정 완료 후에야 플레이 가능
- 리셋이 없어 데모 재시작이 느림
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 비결정성**: LLM 결과 텍스트는 달라도, 스키마/재화/안전/좌표 규약 같은 인바리언트는 항상 만족해야 한다.
</exceptions>

## 3. 체크리스트

- [ ] Queue/Badges/Auto-repair가 UI에서 확인 가능하다
- [ ] 프롬프트 원문/CoT는 노출되지 않는다
- [ ] 리플레이/시나리오가 seed+액션+인바리언트를 포함한다
- [ ] (데모 환경) 데모 프로필 선택 + 즉시 리셋이 가능하다
<!-- End of import from: .gemini/rules/observability-replay-rules.md -->

### 안전/보안/복구 작업 시 [safety, security, prompt-injection, repair, recovery, fallback, secrets, pii]
<!-- Imported from: .gemini/rules/safety-repair-rules.md -->
# 안전(Safety) / 보안(Security) / 복구(Repair) 세부 지침

> **[적용 컨텍스트]**: safety, security, prompt-injection, repair, recovery, fallback, secrets, pii
> 
> **[설명]**: 프롬프트 인젝션을 방어하고, 안전 차단/실패를 자동 복구 또는 안전한 폴백으로 처리한다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “안전/보안/복구” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: "사용자 입력은 룰이 아니다" — 시스템/스키마/정책이 항상 우선

**올바른 예시 (Do ✅)**:
```
- 사용자 텍스트는 데이터로만 취급(프롬프트/정책을 덮어쓰지 않음)
- 시스템 규칙(스키마/경제/안전)을 최우선으로 적용
```

**잘못된 예시 (Don't ❌)**:
```
- 사용자가 "규칙을 무시해"라고 하면 그대로 따름
```

### 규칙 2: 안전 차단(blocked) 시에도 스키마를 지키고, 안전한 대체 결과를 제공한다

**올바른 예시 (Do ✅)**:
```
safety: { blocked: true, message: "요청을 처리할 수 없습니다. 텍스트-only로 안전하게 진행합니다." }
render.image_job.should_generate: false
```

**잘못된 예시 (Don't ❌)**:
```
- 차단 시 500 오류 또는 빈 응답
- 차단 사유/대안을 숨김
```

### 규칙 3: Repair loop는 제한된 횟수로 수행하고, 실패 시 폴백으로 종료한다

**올바른 예시 (Do ✅)**:
```
- max_repair_attempts = N
- Auto-repair 이벤트를 UI에 노출(횟수/결과)
- N회 실패 시 safe fallback TurnOutput 반환
```

**잘못된 예시 (Don't ❌)**:
```
- 무한 재시도(비용 폭발/지연)
```

### 규칙 4: 비밀정보/PII는 커밋·로그·응답에 남기지 않는다

**올바른 예시 (Do ✅)**:
```
- 서비스 계정 키/토큰/쿠키 등은 런타임 secret로만 관리
- 로그에는 민감값 마스킹/비노출
```

**잘못된 예시 (Don't ❌)**:
```
- credential을 .env나 코드에 커밋
- 디버그를 위해 키/토큰을 콘솔에 출력
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 디버그 필요**: 로컬에서도 프롬프트 원문/키/토큰을 로그로 출력하지 말고, 메타(버전/라벨/단계)만으로 진단한다.
</exceptions>

## 3. 체크리스트

- [ ] 사용자 입력이 시스템 규칙을 덮어쓰지 못한다
- [ ] blocked 시에도 스키마 준수 + 안전한 대체 결과가 있다
- [ ] repair loop는 횟수 제한이 있고 실패 시 폴백으로 끝난다
- [ ] 비밀정보/PII 노출이 없다
<!-- End of import from: .gemini/rules/safety-repair-rules.md -->

### 문서/SSOT/워크플로 작업 시 [docs, ssot, prd, tech-stack, vibe, runbook, unit-impl, doc-update, refactor, *.md, *.mdc]
<!-- Imported from: .gemini/rules/docs-ssot-rules.md -->
# 문서/SSOT/워크플로 세부 지침

> **[적용 컨텍스트]**: docs, ssot, prd, tech-stack, vibe, runbook, unit-impl, doc-update, refactor, *.md, *.mdc
> 
> **[설명]**: PRD/tech-stack을 SSOT로 유지하고, 구현/문서/런북을 동기화한다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “문서/SSOT/워크플로” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 문서 충돌 시 SSOT 우선순위를 적용하고, 불확실하면 질문한다

**올바른 예시 (Do ✅)**:
```
vibe/prd.md > vibe/tech-stack.md > vibe/ref/* > 기타
```

**잘못된 예시 (Don't ❌)**:
```
- 상충하는데도 추측으로 진행
```

### 규칙 2: “지침/가이드”는 실행 가능한 체크리스트 + 재현 가능한 런북을 포함한다

**올바른 예시 (Do ✅)**:
```
- unit-runbook에 수동 검증 시나리오(클릭/드래그/업로드/엔딩) 기록
- 실패/복구 케이스도 포함
```

**잘못된 예시 (Don't ❌)**:
```
- 추상적인 문장만 있고 재현 방법이 없음
```

### 규칙 3: 변경이 모델/버전/정책에 영향을 주면 문서도 함께 업데이트한다

**올바른 예시 (Do ✅)**:
```
- 모델 ID/버전/의존성 변경 시 vibe/tech-stack.md 동기화
```

**잘못된 예시 (Don't ❌)**:
```
- 코드만 바꾸고 문서 SSOT는 오래된 상태로 방치
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 실험(스파이크)**: 실험 브랜치에서는 문서 업데이트를 생략할 수 있으나, 병합 전 반드시 SSOT 동기화한다.
</exceptions>

## 3. 체크리스트

- [ ] SSOT 충돌이 없고, 있으면 상위 문서 기준으로 정리했다
- [ ] 런북(재현 가능한 수동 검증 시나리오)이 있다
- [ ] 모델/버전/정책 변경 시 문서가 함께 업데이트되었다
<!-- End of import from: .gemini/rules/docs-ssot-rules.md -->

### Git/커밋 작업 시 [git, commit, branching, pr, changelog]
<!-- Imported from: .gemini/rules/commit-rules.md -->
# Git/커밋 메시지 세부 지침

> **[적용 컨텍스트]**: git, commit, branching, pr, changelog
> 
> **[설명]**: 커밋 메시지를 일관된 포맷으로 작성해 변경 의도/범위를 추적 가능하게 한다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “Git/커밋” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 커밋 메시지는 한국어로, 변경 의도 + 범위 + 근거를 남긴다

**올바른 예시 (Do ✅)**:
```
feat: TurnOutput 스키마 검증/복구 루프 추가

- Pydantic 검증 실패 시 Auto-repair #1~#3 재시도
- 실패 시 안전 폴백(TurnOutput 스키마 준수) 반환

Progress:
- (roadmap 연동 항목이 없으면 수치 임의 작성 금지 — 필요 시 보류/질문)
```

**잘못된 예시 (Don't ❌)**:
```
update
fix stuff
```

### 규칙 2: PRD 하드 게이트에 영향을 주는 변경은 메시지에 명시한다

**올바른 예시 (Do ✅)**:
```
- Schema OK / Economy OK / Safety OK / Consistency OK 영향 여부를 설명
```

**잘못된 예시 (Don't ❌)**:
```
- UI를 채팅처럼 바꿔놓고도 메시지에 숨김
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: WIP 커밋**: 로컬 작업 중 WIP는 가능하나, PR 병합 전에는 의미 있는 메시지로 정리한다.
</exceptions>

## 3. 체크리스트

- [ ] 커밋 메시지가 한국어이며 변경 의도/범위를 설명한다
- [ ] 하드 게이트 영향이 있으면 명시했다
- [ ] Progress 블록 수치를 임의로 만들지 않았다(필요 시 보류/질문)
<!-- End of import from: .gemini/rules/commit-rules.md -->

## 5.1. 작업별 동적 지침 로딩 (AI-instructed Dynamic Loading)

> **[중요]** 아래 트리거가 작업 요청에 포함되면, 해당 파일을 우선 열어(또는 읽어) 규칙을 적용합니다.

<dynamic_loading_rules>
- **[트리거: "frontend" | "ui" | "react" | "dnd" | "hotspot" | "action-deck"]**: `.gemini/rules/frontend-ui-rules.md`
- **[트리거: "backend" | "fastapi" | "sse" | "streaming" | "orchestrator"]**: `.gemini/rules/backend-orchestrator-rules.md`
- **[트리거: "json-schema" | "structured-output" | "zod" | "pydantic"]**: `.gemini/rules/structured-output-rules.md`
- **[트리거: "economy" | "ledger" | "signal" | "memory-shard" | "cost"]**: `.gemini/rules/economy-rules.md`
- **[트리거: "image" | "vision" | "bbox" | "reference-image"]**: `.gemini/rules/image-rules.md`
- **[트리거: "i18n" | "ko-KR" | "en-US" | "prompt"]**: `.gemini/rules/i18n-prompt-rules.md`
- **[트리거: "observability" | "autopilot" | "replay" | "badges" | "demo-profile" | "preset"]**: `.gemini/rules/observability-replay-rules.md`
- **[트리거: "safety" | "prompt-injection" | "repair" | "fallback" | "secrets"]**: `.gemini/rules/safety-repair-rules.md`
- **[트리거: "docs" | "prd" | "tech-stack" | "runbook" | "doc-update"]**: `.gemini/rules/docs-ssot-rules.md`
- **[트리거: "git" | "commit" | "pr"]**: `.gemini/rules/commit-rules.md`
</dynamic_loading_rules>

## 6. 참조 문서

- `vibe/prd.md`
- `vibe/tech-stack.md`
- `vibe/ref/frontend-style-guide.md`
- `vibe/ref/structured-outputs-guide.md`
- `vibe/ref/standard-guide.md`
- [Gemini CLI Cheatsheet (Context Loading)](https://www.philschmid.de/gemini-cli-cheatsheet#context-files-geminimd)
- [Gemini CLI Official Docs (Configuration)](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/configuration.md#context-files-geminimd)

## 7. Debugging & Tips

- `/memory show`: 최종 결합된(Global + Project + Imported) 지침을 확인한다
- `.geminiignore`: 불필요한 컨텍스트를 제외해 비용/노이즈를 줄인다
- `/init`: 새 프로젝트의 기본 `GEMINI.md` 생성을 참고한다

## 8. 품질 검증 체크리스트 (요약)

- [ ] 키워드 리스트가 임포트 파일의 **[적용 컨텍스트]**와 1:1로 일치한다
- [ ] TurnOutput이 스키마를 통과한다(`Schema OK`)
- [ ] 재화 원장/잔액이 일관되고 음수가 아니다(`Economy OK`)
- [ ] 차단/실패 시 안전한 폴백이 있다(`Safety OK`)
- [ ] 좌표 규약(0~1000, `[ymin,xmin,ymax,xmax]`)을 지킨다(`Consistency OK`)


