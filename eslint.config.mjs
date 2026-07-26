import antfu from '@antfu/eslint-config'
import cypress from 'eslint-plugin-cypress'

export default antfu(
  {
    pnpm: false,
    react: {
      files: ['examples/vite-react/**/*.{js,jsx,ts,tsx}'],
      filesTypeAware: ['examples/vite-react/**/*.{ts,tsx}'],
    },
    typescript: true,
    rules: {
      'antfu/curly': 'off',
      'antfu/consistent-list-newline': 'off',
      'import/consistent-type-specifier-style': 'off',
      'node/prefer-global/process': 'off',
      'perfectionist/sort-exports': 'off',
      'perfectionist/sort-imports': 'off',
      'perfectionist/sort-named-imports': 'off',
      'regexp/no-useless-escape': 'off',
      'style/member-delimiter-style': 'off',
      'test/prefer-lowercase-title': 'off',
      'ts/no-empty-object-type': 'off',
      'ts/no-import-type-side-effects': 'off',
      'unicorn/new-for-builtins': 'off',
    },
    unocss: true,
    vue: true,
  },
  {
    ...cypress.configs.recommended,
    files: ['packages/playground/cypress/**/*.{js,ts}'],
  },
  {
    files: ['.build.mjs'],
    rules: {
      'antfu/no-top-level-await': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.{json,jsonc,json5}'],
    rules: {
      'jsonc/sort-keys': 'off',
    },
  },
  {
    files: ['**/*.{yaml,yml}'],
    rules: {
      'yaml/plain-scalar': 'off',
      'yaml/sort-keys': 'off',
    },
  },
  {
    files: ['**/*.toml'],
    rules: {
      'toml/indent': 'off',
      'toml/padding-line-between-tables': 'off',
      'toml/tables-order': 'off',
    },
  },
)
