import {
  TurnOutputSchema,
  safeParseTurnOutput,
  Box2DSchema,
  CurrencyAmountSchema,
  LanguageSchema,
  parseTurnInput,
} from './turn.js';

console.log('--- Scenario A: TurnOutput 스키마 검증 (정상 케이스) ---');
const validOutput = {
  language: 'ko-KR',
  narrative: '문이 삐걱거리며 열립니다...',
  economy: {
    cost: { signal: 5, memory_shard: 0 },
    balance_after: { signal: 95, memory_shard: 5 },
  },
  safety: { blocked: false, message: null },
};
const resultA = safeParseTurnOutput(validOutput);
console.log('Success:', resultA.success);
if (resultA.success) {
  console.log('Data (sample):', resultA.data.narrative);
}

console.log('\n--- Scenario B: TurnOutput 스키마 검증 실패 → 폴백 ---');
const invalidOutput = {
  language: 'ko-KR',
  narrative: '테스트',
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resultB = safeParseTurnOutput(invalidOutput as any);
console.log('Success:', resultB.success);
if (!resultB.success) {
  console.log('Error count:', resultB.error.issues.length);
  console.log('Fallback exists:', !!resultB.fallback);
  console.log(
    'Fallback badges has schema_fail:',
    resultB.fallback?.agent_console?.badges?.includes('schema_fail'),
  );
}

console.log('\n--- Scenario C: 좌표 범위 검증 (RULE-009) ---');
const validBox = { ymin: 100, xmin: 200, ymax: 300, xmax: 400 };
console.log('Valid box:', Box2DSchema.safeParse(validBox).success);
const invalidBox = { ymin: 100, xmin: 200, ymax: 1500, xmax: 400 };
console.log('Invalid box (1500):', Box2DSchema.safeParse(invalidBox).success);
const negativeBox = { ymin: -10, xmin: 200, ymax: 300, xmax: 400 };
console.log('Negative box:', Box2DSchema.safeParse(negativeBox).success);

console.log('\n--- Scenario D: 재화 인바리언트 검증 (RULE-005) ---');
const validCurrency = { signal: 100, memory_shard: 5 };
console.log('Valid currency:', CurrencyAmountSchema.safeParse(validCurrency).success);
const negativeCurrency = { signal: -10, memory_shard: 5 };
console.log('Negative signal:', CurrencyAmountSchema.safeParse(negativeCurrency).success);

console.log('\n--- Scenario E: 언어 정책 검증 (RULE-006) ---');
console.log('ko-KR:', LanguageSchema.safeParse('ko-KR').success);
console.log('en-US:', LanguageSchema.safeParse('en-US').success);
console.log('ja-JP (invalid):', LanguageSchema.safeParse('ja-JP').success);
console.log('ko (invalid format):', LanguageSchema.safeParse('ko').success);

console.log('\n--- Scenario F: TurnInput 검증 ---');
const validInput = {
  language: 'ko-KR',
  text: '문을 열어본다',
  client: {
    viewport_w: 1920,
    viewport_h: 1080,
    theme: 'dark',
  },
  economy_snapshot: {
    signal: 100,
    memory_shard: 5,
  },
};
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = parseTurnInput(validInput as any);
  console.log('Parsed successfully:', parsed.text);
} catch (e) {
  console.log('Parse error:', e);
}

console.log('\n--- Scenario G: Strict 모드 검증 ---');
const outputWithExtra = {
  language: 'ko-KR',
  narrative: '테스트',
  economy: {
    cost: { signal: 0, memory_shard: 0 },
    balance_after: { signal: 100, memory_shard: 5 },
  },
  safety: { blocked: false, message: null },
  unknown_field: '이 필드는 스키마에 없음',
};
const resultG = TurnOutputSchema.safeParse(outputWithExtra);
console.log('With extra field success:', resultG.success);
if (!resultG.success) {
  console.log('Error code:', resultG.error.issues[0].code);
}
