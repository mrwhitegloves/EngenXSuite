import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// Functional code only (decision 0005): function components and hooks, no classes.
const NO_CLASSES = [
  'error',
  {
    selector: 'ClassDeclaration',
    message: 'No classes: use function components and plain functions (decision 0005).',
  },
  {
    selector: 'ClassExpression',
    message: 'No classes: use function components and plain functions (decision 0005).',
  },
];

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Without this, a component used only as <Component /> is reported as an unused variable.
      'react/jsx-uses-vars': 'error',
      'no-restricted-syntax': NO_CLASSES,
    },
  },
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
];
