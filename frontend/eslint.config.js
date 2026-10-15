import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
export default [{ ignores: ['dist/**'] }, js.configs.recommended, { files: ['src/**/*.{ts,tsx}'], languageOptions: { parser: tsParser, globals: { window: 'readonly', document: 'readonly', console: 'readonly', fetch: 'readonly', FormData: 'readonly', HTMLFormElement: 'readonly', RequestInit: 'readonly', localStorage: 'readonly', URLSearchParams: 'readonly', crypto: 'readonly' } }, plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh }, rules: { 'no-unused-vars': 'off', 'react-refresh/only-export-components': 'warn' } }];
