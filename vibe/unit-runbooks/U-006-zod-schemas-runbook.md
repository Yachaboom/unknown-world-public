# U-006[Mvp] TurnInput/TurnOutput Zod 스키마 실행 가이드

## 1. 개요

백엔드 Pydantic 모델과 1:1 대응하는 프론트엔드 Zod 스키마를 구현했습니다. 이 스키마는 다음을 제공합니다:

- **TurnInput/TurnOutput Zod 스키마**: strict 모드로 정의되어 추가 속성을 금지합니다
- **안전 폴백**: 스키마 검증 실패 시에도 UI가 멈추지 않도록 폴백 TurnOutput을 제공합니다
- **인바리언트 검증**: 좌표(0~1000), 언어(ko-KR/en-US), 재화(0 이상) 검증이 스키마 레벨에서 강제됩니다
- **Q1 결정 반영**: schema_version 포함 (Option A)

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-002[Mvp] (TypeScript 프론트 환경), U-005[Mvp] (서버 Pydantic 스키마)
- 선행 완료 필요: U-002 런북 실행 완료

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 의존 유닛 확인

```bash
# TypeScript 환경 확인
pnpm typecheck

# 린트 확인
pnpm lint
```

### 2.3 즉시 실행

```bash
# 개발 서버 시작
pnpm dev
```

### 2.4 첫 화면/결과 확인

- 개발 서버가 정상 구동되면 스키마 모듈이 정상적으로 로드됩니다.
- 성공 지표: 타입체크/린트 에러 없이 빌드 성공

---

## 3. 핵심 기능 시나리오

### 시나리오 A: TurnOutput 스키마 검증 (정상 케이스)

**목적**: 유효한 TurnOutput JSON이 스키마를 통과하는지 검증

**실행**:

브라우저 개발자 도구 콘솔에서 실행:

```javascript
// 모듈 임포트 (Vite 개발 서버 환경에서)
const { TurnOutputSchema, safeParseTurnOutput } = await import('/src/schemas/turn.ts');

// 유효한 TurnOutput 데이터
const validOutput = {
  language: "ko-KR",
  narrative: "문이 삐걱거리며 열립니다...",
  economy: {
    cost: { signal: 5, memory_shard: 0 },
    balance_after: { signal: 95, memory_shard: 5 }
  },
  safety: { blocked: false, message: null }
};

// 검증
const result = safeParseTurnOutput(validOutput);
console.log("Success:", result.success);
console.log("Data:", result.success ? result.data : result.error);
```

**기대 결과**:

```
Success: true
Data: { language: "ko-KR", narrative: "...", ... }
```

**확인 포인트**:

- ✅ `result.success`가 `true`
- ✅ `result.data`에 파싱된 TurnOutput 객체 포함
- ✅ 기본값이 적용됨 (ui, world, render, agent_console)

---

### 시나리오 B: TurnOutput 스키마 검증 실패 → 폴백

**목적**: 유효하지 않은 데이터에서 폴백 TurnOutput이 반환되는지 검증

**실행**:

```javascript
const { safeParseTurnOutput } = await import('/src/schemas/turn.ts');

// 유효하지 않은 데이터 (economy 필드 누락)
const invalidOutput = {
  language: "ko-KR",
  narrative: "테스트"
  // economy 누락
  // safety 누락
};

const result = safeParseTurnOutput(invalidOutput);
console.log("Success:", result.success);
if (!result.success) {
  console.log("Error:", result.error.errors);
  console.log("Fallback:", result.fallback);
}
```

**기대 결과**:

```
Success: false
Error: [{ code: "invalid_type", path: ["economy"], ... }, { code: "invalid_type", path: ["safety"], ... }]
Fallback: { language: "ko-KR", narrative: "[시스템] 응답을 처리하는 중...", ... }
```

**확인 포인트**:

- ✅ `result.success`가 `false`
- ✅ `result.error`에 ZodError 포함
- ✅ `result.fallback`에 유효한 폴백 TurnOutput 포함
- ✅ 폴백의 `agent_console.badges`에 `"schema_fail"` 포함

---

### 시나리오 C: 좌표 범위 검증 (RULE-009)

**목적**: 0~1000 범위를 벗어나는 좌표가 거부되는지 검증

**실행**:

```javascript
const { Box2DSchema } = await import('/src/schemas/turn.ts');

// 유효한 좌표
const validBox = { ymin: 100, xmin: 200, ymax: 300, xmax: 400 };
console.log("Valid box:", Box2DSchema.safeParse(validBox).success);

// 범위 초과 좌표
const invalidBox = { ymin: 100, xmin: 200, ymax: 1500, xmax: 400 };
console.log("Invalid box (1500):", Box2DSchema.safeParse(invalidBox).success);

// 음수 좌표
const negativeBox = { ymin: -10, xmin: 200, ymax: 300, xmax: 400 };
console.log("Negative box:", Box2DSchema.safeParse(negativeBox).success);
```

**기대 결과**:

```
Valid box: true
Invalid box (1500): false
Negative box: false
```

**확인 포인트**:

- ✅ 0~1000 범위 내 좌표는 통과
- ✅ 1000 초과 값은 거부
- ✅ 음수 값은 거부

---

### 시나리오 D: 재화 인바리언트 검증 (RULE-005)

**목적**: 재화 값이 0 미만일 때 거부되는지 검증

**실행**:

```javascript
const { CurrencyAmountSchema } = await import('/src/schemas/turn.ts');

// 유효한 재화
const validCurrency = { signal: 100, memory_shard: 5 };
console.log("Valid currency:", CurrencyAmountSchema.safeParse(validCurrency).success);

// 음수 재화 (잔액 음수 금지 - RULE-005)
const negativeCurrency = { signal: -10, memory_shard: 5 };
console.log("Negative signal:", CurrencyAmountSchema.safeParse(negativeCurrency).success);
```

**기대 결과**:

```
Valid currency: true
Negative signal: false
```

**확인 포인트**:

- ✅ 0 이상의 재화는 통과
- ✅ 음수 재화는 거부 (RULE-005 준수)

---

### 시나리오 E: 언어 정책 검증 (RULE-006)

**목적**: 허용되지 않는 언어 코드가 거부되는지 검증

**실행**:

```javascript
const { LanguageSchema } = await import('/src/schemas/turn.ts');

console.log("ko-KR:", LanguageSchema.safeParse("ko-KR").success);
console.log("en-US:", LanguageSchema.safeParse("en-US").success);
console.log("ja-JP (invalid):", LanguageSchema.safeParse("ja-JP").success);
console.log("ko (invalid format):", LanguageSchema.safeParse("ko").success);
```

**기대 결과**:

```
ko-KR: true
en-US: true
ja-JP (invalid): false
ko (invalid format): false
```

**확인 포인트**:

- ✅ "ko-KR"과 "en-US"만 허용
- ✅ 다른 언어 코드는 거부 (RULE-006 준수)

---

### 시나리오 F: TurnInput 검증

**목적**: TurnInput 스키마가 클라이언트 입력을 올바르게 검증하는지 확인

**실행**:

```javascript
const { TurnInputSchema, parseTurnInput } = await import('/src/schemas/turn.ts');

// 유효한 TurnInput
const validInput = {
  language: "ko-KR",
  text: "문을 열어본다",
  client: {
    viewport_w: 1920,
    viewport_h: 1080,
    theme: "dark"
  },
  economy_snapshot: {
    signal: 100,
    memory_shard: 5
  }
};

try {
  const parsed = parseTurnInput(validInput);
  console.log("Parsed successfully:", parsed);
} catch (e) {
  console.log("Parse error:", e);
}
```

**기대 결과**:

```
Parsed successfully: { language: "ko-KR", text: "문을 열어본다", click: null, ... }
```

**확인 포인트**:

- ✅ 필수 필드가 모두 있으면 통과
- ✅ 선택 필드(click)에 기본값 null 적용
- ✅ theme에 기본값 "dark" 적용 (명시하지 않아도)

---

### 시나리오 G: Strict 모드 검증

**목적**: 정의되지 않은 추가 속성이 거부되는지 검증

**실행**:

```javascript
const { TurnOutputSchema } = await import('/src/schemas/turn.ts');

// 추가 속성 포함
const outputWithExtra = {
  language: "ko-KR",
  narrative: "테스트",
  economy: {
    cost: { signal: 0, memory_shard: 0 },
    balance_after: { signal: 100, memory_shard: 5 }
  },
  safety: { blocked: false },
  unknown_field: "이 필드는 스키마에 없음"
};

const result = TurnOutputSchema.safeParse(outputWithExtra);
console.log("With extra field:", result.success);
if (!result.success) {
  console.log("Error:", result.error.errors[0]);
}
```

**기대 결과**:

```
With extra field: false
Error: { code: "unrecognized_keys", keys: ["unknown_field"], ... }
```

**확인 포인트**:

- ✅ 추가 속성이 있으면 거부됨 (strict 모드)
- ✅ 에러 메시지에 인식되지 않은 키 정보 포함

---

## 4. 실행 결과 확인

### 4.1 로그 확인

- 위치: 브라우저 개발자 도구 콘솔
- 주요 로그 메시지:
  - `Success: true` - 검증 통과
  - `Success: false` - 검증 실패

### 4.2 생성 파일

- `frontend/src/schemas/turn.ts` - Zod 스키마 정의
- `frontend/src/schemas/index.ts` - 스키마 모듈 export

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ `pnpm typecheck` 에러 없음
- ✅ `pnpm lint` 에러 없음
- ✅ 시나리오 A~G 모두 기대 결과와 일치

**실패 시 확인**:

- ❌ 타입 에러 → `frontend/src/schemas/turn.ts` 파일 확인
- ❌ 린트 에러 → ESLint 설정 확인
- ❌ 검증 실패 → Zod 스키마 정의 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `Module not found: zod`

- **원인**: Zod 패키지 미설치
- **해결**: `pnpm install` 실행

**오류**: `Type 'X' is not assignable to type 'Y'`

- **원인**: 스키마 정의와 타입 불일치
- **해결**: 스키마 정의 검토 후 타입 추론 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 차이 없음 (ESM 모듈)
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

- **U-008[Mvp]**: SSE 스트리밍 + Zod 검증 연동
- 실제 API 응답에 Zod 검증 적용

