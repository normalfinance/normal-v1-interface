module.exports = {
  locales: ['en'],
  defaultNamespace: 'common',
  output: 'src/locales/langs/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{js,jsx,ts,tsx}', '!**/node_modules/**'],

  createOldCatalogs: false,

  keySeparator: false,
  namespaceSeparator: false,

  defaultValue: (locale, namespace, key) => {
    return locale === 'en' ? key : '';
  },

  sort: true,

  keepRemoved: false,
};
