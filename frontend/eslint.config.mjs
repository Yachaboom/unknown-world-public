// frontend/eslint.config.mjs
// Ignore/exclude only (bootstrap). Full lint rules live in `.gemini/rules/lint.md`.

export default [
  {
    // 생성물/캐시/의존성만 제외 (소스/테스트/문서 제외 금지)
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.vite/**', 'vibe/**'],
  },
];
