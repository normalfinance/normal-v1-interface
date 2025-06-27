module.exports = {
  locales: ['en', 'fr', 'vi', 'cn', 'ar'],
  defaultNamespace: 'common',
  // Where to output the parsed catalogues
  output: 'src/locales/langs/$LOCALE/$NAMESPACE.json',
  // Where to look for keys. Adjust globs if necessary.
  input: [
    'src/**/*.{js,jsx,ts,tsx}',
    // Exclude test and mock files if desired
    '!**/node_modules/**',
  ],
  // We already keep one JSON file per namespace per locale, so don't
  // generate a separate catalog backup directory.
  createOldCatalogs: false,
  // We use the full original string as the key (wrapped by the codemod),
  // so disable key and namespace separators.
  keySeparator: false,
  namespaceSeparator: false,
};
