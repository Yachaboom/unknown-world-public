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
