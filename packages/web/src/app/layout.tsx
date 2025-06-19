import '@/global.css';

import type { Metadata, Viewport } from 'next';

import { CONFIG } from '@/global-config';
import { DashboardLayout } from '@/layouts/dashboard';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

import { primary } from '@/theme/core/palette';
import { LocalizationProvider } from '@/locales';
import { detectLanguage } from '@/locales/server';
import { themeConfig, ThemeProvider } from '@/theme';
import { I18nProvider } from '@/locales/i18n-provider';

import { ProgressBar } from '@/components/template/progress-bar';
import { SnackbarProvider } from '@/components/template/snackbar';
import { MotionLazy } from '@/components/template/animate/motion-lazy';
import { detectSettings } from '@/components/template/settings/server';
import { SettingsDrawer, defaultSettings, SettingsProvider } from '@/components/template/settings';
import { AccountDrawer } from '@/layouts/components/account-drawer';

// import { ExternalProvider } from '@/providers/ExternalProvider';

// ----------------------------------------------------------------------

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: primary.main,
};

export const metadata: Metadata = {
  title: 'Normal',
  description: '',
  keywords: 'crypto, investing, crypto index, defi',
  twitter: {
    card: 'summary_large_image',
  },
  manifest: '/manifest.json',
  icons: [
    {
      rel: 'icon',
      url: `${CONFIG.assetsDir}/favicon.ico`,
    },
  ],
};

// ----------------------------------------------------------------------

type RootLayoutProps = {
  children: React.ReactNode;
};

async function getAppConfig() {
  if (CONFIG.isStaticExport) {
    return {
      lang: 'en',
      i18nLang: undefined,
      cookieSettings: undefined,
      dir: defaultSettings.direction,
    };
  } else {
    const [lang, settings] = await Promise.all([detectLanguage(), detectSettings()]);

    return {
      lang: lang ?? 'en',
      i18nLang: lang ?? 'en',
      cookieSettings: settings,
      dir: settings.direction,
    };
  }
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const appConfig = await getAppConfig();

  return (
    <html lang={appConfig.lang} dir={appConfig.dir} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript
          defaultMode={themeConfig.defaultMode}
          modeStorageKey={themeConfig.modeStorageKey}
          attribute={themeConfig.cssVariables.colorSchemeSelector}
        />

        <I18nProvider lang={appConfig.i18nLang}>
          <SettingsProvider
            cookieSettings={appConfig.cookieSettings}
            defaultSettings={defaultSettings}
          >
            <LocalizationProvider>
              <AppRouterCacheProvider options={{ key: 'css' }}>
                <ThemeProvider
                  defaultMode={themeConfig.defaultMode}
                  modeStorageKey={themeConfig.modeStorageKey}
                >
                  {/* <ExternalProvider> */}
                  <MotionLazy>
                    <SnackbarProvider>
                      <ProgressBar />
                      <SettingsDrawer defaultSettings={defaultSettings} />
                      <DashboardLayout>{children}</DashboardLayout>
                    </SnackbarProvider>
                  </MotionLazy>
                  {/* </ExternalProvider> */}
                </ThemeProvider>
              </AppRouterCacheProvider>
            </LocalizationProvider>
          </SettingsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
