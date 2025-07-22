const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales/langs');
const ENGLISH_DIR = path.join(LOCALES_DIR, 'en');

function fixEmptyValues() {
  if (!fs.existsSync(ENGLISH_DIR)) {
    console.log('English locale directory not found:', ENGLISH_DIR);
    return;
  }

  const files = fs.readdirSync(ENGLISH_DIR).filter((file) => file.endsWith('.json'));

  files.forEach((file) => {
    const filePath = path.join(ENGLISH_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    try {
      const translations = JSON.parse(content);
      let hasChanges = false;

      Object.keys(translations).forEach((key) => {
        const value = translations[key];
        if (!value || String(value).trim() === '') {
          translations[key] = key;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf8');
        console.log(`✅ Fixed empty values in ${file}`);
      } else {
        console.log(`✓ No empty values found in ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
}

if (require.main === module) {
  console.log('🔧 Fixing empty i18n values...');
  fixEmptyValues();
  console.log('✨ Done!');
}

module.exports = { fixEmptyValues };
