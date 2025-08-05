'use client';

// core (MUI)
import {
  frFR as frFRCore,
  viVN as viVNCore,
  zhCN as zhCNCore,
  arSA as arSACore,
} from '@mui/material/locale';
// date pickers (MUI)
import {
  enUS as enUSDate,
  frFR as frFRDate,
  viVN as viVNDate,
  zhCN as zhCNDate,
} from '@mui/x-date-pickers/locales';
// data grid (MUI)
import {
  enUS as enUSDataGrid,
  frFR as frFRDataGrid,
  viVN as viVNDataGrid,
  zhCN as zhCNDataGrid,
  arSD as arSDDataGrid,
} from '@mui/x-data-grid/locales';

// ----------------------------------------------------------------------

export const allLangs = [
  {
    value: 'en',
    label: 'English',
    countryCode: 'US',
    adapterLocale: 'en',
    numberFormat: { code: 'en-US', currency: 'USD' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'fr',
    label: 'French',
    countryCode: 'FR',
    adapterLocale: 'fr',
    numberFormat: { code: 'fr-Fr', currency: 'EUR' },
    systemValue: {
      components: { ...frFRCore.components, ...frFRDate.components, ...frFRDataGrid.components },
    },
  },
  {
    value: 'vi',
    label: 'Vietnamese',
    countryCode: 'VN',
    adapterLocale: 'vi',
    numberFormat: { code: 'vi-VN', currency: 'VND' },
    systemValue: {
      components: { ...viVNCore.components, ...viVNDate.components, ...viVNDataGrid.components },
    },
  },
  {
    value: 'zh',
    label: 'Chinese',
    countryCode: 'CN',
    adapterLocale: 'zh-cn',
    numberFormat: { code: 'zh-CN', currency: 'CNY' },
    systemValue: {
      components: { ...zhCNCore.components, ...zhCNDate.components, ...zhCNDataGrid.components },
    },
  },
  {
    value: 'ar',
    label: 'Arabic',
    countryCode: 'SA',
    adapterLocale: 'ar-sa',
    numberFormat: { code: 'ar', currency: 'AED' },
    systemValue: {
      components: { ...arSACore.components, ...arSDDataGrid.components },
    },
  },
  {
    value: 'da',
    label: 'Danish',
    countryCode: 'DK',
    adapterLocale: 'da',
    numberFormat: { code: 'da-DK', currency: 'DKK' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'de',
    label: 'German',
    countryCode: 'DE',
    adapterLocale: 'de',
    numberFormat: { code: 'de-DE', currency: 'EUR' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'el',
    label: 'Greek',
    countryCode: 'GR',
    adapterLocale: 'el',
    numberFormat: { code: 'el-GR', currency: 'EUR' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'es',
    label: 'Spanish',
    countryCode: 'ES',
    adapterLocale: 'es',
    numberFormat: { code: 'es-ES', currency: 'EUR' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'fi',
    label: 'Finnish',
    countryCode: 'FI',
    adapterLocale: 'fi',
    numberFormat: { code: 'fi-FI', currency: 'EUR' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'he',
    label: 'Hebrew',
    countryCode: 'IL',
    adapterLocale: 'he',
    numberFormat: { code: 'he-IL', currency: 'ILS' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'hi',
    label: 'Hindi',
    countryCode: 'IN',
    adapterLocale: 'hi',
    numberFormat: { code: 'hi-IN', currency: 'INR' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'hu',
    label: 'Hungarian',
    countryCode: 'HU',
    adapterLocale: 'hu',
    numberFormat: { code: 'hu-HU', currency: 'HUF' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'it',
    label: 'Italian',
    countryCode: 'IT',
    adapterLocale: 'it',
    numberFormat: { code: 'it-IT', currency: 'EUR' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'ja',
    label: 'Japanese',
    countryCode: 'JP',
    adapterLocale: 'ja',
    numberFormat: { code: 'ja-JP', currency: 'JPY' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'ko',
    label: 'Korean',
    countryCode: 'KR',
    adapterLocale: 'ko',
    numberFormat: { code: 'ko-KR', currency: 'KRW' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'nl',
    label: 'Dutch',
    countryCode: 'NL',
    adapterLocale: 'nl',
    numberFormat: { code: 'nl-NL', currency: 'EUR' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'no',
    label: 'Norwegian',
    countryCode: 'NO',
    adapterLocale: 'nb',
    numberFormat: { code: 'nb-NO', currency: 'NOK' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'pl',
    label: 'Polish',
    countryCode: 'PL',
    adapterLocale: 'pl',
    numberFormat: { code: 'pl-PL', currency: 'PLN' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'pt',
    label: 'Portuguese',
    countryCode: 'PT',
    adapterLocale: 'pt-br',
    numberFormat: { code: 'pt-PT', currency: 'EUR' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'ro',
    label: 'Romanian',
    countryCode: 'RO',
    adapterLocale: 'ro',
    numberFormat: { code: 'ro-RO', currency: 'RON' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'ru',
    label: 'Russian',
    countryCode: 'RU',
    adapterLocale: 'ru',
    numberFormat: { code: 'ru-RU', currency: 'RUB' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'sv',
    label: 'Swedish',
    countryCode: 'SE',
    adapterLocale: 'sv',
    numberFormat: { code: 'sv-SE', currency: 'SEK' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'tr',
    label: 'Turkish',
    countryCode: 'TR',
    adapterLocale: 'tr',
    numberFormat: { code: 'tr-TR', currency: 'TRY' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'uk',
    label: 'Ukrainian',
    countryCode: 'UA',
    adapterLocale: 'uk',
    numberFormat: { code: 'uk-UA', currency: 'UAH' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
];

/**
 * Country code:
 * https://flagcdn.com/en/codes.json
 *
 * Number format code:
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */
