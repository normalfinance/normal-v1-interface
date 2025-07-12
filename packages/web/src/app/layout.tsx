import '@/global.css';

import type { Metadata, Viewport } from 'next';

import { CONFIG } from '@/global-config';
import { primary } from '@/theme/core/palette';
import { ErrorBoundary } from '@sentry/nextjs';
import { LocalizationProvider } from '@/locales';
import { detectLanguage } from '@/locales/server';
import { View500 } from '@/sections/error/500-view';
import { themeConfig, ThemeProvider } from '@/theme';
import { DashboardLayout } from '@/layouts/dashboard';
import { I18nProvider } from '@/locales/i18n-provider';
import { ExternalProvider } from '@/providers/ExternalProvider';
import { AnnouncementProvider } from '@/providers/AnnouncementProvider';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

import { ProgressBar } from '@/components/template/progress-bar';
import { SnackbarProvider } from '@/components/template/snackbar';
import { MotionLazy } from '@/components/template/animate/motion-lazy';
import { detectSettings } from '@/components/template/settings/server';
import { SettingsDrawer, defaultSettings, SettingsProvider } from '@/components/template/settings';

// ----------------------------------------------------------------------

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: primary.main,
};

export const metadata: Metadata = {
  metadataBase: new URL(CONFIG.siteUrl),
  title: {
    default: 'Normal',
    template: '%s · Normal',
  },
  description: 'Invest in diversified crypto indices with Normal.',
  keywords: 'crypto, investing, crypto index, defi',
  openGraph: {
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // fallback if a page doesn’t override
        width: 1200,
        height: 630,
        alt: 'Normal overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og/home.png'], // fallback image for Twitter
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
                  <AnnouncementProvider>
                    <ExternalProvider>
                      <MotionLazy>
                        <SnackbarProvider>
                          <ProgressBar />
                          <SettingsDrawer defaultSettings={defaultSettings} />
                          <ErrorBoundary fallback={<View500 />}>
                            <DashboardLayout>{children}</DashboardLayout>
                          </ErrorBoundary>
                        </SnackbarProvider>
                      </MotionLazy>
                    </ExternalProvider>
                  </AnnouncementProvider>
                </ThemeProvider>
              </AppRouterCacheProvider>
            </LocalizationProvider>
          </SettingsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
