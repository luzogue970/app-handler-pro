import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['front/**', 'dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['electron/**/*.js', 'electron/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
