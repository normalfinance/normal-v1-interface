import next from 'eslint-plugin-next'

export default [
  {
    plugins: { next },
    rules: {},
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**'],
    languageOptions: { parserOptions: { ecmaVersion: 2022 } },
  },
]
