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

function getTranslationKeys(langCode, namespace) {
  const filePath = path.join(LOCALES_DIR, langCode, `${namespace}.json`);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${langCode}/${namespace}.json:`, error.message);
    return {};
  }
}

function calculateCompleteness(sourceKeys, targetKeys) {
  const sourceKeysList = Object.keys(sourceKeys);
  const targetKeysList = Object.keys(targetKeys);

  if (sourceKeysList.length === 0) return 100;

  const translatedCount = targetKeysList.filter((key) => {
    const value = targetKeys[key];

    return (
      value !== null && value !== undefined && String(value).trim() !== '' && String(value) !== key
    );
  }).length;

  return Math.round((translatedCount / sourceKeysList.length) * 100);
}

function checkTranslationStatus() {
  console.log('🌍 Translation Status Report');
  console.log('================================\n');

  const englishTranslations = {};
  NAMESPACES.forEach((namespace) => {
    englishTranslations[namespace] = getTranslationKeys('en', namespace);
  });

  const results = {};

  SUPPORTED_LANGUAGES.forEach((langCode) => {
    if (langCode === 'en') return;

    results[langCode] = {
      namespaces: {},
      overall: 0,
    };

    let totalSourceKeys = 0;
    let totalTranslatedKeys = 0;

    NAMESPACES.forEach((namespace) => {
      const sourceKeys = englishTranslations[namespace];
      const targetKeys = getTranslationKeys(langCode, namespace);

      const sourceCount = Object.keys(sourceKeys).length;
      const completeness = calculateCompleteness(sourceKeys, targetKeys);
      const translatedCount = Math.round((completeness / 100) * sourceCount);

      results[langCode].namespaces[namespace] = {
        completeness,
        translated: translatedCount,
        total: sourceCount,
      };

      totalSourceKeys += sourceCount;
      totalTranslatedKeys += translatedCount;
    });

    results[langCode].overall =
      totalSourceKeys > 0 ? Math.round((totalTranslatedKeys / totalSourceKeys) * 100) : 100;
  });

  const sortedLanguages = Object.keys(results).sort(
    (a, b) => results[b].overall - results[a].overall
  );

  sortedLanguages.forEach((langCode) => {
    const result = results[langCode];
    const statusIcon = result.overall >= 90 ? '🟢' : result.overall >= 70 ? '🟡' : '🔴';

    console.log(`${statusIcon} ${langCode.toUpperCase()}: ${result.overall}% complete`);

    NAMESPACES.forEach((namespace) => {
      const ns = result.namespaces[namespace];
      if (ns.total > 0) {
        console.log(`   ${namespace}: ${ns.completeness}% (${ns.translated}/${ns.total})`);
      }
    });
    console.log();
  });

  const totalLanguages = sortedLanguages.length;
  const fullyTranslated = sortedLanguages.filter((lang) => results[lang].overall >= 90).length;
  const partiallyTranslated = sortedLanguages.filter(
    (lang) => results[lang].overall >= 70 && results[lang].overall < 90
  ).length;
  const needsWork = totalLanguages - fullyTranslated - partiallyTranslated;

  console.log('📊 Summary');
  console.log('----------');
  console.log(`🟢 Fully translated (≥90%): ${fullyTranslated}/${totalLanguages}`);
  console.log(`🟡 Partially translated (70-89%): ${partiallyTranslated}/${totalLanguages}`);
  console.log(`🔴 Needs work (<70%): ${needsWork}/${totalLanguages}`);

  return results;
}

if (require.main === module) {
  checkTranslationStatus();
}

module.exports = { checkTranslationStatus };
