const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales/langs');

const SUPPORTED_LANGUAGES = [
  'en',
  'fr',
  'vi',
  'zh',
  'ar',
  'da',
  'de',
  'el',
  'es',
  'fi',
  'he',
  'hi',
  'hu',
  'it',
  'ja',
  'ko',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'sv',
  'tr',
  'uk',
];

const NAMESPACES = ['common', 'navbar'];

function checkMissingKeys() {
  console.log('🔍 Checking for missing translation keys...');

  if (!fs.existsSync(LOCALES_DIR)) {
    console.log('❌ Locales directory not found:', LOCALES_DIR);
    process.exit(1);
  }

  let hasMissingKeys = false;

  NAMESPACES.forEach((namespace) => {
    const enPath = path.join(LOCALES_DIR, 'en', `${namespace}.json`);

    if (!fs.existsSync(enPath)) {
      console.log(`⚠️  English ${namespace}.json not found, skipping...`);
      return;
    }

    let enKeys;
    try {
      const enContent = fs.readFileSync(enPath, 'utf8');
      enKeys = JSON.parse(enContent);
    } catch (error) {
      console.error(`❌ Error parsing English ${namespace}.json:`, error.message);
      process.exit(1);
    }

    const enKeysList = Object.keys(enKeys);
    console.log(`📋 Found ${enKeysList.length} keys in en/${namespace}.json`);

    // Check other language directories
    SUPPORTED_LANGUAGES.forEach((lang) => {
      if (lang === 'en') return; // Skip English as it's the source

      const langPath = path.join(LOCALES_DIR, lang, `${namespace}.json`);

      if (!fs.existsSync(langPath)) {
        console.log(`⚠️  Missing file: ${lang}/${namespace}.json`);
        hasMissingKeys = true;
        return;
      }

      let langKeys;
      try {
        const langContent = fs.readFileSync(langPath, 'utf8');
        langKeys = JSON.parse(langContent);
      } catch (error) {
        console.error(`❌ Error parsing ${lang}/${namespace}.json:`, error.message);
        hasMissingKeys = true;
        return;
      }

      // Find missing keys (keys that don't exist or are empty)
      const missingKeys = enKeysList.filter(
        (key) =>
          !langKeys.hasOwnProperty(key) || !langKeys[key] || String(langKeys[key]).trim() === ''
      );

      if (missingKeys.length > 0) {
        console.log(
          `🔍 Missing keys in ${lang}/${namespace}.json (${missingKeys.length}):`,
          missingKeys.slice(0, 5)
        );
        if (missingKeys.length > 5) {
          console.log(`   ... and ${missingKeys.length - 5} more`);
        }
        hasMissingKeys = true;
      }
    });
  });

  if (hasMissingKeys) {
    console.log('❌ Missing translation keys detected');
    process.exit(1);
  } else {
    console.log('✅ No missing translation keys found');
    process.exit(0);
  }
}

if (require.main === module) {
  checkMissingKeys();
}

module.exports = { checkMissingKeys };
