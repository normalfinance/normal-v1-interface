'use client';

import dayjs from 'dayjs';
import { useCallback } from 'react';
import { useRouter } from '@/routes/hooks';
import { logger } from '@normalfinance/utils';
import { useTranslation } from 'react-i18next';

import { useSettingsContext } from '@/components/template/settings';

import { allLangs } from './all-langs';
import { fallbackLng, changeLangMessages as messages } from './locales-config';

import type { LanguageValue } from './locales-config';

// ----------------------------------------------------------------------

export function useTranslate(ns?: string) {
  const router = useRouter();

  const { t, i18n } = useTranslation(ns);

  const settings = useSettingsContext();

  const fallback = allLangs.filter((lang) => lang.value === fallbackLng)[0];

  const currentLang = allLangs.find((lang) => lang.value === i18n.resolvedLanguage);

  const onChangeLang = useCallback(
    async (newLang: LanguageValue) => {
      try {
        const langChangePromise = i18n.changeLanguage(newLang);

        const currentMessages = messages[newLang] || messages.en;

        // toast.promise(langChangePromise, {
        //   loading: currentMessages?.loading,
        //   success: () => currentMessages?.success,
        //   error: currentMessages?.error,
        // });

        // Update dayjs locale according to the selected language
        const langMeta = allLangs.find((l) => l.value === newLang);
        if (langMeta) {
          dayjs.locale(langMeta.adapterLocale);
        }

        // Update layout direction for RTL languages (only Arabic for now)
        if (newLang === 'ar') {
          settings.setField('direction', 'rtl');
        } else {
          settings.setField('direction', 'ltr');
        }

        router.refresh();
      } catch (error) {
        logger.error(error);
      }
    },
    [i18n, router, settings]
  );

  return {
    t,
    i18n,
    onChangeLang,
    currentLang: currentLang ?? fallback,
  };
}
