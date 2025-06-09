import { cache } from 'react';
import { createInstance } from 'i18next';
import { cookies as getCookies } from 'next/headers';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';

import { defaultNS, cookieName, i18nOptions, fallbackLng } from './locales-config';

import type { LanguageValue } from './locales-config';

// ----------------------------------------------------------------------

/**
 * Internationalization configuration for Next.js server-side.
 *
 * Supports two approaches for language handling:
 *
 * 1. URL-based routing (Next.js default)
 *    - Languages are part of the URL path
 *    - Example: /en/about, /fr/about
 *    - @see {@link https://nextjs.org/docs/pages/building-your-application/routing/internationalization}
 *
 * 2. Cookie-based routing
 *    - Language preference stored in cookies
 *    - No URL modification required
 *    - @see {@link https://github.com/i18next/next-app-dir-i18next-example/issues/12#issuecomment-1500917570}
 *
 * Current implementation uses approach #2 (Cookie-based)
 */

export async function detectLanguage() {
  const cookies = getCookies();

  const language = cookies.get(cookieName)?.value ?? fallbackLng;

  return language as LanguageValue;
}

// ----------------------------------------------------------------------

export const getServerTranslations = cache(async (ns = defaultNS, options = {}) => {
  const language = await detectLanguage();

  const i18nextInstance = await initServerI18next(language, ns);

  return {
    t: i18nextInstance.getFixedT(
      language,
      Array.isArray(ns) ? ns[0] : ns,
      (options as Record<string, any>).keyPrefix
    ),
    i18n: i18nextInstance,
  };
});

// ----------------------------------------------------------------------

const initServerI18next = async (language: string, namespace: string) => {
  const i18nInstance = createInstance();

  await i18nInstance
    .use(initReactI18next)
    .use(resourcesToBackend((lang: string, ns: string) => import(`./langs/${lang}/${ns}.json`)))
    .init(i18nOptions(language, namespace));

  return i18nInstance;
};
