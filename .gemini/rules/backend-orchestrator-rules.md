# 백엔드(오케스트레이터) 세부 지침

> **[적용 컨텍스트]**: backend, fastapi, python, sse, streaming, orchestrator, uvicorn, pydantic, vertex, service-account, \*.py
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
