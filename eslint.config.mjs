import next from 'eslint-plugin-next';

export default [
  {
    plugins: { next },               // enables core Next.js rules
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**'],
    // extend or add rules here, e.g.:
    // rules: { 'no-console': 'warn' },
  },
];
