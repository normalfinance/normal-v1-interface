#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales/langs');
const locales = fs.readdirSync(localesDir).filter((l) => !l.startsWith('.'));

const enPath = path.join(localesDir, 'en', 'common.json');
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

locales.forEach((locale) => {
  if (locale === 'en') return;
  const localePath = path.join(localesDir, locale, 'common.json');
  if (!fs.existsSync(localePath)) return;
  const json = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  let changed = false;
  Object.entries(enJson).forEach(([key, enVal]) => {
    if (json[key] === undefined || json[key] === '') {
      json[key] = enVal; // fallback to English
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(localePath, JSON.stringify(json, null, 2) + '\n');
    console.log(`Filled missing keys for ${locale}`);
  }
});

console.log('Done.');
