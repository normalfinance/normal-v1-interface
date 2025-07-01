'use client';

import 'dayjs/locale/en';
import 'dayjs/locale/vi';
import 'dayjs/locale/fr';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/ar-sa';

// Newly added locales
import 'dayjs/locale/da'; // Danish
import 'dayjs/locale/de'; // German
import 'dayjs/locale/el'; // Greek
import 'dayjs/locale/es'; // Spanish
import 'dayjs/locale/fi'; // Finnish
import 'dayjs/locale/he'; // Hebrew
import 'dayjs/locale/hi'; // Hindi
import 'dayjs/locale/hu'; // Hungarian
import 'dayjs/locale/it'; // Italian
import 'dayjs/locale/ja'; // Japanese
import 'dayjs/locale/ko'; // Korean
import 'dayjs/locale/nl'; // Dutch
import 'dayjs/locale/nb'; // Norwegian Bokmål
import 'dayjs/locale/pl'; // Polish
import 'dayjs/locale/pt-br'; // Portuguese (Brazil)
import 'dayjs/locale/ro'; // Romanian
import 'dayjs/locale/ru'; // Russian
import 'dayjs/locale/sv'; // Swedish
import 'dayjs/locale/tr'; // Turkish
import 'dayjs/locale/uk'; // Ukrainian

import dayjs from 'dayjs';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider as Provider } from '@mui/x-date-pickers/LocalizationProvider';

import { useTranslate } from './use-locales';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function LocalizationProvider({ children }: Props) {
  const { currentLang } = useTranslate();

  dayjs.locale(currentLang.adapterLocale);

  return (
    <Provider dateAdapter={AdapterDayjs} adapterLocale={currentLang.adapterLocale}>
      {children}
    </Provider>
  );
}
