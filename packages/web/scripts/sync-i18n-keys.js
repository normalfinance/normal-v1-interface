const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales/langs');
const SOURCE_LANG_DIR = path.join(LOCALES_DIR, 'en');

function syncI18nKeys() {
  if (!fs.existsSync(SOURCE_LANG_DIR)) {
    console.error(`Source language directory not found: ${SOURCE_LANG_DIR}`);
    process.exit(1);
  }

  const sourceFiles = fs.readdirSync(SOURCE_LANG_DIR).filter((file) => file.endsWith('.json'));
  const targetLangs = fs
    .readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && dirent.name !== 'en')
    .map((dirent) => dirent.name);

  sourceFiles.forEach((file) => {
    const sourceFilePath = path.join(SOURCE_LANG_DIR, file);
    const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');
    let sourceKeys;
    try {
      sourceKeys = JSON.parse(sourceContent);
    } catch (e) {
      console.error(`Error parsing source file ${sourceFilePath}: ${e.message}`);
      return; // Skip this file
    }

    targetLangs.forEach((lang) => {
      const targetDir = path.join(LOCALES_DIR, lang);
      const targetFilePath = path.join(targetDir, file);
      let targetKeys = {};
      let hasChanges = false;

      if (fs.existsSync(targetFilePath)) {
        const targetContent = fs.readFileSync(targetFilePath, 'utf8');
        try {
          // preserve existing translations
          const existingTranslations = JSON.parse(targetContent);
          targetKeys = { ...existingTranslations };
        } catch (e) {
          console.warn(
            `Could not parse ${targetFilePath}, creating a new one. Error: ${e.message}`
          );
        }
      }

      Object.keys(sourceKeys).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(targetKeys, key) || !targetKeys[key]) {
          targetKeys[key] = key; // Use key as value for missing translations
          hasChanges = true;
        }
      });

      if (hasChanges) {
        fs.writeFileSync(
          targetFilePath,
          JSON.stringify(targetKeys, Object.keys(sourceKeys), 2) + '\n',
          'utf8'
        );
        console.log(`✅ Synced keys to ${path.relative(process.cwd(), targetFilePath)}`);
      }
    });
  });
  console.log(`✓ All keys synced from 'en' to other languages.`);
}

if (require.main === module) {
  console.log('🔧 Synchronizing i18n keys from "en" to other languages...');
  syncI18nKeys();
  console.log('✨ Done!');
}

module.exports = { syncI18nKeys };
