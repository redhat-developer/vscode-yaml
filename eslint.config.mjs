// @ts-check

import { join } from 'node:path';
import js from '@eslint/js';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { flatConfigs, createNodeResolver } from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default defineConfig(
  includeIgnoreFile(join(import.meta.dirname, '.gitignore')),
  js.configs.recommended,
  flatConfigs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      prettier: prettierPlugin,
    },
    settings: {
      'import-x/resolver-next': [createNodeResolver()],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended, flatConfigs.typescript],
    languageOptions: {
      parserOptions: {
        projectService: {
          // The browser entry point is intentionally excluded from the desktop tsconfig
          allowDefaultProject: ['src/webworker/*.ts'],
        },
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: false }],
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    },
  },
  {
    rules: {
      'import-x/no-unresolved': 'off',
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['test/**/*.ts', 'smoke-test/**/*.ts'],
    rules: {
      // Chai and sinon-chai assertions can be property accesses without a function call
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  }
);
