import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  // 생성물/캐시/의존성만 제외 (소스/테스트/문서 제외 금지)
  { ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.vite/**'] },

  // 기본 규칙
  js.configs.recommended,

  // TypeScript 규칙
  ...tseslint.configs.recommended,

  // React 규칙
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    rules: {
      // React Hooks 규칙
      ...reactHooks.configs.recommended.rules,

      // React 규칙 (React 19 JSX Transform 대응)
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',

      // 미사용 import 자동 제거
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // TypeScript 특화 규칙 완화
      '@typescript-eslint/no-unused-vars': 'off', // unused-imports가 대체
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Prettier와 충돌 방지 (마지막에 배치)
  eslintConfigPrettier,
);
