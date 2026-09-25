import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'react'],
  options: { typeAware: true },
  ignorePatterns: [
    '.agents/**',
    '.claude/**',
    '.cursor/**',
    'dist/**',
    'playwright-report/**',
    'src/routeTree.gen.ts',
    'test-results/**',
  ],
  rules: {
    'typescript/switch-exhaustiveness-check': 'error',
    'react/unsupported-syntax': 'error',
    'eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      excludeFiles: ['**/*.test.ts', '**/*.test.tsx'],
      jsPlugins: [{ name: 'compat', specifier: 'eslint-plugin-compat' }],
      rules: {
        'compat/compat': 'error',
      },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {
        'typescript/no-non-null-assertion': 'off',
        'react/rules-of-hooks': 'off',
      },
    },
  ],
})
