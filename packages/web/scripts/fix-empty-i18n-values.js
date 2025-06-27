#!/usr/bin/env node
/*
  Post-processing script after i18next-parser.
  Right now it just ensures the process exits with success so the npm script chain continues.
  In the future you could iterate over locale JSON files and copy English strings
  into empty translations or perform QA checks.
*/
console.log('[fix-empty-i18n-values] Nothing to fix – stub script executed.');
