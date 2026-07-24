// @ts-check

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/build/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // eslint-config-next bundles eslint-plugin-jsx-a11y (WCAG AA linting) along
    // with React/Next-specific rules — only meaningful where JSX lives.
    files: ['packages/web/**/*.{js,jsx,ts,tsx}'],
    extends: [...nextVitals, ...nextTs],
  },
  eslintConfigPrettier,
);
