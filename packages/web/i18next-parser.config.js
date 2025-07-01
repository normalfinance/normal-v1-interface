module.exports = {
  locales: ['en', 'fr', 'vi', 'cn', 'ar'],
  defaultNamespace: 'common',
  output: 'src/locales/langs/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{js,jsx,ts,tsx}', '!**/node_modules/**'],

  createOldCatalogs: false,

  keySeparator: false,
  namespaceSeparator: false,
};
