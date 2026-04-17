// Flat ESLint config (ESLint v9+). Migrated 2026-04-16 to close the gap Raze/Quinn-v2
// surfaced during sprint retro-eval. Prior state: project had ESLint v9 and eslint-config-next
// installed but no config file, so `npx eslint .` failed with "couldn't find an
// eslint.config.(js|mjs|cjs) file" — the lint gate was non-functional for weeks.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'schemas/**',
      'public/**',
      'next-env.d.ts',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  ...nextCoreWebVitals,

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    files: [
      'tests/**/*.ts',
      'tests/**/*.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];
