// prettier.config.cjs
/** @type {import("prettier").Config} */
module.exports = {
  printWidth: 100,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  overrides: [
    // 문서는 의미적 줄바꿈을 유지(특히 한국어 문서)
    { files: ['*.md'], options: { proseWrap: 'preserve' } },
  ],
};
